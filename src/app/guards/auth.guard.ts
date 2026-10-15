import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService, NAV_PERMISSIONS } from '../services/auth.service';
import { ErpStateService } from '../services/erp-state.service';

const waitForAuthentication = () => {
  const authService = inject(AuthService);

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
      return router.createUrlTree([authService.getDefaultAppRoute()]);
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
      : authService.getDefaultAppRoute()]);
  }));
};

export const adminDashboardGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const stateService = inject(ErpStateService);

  return waitForAuthentication().pipe(map(() => {
    if (!authService.isAuthenticated()) return router.createUrlTree(['/']);
    if (authService.canAccessNav('dashboard')) return true;

    stateService.notify(
      'warning',
      'Acceso No Autorizado',
      'El Dashboard Ejecutivo está restringido exclusivamente al rol ADMIN.'
    );
    return router.createUrlTree([authService.getDefaultAppRoute()]);
  }));
};

export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const stateService = inject(ErpStateService);

  if (authService.isSuperAdmin()) return true;

  stateService.notify(
    'warning',
    'Acceso No Autorizado',
    'El módulo de Empresa y Suscripción está restringido exclusivamente a Super Administradores.'
  );
  return router.createUrlTree([authService.getDefaultAppRoute()]);
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const stateService = inject(ErpStateService);

  return waitForAuthentication().pipe(
    map(() => {
      if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/']);
      }

      const path = route.routeConfig?.path || '';
      if (!stateService.isTabAllowedInPlan(path)) {
        const rule = NAV_PERMISSIONS[path];
        const moduleTitle = rule?.title || path;
        stateService.notify(
          'warning',
          'Módulo no incluido en el plan',
          `El módulo "${moduleTitle}" pertenece al plan Full / Pro y no está disponible en el plan básico.`
        );
        return router.createUrlTree([authService.getDefaultAppRoute()]);
      }

      if (authService.isSuperAdmin()) {
        return true;
      }

      const rule = NAV_PERMISSIONS[path];

      if (!rule) {
        return true;
      }

      const hasAccess = authService.canAccessNav(path);
      if (!hasAccess) {
        const moduleTitle = rule.title || path;
        const currentRoleName = authService.currentRoleConfig().name;
        stateService.notify(
          'warning',
          'Acceso No Autorizado',
          `No tienes permisos para acceder al módulo "${moduleTitle}". Tu rol actual es ${currentRoleName}.`
        );
        return router.createUrlTree([authService.getDefaultAppRoute()]);
      }

      return true;
    })
  );
};
