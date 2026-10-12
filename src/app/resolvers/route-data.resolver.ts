import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { switchMap } from 'rxjs';
import { ErpStateService } from '../services/erp-state.service';

export const routeDataResolver: ResolveFn<boolean> = route => {
  const stateService = inject(ErpStateService);
  return stateService.loadSharedData().pipe(
    switchMap(() => stateService.loadRouteData(route.routeConfig?.path ?? ''))
  );
};
