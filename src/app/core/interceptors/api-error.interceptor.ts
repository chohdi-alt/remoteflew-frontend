import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, finalize, from, of, switchMap, throwError } from 'rxjs';
import { ApiErrorPayload } from '../../models/auth.models';
import { AuthService } from '../auth/auth.service';

const AUTH_RETRY_CONTEXT = new HttpContextToken<boolean>(() => false);
let handlingSessionExpiry = false;

function isApiRequest(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname === '/api' || pathname.startsWith('/api/');
  } catch {
    return url.startsWith('/api');
  }
}

function isLoginEndpoint(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname === '/api/auth/login';
  } catch {
    return url.endsWith('/api/auth/login');
  }
}

function isRefreshEndpoint(url: string): boolean {
  try {
    const pathname = new URL(url, 'http://localhost').pathname;
    return pathname === '/api/auth/refresh';
  } catch {
    return url.endsWith('/api/auth/refresh');
  }
}

function toApiErrorPayload(error: HttpErrorResponse): ApiErrorPayload {
  const payload =
    typeof error.error === 'object' && error.error !== null
      ? (error.error as Partial<ApiErrorPayload>)
      : {};

  return {
    timestamp: String(payload.timestamp ?? new Date().toISOString()),
    status: Number(payload.status ?? error.status),
    errorCode: String(payload.errorCode ?? `HTTP_${error.status}`),
    message: String(payload.message ?? error.message ?? 'Request failed'),
    path: String(payload.path ?? '')
  };
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const auth = inject(AuthService);

  const handleSessionExpiry = (error: HttpErrorResponse, message: string) => {
    if (handlingSessionExpiry) {
      return throwError(() => error);
    }

    handlingSessionExpiry = true;

    return from(auth.logout(false)).pipe(
      catchError(() => of(null)),
      switchMap(() => {
        toastr.warning(message, 'Session expired');
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url || '/' }
        });
        return throwError(() => error);
      }),
      finalize(() => {
        handlingSessionExpiry = false;
      })
    );
  };

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !isApiRequest(req.url)) {
        return throwError(() => error);
      }

      const apiError = toApiErrorPayload(error);

      if (error.status === 401) {
        if (isLoginEndpoint(req.url)) {
          toastr.error(apiError.message || 'Invalid username or password.', 'Authentication failed');
          void router.navigate(['/login']);
          return throwError(() => error);
        }

        if (isRefreshEndpoint(req.url) || req.context.get(AUTH_RETRY_CONTEXT) || !auth.hasRefreshToken()) {
          return handleSessionExpiry(error, 'Your session has expired. Please log in again.');
        }

        return from(auth.forceRefreshToken()).pipe(
          switchMap((token) => {
            if (!token) {
              return handleSessionExpiry(error, 'Your session has expired. Please log in again.');
            }

            return next(
              req.clone({
                context: req.context.set(AUTH_RETRY_CONTEXT, true),
                setHeaders: {
                  Authorization: `Bearer ${token}`
                }
              })
            ).pipe(
              catchError((retryError: unknown) => {
                if (!(retryError instanceof HttpErrorResponse)) {
                  return throwError(() => retryError);
                }

                const retryApiError = toApiErrorPayload(retryError);
                if (retryError.status === 401) {
                  return handleSessionExpiry(retryError, 'Your session has expired. Please log in again.');
                }

                if (retryError.status === 403) {
                  toastr.error(retryApiError.message, 'Access denied');
                  void router.navigateByUrl('/access-denied');
                  return throwError(() => retryError);
                }

                toastr.error(retryApiError.message, retryApiError.errorCode);
                return throwError(() => retryError);
              })
            );
          }),
          catchError(() => handleSessionExpiry(error, 'Your session has expired. Please log in again.'))
        );
      }

      if (error.status === 403) {
        toastr.error(apiError.message, 'Access denied');
        void router.navigateByUrl('/access-denied');
        return throwError(() => error);
      }

      toastr.error(apiError.message, apiError.errorCode);
      return throwError(() => error);
    })
  );
};
