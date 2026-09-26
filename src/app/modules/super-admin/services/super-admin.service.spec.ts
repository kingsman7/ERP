import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../services/auth.service';
import { ErpStateService } from '../../../services/erp-state.service';
import { SuperAdminService } from './super-admin.service';

const PLAN_ID = 'b0f44390-e50e-4364-8fb3-e6be57f33923';
const TENANT_ID = '796cc9d6-6c6f-4187-8abf-e57eecf4e9c0';

describe('SuperAdminService SaaS billing', () => {
  let service: SuperAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SuperAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: ErpStateService, useValue: { notify: vi.fn() } },
      ],
    });
    service = TestBed.inject(SuperAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a pending checkout for the selected plan without changing local tenant state', () => {
    service.plans.set([{
      id: 'PRO',
      saasPlanId: PLAN_ID,
      name: 'Plan Profesional',
      tagline: '',
      description: '',
      priceMonthlyUsd: 119,
      priceAnnualUsd: 1140,
      maxUsers: 20,
      storageLimitMb: 10240,
      allowedModules: [],
      maxInvoicesMonthly: 8000,
      supportTier: 'STANDARD_24_7',
      customDomainSupported: true,
      apiAccess: true,
    }]);

    let result: unknown;
    service.requestBillingPlanChange(TENANT_ID, {
      planId: PLAN_ID,
      planCode: 'FULL',
      currency: 'USD',
    }).subscribe(value => result = value);

    const request = http.expectOne(`/api/v1/master/tenants/${TENANT_ID}/billing/plan-change`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ planId: PLAN_ID, planCode: 'FULL', currency: 'USD' });
    expect(request.request.body.idempotencyKey).toMatch(/^plan-change:/);
    request.flush({
      id: 'subscription-1',
      tenantId: TENANT_ID,
      planId: PLAN_ID,
      status: 'PENDING',
      orderId: 'pending-order-1',
      checkoutUrl: 'https://sandbox.invalid/checkout/pending-order-1',
    });

    expect(result).toMatchObject({ status: 'PENDING', orderId: 'pending-order-1' });
  });

  it('exposes an approved subscription status', () => {
    let result: unknown;
    service.getBillingSubscriptionStatus(TENANT_ID).subscribe(value => result = value);

    http.expectOne(`/api/v1/master/tenants/${TENANT_ID}/billing/subscription`).flush({
      tenantId: TENANT_ID,
      planId: PLAN_ID,
      subscriptionId: 'subscription-1',
      status: 'ACTIVE',
    });

    expect(result).toEqual(expect.objectContaining({ status: 'ACTIVE', planId: PLAN_ID }));
  });

  it('exposes a rejected subscription status without activating a plan', () => {
    let result: unknown;
    service.getBillingSubscriptionStatus(TENANT_ID).subscribe(value => result = value);

    http.expectOne(`/api/v1/master/tenants/${TENANT_ID}/billing/subscription`).flush({
      tenantId: TENANT_ID,
      planId: PLAN_ID,
      subscriptionId: 'subscription-1',
      status: 'REJECTED',
    });

    expect(result).toEqual(expect.objectContaining({ status: 'REJECTED' }));
  });

  it('sends the supported tenant creation fields and stores the normalized API response only after success', () => {
    const password = 'Initial-Password-123!';
    let result: unknown;
    service.createTenant({
      companyName: 'Acme Norte',
      slug: 'acme-norte',
      legalTaxId: 'J-12345678-9',
      adminUserName: 'Admin Acme',
      adminUserEmail: 'ADMIN@EXAMPLE.COM',
      adminPassword: password,
      contactEmail: 'BILLING@EXAMPLE.COM',
      contactPhone: '+58 212-555-0100',
      billingCycle: 'ANNUAL',
      region: 'sa-east1',
      customDomain: 'erp.acme.example',
      notes: 'Cuenta prioritaria'
    }).subscribe(value => result = value);

    const request = http.expectOne('/api/v1/master/tenants');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Acme Norte',
      slug: 'acme-norte',
      adminEmail: 'admin@example.com',
      adminName: 'Admin Acme',
      adminPassword: password,
      rif: 'J-12345678-9',
      contactEmail: 'billing@example.com',
      contactPhone: '+58 212-555-0100',
      billingCycle: 'ANNUAL',
      region: 'sa-east1',
      customDomain: 'erp.acme.example',
      notes: 'Cuenta prioritaria'
    });
    expect(request.request.body).not.toHaveProperty('planId');
    expect(service.tenants()).toHaveLength(0);
    expect(service.auditLogs()).toHaveLength(0);

    request.flush({
      tenant: {
        id: TENANT_ID,
        name: 'Acme Norte',
        slug: 'acme-norte',
        status: 'ACTIVE',
        createdAt: '2026-09-26T00:00:00.000Z',
        metadata: {
          rif: 'J-12345678-9',
          contactEmail: 'billing@example.com',
          contactPhone: '+58 212-555-0100',
          billingCycle: 'ANNUAL',
          region: 'sa-east1',
          customDomain: 'erp.acme.example',
          notes: 'Cuenta prioritaria'
        }
      },
      adminUser: { id: 'admin-1', name: 'Admin Acme', email: 'admin@example.com', passwordHash: 'must-not-leak' },
      mainWarehouse: { id: 'warehouse-1', code: 'ALM-ACME-01', name: 'Almacén Principal Acme Norte' }
    });

    expect(result).toMatchObject({
      id: TENANT_ID,
      companyName: 'Acme Norte',
      slug: 'acme-norte',
      legalTaxId: 'J-12345678-9',
      contactEmail: 'billing@example.com',
      contactPhone: '+58 212-555-0100',
      adminUserName: 'Admin Acme',
      adminUserEmail: 'admin@example.com',
      billingCycle: 'ANNUAL',
      plan: null,
      region: 'sa-east1',
      customDomain: 'erp.acme.example',
      notes: 'Cuenta prioritaria'
    });
    expect(service.tenants()[0]).toEqual(result);
    expect(service.auditLogs()[0]).toMatchObject({ tenantId: TENANT_ID, action: 'PROVISION_TENANT' });
    expect(TestBed.inject(ErpStateService).notify).toHaveBeenCalledWith(
      'success',
      'Tenant Aprovisionado con Éxito',
      expect.stringContaining('Acme Norte')
    );
    expect(JSON.stringify(service.tenants())).not.toContain(password);
    expect(JSON.stringify(service.tenants())).not.toContain('must-not-leak');
  });

  it('propagates tenant creation errors without changing tenant state, audit, or success notifications', () => {
    let caughtError: unknown;
    service.createTenant({
      companyName: 'Acme',
      slug: 'acme',
      legalTaxId: 'J-12345678-9',
      adminUserName: 'Admin',
      adminUserEmail: 'admin@example.com',
      adminPassword: 'Initial-Password-123!',
      contactEmail: 'billing@example.com'
    }).subscribe({ error: error => caughtError = error });

    const request = http.expectOne('/api/v1/master/tenants');
    request.flush({ message: 'El slug ya está en uso' }, { status: 409, statusText: 'Conflict' });

    expect(caughtError).toMatchObject({ status: 409 });
    expect(service.tenants()).toEqual([]);
    expect(service.auditLogs()).toEqual([]);
    expect(TestBed.inject(ErpStateService).notify).not.toHaveBeenCalled();
  });
});
