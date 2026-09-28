import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

const waitForAuthentication = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.authInitialized).pipe(
    filter(Boolean),
    take(1)
  );
};

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return waitForAuthentication().pipe(map(() => {
    if (!authService.isAuthenticated()) return router.createUrlTree(['/']);

    const isPasswordChangeRoute = state.url.split('?')[0].replace(/\/$/, '') === '/app/change-password';
    if (authService.currentUser().mustChangePassword && !isPasswordChangeRoute) {
      return router.createUrlTree(['/app/change-password']);
    }
    if (!authService.currentUser().mustChangePassword && isPasswordChangeRoute) {
      return router.createUrlTree(['/app/dashboard']);
    }
    return true;
  }));
};

export const authMatchGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return waitForAuthentication().pipe(map(() => authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/'])));
};

export const loginRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return waitForAuthentication().pipe(map(() => {
    if (!authService.isAuthenticated()) return true;
    return router.createUrlTree([authService.currentUser().mustChangePassword
      ? '/app/change-password'
      : '/app/dashboard']);
  }));
};

export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isSuperAdmin() ? true : router.createUrlTree(['/app/dashboard']);
};
