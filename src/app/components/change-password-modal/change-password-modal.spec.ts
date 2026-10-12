import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';
import { ChangePasswordModalComponent } from './change-password-modal';

describe('ChangePasswordModalComponent', () => {
  let changePassword: ReturnType<typeof vi.fn>;
  let loadSharedData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    changePassword = vi.fn().mockReturnValue(of(undefined));
    loadSharedData = vi.fn().mockReturnValue(of(true));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: 'user-1',
              name: 'Usuario de prueba',
              email: 'usuario@example.com',
              mustChangePassword: true
            }),
            targetUserForPasswordChange: signal(null),
            changePassword
          }
        },
        {
          provide: ErpStateService,
          useValue: { loadSharedData, logAudit: vi.fn() }
        },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads shared ERP data after a mandatory password change', () => {
    const component = TestBed.runInInjectionContext(() => new ChangePasswordModalComponent());
    component.passwordForm.setValue({
      currentPassword: 'temporary-password',
      newPassword: 'SecurePassword2026!',
      confirmPassword: 'SecurePassword2026!'
    });
    vi.useFakeTimers();

    component.onSubmit();

    expect(changePassword).toHaveBeenCalledWith('temporary-password', 'SecurePassword2026!');
    expect(loadSharedData).toHaveBeenCalledWith(true);
  });
});
