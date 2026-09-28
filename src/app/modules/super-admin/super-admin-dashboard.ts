import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { SuperAdminService } from './services/super-admin.service';
import { BillingSubscriptionStatus } from './models/super-admin.models';

@Component({
  selector: 'app-super-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './super-admin-dashboard.html'
})
export default class SuperAdminDashboardComponent implements OnInit {
  readonly superAdminService = inject(SuperAdminService);
  readonly selectedPlanCode = signal('');
  readonly billingLoading = signal(false);
  readonly billingError = signal<string | null>(null);
  readonly checkoutUrl = signal<string | null>(null);
  readonly selectedPlan = computed(() => this.superAdminService.plans().find(plan => plan.code === this.selectedPlanCode()) ?? null);
  readonly companyName = computed(() => {
    const company = this.superAdminService.company();
    return company?.legalName || company?.name || company?.tradeName || 'Empresa';
  });
  readonly companyTaxId = computed(() => {
    const company = this.superAdminService.company();
    return company?.taxId || company?.rif || 'No registrado';
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.superAdminService.fetchMasterData().subscribe(() => {
      const activePlan = this.superAdminService.plans().find(plan => plan.id === this.superAdminService.subscription()?.planId);
      this.selectedPlanCode.set(activePlan?.code || this.superAdminService.plans()[0]?.code || '');
    });
  }

  requestPlanChange(): void {
    const plan = this.selectedPlan();
    if (!plan || this.billingLoading()) return;

    this.billingLoading.set(true);
    this.billingError.set(null);
    this.checkoutUrl.set(null);
    this.superAdminService.requestBillingPlanChange(plan).subscribe({
      next: checkout => {
        this.superAdminService.subscription.update(current => ({
          planId: checkout.planId,
          subscriptionId: checkout.id || current?.subscriptionId || null,
          status: checkout.status
        }));
        this.checkoutUrl.set(checkout.checkoutUrl || null);
        this.billingLoading.set(false);
      },
      error: error => {
        this.billingError.set(this.getBillingErrorMessage(error));
        this.billingLoading.set(false);
      }
    });
  }

  refreshSubscription(): void {
    this.billingError.set(null);
    this.superAdminService.refreshSubscription().subscribe({
      error: error => this.billingError.set(this.getBillingErrorMessage(error))
    });
  }

  statusLabel(status: BillingSubscriptionStatus | undefined): string {
    switch (status) {
      case 'ACTIVE': return 'Activa';
      case 'PENDING': return 'Pendiente de pago';
      case 'REJECTED': return 'Pago rechazado';
      case 'CANCELLED': return 'Cancelada';
      case 'EXPIRED': return 'Vencida';
      default: return 'Sin suscripción';
    }
  }

  private getBillingErrorMessage(error: unknown): string {
    const response = error as HttpErrorResponse;
    if (response?.status === 401 || response?.status === 403) return 'No estás autorizado para consultar la facturación de la empresa.';
    if (response?.status === 400) return response.error?.message || 'La solicitud de cambio de plan no es válida.';
    return response?.error?.message || 'No fue posible conectar con el servicio de facturación.';
  }
}
