import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());

// In-Memory initial seed data for API routes
const MOCK_PRODUCTS = [
  {
    id: 'prod-01',
    sku: 'ELE-TAL-750',
    barcode: '775123400101',
    name: 'Taladro Percutor Industrial 750W 1/2"',
    category: 'Herramientas Eléctricas',
    unit: 'UND',
    costPrice: 42.50,
    salePrice: 78.90,
    prices: { price1: 78.90, price2: 67.00, price3: 59.00, price4: 55.00, price5: 51.00 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 8,
    totalStock: 34,
    status: 'ACTIVE'
  },
  {
    id: 'prod-02',
    sku: 'RED-CAT6-305',
    barcode: '775123400102',
    name: 'Bobina Cable Red UTP Cat6 100% Cobre 305m',
    category: 'Redes y Telecom',
    unit: 'UND',
    costPrice: 85.00,
    salePrice: 139.00,
    prices: { price1: 139.00, price2: 118.00, price3: 104.00, price4: 98.00, price5: 92.00 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 5,
    totalStock: 18,
    status: 'ACTIVE'
  },
  {
    id: 'prod-03',
    sku: 'PIN-LAT-04L',
    barcode: '775123400103',
    name: 'Pintura Látex Super Lavable Blanco Nieve 4L',
    category: 'Acabados y Pinturas',
    unit: 'LT',
    costPrice: 14.20,
    salePrice: 28.50,
    prices: { price1: 28.50, price2: 24.20, price3: 21.30, price4: 19.90, price5: 18.50 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 15,
    totalStock: 52,
    status: 'ACTIVE'
  },
  {
    id: 'prod-05',
    sku: 'ILU-LED-50W',
    barcode: '775123400105',
    name: 'Reflector LED Industrial Exterior IP65 50W 6500K',
    category: 'Iluminación',
    unit: 'UND',
    costPrice: 18.90,
    salePrice: 38.00,
    prices: { price1: 38.00, price2: 32.30, price3: 28.50, price4: 26.60, price5: 24.70 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 10,
    totalStock: 6,
    status: 'ACTIVE'
  }
];

const MOCK_WAREHOUSES = [
  { id: 'wh-01', code: 'ALM-CENTRAL', name: 'Almacén Central (Bodega Principal)', location: 'Av. Industrial 4050, Nave B', isMain: true },
  { id: 'wh-02', code: 'ALM-NORTE', name: 'Almacén Sucursal Norte', location: 'Parque Comercial Norte Local 12', isMain: false },
  { id: 'wh-03', code: 'DEP-03', name: 'Depósito 3 (Logística Rápida)', location: 'Zona Portuaria Almacén 8', isMain: false }
];

const MOCK_CUSTOMERS = [
  { id: 'cust-01', taxId: 'B-77492019-3', name: 'Constructora San Martín S.A.C.', email: 'compras@constructorasanmartin.com', customerType: 'EMPRESA' },
  { id: 'cust-02', taxId: 'B-88301922-1', name: 'Soluciones Eléctricas del Pacífico', email: 'finanzas@se-pacifico.net', customerType: 'EMPRESA' },
  { id: 'cust-03', taxId: 'RFC-XAXX010101000', name: 'Cliente Mostrador / Venta Rápida', email: 'ventasmostrador@4-inLine.local', customerType: 'FINAL_CONSUMIDOR' }
];

const MOCK_SUPPLIERS = [
  { id: 'sup-01', taxId: 'J-30948572-1', name: 'Distribuidora Industrial del Norte S.A.', contactPerson: 'Ing. Roberto Méndez', email: 'ventas@distnorte.com' },
  { id: 'sup-02', taxId: 'J-40192833-4', name: 'ElectroGlobal S.A.C.', contactPerson: 'Lic. Mariana Vega', email: 'contacto@electroglobal.corp' }
];

// ERP REST API Routes
app.get('/api/products', (req, res) => {
  res.json(MOCK_PRODUCTS);
});

app.post('/api/products', (req, res) => {
  const newProduct = req.body;
  newProduct.id = newProduct.id || `prod-${Date.now()}`;
  MOCK_PRODUCTS.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/api/warehouses', (req, res) => {
  res.json(MOCK_WAREHOUSES);
});

app.get('/api/customers', (req, res) => {
  res.json(MOCK_CUSTOMERS);
});

app.get('/api/suppliers', (req, res) => {
  res.json(MOCK_SUPPLIERS);
});

app.get('/api/invoices', (req, res) => {
  res.json([]);
});

app.post('/api/invoices', (req, res) => {
  const newInvoice = req.body;
  res.status(201).json(newInvoice);
});

app.get('/api/kardex', (req, res) => {
  res.json([]);
});

app.get('/api/mrp/boms', (req, res) => {
  res.json([]);
});

app.get('/api/mrp/orders', (req, res) => {
  res.json([]);
});

app.get('/api/crm/deals', (req, res) => {
  res.json([]);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// SUPERADMIN MASTER MULTI-TENANT BACKEND APIS
// ============================================================================

interface MasterTenant {
  id: string;
  slug: string;
  companyName: string;
  legalTaxId: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  maxUsers: number;
  currentUsersCount: number;
  storageLimitMb: number;
  storageUsedMb: number;
  monthlyFeeUsd: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  contactEmail: string;
  contactPhone: string;
  adminUserName: string;
  adminUserEmail: string;
  region: string;
  databaseTier: string;
  customDomain?: string;
  features: string[];
  notes?: string;
  suspendedReason?: string;
  nextBillingDate: string;
}

let MASTER_TENANTS: MasterTenant[] = [
  {
    id: 'tenant-agro-01',
    slug: 'agroinsumos',
    companyName: 'AgroInsumos del Centro C.A.',
    legalTaxId: 'J-31456789-0',
    plan: 'PRO',
    status: 'ACTIVE',
    createdAt: '2025-11-10T10:00:00Z',
    maxUsers: 20,
    currentUsersCount: 8,
    storageLimitMb: 10240,
    storageUsedMb: 2450,
    monthlyFeeUsd: 119.00,
    billingCycle: 'MONTHLY',
    contactEmail: 'gerencia@agroinsumos.com',
    contactPhone: '+58 241-8765432',
    adminUserName: 'Ing. Carlos Mendoza',
    adminUserEmail: 'cmendoza@agroinsumos.com',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Postgres HA',
    features: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS', 'MRP', 'CRM'],
    nextBillingDate: '2026-10-10',
    notes: 'Cliente con alta rotación de inventario agrícola y facturación multimoneda.'
  },
  {
    id: 'tenant-auto-02',
    slug: 'autorepuestos-andes',
    companyName: 'AutoRepuestos Los Andes S.R.L.',
    legalTaxId: 'J-40112233-4',
    plan: 'BASIC',
    status: 'ACTIVE',
    createdAt: '2026-01-15T14:30:00Z',
    maxUsers: 5,
    currentUsersCount: 3,
    storageLimitMb: 2048,
    storageUsedMb: 610,
    monthlyFeeUsd: 49.00,
    billingCycle: 'ANNUAL',
    contactEmail: 'administracion@losandesrepuestos.com',
    contactPhone: '+58 274-2521100',
    adminUserName: 'Mariana Silva',
    adminUserEmail: 'msilva@losandesrepuestos.com',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Postgres Standard',
    features: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS'],
    nextBillingDate: '2027-01-15',
    notes: 'Plan Comercial PyME base.'
  },
  {
    id: 'tenant-tech-03',
    slug: 'farma-global',
    companyName: 'Corporación Farmacéutica Global S.A.',
    legalTaxId: 'J-50987654-1',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    createdAt: '2025-08-01T09:00:00Z',
    maxUsers: 100,
    currentUsersCount: 34,
    storageLimitMb: 51200,
    storageUsedMb: 12480,
    monthlyFeeUsd: 249.00,
    billingCycle: 'MONTHLY',
    contactEmail: 'director.it@farmaglobal.com',
    contactPhone: '+58 212-9998877',
    adminUserName: 'Dra. Elena Valenzuela',
    adminUserEmail: 'evalenzuela@farmaglobal.com',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Postgres HA Dedicated',
    customDomain: 'erp.farmaglobal.com',
    features: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS', 'MRP', 'CRM', 'LOGISTICS', 'PAYROLL', 'ACCOUNTING_NIIF', 'PROJECTS'],
    nextBillingDate: '2026-09-30',
    notes: 'SLA prioritario 24/7 y multi-sucursal nacional.'
  },
  {
    id: 'tenant-dist-04',
    slug: 'mar-caribe',
    companyName: 'Distribuidora Alimentos Mar Caribe',
    legalTaxId: 'J-29837465-9',
    plan: 'BASIC',
    status: 'SUSPENDED',
    createdAt: '2026-02-01T11:00:00Z',
    maxUsers: 5,
    currentUsersCount: 2,
    storageLimitMb: 2048,
    storageUsedMb: 1890,
    monthlyFeeUsd: 49.00,
    billingCycle: 'MONTHLY',
    contactEmail: 'cobranzas@alimentosmarcaribe.com',
    contactPhone: '+58 281-2860011',
    adminUserName: 'Jorge Zambrano',
    adminUserEmail: 'jzambrano@alimentosmarcaribe.com',
    region: 'us-east1',
    databaseTier: 'Cloud SQL Postgres Standard',
    features: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS'],
    suspendedReason: 'Mora en factura mensual recurrente #INV-2026-02',
    nextBillingDate: '2026-03-01',
    notes: 'Suspensión temporal por falta de pago del ciclo mensual.'
  }
];

let MASTER_PLANS = [
  {
    id: 'BASIC',
    name: 'Plan Comercial / PyME',
    tagline: 'Facturación, inventarios, compras, POS y tesorería para comercios y pequeñas empresas.',
    priceMonthlyUsd: 49.00,
    priceAnnualUsd: 470.00,
    maxUsers: 5,
    storageLimitMb: 2048,
    maxInvoicesMonthly: 1000,
    supportTier: 'Email 24h',
    customDomainSupported: false,
    allowedModules: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS', 'CASH_CLOSING'],
    isPopular: false
  },
  {
    id: 'PRO',
    name: 'Plan Profesional / MRP',
    tagline: 'Ideal para empresas manufactureras y distribuidoras en expansión.',
    priceMonthlyUsd: 119.00,
    priceAnnualUsd: 1140.00,
    maxUsers: 20,
    storageLimitMb: 10240,
    maxInvoicesMonthly: 10000,
    supportTier: 'Chat & Email 4h',
    customDomainSupported: true,
    allowedModules: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS', 'CASH_CLOSING', 'MRP', 'CRM', 'LOGISTICS', 'PAYROLL'],
    isPopular: true
  },
  {
    id: 'ENTERPRISE',
    name: 'Plan Enterprise / Corporativo',
    tagline: 'Solución integral corporativa multi-sucursal con contabilidad formal NIIF y SLA prioritario.',
    priceMonthlyUsd: 249.00,
    priceAnnualUsd: 2390.00,
    maxUsers: 100,
    storageLimitMb: 51200,
    maxInvoicesMonthly: 100000,
    supportTier: 'Dedicado 24/7 + SLA 99.99%',
    customDomainSupported: true,
    allowedModules: ['INVENTORY', 'POS', 'PURCHASES', 'TREASURY', 'BUDGETS', 'CASH_CLOSING', 'MRP', 'CRM', 'LOGISTICS', 'PAYROLL', 'ACCOUNTING_NIIF', 'PROJECTS', 'QUALITY_CONTROL'],
    isPopular: false
  }
];

let MASTER_AUDIT_LOGS = [
  {
    id: 'aud-001',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'PROVISION_TENANT',
    tenantId: 'tenant-tech-03',
    tenantName: 'Corporación Farmacéutica Global S.A.',
    details: 'Aprovisionamiento automático de base de datos Postgres HA y asignación de Plan Enterprise.',
    ipAddress: '190.202.14.88'
  },
  {
    id: 'aud-002',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'SUSPEND_TENANT',
    tenantId: 'tenant-dist-04',
    tenantName: 'Distribuidora Alimentos Mar Caribe',
    details: 'Suspensión administrativa por mora de factura recurrente de suscripción mensual.',
    ipAddress: '190.202.14.88'
  },
  {
    id: 'aud-003',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'PLAN_CHANGE',
    tenantId: 'tenant-agro-01',
    tenantName: 'AgroInsumos del Centro C.A.',
    details: 'Upgrade de suscripción de BASIC a PRO con ampliación de almacenamiento a 10 GB.',
    ipAddress: '190.202.14.88'
  }
];

// GET /api/v1/master/tenants
app.get('/api/v1/master/tenants', (req, res) => {
  res.json(MASTER_TENANTS);
});

// POST /api/v1/master/tenants
app.post('/api/v1/master/tenants', (req, res) => {
  const body = req.body;
  const newId = `tenant-${Date.now().toString(36)}`;
  const planInfo = MASTER_PLANS.find(p => p.id === body.plan) || MASTER_PLANS[1];

  const newTenant: MasterTenant = {
    id: newId,
    slug: body.slug || `tenant-${Date.now().toString(36)}`,
    companyName: body.companyName,
    legalTaxId: body.legalTaxId,
    plan: body.plan || 'PRO',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    maxUsers: planInfo.maxUsers,
    currentUsersCount: 1,
    storageLimitMb: planInfo.storageLimitMb,
    storageUsedMb: 15,
    monthlyFeeUsd: planInfo.priceMonthlyUsd,
    billingCycle: body.billingCycle || 'MONTHLY',
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone || '+58 212-0000000',
    adminUserName: body.adminUserName,
    adminUserEmail: body.adminUserEmail,
    region: body.region || 'us-east1',
    databaseTier: planInfo.id === 'ENTERPRISE' ? 'Cloud SQL Postgres HA Dedicated' : 'Cloud SQL Postgres Standard',
    customDomain: body.customDomain,
    features: planInfo.allowedModules,
    notes: body.notes,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  };

  MASTER_TENANTS.unshift(newTenant);

  // Record audit log
  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'PROVISION_TENANT',
    tenantId: newTenant.id,
    tenantName: newTenant.companyName,
    details: `Aprovisionamiento de nuevo tenant con subdominio ${newTenant.slug}.4-inline.cloud y Plan ${newTenant.plan}.`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.status(201).json(newTenant);
});

// PUT /api/v1/master/tenants/:id
app.put('/api/v1/master/tenants/:id', (req, res) => {
  const { id } = req.params;
  const index = MASTER_TENANTS.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  MASTER_TENANTS[index] = {
    ...MASTER_TENANTS[index],
    ...req.body,
    id: MASTER_TENANTS[index].id // Preserve ID
  };

  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'UPDATE_TENANT',
    tenantId: id,
    tenantName: MASTER_TENANTS[index].companyName,
    details: `Actualización de perfil y metadatos del tenant ${MASTER_TENANTS[index].companyName}.`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json(MASTER_TENANTS[index]);
  return;
});

// PATCH /api/v1/master/tenants/:id/status
app.patch('/api/v1/master/tenants/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const tenant = MASTER_TENANTS.find(t => t.id === id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  tenant.status = status;
  if (status === 'SUSPENDED') {
    tenant.suspendedReason = reason || 'Suspensión ejecutada desde consola Master';
  } else {
    tenant.suspendedReason = undefined;
  }

  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: status === 'SUSPENDED' ? 'SUSPEND_TENANT' : 'ACTIVATE_TENANT',
    tenantId: id,
    tenantName: tenant.companyName,
    details: `Cambio de estado a ${status}: ${reason || 'Sin detalles adicionales'}`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json(tenant);
  return;
});

// PATCH /api/v1/master/tenants/:id/plan
app.patch('/api/v1/master/tenants/:id/plan', (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  const tenant = MASTER_TENANTS.find(t => t.id === id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const planInfo = MASTER_PLANS.find(p => p.id === plan);
  if (!planInfo) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }

  tenant.plan = plan;
  tenant.monthlyFeeUsd = planInfo.priceMonthlyUsd;
  tenant.maxUsers = planInfo.maxUsers;
  tenant.storageLimitMb = planInfo.storageLimitMb;
  tenant.features = planInfo.allowedModules;

  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'PLAN_CHANGE',
    tenantId: id,
    tenantName: tenant.companyName,
    details: `Plan actualizado a ${plan} (${planInfo.name}). Límites recalculados: ${planInfo.maxUsers} usuarios, ${planInfo.storageLimitMb} MB.`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json(tenant);
  return;
});

// DELETE /api/v1/master/tenants/:id
app.delete('/api/v1/master/tenants/:id', (req, res) => {
  const { id } = req.params;
  const tenant = MASTER_TENANTS.find(t => t.id === id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  MASTER_TENANTS = MASTER_TENANTS.filter(t => t.id !== id);

  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'DELETE_TENANT',
    tenantId: id,
    tenantName: tenant.companyName,
    details: `Eliminación y desaprovisionamiento total del tenant ${tenant.companyName} (${tenant.slug}).`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Tenant desaprovisionado exitosamente' });
  return;
});

// POST /api/v1/master/impersonate
app.post('/api/v1/master/impersonate', (req, res) => {
  const { tenantId, reason, durationMinutes } = req.body;
  const tenant = MASTER_TENANTS.find(t => t.id === tenantId);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }

  const auditToken = `token-sec-master-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + (durationMinutes || 60) * 60 * 1000).toISOString();

  MASTER_AUDIT_LOGS.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    performerEmail: 'superadmin@4-inline.cloud',
    action: 'START_IMPERSONATION',
    tenantId: tenant.id,
    tenantName: tenant.companyName,
    details: `Inicio de sesión de soporte auditada. Motivo: ${reason}. Token: ${auditToken.substring(0, 16)}...`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({
    active: true,
    tenantId: tenant.id,
    tenantName: tenant.companyName,
    tenantSlug: tenant.slug,
    supportAgentEmail: 'superadmin@4-inline.cloud',
    reason,
    startedAt: new Date().toISOString(),
    expiresAt,
    auditToken
  });
  return;
});

// GET /api/v1/master/metrics
app.get('/api/v1/master/metrics', (req, res) => {
  const totalTenants = MASTER_TENANTS.length;
  const activeTenants = MASTER_TENANTS.filter(t => t.status === 'ACTIVE').length;
  const suspendedTenants = MASTER_TENANTS.filter(t => t.status === 'SUSPENDED').length;
  const pendingTenants = MASTER_TENANTS.filter(t => t.status === 'PENDING').length;
  const totalUsers = MASTER_TENANTS.reduce((acc, t) => acc + (t.currentUsersCount || 0), 0);
  const mrrUsd = MASTER_TENANTS
    .filter(t => t.status === 'ACTIVE')
    .reduce((acc, t) => acc + (t.monthlyFeeUsd || 0), 0);
  const arrUsd = mrrUsd * 12;

  const tenantsByPlan = {
    BASIC: MASTER_TENANTS.filter(t => t.plan === 'BASIC').length,
    PRO: MASTER_TENANTS.filter(t => t.plan === 'PRO').length,
    ENTERPRISE: MASTER_TENANTS.filter(t => t.plan === 'ENTERPRISE').length
  };

  res.json({
    totalTenants,
    activeTenants,
    suspendedTenants,
    pendingTenants,
    totalUsers,
    mrrUsd,
    arrUsd,
    tenantsByPlan,
    healthStatus: {
      isOperational: true,
      latencyMs: 24,
      uptimePercentage: 99.98,
      activeWorkerNodes: 4,
      databaseConnections: 142,
      cpuUsagePct: 18.5,
      memoryUsagePct: 42.0,
      lastBackupAt: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  });
});

// GET /api/v1/master/plans
app.get('/api/v1/master/plans', (req, res) => {
  res.json(MASTER_PLANS);
});

// PUT /api/v1/master/plans/:id
app.put('/api/v1/master/plans/:id', (req, res) => {
  const { id } = req.params;
  const index = MASTER_PLANS.findIndex(p => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  MASTER_PLANS[index] = {
    ...MASTER_PLANS[index],
    ...req.body,
    id: MASTER_PLANS[index].id
  };

  res.json(MASTER_PLANS[index]);
  return;
});

// GET /api/v1/master/audit-logs
app.get('/api/v1/master/audit-logs', (req, res) => {
  res.json(MASTER_AUDIT_LOGS);
});

const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
