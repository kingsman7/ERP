import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SuperAdminService } from './super-admin.service';

const PLAN_ID = 'b0f44390-e50e-4364-8fb3-e6be57f33923';

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

  it('loads company, plan catalog, and subscription from singleton master endpoints', () => {
    let result: boolean | undefined;
    service.fetchMasterData().subscribe(value => result = value);

    http.expectOne('/api/v1/master/company').flush({ legalName: 'Acme C.A.', taxId: 'J-12345678-9' });
    http.expectOne('/api/v1/master/billing/plans').flush([{
      id: PLAN_ID,
      code: 'BASIC',
      name: 'Plan Básico',
      price: 39,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      maxUsers: 5,
      storageLimitMb: 2048,
      features: {}
    }]);
    http.expectOne('/api/v1/master/billing/subscription').flush({
      planId: PLAN_ID,
      subscriptionId: 'subscription-1',
      status: 'ACTIVE'
    });

    expect(result).toBe(true);
    expect(service.company()).toEqual(expect.objectContaining({ legalName: 'Acme C.A.' }));
    expect(service.subscription()?.status).toBe('ACTIVE');
  });

  it('requests a plan change without a company id in the URL or body', () => {
    const selectedPlan = {
      id: PLAN_ID,
      code: 'BASIC',
      name: 'Plan Básico',
      price: 39,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      maxUsers: 5,
      storageLimitMb: 2048,
      features: {}
    };

    service.requestBillingPlanChange(selectedPlan).subscribe();

    const request = http.expectOne('/api/v1/master/billing/subscription/plan-change');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ planId: PLAN_ID, planCode: 'BASIC', currency: 'USD' });
    expect(request.request.body).not.toHaveProperty('companyId');
    expect(request.request.body.idempotencyKey).toMatch(/^plan-change:/);
    request.flush({ id: 'subscription-1', planId: PLAN_ID, status: 'PENDING', orderId: 'pending-order-1' });
  });

  it('refreshes the singleton subscription status', () => {
    service.refreshSubscription().subscribe();
    http.expectOne('/api/v1/master/billing/subscription').flush({
      planId: PLAN_ID,
      subscriptionId: 'subscription-1',
      status: 'REJECTED'
    });

    expect(service.subscription()).toEqual(expect.objectContaining({ status: 'REJECTED' }));
  });
});
