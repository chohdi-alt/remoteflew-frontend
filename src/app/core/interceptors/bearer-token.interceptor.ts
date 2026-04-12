import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

function isApiRequest(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname === '/api' || pathname.startsWith('/api/');
  } catch {
    return url.startsWith('/api');
  }
}

function isPublicAuthEndpoint(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname === '/api/auth/login' || pathname === '/api/auth/refresh' || pathname === '/api/auth/change-password' || pathname === '/api/auth/activate';
  } catch {
    const path = url.split(/[?#]/)[0];
    return (
      path.endsWith('/api/auth/login') ||
      path.endsWith('/api/auth/refresh') ||
      path.endsWith('/api/auth/change-password') ||
      path.endsWith('/api/auth/activate')
    );
  }
}

export const bearerTokenInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('[INTERCEPTOR] REQUEST', req.url);

  if (!isApiRequest(req.url) || isPublicAuthEndpoint(req.url)) {
    console.log('[INTERCEPTOR] FORWARDING');
    return next(req).pipe(
      tap((res) => console.log('[INTERCEPTOR] RESPONSE', res)),
      catchError((err) => {
        console.error('[INTERCEPTOR] ERROR', err);
        return throwError(() => err);
      })
    );
  }

  const auth = inject(AuthService);
  const forward = (requestToForward: typeof req) => {
    console.log('[INTERCEPTOR] FORWARDING');
    return next(requestToForward).pipe(
      tap((res) => console.log('[INTERCEPTOR] RESPONSE', res)),
      catchError((err) => {
        console.error('[INTERCEPTOR] ERROR', err);
        return throwError(() => err);
      })
    );
  };

  return from(auth.getToken(30)).pipe(
    // Token acquisition fallback only; downstream HTTP errors should propagate.
    catchError(() => of(auth.getAccessToken())),
    switchMap((token) => {
      if (!token) {
        return forward(req);
      }

      return forward(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    })
  );
};

export const authInterceptor = bearerTokenInterceptor;
