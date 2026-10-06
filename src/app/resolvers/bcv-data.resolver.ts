import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ErpStateService } from '../services/erp-state.service';

export const bcvDataResolver: ResolveFn<boolean> = route => {
  const stateService = inject(ErpStateService);
  return stateService.loadBcvCurrency();
};
