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

  it('clears a session with an expired access token', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) - 1)
    }));

    const service = TestBed.inject(AuthService);

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
});
