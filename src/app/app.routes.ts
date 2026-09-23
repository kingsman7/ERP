import { Routes } from '@angular/router';
import { authGuard, authMatchGuard } from './guards/auth.guard';
import { inventoryResolver } from './resolvers/inventory.resolver';
import { routeDataResolver } from './resolvers/route-data.resolver';
import { superAdminResolver } from './resolvers/super-admin.resolver';
import { usersResolver } from './resolvers/users.resolver';
import { MasterShellComponent } from './layouts/master-shell/master-shell.component';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./components/login/login'),
	},
	{
		path: 'app',
		canMatch: [authMatchGuard],
		canActivate: [authGuard],
		loadComponent: () => import('./layouts/private-shell/private-shell.component').then(module => module.PrivateShellComponent),
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{ path: 'dashboard', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/dashboard/dashboard')},
			{ path: 'inventory', resolve: { inventoryReady: inventoryResolver }, loadComponent: () => import('./components/inventory/inventory')},
			{ path: 'kardex', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/kardex/kardex')},
			{ path: 'logistics', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/logistics/logistics')},
			{ path: 'purchases', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/purchases/purchases')},
			{ path: 'sales-pos', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/sales-pos/sales-pos')},
			{ path: 'quotes', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/quotes/quotes')},
			{ path: 'mrp', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/mrp/mrp')},
			{ path: 'crm', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/crm/crm')},
			{ path: 'treasury', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/treasury/treasury')},
			{ path: 'accounting', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/accounting/accounting')},
			{ path: 'cash-closing', loadComponent: () => import('./components/cash-closing/cash-closing')},
			{ path: 'users', resolve: { dataReady: usersResolver }, loadComponent: () => import('./components/user-management/user-management')},
			{ path: 'audit-log', resolve: { dataReady: routeDataResolver }, loadComponent: () => import('./components/audit-log/audit-log')},
			{ path: 'backups', loadComponent: () => import('./components/backup-management/backup-management')},
			{ path: 'manual', loadComponent: () => import('./components/user-manual/user-manual')},
		],
	},
	{
		path: 'master',
		canMatch: [authMatchGuard],
		canActivate: [authGuard],
		component: MasterShellComponent,
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'super-admin' },
			{ path: 'super-admin', resolve: { dataReady: superAdminResolver }, loadComponent: () => import('./modules/super-admin/super-admin-dashboard') },
		],
	},
	{ path: '**', redirectTo: '' },
];
