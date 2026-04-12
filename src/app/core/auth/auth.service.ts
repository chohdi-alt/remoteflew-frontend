import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, firstValueFrom, map, tap, throwError, catchError, of } from 'rxjs';
import { AppRole, AuthError, AuthErrorType, AuthTokenResponse, CurrentUser, LoginRequestPayload, RemoteFlowTokenParsed, StoredAuthSession, mapBackendError } from '../../models/auth.models';
import { AuthApiService } from '../../services/auth-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrentUserService } from './current-user.service';

interface NormalizedSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly STORAGE_KEY = 'remoteflow.auth.session';
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly USER_ROLE_KEY = 'user_role';
  private static readonly TOKEN_REFRESH_CHECK_INTERVAL_MS = 60000;
  private static readonly TOKEN_REFRESH_MIN_VALIDITY_SECONDS = 120;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly authApi = inject(AuthApiService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);

  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private accessTokenExpiresAt: number | null = null;
  private refreshTokenExpiresAt: number | null = null;

  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private refreshPromise: Promise<string | undefined> | null = null;
  private initPromise: Promise<boolean> | null = null;

  public readonly tokenRefreshed$ = new Subject<string>();

  async init(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeSession();

    return this.initPromise;
  }

  get token(): string | undefined {
    return this.accessToken ?? undefined;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('refresh_token') : null);
  }

  get username(): string | undefined {
    return this.currentUserService.snapshot?.username;
  }

  get roles(): AppRole[] {
    return this.currentUserService.getRoles();
  }

  login(payload: LoginRequestPayload): Observable<CurrentUser | { success: false; error: AuthError }>;
  login(username: string, password: string): Observable<CurrentUser | { success: false; error: AuthError }>;
  login(payloadOrUsername: LoginRequestPayload | string, maybePassword?: string): Observable<CurrentUser | { success: false; error: AuthError }> {
    const login$ = (payload: LoginRequestPayload) =>
      this.authApi.login(payload).pipe(
        map((response) => this.normalizeSession(response)),
        tap((session) => this.applySession(session)),
        map(() => {
          const user = this.currentUserService.snapshot;
          if (!user) {
            throw new Error('Unable to resolve authenticated user from token.');
          }
          return user;
        }),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            const backendError = err?.error?.error;
            const error = mapBackendError(backendError, err.error);
            return of({ success: false, error } as const);
          }
          return throwError(() => err);
        })
      );

    if (typeof payloadOrUsername === 'string') {
      if (maybePassword == null || maybePassword === '') {
        return throwError(() => new Error('Password is required.'));
      }
      return login$({ username: payloadOrUsername, password: maybePassword });
    }

    return login$(payloadOrUsername);
  }

  refresh(refreshToken: string): Observable<AuthTokenResponse> {
    return this.authApi.refresh(refreshToken).pipe(
      map((response) => this.normalizeSession(response)),
      tap((session) => this.applySession(session)),
      map((session) => ({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? undefined,
        tokenType: 'Bearer',
        expiresIn: session.expiresAt ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)) : undefined,
        refreshExpiresIn: session.refreshExpiresAt
          ? Math.max(0, Math.floor((session.refreshExpiresAt - Date.now()) / 1000))
          : undefined,
        roles: this.currentUserService.getRoles()
      }))
    );
  }

  async logout(redirectToLogin = true): Promise<void> {
    this.clearSession();
    if (redirectToLogin && isPlatformBrowser(this.platformId)) {
      await this.router.navigate(['/login']);
    }
  }

  clearSession(): void {
    this.stopTokenRefreshLoop();
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.accessTokenExpiresAt = null;
    this.refreshTokenExpiresAt = null;
    this.currentUserService.clear();
    this.tokenRefreshed$.next('');
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
    }
  }

  hasRole(role: string): boolean {
    return this.currentUserService.hasRole(role);
  }

  hasAnyRole(roles: readonly string[]): boolean {
    return this.currentUserService.hasAnyRole(roles);
  }

  getUserRoles(): AppRole[] {
    return this.currentUserService.getRoles();
  }

  getPrimaryRole(): AppRole | null {
    if (this.hasRole('ADMIN')) {
      return 'ADMIN';
    }
    if (this.hasRole('HR')) {
      return 'HR';
    }
    if (this.hasRole('MANAGER')) {
      return 'MANAGER';
    }
    if (this.hasRole('EMPLOYEE')) {
      return 'EMPLOYEE';
    }

    return null;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !this.isTokenExpired(this.accessTokenExpiresAt, 0);
  }

  async getToken(minValiditySeconds = 30): Promise<string | undefined> {
    return this.getValidToken(minValiditySeconds);
  }

  async getValidToken(minValiditySeconds = 30): Promise<string | undefined> {
    if (!this.accessToken) {
      if (this.hasRefreshToken()) {
        return this.refreshAccessToken();
      }
      return undefined;
    }

    if (this.isTokenExpired(this.accessTokenExpiresAt, minValiditySeconds)) {
      return this.refreshAccessToken();
    }

    return this.accessToken;
  }

  hasRefreshToken(): boolean {
    const rToken = this.getRefreshToken();
    return !!rToken && (!this.refreshTokenExpiresAt || !this.isTokenExpired(this.refreshTokenExpiresAt, 0));
  }

  async forceRefreshToken(): Promise<string | undefined> {
    return this.refreshAccessToken();
  }

  getDefaultRouteForCurrentUser(): string {
    return this.getDashboardRouteForRole(this.getPrimaryRole());
  }

  getDashboardRouteForRole(role: string | null | undefined): string {
    switch (String(role ?? '').trim().toUpperCase()) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'HR':
        return '/hr/dashboard';
      case 'MANAGER':
        return '/manager/dashboard';
      case 'EMPLOYEE':
        return '/employee/dashboard';
      default:
        return '/access-denied';
    }
  }

  private applySession(session: NormalizedSession): void {
    this.accessToken = session.accessToken;
    this.refreshTokenValue = session.refreshToken;
    this.accessTokenExpiresAt = session.expiresAt;
    this.refreshTokenExpiresAt = session.refreshExpiresAt;

    this.tokenRefreshed$.next(session.accessToken);

    this.currentUserService.setFromJwt(session.accessToken);
    this.persistToStorage();
    this.startTokenRefreshLoop();
  }

  private normalizeSession(response: AuthTokenResponse): NormalizedSession {
    const nowMs = Date.now();

    const accessToken = response.accessToken ?? response.access_token;
    if (!accessToken) {
      throw new Error('Login response does not include an access token.');
    }

    const refreshToken = response.refreshToken ?? response.refresh_token ?? null;
    const expiresInSeconds = Number(response.expiresIn ?? response.expires_in ?? NaN);
    const refreshExpiresInSeconds = Number(response.refreshExpiresIn ?? response.refresh_expires_in ?? NaN);

    const tokenClaims = this.parseJwt(accessToken);
    const tokenExpMs = tokenClaims?.exp ? tokenClaims.exp * 1000 : null;

    const expiresAt = Number.isFinite(expiresInSeconds)
      ? nowMs + expiresInSeconds * 1000
      : tokenExpMs;

    const refreshExpiresAt = Number.isFinite(refreshExpiresInSeconds)
      ? nowMs + refreshExpiresInSeconds * 1000
      : null;

    return {
      accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt
    };
  }

  private parseJwt(jwt: string): RemoteFlowTokenParsed | null {
    const parts = jwt.split('.');
    if (parts.length < 2 || !parts[1]) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
      const decoded = this.decodeBase64(padded);
      return JSON.parse(decoded) as RemoteFlowTokenParsed;
    } catch {
      return null;
    }
  }

  private decodeBase64(value: string): string {
    const bufferCtor = (globalThis as { Buffer?: { from: (data: string, encoding: string) => { toString: (encoding: string) => string } } })
      .Buffer;
    if (bufferCtor) {
      return bufferCtor.from(value, 'base64').toString('utf8');
    }

    if (typeof globalThis.atob === 'function' && typeof globalThis.TextDecoder === 'function') {
      const binary = globalThis.atob(value);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    }

    throw new Error('Base64 decoder is not available in this runtime.');
  }

  private async refreshAccessToken(): Promise<string | undefined> {
    const rToken = this.getRefreshToken();
    if (!rToken || (this.refreshTokenExpiresAt != null && this.isTokenExpired(this.refreshTokenExpiresAt, 0))) {
      this.clearSession();
      return undefined;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = firstValueFrom(this.refresh(rToken))
      .then(() => {
        return this.accessToken ?? undefined;
      })
      .catch(() => {
        this.clearSession();
        return undefined;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private startTokenRefreshLoop(): void {
    if (this.refreshIntervalId || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.refreshIntervalId = setInterval(() => {
      this.checkTokenExpiration();
    }, AuthService.TOKEN_REFRESH_CHECK_INTERVAL_MS);

    this.checkTokenExpiration();
  }

  private async initializeSession(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    if (this.hasRefreshToken()) {
      await this.refreshAccessToken();
    }

    if (this.isAuthenticated()) {
      // Re-hydrate user/roles from access token after startup refresh.
      this.currentUserService.setFromJwt(this.accessToken);
      this.startTokenRefreshLoop();
    }

    return true;
  }

  private stopTokenRefreshLoop(): void {
    if (!this.refreshIntervalId) {
      return;
    }

    clearInterval(this.refreshIntervalId);
    this.refreshIntervalId = null;
  }

  private checkTokenExpiration(): void {
    if (!this.accessToken) {
      return;
    }

    if (this.isTokenExpired(this.accessTokenExpiresAt, AuthService.TOKEN_REFRESH_MIN_VALIDITY_SECONDS)) {
      void this.refreshAccessToken();
    }
  }

  private isTokenExpired(expAtMs: number | null, minValiditySeconds: number): boolean {
    if (expAtMs == null) {
      return true;
    }

    return Date.now() + minValiditySeconds * 1000 >= expAtMs;
  }

  private restoreFromStorage(): void {
    // Deprecated: No longer restoring directly, using init() refresh flow instead.
  }

  private persistToStorage(): void {
    if (!isPlatformBrowser(this.platformId) || !this.accessToken) {
      return;
    }

    if (this.refreshTokenValue) {
      sessionStorage.setItem('refresh_token', this.refreshTokenValue);
    }
  }


}

