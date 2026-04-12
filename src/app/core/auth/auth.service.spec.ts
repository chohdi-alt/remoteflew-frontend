import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { AppRole } from '../../models/auth.models';
import { AuthApiService } from '../../services/auth-api.service';
import { AuthService } from './auth.service';
import { CurrentUserService } from './current-user.service';

function base64UrlEncode(value: string): string {
  const bufferCtor = (globalThis as { Buffer?: { from: (data: string, encoding: string) => { toString: (encoding: string) => string } } })
    .Buffer;
  if (bufferCtor) {
    return bufferCtor.from(value, 'utf8').toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  if (typeof globalThis.TextEncoder === 'function' && typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return globalThis.btoa(binary).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  throw new Error('Base64 encoder is not available in this runtime.');
}

function buildJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe('AuthService', () => {
  let service: AuthService;
  let authApiMock: { login: jasmine.Spy; refresh: jasmine.Spy };
  let currentUserServiceMock: {
    snapshot: null;
    setFromJwt: jasmine.Spy;
    clear: jasmine.Spy;
    getRoles: jasmine.Spy<() => AppRole[]>;
    hasRole: jasmine.Spy;
    hasAnyRole: jasmine.Spy;
  };

  beforeEach(() => {
    authApiMock = {
      login: jasmine.createSpy('login').and.returnValue(
        of({ accessToken: 'token', refreshToken: null, expiresIn: 3600, roles: [] })
      ),
      refresh: jasmine.createSpy('refresh').and.returnValue(
        of({ accessToken: 'token', refreshToken: null, expiresIn: 3600, roles: [] })
      )
    };

    currentUserServiceMock = {
      snapshot: null,
      setFromJwt: jasmine.createSpy('setFromJwt'),
      clear: jasmine.createSpy('clear'),
      getRoles: jasmine.createSpy('getRoles').and.returnValue([]),
      hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
      hasAnyRole: jasmine.createSpy('hasAnyRole').and.returnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthApiService,
          useValue: authApiMock
        },
        {
          provide: CurrentUserService,
          useValue: currentUserServiceMock
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true)
          }
        }
      ]
    });
    service = TestBed.inject(AuthService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('treats null expiry as expired', () => {
    const result = ((service as unknown) as { isTokenExpired: (expAtMs: number | null, minValiditySeconds: number) => boolean }).isTokenExpired(
      null,
      0
    );
    expect(result).toBeTrue();
  });

  it('uses JWT exp claim when expiresIn is missing', () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600;
    const token = buildJwt({ exp: expSeconds });
    const session = ((service as unknown) as { normalizeSession: (response: { accessToken: string }) => { expiresAt: number | null } }).normalizeSession(
      { accessToken: token }
    );
    expect(session.expiresAt).toBe(expSeconds * 1000);
  });

  it('detects refresh token from sessionStorage when in-memory token is empty', () => {
    sessionStorage.setItem('refresh_token', 'refresh-from-storage');

    expect(service.getRefreshToken()).toBe('refresh-from-storage');
    expect(service.hasRefreshToken()).toBeTrue();
  });

  it('restores session during init by refreshing access token', async () => {
    const token = buildJwt({
      sub: 'manager-1',
      preferred_username: 'manager.user',
      roles: ['MANAGER'],
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    authApiMock.refresh.and.returnValue(
      of({
        accessToken: token,
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      })
    );

    sessionStorage.setItem('refresh_token', 'existing-refresh-token');

    const initialized = await service.init();

    expect(initialized).toBeTrue();
    expect(authApiMock.refresh).toHaveBeenCalledOnceWith('existing-refresh-token');
    expect(service.isAuthenticated()).toBeTrue();
    expect(currentUserServiceMock.setFromJwt).toHaveBeenCalledWith(token);
  });

  it('derives roles from access token path (CurrentUserService) during refresh', async () => {
    const token = buildJwt({
      sub: 'manager-2',
      preferred_username: 'manager.user2',
      roles: ['MANAGER'],
      exp: Math.floor(Date.now() / 1000) + 3600
    });

    currentUserServiceMock.getRoles.and.returnValue(['MANAGER']);
    authApiMock.refresh.and.returnValue(
      of({
        accessToken: token,
        refreshToken: 'rotated-refresh-token',
        expiresIn: 3600,
        roles: ['EMPLOYEE']
      })
    );

    const result = await firstValueFrom(service.refresh('existing-refresh-token'));

    expect(currentUserServiceMock.setFromJwt).toHaveBeenCalledWith(token);
    expect(currentUserServiceMock.setFromJwt.calls.mostRecent().args.length).toBe(1);
    expect(result?.roles).toEqual(['MANAGER']);
  });
});
