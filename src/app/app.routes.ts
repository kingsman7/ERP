import { Routes } from '@angular/router';
import { adminDashboardGuard, authGuard, authMatchGuard, loginRedirectGuard, roleGuard, superAdminGuard } from './guards/auth.guard';
import { inventoryResolver } from './resolvers/inventory.resolver';
import { routeDataResolver } from './resolvers/route-data.resolver';
import { usersResolver } from './resolvers/users.resolver';
import { bcvDataResolver } from './resolvers/bcv-data.resolver';

export const routes: Routes = [
	{
		path: '',
		canActivate: [loginRedirectGuard],
		loadComponent: () => import('./components/login/login'),
	},
	{
		path: 'app',
		canMatch: [authMatchGuard],
		canActivate: [authGuard],
		resolve: { dataReady: bcvDataResolver },
		loadComponent: () => import('./layouts/private-shell/private-shell.component').then(module => module.PrivateShellComponent),
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{ path: 'change-password', loadComponent: () => import('./components/change-password-modal/change-password-modal').then(module => module.ChangePasswordModalComponent) },
			{ path: 'dashboard', canActivate: [adminDashboardGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/dashboard/dashboard')},
			{ path: 'inventory', canActivate: [roleGuard], resolve: { inventoryReady: inventoryResolver }, loadComponent: () => import('./components/inventory/inventory')},
			{ path: 'kardex', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/kardex/kardex')},
			{ path: 'logistics', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/logistics/logistics')},
			{ path: 'purchases', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/purchases/purchases')},
			{ path: 'sales-pos', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/sales-pos/sales-pos')},
			{ path: 'quotes', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/quotes/quotes')},
			{ path: 'mrp', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/mrp/mrp')},
			{ path: 'crm', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/crm/crm')},
			{ path: 'treasury', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/treasury/treasury')},
			{ path: 'accounting', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/accounting/accounting')},
			{ path: 'cash-closing', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/cash-closing/cash-closing')},
			{ path: 'users', canActivate: [roleGuard], resolve: { dataReady: usersResolver }, loadComponent: () => import('./components/user-management/user-management')},
			{ path: 'audit-log', canActivate: [roleGuard], resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/audit-log/audit-log')},
			{ path: 'backups', canActivate: [roleGuard], loadComponent: () => import('./components/backup-management/backup-management')},
			{ path: 'manual', loadComponent: () => import('./components/user-manual/user-manual')},
			{ path: 'company-admin', canActivate: [superAdminGuard], loadComponent: () => import('./modules/super-admin/super-admin-dashboard') },
		],
	},
	{ path: '**', redirectTo: '' },
];
