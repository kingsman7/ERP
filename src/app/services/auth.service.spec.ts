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

function setHostname(hostname: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { hostname }
  });
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
    setHostname('localhost');
    localStorage.clear();
  });

  it('resolves the tenant slug from a tenant hostname and stores no tenant id', () => {
    setHostname('repuestos-michelena.tudominio.com');
    const service = TestBed.inject(AuthService);

    service.resolveTenantFromHost().subscribe(context => {
      expect(context).toEqual({ slug: 'repuestos-michelena', name: 'Repuestos Michelena', status: 'ACTIVE' });
      expect(context && 'tenantId' in context).toBe(false);
    });

    const request = http.expectOne('/api/auth/public/tenants/resolve/repuestos-michelena');
    request.flush({ tenantId: 'private-id', slug: 'repuestos-michelena', name: 'Repuestos Michelena', status: 'ACTIVE' });
  });

  it('sends only credentials in the body and the resolved slug in the header', () => {
    setHostname('repuestos-michelena.localhost');
    const service = TestBed.inject(AuthService);
    service.resolveTenantFromHost().subscribe();
    http.expectOne('/api/auth/public/tenants/resolve/repuestos-michelena').flush({
      tenantId: 'private-id', slug: 'repuestos-michelena', name: 'Repuestos Michelena', status: 'ACTIVE'
    });

    service.login('user@example.com', 'password123').subscribe(result => expect(result).toBe(true));
    const request = http.expectOne('/api/auth/login');
    expect(request.request.headers.get('x-tenant-slug')).toBe('repuestos-michelena');
    expect(request.request.body).toEqual({ email: 'user@example.com', password: 'password123' });
    request.flush({ accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600), user: TEST_USER });
  });

  it('uses the master login on an admin host without resolving or sending a tenant', () => {
    setHostname('admin.example.com');
    const service = TestBed.inject(AuthService);

    service.resolveTenantFromHost().subscribe(context => expect(context).toBeNull());
    expect(service.isAdminDomain()).toBe(true);

    service.login('admin@example.com', 'password123').subscribe(result => expect(result).toBe(true));
    const request = http.expectOne('/api/v1/master/auth/login');
    expect(request.request.headers.has('x-tenant-slug')).toBe(false);
    expect(request.request.body).toEqual({ email: 'admin@example.com', password: 'password123' });
    request.flush({ accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600), user: TEST_USER });
  });

  it('uses the master login on localhost and keeps the SUPERADMIN outside tenant context', () => {
    setHostname('localhost');
    const service = TestBed.inject(AuthService);

    service.resolveTenantFromHost().subscribe(context => expect(context).toBeNull());
    expect(service.isAdminDomain()).toBe(true);

    service.login('admin@example.com', 'password123').subscribe(result => expect(result).toBe(true));
    const request = http.expectOne('/api/v1/master/auth/login');
    expect(request.request.headers.has('x-tenant-slug')).toBe(false);
    request.flush({
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600),
      user: { ...TEST_USER, role: 'SUPERADMIN' }
    });

    expect(service.isSuperAdmin()).toBe(true);
    expect(service.tenantContext()).toBeNull();
    expect(service.impersonationContext()).toBeNull();
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).impersonationContext).toBeNull();
  });

  it('accepts only a validated tenant selection for SUPERADMIN impersonation', () => {
    const accessToken = tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: { ...TEST_USER, role: 'SUPERADMIN' },
      accessToken
    }));
    const service = TestBed.inject(AuthService);
    const tenantId = '796cc9d6-6c6f-4187-8abf-e57eecf4e9c0';
    let result: unknown;

    service.impersonateTenant(tenantId).subscribe(value => result = value);
    const request = http.expectOne(`/api/v1/master/tenants/${tenantId}/impersonate`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({
      impersonationToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600),
      tenant: { id: tenantId, slug: 'tenant-a', name: 'Tenant A', status: 'ACTIVE' },
      targetUser: { id: 'target-user', email: 'target@example.com', name: 'Target', role: 'ADMIN' },
      expiresIn: '1h'
    });

    expect(result).toBeTruthy();
    expect(service.impersonationContext()).toEqual(expect.objectContaining({ id: tenantId, slug: 'tenant-a' }));
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).impersonationContext.id).toBe(tenantId);
  });

  it('rejects an invalid tenant id before making a request', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: { ...TEST_USER, role: 'SUPERADMIN' },
      accessToken: tokenWithExpiration(Math.floor(Date.now() / 1000) + 3600)
    }));
    const service = TestBed.inject(AuthService);

    let error: Error | undefined;
    service.impersonateTenant('tenant-from-user-input').subscribe({ error: value => error = value });

    expect(error?.message).toContain('tenant válido');
    http.expectNone(request => request.url.includes('/api/v1/master/tenants/'));
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
