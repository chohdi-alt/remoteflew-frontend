import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap } from 'rxjs';
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
    return pathname === '/api/auth/login' || pathname === '/api/auth/refresh';
  } catch {
    const path = url.split(/[?#]/)[0];
    return path.endsWith('/api/auth/login') || path.endsWith('/api/auth/refresh');
  }
}

export const bearerTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url) || isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return from(auth.getToken(30)).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      return next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    }),
    catchError(() => next(req))
  );
};

export const authInterceptor = bearerTokenInterceptor;
