import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, Subject, firstValueFrom, map, tap, throwError } from 'rxjs';
import { AppRole, AuthTokenResponse, CurrentUser, LoginRequestPayload, RemoteFlowTokenParsed, StoredAuthSession } from '../../models/auth.models';
import { AuthApiService } from '../../services/auth-api.service';
import { CurrentUserService } from './current-user.service';

interface NormalizedSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
  roles: string[];
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

  public readonly tokenRefreshed$ = new Subject<string>();

  init(): Promise<boolean> {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreFromStorage();
      if (this.isAuthenticated()) {
        this.startTokenRefreshLoop();
      }
    }

    return Promise.resolve(true);
  }

  get token(): string | undefined {
    return this.accessToken ?? undefined;
  }

  get username(): string | undefined {
    return this.currentUserService.snapshot?.username;
  }

  get roles(): AppRole[] {
    return this.currentUserService.getRoles();
  }

  login(payload: LoginRequestPayload): Observable<CurrentUser>;
  login(username: string, password: string): Observable<CurrentUser>;
  login(payloadOrUsername: LoginRequestPayload | string, maybePassword?: string): Observable<CurrentUser> {
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
        roles: session.roles
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
    this.removeFromStorage();
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
    return !!this.refreshTokenValue && !this.isTokenExpired(this.refreshTokenExpiresAt, 0);
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

    this.currentUserService.setFromJwt(session.accessToken, session.roles);
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
      refreshExpiresAt,
      roles: this.extractRoles(response, tokenClaims)
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

  private extractRoles(response: AuthTokenResponse, tokenClaims: RemoteFlowTokenParsed | null): string[] {
    const responseRole = response.role ? [response.role] : [];
    const responseRoles = response.roles ?? [];
    const tokenRoles = tokenClaims?.roles ?? [];
    const realmRoles = tokenClaims?.realm_access?.roles ?? [];
    const resourceRoles = Object.values(tokenClaims?.resource_access ?? {}).flatMap((resource) => resource?.roles ?? []);

    return Array.from(new Set([...responseRole, ...responseRoles, ...tokenRoles, ...realmRoles, ...resourceRoles]));
  }

  private async refreshAccessToken(): Promise<string | undefined> {
    if (!this.refreshTokenValue || this.isTokenExpired(this.refreshTokenExpiresAt, 0)) {
      this.clearSession();
      return undefined;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = firstValueFrom(this.refresh(this.refreshTokenValue))
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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const raw = localStorage.getItem(AuthService.STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const session = JSON.parse(raw) as StoredAuthSession;
      if (!session?.accessToken) {
        this.removeFromStorage();
        return;
      }

      if (this.isTokenExpired(session.expiresAt, 0)) {
        this.removeFromStorage();
        return;
      }

      this.accessToken = session.accessToken;
      this.refreshTokenValue = session.refreshToken;
      this.accessTokenExpiresAt = session.expiresAt;
      this.refreshTokenExpiresAt = session.refreshExpiresAt;
      this.currentUserService.setFromJwt(session.accessToken, session.roles ?? []);
    } catch {
      this.removeFromStorage();
    }
  }

  private persistToStorage(): void {
    if (!isPlatformBrowser(this.platformId) || !this.accessToken) {
      return;
    }

    const payload: StoredAuthSession = {
      accessToken: this.accessToken,
      refreshToken: this.refreshTokenValue,
      expiresAt: this.accessTokenExpiresAt,
      refreshExpiresAt: this.refreshTokenExpiresAt,
      roles: this.currentUserService.getRoles()
    };

    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, this.accessToken);

    const primaryRole = this.getPrimaryRole();
    if (primaryRole) {
      localStorage.setItem(AuthService.USER_ROLE_KEY, primaryRole);
    } else {
      localStorage.removeItem(AuthService.USER_ROLE_KEY);
    }
  }

  private removeFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(AuthService.STORAGE_KEY);
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_ROLE_KEY);
  }
}

