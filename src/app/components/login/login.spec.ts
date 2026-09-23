import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import LoginComponent from './login';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent destination', () => {
  let navigate: ReturnType<typeof vi.fn>;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    isSuperAdmin: ReturnType<typeof signal<boolean>>;
    hasTenantContext: ReturnType<typeof vi.fn>;
    tenantResolutionPending: ReturnType<typeof signal<boolean>>;
    tenantContext: ReturnType<typeof signal<null>>;
    isAdminDomain: ReturnType<typeof signal<boolean>>;
    tenantResolutionFailure: ReturnType<typeof signal<null>>;
    lastAuthFailure: ReturnType<typeof signal<null>>;
    roles: [];
  };

  beforeEach(async () => {
    navigate = vi.fn().mockResolvedValue(true);
    authService = {
      login: vi.fn().mockReturnValue(of(true)),
      isSuperAdmin: signal(false),
      hasTenantContext: vi.fn().mockReturnValue(false),
      tenantResolutionPending: signal(false),
      tenantContext: signal(null),
      isAdminDomain: signal(false),
      tenantResolutionFailure: signal(null),
      lastAuthFailure: signal(null),
      roles: []
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
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

  it('keeps tenant users on the tenant dashboard', () => {
    submit();

    expect(navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('sends a SUPERADMIN without impersonation to the Master module', () => {
    authService.isSuperAdmin.set(true);
    submit();

    expect(navigate).toHaveBeenCalledWith(['/master/super-admin']);
  });

  it('sends a SUPERADMIN with validated impersonation to the tenant dashboard', () => {
    authService.isSuperAdmin.set(true);
    authService.hasTenantContext.mockReturnValue(true);
    submit();

    expect(navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });
});