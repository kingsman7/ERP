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

  it('restores the user session from persisted user data and refreshes the access token via cookie', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
      demo: false
    }));

    const service = TestBed.inject(AuthService);
    const request = http.expectOne('/api/auth/refresh');

    expect(service.authInitialized()).toBeFalsy();
    request.flush({ accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600) });

    expect(service.authInitialized()).toBeTruthy();
    expect(service.isAuthenticated()).toBeTruthy();
    expect(localStorage.getItem(SESSION_KEY)).toContain('"user"');
    expect(localStorage.getItem(SESSION_KEY)).not.toContain('"token"');
  });

  it('clears the session when refresh is rejected', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: TEST_USER,
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
