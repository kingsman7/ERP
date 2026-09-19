import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
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

  it('keeps the session on refresh when the access token is still valid', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      token: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600),
      demo: false
    }));

    const service = TestBed.inject(AuthService);

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeTruthy();
    http.expectNone('/api/auth/refresh');
  });

  it('attempts refresh only when the access token has expired', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      token: tokenWithExpiration(Math.floor(Date.now() / 1000) - 1),
      demo: false
    }));

    const service = TestBed.inject(AuthService);
    const request = http.expectOne('/api/auth/refresh');

    expect(service.authInitialized()).toBeFalsy();
    request.flush({ message: 'expired' }, new HttpErrorResponse({ status: 401 }));

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalsy();
  });
});
