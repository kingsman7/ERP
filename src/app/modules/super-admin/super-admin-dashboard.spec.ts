import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
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
  let fixture: ComponentFixture<SuperAdminDashboardComponent>;
  let service: SuperAdminService;
  let http: HttpTestingController;
  let authService: {
    impersonationContext: ReturnType<typeof signal>;
    impersonateTenant: ReturnType<typeof vi.fn>;
    clearImpersonationContext: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SuperAdminDashboardComponent],
      providers: [
        SuperAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: authService = {
            impersonationContext: signal(null),
            impersonateTenant: vi.fn(),
            clearImpersonationContext: vi.fn(),
            logout: vi.fn()
          }
        },
        { provide: ErpStateService, useValue: { notify: vi.fn() } },
      ],
    });

    fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SuperAdminService);
    http = TestBed.inject(HttpTestingController);
    service.plans.set([plan]);
    service.tenants.set([tenant]);
    http.expectOne('/api/v1/master/tenants/available').flush([
      { id: TENANT_ID, slug: 'acme', name: 'Acme', status: 'ACTIVE', plan: 'PRO' },
      { id: 'not-active', slug: 'paused', name: 'Paused', status: 'SUSPENDED', plan: 'BASIC' }
    ]);
  });

  afterEach(() => http.verify());

  const fillProvisionForm = () => component.provisionForm.patchValue({
    companyName: 'Acme Nueva',
    slug: 'acme-nueva',
    legalTaxId: 'J-12345678-9',
    contactEmail: 'billing@example.com',
    contactPhone: '+58 212-555-0100',
    adminUserName: 'Admin Acme',
    adminUserEmail: 'admin@example.com',
    adminPassword: 'Initial-Password-123!',
    billingCycle: 'ANNUAL',
    region: 'sa-east1',
    customDomain: 'erp.acme.example',
    notes: 'Cuenta nueva'
  });

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

  it('loads only active tenant options from the available catalog', () => {
    expect(service.availableTenants()).toEqual([
      { id: TENANT_ID, slug: 'acme', name: 'Acme', status: 'ACTIVE', plan: 'PRO' }
    ]);
  });

  it('normalizes the paginated master tenant response without assigning plans to unassigned tenants', () => {
    service.fetchMasterData().subscribe();

    http.expectOne('/api/v1/master/tenants').flush({
      data: [
        { id: 'tenant-1', name: 'Helameb', slug: 'erp', status: 'ACTIVE', plan: null },
        { id: 'tenant-2', name: 'Acme Norte', slug: 'acme-norte', status: 'ACTIVE', plan: null },
        { id: 'tenant-3', name: 'Acme Sur', slug: 'acme-sur', status: 'SUSPENDED', plan: null }
      ],
      meta: { total: 3, page: 1, limit: 20 }
    });
    http.expectOne('/api/v1/master/billing/plans').flush([]);

    expect(service.filteredTenants()).toHaveLength(3);
    expect(service.filteredTenants()[0]).toMatchObject({
      id: 'tenant-1',
      companyName: 'Helameb',
      slug: 'erp',
      status: 'ACTIVE',
      plan: null
    });
  });

  it('submits without a plan selector and closes the provisioning modal only after API success', () => {
    component.openProvisionModal();
    fillProvisionForm();
    expect(component.provisionForm.contains('plan')).toBe(false);

    component.submitProvision();

    const request = http.expectOne('/api/v1/master/tenants');
    expect(request.request.body).toMatchObject({
      name: 'Acme Nueva',
      slug: 'acme-nueva',
      adminEmail: 'admin@example.com',
      adminName: 'Admin Acme',
      adminPassword: 'Initial-Password-123!',
      rif: 'J-12345678-9',
      contactEmail: 'billing@example.com',
      contactPhone: '+58 212-555-0100',
      billingCycle: 'ANNUAL',
      region: 'sa-east1',
      customDomain: 'erp.acme.example',
      notes: 'Cuenta nueva'
    });
    expect(component.showProvisionModal()).toBe(true);

    request.flush({
      tenant: {
        id: 'new-tenant',
        name: 'Acme Nueva',
        slug: 'acme-nueva',
        status: 'ACTIVE',
        metadata: { rif: 'J-12345678-9', region: 'sa-east1' }
      },
      adminUser: { id: 'new-admin', name: 'Admin Acme', email: 'admin@example.com' },
      mainWarehouse: { id: 'new-warehouse', code: 'ALM-ACME-01', name: 'Almacén Principal Acme Nueva' }
    });

    expect(component.showProvisionModal()).toBe(false);
    expect(service.tenants()[0]).toMatchObject({ id: 'new-tenant', companyName: 'Acme Nueva' });
  });

  it('keeps the provisioning modal open and shows the API error on failure', () => {
    component.openProvisionModal();
    fillProvisionForm();
    component.submitProvision();

    const request = http.expectOne('/api/v1/master/tenants');
    request.flush({ message: 'El slug ya está en uso' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(component.showProvisionModal()).toBe(true);
    expect(component.provisionError()).toBe('El slug ya está en uso');
    expect(fixture.nativeElement.textContent).toContain('El slug ya está en uso');
    expect(service.tenants()).toEqual([tenant]);
  });

  it('updates a tenant with PATCH and preserves the optimistic response and local state', () => {
    let response: Tenant | null = null;
    service.updateTenant(TENANT_ID, { companyName: 'Acme Updated' }).subscribe(result => {
      response = result;
    });

    const request = http.expectOne(`/api/v1/master/tenants/${TENANT_ID}`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ companyName: 'Acme Updated' });
    request.flush({ ...tenant, companyName: 'Acme Updated' });

    expect(response).toMatchObject({
      id: TENANT_ID,
      companyName: 'Acme Updated'
    });
    expect(service.tenants()[0]).toMatchObject({
      id: TENANT_ID,
      companyName: 'Acme Updated'
    });
  });

  it('selects an active catalog tenant through AuthService impersonation', () => {
    authService.impersonateTenant.mockReturnValue(of({}));
    component.availableTenantSelection.set(TENANT_ID);

    component.selectAvailableTenant();

    expect(authService.impersonateTenant).toHaveBeenCalledWith(TENANT_ID);
    expect(component.availableTenantError()).toBeNull();
  });

  it('rejects a tenant outside the active catalog and reports impersonation errors', () => {
    component.availableTenantSelection.set('not-active');
    component.selectAvailableTenant();
    expect(authService.impersonateTenant).not.toHaveBeenCalled();
    expect(component.availableTenantError()).toContain('tenant activo');

    component.availableTenantSelection.set(TENANT_ID);
    authService.impersonateTenant.mockReturnValue(throwError(() => new Error('Tenant rechazado')));
    component.selectAvailableTenant();
    expect(component.availableTenantError()).toBe('Tenant rechazado');
  });

  it('clears the tenant context and selection', () => {
    component.availableTenantSelection.set(TENANT_ID);
    component.clearAvailableTenant();

    expect(authService.clearImpersonationContext).toHaveBeenCalled();
    expect(component.availableTenantSelection()).toBe('');
  });

  it('closes the SuperAdmin session from the visible header control', () => {
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('#btn-superadmin-logout') as HTMLButtonElement;
    expect(logoutButton).not.toBeNull();
    expect(logoutButton.getAttribute('aria-label')).toBe('Cerrar sesión e ir al login');
    expect(logoutButton.querySelector('mat-icon')?.textContent?.trim()).toBe('logout');

    logoutButton.click();

    expect(authService.logout).toHaveBeenCalledTimes(1);
  });
});