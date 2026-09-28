import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import SuperAdminDashboardComponent from './super-admin-dashboard';
import { SuperAdminService } from './services/super-admin.service';

describe('SuperAdminDashboardComponent company management', () => {
  let component: SuperAdminDashboardComponent;
  let fixture: ComponentFixture<SuperAdminDashboardComponent>;
  let service: SuperAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SuperAdminDashboardComponent],
      providers: [SuperAdminService, provideHttpClient(), provideHttpClientTesting()]
    });
    fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SuperAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('displays singleton company identity without tenant selection controls', () => {
    service.company.set({ legalName: 'Acme C.A.', taxId: 'J-12345678-9' });
    expect(component.companyName()).toBe('Acme C.A.');
    expect(component.companyTaxId()).toBe('J-12345678-9');
  });

  it('renders the company profile and billing plan without multi-company controls', () => {
    fixture.detectChanges();
    http.expectOne('/api/v1/master/company').flush({ legalName: 'Acme C.A.', taxId: 'J-12345678-9' });
    http.expectOne('/api/v1/master/billing/plans').flush([]);
    http.expectOne('/api/v1/master/billing/subscription').flush({
      planId: null,
      subscriptionId: null,
      status: 'NONE'
    });
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Perfil de la empresa');
    expect(content).toContain('Acme C.A.');
    expect(content).not.toMatch(/tenant|slug|impersonar|seleccionar empresa/i);
    expect(fixture.nativeElement.querySelector('#billing-plan')).not.toBeNull();
  });
});