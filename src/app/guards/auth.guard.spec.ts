import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService, NAV_PERMISSIONS } from '../services/auth.service';
import { ErpStateService } from '../services/erp-state.service';
import { adminDashboardGuard, authGuard, loginRedirectGuard, roleGuard, superAdminGuard } from './auth.guard';

describe('password-change route guards', () => {
  let authService: {
    authInitialized: ReturnType<typeof signal<boolean>>;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<{ mustChangePassword?: boolean; role?: string }>>;
    getDefaultAppRoute: ReturnType<typeof vi.fn>;
  };
  let createUrlTree: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authService = {
      authInitialized: signal(true),
      isAuthenticated: signal(true),
      currentUser: signal({ mustChangePassword: true, role: 'ADMIN' }),
      getDefaultAppRoute: vi.fn(() => '/app/dashboard')
    };
    createUrlTree = vi.fn((commands: string[]) => ({ commands }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { createUrlTree } }
      ]
    });
  });

  it('redirects protected routes to mandatory password change while the flag is set', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/dashboard' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/change-password']);
  });

  it('allows only the password-change route while the flag is set', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/change-password' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await expect(firstValueFrom(result)).resolves.toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('returns users to the dashboard after the flag has been cleared', async () => {
    authService.currentUser.set({ mustChangePassword: false });
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/app/change-password' } as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('redirects an authenticated user away from login to the required destination', async () => {
    const result = TestBed.runInInjectionContext(() => loginRedirectGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot
    )) as Observable<boolean | UrlTree>;

    await firstValueFrom(result);
    expect(createUrlTree).toHaveBeenCalledWith(['/app/change-password']);
  });
});

describe('roleGuard and superAdminGuard', () => {
  let authService: {
    authInitialized: ReturnType<typeof signal<boolean>>;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    isSuperAdmin: ReturnType<typeof vi.fn>;
    canAccessNav: ReturnType<typeof vi.fn>;
    currentRoleConfig: ReturnType<typeof vi.fn>;
    getDefaultAppRoute: ReturnType<typeof vi.fn>;
  };
  let stateService: {
    notify: ReturnType<typeof vi.fn>;
  };
  let createUrlTree: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authService = {
      authInitialized: signal(true),
      isAuthenticated: signal(true),
      isSuperAdmin: vi.fn(() => false),
      canAccessNav: vi.fn((navId: string) => navId === 'sales-pos'),
      currentRoleConfig: vi.fn(() => ({ name: 'Cajero / Vendedor', description: 'POS' })),
      getDefaultAppRoute: vi.fn(() => '/app/sales-pos')
    };
    stateService = {
      notify: vi.fn()
    };
    createUrlTree = vi.fn((commands: string[]) => ({ commands }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ErpStateService, useValue: stateService },
        { provide: Router, useValue: { createUrlTree } }
      ]
    });
  });

  describe('superAdminGuard', () => {
    it('allows access when user is super admin', () => {
      authService.isSuperAdmin.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() => superAdminGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      ));

      expect(result).toBe(true);
      expect(stateService.notify).not.toHaveBeenCalled();
      expect(createUrlTree).not.toHaveBeenCalled();
    });

    it('blocks and redirects to dashboard with notification when user is not super admin', () => {
      authService.isSuperAdmin.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => superAdminGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      ));

      expect(result).toEqual({ commands: ['/app/sales-pos'] });
      expect(stateService.notify).toHaveBeenCalledWith(
        'warning',
        'Acceso No Autorizado',
        expect.stringContaining('Super Administradores')
      );
    });
  });

  describe('roleGuard', () => {
    it('redirects unauthenticated users to root /', async () => {
      authService.isAuthenticated.set(false);

      const result = TestBed.runInInjectionContext(() => roleGuard(
        { routeConfig: { path: 'sales-pos' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )) as Observable<boolean | UrlTree>;

      const val = await firstValueFrom(result);
      expect(val).toEqual({ commands: ['/'] });
    });

    it('allows super admin to access any module without restriction', async () => {
      authService.isSuperAdmin.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() => roleGuard(
        { routeConfig: { path: 'accounting' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )) as Observable<boolean | UrlTree>;

      const val = await firstValueFrom(result);
      expect(val).toBe(true);
      expect(stateService.notify).not.toHaveBeenCalled();
      expect(createUrlTree).not.toHaveBeenCalled();
    });

    it('allows user with proper permission to access module', async () => {
      authService.canAccessNav.mockReturnValue(true);

      const result = TestBed.runInInjectionContext(() => roleGuard(
        { routeConfig: { path: 'sales-pos' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )) as Observable<boolean | UrlTree>;

      const val = await firstValueFrom(result);
      expect(val).toBe(true);
      expect(stateService.notify).not.toHaveBeenCalled();
    });

    it('blocks unauthorized user, shows warning notification, and redirects to /app/dashboard', async () => {
      authService.canAccessNav.mockReturnValue(false);

      const result = TestBed.runInInjectionContext(() => roleGuard(
        { routeConfig: { path: 'accounting' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )) as Observable<boolean | UrlTree>;

      const val = await firstValueFrom(result);
      expect(val).toEqual({ commands: ['/app/sales-pos'] });
      expect(stateService.notify).toHaveBeenCalledWith(
        'warning',
        'Acceso No Autorizado',
        expect.stringContaining('Contabilidad')
      );
    });

    describe('adminDashboardGuard', () => {
      it('allows ADMIN users to access the dashboard', async () => {
        authService.canAccessNav.mockReturnValue(true);

        const result = TestBed.runInInjectionContext(() => adminDashboardGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        )) as Observable<boolean | UrlTree>;

        await expect(firstValueFrom(result)).resolves.toBe(true);
        expect(stateService.notify).not.toHaveBeenCalled();
      });

      it('redirects non-ADMIN users to an allowed module', async () => {
        authService.canAccessNav.mockReturnValue(false);

        const result = TestBed.runInInjectionContext(() => adminDashboardGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        )) as Observable<boolean | UrlTree>;

        await expect(firstValueFrom(result)).resolves.toEqual({ commands: ['/app/sales-pos'] });
        expect(stateService.notify).toHaveBeenCalledWith(
          'warning',
          'Acceso No Autorizado',
          expect.stringContaining('rol ADMIN')
        );
      });
    });

    it('allows access to routes not restricted in NAV_PERMISSIONS', async () => {
      const result = TestBed.runInInjectionContext(() => roleGuard(
        { routeConfig: { path: 'unregistered-route' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )) as Observable<boolean | UrlTree>;

      const val = await firstValueFrom(result);
      expect(val).toBe(true);
      expect(stateService.notify).not.toHaveBeenCalled();
    });
  });
});