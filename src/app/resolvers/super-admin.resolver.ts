import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { SuperAdminService } from '../modules/super-admin/services/super-admin.service';

export const superAdminResolver: ResolveFn<boolean> = () => inject(SuperAdminService).fetchMasterData();
