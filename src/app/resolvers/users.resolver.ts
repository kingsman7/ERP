import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const usersResolver: ResolveFn<boolean> = () => inject(AuthService).loadUsersFromBackend().pipe(map(() => true));
