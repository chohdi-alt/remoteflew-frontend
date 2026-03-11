import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_ROLES, AppRole, CurrentUser, RemoteFlowTokenParsed } from '../../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class CurrentUserService {
  private readonly currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  readonly currentUser$: Observable<CurrentUser | null> = this.currentUserSubject.asObservable();

  get snapshot(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  setFromJwt(jwt: string | null | undefined, fallbackRoles: readonly string[] = []): void {
    const token = this.parseJwt(jwt);
    this.setFromToken(token, fallbackRoles);
  }

  setFromToken(token: RemoteFlowTokenParsed | null | undefined, fallbackRoles: readonly string[] = []): void {
    if (!token?.sub) {
      this.clear();
      return;
    }

    const roles = this.mapRoles([
      ...(fallbackRoles ?? []),
      ...(token.roles ?? []),
      ...(token.realm_access?.roles ?? []),
      ...this.extractResourceRoles(token.resource_access)
    ]);

    this.currentUserSubject.next({
      userId: token.sub,
      username: token.preferred_username ?? token.sub,
      email: token.email ?? null,
      roles,
      authorities: roles.map((role) => `ROLE_${role}`)
    });
  }

  clear(): void {
    this.currentUserSubject.next(null);
  }

  getRoles(): AppRole[] {
    return this.snapshot?.roles ?? [];
  }

  hasRole(role: string): boolean {
    const normalized = this.normalizeRole(role);
    if (!normalized) {
      return false;
    }
    return this.getRoles().includes(normalized);
  }

  /**
   * Returns true when any provided role matches; empty arrays return false.
   */
  hasAnyRole(roles: readonly string[]): boolean {
    return roles.length > 0 && roles.some((role) => this.hasRole(role));
  }

  private parseJwt(jwt: string | null | undefined): RemoteFlowTokenParsed | null {
    if (!jwt) {
      return null;
    }

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
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(value);
    }

    throw new Error('Base64 decoder is not available in this runtime.');
  }

  private mapRoles(rawRoles: readonly string[]): AppRole[] {
    const unique = new Set<AppRole>();

    for (const rawRole of rawRoles) {
      const normalized = this.normalizeRole(rawRole);
      if (normalized) {
        unique.add(normalized);
      }
    }

    return Array.from(unique);
  }

  private extractResourceRoles(resourceAccess: RemoteFlowTokenParsed['resource_access']): string[] {
    if (!resourceAccess) {
      return [];
    }

    return Object.values(resourceAccess).flatMap((resource) => resource?.roles ?? []);
  }

  private normalizeRole(rawRole: string): AppRole | null {
    const value = String(rawRole ?? '').trim().toUpperCase();
    const withoutPrefix = value.startsWith('ROLE_') ? value.slice(5) : value;

    return (APP_ROLES as readonly string[]).includes(withoutPrefix)
      ? (withoutPrefix as AppRole)
      : null;
  }
}
