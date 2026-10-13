import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import LoginComponent from './login';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';

describe('LoginComponent destination', () => {
  let navigate: ReturnType<typeof vi.fn>;
  let loadSharedData: ReturnType<typeof vi.fn>;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    isSuperAdmin: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<{ mustChangePassword?: boolean; role?: string }>>;
    lastAuthFailure: ReturnType<typeof signal<null>>;
    getDefaultAppRoute: ReturnType<typeof vi.fn>;
    roles: [];
  };

  beforeEach(async () => {
    navigate = vi.fn().mockResolvedValue(true);
    loadSharedData = vi.fn().mockReturnValue(of(true));
    authService = {
      login: vi.fn().mockReturnValue(of(true)),
      isSuperAdmin: signal(false),
      currentUser: signal({ mustChangePassword: false, role: 'ADMIN' }),
      lastAuthFailure: signal(null),
      getDefaultAppRoute: vi.fn(() => '/app/dashboard'),
      roles: []
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ErpStateService, useValue: { loadSharedData } },
        { provide: Router, useValue: { navigate } },
        provideRouter([])
      ]
    }).compileComponents();
  });

  function submit(): void {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.loginForm.setValue({
      email: 'user@example.com',
      password: 'password',
      rememberMe: true
    });
    fixture.componentInstance.onSubmitCredentials();
  }

  it('keeps company users on the operational dashboard', () => {
    submit();

    expect(loadSharedData).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('routes SUPERADMIN to company administration after login', () => {
    authService.isSuperAdmin.set(true);
    authService.getDefaultAppRoute.mockReturnValue('/app/company-admin');
    submit();

    expect(navigate).toHaveBeenCalledWith(['/app/company-admin']);
  });

  it('routes non-ADMIN users to an authorized module after login', () => {
    authService.currentUser.set({ mustChangePassword: false, role: 'WAREHOUSE' });
    authService.getDefaultAppRoute.mockReturnValue('/app/inventory');
    submit();

    expect(navigate).toHaveBeenCalledWith(['/app/inventory']);
  });

  it('routes users with a temporary password to the mandatory change screen', () => {
    authService.currentUser.set({ mustChangePassword: true });
    submit();

    expect(loadSharedData).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/app/change-password']);
  });
});