export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type PlanTier = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type SystemHealthStatus = 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';

export interface Tenant {
  id: string;
  slug: string;
  companyName: string;
  legalTaxId: string; // RIF, RFC, NIF or CIF
  plan: PlanTier;
  status: TenantStatus;
  createdAt: string;
  updatedAt?: string;
  contactEmail: string;
  contactPhone: string;
  adminUserName: string;
  adminUserEmail: string;
  maxUsers: number;
  currentUsersCount: number;
  storageLimitMb: number;
  storageUsedMb: number;
  customDomain?: string;
  billingCycle: BillingCycle;
  monthlyFeeUsd: number;
  nextBillingDate: string;
  region: string;
  databaseTier: string;
  features: string[];
  notes?: string;
}

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  tagline: string;
  description: string;
  priceMonthlyUsd: number;
  priceAnnualUsd: number;
  maxUsers: number;
  storageLimitMb: number;
  allowedModules: string[];
  maxInvoicesMonthly: number;
  supportTier: 'COMMUNITY' | 'STANDARD_24_7' | 'DEDICATED_VIP';
  customDomainSupported: boolean;
  apiAccess: boolean;
  isPopular?: boolean;
}

export interface PlatformHealthMetric {
  system: SystemHealthStatus;
  latencyMs: number;
  uptimePercentage: number;
  activeConnections: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  storageClusterHealth: 'OK' | 'WARNING';
  lastBackupAt: string;
  activeWorkerNodes: number;
  apiRequestsPerMinute: number;
}

export interface SuperAdminMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  pendingTenants: number;
  totalUsers: number;
  totalStorageUsedMb: number;
  totalStorageLimitMb: number;
  mrrUsd: number;
  arrUsd: number;
  tenantsByPlan: {
    basic: number;
    pro: number;
    enterprise: number;
  };
  healthStatus: PlatformHealthMetric;
}

export interface ImpersonationSession {
  id: string;
  token: string;
  superAdminEmail: string;
  superAdminName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  targetUserEmail: string;
  targetUserName: string;
  startedAt: string;
  expiresAt: string;
  reason: string;
  active: boolean;
}

export type TenantAuditAction = 
  | 'PROVISION_TENANT'
  | 'UPDATE_TENANT'
  | 'CHANGE_PLAN'
  | 'SUSPEND_TENANT'
  | 'ACTIVATE_TENANT'
  | 'DELETE_TENANT'
  | 'START_IMPERSONATION'
  | 'STOP_IMPERSONATION'
  | 'UPDATE_PLAN_CONFIG';

export interface TenantAuditLog {
  id: string;
  tenantId?: string;
  tenantName?: string;
  action: TenantAuditAction;
  performerEmail: string;
  timestamp: string;
  details: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'BASIC',
    name: 'Plan Comercial (PyME)',
    tagline: 'Ideal para comercios, ferreterías y pequeñas distribuidoras',
    description: 'Gestión completa de ventas POS multimoneda, inventario multialmacén, compras y tesorería.',
    priceMonthlyUsd: 49.00,
    priceAnnualUsd: 470.00,
    maxUsers: 5,
    storageLimitMb: 2048, // 2 GB
    maxInvoicesMonthly: 1500,
    allowedModules: [
      'dashboard',
      'inventory',
      'kardex',
      'logistics',
      'purchases',
      'sales-pos',
      'quotes',
      'treasury',
      'cash-closing',
      'users'
    ],
    supportTier: 'STANDARD_24_7',
    customDomainSupported: false,
    apiAccess: false,
    isPopular: false
  },
  {
    id: 'PRO',
    name: 'Plan Profesional (Industria & MRP)',
    tagline: 'Para medianas empresas manufactureras y redes de distribución',
    description: 'Añade Manufactura MRP, Fórmulas BOM, pipeline CRM B2B y conciliación multialmacén avanzada.',
    priceMonthlyUsd: 119.00,
    priceAnnualUsd: 1140.00,
    maxUsers: 20,
    storageLimitMb: 10240, // 10 GB
    maxInvoicesMonthly: 8000,
    allowedModules: [
      'dashboard',
      'inventory',
      'kardex',
      'logistics',
      'purchases',
      'sales-pos',
      'quotes',
      'mrp',
      'crm',
      'treasury',
      'cash-closing',
      'users',
      'audit-log',
      'backups'
    ],
    supportTier: 'STANDARD_24_7',
    customDomainSupported: true,
    apiAccess: true,
    isPopular: true
  },
  {
    id: 'ENTERPRISE',
    name: 'Plan Enterprise (Corporativo NIIF)',
    tagline: 'Máxima potencia corporativa con Contabilidad NIIF y auditoría total',
    description: 'Solución integral con Contabilidad NIIF, asientos automáticos, balance general, usuarios ilimitados y SLA dedicado.',
    priceMonthlyUsd: 249.00,
    priceAnnualUsd: 2390.00,
    maxUsers: 100,
    storageLimitMb: 51200, // 50 GB
    maxInvoicesMonthly: 50000,
    allowedModules: [
      'dashboard',
      'inventory',
      'kardex',
      'logistics',
      'purchases',
      'sales-pos',
      'quotes',
      'mrp',
      'crm',
      'treasury',
      'accounting',
      'cash-closing',
      'users',
      'audit-log',
      'backups',
      'manual',
      'architecture'
    ],
    supportTier: 'DEDICATED_VIP',
    customDomainSupported: true,
    apiAccess: true,
    isPopular: false
  }
];

export const INITIAL_TENANTS_SEED: Tenant[] = [
  {
    id: 'tnt-001',
    slug: 'ferreteria-central',
    companyName: 'Ferretería & Suministros Central C.A.',
    legalTaxId: 'J-30948572-1',
    plan: 'PRO',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:30:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    contactEmail: 'gerencia@ferreteriacentral.com',
    contactPhone: '+58 212-9012345',
    adminUserName: 'Alejandro Morales',
    adminUserEmail: 'admin.morales@4-inLine.com',
    maxUsers: 20,
    currentUsersCount: 8,
    storageLimitMb: 10240,
    storageUsedMb: 1420,
    customDomain: 'erp.ferreteriacentral.com',
    billingCycle: 'MONTHLY',
    monthlyFeeUsd: 119.00,
    nextBillingDate: '2026-10-10',
    region: 'us-east1',
    databaseTier: 'Cloud SQL PG15 (HA)',
    features: ['pos', 'kardex', 'mrp', 'crm', 'treasury', 'bcv_rates', 'backups'],
    notes: 'Cliente flagship con 3 sucursales operativas.'
  },
  {
    id: 'tnt-002',
    slug: 'distribuidora-andina',
    companyName: 'Distribuidora Andina de Alimentos S.A.',
    legalTaxId: 'J-40192833-4',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    createdAt: '2026-02-15T11:20:00Z',
    updatedAt: '2026-08-28T14:15:00Z',
    contactEmail: 'contacto@distandina.corp',
    contactPhone: '+58 276-3456789',
    adminUserName: 'Roberto Méndez',
    adminUserEmail: 'rmendez@distandina.corp',
    maxUsers: 100,
    currentUsersCount: 42,
    storageLimitMb: 51200,
    storageUsedMb: 8900,
    customDomain: 'app.distandina.corp',
    billingCycle: 'ANNUAL',
    monthlyFeeUsd: 249.00,
    nextBillingDate: '2027-02-15',
    region: 'us-east1',
    databaseTier: 'Cloud SQL PG15 (Dedicated)',
    features: ['pos', 'kardex', 'mrp', 'crm', 'treasury', 'accounting', 'bcv_rates', 'backups', 'api_access'],
    notes: 'Migración exitosa desde SAP B1. Requiere módulo de Contabilidad NIIF.'
  },
  {
    id: 'tnt-003',
    slug: 'electro-pacific',
    companyName: 'Soluciones Eléctricas del Pacífico SpA',
    legalTaxId: 'B-88301922-1',
    plan: 'BASIC',
    status: 'ACTIVE',
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-08-20T16:45:00Z',
    contactEmail: 'finanzas@se-pacifico.net',
    contactPhone: '+56 9 8765 4321',
    adminUserName: 'Mariana Vega',
    adminUserEmail: 'mvega@se-pacifico.net',
    maxUsers: 5,
    currentUsersCount: 4,
    storageLimitMb: 2048,
    storageUsedMb: 680,
    billingCycle: 'MONTHLY',
    monthlyFeeUsd: 49.00,
    nextBillingDate: '2026-10-01',
    region: 'sa-east1',
    databaseTier: 'Cloud SQL Shared',
    features: ['pos', 'kardex', 'treasury', 'bcv_rates'],
    notes: 'Interesados en escalar al plan PRO el próximo mes por necesidad de MRP.'
  },
  {
    id: 'tnt-004',
    slug: 'constructora-san-martin',
    companyName: 'Constructora e Inversiones San Martín S.A.C.',
    legalTaxId: 'B-77492019-3',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    createdAt: '2026-03-22T15:00:00Z',
    updatedAt: '2026-09-02T09:30:00Z',
    contactEmail: 'compras@constructorasanmartin.com',
    contactPhone: '+51 1 555-4321',
    adminUserName: 'Carlos San Martín',
    adminUserEmail: 'csanmartin@constructorasanmartin.com',
    maxUsers: 100,
    currentUsersCount: 65,
    storageLimitMb: 51200,
    storageUsedMb: 14200,
    customDomain: 'gestion.constructorasanmartin.com',
    billingCycle: 'ANNUAL',
    monthlyFeeUsd: 249.00,
    nextBillingDate: '2027-03-22',
    region: 'us-east1',
    databaseTier: 'Cloud SQL PG15 (Dedicated)',
    features: ['pos', 'kardex', 'mrp', 'crm', 'treasury', 'accounting', 'bcv_rates', 'backups', 'api_access'],
    notes: 'Multi-proyecto. Despachos y almacenes móviles.'
  },
  {
    id: 'tnt-005',
    slug: 'auto-partes-express',
    companyName: 'Auto Partes Express Oriente C.A.',
    legalTaxId: 'J-50183726-8',
    plan: 'BASIC',
    status: 'SUSPENDED',
    createdAt: '2026-05-18T10:10:00Z',
    updatedAt: '2026-09-05T18:00:00Z',
    contactEmail: 'administracion@autopartesexpress.com',
    contactPhone: '+58 281-2829102',
    adminUserName: 'Jorge Zambrano',
    adminUserEmail: 'jzambrano@autopartesexpress.com',
    maxUsers: 5,
    currentUsersCount: 5,
    storageLimitMb: 2048,
    storageUsedMb: 1890,
    billingCycle: 'MONTHLY',
    monthlyFeeUsd: 49.00,
    nextBillingDate: '2026-08-18',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Shared',
    features: ['pos', 'kardex', 'treasury'],
    notes: 'Suspendido temporalmente por morosidad de pago (retraso > 15 días).'
  },
  {
    id: 'tnt-006',
    slug: 'agropecuaria-del-valle',
    companyName: 'Agropecuaria e Insumos del Valle S.A.',
    legalTaxId: 'J-60192837-0',
    plan: 'PRO',
    status: 'PENDING',
    createdAt: '2026-09-06T14:30:00Z',
    updatedAt: '2026-09-06T14:30:00Z',
    contactEmail: 'registro@agrovalle.com.ve',
    contactPhone: '+58 251-7890123',
    adminUserName: 'Ing. David Paredes',
    adminUserEmail: 'david.paredes@agrovalle.com.ve',
    maxUsers: 20,
    currentUsersCount: 1,
    storageLimitMb: 10240,
    storageUsedMb: 50,
    billingCycle: 'MONTHLY',
    monthlyFeeUsd: 119.00,
    nextBillingDate: '2026-10-06',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Shared',
    features: ['pos', 'kardex', 'mrp', 'crm', 'treasury'],
    notes: 'Aprovisionamiento en proceso de verificación de identidad fiscal.'
  }
];

export const INITIAL_AUDIT_LOGS_SEED: TenantAuditLog[] = [
  {
    id: 'aud-m-101',
    tenantId: 'tnt-006',
    tenantName: 'Agropecuaria e Insumos del Valle S.A.',
    action: 'PROVISION_TENANT',
    performerEmail: 'superadmin@4-inline.cloud',
    timestamp: '2026-09-06T14:30:00Z',
    details: 'Aprovisionamiento inicial de tenant con slug agropecuaria-del-valle bajo Plan PRO.',
    ipAddress: '192.168.1.10',
    severity: 'INFO'
  },
  {
    id: 'aud-m-102',
    tenantId: 'tnt-005',
    tenantName: 'Auto Partes Express Oriente C.A.',
    action: 'SUSPEND_TENANT',
    performerEmail: 'billing-bot@4-inline.cloud',
    timestamp: '2026-09-05T18:00:00Z',
    details: 'Suspensión automática de acceso por mora en ciclo de facturación mensual.',
    ipAddress: '10.0.0.1',
    severity: 'WARNING'
  },
  {
    id: 'aud-m-103',
    tenantId: 'tnt-001',
    tenantName: 'Ferretería & Suministros Central C.A.',
    action: 'START_IMPERSONATION',
    performerEmail: 'superadmin@4-inline.cloud',
    timestamp: '2026-09-01T10:00:00Z',
    details: 'Sesión de soporte técnico auditada iniciada. Motivo: Asistencia en ajuste de tasas BCV.',
    ipAddress: '192.168.1.10',
    severity: 'INFO'
  },
  {
    id: 'aud-m-104',
    tenantId: 'tnt-002',
    tenantName: 'Distribuidora Andina de Alimentos S.A.',
    action: 'CHANGE_PLAN',
    performerEmail: 'superadmin@4-inline.cloud',
    timestamp: '2026-08-28T14:15:00Z',
    details: 'Upgrade de plan PRO a ENTERPRISE con habilitación de Contabilidad NIIF y custom domain.',
    ipAddress: '192.168.1.10',
    severity: 'INFO'
  }
];
