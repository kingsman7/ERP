import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';
import { SuperAdminService } from './services/super-admin.service';
import SuperAdminDashboardComponent from './super-admin-dashboard';
import { SubscriptionPlan, Tenant } from './models/super-admin.models';

const TENANT_ID = '796cc9d6-6c6f-4187-8abf-e57eecf4e9c0';
const BASIC_PLAN_ID = 'b0f44390-e50e-4364-8fb3-e6be57f33923';

const plan: SubscriptionPlan = {
  id: 'BASIC',
  saasPlanId: BASIC_PLAN_ID,
  name: 'Plan Básico',
  tagline: '',
  description: '',
  priceMonthlyUsd: 39,
  priceAnnualUsd: 390,
  maxUsers: 5,
  storageLimitMb: 2048,
  allowedModules: ['CRM'],
  maxInvoicesMonthly: 1000,
  supportTier: 'COMMUNITY',
  customDomainSupported: false,
  apiAccess: false,
};

const tenant: Tenant = {
  id: TENANT_ID,
  slug: 'acme',
  companyName: 'Acme',
  legalTaxId: 'J-12345678-9',
  plan: 'PRO',
  status: 'ACTIVE',
  createdAt: '2026-09-22T00:00:00.000Z',
  contactEmail: 'billing@example.com',
  contactPhone: '+58 212-0000000',
  adminUserName: 'Admin',
  adminUserEmail: 'admin@example.com',
  maxUsers: 20,
  currentUsersCount: 1,
  storageLimitMb: 10240,
  storageUsedMb: 45,
  billingCycle: 'MONTHLY',
  monthlyFeeUsd: 119,
  nextBillingDate: '2026-10-22',
  region: 'us-east1',
  databaseTier: 'Cloud SQL Shared',
  features: [],
};

describe('SuperAdminDashboardComponent SaaS billing flow', () => {
  let component: SuperAdminDashboardComponent;
  let service: SuperAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SuperAdminDashboardComponent],
      providers: [
        SuperAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: {} },
        { provide: ErpStateService, useValue: { notify: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SuperAdminService);
    http = TestBed.inject(HttpTestingController);
    service.plans.set([plan]);
    service.tenants.set([tenant]);
  });

  afterEach(() => http.verify());

  it('keeps the selected tenant plan unchanged until the backend confirms ACTIVE', () => {
    component.openChangePlanModal(tenant);
    component.planChangeForm.controls.plan.setValue('BASIC');
    component.submitChangePlan();

    const checkoutRequest = http.expectOne(`/api/v1/master/tenants/${TENANT_ID}/billing/plan-change`);
    checkoutRequest.flush({
      id: 'subscription-1',
      tenantId: TENANT_ID,
      planId: BASIC_PLAN_ID,
      status: 'PENDING',
      orderId: 'pending-order-1',
      checkoutUrl: null,
    });

    expect(component.billingStatus()).toBe('PENDING');
    expect(service.tenants()[0].plan).toBe('PRO');

    component.refreshBillingStatus();

    const statusRequest = http.expectOne(`/api/v1/master/tenants/${TENANT_ID}/billing/subscription`);
    statusRequest.flush({
      tenantId: TENANT_ID,
      planId: BASIC_PLAN_ID,
      subscriptionId: 'subscription-1',
      status: 'ACTIVE',
    });

    expect(component.billingStatus()).toBe('ACTIVE');
    expect(service.tenants()[0]).toMatchObject({
      plan: 'BASIC',
      maxUsers: 5,
      storageLimitMb: 2048,
    });
  });
});