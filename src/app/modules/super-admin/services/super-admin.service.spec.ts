import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
});
