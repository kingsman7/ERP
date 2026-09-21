import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SKIP_AUTH_REFRESH } from './auth-context';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  const authService = injector.get(AuthService);
  const router = inject(Router);
  const token = authService.token();
  const authenticatedRequest = token
    ? request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || request.context.get(SKIP_AUTH_REFRESH)) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap(refreshed => {
          if (!refreshed) {
            authService.handleExpiredSession();
            void router.navigateByUrl('/');
            return throwError(() => error);
          }

          const retry = request.clone({
            setHeaders: { Authorization: `Bearer ${authService.token()}` },
            withCredentials: true,
          });
          return next(retry);
        }),
        catchError(refreshError => {
          authService.handleExpiredSession();
          void router.navigateByUrl('/');
          return throwError(() => refreshError);
        })
      );
    })
  );
};