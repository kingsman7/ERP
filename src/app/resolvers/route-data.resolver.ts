import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ErpStateService } from '../services/erp-state.service';

export const routeDataResolver: ResolveFn<boolean> = route => {
  const stateService = inject(ErpStateService);
  console.log('Resolving route data for path:', route.routeConfig?.path ?? '');
  return stateService.loadRouteData(route.routeConfig?.path ?? '');
};
