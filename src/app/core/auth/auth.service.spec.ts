import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: AuthApiService,
          useValue: {
            login: () => of({ accessToken: 'token', refreshToken: null, expiresIn: 3600, roles: [] }),
            refresh: () => of({ accessToken: 'token', refreshToken: null, expiresIn: 3600, roles: [] })
          }
        },
        {
          provide: CurrentUserService,
          useValue: {
            snapshot: null,
            setFromJwt: () => {},
            clear: () => {},
            getRoles: () => [],
            hasRole: () => false,
            hasAnyRole: () => false
          }
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
});
