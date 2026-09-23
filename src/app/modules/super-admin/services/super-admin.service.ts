import { Injectable, inject, signal, computed, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, forkJoin, map, throwError } from 'rxjs';
import { 
  Tenant, 
  SubscriptionPlan, 
  SuperAdminMetrics, 
  ImpersonationSession, 
  TenantAuditLog, 
  TenantStatus, 
  PlanTier, 
  PlatformHealthMetric,
  PendingBillingCheckout,
  BillingSubscriptionStatusView,
  DEFAULT_PLANS
} from '../models/super-admin.models';
import { AuthService } from '../../../services/auth.service';
import { ErpStateService } from '../../../services/erp-state.service';
import { User } from '../../../models/erp.models';

export interface AvailableTenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
}

const STORAGE_KEY_TENANTS = 'nexus_erp_saas_tenants_v1';
const STORAGE_KEY_PLANS = 'nexus_erp_saas_plans_v1';
const STORAGE_KEY_AUDIT = 'nexus_erp_saas_audit_v1';
const STORAGE_KEY_IMPERSONATION = 'nexus_erp_saas_impersonation_v1';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private injector = inject(Injector);

  private get erpState(): ErpStateService {
    return this.injector.get(ErpStateService);
  }

  // Master API Base URL (outside tenant context)
  private readonly MASTER_API_BASE = '/api/v1/master';

  // Signals
  readonly tenants = signal<Tenant[]>(this.loadInitialTenants());
  readonly plans = signal<SubscriptionPlan[]>(this.loadInitialPlans());
  readonly auditLogs = signal<TenantAuditLog[]>([]);
  readonly activeImpersonation = signal<ImpersonationSession | null>(null);
  readonly selectedTenant = signal<Tenant | null>(null);
  readonly availableTenants = signal<AvailableTenant[]>([]);
  readonly availableTenantsError = signal<string | null>(null);

  // Search and Filter State
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly planFilter = signal<string>('ALL');
  readonly isLoading = signal<boolean>(false);
  readonly lastSyncTime = signal<string>(new Date().toISOString());

  // Platform Real-Time Health Metrics
  readonly healthMetrics = signal<PlatformHealthMetric>({
    system: 'HEALTHY',
    latencyMs: 24,
    uptimePercentage: 99.98,
    activeConnections: 142,
    cpuUsagePct: 18.4,
    memoryUsagePct: 34.2,
    storageClusterHealth: 'OK',
    lastBackupAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    activeWorkerNodes: 4,
    apiRequestsPerMinute: 840
  });

  // Cached original state prior to impersonation
  private preImpersonationUser: User | null = null;
  private preImpersonationCompany = {
    legalName: 'Helameb Corp, C.A.',
    taxId: 'J-50493821-4',
    planTier: 'FULL' as 'BASE' | 'FULL'
  };

  // Computed Derived States
  readonly isImpersonating = computed(() => this.activeImpersonation() !== null);

  readonly filteredTenants = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const plan = this.planFilter();

    return this.tenants().filter(tenant => {
      // Status filter
      if (status !== 'ALL' && tenant.status !== status) {
        return false;
      }
      // Plan filter
      if (plan !== 'ALL' && tenant.plan !== plan) {
        return false;
      }
      // Query filter
      if (!query) return true;

      return (
        tenant.companyName.toLowerCase().includes(query) ||
        tenant.slug.toLowerCase().includes(query) ||
        tenant.legalTaxId.toLowerCase().includes(query) ||
        tenant.adminUserEmail.toLowerCase().includes(query) ||
        tenant.contactEmail.toLowerCase().includes(query)
      );
    });
  });

  readonly globalMetrics = computed<SuperAdminMetrics>(() => {
    const list = this.tenants();
    const totalTenants = list.length;
    const activeTenants = list.filter(t => t.status === 'ACTIVE').length;
    const suspendedTenants = list.filter(t => t.status === 'SUSPENDED').length;
    const pendingTenants = list.filter(t => t.status === 'PENDING').length;

    const totalUsers = list.reduce((sum, t) => sum + (t.currentUsersCount || 0), 0);
    const totalStorageUsedMb = list.reduce((sum, t) => sum + (t.storageUsedMb || 0), 0);
    const totalStorageLimitMb = list.reduce((sum, t) => sum + (t.storageLimitMb || 0), 0);

    // MRR calculated from active and pending paying tenants
    const mrrUsd = list
      .filter(t => t.status !== 'SUSPENDED')
      .reduce((sum, t) => sum + (t.monthlyFeeUsd || 0), 0);
    const arrUsd = mrrUsd * 12;

    const basicCount = list.filter(t => t.plan === 'BASIC').length;
    const proCount = list.filter(t => t.plan === 'PRO').length;
    const entCount = list.filter(t => t.plan === 'ENTERPRISE').length;

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      pendingTenants,
      totalUsers,
      totalStorageUsedMb,
      totalStorageLimitMb,
      mrrUsd,
      arrUsd,
      tenantsByPlan: {
        basic: basicCount,
        pro: proCount,
        enterprise: entCount
      },
      healthStatus: this.healthMetrics()
    };
  });

  constructor() {
    try {
      localStorage.removeItem(STORAGE_KEY_AUDIT);
    } catch {
      // Ignore storage errors; audit history must come from the API.
    }
  }

  // =========================================================================
  // Master API Methods
  // =========================================================================

  fetchMasterData(): Observable<boolean> {
    this.isLoading.set(true);
    return forkJoin({
      tenants: this.http.get<Tenant[]>(`${this.MASTER_API_BASE}/tenants`).pipe(catchError(() => of([]))),
      plans: this.http.get<Array<{
        id: string;
        code: string;
        name: string;
        price: number;
        maxUsers: number;
        storageLimitMb: number;
        features: Record<string, unknown>;
      }>>(`${this.MASTER_API_BASE}/billing/plans`).pipe(
        map(plans => plans.map(plan => {
          const defaults = DEFAULT_PLANS.find(item => item.id === plan.code) || DEFAULT_PLANS[0];
          return {
            ...defaults,
            id: plan.code as PlanTier,
            saasPlanId: plan.id,
            name: plan.name,
            priceMonthlyUsd: plan.price,
            priceAnnualUsd: plan.price * 12,
            maxUsers: plan.maxUsers,
            storageLimitMb: plan.storageLimitMb,
            allowedModules: Object.keys(plan.features)
          };
        }) as SubscriptionPlan[]),
        catchError(() => of([] as SubscriptionPlan[]))
      )
    }).pipe(
      tap(({ tenants, plans }) => {
        if (tenants.length > 0) { this.tenants.set(tenants); this.saveTenantsToStorage(tenants); }
        if (plans.length > 0) { this.plans.set(plans); this.savePlansToStorage(plans); }
        this.isLoading.set(false);
        this.lastSyncTime.set(new Date().toISOString());
      }),
      map(() => true)
    );
  }

  getTenants(): Observable<Tenant[]> {
    return of(this.tenants());
  }

  loadAvailableTenants(): Observable<AvailableTenant[]> {
    this.availableTenantsError.set(null);
    return this.http.get<AvailableTenant[]>(`${this.MASTER_API_BASE}/tenants/available`).pipe(
      map(tenants => tenants.filter(tenant => tenant.status === 'ACTIVE')),
      tap(tenants => this.availableTenants.set(tenants)),
      catchError(() => {
        this.availableTenants.set([]);
        this.availableTenantsError.set('No fue posible cargar los tenants disponibles.');
        return of([]);
      })
    );
  }

  requestBillingPlanChange(tenantId: string, request: {
    planId: string;
    planCode: 'BASIC' | 'FULL';
    currency: 'USD';
    reason?: string;
  }): Observable<PendingBillingCheckout> {
    return this.http.post<PendingBillingCheckout>(
      `${this.MASTER_API_BASE}/tenants/${tenantId}/billing/plan-change`,
      {
        ...request,
        idempotencyKey: this.createBillingIdempotencyKey(tenantId, request.planId)
      }
    );
  }

  getBillingSubscriptionStatus(tenantId: string): Observable<BillingSubscriptionStatusView> {
    return this.http.get<BillingSubscriptionStatusView>(
      `${this.MASTER_API_BASE}/tenants/${tenantId}/billing/subscription`
    );
  }

  getBillingCheckout(orderId: string): Observable<PendingBillingCheckout> {
    return this.http.get<PendingBillingCheckout>(
      `${this.MASTER_API_BASE}/billing/checkouts/${encodeURIComponent(orderId)}`
    );
  }

  private createBillingIdempotencyKey(tenantId: string, planId: string): string {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return `plan-change:${tenantId}:${planId}:${randomPart}`;
  }

  createTenant(payload: {
    companyName: string;
    slug?: string;
    legalTaxId: string;
    plan: PlanTier;
    contactEmail: string;
    contactPhone?: string;
    adminUserName: string;
    adminUserEmail: string;
    billingCycle?: 'MONTHLY' | 'ANNUAL';
    region?: string;
    customDomain?: string;
    notes?: string;
  }): Observable<Tenant> {
    const slug = payload.slug ? this.slugify(payload.slug) : this.slugify(payload.companyName);
    const planConfig = this.plans().find(p => p.id === payload.plan) || this.plans()[0];
    if (!planConfig) {
      return throwError(() => new Error('No hay planes reales disponibles. Sincroniza el catálogo antes de crear el tenant.'));
    }
    const fee = payload.billingCycle === 'ANNUAL' ? (planConfig.priceAnnualUsd / 12) : planConfig.priceMonthlyUsd;

    const newTenant: Tenant = {
      id: `tnt-${Date.now().toString().slice(-6)}`,
      slug,
      companyName: payload.companyName.trim(),
      legalTaxId: payload.legalTaxId.trim().toUpperCase(),
      plan: payload.plan,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contactEmail: payload.contactEmail.trim().toLowerCase(),
      contactPhone: payload.contactPhone || '+58 212-0000000',
      adminUserName: payload.adminUserName.trim(),
      adminUserEmail: payload.adminUserEmail.trim().toLowerCase(),
      maxUsers: planConfig.maxUsers,
      currentUsersCount: 1, // The initial admin user
      storageLimitMb: planConfig.storageLimitMb,
      storageUsedMb: 45, // Initial schema bootstrap footprint
      customDomain: payload.customDomain ? payload.customDomain.trim().toLowerCase() : undefined,
      billingCycle: payload.billingCycle || 'MONTHLY',
      monthlyFeeUsd: Math.round(fee * 100) / 100,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      region: payload.region || 'us-east1',
      databaseTier: payload.plan === 'ENTERPRISE' ? 'Cloud SQL PG15 (Dedicated)' : 'Cloud SQL Shared',
      features: [...planConfig.allowedModules],
      notes: payload.notes
    };

    // Update in-memory state
    this.tenants.update(list => [newTenant, ...list]);
    this.saveTenantsToStorage(this.tenants());

    // Record Audit Log
    this.recordAuditLog({
      tenantId: newTenant.id,
      tenantName: newTenant.companyName,
      action: 'PROVISION_TENANT',
      details: `Aprovisionamiento de nuevo tenant: ${newTenant.companyName} (${newTenant.slug}) con Plan ${newTenant.plan}. Admin: ${newTenant.adminUserEmail}`,
      severity: 'INFO'
    });

    // Persist the tenant using the master API contract.
    this.http.post(`${this.MASTER_API_BASE}/tenants`, {
      name: newTenant.companyName,
      slug: newTenant.slug,
      adminEmail: newTenant.adminUserEmail,
      adminName: newTenant.adminUserName,
      adminPassword: this.generateTemporaryPassword()
    }).pipe(
      catchError(() => of(newTenant))
    ).subscribe();

    this.erpState.notify(
      'success',
      'Tenant Aprovisionado con Éxito',
      `La empresa ${newTenant.companyName} ha sido creada en la región ${newTenant.region} con el subdominio ${newTenant.slug}.helameb.com`
    );

    return of(newTenant);
  }

  private generateTemporaryPassword(): string {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
    return `Tmp-${random.slice(0, 16)}!`;
  }

  updateTenant(id: string, updates: Partial<Tenant>): Observable<Tenant | null> {
    let updatedTenant: Tenant | null = null;

    this.tenants.update(list =>
      list.map(t => {
        if (t.id === id) {
          updatedTenant = {
            ...t,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          return updatedTenant;
        }
        return t;
      })
    );

    if (updatedTenant) {
      this.saveTenantsToStorage(this.tenants());

      this.recordAuditLog({
        tenantId: id,
        tenantName: (updatedTenant as Tenant).companyName,
        action: 'UPDATE_TENANT',
        details: `Actualización de parámetros del tenant: ${Object.keys(updates).join(', ')}`,
        severity: 'INFO'
      });

      this.http.put(`${this.MASTER_API_BASE}/tenants/${id}`, updates).pipe(
        catchError(() => of(null))
      ).subscribe();

      this.erpState.notify('success', 'Tenant Actualizado', `Los datos de ${(updatedTenant as Tenant).companyName} han sido actualizados.`);
    }

    return of(updatedTenant);
  }

  updateTenantStatus(id: string, newStatus: TenantStatus, reason?: string): Observable<Tenant | null> {
    const tenant = this.tenants().find(t => t.id === id);
    if (!tenant) return of(null);

    const oldStatus = tenant.status;
    let modified: Tenant | null = null;

    this.tenants.update(list =>
      list.map(t => {
        if (t.id === id) {
          modified = {
            ...t,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            notes: reason ? `${t.notes ? t.notes + '\n' : ''}[${new Date().toISOString().split('T')[0]}] Cambio de estado: ${newStatus}. Motivo: ${reason}` : t.notes
          };
          return modified;
        }
        return t;
      })
    );

    if (modified) {
      this.saveTenantsToStorage(this.tenants());

      this.recordAuditLog({
        tenantId: id,
        tenantName: tenant.companyName,
        action: newStatus === 'SUSPENDED' ? 'SUSPEND_TENANT' : 'ACTIVATE_TENANT',
        details: `Cambio de estado de ${oldStatus} a ${newStatus}. ${reason ? 'Motivo: ' + reason : ''}`,
        severity: newStatus === 'SUSPENDED' ? 'WARNING' : 'INFO'
      });

      this.http.patch(`${this.MASTER_API_BASE}/tenants/${id}/status`, { status: newStatus, reason }).pipe(
        catchError(() => of(null))
      ).subscribe();

      this.erpState.notify(
        newStatus === 'SUSPENDED' ? 'warning' : 'success',
        newStatus === 'SUSPENDED' ? 'Tenant Suspendido' : 'Tenant Activado',
        `El tenant ${tenant.companyName} ahora se encuentra en estado ${newStatus}.`
      );
    }

    return of(modified);
  }

  changeTenantPlan(id: string, newPlan: PlanTier): Observable<Tenant | null> {
    const tenant = this.tenants().find(t => t.id === id);
    if (!tenant) return of(null);

    const oldPlan = tenant.plan;
    const planConfig = this.plans().find(p => p.id === newPlan) || this.plans()[0];
    const fee = tenant.billingCycle === 'ANNUAL' ? (planConfig.priceAnnualUsd / 12) : planConfig.priceMonthlyUsd;

    let modified: Tenant | null = null;

    this.tenants.update(list =>
      list.map(t => {
        if (t.id === id) {
          modified = {
            ...t,
            plan: newPlan,
            maxUsers: planConfig.maxUsers,
            storageLimitMb: planConfig.storageLimitMb,
            monthlyFeeUsd: Math.round(fee * 100) / 100,
            features: [...planConfig.allowedModules],
            updatedAt: new Date().toISOString()
          };
          return modified;
        }
        return t;
      })
    );

    if (modified) {
      this.saveTenantsToStorage(this.tenants());

      this.recordAuditLog({
        tenantId: id,
        tenantName: tenant.companyName,
        action: 'CHANGE_PLAN',
        details: `Cambio de plan de ${oldPlan} a ${newPlan}. Límites actualizados: ${planConfig.maxUsers} usuarios, ${planConfig.storageLimitMb} MB.`,
        severity: 'INFO'
      });

      this.http.patch(`${this.MASTER_API_BASE}/tenants/${id}/plan`, { plan: newPlan }).pipe(
        catchError(() => of(null))
      ).subscribe();

      this.erpState.notify(
        'success',
        'Plan Actualizado',
        `El tenant ${tenant.companyName} ha sido migrado al Plan ${newPlan} exitosamente.`
      );
    }

    return of(modified);
  }

  deleteTenant(id: string): Observable<boolean> {
    const tenant = this.tenants().find(t => t.id === id);
    if (!tenant) return of(false);

    // Cancel active impersonation if targeting this tenant
    if (this.activeImpersonation()?.tenantId === id) {
      this.exitImpersonation();
    }

    this.tenants.update(list => list.filter(t => t.id !== id));
    this.saveTenantsToStorage(this.tenants());

    this.recordAuditLog({
      tenantId: id,
      tenantName: tenant.companyName,
      action: 'DELETE_TENANT',
      details: `Eliminación de tenant y desaprovisionamiento de base de datos para ${tenant.companyName} (${tenant.slug}).`,
      severity: 'CRITICAL'
    });

    this.http.delete(`${this.MASTER_API_BASE}/tenants/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe();

    this.erpState.notify('warning', 'Tenant Eliminado', `El tenant ${tenant.companyName} ha sido eliminado del sistema SaaS.`);
    return of(true);
  }

  // =========================================================================
  // Secure Impersonation (Support Access with Audit Token)
  // =========================================================================

  impersonateTenant(tenantId: string, reason: string): Observable<ImpersonationSession | null> {
    const tenant = this.tenants().find(t => t.id === tenantId);
    if (!tenant) {
      this.erpState.notify('error', 'Error al Impersonar', 'El tenant seleccionado no existe.');
      return of(null);
    }

    if (tenant.status === 'SUSPENDED') {
      this.erpState.notify('warning', 'Tenant Suspendido', 'El tenant se encuentra suspendido. Proceda con precaución.');
    }

    const currentSuperAdmin = this.authService.currentUser();
    const token = `AUDIT-SEC-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour session

    const session: ImpersonationSession = {
      id: `imp-${Date.now()}`,
      token,
      superAdminEmail: currentSuperAdmin.email,
      superAdminName: currentSuperAdmin.name,
      tenantId: tenant.id,
      tenantName: tenant.companyName,
      tenantSlug: tenant.slug,
      targetUserEmail: tenant.adminUserEmail,
      targetUserName: tenant.adminUserName,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      reason: reason.trim() || 'Soporte técnico y diagnóstico operacional de rutina',
      active: true
    };

    // Save previous state to allow 100% seamless return
    this.preImpersonationUser = currentSuperAdmin;
    const currentProfile = this.erpState.companyProfile();
    this.preImpersonationCompany = {
      legalName: currentProfile.legalName,
      taxId: currentProfile.taxId,
      planTier: (currentProfile.planTier || 'FULL') as 'BASE' | 'FULL'
    };

    // Set active impersonation
    this.activeImpersonation.set(session);
    this.saveImpersonationToStorage(session);

    // Record Audit Log for Security & Compliance
    this.recordAuditLog({
      tenantId: tenant.id,
      tenantName: tenant.companyName,
      action: 'START_IMPERSONATION',
      details: `INICIO DE IMPERSONACIÓN AUDITADA. SuperAdmin: ${currentSuperAdmin.email}. Target: ${tenant.adminUserEmail} (${tenant.companyName}). Motivo: "${session.reason}". Token Auditoría: ${token}`,
      severity: 'WARNING'
    });

    // Notify backend
    this.http.post(`${this.MASTER_API_BASE}/impersonate`, session).pipe(
      catchError(() => of(null))
    ).subscribe();

    // Dynamically adjust ErpState to reflect tenant's company details & plan
    this.erpState.updateCompanyProfile({
      legalName: tenant.companyName,
      tradeName: tenant.companyName,
      taxId: tenant.legalTaxId,
      email: tenant.contactEmail,
      phone: tenant.contactPhone,
      planTier: tenant.plan === 'BASIC' ? 'BASE' : 'FULL'
    });

    // Create a support session user identity
    const impersonatedUser: User = {
      id: `usr-support-${tenant.id}`,
      name: `${tenant.adminUserName} (Modo Soporte)`,
      email: tenant.adminUserEmail,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'ACTIVO',
      department: `Tenant: ${tenant.slug}`,
      phone: tenant.contactPhone
    };

    this.authService.switchUser(impersonatedUser);
    this.authService.setAuthenticated(true);

    this.erpState.notify(
      'warning',
      'Modo Soporte Activado',
      `Sesión de impersonación iniciada en ${tenant.companyName}. Token de auditoría: ${token}`
    );

    return of(session);
  }

  exitImpersonation(): void {
    const session = this.activeImpersonation();
    if (!session) return;

    this.recordAuditLog({
      tenantId: session.tenantId,
      tenantName: session.tenantName,
      action: 'STOP_IMPERSONATION',
      details: `FIN DE IMPERSONACIÓN AUDITADA. Token cerrado: ${session.token}. SuperAdmin: ${session.superAdminEmail}`,
      severity: 'INFO'
    });

    // Restore pre-impersonation company profile
    this.erpState.updateCompanyProfile({
      legalName: this.preImpersonationCompany.legalName,
      tradeName: this.preImpersonationCompany.legalName,
      taxId: this.preImpersonationCompany.taxId,
      planTier: this.preImpersonationCompany.planTier
    });

    // Restore SuperAdmin user
    if (this.preImpersonationUser) {
      this.authService.switchUser(this.preImpersonationUser);
    } else {
      const superAdminUser = this.authService.users().find(u => u.role === 'ADMIN') || this.authService.users()[0];
      this.authService.switchUser(superAdminUser);
    }

    this.activeImpersonation.set(null);
    this.saveImpersonationToStorage(null);

    this.erpState.notify(
      'success',
      'Sesión de Soporte Finalizada',
      'Has retornado a la Consola Global Master SuperAdmin de forma segura.'
    );
  }

  stopImpersonation(): void {
    this.exitImpersonation();
  }

  // =========================================================================
  // Plans & Subscriptions Config Methods
  // =========================================================================

  getPlans(): Observable<SubscriptionPlan[]> {
    return of(this.plans());
  }

  updatePlan(planId: PlanTier, updates: Partial<SubscriptionPlan>): Observable<SubscriptionPlan | null> {
    const current = this.plans().find(plan => plan.id === planId);
    if (!current || !current.saasPlanId) return of(null);

    return this.http.patch<{
      id: string;
      code: string;
      name: string;
      price: number;
      currency: string;
      billingCycle: 'MONTHLY' | 'ANNUAL';
      maxUsers: number;
      storageLimitMb: number;
      features: Record<string, unknown>;
    }>(`${this.MASTER_API_BASE}/billing/plans/${current.saasPlanId}`, {
      name: current.name,
      price: updates.priceMonthlyUsd ?? current.priceMonthlyUsd,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      maxUsers: updates.maxUsers ?? current.maxUsers,
      storageLimitMb: updates.storageLimitMb ?? current.storageLimitMb,
      features: Object.fromEntries((updates.allowedModules ?? current.allowedModules).map(module => [module, true]))
    }).pipe(
      map(plan => this.mapApiPlan(plan)),
      tap(updated => {
        this.plans.update(list => list.map(item => item.id === planId ? updated : item));
        this.recordAuditLog({ action: 'UPDATE_PLAN_CONFIG', details: `Plan actualizado: ${updated.name}`, severity: 'INFO' });
      }),
      catchError(() => of(null))
    );
  }

  createPlan(input: {
    code: 'BASIC' | 'FULL';
    name: string;
    price: number;
    maxUsers: number;
    storageLimitMb: number;
  }): Observable<SubscriptionPlan> {
    return this.http.post<{
      id: string;
      code: string;
      name: string;
      price: number;
      currency: string;
      billingCycle: 'MONTHLY' | 'ANNUAL';
      maxUsers: number;
      storageLimitMb: number;
      features: Record<string, unknown>;
    }>(`${this.MASTER_API_BASE}/billing/plans`, {
      ...input,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      features: {}
    }).pipe(
      map(plan => this.mapApiPlan(plan)),
      tap(plan => {
        this.plans.update(list => [...list, plan]);
        this.recordAuditLog({ action: 'UPDATE_PLAN_CONFIG', details: `Plan creado: ${plan.name}`, severity: 'INFO' });
      })
    );
  }

  private mapApiPlan(plan: {
    id: string;
    code: string;
    name: string;
    price: number;
    maxUsers: number;
    storageLimitMb: number;
    features: Record<string, unknown>;
  }): SubscriptionPlan {
    const template = DEFAULT_PLANS.find(item => item.id === plan.code) || DEFAULT_PLANS[0];
    return {
      ...template,
      id: plan.code as PlanTier,
      saasPlanId: plan.id,
      name: plan.name,
      priceMonthlyUsd: plan.price,
      priceAnnualUsd: plan.price * 12,
      maxUsers: plan.maxUsers,
      storageLimitMb: plan.storageLimitMb,
      allowedModules: Object.keys(plan.features ?? {})
    };
  }

  // =========================================================================
  // Audit Logs & Persistence Helpers
  // =========================================================================

  recordAuditLog(entry: {
    tenantId?: string;
    tenantName?: string;
    action: TenantAuditLog['action'];
    details: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }): void {
    const log: TenantAuditLog = {
      id: `aud-m-${Date.now().toString().slice(-6)}`,
      tenantId: entry.tenantId,
      tenantName: entry.tenantName,
      action: entry.action,
      performerEmail: this.authService.currentUser()?.email || 'superadmin@Helameb.cloud',
      timestamp: new Date().toISOString(),
      details: entry.details,
      ipAddress: '192.168.1.10',
      severity: entry.severity || 'INFO'
    };

    this.auditLogs.update(list => [log, ...list]);
    this.saveAuditLogsToStorage(this.auditLogs());
  }

  slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .trim()
      .replace(/\s+/g, '-') // replace spaces with -
      .replace(/[^\w-]+/g, '') // remove all non-word chars
      .replace(/--+/g, '-'); // replace multiple - with single -
  }

  private loadInitialTenants(): Tenant[] {
    try {
      localStorage.removeItem(STORAGE_KEY_TENANTS);
    } catch {
      // Ignore storage errors; tenants must come from the API.
    }
    return [];
  }

  private saveTenantsToStorage(tenants: Tenant[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(tenants));
    } catch {
      // Ignore
    }
  }

  private loadInitialPlans(): SubscriptionPlan[] {
    try {
      localStorage.removeItem(STORAGE_KEY_PLANS);
    } catch {
      // Ignore storage errors; plans must come from the API.
    }
    return [];
  }

  private savePlansToStorage(plans: SubscriptionPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans));
    } catch {
      // Ignore
    }
  }

  private saveAuditLogsToStorage(logs: TenantAuditLog[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 100)));
    } catch {
      // Ignore
    }
  }

  private loadInitialImpersonation(): ImpersonationSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_IMPERSONATION);
      if (stored) {
        const session: ImpersonationSession = JSON.parse(stored);
        if (new Date(session.expiresAt) > new Date() && session.active) {
          return session;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private saveImpersonationToStorage(session: ImpersonationSession | null): void {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY_IMPERSONATION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY_IMPERSONATION);
      }
    } catch {
      // Ignore
    }
  }
}
