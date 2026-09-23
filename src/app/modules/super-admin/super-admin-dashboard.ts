import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SuperAdminService } from './services/super-admin.service';
import { 
  Tenant, 
  SubscriptionPlan, 
  TenantStatus, 
  PlanTier, 
  BillingCycle,
  TenantAuditLog 
} from './models/super-admin.models';
import { AuthService } from '../../services/auth.service';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PendingBillingCheckout, BillingSubscriptionStatus, BillingSubscriptionStatusView } from './models/super-admin.models';

export type SuperAdminSubTab = 'tenants' | 'plans' | 'health' | 'audit';

@Component({
  selector: 'app-super-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule, DecimalPipe],
  templateUrl: './super-admin-dashboard.html'
})
export default class SuperAdminDashboardComponent {
  superAdminService = inject(SuperAdminService);
  authService = inject(AuthService);

  // Active Sub-Tab
  activeSubTab = signal<SuperAdminSubTab>('tenants');

  // Modal Visibility Signals
  showProvisionModal = signal<boolean>(false);
  editingTenant = signal<Tenant | null>(null);
  changingPlanTenant = signal<Tenant | null>(null);
  impersonatingTenant = signal<Tenant | null>(null);
  deletingTenant = signal<Tenant | null>(null);
  viewingTenantDetails = signal<Tenant | null>(null);
  editingPlan = signal<SubscriptionPlan | null>(null);
  billingCheckout = signal<PendingBillingCheckout | null>(null);
  billingStatus = signal<BillingSubscriptionStatus>('NONE');
  billingError = signal<string | null>(null);
  billingLoading = signal<boolean>(false);
  availableTenantSelection = signal<string>('');
  availableTenantError = this.superAdminService.availableTenantsError;

  // Search Control
  searchControl = new FormControl<string>('');

  // Forms
  provisionForm = new FormGroup({
    companyName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    slug: new FormControl<string>('', { nonNullable: true }),
    legalTaxId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    plan: new FormControl<PlanTier>('PRO', { nonNullable: true, validators: [Validators.required] }),
    contactEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    contactPhone: new FormControl<string>('+58 212-0000000', { nonNullable: true }),
    adminUserName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    adminUserEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    billingCycle: new FormControl<BillingCycle>('MONTHLY', { nonNullable: true }),
    region: new FormControl<string>('us-east1', { nonNullable: true }),
    customDomain: new FormControl<string>('', { nonNullable: true }),
    notes: new FormControl<string>('', { nonNullable: true })
  });

  editForm = new FormGroup({
    companyName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    legalTaxId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    contactEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    contactPhone: new FormControl<string>('', { nonNullable: true }),
    adminUserName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    adminUserEmail: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    customDomain: new FormControl<string>('', { nonNullable: true }),
    notes: new FormControl<string>('', { nonNullable: true })
  });

  impersonateForm = new FormGroup({
    reason: new FormControl<string>('Revisión técnica y soporte operacional a solicitud del cliente.', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)]
    }),
    durationMinutes: new FormControl<number>(60, { nonNullable: true })
  });

  planChangeForm = new FormGroup({
    plan: new FormControl<PlanTier>('PRO', { nonNullable: true, validators: [Validators.required] }),
    billingCycle: new FormControl<BillingCycle>('MONTHLY', { nonNullable: true })
  });

  deleteConfirmControl = new FormControl<string>('', { nonNullable: true });

  planEditorForm = new FormGroup({
    priceMonthlyUsd: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    priceAnnualUsd: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    maxUsers: new FormControl<number>(5, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    storageLimitMb: new FormControl<number>(2048, { nonNullable: true, validators: [Validators.required, Validators.min(100)] }),
    maxInvoicesMonthly: new FormControl<number>(1000, { nonNullable: true, validators: [Validators.required, Validators.min(100)] })
  });

  // Computed Auto-Slug for Provisioning Modal
  generatedSlug = computed(() => {
    const manualSlug = this.provisionForm.controls.slug.value;
    if (manualSlug && manualSlug.trim().length > 0) {
      return this.superAdminService.slugify(manualSlug);
    }
    const name = this.provisionForm.controls.companyName.value;
    return name ? this.superAdminService.slugify(name) : 'nueva-empresa';
  });

  constructor() {
    // Sync search input with service signal
    this.searchControl.valueChanges.subscribe(val => {
      this.superAdminService.searchQuery.set(val || '');
    });
    this.superAdminService.loadAvailableTenants().subscribe();
  }

  selectAvailableTenant(): void {
    const tenantId = this.availableTenantSelection();
    const tenant = this.superAdminService.availableTenants().find(item => item.id === tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') {
      this.availableTenantError.set('Selecciona un tenant activo del catálogo.');
      return;
    }

    this.authService.impersonateTenant(tenant.id).subscribe({
      next: () => this.availableTenantSelection.set(tenant.id),
      error: error => this.availableTenantError.set(error?.message || 'No fue posible seleccionar el tenant.')
    });
  }

  clearAvailableTenant(): void {
    this.authService.clearImpersonationContext();
    this.availableTenantSelection.set('');
  }

  // =========================================================================
  // Sub-Tab Switcher
  // =========================================================================

  setTab(tab: SuperAdminSubTab): void {
    this.activeSubTab.set(tab);
  }

  // =========================================================================
  // Provisioning Actions
  // =========================================================================

  openProvisionModal(): void {
    this.provisionForm.reset({
      companyName: '',
      slug: '',
      legalTaxId: '',
      plan: 'PRO',
      contactEmail: '',
      contactPhone: '+58 212-0000000',
      adminUserName: '',
      adminUserEmail: '',
      billingCycle: 'MONTHLY',
      region: 'us-east1',
      customDomain: '',
      notes: ''
    });
    this.showProvisionModal.set(true);
  }

  closeProvisionModal(): void {
    this.showProvisionModal.set(false);
  }

  submitProvision(): void {
    if (this.provisionForm.invalid) {
      this.provisionForm.markAllAsTouched();
      return;
    }

    const val = this.provisionForm.getRawValue();
    const finalSlug = val.slug && val.slug.trim().length > 0 
      ? this.superAdminService.slugify(val.slug) 
      : this.superAdminService.slugify(val.companyName);

    this.superAdminService.createTenant({
      companyName: val.companyName,
      slug: finalSlug,
      legalTaxId: val.legalTaxId,
      plan: val.plan,
      contactEmail: val.contactEmail,
      contactPhone: val.contactPhone,
      adminUserName: val.adminUserName,
      adminUserEmail: val.adminUserEmail,
      billingCycle: val.billingCycle,
      region: val.region,
      customDomain: val.customDomain || undefined,
      notes: val.notes || undefined
    }).subscribe(() => {
      this.closeProvisionModal();
    });
  }

  // =========================================================================
  // Edit Tenant
  // =========================================================================

  openEditModal(tenant: Tenant): void {
    this.editingTenant.set(tenant);
    this.editForm.patchValue({
      companyName: tenant.companyName,
      legalTaxId: tenant.legalTaxId,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      adminUserName: tenant.adminUserName,
      adminUserEmail: tenant.adminUserEmail,
      customDomain: tenant.customDomain || '',
      notes: tenant.notes || ''
    });
  }

  closeEditModal(): void {
    this.editingTenant.set(null);
  }

  submitEdit(): void {
    const tenant = this.editingTenant();
    if (!tenant || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.getRawValue();
    this.superAdminService.updateTenant(tenant.id, {
      companyName: val.companyName,
      legalTaxId: val.legalTaxId,
      contactEmail: val.contactEmail,
      contactPhone: val.contactPhone,
      adminUserName: val.adminUserName,
      adminUserEmail: val.adminUserEmail,
      customDomain: val.customDomain ? val.customDomain : undefined,
      notes: val.notes
    }).subscribe(() => {
      this.closeEditModal();
    });
  }

  // =========================================================================
  // Change Plan
  // =========================================================================

  openChangePlanModal(tenant: Tenant): void {
    this.changingPlanTenant.set(tenant);
    this.billingCheckout.set(null);
    this.billingStatus.set('NONE');
    this.billingError.set(null);
    this.planChangeForm.patchValue({
      plan: tenant.plan,
      billingCycle: tenant.billingCycle
    });
  }

  closeChangePlanModal(): void {
    this.changingPlanTenant.set(null);
    this.billingCheckout.set(null);
    this.billingError.set(null);
  }

  submitChangePlan(): void {
    const tenant = this.changingPlanTenant();
    if (!tenant || this.billingLoading()) return;

    const newPlan = this.planChangeForm.controls.plan.value;
    const plan = this.superAdminService.plans().find(item => item.id === newPlan);
    const planId = plan?.saasPlanId;
    this.billingError.set(null);

    if (!planId) {
      this.billingError.set('El catálogo SaaS no entregó el UUID del plan seleccionado. No se creó ningún checkout.');
      return;
    }

    this.billingLoading.set(true);
    this.superAdminService.requestBillingPlanChange(tenant.id, {
      planId,
      planCode: newPlan === 'BASIC' ? 'BASIC' : 'FULL',
      currency: 'USD',
      reason: `Cambio solicitado desde consola Master: ${tenant.plan} -> ${newPlan}`
    }).subscribe({
      next: checkout => {
        this.billingCheckout.set(checkout);
        this.billingStatus.set('PENDING');
        this.billingLoading.set(false);
        if (checkout.checkoutUrl) {
          window.location.assign(checkout.checkoutUrl);
        }
      },
      error: error => {
        this.billingLoading.set(false);
        this.billingError.set(this.getBillingErrorMessage(error));
      }
    });
  }

  refreshBillingStatus(): void {
    const tenant = this.changingPlanTenant();
    const checkout = this.billingCheckout();
    if (!tenant || this.billingLoading()) return;

    this.billingError.set(null);
    this.billingLoading.set(true);
    this.superAdminService.getBillingSubscriptionStatus(tenant.id).subscribe({
      next: result => {
        const status = result.status as BillingSubscriptionStatus;
        this.billingStatus.set(status);
        this.billingLoading.set(false);
        if (status === 'ACTIVE') {
          this.applyActivePlan(tenant.id, this.planChangeForm.controls.plan.value);
        }
      },
      error: error => {
        this.billingLoading.set(false);
        this.billingError.set(this.getBillingErrorMessage(error));
      }
    });
  }

  private applyActivePlan(tenantId: string, planId: PlanTier): void {
    const plan = this.superAdminService.plans().find(item => item.id === planId);
    if (!plan) return;
    this.superAdminService.tenants.update(tenants => tenants.map(tenant => tenant.id === tenantId
      ? {
          ...tenant,
          plan: planId,
          maxUsers: plan.maxUsers,
          storageLimitMb: plan.storageLimitMb,
          monthlyFeeUsd: tenant.billingCycle === 'ANNUAL' ? plan.priceAnnualUsd / 12 : plan.priceMonthlyUsd,
          features: [...plan.allowedModules],
          updatedAt: new Date().toISOString()
        }
      : tenant));
  }

  private getBillingErrorMessage(error: unknown): string {
    const response = error as HttpErrorResponse;
    if (response?.status === 401 || response?.status === 403) return 'No estás autorizado para gestionar la facturación de este tenant.';
    if (response?.status === 400) return response.error?.message || 'El tenant no está activo o la solicitud de pago no es válida.';
    if (response?.status === 404) return 'No se encontró el checkout o el plan SaaS solicitado.';
    if (response?.status === 409) return 'El pago aún no ha sido confirmado. Consulta el estado nuevamente.';
    return response?.error?.message || 'No fue posible conectar con el servicio de facturación.';
  }

  getBillingStatusLabel(status: BillingSubscriptionStatus): string {
    switch (status) {
      case 'ACTIVE': return 'PAID';
      case 'REJECTED': return 'FAILED';
      case 'CANCELLED': return 'CANCELLED';
      case 'PENDING': return 'PENDING';
      default: return status;
    }
  }

  // =========================================================================
  // Toggle Status (Suspend / Activate)
  // =========================================================================

  toggleStatus(tenant: Tenant): void {
    const newStatus: TenantStatus = tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const reason = newStatus === 'SUSPENDED' 
      ? 'Suspensión manual ejecutada desde consola Master por administración'
      : 'Reactivación de servicio tras verificación de cuenta';

    this.superAdminService.updateTenantStatus(tenant.id, newStatus, reason).subscribe();
  }

  // =========================================================================
  // Secure Impersonation
  // =========================================================================

  openImpersonateModal(tenant: Tenant): void {
    this.impersonatingTenant.set(tenant);
    this.impersonateForm.reset({
      reason: `Soporte técnico y diagnóstico operacional en ${tenant.companyName}`,
      durationMinutes: 60
    });
  }

  closeImpersonateModal(): void {
    this.impersonatingTenant.set(null);
  }

  submitImpersonate(): void {
    const tenant = this.impersonatingTenant();
    if (!tenant || this.impersonateForm.invalid) {
      this.impersonateForm.markAllAsTouched();
      return;
    }

    const reason = this.impersonateForm.controls.reason.value;
    this.superAdminService.impersonateTenant(tenant.id, reason).subscribe(session => {
      if (session) {
        this.closeImpersonateModal();
      }
    });
  }

  // =========================================================================
  // Delete Tenant
  // =========================================================================

  openDeleteModal(tenant: Tenant): void {
    this.deletingTenant.set(tenant);
    this.deleteConfirmControl.setValue('');
  }

  closeDeleteModal(): void {
    this.deletingTenant.set(null);
    this.deleteConfirmControl.setValue('');
  }

  canConfirmDelete(): boolean {
    const tenant = this.deletingTenant();
    if (!tenant) return false;
    return this.deleteConfirmControl.value.trim().toLowerCase() === tenant.slug.toLowerCase();
  }

  submitDelete(): void {
    const tenant = this.deletingTenant();
    if (!tenant || !this.canConfirmDelete()) return;

    this.superAdminService.deleteTenant(tenant.id).subscribe(() => {
      this.closeDeleteModal();
    });
  }

  // =========================================================================
  // Plan Editor
  // =========================================================================

  openEditPlanModal(plan: SubscriptionPlan): void {
    this.editingPlan.set(plan);
    this.planEditorForm.patchValue({
      priceMonthlyUsd: plan.priceMonthlyUsd,
      priceAnnualUsd: plan.priceAnnualUsd,
      maxUsers: plan.maxUsers,
      storageLimitMb: plan.storageLimitMb,
      maxInvoicesMonthly: plan.maxInvoicesMonthly
    });
  }

  closeEditPlanModal(): void {
    this.editingPlan.set(null);
  }

  submitEditPlan(): void {
    const plan = this.editingPlan();
    if (!plan || this.planEditorForm.invalid) return;

    const val = this.planEditorForm.getRawValue();
    this.superAdminService.updatePlan(plan.id, val).subscribe(() => {
      this.closeEditPlanModal();
    });
  }

  // =========================================================================
  // View Details Drawer / Modal
  // =========================================================================

  openDetails(tenant: Tenant): void {
    this.viewingTenantDetails.set(tenant);
  }

  closeDetails(): void {
    this.viewingTenantDetails.set(null);
  }

  // =========================================================================
  // Helper Formatters
  // =========================================================================

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  getStoragePercent(tenant: Tenant): number {
    if (!tenant.storageLimitMb || tenant.storageLimitMb === 0) return 0;
    const pct = (tenant.storageUsedMb / tenant.storageLimitMb) * 100;
    return Math.min(Math.round(pct), 100);
  }

  getUsersPercent(tenant: Tenant): number {
    if (!tenant.maxUsers || tenant.maxUsers === 0) return 0;
    const pct = (tenant.currentUsersCount / tenant.maxUsers) * 100;
    return Math.min(Math.round(pct), 100);
  }

  getAuditBadgeClass(action: TenantAuditLog['action']): string {
    switch (action) {
      case 'PROVISION_TENANT':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/80';
      case 'SUSPEND_TENANT':
        return 'bg-rose-950 text-rose-300 border-rose-700/80';
      case 'ACTIVATE_TENANT':
        return 'bg-teal-950 text-teal-300 border-teal-700/80';
      case 'START_IMPERSONATION':
        return 'bg-amber-950 text-amber-300 border-amber-700/80';
      case 'STOP_IMPERSONATION':
        return 'bg-indigo-950 text-indigo-300 border-indigo-700/80';
      case 'DELETE_TENANT':
        return 'bg-red-950 text-red-300 border-red-700/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }
}
