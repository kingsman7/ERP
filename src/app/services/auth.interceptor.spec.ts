import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

function tokenWithExpiration(expiration: number): string {
  const payload = btoa(JSON.stringify({ exp: expiration }));
  return `header.${payload}.signature`;
}

describe('authInterceptor tenant context', () => {
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

  it('blocks tenant requests until a server-issued tenant context exists', () => {
    const service = TestBed.inject(AuthService);
    let error: Error | undefined;

    client.get('/api/users').subscribe({ error: value => error = value });

    expect(error?.message).toContain('Tenant context is required');
    http.expectNone('/api/users');
  });

  it('allows master requests without tenant context and does not send x-tenant-id', () => {
    client.get('/api/v1/master/tenants').subscribe();

    const request = http.expectOne('/api/v1/master/tenants');
    expect(request.request.headers.get('Authorization')).toContain('Bearer ');
    expect(request.request.headers.get('x-tenant-id')).toBeNull();
    request.flush([]);
  });

  it('sends Bearer and x-tenant-id only from the validated impersonation context', () => {
    const service = TestBed.inject(AuthService);
    const tenantId = '796cc9d6-6c6f-4187-8abf-e57eecf4e9c0';

    service.impersonateTenant(tenantId).subscribe();
    const impersonationRequest = http.expectOne(`/api/v1/master/tenants/${tenantId}/impersonate`);
    expect(impersonationRequest.request.headers.get('x-tenant-id')).toBeNull();
    impersonationRequest.flush({
      impersonationToken: 'temporary-token',
      tenant: { id: tenantId, slug: 'tenant-a', name: 'Tenant A', status: 'ACTIVE' },
      targetUser: { id: 'target-user', email: 'target@example.com', name: 'Target', role: 'ADMIN' },
      expiresIn: '1h'
    });

    client.get('/api/users').subscribe();
    const tenantRequest = http.expectOne('/api/users');
    expect(tenantRequest.request.headers.get('Authorization')).toBe('Bearer temporary-token');
    expect(tenantRequest.request.headers.get('x-tenant-id')).toBe(tenantId);
    tenantRequest.flush([]);
  });
});
