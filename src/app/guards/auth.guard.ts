import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

const checkAuthentication = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.authInitialized).pipe(
    filter(Boolean),
    take(1),
    map(() => authService.isAuthenticated()
      ? true
      : router.createUrlTree(['/']))
  );
};

export const authGuard: CanActivateFn = () => checkAuthentication();
export const authMatchGuard: CanMatchFn = () => checkAuthentication();
