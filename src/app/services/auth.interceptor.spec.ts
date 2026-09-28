import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

function tokenWithExpiration(expiration: number): string {
  const payload = btoa(JSON.stringify({ exp: expiration }));
  return `header.${payload}.signature`;
}

describe('authInterceptor bearer authentication', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('4inline_erp_session_v1', JSON.stringify({
      user: { id: 'superadmin', name: 'Superadmin', email: 'admin@example.com', role: 'SUPERADMIN', status: 'ACTIVO' },
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600)
    }));
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('sends a normal bearer token without company headers to operational and master APIs', () => {
    client.get('/api/users').subscribe();
    const request = http.expectOne('/api/users');
    expect(request.request.headers.get('Authorization')).toContain('Bearer ');
    expect(request.request.headers.get('x-tenant-id')).toBeNull();
    request.flush([]);

    client.get('/api/v1/master/company').subscribe();
    const masterRequest = http.expectOne('/api/v1/master/company');
    expect(masterRequest.request.headers.get('Authorization')).toContain('Bearer ');
    expect(masterRequest.request.headers.has('x-tenant-id')).toBe(false);
    masterRequest.flush({});
  });
});
