import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ErpStateService } from '../services/erp-state.service';

export const inventoryResolver: ResolveFn<boolean> = () => {
  const stateService = inject(ErpStateService);

  return stateService.loadInventory();
};
