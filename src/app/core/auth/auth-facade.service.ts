import { Injectable } from '@angular/core';
import { Observable, distinctUntilChanged, map } from 'rxjs';
import { AppRole, CurrentUser, LoginRequestPayload, AuthError } from '../../models/auth.models';
import { AuthService } from './auth.service';
import { CurrentUserService } from './current-user.service';


type AuthResult =
  | CurrentUser
  | { success: false; error: AuthError };
@Injectable({
  providedIn: 'root'
})
export class AuthFacadeService {
  readonly currentUser$: Observable<CurrentUser | null>;
  readonly isAuthenticated$: Observable<boolean>;

  constructor(
    private readonly authService: AuthService,
    private readonly currentUserService: CurrentUserService
  ) {
    this.currentUser$ = this.currentUserService.currentUser$;
    this.isAuthenticated$ = this.currentUser$.pipe(
      map((user) => !!user),
      distinctUntilChanged()
    );
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  hasRole(role: AppRole | string): boolean {
    return this.authService.hasRole(role);
  }

  hasAnyRole(roles: readonly (AppRole | string)[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  login(payload: LoginRequestPayload): Observable<AuthResult> {
    return this.authService.login(payload);
  }

  logout(): Promise<void> {
    return this.authService.logout();
  }

  getToken(): Promise<string | undefined> {
    return this.authService.getValidToken();
  }

  getDefaultRouteForCurrentUser(): string {
    return this.authService.getDefaultRouteForCurrentUser();
  }

  getCurrentUserSnapshot(): CurrentUser | null {
    return this.currentUserService.snapshot;
  }
}
