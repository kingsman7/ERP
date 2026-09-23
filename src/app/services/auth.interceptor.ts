import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  console.log('isSuperAdmin: ', authService.isSuperAdmin());
  console.log('isTenantRequest: ', authService.isTenantRequest(request.url));
  console.log('impersonationContext: ', authService.impersonationContext());
  console.log('hasTenantContext: ', authService.hasTenantContext());

  if (authService.isSuperAdmin() && authService.isTenantRequest(request.url) && !authService.hasTenantContext()) {
    return throwError(() => new Error('Tenant context is required before making tenant requests'));
  }

  const tenantContext = authService.hasTenantContext() ? authService.impersonationContext() : null;
  const authenticatedRequest = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          ...(tenantContext ? { 'x-tenant-id': tenantContext.id } : {}),
        },
        withCredentials: true,
      })
    : request;

  return next(authenticatedRequest);
};