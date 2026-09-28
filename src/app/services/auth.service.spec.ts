import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const SESSION_KEY = '4inline_erp_session_v1';
const TEST_USER = {
  id: 'user-test',
  name: 'Usuario de Prueba',
  email: 'test@example.com',
  role: 'ADMIN',
  status: 'ACTIVO'
};

function tokenWithExpiration(expiration: number): string {
  const payload = btoa(JSON.stringify({ exp: expiration }));
  return `header.${payload}.signature`;
}

describe('AuthService session restoration', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('logs in through the shared endpoint without company context', () => {
    const service = TestBed.inject(AuthService);

    service.login('user@example.com', 'password123').subscribe(result => expect(result).toBe(true));
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'user@example.com', password: 'password123' });
    request.flush({ accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600), user: TEST_USER });
  });

  it('retains mustChangePassword from login for the route guard', () => {
    const service = TestBed.inject(AuthService);

    service.login('user@example.com', 'temporary-password').subscribe(result => expect(result).toBe(true));
    http.expectOne('/api/auth/login').flush({
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600),
      user: { ...TEST_USER, mustChangePassword: true }
    });

    expect(service.currentUser().mustChangePassword).toBe(true);
  });

  it('preserves the SUPERADMIN role in the normal authenticated session', () => {
    const service = TestBed.inject(AuthService);

    service.login('admin@example.com', 'password123').subscribe(result => expect(result).toBe(true));
    const request = http.expectOne('/api/auth/login');
    request.flush({
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600),
      user: { ...TEST_USER, role: 'SUPERADMIN' }
    });

    expect(service.isSuperAdmin()).toBe(true);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).user.role).toBe('SUPERADMIN');
    expect('impersonationContext' in JSON.parse(localStorage.getItem(SESSION_KEY)!)).toBe(false);
  });

  it('restores a session from a persisted valid access token without calling refresh', () => {
    const accessToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      accessToken
    }));

    const service = TestBed.inject(AuthService);

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeTruthy();
    expect(service.token()).toBe(accessToken);
  });

  it('refreshes an expired access token before clearing the session', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)
    }));

    const service = TestBed.inject(AuthService);
    const request = http.expectOne('/api/auth/refresh');
    const refreshedToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    request.flush({ accessToken: refreshedToken, mustChangePassword: true });

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeTruthy();
    expect(service.token()).toBe(refreshedToken);
    expect(service.currentUser().mustChangePassword).toBe(true);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).user.mustChangePassword).toBe(true);
  });

  it('clears the session when the refresh token is rejected', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)
    }));

    const service = TestBed.inject(AuthService);
    const request = http.expectOne('/api/auth/refresh');
    request.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalsy();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('does not grant super-admin access to an authenticated auditor', () => {
    const accessToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: { ...TEST_USER, role: 'AUDITOR', email: 'auditor@example.com' },
      accessToken,
    }));

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentRoleConfig().permissions).toContain('audit:view');
    expect(service.isSuperAdmin()).toBe(false);
  });

  it('resets a temporary password through the admin endpoint without storing it locally', () => {
    const service = TestBed.inject(AuthService);
    const temporaryPassword = 'Temporary-Password-2026';

    service.adminSetUserPassword('target-user-id', temporaryPassword).subscribe();
    const request = http.expectOne('/api/auth/users/target-user-id/temporary-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ temporaryPassword });
    request.flush({ success: true });

    expect(JSON.stringify(service.users())).not.toContain(temporaryPassword);
  });

  it('stores the new access token and clears the password-change flag after a successful change', () => {
    const oldAccessToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: { ...TEST_USER, mustChangePassword: true },
      accessToken: oldAccessToken
    }));
    const service = TestBed.inject(AuthService);
    const newAccessToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 7200);

    service.changePassword('temporary-password', 'a-long-new-password-2026').subscribe();
    const request = http.expectOne('/api/auth/change-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      currentPassword: 'temporary-password',
      newPassword: 'a-long-new-password-2026'
    });
    request.flush({ accessToken: newAccessToken, mustChangePassword: false });

    expect(service.token()).toBe(newAccessToken);
    expect(service.currentUser().mustChangePassword).toBe(false);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).accessToken).toBe(newAccessToken);
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).user.mustChangePassword).toBe(false);
  });
});
