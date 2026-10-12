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
    currentUser: ReturnType<typeof signal<{ mustChangePassword?: boolean }>>;
    lastAuthFailure: ReturnType<typeof signal<null>>;
    roles: [];
  };

  beforeEach(async () => {
    navigate = vi.fn().mockResolvedValue(true);
    loadSharedData = vi.fn().mockReturnValue(of(true));
    authService = {
      login: vi.fn().mockReturnValue(of(true)),
      isSuperAdmin: signal(false),
      currentUser: signal({ mustChangePassword: false }),
      lastAuthFailure: signal(null),
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

  it('keeps SUPERADMIN on the operational ERP dashboard after login', () => {
    authService.isSuperAdmin.set(true);
    submit();

    expect(navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('routes users with a temporary password to the mandatory change screen', () => {
    authService.currentUser.set({ mustChangePassword: true });
    submit();

    expect(loadSharedData).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/app/change-password']);
  });
});