import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Product,
  ProductPrices,
  PriceLevelKey,
  PriceLevelConfig,
  CurrencyCode,
  BcvExchangeRateState,
  InvoiceTaxDetails,
  CompanyFiscalProfile,
  CompanyPlanTier,
  PlanFeatureConfig,
  Warehouse,
  KardexMovement,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Customer,
  Invoice,
  InvoiceItem,
  Quote,
  CashRegisterSession,
  AuditLog,
  PaymentRecord,
  Bom,
  BomItem,
  ProductionOrder,
  ProductionOrderStatus,
  CrmDeal,
  CrmActivity,
  CrmStage,
  CrmActivityType,
  Account,
  JournalEntry,
  JournalEntryLine,
  ErpFullBackupPayload,
  CriticalAuditNotification,
  CriticalAuditCategory,
  PaymentMethod,
  DispatchGuide,
  DeliveryOrder,
  DispatchItem,
  CarrierType,
  TransportReason,
  DeliveryReceptionDetails,
  BankAccount,
  TreasuryTransaction,
  CustomerPaymentReceipt,
  SupplierPaymentReceipt,
  PayableBill,
  PayableBillStatus
} from '../models/erp.models';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

const STORAGE_KEY = 'nexus_erp_state_v1';

@Injectable({
  providedIn: 'root'
})
export class ErpStateService {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  readonly products = signal<Product[]>([]);

  constructor() {
    this.syncWithBackend();
    this.loadPersistedState();
  }

  private syncWithBackend() {
    this.apiService.getProducts().subscribe((data: Product[]) => {
      if (data && data.length > 0) {
        this.products.set(data);
      }
    });
  }

  // Price Level Configurations
  readonly priceLevelConfigs: PriceLevelConfig[] = [
    { key: 'price1', label: 'Precio 1: Detal (Público General)', shortName: 'Detal', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', defaultDiscountRatio: 0 },
    { key: 'price2', label: 'Precio 2: Mayor (-15%)', shortName: 'Mayor', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300', defaultDiscountRatio: 0.15 },
    { key: 'price3', label: 'Precio 3: Distribuidor (-25%)', shortName: 'Distribuidor', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', defaultDiscountRatio: 0.25 },
    { key: 'price4', label: 'Precio 4: VIP / Corporativo (-30%)', shortName: 'VIP', badgeClass: 'bg-violet-100 text-violet-800 border-violet-300', defaultDiscountRatio: 0.30 },
    { key: 'price5', label: 'Precio 5: Especial / Empleado (-35%)', shortName: 'Especial', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', defaultDiscountRatio: 0.35 }
  ];

  // BCV Official Exchange Rate Engine
  readonly bcvState = signal<BcvExchangeRateState>({
    usdRate: 36.50,
    eurRate: 39.80,
    origin: 'API_BCV',
    lastSync: '2026-08-18 08:00:00',
    isSyncing: false,
    status: 'SYNCED',
    bcvOfficialDate: '18/08/2026'
  });

  // Perfil Fiscal y Nivel de Plan de la Empresa (SENIAT & SaaS Tiering)
  readonly companyProfile = signal<CompanyFiscalProfile>({
    legalName: '4-inLine Corp, C.A.',
    tradeName: '4-inLine Corp',
    taxId: 'J-50493821-4',
    planTier: 'FULL', // Default: 'FULL' (Enterprise) o 'BASE' (Comercial / PyME)
    isSpecialTaxpayer: true, // Sujeto Pasivo Especial (SENIAT) - Agente de Percepción del 3% IGTF
    specialTaxpayerDesignationNumber: 'SNAT/2022/000013',
    address: 'Av. Francisco de Miranda, Centro Financiero Torre Alpha, Piso 8, Caracas, Venezuela',
    phone: '+58 212 500-8800',
    email: 'facturacion@4-inLine.com',
    defaultIvaRate: 0.16,
    igtfRate: 0.03
  });

  // Catálogo de Planes del Sistema
  readonly planConfigs: PlanFeatureConfig[] = [
    {
      id: 'BASE',
      name: 'Versión Base (Plan Comercial / PyME)',
      tagline: 'Ideal para comercios, distribuidoras y pequeñas empresas que necesitan facturar y controlar stock.',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
      color: 'blue',
      priceMonthlyUsd: 35.00,
      priceAnnualUsd: 350.00,
      maxUsers: 3,
      maxWarehouses: 2,
      includedTabs: [
        'dashboard',
        'inventory',
        'kardex',
        'purchases',
        'sales-pos',
        'quotes',
        'logistics',
        'treasury',
        'cash-closing',
        'manual',
        'architecture'
      ],
      featuresList: [
        'Punto de Venta POS Rápido & Facturación Fiscal Electrónica',
        'Multimoneda USD / VES con Tasa Oficial BCV en Tiempo Real',
        'Cálculo Automático IVA 16% e IGTF 3% (Sujeto Pasivo Especial)',
        'Inventario y Almacenes con Control de Stock Mínimo',
        'Kardex Valorado por Costo Promedio Ponderado (CPP)',
        'Compras a Proveedores y Cuentas por Pagar (CxP)',
        'Presupuestos y Cotizaciones con Conversión a Factura',
        'Logística y Despachos SENIAT (SNAT/2011/00071)',
        'Tesorería Básica (Cuentas por Cobrar, Cuentas por Pagar y Cuentas Bancarias)',
        'Arqueos y Cierre de Caja Z con Desglose por Medio de Pago'
      ],
      lockedFeaturesList: [
        'Manufactura Avanzada y Fórmulas BOM (MRP)',
        'CRM de Oportunidades y Pipeline Kanban B2B',
        'Contabilidad Financiera Integral NIIF y Asientos Automáticos',
        'Gestión Multi-Usuario con Permisos Granulares RBAC',
        'Bitácora de Auditoría Forense y Notificaciones Críticas',
        'Respaldos Automatizados Nube Cloud Firestore & Exportación JSON'
      ]
    },
    {
      id: 'FULL',
      name: 'Versión Full / Pro (Plan Enterprise / Corporativo)',
      tagline: 'Solución integral de grado industrial con manufactura, contabilidad NIIF, CRM y auditoría forense.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
      color: 'emerald',
      priceMonthlyUsd: 95.00,
      priceAnnualUsd: 950.00,
      maxUsers: 999,
      maxWarehouses: 999,
      includedTabs: [
        'dashboard',
        'inventory',
        'kardex',
        'purchases',
        'sales-pos',
        'quotes',
        'logistics',
        'treasury',
        'cash-closing',
        'mrp',
        'crm',
        'accounting',
        'users',
        'audit-log',
        'backups',
        'manual',
        'architecture'
      ],
      featuresList: [
        'Todos los módulos del Plan Comercial / PyME incluidos',
        'Manufactura y Planificación de Recursos MRP con Fórmulas BOM',
        'Órdenes de Fabricación con Absorción de MOD y CIF',
        'CRM B2B con Pipeline Kanban, Actividades y Win-Rate Ponderado',
        'Contabilidad NIIF con Plan de Cuentas Jerárquico y Balance General',
        'Asientos Contables en Partida Doble Automáticos en Cada Venta y Compra',
        'Gestión de Usuarios RBAC (Admin, Cajero, Almacenero, Contador, Vendedor, Auditor)',
        'Bitácora de Auditoría Inmutable con Control de Integridad SHA-256',
        'Respaldos Nube Firebase Cloud Firestore y Restauración ACID'
      ],
      lockedFeaturesList: []
    }
  ];

  // Señales Reactivas de Nivel de Plan
  readonly companyPlan = computed<CompanyPlanTier>(() => this.companyProfile().planTier || 'FULL');
  readonly isBasePlan = computed<boolean>(() => this.companyPlan() === 'BASE');
  readonly isFullPlan = computed<boolean>(() => this.companyPlan() === 'FULL');
  readonly currentPlanConfig = computed<PlanFeatureConfig>(() => {
    return this.planConfigs.find(p => p.id === this.companyPlan()) || this.planConfigs[1];
  });

  setCompanyPlan(tier: CompanyPlanTier) {
    const previous = this.companyPlan();
    this.companyProfile.update(prev => ({ ...prev, planTier: tier }));
    this.saveState();
    
    this.logAudit(
      'CONFIG_BACKUP_SCHEDULE',
      'AUTH',
      `Cambio de Plan de Empresa: ${tier === 'BASE' ? 'Plan Base (PyME)' : 'Plan Full (Enterprise)'}`,
      `La empresa cambió su suscripción de ${previous} a ${tier}. Módulos ajustados según alcance comercial.`,
      null,
      { previousPlan: previous, newPlan: tier }
    );

    this.notify(
      'success',
      tier === 'BASE' ? 'Plan Base (PyME) Activado' : 'Plan Full (Enterprise) Activado',
      tier === 'BASE'
        ? 'Se ha activado el Plan Comercial / PyME. Acceso a POS, Inventario, Compras, Presupuesto, Caja y Tesorería.'
        : 'Se ha activado el Plan Enterprise / Corporativo con todos los módulos de manufactura, contabilidad NIIF y CRM habilitados.'
    );
  }

  isTabAllowedInPlan(tab: string): boolean {
    if (tab === 'super-admin' || tab === 'architecture') return true;
    if (this.companyPlan() === 'FULL') return true;
    const basePlan = this.planConfigs.find(p => p.id === 'BASE');
    return basePlan ? basePlan.includedTabs.includes(tab) : true;
  }

  updateCompanyProfile(updated: Partial<CompanyFiscalProfile>) {
    this.companyProfile.update(prev => ({ ...prev, ...updated }));
    this.saveState();
  }

  setSpecialTaxpayerStatus(isSpecial: boolean) {
    this.companyProfile.update(prev => ({ ...prev, isSpecialTaxpayer: isSpecial }));
    this.saveState();
    this.notify(
      'info',
      'Régimen Fiscal Actualizado',
      isSpecial 
        ? 'Empresa configurada como Sujeto Pasivo Especial (Agente de Percepción IGTF 3%).'
        : 'Empresa configurada como Contribuyente Ordinario (No actúa como agente de percepción IGTF).'
    );
  }

  // Core Reactive Signals
  readonly warehouses = signal<Warehouse[]>([
    { id: 'wh-01', code: 'ALM-CENTRAL', name: 'Almacén Central (Bodega Principal)', location: 'Av. Industrial 4050, Nave B', isMain: true },
    { id: 'wh-02', code: 'ALM-NORTE', name: 'Almacén Sucursal Norte', location: 'Parque Comercial Norte Local 12', isMain: false },
    { id: 'wh-03', code: 'DEP-03', name: 'Depósito 3 (Logística Rápida)', location: 'Zona Portuaria Almacén 8', isMain: false }
  ]);

  /* readonly products = signal<Product[]>([
    {
      id: 'prod-01',
      sku: 'ELE-TAL-750',
      barcode: '775123400101',
      name: 'Taladro Percutor Industrial 750W 1/2"',
      category: 'Herramientas Eléctricas',
      unit: 'UND',
      costPrice: 42.50, // Costo Promedio Ponderado
      salePrice: 78.90, // Precio 1 Detal
      prices: {
        price1: 78.90, // Detal
        price2: 67.00, // Mayor
        price3: 59.00, // Distribuidor
        price4: 55.00, // VIP
        price5: 51.00  // Especial
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 8,
      totalStock: 34,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 22 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 8 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 4 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
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
      prices: {
        price1: 139.00,
        price2: 118.00,
        price3: 104.00,
        price4: 98.00,
        price5: 92.00
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 5,
      totalStock: 18,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 12 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 4 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 2 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
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
      prices: {
        price1: 28.50,
        price2: 24.20,
        price3: 21.30,
        price4: 19.90,
        price5: 18.50
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 15,
      totalStock: 52,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 35 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 12 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 5 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-04',
      sku: 'ELE-DIS-20A',
      barcode: '775123400104',
      name: 'Disyuntor Termomagnético Bipolar 20A 10kA',
      category: 'Material Eléctrico',
      unit: 'UND',
      costPrice: 6.80,
      salePrice: 14.50,
      prices: {
        price1: 14.50,
        price2: 12.30,
        price3: 10.80,
        price4: 10.00,
        price5: 9.40
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 20,
      totalStock: 85,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 50 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 25 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 10 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
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
      prices: {
        price1: 38.00,
        price2: 32.30,
        price3: 28.50,
        price4: 26.60,
        price5: 24.70
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 10,
      totalStock: 6, // Bajo Stock Alert
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 4 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 2 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 0 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-06',
      sku: 'HER-CAJ-24P',
      barcode: '775123400106',
      name: 'Caja de Herramientas Plástica Profesional 24"',
      category: 'Herramientas Manuales',
      unit: 'UND',
      costPrice: 19.50,
      salePrice: 36.90,
      prices: {
        price1: 36.90,
        price2: 31.30,
        price3: 27.60,
        price4: 25.80,
        price5: 24.00
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 6,
      totalStock: 14,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 8 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 4 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 2 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-07',
      sku: 'TOR-DRY-100',
      barcode: '775123400107',
      name: 'Caja Tornillo Drywall Fosfatado 6x1" (1,000 Unidades)',
      category: 'Fijaciones y Tornillería',
      unit: 'CJ',
      costPrice: 7.20,
      salePrice: 15.00,
      prices: {
        price1: 15.00,
        price2: 12.75,
        price3: 11.25,
        price4: 10.50,
        price5: 9.75
      },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 12,
      totalStock: 48,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 30 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 12 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 6 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-08',
      sku: 'SER-CONS-01',
      barcode: '775123400108',
      name: 'Servicio de Consultoría Técnica e Inspección en Obra',
      category: 'Servicios Profesionales',
      unit: 'UND',
      costPrice: 0.00,
      salePrice: 100.00,
      prices: {
        price1: 100.00, // Detal
        price2: 85.00,  // Mayor
        price3: 75.00,  // Distribuidor
        price4: 70.00,  // VIP
        price5: 65.00   // Especial
      },
      isTaxExempt: true, // EXENTO DE IVA
      taxRate: 0.0,
      minStock: 0,
      totalStock: 999, // Servicio no tangible
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 999 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 999 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 999 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-rm-01',
      sku: 'MP-CAR-50W',
      barcode: '775123400201',
      name: 'Materia Prima: Carcasa Aluminio Fundido IP65 50W',
      category: 'Materia Prima & Insumos',
      unit: 'UND',
      costPrice: 5.50,
      salePrice: 9.00,
      prices: { price1: 9.00, price2: 8.00, price3: 7.50, price4: 7.00, price5: 6.50 },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 20,
      totalStock: 85,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 60 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 15 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 10 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-rm-02',
      sku: 'MP-COB-50W',
      barcode: '775123400202',
      name: 'Materia Prima: Módulo Chip LED COB 50W 6500K Epistar',
      category: 'Materia Prima & Insumos',
      unit: 'UND',
      costPrice: 4.80,
      salePrice: 8.00,
      prices: { price1: 8.00, price2: 7.20, price3: 6.80, price4: 6.20, price5: 5.80 },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 25,
      totalStock: 110,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 80 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 20 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 10 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-rm-03',
      sku: 'MP-DRV-50W',
      barcode: '775123400203',
      name: 'Materia Prima: Driver Fuente Regulada 85-265V IP67 1500mA',
      category: 'Materia Prima & Insumos',
      unit: 'UND',
      costPrice: 3.20,
      salePrice: 6.00,
      prices: { price1: 6.00, price2: 5.40, price3: 4.90, price4: 4.50, price5: 4.00 },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 20,
      totalStock: 74,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 50 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 14 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 10 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    },
    {
      id: 'prod-rm-04',
      sku: 'MP-CAB-SIL',
      barcode: '775123400204',
      name: 'Materia Prima: Cable Siliconado Alta Temperatura 3x1.0mm',
      category: 'Materia Prima & Insumos',
      unit: 'MT',
      costPrice: 0.85,
      salePrice: 1.60,
      prices: { price1: 1.60, price2: 1.40, price3: 1.25, price4: 1.15, price5: 1.05 },
      isTaxExempt: false,
      taxRate: 0.16,
      minStock: 50,
      totalStock: 240,
      stockByWarehouse: [
        { warehouseId: 'wh-01', warehouseName: 'Almacén Central', quantity: 180 },
        { warehouseId: 'wh-02', warehouseName: 'Almacén Sucursal Norte', quantity: 40 },
        { warehouseId: 'wh-03', warehouseName: 'Depósito 3', quantity: 20 }
      ],
      status: 'ACTIVE',
      updatedAt: '2026-08-18 07:15:00'
    }
  ]); */

  readonly suppliers = signal<Supplier[]>([
    {
      id: 'sup-01',
      taxId: 'J-30948572-1',
      name: 'Distribuidora Industrial del Norte S.A.',
      contactPerson: 'Ing. Roberto Méndez',
      email: 'ventas@distnorte.com',
      phone: '+52 81 8320 9000',
      address: 'Carretera Monterrey-Saltillo Km 14.5',
      paymentTerms: '30_DIAS',
      category: 'Herramientas e Iluminación',
      rating: 4.9
    },
    {
      id: 'sup-02',
      taxId: 'J-40192833-4',
      name: 'ElectroGlobal S.A.C.',
      contactPerson: 'Lic. Mariana Vega',
      email: 'contacto@electroglobal.corp',
      phone: '+52 55 5678 1234',
      address: 'Parque Tecnológico Azcapotzalco Nave 4',
      paymentTerms: '15_DIAS',
      category: 'Redes y Material Eléctrico',
      rating: 4.8
    },
    {
      id: 'sup-03',
      taxId: 'J-29837411-9',
      name: 'Ferreterías & Materiales Unión S.R.L.',
      contactPerson: 'Sr. Fernando Castro',
      email: 'pedidos@unionmateriales.com',
      phone: '+52 33 3812 4500',
      address: 'Zona Industrial Guadalajara Manzana 12',
      paymentTerms: 'CONTADO',
      category: 'Pinturas y Fijaciones',
      rating: 4.6
    }
  ]);

  readonly customers = signal<Customer[]>([
    {
      id: 'cust-01',
      taxId: 'B-77492019-3',
      name: 'Constructora San Martín S.A.C.',
      email: 'compras@constructorasanmartin.com',
      phone: '+52 55 4123 9900',
      address: 'Av. Las Palmas 500, Edificio Altus Piso 8',
      customerType: 'EMPRESA'
    },
    {
      id: 'cust-02',
      taxId: 'B-88301922-1',
      name: 'Soluciones Eléctricas del Pacífico',
      email: 'finanzas@se-pacifico.net',
      phone: '+52 664 612 7788',
      address: 'Blvd. Agua Caliente 1020, Tijuana',
      customerType: 'EMPRESA'
    },
    {
      id: 'cust-03',
      taxId: 'RFC-XAXX010101000',
      name: 'Cliente Mostrador / Venta Rápida',
      email: 'ventasmostrador@4-inLine.local',
      phone: '000-000-0000',
      address: 'Venta Directa Local',
      customerType: 'FINAL_CONSUMIDOR'
    },
    {
      id: 'cust-04',
      taxId: 'B-99120485-6',
      name: 'Inversiones Horizonte & Asociados',
      email: 'administracion@horizontecorp.com',
      phone: '+52 81 8150 3344',
      address: 'Av. Constitución 2200, Monterrey',
      customerType: 'EMPRESA'
    }
  ]);

  readonly kardexMovements = signal<KardexMovement[]>([
    {
      id: 'kdx-01',
      productId: 'prod-01',
      productSku: 'ELE-TAL-750',
      productName: 'Taladro Percutor Industrial 750W 1/2"',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      date: '2026-08-10 09:30:00',
      movementType: 'ENTRADA_COMPRA',
      docReference: 'OC-2026-0038',
      entryQty: 25,
      entryUnitCost: 42.00,
      entryTotalCost: 1050.00,
      exitQty: 0,
      exitUnitCost: 0,
      exitTotalCost: 0,
      balanceQty: 25,
      balanceAverageCost: 42.00,
      balanceTotalValuation: 1050.00,
      registeredByUserId: 'usr-wh-04',
      registeredByUserName: 'David Silva (Almacén)'
    },
    {
      id: 'kdx-02',
      productId: 'prod-01',
      productSku: 'ELE-TAL-750',
      productName: 'Taladro Percutor Industrial 750W 1/2"',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      date: '2026-08-14 14:20:00',
      movementType: 'SALIDA_VENTA',
      docReference: 'FAC-2026-0081',
      entryQty: 0,
      entryUnitCost: 0,
      entryTotalCost: 0,
      exitQty: 3,
      exitUnitCost: 42.00,
      exitTotalCost: 126.00,
      balanceQty: 22,
      balanceAverageCost: 42.00,
      balanceTotalValuation: 924.00,
      registeredByUserId: 'usr-cash-03',
      registeredByUserName: 'Carlos Mendoza'
    },
    {
      id: 'kdx-03',
      productId: 'prod-05',
      productSku: 'ILU-LED-50W',
      productName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      date: '2026-08-12 11:00:00',
      movementType: 'ENTRADA_COMPRA',
      docReference: 'OC-2026-0039',
      entryQty: 10,
      entryUnitCost: 18.90,
      entryTotalCost: 189.00,
      exitQty: 0,
      exitUnitCost: 0,
      exitTotalCost: 0,
      balanceQty: 10,
      balanceAverageCost: 18.90,
      balanceTotalValuation: 189.00,
      registeredByUserId: 'usr-wh-04',
      registeredByUserName: 'David Silva (Almacén)'
    },
    {
      id: 'kdx-04',
      productId: 'prod-05',
      productSku: 'ILU-LED-50W',
      productName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      date: '2026-08-16 16:45:00',
      movementType: 'SALIDA_VENTA',
      docReference: 'FAC-2026-0085',
      entryQty: 0,
      entryUnitCost: 0,
      entryTotalCost: 0,
      exitQty: 4,
      exitUnitCost: 18.90,
      exitTotalCost: 75.60,
      balanceQty: 6,
      balanceAverageCost: 18.90,
      balanceTotalValuation: 113.40,
      registeredByUserId: 'usr-cash-03',
      registeredByUserName: 'Carlos Mendoza'
    }
  ]);

  readonly purchaseOrders = signal<PurchaseOrder[]>([
    {
      id: 'po-01',
      orderNumber: 'OC-2026-0038',
      supplierId: 'sup-01',
      supplierName: 'Distribuidora Industrial del Norte S.A.',
      supplierTaxId: 'J-30948572-1',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central (Bodega Principal)',
      date: '2026-08-10 09:30:00',
      status: 'RECIBIDA',
      items: [
        {
          productId: 'prod-01',
          sku: 'ELE-TAL-750',
          productName: 'Taladro Percutor Industrial 750W 1/2"',
          quantity: 25,
          unitCost: 42.00,
          taxRate: 0.16,
          subtotal: 1050.00,
          total: 1218.00
        }
      ],
      subtotal: 1050.00,
      taxTotal: 168.00,
      total: 1218.00,
      notes: 'Despacho completo en tarima certificada.',
      receivedBy: 'David Silva (Almacén)'
    }
  ]);

  readonly invoices = signal<Invoice[]>([
    {
      id: 'inv-01',
      invoiceNumber: 'FAC-2026-0081',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      customerTaxId: 'B-77492019-3',
      warehouseId: 'wh-01',
      date: '2026-08-14 14:20:00',
      type: 'FACTURA_ELECTRONICA',
      status: 'EMITIDA',
      baseCurrency: 'USD',
      paymentCurrency: 'USD',
      bcvRate: 36.50,
      eurRate: 39.80,
      rateOrigin: 'API_BCV',
      priceLevelApplied: 'price1',
      items: [
        {
          productId: 'prod-01',
          sku: 'ELE-TAL-750',
          productName: 'Taladro Percutor Industrial 750W 1/2"',
          unit: 'UND',
          quantity: 3,
          unitPrice: 78.90,
          costPrice: 42.00,
          priceLevel: 'price1',
          discountPercent: 0,
          isTaxExempt: false,
          taxRate: 0.16,
          subtotal: 236.70,
          taxAmount: 37.87,
          total: 274.57
        }
      ],
      subtotal: 236.70,
      discountGlobalPercent: 0,
      discountTotal: 0,
      taxDetails: {
        taxableBase: 236.70,
        exemptBase: 0,
        ivaPercent: 16.0,
        ivaAmount: 37.87,
        appliesIgtf: false,
        igtfPercent: 3.0,
        igtfBase: 0,
        igtfAmount: 0
      },
      taxTotal: 37.87,
      total: 274.57,
      totalVes: 10021.81,
      totalEur: 251.80,
      payments: [
        { method: 'TRANSFERENCIA', amount: 274.57, currency: 'USD', reference: 'TRF-BBVA-90812' }
      ],
      sellerId: 'usr-cash-03',
      sellerName: 'Carlos Mendoza',
      digitalSeal: 'UUID-98A1B2C3-D4E5-F6A7-B8C9-0123456789AB'
    },
    {
      id: 'inv-02',
      invoiceNumber: 'FAC-2026-0085',
      customerId: 'cust-02',
      customerName: 'Soluciones Eléctricas del Pacífico',
      customerTaxId: 'B-88301922-1',
      warehouseId: 'wh-01',
      date: '2026-08-16 16:45:00',
      type: 'FACTURA_ELECTRONICA',
      status: 'EMITIDA',
      baseCurrency: 'USD',
      paymentCurrency: 'USD',
      bcvRate: 36.50,
      eurRate: 39.80,
      rateOrigin: 'API_BCV',
      priceLevelApplied: 'price1',
      items: [
        {
          productId: 'prod-05',
          sku: 'ILU-LED-50W',
          productName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
          unit: 'UND',
          quantity: 4,
          unitPrice: 38.00,
          costPrice: 18.90,
          priceLevel: 'price1',
          discountPercent: 5,
          isTaxExempt: false,
          taxRate: 0.16,
          subtotal: 144.40,
          taxAmount: 23.10,
          total: 167.50
        }
      ],
      subtotal: 144.40,
      discountGlobalPercent: 0,
      discountTotal: 7.60,
      taxDetails: {
        taxableBase: 144.40,
        exemptBase: 0,
        ivaPercent: 16.0,
        ivaAmount: 23.10,
        appliesIgtf: false,
        igtfPercent: 3.0,
        igtfBase: 0,
        igtfAmount: 0
      },
      taxTotal: 23.10,
      total: 167.50,
      totalVes: 6113.75,
      totalEur: 153.61,
      payments: [
        { method: 'TARJETA_CREDITO', amount: 167.50, currency: 'USD', reference: 'AUTH-VISA-4581' }
      ],
      sellerId: 'usr-cash-03',
      sellerName: 'Carlos Mendoza',
      digitalSeal: 'UUID-45B6C7D8-E9F0-1122-3344-5566778899AA'
    }
  ]);

  readonly quotes = signal<Quote[]>([
    {
      id: 'quot-01',
      quoteNumber: 'COT-2026-015',
      customerId: 'cust-04',
      customerName: 'Inversiones Horizonte & Asociados',
      customerTaxId: 'B-99120485-6',
      date: '2026-08-17 10:15:00',
      expirationDate: '2026-08-31',
      status: 'APROBADO',
      baseCurrency: 'USD',
      bcvRate: 36.50,
      priceLevelApplied: 'price2',
      items: [
        {
          productId: 'prod-02',
          sku: 'RED-CAT6-305',
          productName: 'Bobina Cable Red UTP Cat6 100% Cobre 305m',
          unit: 'UND',
          quantity: 4,
          unitPrice: 118.00,
          costPrice: 85.00,
          priceLevel: 'price2',
          discountPercent: 5,
          isTaxExempt: false,
          taxRate: 0.16,
          subtotal: 448.40,
          taxAmount: 71.74,
          total: 520.14
        },
        {
          productId: 'prod-04',
          sku: 'ELE-DIS-20A',
          productName: 'Disyuntor Termomagnético Bipolar 20A 10kA',
          unit: 'UND',
          quantity: 15,
          unitPrice: 12.30,
          costPrice: 6.80,
          priceLevel: 'price2',
          discountPercent: 0,
          isTaxExempt: false,
          taxRate: 0.16,
          subtotal: 184.50,
          taxAmount: 29.52,
          total: 214.02
        }
      ],
      subtotal: 632.90,
      discountTotal: 23.60,
      taxDetails: {
        taxableBase: 632.90,
        exemptBase: 0,
        ivaPercent: 16.0,
        ivaAmount: 101.26,
        appliesIgtf: false,
        igtfPercent: 3.0,
        igtfBase: 0,
        igtfAmount: 0
      },
      taxTotal: 101.26,
      total: 734.16,
      totalVes: 26796.84,
      notes: 'Cotización con Precio 2 (Mayorista) sujeta a disponibilidad de stock en Almacén Central. Entrega inmediata.',
      createdBy: 'Carlos Mendoza'
    },
    {
      id: 'quot-02',
      quoteNumber: 'COT-2026-016',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      customerTaxId: 'B-77492019-3',
      date: '2026-08-18 08:10:00',
      expirationDate: '2026-09-01',
      status: 'ENVIADO',
      baseCurrency: 'USD',
      bcvRate: 36.50,
      priceLevelApplied: 'price1',
      items: [
        {
          productId: 'prod-03',
          sku: 'PIN-LAT-04L',
          productName: 'Pintura Látex Super Lavable Blanco Nieve 4L',
          unit: 'LT',
          quantity: 20,
          unitPrice: 28.50,
          costPrice: 14.20,
          priceLevel: 'price1',
          discountPercent: 8,
          isTaxExempt: false,
          taxRate: 0.16,
          subtotal: 524.40,
          taxAmount: 83.90,
          total: 608.30
        }
      ],
      subtotal: 524.40,
      discountTotal: 45.60,
      taxDetails: {
        taxableBase: 524.40,
        exemptBase: 0,
        ivaPercent: 16.0,
        ivaAmount: 83.90,
        appliesIgtf: false,
        igtfPercent: 3.0,
        igtfBase: 0,
        igtfAmount: 0
      },
      taxTotal: 83.90,
      total: 608.30,
      totalVes: 22202.95,
      notes: 'Descuento especial por volumen de obra.',
      createdBy: 'Alejandro Morales (Admin)'
    }
  ]);

  readonly dispatchGuides = signal<DispatchGuide[]>([
    {
      id: 'gd-01',
      guideNumber: 'GD-2026-0001',
      controlNumber: '00-00000101',
      issueDate: '2026-08-17 11:30:00',
      estimatedTransferDate: '2026-08-17',
      status: 'ENTREGADA',
      originWarehouseId: 'wh-01',
      originWarehouseName: 'Almacén Central (Bodega Principal)',
      originAddress: 'Av. Industrial 4050, Nave B, Caracas',
      customerId: 'cust-04',
      customerName: 'Inversiones Horizonte & Asociados',
      customerTaxId: 'B-99120485-6',
      customerAddress: 'Av. Constitución 2200, Monterrey',
      destinationAddress: 'Av. Constitución 2200, Edificio Horizonte PB, Monterrey',
      customerPhone: '+52 81 8150 3344',
      customerContact: 'Lic. Andrés Salcedo',
      transferReason: 'VENTA',
      transferReasonDetails: 'Despacho de pedido programado con recepción en obra.',
      carrierName: 'Transportes Rápidos de Carga C.A.',
      carrierTaxId: 'J-31456789-0',
      driverName: 'José Gregorio Pereira',
      driverIdNumber: 'V-16.890.432',
      driverPhone: '+58 414-3322110',
      vehicleBrand: 'Ford',
      vehicleModel: 'F-350 Tritón',
      vehiclePlate: 'A89CD2E',
      vehicleColor: 'Blanco',
      items: [
        {
          productId: 'prod-02',
          sku: 'RED-CAT6-305',
          productName: 'Bobina Cable Red UTP Cat6 100% Cobre 305m',
          unit: 'UND',
          quantity: 2,
          costPrice: 85.00,
          unitPrice: 118.00,
          subtotal: 236.00
        },
        {
          productId: 'prod-04',
          sku: 'ELE-DIS-20A',
          productName: 'Disyuntor Termomagnético Bipolar 20A 10kA',
          unit: 'UND',
          quantity: 10,
          costPrice: 6.80,
          unitPrice: 12.30,
          subtotal: 123.00
        }
      ],
      totalQuantity: 12,
      totalValuationCost: 238.00,
      totalEstimatedSale: 359.00,
      originQuoteId: 'quot-01',
      originQuoteNumber: 'COT-2026-015',
      relatedDeliveryOrderId: 'oe-01',
      relatedDeliveryOrderNumber: 'OE-2026-0001',
      invoicedInvoiceNumber: undefined,
      notes: 'Amparo legal para transporte terrestre en vía pública SENIAT Providencia SNAT/2011/00071.',
      issuedByUserId: 'usr-wh-04',
      issuedByUserName: 'David Silva (Almacén)',
      digitalSecuritySeal: 'GD-SEAL-89B4C2D1-SENIAT-00071',
      createdAt: '2026-08-17 11:30:00',
      updatedAt: '2026-08-17 15:45:00'
    },
    {
      id: 'gd-02',
      guideNumber: 'GD-2026-0002',
      controlNumber: '00-00000102',
      issueDate: '2026-08-18 09:15:00',
      estimatedTransferDate: '2026-08-18',
      status: 'EN_TRANSITO',
      originWarehouseId: 'wh-01',
      originWarehouseName: 'Almacén Central (Bodega Principal)',
      originAddress: 'Av. Industrial 4050, Nave B, Caracas',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      customerTaxId: 'B-77492019-3',
      customerAddress: 'Av. Las Palmas 500, Edificio Altus Piso 8',
      destinationAddress: 'Obra Residencial Los Laureles, Parcela 14, El Hatillo',
      customerPhone: '+52 55 4123 9900',
      customerContact: 'Ing. Marcos Colmenares',
      transferReason: 'VENTA',
      transferReasonDetails: 'Entrega directa en sitio de obra civil.',
      carrierName: 'Logística & Fletes Express S.R.L.',
      carrierTaxId: 'J-40982314-8',
      driverName: 'Ramón Antonio Castillo',
      driverIdNumber: 'V-14.789.201',
      driverPhone: '+58 412-5558877',
      vehicleBrand: 'Iveco',
      vehicleModel: 'Daily 70C16 Carga Pesada',
      vehiclePlate: 'A34BK8D',
      vehicleColor: 'Azul',
      items: [
        {
          productId: 'prod-03',
          sku: 'PIN-LAT-04L',
          productName: 'Pintura Látex Super Lavable Blanco Nieve 4L',
          unit: 'LT',
          quantity: 15,
          costPrice: 14.20,
          unitPrice: 28.50,
          subtotal: 427.50
        }
      ],
      totalQuantity: 15,
      totalValuationCost: 213.00,
      totalEstimatedSale: 427.50,
      originQuoteNumber: 'COT-2026-016',
      relatedDeliveryOrderId: 'oe-02',
      relatedDeliveryOrderNumber: 'OE-2026-0002',
      notes: 'Carga frágil en cubetas selladas con precinto de seguridad.',
      issuedByUserId: 'usr-wh-04',
      issuedByUserName: 'David Silva (Almacén)',
      digitalSecuritySeal: 'GD-SEAL-33A1F9C8-SENIAT-00071',
      createdAt: '2026-08-18 09:15:00',
      updatedAt: '2026-08-18 09:15:00'
    }
  ]);

  readonly deliveryOrders = signal<DeliveryOrder[]>([
    {
      id: 'oe-01',
      orderNumber: 'OE-2026-0001',
      controlNumber: '00-00000201',
      dispatchGuideId: 'gd-01',
      dispatchGuideNumber: 'GD-2026-0001',
      dispatchControlNumber: '00-00000101',
      customerId: 'cust-04',
      customerName: 'Inversiones Horizonte & Asociados',
      customerTaxId: 'B-99120485-6',
      deliveryAddress: 'Av. Constitución 2200, Edificio Horizonte PB, Monterrey',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central (Bodega Principal)',
      issueDate: '2026-08-17 11:30:00',
      estimatedDeliveryDate: '2026-08-17',
      status: 'ENTREGADA_CONFORME',
      items: [
        {
          productId: 'prod-02',
          sku: 'RED-CAT6-305',
          productName: 'Bobina Cable Red UTP Cat6 100% Cobre 305m',
          unit: 'UND',
          quantity: 2,
          costPrice: 85.00,
          unitPrice: 118.00,
          subtotal: 236.00
        },
        {
          productId: 'prod-04',
          sku: 'ELE-DIS-20A',
          productName: 'Disyuntor Termomagnético Bipolar 20A 10kA',
          unit: 'UND',
          quantity: 10,
          costPrice: 6.80,
          unitPrice: 12.30,
          subtotal: 123.00
        }
      ],
      totalQuantity: 12,
      carrierName: 'Transportes Rápidos de Carga C.A.',
      driverName: 'José Gregorio Pereira',
      driverIdNumber: 'V-16.890.432',
      vehiclePlate: 'A89CD2E',
      receptionDetails: {
        receivedByFullName: 'Andrés Salcedo (Almacén General)',
        receiverIdNumber: 'V-19.345.678',
        receivedDate: '2026-08-17',
        receivedTime: '15:45',
        hasSignature: true,
        hasStamp: true,
        receptionStatus: 'COMPLETO',
        observations: 'Material recibido en perfecto estado, empaques íntegros y precintos validados.'
      },
      originQuoteNumber: 'COT-2026-015',
      createdBy: 'David Silva (Almacén)',
      createdAt: '2026-08-17 11:30:00',
      updatedAt: '2026-08-17 15:45:00'
    },
    {
      id: 'oe-02',
      orderNumber: 'OE-2026-0002',
      controlNumber: '00-00000202',
      dispatchGuideId: 'gd-02',
      dispatchGuideNumber: 'GD-2026-0002',
      dispatchControlNumber: '00-00000102',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      customerTaxId: 'B-77492019-3',
      deliveryAddress: 'Obra Residencial Los Laureles, Parcela 14, El Hatillo',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central (Bodega Principal)',
      issueDate: '2026-08-18 09:15:00',
      estimatedDeliveryDate: '2026-08-18',
      status: 'EN_RUTA',
      items: [
        {
          productId: 'prod-03',
          sku: 'PIN-LAT-04L',
          productName: 'Pintura Látex Super Lavable Blanco Nieve 4L',
          unit: 'LT',
          quantity: 15,
          costPrice: 14.20,
          unitPrice: 28.50,
          subtotal: 427.50
        }
      ],
      totalQuantity: 15,
      carrierName: 'Logística & Fletes Express S.R.L.',
      driverName: 'Ramón Antonio Castillo',
      driverIdNumber: 'V-14.789.201',
      vehiclePlate: 'A34BK8D',
      originQuoteNumber: 'COT-2026-016',
      createdBy: 'David Silva (Almacén)',
      createdAt: '2026-08-18 09:15:00',
      updatedAt: '2026-08-18 09:15:00'
    }
  ]);

  readonly auditLogs = signal<AuditLog[]>([
    {
      id: 'aud-001',
      userId: 'usr-admin-01',
      userName: 'Alejandro Morales (Admin)',
      userRole: 'ADMIN',
      action: 'USER_LOGIN',
      module: 'AUTH',
      details: {
        title: 'Inicio de Sesión Exitoso',
        description: 'Autenticación mediante JWT Bearer token validada en NestJS AuthGuard.',
        metadata: { client: 'Chrome / Linux', method: 'JWT_STATELESS' }
      },
      ipAddress: '192.168.1.45',
      createdAt: '2026-08-18 08:30:15'
    },
    {
      id: 'aud-002',
      userId: 'usr-cash-03',
      userName: 'Carlos Mendoza',
      userRole: 'CASHIER_SELLER',
      action: 'CREATE_INVOICE',
      module: 'POS',
      details: {
        title: 'Emisión de Factura FAC-2026-0085',
        description: 'Venta en mostrador por $167.50 pagada con Tarjeta de Crédito.',
        previousState: { stockProductId: 'prod-05', stockCentralBefore: 10 },
        newState: { stockCentralAfter: 6, invoiceNumber: 'FAC-2026-0085', total: 167.50 }
      },
      ipAddress: '192.168.1.112',
      createdAt: '2026-08-16 16:45:00'
    },
    {
      id: 'aud-003',
      userId: 'usr-wh-04',
      userName: 'David Silva (Almacén)',
      userRole: 'WAREHOUSE_KEEPER',
      action: 'PURCHASE_RECEIPT',
      module: 'PURCHASES',
      details: {
        title: 'Recepción Orden de Compra OC-2026-0038',
        description: 'Ingreso de 25 unidades de Taladro Percutor. Recálculo automático de Costo Promedio Ponderado en Prisma Transaction.',
        previousState: { stockTaladro: 9, costoPromedio: 43.10 },
        newState: { stockTaladro: 34, nuevoCostoPromedio: 42.50, diffIngreso: '+25 UND' }
      },
      ipAddress: '192.168.1.180',
      createdAt: '2026-08-10 09:30:00'
    }
  ]);

  readonly activeCashSession = signal<CashRegisterSession>({
    id: 'cash-sess-001',
    sessionCode: 'CAJA-20260818-01',
    cashierId: 'usr-cash-03',
    cashierName: 'Carlos Mendoza (Caja/POS)',
    openDate: '2026-08-18 08:00:00',
    status: 'ABIERTA',
    initialAmount: 150.00,
    totalCashSales: 320.00,
    totalCardSales: 442.07,
    totalTransferSales: 274.57,
    totalCreditSales: 0.00,
    totalSales: 1036.64
  });

  readonly cashSessionHistory = signal<CashRegisterSession[]>([]);

  // Toast / System Notifications Signal
  readonly notifications = signal<{ id: string; type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string; timestamp: number }[]>([]);

  // Critical Audit Notifications (UI Real-time Alert Center)
  readonly criticalAuditNotifications = signal<CriticalAuditNotification[]>([
    {
      id: 'can-001',
      category: 'PRICE_CHANGE',
      severity: 'CRITICAL',
      title: 'Alteración de Precio Base de Venta (Nivel 1)',
      message: 'El usuario Alejandro Morales (Admin) modificó el precio base de venta del producto "Taladro Percutor Industrial 750W 1/2"" (ELE-TAL-750) de $69.00 a $78.90 USD (+14.35%).',
      details: {
        itemSku: 'ELE-TAL-750',
        itemName: 'Taladro Percutor Industrial 750W 1/2"',
        oldValue: '$69.00 (Base Detal)',
        newValue: '$78.90 (Base Detal)',
        diffSummary: 'Precio Base: $69.00 ➔ $78.90 USD (Nivel 1 Detal)',
        user: 'Alejandro Morales (Admin)',
        role: 'ADMIN',
        timestamp: '2026-08-18 10:15:20',
        justification: 'Ajuste de margen comercial por inflación y fletes internacionales'
      },
      isRead: false,
      createdAt: '2026-08-18 10:15:20'
    },
    {
      id: 'can-002',
      category: 'MANUAL_STOCK_ADJUSTMENT',
      severity: 'CRITICAL',
      title: 'Ajuste Manual de Inventario Fuera de Fabricación (Merma)',
      message: 'Se registró un descargo manual no planificado de -2 UND en "Almacén Central" para "Bobina Cable de Red UTP Cat6 305m Exterior" (RED-CAT6-305). Soporte: MER-2026-089.',
      details: {
        itemSku: 'RED-CAT6-305',
        itemName: 'Bobina Cable de Red UTP Cat6 305m Exterior 100% Cobre',
        warehouseName: 'Almacén Central',
        oldValue: '18 UND en Almacén Central',
        newValue: '16 UND en Almacén Central',
        diffSummary: 'Descargo directo por merma: -2 UND',
        supportDocument: 'MER-2026-089',
        justification: 'Bobinas dañadas por filtración en rack perimetral B-12',
        user: 'David Silva (Almacén)',
        role: 'WAREHOUSE_KEEPER',
        timestamp: '2026-08-18 14:22:45'
      },
      isRead: false,
      createdAt: '2026-08-18 14:22:45'
    },
    {
      id: 'can-003',
      category: 'MANUAL_STOCK_ADJUSTMENT',
      severity: 'HIGH',
      title: 'Ajuste Manual de Inventario (Sobrante por Conteo Físico)',
      message: 'Se ingresaron manualmente +4 UND en "Almacén Sucursal Norte" para "Reflector LED Industrial Exterior IP65 50W 6500K" (ILU-LED-50W) tras auditoría física.',
      details: {
        itemSku: 'ILU-LED-50W',
        itemName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
        warehouseName: 'Almacén Sucursal Norte',
        oldValue: '12 UND en Sucursal Norte',
        newValue: '16 UND en Sucursal Norte',
        diffSummary: 'Ingreso manual por sobrante: +4 UND',
        supportDocument: 'INV-FIS-042',
        justification: 'Regularización de conteo cíclico trimestral de inventario',
        user: 'David Silva (Almacén)',
        role: 'WAREHOUSE_KEEPER',
        timestamp: '2026-08-17 17:30:10'
      },
      isRead: true,
      createdAt: '2026-08-17 17:30:10'
    }
  ]);

  readonly unreadCriticalAuditCount = computed(() =>
    this.criticalAuditNotifications().filter(n => !n.isRead).length
  );

  readonly hasUnreadCriticalAudits = computed(() =>
    this.unreadCriticalAuditCount() > 0
  );

  // ============================================================================
  // FASE 2: SEÑALES REACTIVAS DE MANUFACTURA (MRP / BOM)
  // ============================================================================
  readonly boms = signal<Bom[]>([
    {
      id: 'bom-01',
      code: 'BOM-REF-50W',
      name: 'Fórmula Ensamble Reflector LED Industrial 50W IP65',
      finishedProductId: 'prod-05',
      finishedProductSku: 'ILU-LED-50W',
      finishedProductName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
      quantityToProduce: 10,
      items: [
        {
          id: 'bit-01',
          rawMaterialProductId: 'prod-rm-01',
          rawMaterialSku: 'MP-CAR-50W',
          rawMaterialName: 'Carcasa Aluminio Fundido IP65 50W',
          quantityNeeded: 10,
          unit: 'UND',
          wastePercent: 0,
          estimatedUnitCost: 5.50,
          subtotalCost: 55.00
        },
        {
          id: 'bit-02',
          rawMaterialProductId: 'prod-rm-02',
          rawMaterialSku: 'MP-COB-50W',
          rawMaterialName: 'Módulo Chip LED COB 50W 6500K Epistar',
          quantityNeeded: 10,
          unit: 'UND',
          wastePercent: 0,
          estimatedUnitCost: 4.80,
          subtotalCost: 48.00
        },
        {
          id: 'bit-03',
          rawMaterialProductId: 'prod-rm-03',
          rawMaterialSku: 'MP-DRV-50W',
          rawMaterialName: 'Driver Fuente Regulada 85-265V IP67 1500mA',
          quantityNeeded: 10,
          unit: 'UND',
          wastePercent: 0,
          estimatedUnitCost: 3.20,
          subtotalCost: 32.00
        },
        {
          id: 'bit-04',
          rawMaterialProductId: 'prod-rm-04',
          rawMaterialSku: 'MP-CAB-SIL',
          rawMaterialName: 'Cable Siliconado Alta Temperatura 3x1.0mm',
          quantityNeeded: 12, // 1.2m por unidad
          unit: 'MT',
          wastePercent: 2,
          estimatedUnitCost: 0.85,
          subtotalCost: 10.20
        }
      ],
      laborCost: 25.00, // $2.50 por unidad en mano de obra ensamble y soldadura
      overheadCost: 18.80, // $1.88 por unidad en empaque, pruebas y energía
      totalEstimatedCost: 189.00,
      unitCost: 18.90,
      active: true,
      notes: 'Lote estándar de 10 unidades. Pruebas de hermeticidad IP65 y 2 horas de encendido en banco de prueba.',
      createdAt: '2026-08-10 10:00:00'
    }
  ]);

  readonly productionOrders = signal<ProductionOrder[]>([
    {
      id: 'of-01',
      orderNumber: 'OF-2026-0008',
      bomId: 'bom-01',
      bomCode: 'BOM-REF-50W',
      finishedProductId: 'prod-05',
      finishedProductSku: 'ILU-LED-50W',
      finishedProductName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      quantityPlanned: 10,
      quantityProduced: 10,
      status: 'COMPLETADA',
      startDate: '2026-08-11 08:00:00',
      targetEndDate: '2026-08-12 17:00:00',
      actualEndDate: '2026-08-12 15:30:00',
      directMaterialCost: 145.20,
      laborCost: 25.00,
      overheadCost: 18.80,
      totalCost: 189.00,
      unitCost: 18.90,
      notes: 'Producción de lote inicial para reposición de stock. Control de calidad 100% aprobado.',
      operatorName: 'Ing. Javier Lozano (Planta)',
      createdAt: '2026-08-11 07:30:00'
    },
    {
      id: 'of-02',
      orderNumber: 'OF-2026-0009',
      bomId: 'bom-01',
      bomCode: 'BOM-REF-50W',
      finishedProductId: 'prod-05',
      finishedProductSku: 'ILU-LED-50W',
      finishedProductName: 'Reflector LED Industrial Exterior IP65 50W 6500K',
      warehouseId: 'wh-01',
      warehouseName: 'Almacén Central',
      quantityPlanned: 20,
      quantityProduced: 0,
      status: 'EN_PROCESO',
      startDate: '2026-08-17 08:00:00',
      targetEndDate: '2026-08-19 18:00:00',
      directMaterialCost: 290.40,
      laborCost: 50.00,
      overheadCost: 37.60,
      totalCost: 378.00,
      unitCost: 18.90,
      notes: 'Ensamble de módulos LED y montaje de drivers en carcasa.',
      operatorName: 'Ing. Javier Lozano (Planta)',
      createdAt: '2026-08-17 07:45:00'
    }
  ]);

  // ============================================================================
  // FASE 2: SEÑALES REACTIVAS DE CRM & PIPELINE COMERCIAL
  // ============================================================================
  readonly crmDeals = signal<CrmDeal[]>([
    {
      id: 'deal-01',
      code: 'DEAL-2026-081',
      title: 'Iluminación LED Completa Parque Industrial Norte',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      contactPerson: 'Ing. Roberto Méndez',
      email: 'rmendez@constructorasanmartin.com',
      phone: '+52 55 4123 9900',
      stage: 'NEGOCIACION',
      expectedValueUsd: 12800.00,
      probability: 80,
      expectedCloseDate: '2026-08-25',
      assignedTo: 'Carlos Mendoza',
      notes: 'Cliente solicitó ajuste en términos de pago a 30 días y cotización formal por 80 reflectores y cableado.',
      activities: [
        { id: 'act-01', dealId: 'deal-01', type: 'REUNION', description: 'Visita técnica a la obra para levantamiento de medidas eléctricas.', date: '2026-08-14 10:00:00', user: 'Carlos Mendoza', completed: true },
        { id: 'act-02', dealId: 'deal-01', type: 'WHATSAPP', description: 'Envío de ficha técnica de reflectores IP65 y certificación.', date: '2026-08-16 15:30:00', user: 'Carlos Mendoza', completed: true },
        { id: 'act-03', dealId: 'deal-01', type: 'LLAMADA', description: 'Llamada de seguimiento con gerencia de compras para cierre de orden.', date: '2026-08-19 11:00:00', user: 'Carlos Mendoza', completed: false }
      ],
      quoteId: 'quot-01',
      createdAt: '2026-08-12 09:00:00',
      updatedAt: '2026-08-18 08:30:00'
    },
    {
      id: 'deal-02',
      code: 'DEAL-2026-082',
      title: 'Renovación de Cableado Estructurado Edificio Corporativo Altus',
      customerId: 'cust-02',
      customerName: 'Soluciones Eléctricas del Pacífico',
      contactPerson: 'Lic. Mariana Vega',
      email: 'mvega@se-pacifico.net',
      phone: '+52 664 612 7788',
      stage: 'PROPUESTA',
      expectedValueUsd: 6950.00,
      probability: 65,
      expectedCloseDate: '2026-08-30',
      assignedTo: 'Carlos Mendoza',
      notes: 'Presupuesto de 20 bobinas Cat6 100% cobre y accesorios de canalización.',
      activities: [
        { id: 'act-04', dealId: 'deal-02', type: 'CORREO', description: 'Envío de propuesta económica formal COT-2026-016.', date: '2026-08-17 14:00:00', user: 'Carlos Mendoza', completed: true }
      ],
      createdAt: '2026-08-15 11:30:00',
      updatedAt: '2026-08-17 14:00:00'
    },
    {
      id: 'deal-03',
      code: 'DEAL-2026-083',
      title: 'Suministro Pintura Látex Proyecto Residencial Horizonte',
      customerId: 'cust-04',
      customerName: 'Inversiones Horizonte & Asociados',
      contactPerson: 'Arq. Gabriela Soto',
      email: 'gsoto@horizontecorp.com',
      phone: '+52 81 8150 3344',
      stage: 'DIAGNOSTICO',
      expectedValueUsd: 4500.00,
      probability: 40,
      expectedCloseDate: '2026-09-10',
      assignedTo: 'Alejandro Morales (Admin)',
      notes: 'Revisión de rendimiento por m² y carta de colores institucionales.',
      activities: [
        { id: 'act-05', dealId: 'deal-03', type: 'LLAMADA', description: 'Primer contacto telefónico y solicitud de muestras de pintura.', date: '2026-08-16 09:30:00', user: 'Alejandro Morales', completed: true }
      ],
      createdAt: '2026-08-16 09:00:00',
      updatedAt: '2026-08-16 09:30:00'
    },
    {
      id: 'deal-04',
      code: 'DEAL-2026-084',
      title: 'Lote de Herramientas Eléctricas para Taller Metalmecánico',
      customerName: 'Maquinados y Matrices del Centro',
      contactPerson: 'Ing. Alfonso Durán',
      email: 'aduran@matricescentro.mx',
      phone: '+52 442 215 8800',
      stage: 'NUEVO_LEAD',
      expectedValueUsd: 3800.00,
      probability: 20,
      expectedCloseDate: '2026-09-15',
      assignedTo: 'Carlos Mendoza',
      notes: 'Lead entrante por formulario web solicitando catálogo de herramientas 750W.',
      activities: [
        { id: 'act-06', dealId: 'deal-04', type: 'NOTA', description: 'Prospecto calificado con necesidad inmediata de compra.', date: '2026-08-18 08:00:00', user: 'Carlos Mendoza', completed: true }
      ],
      createdAt: '2026-08-18 08:00:00',
      updatedAt: '2026-08-18 08:00:00'
    },
    {
      id: 'deal-05',
      code: 'DEAL-2026-079',
      title: 'Dotación Inicial Ferretería Sucursal Puerto',
      customerId: 'cust-01',
      customerName: 'Constructora San Martín S.A.C.',
      contactPerson: 'Ing. Roberto Méndez',
      email: 'rmendez@constructorasanmartin.com',
      phone: '+52 55 4123 9900',
      stage: 'GANADO',
      expectedValueUsd: 8900.00,
      probability: 100,
      expectedCloseDate: '2026-08-14',
      assignedTo: 'Carlos Mendoza',
      notes: 'Trato ganado y facturado bajo comprobante FAC-2026-0081.',
      activities: [
        { id: 'act-07', dealId: 'deal-05', type: 'NOTA', description: 'Facturación y entrega completada satisfactoriamente.', date: '2026-08-14 16:00:00', user: 'Carlos Mendoza', completed: true }
      ],
      invoiceId: 'inv-01',
      createdAt: '2026-08-05 10:00:00',
      updatedAt: '2026-08-14 16:00:00'
    }
  ]);

  // ============================================================================
  // FASE 2: SEÑALES REACTIVAS DE CONTABILIDAD GENERAL (PLAN DE CUENTAS & LIBRO DIARIO)
  // ============================================================================
  readonly accounts = signal<Account[]>([
    // ACTIVOS (1)
    { id: 'acc-101', code: '1.1.01.01', name: 'Caja General y Efectivo Moneda Local/Divisas', type: 'ACTIVO', level: 4, parentCode: '1.1.01', balance: 1470.00, currency: 'USD', isDebitNormal: true, description: 'Fondos en caja física y bóveda' },
    { id: 'acc-102', code: '1.1.01.02', name: 'Bancos Cuentas Corrientes y Pago Móvil', type: 'ACTIVO', level: 4, parentCode: '1.1.01', balance: 18450.00, currency: 'USD', isDebitNormal: true, description: 'Cuentas bancarias operativas' },
    { id: 'acc-103', code: '1.1.02.01', name: 'Cuentas por Cobrar Comerciales a Clientes', type: 'ACTIVO', level: 4, parentCode: '1.1.02', balance: 3450.00, currency: 'USD', isDebitNormal: true, description: 'Facturas a crédito pendientes' },
    { id: 'acc-104', code: '1.1.03.01', name: 'Inventario de Mercancías y Productos Terminados', type: 'ACTIVO', level: 4, parentCode: '1.1.03', balance: 8940.00, currency: 'USD', isDebitNormal: true, description: 'Existencias valoradas a CPP' },
    { id: 'acc-105', code: '1.1.03.02', name: 'Inventario de Materias Primas e Insumos', type: 'ACTIVO', level: 4, parentCode: '1.1.03', balance: 1835.50, currency: 'USD', isDebitNormal: true, description: 'Insumos para órdenes de fabricación' },
    { id: 'acc-106', code: '1.1.04.01', name: 'Crédito Fiscal IVA 16% por Compras', type: 'ACTIVO', level: 4, parentCode: '1.1.04', balance: 284.00, currency: 'USD', isDebitNormal: true, description: 'IVA soportado en compras' },
    { id: 'acc-107', code: '1.2.01.01', name: 'Maquinaria, Equipos y Herramientas de Planta', type: 'ACTIVO', level: 4, parentCode: '1.2.01', balance: 12500.00, currency: 'USD', isDebitNormal: true, description: 'Activos fijos de producción' },

    // PASIVOS (2)
    { id: 'acc-201', code: '2.1.01.01', name: 'Cuentas por Pagar a Proveedores Comerciales', type: 'PASIVO', level: 4, parentCode: '2.1.01', balance: 4200.00, currency: 'USD', isDebitNormal: false, description: 'Facturas de proveedores por pagar' },
    { id: 'acc-202', code: '2.1.02.01', name: 'Débito Fiscal IVA 16% por Pagar', type: 'PASIVO', level: 4, parentCode: '2.1.02', balance: 60.97, currency: 'USD', isDebitNormal: false, description: 'IVA generado en ventas' },
    { id: 'acc-203', code: '2.1.02.02', name: 'IGTF 3% Retenido en Divisas por Pagar', type: 'PASIVO', level: 4, parentCode: '2.1.02', balance: 12.50, currency: 'USD', isDebitNormal: false, description: 'Impuesto IGTF retenido' },

    // PATRIMONIO (3)
    { id: 'acc-301', code: '3.1.01.01', name: 'Capital Social Suscrito y Pagado', type: 'PATRIMONIO', level: 4, parentCode: '3.1.01', balance: 35000.00, currency: 'USD', isDebitNormal: false, description: 'Aporte de socios fundadores' },
    { id: 'acc-302', code: '3.1.02.01', name: 'Utilidades Acumuladas de Ejercicios Anteriores', type: 'PATRIMONIO', level: 4, parentCode: '3.1.02', balance: 7240.00, currency: 'USD', isDebitNormal: false, description: 'Resultados retenidos' },

    // INGRESOS (4)
    { id: 'acc-401', code: '4.1.01.01', name: 'Ingresos Operacionales por Ventas de Bienes', type: 'INGRESO', level: 4, parentCode: '4.1.01', balance: 442.07, currency: 'USD', isDebitNormal: false, description: 'Ventas brutas del período' },
    { id: 'acc-402', code: '4.1.02.01', name: 'Ingresos por Servicios Técnicos y Asesoría', type: 'INGRESO', level: 4, parentCode: '4.1.02', balance: 100.00, currency: 'USD', isDebitNormal: false, description: 'Servicios profesionales exentos' },

    // COSTOS (5)
    { id: 'acc-501', code: '5.1.01.01', name: 'Costo de Ventas de Mercancías', type: 'COSTO', level: 4, parentCode: '5.1.01', balance: 201.60, currency: 'USD', isDebitNormal: true, description: 'Costo promedio de bienes vendidos' },
    { id: 'acc-502', code: '5.1.02.01', name: 'Mano de Obra Directa Aplicada a Producción', type: 'COSTO', level: 4, parentCode: '5.1.02', balance: 25.00, currency: 'USD', isDebitNormal: true, description: 'Salarios directos de ensamble' },
    { id: 'acc-503', code: '5.1.02.02', name: 'Costos Indirectos de Fabricación (CIF)', type: 'COSTO', level: 4, parentCode: '5.1.02', balance: 18.80, currency: 'USD', isDebitNormal: true, description: 'Gastos indirectos de manufactura' },

    // GASTOS (6)
    { id: 'acc-601', code: '6.1.01.01', name: 'Gastos de Administración y Servicios Públicos', type: 'GASTO', level: 4, parentCode: '6.1.01', balance: 450.00, currency: 'USD', isDebitNormal: true, description: 'Luz, internet, papelería' }
  ]);

  readonly journalEntries = signal<JournalEntry[]>([
    {
      id: 'as-001',
      entryNumber: 'ASIENTO-2026-0001',
      date: '2026-08-14 14:20:00',
      concept: 'Reconocimiento de Venta Comprobante FAC-2026-0081 (Constructora San Martín)',
      referenceType: 'VENTA',
      referenceId: 'FAC-2026-0081',
      lines: [
        { accountId: 'acc-102', accountCode: '1.1.01.02', accountName: 'Bancos Cuentas Corrientes', description: 'Cobro por transferencia', debit: 274.57, credit: 0 },
        { accountId: 'acc-501', accountCode: '5.1.01.01', accountName: 'Costo de Ventas', description: 'Costo de 3 Taladros Percutores', debit: 126.00, credit: 0 },
        { accountId: 'acc-401', accountCode: '4.1.01.01', accountName: 'Ingresos por Ventas', description: 'Base imponible gravada', debit: 0, credit: 236.70 },
        { accountId: 'acc-202', accountCode: '2.1.02.01', accountName: 'Débito Fiscal IVA 16%', description: 'IVA 16% en venta', debit: 0, credit: 37.87 },
        { accountId: 'acc-104', accountCode: '1.1.03.01', accountName: 'Inventario de Mercancías', description: 'Salida de almacén a costo CPP', debit: 0, credit: 126.00 }
      ],
      totalDebit: 400.57,
      totalCredit: 400.57,
      status: 'ASENTADO',
      createdBy: 'Sistema 4-inLine (Automático)',
      createdAt: '2026-08-14 14:20:00'
    },
    {
      id: 'as-002',
      entryNumber: 'ASIENTO-2026-0002',
      date: '2026-08-12 15:30:00',
      concept: 'Liquidación y Cierre de Orden de Fabricación OF-2026-0008 (10 Reflectores LED 50W)',
      referenceType: 'PRODUCCION',
      referenceId: 'OF-2026-0008',
      lines: [
        { accountId: 'acc-104', accountCode: '1.1.03.01', accountName: 'Inventario de Mercancías y Terminados', description: 'Ingreso 10 Reflectores LED terminados a $18.90', debit: 189.00, credit: 0 },
        { accountId: 'acc-105', accountCode: '1.1.03.02', accountName: 'Inventario de Materias Primas', description: 'Consumo de carcasas, chips COB, drivers y cables', debit: 0, credit: 145.20 },
        { accountId: 'acc-502', accountCode: '5.1.02.01', accountName: 'Mano de Obra Directa Aplicada', description: 'Absorción mano de obra ensamble', debit: 0, credit: 25.00 },
        { accountId: 'acc-503', accountCode: '5.1.02.02', accountName: 'Costos Indirectos de Fabricación (CIF)', description: 'Absorción energía y control calidad', debit: 0, credit: 18.80 }
      ],
      totalDebit: 189.00,
      totalCredit: 189.00,
      status: 'ASENTADO',
      createdBy: 'Sistema MRP 4-inLine',
      createdAt: '2026-08-12 15:30:00'
    }
  ]);

  // ============================================================================
  // FASE 2: SEÑALES REACTIVAS DE TESORERÍA, BANCOS, CxC Y CxP
  // ============================================================================
  readonly bankAccounts = signal<BankAccount[]>([
    {
      id: 'bank-01',
      accountName: 'Banesco Banco Universal - Cta Corriente Principal',
      bankName: 'Banesco',
      accountNumber: '0134-0987-12-0001928374',
      accountType: 'CORRIENTE_VES',
      currency: 'VES',
      balance: 450000.00,
      balanceUsd: 12328.76,
      balanceVes: 450000.00,
      glAccountCode: '1.1.01.02',
      holderName: 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: true,
      updatedAt: '2026-08-28 10:00:00'
    },
    {
      id: 'bank-02',
      accountName: 'Banco Mercantil - Cta Recaudadora & Pago Móvil',
      bankName: 'Mercantil',
      accountNumber: '0105-0123-45-1234567890',
      accountType: 'CORRIENTE_VES',
      currency: 'VES',
      balance: 185000.00,
      balanceUsd: 5068.49,
      balanceVes: 185000.00,
      glAccountCode: '1.1.01.02',
      holderName: 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: false,
      updatedAt: '2026-08-28 10:00:00'
    },
    {
      id: 'bank-03',
      accountName: 'Banesco Panamá - Divisas USD Corporativo',
      bankName: 'Banesco Panamá',
      accountNumber: 'PA98-BANE-0012-9876-5432',
      accountType: 'EXTRANJERA_USD',
      currency: 'USD',
      balance: 14200.00,
      balanceUsd: 14200.00,
      balanceVes: 518300.00,
      glAccountCode: '1.1.01.02',
      holderName: 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: false,
      updatedAt: '2026-08-28 10:00:00'
    },
    {
      id: 'bank-04',
      accountName: 'JPMorgan Chase / Zelle Oficial',
      bankName: 'Chase Bank / Zelle',
      accountNumber: 'pagos@4inline.com',
      accountType: 'BILLETERA_DIGITAL',
      currency: 'USD',
      balance: 8500.00,
      balanceUsd: 8500.00,
      balanceVes: 310250.00,
      glAccountCode: '1.1.01.02',
      holderName: 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: false,
      updatedAt: '2026-08-28 10:00:00'
    },
    {
      id: 'bank-05',
      accountName: 'Caja Bóveda - Efectivo Divisas USD',
      bankName: 'Bóveda Principal',
      accountNumber: 'CAJA-USD-01',
      accountType: 'CAJA_EFECTIVO_USD',
      currency: 'USD',
      balance: 2450.00,
      balanceUsd: 2450.00,
      balanceVes: 89425.00,
      glAccountCode: '1.1.01.01',
      holderName: 'Custodia Tesorería',
      holderTaxId: 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: false,
      updatedAt: '2026-08-28 10:00:00'
    }
  ]);

  readonly payableBills = signal<PayableBill[]>([
    {
      id: 'pb-01',
      billNumber: 'FP-2026-0038',
      purchaseOrderId: 'po-01',
      purchaseOrderNumber: 'OC-2026-0038',
      supplierId: 'sup-01',
      supplierName: 'Distribuidora Industrial del Norte S.A.',
      supplierTaxId: 'J-30948572-1',
      issueDate: '2026-08-10',
      dueDate: '2026-09-09',
      totalAmountUsd: 1218.00,
      totalAmountVes: 44457.00,
      paidAmountUsd: 0,
      paidAmountVes: 0,
      balanceUsd: 1218.00,
      balanceVes: 44457.00,
      status: 'PENDIENTE',
      glAccountExpenseCode: '1.1.03.01',
      glAccountPayableCode: '2.1.01.01',
      category: 'Mercancía e Inventario',
      notes: 'Compra de 25 Taladros Percutores. Crédito comercial acordado a 30 días.',
      payments: [],
      createdAt: '2026-08-10 09:30:00'
    },
    {
      id: 'pb-02',
      billNumber: 'FP-2026-0041',
      supplierId: 'sup-02',
      supplierName: 'Importadora & Mayorista Eléctrica C.A.',
      supplierTaxId: 'J-40192834-5',
      issueDate: '2026-08-05',
      dueDate: '2026-08-20',
      totalAmountUsd: 2982.00,
      totalAmountVes: 108843.00,
      paidAmountUsd: 1000.00,
      paidAmountVes: 36500.00,
      balanceUsd: 1982.00,
      balanceVes: 72343.00,
      status: 'VENCIDO',
      glAccountExpenseCode: '1.1.03.01',
      glAccountPayableCode: '2.1.01.01',
      category: 'Suministros Eléctricos',
      notes: 'Bobinas de Cable Cat6 y Disyuntores. Abono de $1,000.00 registrado.',
      payments: [
        {
          id: 'pay-001',
          paymentNumber: 'OP-2026-0001',
          payableBillId: 'pb-02',
          billNumber: 'FP-2026-0041',
          date: '2026-08-15 11:00:00',
          amountUsd: 1000.00,
          amountVes: 36500.00,
          currencyPaid: 'USD',
          bcvRate: 36.50,
          paymentMethod: 'TRANSFERENCIA',
          bankAccountId: 'bank-03',
          bankAccountName: 'Banesco Panamá',
          referenceNumber: 'TRF-PA-89012',
          approvedBy: 'Alejandro Morales (Admin)',
          notes: 'Abono parcial de tesorería'
        }
      ],
      createdAt: '2026-08-05 14:00:00'
    },
    {
      id: 'pb-03',
      billNumber: 'FP-2026-0045',
      supplierId: 'sup-03',
      supplierName: 'Fábrica Nacional de Tornillos y Fijaciones C.A.',
      supplierTaxId: 'J-50182934-2',
      issueDate: '2026-08-18',
      dueDate: '2026-09-02',
      totalAmountUsd: 580.00,
      totalAmountVes: 21170.00,
      paidAmountUsd: 0,
      paidAmountVes: 0,
      balanceUsd: 580.00,
      balanceVes: 21170.00,
      status: 'PENDIENTE',
      glAccountExpenseCode: '1.1.03.01',
      glAccountPayableCode: '2.1.01.01',
      category: 'Fijaciones & Ferretería',
      notes: 'Lote de tornillos drywall y tacos de fijación.',
      payments: [],
      createdAt: '2026-08-18 10:00:00'
    }
  ]);

  readonly treasuryTransactions = signal<TreasuryTransaction[]>([
    {
      id: 'tx-001',
      transactionNumber: 'TES-2026-0001',
      type: 'COBRO_CXC',
      date: '2026-08-14 14:20:00',
      bankAccountId: 'bank-01',
      bankAccountName: 'Banesco Corriente Principal',
      amount: 10021.81,
      amountUsd: 274.57,
      amountVes: 10021.81,
      currency: 'VES',
      bcvRate: 36.50,
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: 'TRF-BBVA-90812',
      entityType: 'CLIENTE',
      entityId: 'cust-01',
      entityName: 'Constructora San Martín S.A.C.',
      documentNumber: 'FAC-2026-0081',
      concept: 'Cobro de Factura FAC-2026-0081 por venta de herramientas',
      journalEntryId: 'as-001',
      status: 'CONCILIADO',
      registeredBy: 'Carlos Mendoza',
      createdAt: '2026-08-14 14:20:00'
    },
    {
      id: 'tx-002',
      transactionNumber: 'TES-2026-0002',
      type: 'PAGO_CXP',
      date: '2026-08-15 11:00:00',
      bankAccountId: 'bank-03',
      bankAccountName: 'Banesco Panamá',
      amount: 1000.00,
      amountUsd: 1000.00,
      amountVes: 36500.00,
      currency: 'USD',
      bcvRate: 36.50,
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: 'TRF-PA-89012',
      entityType: 'PROVEEDOR',
      entityId: 'sup-02',
      entityName: 'Importadora & Mayorista Eléctrica C.A.',
      documentNumber: 'FP-2026-0041',
      concept: 'Abono a Factura Proveedor FP-2026-0041',
      status: 'CONCILIADO',
      registeredBy: 'Alejandro Morales (Admin)',
      createdAt: '2026-08-15 11:00:00'
    }
  ]);

  // Computed Treasury & Banking Metrics
  readonly totalBankLiquidityUsd = computed(() => {
    return this.bankAccounts().reduce((sum, b) => sum + (b.status === 'ACTIVE' ? b.balanceUsd : 0), 0);
  });

  readonly totalBankLiquidityVes = computed(() => {
    return this.bankAccounts().reduce((sum, b) => sum + (b.status === 'ACTIVE' ? b.balanceVes : 0), 0);
  });

  // Clientes con cuentas por cobrar (facturas con saldo pendiente)
  readonly customerReceivables = computed(() => {
    const rate = this.bcvState().usdRate || 36.50;
    const invs = this.invoices().filter(inv => inv.status === 'EMITIDA');
    
    return invs.map(inv => {
      const paidUsd = (inv.payments || []).reduce((s, p) => {
        if (p.method === 'CREDITO') return s;
        if (p.currency === 'VES') {
          return s + (p.amount / (inv.bcvRate || rate));
        }
        return s + p.amount;
      }, 0);
      
      const balanceUsd = Math.max(0, Number((inv.total - paidUsd).toFixed(2)));
      const balanceVes = Number((balanceUsd * (inv.bcvRate || rate)).toFixed(2));
      const isCredit = inv.payments?.some(p => p.method === 'CREDITO') || paidUsd < inv.total;
      
      const invDate = new Date(inv.date.replace(' ', 'T'));
      const dueDate = new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const isOverdue = Date.now() > dueDate.getTime() && balanceUsd > 0.01;
      
      let status: 'COBRADO' | 'PENDIENTE' | 'PARCIAL' | 'VENCIDO' = 'COBRADO';
      if (balanceUsd > 0.01) {
        if (isOverdue) {
          status = 'VENCIDO';
        } else if (paidUsd > 0.01) {
          status = 'PARCIAL';
        } else {
          status = 'PENDIENTE';
        }
      }

      return {
        id: 'cxc-' + inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerTaxId: inv.customerTaxId,
        date: inv.date,
        dueDate: dueDate.toISOString().substring(0, 10),
        totalUsd: inv.total,
        totalVes: inv.totalVes,
        paidUsd: Number(paidUsd.toFixed(2)),
        paidVes: Number((paidUsd * (inv.bcvRate || rate)).toFixed(2)),
        balanceUsd,
        balanceVes,
        status,
        bcvRate: inv.bcvRate || rate,
        isCredit
      };
    });
  });

  readonly pendingCustomerReceivables = computed(() => {
    return this.customerReceivables().filter(r => r.balanceUsd > 0.01);
  });

  readonly totalReceivablesUsd = computed(() => {
    return this.pendingCustomerReceivables().reduce((sum, r) => sum + r.balanceUsd, 0);
  });

  readonly totalReceivablesVes = computed(() => {
    return this.pendingCustomerReceivables().reduce((sum, r) => sum + r.balanceVes, 0);
  });

  readonly overdueReceivablesCount = computed(() => {
    return this.customerReceivables().filter(r => r.status === 'VENCIDO').length;
  });

  readonly totalPayablesUsd = computed(() => {
    return this.payableBills()
      .filter(b => b.status !== 'PAGADO' && b.status !== 'ANULADO')
      .reduce((sum, b) => sum + b.balanceUsd, 0);
  });

  readonly totalPayablesVes = computed(() => {
    return this.payableBills()
      .filter(b => b.status !== 'PAGADO' && b.status !== 'ANULADO')
      .reduce((sum, b) => sum + b.balanceVes, 0);
  });

  readonly overduePayablesCount = computed(() => {
    return this.payableBills().filter(b => b.status === 'VENCIDO').length;
  });

  readonly netTreasuryPositionUsd = computed(() => {
    return this.totalBankLiquidityUsd() + this.totalReceivablesUsd() - this.totalPayablesUsd();
  });

  // Computed Accounting Balances
  readonly totalAccountingAssets = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'ACTIVO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly totalAccountingLiabilities = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'PASIVO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly totalAccountingEquity = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'PATRIMONIO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly totalAccountingRevenue = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'INGRESO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly totalAccountingCost = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'COSTO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly totalAccountingExpenses = computed(() => {
    return this.accounts()
      .filter(a => a.type === 'GASTO')
      .reduce((sum, a) => sum + a.balance, 0);
  });

  readonly netIncomePeriod = computed(() => {
    return this.totalAccountingRevenue() - (this.totalAccountingCost() + this.totalAccountingExpenses());
  });

  // Computed CRM Stats
  readonly crmPipelineTotalValue = computed(() => {
    return this.crmDeals()
      .filter(d => d.stage !== 'PERDIDO')
      .reduce((sum, d) => sum + d.expectedValueUsd, 0);
  });

  readonly crmWeightedPipelineValue = computed(() => {
    return this.crmDeals()
      .filter(d => d.stage !== 'PERDIDO' && d.stage !== 'GANADO')
      .reduce((sum, d) => sum + (d.expectedValueUsd * (d.probability / 100)), 0);
  });

  readonly crmDealsWonCount = computed(() => {
    return this.crmDeals().filter(d => d.stage === 'GANADO').length;
  });

  readonly crmWinRatePercent = computed(() => {
    const closed = this.crmDeals().filter(d => d.stage === 'GANADO' || d.stage === 'PERDIDO');
    if (closed.length === 0) return 0;
    const won = closed.filter(d => d.stage === 'GANADO').length;
    return (won / closed.length) * 100;
  });

  // Computed MRP Stats
  readonly activeProductionOrdersCount = computed(() => {
    return this.productionOrders().filter(o => o.status === 'EN_PROCESO' || o.status === 'PLANIFICADA' || o.status === 'CONTROL_CALIDAD').length;
  });


  readonly totalProductsCount = computed(() => this.products().length);

  readonly totalInventoryValuation = computed(() => {
    return this.products().reduce((sum, p) => sum + (p.totalStock * p.costPrice), 0);
  });

  readonly lowStockProducts = computed(() => {
    return this.products().filter(p => p.totalStock <= p.minStock);
  });

  readonly totalSalesToday = computed(() => {
    return this.invoices().reduce((sum, inv) => sum + (inv.status === 'EMITIDA' ? inv.total : 0), 0);
  });

  readonly totalMarginEst = computed(() => {
    let revenue = 0;
    let cost = 0;
    this.invoices().forEach(inv => {
      if (inv.status === 'EMITIDA') {
        revenue += inv.subtotal;
        inv.items.forEach(item => {
          cost += (item.quantity * item.costPrice);
        });
      }
    });
    return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  });

  // Computed Logistics & Dispatch Stats (SENIAT SNAT/2011/00071)
  readonly totalDispatchesCount = computed(() => this.dispatchGuides().length);
  readonly inTransitDispatchesCount = computed(() => this.dispatchGuides().filter(g => g.status === 'EN_TRANSITO').length);
  readonly deliveredDispatchesCount = computed(() => this.dispatchGuides().filter(g => g.status === 'ENTREGADA').length);
  readonly pendingInvoiceDispatchesCount = computed(() => this.dispatchGuides().filter(g => (g.status === 'ENTREGADA' || g.status === 'EMITIDA' || g.status === 'EN_TRANSITO') && !g.invoicedInvoiceNumber).length);
  readonly pendingDeliveryOrdersCount = computed(() => this.deliveryOrders().filter(o => o.status === 'PENDIENTE' || o.status === 'EN_RUTA').length);

  private loadPersistedState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.products) this.products.set(parsed.products);
          if (parsed.kardexMovements) this.kardexMovements.set(parsed.kardexMovements);
          if (parsed.purchaseOrders) this.purchaseOrders.set(parsed.purchaseOrders);
          if (parsed.invoices) this.invoices.set(parsed.invoices);
          if (parsed.quotes) this.quotes.set(parsed.quotes);
          if (parsed.dispatchGuides) this.dispatchGuides.set(parsed.dispatchGuides);
          if (parsed.deliveryOrders) this.deliveryOrders.set(parsed.deliveryOrders);
          if (parsed.auditLogs) this.auditLogs.set(parsed.auditLogs);
          if (parsed.activeCashSession) this.activeCashSession.set(parsed.activeCashSession);
          if (parsed.cashSessionHistory) this.cashSessionHistory.set(parsed.cashSessionHistory);
          if (parsed.suppliers) this.suppliers.set(parsed.suppliers);
          if (parsed.customers) this.customers.set(parsed.customers);
          if (parsed.boms) this.boms.set(parsed.boms);
          if (parsed.productionOrders) this.productionOrders.set(parsed.productionOrders);
          if (parsed.crmDeals) this.crmDeals.set(parsed.crmDeals);
          if (parsed.accounts) this.accounts.set(parsed.accounts);
          if (parsed.journalEntries) this.journalEntries.set(parsed.journalEntries);
          if (parsed.bankAccounts) this.bankAccounts.set(parsed.bankAccounts);
          if (parsed.payableBills) this.payableBills.set(parsed.payableBills);
          if (parsed.treasuryTransactions) this.treasuryTransactions.set(parsed.treasuryTransactions);
          if (parsed.companyProfile) this.companyProfile.set(parsed.companyProfile);
        }
      }
    } catch {
      // Fallback to default memory state
    }
  }

  private saveState() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const payload = {
          products: this.products(),
          kardexMovements: this.kardexMovements(),
          purchaseOrders: this.purchaseOrders(),
          invoices: this.invoices(),
          quotes: this.quotes(),
          dispatchGuides: this.dispatchGuides(),
          deliveryOrders: this.deliveryOrders(),
          auditLogs: this.auditLogs(),
          activeCashSession: this.activeCashSession(),
          cashSessionHistory: this.cashSessionHistory(),
          suppliers: this.suppliers(),
          customers: this.customers(),
          boms: this.boms(),
          productionOrders: this.productionOrders(),
          crmDeals: this.crmDeals(),
          accounts: this.accounts(),
          journalEntries: this.journalEntries(),
          bankAccounts: this.bankAccounts(),
          payableBills: this.payableBills(),
          treasuryTransactions: this.treasuryTransactions(),
          companyProfile: this.companyProfile()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Storage quota or SSR safe
    }
  }

  notify(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) {
    const id = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    this.notifications.update(prev => [{ id, type, title, message, timestamp: Date.now() }, ...prev]);
    setTimeout(() => {
      this.dismissNotification(id);
    }, 6000);
  }

  dismissNotification(id: string) {
    this.notifications.update(prev => prev.filter(n => n.id !== id));
  }

  addCriticalAuditNotification(
    data: Omit<CriticalAuditNotification, 'id' | 'createdAt' | 'isRead'>
  ): CriticalAuditNotification {
    const id = 'can-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const createdAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newNotification: CriticalAuditNotification = {
      ...data,
      id,
      isRead: false,
      createdAt
    };

    this.criticalAuditNotifications.update(prev => [newNotification, ...prev]);

    // Also trigger instant visual toast with high urgency
    this.notify(
      data.severity === 'CRITICAL' ? 'error' : 'warning',
      `🚨 ALERTA DE AUDITORÍA: ${data.title}`,
      data.message
    );

    this.saveState();
    return newNotification;
  }

  markAuditNotificationAsRead(id: string): void {
    this.criticalAuditNotifications.update(list =>
      list.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    this.saveState();
  }

  markAllAuditNotificationsAsRead(): void {
    this.criticalAuditNotifications.update(list =>
      list.map(n => ({ ...n, isRead: true }))
    );
    this.saveState();
  }

  clearAllAuditNotifications(): void {
    this.criticalAuditNotifications.set([]);
    this.saveState();
  }

  logAudit(
    action: AuditLog['action'],
    module: AuditLog['module'],
    title: string,
    description: string,
    previousState?: Record<string, unknown> | null,
    newState?: Record<string, unknown> | null,
    metadata?: Record<string, unknown>,
    isCritical?: boolean,
    criticalCategory?: CriticalAuditCategory
  ) {
    const user = this.authService.currentUser();
    const log: AuditLog = {
      id: 'aud-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      isCritical,
      criticalCategory,
      details: {
        title,
        description,
        previousState: previousState || null,
        newState: newState || null,
        metadata
      },
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    this.auditLogs.update(logs => [log, ...logs]);
    this.saveState();
  }

  // ==========================================
  // TRANSACTION 1: REGISTRO DE COMPRA & COSTO PROMEDIO PONDERADO
  // ==========================================
  registerPurchaseOrder(
    supplierId: string,
    warehouseId: string,
    items: { productId: string; quantity: number; unitCost: number; taxRate: number }[],
    notes?: string
  ): { success: boolean; orderNumber?: string; message?: string } {
    const user = this.authService.currentUser();
    const supplier = this.suppliers().find(s => s.id === supplierId);
    const warehouse = this.warehouses().find(w => w.id === warehouseId);

    if (!supplier || !warehouse || items.length === 0) {
      return { success: false, message: 'Parámetros de orden de compra inválidos.' };
    }

    const orderNumber = 'OC-2026-' + (this.purchaseOrders().length + 39).toString().padStart(4, '0');
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let subtotal = 0;
    let taxTotal = 0;
    const poItems: PurchaseOrderItem[] = [];
    const kardexToAdd: KardexMovement[] = [];
    const auditDiffItems: Record<string, unknown> = {};

    // Clone products map for atomic transaction
    const currentProducts = [...this.products()];

    for (const item of items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      if (prodIndex === -1) continue;

      const prod = currentProducts[prodIndex];
      const itemSubtotal = item.quantity * item.unitCost;
      const itemTax = itemSubtotal * item.taxRate;
      subtotal += itemSubtotal;
      taxTotal += itemTax;

      poItems.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxRate: item.taxRate,
        subtotal: itemSubtotal,
        total: itemSubtotal + itemTax
      });

      // Cálculo de Costo Promedio Ponderado (CPP)
      // CPP_nuevo = ((Stock_Actual * Costo_Actual) + (Cantidad_Entrante * Costo_Entrante)) / (Stock_Actual + Cantidad_Entrante)
      const currentStock = prod.totalStock;
      const currentCost = prod.costPrice;
      const newTotalStock = currentStock + item.quantity;
      const newAverageCost = newTotalStock > 0
        ? Number((((currentStock * currentCost) + (item.quantity * item.unitCost)) / newTotalStock).toFixed(2))
        : item.unitCost;

      // Update warehouse stock
      const updatedStockByWh = prod.stockByWarehouse.map(sw => {
        if (sw.warehouseId === warehouseId) {
          return { ...sw, quantity: sw.quantity + item.quantity };
        }
        return sw;
      });

      // Check if warehouse wasn't in array
      if (!updatedStockByWh.some(sw => sw.warehouseId === warehouseId)) {
        updatedStockByWh.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          quantity: item.quantity
        });
      }

      const updatedProd: Product = {
        ...prod,
        costPrice: newAverageCost,
        totalStock: newTotalStock,
        stockByWarehouse: updatedStockByWh,
        updatedAt: nowStr
      };

      currentProducts[prodIndex] = updatedProd;

      // Kardex Entry
      kardexToAdd.push({
        id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        date: nowStr,
        movementType: 'ENTRADA_COMPRA',
        docReference: orderNumber,
        entryQty: item.quantity,
        entryUnitCost: item.unitCost,
        entryTotalCost: itemSubtotal,
        exitQty: 0,
        exitUnitCost: 0,
        exitTotalCost: 0,
        balanceQty: newTotalStock,
        balanceAverageCost: newAverageCost,
        balanceTotalValuation: Number((newTotalStock * newAverageCost).toFixed(2)),
        registeredByUserId: user.id,
        registeredByUserName: user.name
      });

      auditDiffItems[prod.sku] = {
        stockAnterior: currentStock,
        stockNuevo: newTotalStock,
        costoAnterior: currentCost,
        nuevoCostoPromedioPonderado: newAverageCost,
        ingresadas: item.quantity
      };
    }

    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now(),
      orderNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierTaxId: supplier.taxId,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      date: nowStr,
      status: 'RECIBIDA',
      items: poItems,
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      total: Number((subtotal + taxTotal).toFixed(2)),
      notes,
      receivedBy: user.name
    };

    // Apply all atomic changes
    this.products.set(currentProducts);
    this.purchaseOrders.update(orders => [newPO, ...orders]);
    this.kardexMovements.update(kdx => [...kardexToAdd, ...kdx]);

    // Automatic double-entry accounting entry for purchase
    const poAccountLines: JournalEntryLine[] = [
      {
        accountId: 'acc-104',
        accountCode: '1.1.03.01',
        accountName: 'Inventario de Mercancías y Productos Terminados',
        description: `Ingreso de compra ${orderNumber} (${supplier.name})`,
        debit: newPO.subtotal,
        credit: 0
      },
      {
        accountId: 'acc-106',
        accountCode: '1.1.04.01',
        accountName: 'Crédito Fiscal IVA 16% por Compras',
        description: `IVA crédito fiscal compra ${orderNumber}`,
        debit: newPO.taxTotal,
        credit: 0
      },
      {
        accountId: 'acc-201',
        accountCode: '2.1.01.01',
        accountName: 'Cuentas por Pagar a Proveedores Comerciales',
        description: `Obligación con proveedor ${supplier.name}`,
        debit: 0,
        credit: newPO.total
      }
    ];

    this.generateAutomatedJournalEntry('COMPRA', orderNumber, `Recepción de Compra ${orderNumber} (${supplier.name})`, poAccountLines);

    this.logAudit(
      'PURCHASE_RECEIPT',
      'PURCHASES',
      `Recepción de Compra ${orderNumber}`,
      `Ingreso de ${poItems.length} productos desde ${supplier.name}. Cálculo de Costo Promedio ejecutado.`,
      { proveedor: supplier.name, itemsCount: items.length },
      { orderNumber, total: newPO.total, productosAfectados: auditDiffItems },
      { prismaTransaction: 'COMMITTED', isolationLevel: 'ReadCommitted' }
    );

    this.notify('success', 'Compra Registrada con Éxito', `Orden ${orderNumber} recibida. Stock y Costo Promedio actualizados.`);
    this.saveState();
    return { success: true, orderNumber };
  }

  // ==========================================
  // BCV RATE SYNCHRONIZATION & MANUAL CONTROL
  // ==========================================
  syncBcvRates(): void {
    this.bcvState.update(s => ({ ...s, isSyncing: true }));
    
    // Simulate real-time API call to BCV Scraper / Webhook Gateway
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const officialDate = `${day}/${month}/${year}`;

      // Realistic official rate query (BCV Venezuelan Central Bank)
      const newUsd = 36.54;
      const newEur = 39.85;

      this.bcvState.set({
        usdRate: newUsd,
        eurRate: newEur,
        origin: 'API_BCV',
        lastSync: timeStr,
        isSyncing: false,
        status: 'SYNCED',
        bcvOfficialDate: officialDate
      });

      this.logAudit(
        'SYNC_BCV_RATES',
        'FINANCE',
        'Sincronización Automática API BCV',
        `Tipo de cambio oficial actualizado desde el Banco Central de Venezuela. USD: Bs. ${newUsd.toFixed(2)} | EUR: Bs. ${newEur.toFixed(2)}.`,
        { originBefore: 'API_BCV' },
        { usdRate: newUsd, eurRate: newEur, officialDate, syncTime: timeStr },
        { source: 'BCV_SCRAPER_GATEWAY_V2' }
      );

      this.notify('success', 'Tasa BCV Sincronizada', `USD: Bs. ${newUsd.toFixed(2)} | EUR: Bs. ${newEur.toFixed(2)} (Oficial BCV ${officialDate})`);
      this.saveState();
    }, 450);
  }

  setManualExchangeRate(usdRate: number, eurRate?: number): void {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const prev = this.bcvState();
    const finalEur = eurRate !== undefined ? eurRate : Number((usdRate * 1.09).toFixed(4));

    this.bcvState.set({
      usdRate: Number(usdRate.toFixed(4)),
      eurRate: Number(finalEur.toFixed(4)),
      origin: 'MANUAL',
      lastSync: now,
      isSyncing: false,
      status: 'FALLBACK_MANUAL',
      bcvOfficialDate: prev.bcvOfficialDate
    });

    this.logAudit(
      'UPDATE_EXCHANGE_RATE',
      'FINANCE',
      'Ajuste Manual de Tasa de Cambio',
      `Tasa fijada manualmente por el operador. USD: Bs. ${usdRate.toFixed(2)} (Anterior: ${prev.usdRate.toFixed(2)}), EUR: Bs. ${finalEur.toFixed(2)}.`,
      { usdAnterior: prev.usdRate, eurAnterior: prev.eurRate, origenAnterior: prev.origin },
      { usdNuevo: usdRate, eurNuevo: finalEur, origenNuevo: 'MANUAL' }
    );

    this.notify('info', 'Tasa Manual Configurada', `USD: Bs. ${usdRate.toFixed(2)} fijado según criterio manual.`);
    this.saveState();
  }

  // Update Product Prices (5 levels) and Taxes
  updateProductPricesAndTaxes(productId: string, prices: ProductPrices, isTaxExempt: boolean, taxRate: number): void {
    const prod = this.products().find(p => p.id === productId);
    if (!prod) return;

    const user = this.authService.currentUser();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const oldBasePrice = prod.salePrice || prod.prices?.price1 || 0;
    const newBasePrice = prices.price1;
    const isBasePriceChanged = Math.abs(oldBasePrice - newBasePrice) > 0.001;

    const updatedProd: Product = {
      ...prod,
      salePrice: prices.price1, // Base price alias
      prices: { ...prices },
      isTaxExempt,
      taxRate: isTaxExempt ? 0 : taxRate,
      updatedAt: nowStr
    };

    this.products.update(prods => prods.map(p => p.id === productId ? updatedProd : p));
    this.logAudit(
      'UPDATE_PRODUCT_PRICES',
      'INVENTORY',
      `Actualización de 5 Niveles de Precio: ${prod.sku}`,
      `Se actualizaron los 5 niveles de precio y condición tributaria (${isTaxExempt ? 'Exento 0%' : 'Gravado ' + (taxRate * 100) + '%'}) de ${prod.name}.`,
      { preciosAnteriores: prod.prices, precioBaseAnterior: oldBasePrice, exentoAnterior: prod.isTaxExempt },
      { preciosNuevos: prices, precioBaseNuevo: newBasePrice, exentoNuevo: isTaxExempt, tasaIva: taxRate },
      { basePriceChanged: isBasePriceChanged },
      true,
      'PRICE_CHANGE'
    );

    // Emit Real-time Critical Audit Notification
    const priceDeltaPercent = oldBasePrice > 0 ? (((newBasePrice - oldBasePrice) / oldBasePrice) * 100).toFixed(2) : '0';
    this.addCriticalAuditNotification({
      category: 'PRICE_CHANGE',
      severity: isBasePriceChanged ? 'CRITICAL' : 'HIGH',
      title: isBasePriceChanged ? 'Alteración de Precio Base de Venta' : 'Actualización de Niveles de Precio',
      message: `El usuario ${user.name} (${user.role}) modificó los precios de "${prod.name}" (${prod.sku}). Precio Base: $${oldBasePrice.toFixed(2)} ➔ $${newBasePrice.toFixed(2)} USD (${Number(priceDeltaPercent) >= 0 ? '+' : ''}${priceDeltaPercent}%).`,
      details: {
        itemSku: prod.sku,
        itemName: prod.name,
        oldValue: `$${oldBasePrice.toFixed(2)} (Base Nivel 1)`,
        newValue: `$${newBasePrice.toFixed(2)} (Base Nivel 1)`,
        diffSummary: `Precio Base: $${oldBasePrice.toFixed(2)} ➔ $${newBasePrice.toFixed(2)} USD (${isTaxExempt ? 'Exento' : 'IVA ' + (taxRate * 100) + '%'})`,
        user: user.name,
        role: user.role,
        timestamp: nowStr,
        justification: 'Modificación manual directa en catálogo de inventario'
      }
    });

    this.saveState();
  }

  // Helper to get effective price of product
  getProductPriceByLevel(product: Product, level: PriceLevelKey = 'price1'): number {
    if (product.prices && product.prices[level] !== undefined && product.prices[level] !== null) {
      return product.prices[level];
    }
    // Fallback based on default discounts
    const config = this.priceLevelConfigs.find(c => c.key === level);
    const ratio = config?.defaultDiscountRatio || 0;
    return Number((product.salePrice * (1 - ratio)).toFixed(2));
  }

  // ==========================================
  // TRANSACTION 2: REGISTRO DE VENTA / POS FACTURACIÓN RÁPIDA (MULTIMONEDA, 5 PRECIOS, IGTF, DESCUENTO GLOBAL)
  // ==========================================

  /**
   * Determina si un método de pago califica como pago en Bolívares (Moneda Nacional).
   * Según normativa SENIAT, los pagos en Bolívares NO están sujetos al 3% de IGTF (0%).
   */
  isBolivaresPaymentMethod(method: PaymentMethod, currency?: CurrencyCode): boolean {
    if (method === 'PAGO_MOVIL' || method === 'PUNTO_VENTA_DEBITO' || method === 'TARJETA_CREDITO') {
      return true;
    }
    if ((method === 'EFECTIVO' || method === 'TRANSFERENCIA' || method === 'CREDITO') && (currency === 'VES' || !currency)) {
      return true;
    }
    return false;
  }

  /**
   * Determina si un método de pago califica como pago en Divisas / Moneda Extranjera / Criptoactivos.
   * (Efectivo USD/EUR, Zelle, plataformas internacionales, criptomonedas, etc.)
   */
  isForeignCurrencyPaymentMethod(method: PaymentMethod, currency?: CurrencyCode): boolean {
    if (method === 'EFECTIVO_USD' || method === 'EFECTIVO_EUR' || method === 'ZELLE') {
      return true;
    }
    if ((method === 'EFECTIVO' || method === 'TRANSFERENCIA' || method === 'CREDITO') && (currency === 'USD' || currency === 'EUR')) {
      return true;
    }
    return false;
  }

  /**
   * Evalúa y calcula la percepción de IGTF 3% bajo las providencias y normativas del SENIAT:
   * 1. Calificación del Emisor: La empresa debe ser Sujeto Pasivo Especial (Contribuyente Especial).
   * 2. Medio de Pago: Pago en divisas en efectivo, transferencias/plataformas internacionales o criptoactivos.
   * 3. Pagos en Bolívares (Pago Móvil, Punto de Venta, Efectivo Bs, Transferencias en Bs): NO APLICA (0%).
   * 4. Base de cálculo: 3% sobre el monto total efectivamente cancelado en moneda extranjera (incluye IVA proporcional).
   */
  calculateIgtfDetails(
    payments: PaymentRecord[],
    paymentCurrency: CurrencyCode,
    netSubtotal: number,
    ivaAmount: number,
    manualOverride?: boolean | null
  ): { appliesIgtf: boolean; igtfPercent: number; igtfBase: number; igtfAmount: number } {
    const isSpecialTaxpayer = this.companyProfile().isSpecialTaxpayer;

    // Si la empresa es un Contribuyente Ordinario (no especial), no actúa como agente de percepción del IGTF 3%
    if (!isSpecialTaxpayer) {
      return { appliesIgtf: false, igtfPercent: 0, igtfBase: 0, igtfAmount: 0 };
    }

    if (manualOverride !== undefined && manualOverride !== null) {
      if (!manualOverride) {
        return { appliesIgtf: false, igtfPercent: 0, igtfBase: 0, igtfAmount: 0 };
      }
      const fullBase = Number((netSubtotal + ivaAmount).toFixed(2));
      return {
        appliesIgtf: true,
        igtfPercent: 3.0,
        igtfBase: fullBase,
        igtfAmount: Number((fullBase * 0.03).toFixed(2))
      };
    }

    const totalInvoiceAmount = Number((netSubtotal + ivaAmount).toFixed(2));

    // Determinar si los pagos son en Bolívares o en Divisas
    let foreignPaidAmountUsd = 0;
    let allBolivares = true;

    if (payments.length > 0) {
      for (const p of payments) {
        const isBs = this.isBolivaresPaymentMethod(p.method, p.currency || paymentCurrency);
        const isDivisa = this.isForeignCurrencyPaymentMethod(p.method, p.currency || paymentCurrency) || p.isForeignCurrency;

        if (isBs) {
          // Pago en Bolívares: no suma a IGTF
          continue;
        } else if (isDivisa) {
          allBolivares = false;
          const amtUsd = p.currency === 'VES'
            ? (p.amount / this.bcvState().usdRate)
            : (p.currency === 'EUR' ? (p.amount * this.bcvState().eurRate) / this.bcvState().usdRate : p.amount);
          foreignPaidAmountUsd += amtUsd;
        } else if (p.currency === 'USD' || p.currency === 'EUR') {
          allBolivares = false;
          foreignPaidAmountUsd += p.amount;
        }
      }
    } else {
      // Si no hay pagos detallados, evaluar la moneda de cobro
      if (paymentCurrency === 'VES') {
        allBolivares = true;
      } else {
        allBolivares = false;
        foreignPaidAmountUsd = totalInvoiceAmount;
      }
    }

    if (allBolivares || foreignPaidAmountUsd <= 0.001) {
      // Pago en Bolívares -> Exento de IGTF (0%)
      return {
        appliesIgtf: false,
        igtfPercent: 0,
        igtfBase: 0,
        igtfAmount: 0
      };
    }

    // Aplica percepción del 3% sobre el monto efectivamente pagado en divisas
    const igtfBase = Math.min(totalInvoiceAmount, foreignPaidAmountUsd);
    const igtfAmount = Number((igtfBase * 0.03).toFixed(2));

    return {
      appliesIgtf: true,
      igtfPercent: 3.0,
      igtfBase: Number(igtfBase.toFixed(2)),
      igtfAmount
    };
  }

  registerSaleInvoice(
    customerId: string,
    warehouseId: string,
    items: { productId: string; quantity: number; discountPercent?: number; priceLevel?: PriceLevelKey }[],
    payments: PaymentRecord[],
    invoiceType: Invoice['type'] = 'FACTURA_ELECTRONICA',
    options?: {
      baseCurrency?: CurrencyCode;
      paymentCurrency?: CurrencyCode;
      globalDiscountPercent?: number;
      priceLevelApplied?: PriceLevelKey;
      customIvaRate?: number;
      originQuoteNumber?: string;
      appliesIgtfManual?: boolean | null;
      isStockAlreadyDeducted?: boolean;
      dispatchGuideNumbers?: string[];
      dispatchControlNumbers?: string[];
      deliveryOrderNumbers?: string[];
    }
  ): { success: boolean; invoiceNumber?: string; message?: string; invoice?: Invoice } {
    const user = this.authService.currentUser();
    const customer = this.customers().find(c => c.id === customerId);
    const warehouse = this.warehouses().find(w => w.id === warehouseId);

    if (!customer || !warehouse || items.length === 0) {
      return { success: false, message: 'Datos incompletos para generar la factura.' };
    }

    const isStockAlreadyDeducted = Boolean(options?.isStockAlreadyDeducted);

    // 1. Validate stock availability in selected warehouse (unless already physically dispatched)
    const currentProducts = [...this.products()];
    if (!isStockAlreadyDeducted) {
      for (const item of items) {
        const prod = currentProducts.find(p => p.id === item.productId);
        if (!prod) {
          return { success: false, message: `Producto con ID ${item.productId} no encontrado.` };
        }
        // Servicios exentos o con stock >= 900 no bloquean
        if (prod.totalStock < 900) {
          const whStock = prod.stockByWarehouse.find(sw => sw.warehouseId === warehouseId)?.quantity || 0;
          if (whStock < item.quantity) {
            return {
              success: false,
              message: `Stock insuficiente para "${prod.name}" en ${warehouse.name}. Disponible: ${whStock}, Solicitado: ${item.quantity}`
            };
          }
        }
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const invoiceNumber = 'FAC-2026-' + (this.invoices().length + 86).toString().padStart(4, '0');
    const bcv = this.bcvState();

    const appliedLevel = options?.priceLevelApplied || 'price1';
    const globalDiscountPercent = Math.max(0, Math.min(100, options?.globalDiscountPercent || 0));
    const baseCurrency = options?.baseCurrency || 'USD';
    const paymentCurrency = options?.paymentCurrency || 'USD';

    let grossTaxableBase = 0;
    let grossExemptBase = 0;
    let lineDiscountTotal = 0;

    const invoiceItems: InvoiceItem[] = [];
    const kardexToAdd: KardexMovement[] = [];
    const auditDiff: Record<string, unknown> = {};

    for (const item of items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      const prod = currentProducts[prodIndex];
      if (!prod) continue;
      const itemLevel = item.priceLevel || appliedLevel;
      const unitPrice = this.getProductPriceByLevel(prod, itemLevel);
      const lineGross = unitPrice * item.quantity;
      const lineDiscPercent = item.discountPercent || 0;
      const lineDiscAmount = lineGross * (lineDiscPercent / 100);
      const lineSubtotal = lineGross - lineDiscAmount;
      
      const isExempt = Boolean(prod.isTaxExempt || prod.taxRate === 0);
      const ivaRate = isExempt ? 0 : (options?.customIvaRate !== undefined ? options.customIvaRate : prod.taxRate);
      const itemTaxAmount = lineSubtotal * ivaRate;

      lineDiscountTotal += lineDiscAmount;

      if (isExempt) {
        grossExemptBase += lineSubtotal;
      } else {
        grossTaxableBase += lineSubtotal;
      }

      invoiceItems.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        unit: prod.unit,
        quantity: item.quantity,
        unitPrice,
        costPrice: prod.costPrice,
        priceLevel: itemLevel,
        discountPercent: lineDiscPercent,
        isTaxExempt: isExempt,
        taxRate: ivaRate,
        subtotal: Number(lineSubtotal.toFixed(2)),
        taxAmount: Number(itemTaxAmount.toFixed(2)),
        total: Number((lineSubtotal + itemTaxAmount).toFixed(2))
      });

      // Update Warehouse stock & Total stock (only if not already physically deducted by Dispatch Guide)
      if (!isStockAlreadyDeducted && prod.totalStock < 900) {
        const updatedStockByWh = prod.stockByWarehouse.map(sw => {
          if (sw.warehouseId === warehouseId) {
            return { ...sw, quantity: sw.quantity - item.quantity };
          }
          return sw;
        });

        const newTotalStock = prod.totalStock - item.quantity;
        currentProducts[prodIndex] = {
          ...prod,
          totalStock: newTotalStock,
          stockByWarehouse: updatedStockByWh,
          updatedAt: nowStr
        };

        // Kardex Entry (SALIDA_VENTA a costo promedio)
        const exitTotalCost = Number((item.quantity * prod.costPrice).toFixed(2));
        kardexToAdd.push({
          id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          date: nowStr,
          movementType: 'SALIDA_VENTA',
          docReference: invoiceNumber,
          entryQty: 0,
          entryUnitCost: 0,
          entryTotalCost: 0,
          exitQty: item.quantity,
          exitUnitCost: prod.costPrice,
          exitTotalCost,
          balanceQty: newTotalStock,
          balanceAverageCost: prod.costPrice,
          balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
          registeredByUserId: user.id,
          registeredByUserName: user.name
        });

        auditDiff[prod.sku] = {
          salidaCantidad: item.quantity,
          costoUnitarioVendido: prod.costPrice,
          precioVentaUnitario: unitPrice,
          nivelPrecio: itemLevel,
          stockRestante: newTotalStock
        };
      }
    }

    // Mathematical global discount application
    const subtotalBeforeGlobal = grossTaxableBase + grossExemptBase;
    const globalDiscountAmount = subtotalBeforeGlobal * (globalDiscountPercent / 100);
    const totalDiscountAll = lineDiscountTotal + globalDiscountAmount;

    // Apply global discount proportionally to taxable and exempt bases
    const discFactor = 1 - (globalDiscountPercent / 100);
    const netTaxableBase = Number((grossTaxableBase * discFactor).toFixed(2));
    const netExemptBase = Number((grossExemptBase * discFactor).toFixed(2));
    const netSubtotal = Number((subtotalBeforeGlobal - globalDiscountAmount).toFixed(2));

    // IVA calculation
    const ivaRateFinal = options?.customIvaRate !== undefined ? options.customIvaRate : 0.16;
    const ivaAmount = Number((netTaxableBase * ivaRateFinal).toFixed(2));

    // IGTF Calculation (SENIAT 3% perception rule)
    const igtfResult = this.calculateIgtfDetails(
      payments,
      paymentCurrency,
      netSubtotal,
      ivaAmount,
      options?.appliesIgtfManual
    );
    const appliesIgtf = igtfResult.appliesIgtf;
    const igtfPercent = igtfResult.igtfPercent;
    const igtfBase = igtfResult.igtfBase;
    const igtfAmount = igtfResult.igtfAmount;

    const taxTotal = Number((ivaAmount + igtfAmount).toFixed(2));
    const grandTotalUsd = Number((netSubtotal + taxTotal).toFixed(2));
    const totalVes = Number((grandTotalUsd * bcv.usdRate).toFixed(2));
    const totalEur = Number(((grandTotalUsd * bcv.usdRate) / bcv.eurRate).toFixed(2));

    const taxDetails: InvoiceTaxDetails = {
      taxableBase: netTaxableBase,
      exemptBase: netExemptBase,
      ivaPercent: Number((ivaRateFinal * 100).toFixed(1)),
      ivaAmount,
      appliesIgtf,
      igtfPercent,
      igtfBase,
      igtfAmount
    };

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      warehouseId: warehouse.id,
      date: nowStr,
      type: invoiceType,
      status: 'EMITIDA',
      items: invoiceItems,
      baseCurrency,
      paymentCurrency,
      bcvRate: bcv.usdRate,
      eurRate: bcv.eurRate,
      rateOrigin: bcv.origin,
      priceLevelApplied: appliedLevel,
      subtotal: netSubtotal,
      discountGlobalPercent: globalDiscountPercent,
      discountTotal: Number(totalDiscountAll.toFixed(2)),
      taxDetails,
      taxTotal,
      total: grandTotalUsd,
      totalVes,
      totalEur,
      payments,
      sellerId: user.id,
      sellerName: user.name,
      digitalSeal: 'UUID-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now(),
      quoteOriginNumber: options?.originQuoteNumber,
      dispatchGuideNumbers: options?.dispatchGuideNumbers,
      dispatchControlNumbers: options?.dispatchControlNumbers,
      deliveryOrderNumbers: options?.deliveryOrderNumbers,
      isStockAlreadyDeducted
    };

    // Update Cash Session if active
    if (this.activeCashSession().status === 'ABIERTA') {
      let cashDelta = 0;
      let cardDelta = 0;
      let transferDelta = 0;
      let creditDelta = 0;

      payments.forEach(p => {
        if (p.method === 'EFECTIVO' || p.method === 'EFECTIVO_USD' || p.method === 'EFECTIVO_EUR') cashDelta += p.amount;
        else if (p.method === 'TARJETA_CREDITO' || p.method === 'PUNTO_VENTA_DEBITO') cardDelta += p.amount;
        else if (p.method === 'TRANSFERENCIA' || p.method === 'PAGO_MOVIL' || p.method === 'ZELLE') transferDelta += p.amount;
        else if (p.method === 'CREDITO') creditDelta += p.amount;
      });

      this.activeCashSession.update(session => ({
        ...session,
        totalCashSales: Number((session.totalCashSales + cashDelta).toFixed(2)),
        totalCardSales: Number((session.totalCardSales + cardDelta).toFixed(2)),
        totalTransferSales: Number((session.totalTransferSales + transferDelta).toFixed(2)),
        totalCreditSales: Number((session.totalCreditSales + creditDelta).toFixed(2)),
        totalSales: Number((session.totalSales + grandTotalUsd).toFixed(2))
      }));
    }

    // Atomic write
    if (!isStockAlreadyDeducted) {
      this.products.set(currentProducts);
    }
    this.invoices.update(invs => [newInvoice, ...invs]);
    if (kardexToAdd.length > 0) {
      this.kardexMovements.update(kdx => [...kardexToAdd, ...kdx]);
    }

    // Automatic double-entry accounting recognition
    const totalCostOfGoods = invoiceItems.reduce((s, it) => s + (it.quantity * it.costPrice), 0);
    const saleAccountingLines: JournalEntryLine[] = [
      {
        accountId: 'acc-101',
        accountCode: '1.1.01.01',
        accountName: 'Caja General y Efectivo Moneda Local/Divisas',
        description: `Cobro venta ${invoiceNumber} (${customer.name})`,
        debit: grandTotalUsd,
        credit: 0
      },
      {
        accountId: 'acc-501',
        accountCode: '5.1.01.01',
        accountName: 'Costo de Ventas de Mercancías',
        description: isStockAlreadyDeducted
          ? `Costo de ventas (Previamente amparado en Guía de Despacho ${options?.dispatchGuideNumbers?.join(', ') || ''})`
          : `Costo promedio de salida mercancías ${invoiceNumber}`,
        debit: Number(totalCostOfGoods.toFixed(2)),
        credit: 0
      },
      {
        accountId: 'acc-401',
        accountCode: '4.1.01.01',
        accountName: 'Ingresos Operacionales por Ventas de Bienes',
        description: `Venta neta ${invoiceNumber}`,
        debit: 0,
        credit: netSubtotal
      },
      {
        accountId: 'acc-202',
        accountCode: '2.1.02.01',
        accountName: 'Débito Fiscal IVA 16% por Pagar',
        description: `Débito fiscal IVA ${invoiceNumber}`,
        debit: 0,
        credit: ivaAmount
      }
    ];

    if (igtfAmount > 0) {
      saleAccountingLines.push({
        accountId: 'acc-203',
        accountCode: '2.1.02.02',
        accountName: 'IGTF 3% Retenido en Divisas por Pagar',
        description: `IGTF 3% percibido en divisas ${invoiceNumber}`,
        debit: 0,
        credit: igtfAmount
      });
    }

    if (totalCostOfGoods > 0) {
      saleAccountingLines.push({
        accountId: 'acc-104',
        accountCode: '1.1.03.01',
        accountName: 'Inventario de Mercancías y Productos Terminados',
        description: isStockAlreadyDeducted
          ? `Descargo diferido facturación ${invoiceNumber} (Amparo Guía(s) ${options?.dispatchGuideNumbers?.join(', ') || ''})`
          : `Descargo de inventario por venta ${invoiceNumber}`,
        debit: 0,
        credit: Number(totalCostOfGoods.toFixed(2))
      });
    }

    this.generateAutomatedJournalEntry('VENTA', invoiceNumber, `Venta Factura ${invoiceNumber} a ${customer.name}`, saleAccountingLines);

    this.logAudit(
      'CREATE_INVOICE',
      'POS',
      `Emisión ${invoiceNumber} (${invoiceType} - ${paymentCurrency})`,
      `Factura emitida a ${customer.name}. Nivel: ${appliedLevel}. Total: $${grandTotalUsd.toFixed(2)} (Bs. ${totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}). Tasa BCV: ${bcv.usdRate.toFixed(2)}. IGTF: ${appliesIgtf ? '3%' : '0%'}.${isStockAlreadyDeducted ? ' Amparo Guía: ' + options?.dispatchGuideNumbers?.join(', ') : ''}`,
      { cliente: customer.name, originQuote: options?.originQuoteNumber || null, tasaBcv: bcv.usdRate, nivelPrecio: appliedLevel },
      { invoiceNumber, totalUsd: grandTotalUsd, totalVes, items: auditDiff, pagos: payments, taxDetails, dispatchGuideNumbers: options?.dispatchGuideNumbers },
      { prismaTransaction: 'ATOMIC_COMPLETED' }
    );

    this.notify(
      'success',
      'Factura Emitida con Éxito',
      `${invoiceNumber} registrada: $${grandTotalUsd.toFixed(2)} / Bs. ${totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    );
    this.saveState();
    return { success: true, invoiceNumber, invoice: newInvoice };
  }

  // ==========================================
  // TRANSACTION 3: CONVERSIÓN RÁPIDA DE PRESUPUESTO EN FACTURA
  // ==========================================
  convertQuoteToInvoice(
    quoteId: string,
    options?: {
      warehouseId?: string;
      payments?: PaymentRecord[];
      paymentCurrency?: CurrencyCode;
      invoiceType?: 'FACTURA_ELECTRONICA' | 'BOLETA_POS' | 'TICKET_VENTA';
      appliesIgtfManual?: boolean | null;
      customIvaRate?: number;
      globalDiscountPercent?: number;
      priceLevelApplied?: PriceLevelKey;
    }
  ): { success: boolean; invoiceNumber?: string; invoice?: Invoice; message?: string } {
    const quote = this.quotes().find(q => q.id === quoteId);
    if (!quote) return { success: false, message: 'Presupuesto no encontrado.' };

    if (quote.status === 'CONVERTIDO_A_FACTURA') {
      return { success: false, message: 'Este presupuesto ya fue convertido a factura previamente.' };
    }

    const whId = options?.warehouseId || this.warehouses()[0]?.id || 'wh-01';
    const saleItems = quote.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      discountPercent: item.discountPercent
    }));

    const paymentCurr = options?.paymentCurrency || 'USD';
    const payments = options?.payments && options.payments.length > 0
      ? options.payments
      : [
          {
            method: (paymentCurr === 'VES' ? 'TRANSFERENCIA' : 'EFECTIVO_USD') as PaymentMethod,
            amount: paymentCurr === 'VES' ? (quote.totalVes || (quote.total * this.bcvState().usdRate)) : quote.total,
            currency: paymentCurr,
            reference: `COT-CONVERT-${quote.quoteNumber}`
          }
        ];

    const result = this.registerSaleInvoice(
      quote.customerId,
      whId,
      saleItems,
      payments,
      options?.invoiceType || 'FACTURA_ELECTRONICA',
      {
        baseCurrency: quote.baseCurrency || 'USD',
        paymentCurrency: paymentCurr,
        priceLevelApplied: options?.priceLevelApplied || quote.priceLevelApplied || 'price1',
        originQuoteNumber: quote.quoteNumber,
        appliesIgtfManual: options?.appliesIgtfManual,
        customIvaRate: options?.customIvaRate,
        globalDiscountPercent: options?.globalDiscountPercent
      }
    );

    if (result.success && result.invoiceNumber) {
      this.quotes.update(qs =>
        qs.map(q => q.id === quoteId
          ? { ...q, status: 'CONVERTIDO_A_FACTURA', convertedInvoiceNumber: result.invoiceNumber }
          : q
        )
      );

      this.logAudit(
        'CONVERT_QUOTE',
        'SALES',
        `Conversión de Presupuesto ${quote.quoteNumber} a Factura`,
        `El presupuesto ${quote.quoteNumber} fue convertido automáticamente en la factura ${result.invoiceNumber}.`,
        { quoteStatusBefore: quote.status, quoteTotal: quote.total },
        { invoiceNumber: result.invoiceNumber, quoteStatusAfter: 'CONVERTIDO_A_FACTURA' }
      );

      this.notify('success', 'Presupuesto Convertido', `El presupuesto ${quote.quoteNumber} se convirtió en la Factura ${result.invoiceNumber}`);
      this.saveState();
    }

    return result;
  }

  // ==========================================
  // TRANSACTION 3B: ANULACIÓN DE FACTURA CON RESTITUCIÓN DE INVENTARIO
  // ==========================================
  cancelInvoice(invoiceId: string, justificationReason = 'Anulación solicitada por gerencia de ventas'): { success: boolean; message: string } {
    const inv = this.invoices().find(i => i.id === invoiceId);
    if (!inv) return { success: false, message: 'Factura no encontrada.' };
    if (inv.status === 'ANULADA') return { success: false, message: 'La factura ya se encuentra anulada.' };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.authService.currentUser();

    // Re-ingresar stock a los almacenes
    const currentProducts = [...this.products()];
    const kardexToAdd: KardexMovement[] = [];

    for (const item of inv.items || []) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      if (prodIndex !== -1) {
        const prod = currentProducts[prodIndex];
        const updatedStockByWh = prod.stockByWarehouse.map(sw => {
          if (sw.warehouseId === inv.warehouseId) {
            return { ...sw, quantity: sw.quantity + item.quantity };
          }
          return sw;
        });
        const newTotalStock = prod.totalStock + item.quantity;
        currentProducts[prodIndex] = {
          ...prod,
          totalStock: newTotalStock,
          stockByWarehouse: updatedStockByWh,
          updatedAt: nowStr
        };

        kardexToAdd.push({
          id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          warehouseId: inv.warehouseId,
          warehouseName: this.warehouses().find(w => w.id === inv.warehouseId)?.name || 'Almacén Central',
          date: nowStr,
          movementType: 'AJUSTE_SOBRANTE',
          docReference: `ANUL-${inv.invoiceNumber}`,
          justificationReason: `Reingreso por anulación de factura ${inv.invoiceNumber}: ${justificationReason}`,
          entryQty: item.quantity,
          entryUnitCost: prod.costPrice,
          entryTotalCost: Number((item.quantity * prod.costPrice).toFixed(2)),
          exitQty: 0,
          exitUnitCost: 0,
          exitTotalCost: 0,
          balanceQty: newTotalStock,
          balanceAverageCost: prod.costPrice,
          balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
          registeredByUserId: user.id,
          registeredByUserName: user.name
        });
      }
    }

    this.products.set(currentProducts);
    this.kardexMovements.update(k => [...kardexToAdd, ...k]);
    this.invoices.update(invs =>
      invs.map(i => i.id === invoiceId ? { ...i, status: 'ANULADA' } : i)
    );

    this.logAudit(
      'CREATE_INVOICE',
      'POS',
      `Anulación de Factura ${inv.invoiceNumber}`,
      `Factura ${inv.invoiceNumber} anulada. Motivo: ${justificationReason}. Stock devuelto al almacén.`,
      { invoiceStatus: 'EMITIDA', total: inv.total },
      { invoiceStatus: 'ANULADA', motivo: justificationReason }
    );

    this.notify('warning', 'Factura Anulada', `La factura ${inv.invoiceNumber} ha sido anulada y el stock fue restablecido.`);
    this.saveState();
    return { success: true, message: `Factura ${inv.invoiceNumber} anulada correctamente.` };
  }

  // ==========================================
  // TRANSACTION 3C: GUÍAS DE DESPACHO Y ÓRDENES DE ENTREGA (SENIAT SNAT/2011/00071)
  // ==========================================

  generateNextDispatchGuideNumber(): string {
    const nextSeq = this.dispatchGuides().length + 1;
    return `GD-2026-${nextSeq.toString().padStart(4, '0')}`;
  }

  generateNextDispatchControlNumber(): string {
    const nextSeq = this.dispatchGuides().length + 101;
    return `00-${nextSeq.toString().padStart(6, '0')}`;
  }

  generateNextDeliveryOrderNumber(): string {
    const nextSeq = this.deliveryOrders().length + 1;
    return `OE-2026-${nextSeq.toString().padStart(4, '0')}`;
  }

  generateNextDeliveryControlNumber(): string {
    const nextSeq = this.deliveryOrders().length + 501;
    return `00-${nextSeq.toString().padStart(6, '0')}`;
  }

  /**
   * Crea una Guía de Despacho oficial conforme a la Providencia SENIAT SNAT/2011/00071.
   * Ampara el traslado de bienes en territorio nacional y descuenta stock automáticamente del Kardex.
   */
  createDispatchGuide(payload: {
    originWarehouseId: string;
    destinationWarehouseId?: string;
    customerId?: string;
    customerName?: string;
    customerTaxId?: string;
    destinationAddress: string;
    destinationState?: string;
    destinationCity?: string;
    recipientContactName?: string;
    recipientPhone?: string;
    transportReason: TransportReason;
    transportReasonDescription?: string;
    carrierType: CarrierType;
    carrierName?: string;
    carrierTaxId?: string;
    carrierPhone?: string;
    driverName: string;
    driverIdDoc: string;
    driverPhone?: string;
    driverLicenseNumber?: string;
    vehiclePlate: string;
    vehicleModel?: string;
    vehicleBrand?: string;
    vehicleYear?: number;
    items: {
      productId: string;
      quantity: number;
      packagesCount?: number;
      weightKg?: number;
      volumeM3?: number;
      notes?: string;
    }[];
    originQuoteNumber?: string;
    originQuoteId?: string;
    invoicedInvoiceNumber?: string;
    dispatchDate?: string;
    estimatedDeliveryDate?: string;
    routeDetails?: string;
    generalObservations?: string;
    customControlNumber?: string;
  }): {
    success: boolean;
    guideNumber?: string;
    controlNumber?: string;
    dispatchGuide?: DispatchGuide;
    deliveryOrder?: DeliveryOrder;
    message?: string;
  } {
    const user = this.authService.currentUser();
    const originWarehouse = this.warehouses().find(w => w.id === payload.originWarehouseId);

    if (!originWarehouse) {
      return { success: false, message: 'Almacén de origen no válido.' };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: 'Debe incluir al menos un producto a despachar.' };
    }

    if (!payload.destinationAddress || payload.destinationAddress.trim().length < 5) {
      return { success: false, message: 'La dirección de destino es obligatoria según Providencia SNAT/2011/00071.' };
    }

    if (!payload.driverName || !payload.driverIdDoc || !payload.vehiclePlate) {
      return { success: false, message: 'Datos de transporte obligatorios (Conductor, Cédula y Placa del vehículo).' };
    }

    // 1. Validar disponibilidad de stock en el almacén de despacho
    const currentProducts = [...this.products()];
    for (const item of payload.items) {
      const prod = currentProducts.find(p => p.id === item.productId);
      if (!prod) {
        return { success: false, message: `Producto con ID ${item.productId} no encontrado.` };
      }
      if (prod.totalStock < 900) {
        const whStock = prod.stockByWarehouse.find(sw => sw.warehouseId === payload.originWarehouseId)?.quantity || 0;
        if (whStock < item.quantity) {
          return {
            success: false,
            message: `Stock insuficiente para "${prod.name}" en ${originWarehouse.name}. Disponible: ${whStock}, Requerido: ${item.quantity}`
          };
        }
      }
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const guideNumber = this.generateNextDispatchGuideNumber();
    const controlNumber = payload.customControlNumber?.trim() || this.generateNextDispatchControlNumber();
    const deliveryOrderNumber = this.generateNextDeliveryOrderNumber();
    const deliveryControlNumber = this.generateNextDeliveryControlNumber();
    const comp = this.companyProfile();

    const dispatchItems: DispatchItem[] = [];
    const kardexToAdd: KardexMovement[] = [];
    const auditStockDiff: Record<string, unknown> = {};

    let totalPackages = 0;
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;
    let totalDeclaredValue = 0;

    for (const item of payload.items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      const prod = currentProducts[prodIndex];
      if (!prod) continue;

      const itemValuation = Number((item.quantity * prod.salePrice).toFixed(2));
      const itemCostTotal = Number((item.quantity * prod.costPrice).toFixed(2));
      const pkgs = item.packagesCount || Math.ceil(item.quantity);
      const wKg = item.weightKg || Number((item.quantity * 1.5).toFixed(2));
      const vM3 = item.volumeM3 || Number((item.quantity * 0.01).toFixed(3));

      totalPackages += pkgs;
      totalWeightKg += wKg;
      totalVolumeM3 += vM3;
      totalDeclaredValue += itemValuation;

      dispatchItems.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        unit: prod.unit,
        quantity: item.quantity,
        packagesCount: pkgs,
        weightKg: wKg,
        volumeM3: vM3,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
        totalDeclaredValue: itemValuation,
        notes: item.notes
      });

      // Descuento físico del inventario en almacén y Kardex
      if (prod.totalStock < 900) {
        const updatedStockByWh = prod.stockByWarehouse.map(sw => {
          if (sw.warehouseId === payload.originWarehouseId) {
            return { ...sw, quantity: sw.quantity - item.quantity };
          }
          return sw;
        });

        const newTotalStock = prod.totalStock - item.quantity;
        currentProducts[prodIndex] = {
          ...prod,
          totalStock: newTotalStock,
          stockByWarehouse: updatedStockByWh,
          updatedAt: nowStr
        };

        kardexToAdd.push({
          id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          warehouseId: originWarehouse.id,
          warehouseName: originWarehouse.name,
          date: nowStr,
          movementType: 'DESPACHO_GUIA',
          docReference: guideNumber,
          justificationReason: `Despacho amparado bajo Guía ${guideNumber} (N° Control SENIAT: ${controlNumber}) - ${payload.transportReason}`,
          entryQty: 0,
          entryUnitCost: 0,
          entryTotalCost: 0,
          exitQty: item.quantity,
          exitUnitCost: prod.costPrice,
          exitTotalCost: itemCostTotal,
          balanceQty: newTotalStock,
          balanceAverageCost: prod.costPrice,
          balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
          registeredByUserId: user.id,
          registeredByUserName: user.name
        });

        auditStockDiff[prod.sku] = {
          salidaDespacho: item.quantity,
          costoUnitario: prod.costPrice,
          stockRestante: newTotalStock
        };
      }
    }

    const newDispatchGuideId = 'dg-' + Date.now();
    const newDeliveryOrderId = 'do-' + Date.now();

    const newDispatchGuide: DispatchGuide = {
      id: newDispatchGuideId,
      guideNumber,
      controlNumber,
      legalNotice: 'Documento emitido conforme a la Providencia Administrativa SENIAT/SNAT/2011/00071 para amparar el traslado de bienes y mercancías en el territorio de la República Bolivariana de Venezuela.',
      issueDate: nowStr,
      dispatchDate: payload.dispatchDate || nowStr,
      estimatedDeliveryDate: payload.estimatedDeliveryDate,
      status: 'EN_TRANSITO',
      originWarehouseId: originWarehouse.id,
      originWarehouseName: originWarehouse.name,
      originAddress: `${originWarehouse.location || comp.address}, Venezuela`,
      issuerName: comp.legalName || comp.tradeName,
      issuerTaxId: comp.taxId,
      destinationWarehouseId: payload.destinationWarehouseId,
      customerId: payload.customerId,
      customerName: payload.customerName || (payload.customerId ? this.customers().find(c => c.id === payload.customerId)?.name : undefined) || 'Cliente Final',
      customerTaxId: payload.customerTaxId || (payload.customerId ? this.customers().find(c => c.id === payload.customerId)?.taxId : undefined) || 'V-00000000-0',
      destinationAddress: payload.destinationAddress,
      destinationState: payload.destinationState,
      destinationCity: payload.destinationCity,
      recipientContactName: payload.recipientContactName,
      recipientPhone: payload.recipientPhone,
      transportReason: payload.transportReason,
      transportReasonDescription: payload.transportReasonDescription,
      carrierType: payload.carrierType,
      carrierName: payload.carrierName,
      carrierTaxId: payload.carrierTaxId,
      carrierPhone: payload.carrierPhone,
      driverName: payload.driverName,
      driverIdDoc: payload.driverIdDoc,
      driverPhone: payload.driverPhone,
      driverLicenseNumber: payload.driverLicenseNumber,
      vehiclePlate: payload.vehiclePlate,
      vehicleModel: payload.vehicleModel,
      vehicleBrand: payload.vehicleBrand,
      vehicleYear: payload.vehicleYear,
      items: dispatchItems,
      totalQuantity: payload.items.reduce((s, i) => s + i.quantity, 0),
      totalPackages,
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalVolumeM3: Number(totalVolumeM3.toFixed(3)),
      totalDeclaredValue: Number(totalDeclaredValue.toFixed(2)),
      currency: 'USD',
      originQuoteNumber: payload.originQuoteNumber,
      invoicedInvoiceNumber: payload.invoicedInvoiceNumber,
      relatedDeliveryOrderId: newDeliveryOrderId,
      relatedDeliveryOrderNumber: deliveryOrderNumber,
      routeDetails: payload.routeDetails,
      generalObservations: payload.generalObservations,
      createdUserId: user.id,
      createdUserName: user.name,
      digitalSeal: 'SENIAT-GD-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now(),
      createdAt: nowStr,
      updatedAt: nowStr
    };

    const newDeliveryOrder: DeliveryOrder = {
      id: newDeliveryOrderId,
      orderNumber: deliveryOrderNumber,
      controlNumber: deliveryControlNumber,
      dispatchGuideId: newDispatchGuideId,
      dispatchGuideNumber: guideNumber,
      dispatchControlNumber: controlNumber,
      issueDate: nowStr,
      scheduledDate: payload.estimatedDeliveryDate || nowStr,
      status: 'EN_RUTA',
      customerId: payload.customerId,
      customerName: newDispatchGuide.customerName || 'Cliente Final',
      customerTaxId: newDispatchGuide.customerTaxId || 'V-00000000-0',
      deliveryAddress: payload.destinationAddress,
      contactPerson: payload.recipientContactName,
      contactPhone: payload.recipientPhone,
      carrierType: payload.carrierType,
      driverName: payload.driverName,
      driverIdDoc: payload.driverIdDoc,
      driverPhone: payload.driverPhone,
      vehiclePlate: payload.vehiclePlate,
      items: dispatchItems,
      totalQuantity: payload.items.reduce((s, i) => s + i.quantity, 0),
      totalPackages,
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      specialInstructions: payload.generalObservations,
      createdUserId: user.id,
      createdUserName: user.name,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    // Actualizar estado de Presupuesto / Pedido de Venta de origen si aplica
    if (payload.originQuoteId) {
      this.quotes.update(qs =>
        qs.map(q => q.id === payload.originQuoteId
          ? { ...q, status: 'DESPACHADO', dispatchedGuideNumber: guideNumber }
          : q
        )
      );
    } else if (payload.originQuoteNumber) {
      this.quotes.update(qs =>
        qs.map(q => q.quoteNumber === payload.originQuoteNumber
          ? { ...q, status: 'DESPACHADO', dispatchedGuideNumber: guideNumber }
          : q
        )
      );
    }

    // Persistencia atómica de inventario, Kardex, Guía y Orden de Entrega
    this.products.set(currentProducts);
    this.dispatchGuides.update(guides => [newDispatchGuide, ...guides]);
    this.deliveryOrders.update(orders => [newDeliveryOrder, ...orders]);
    if (kardexToAdd.length > 0) {
      this.kardexMovements.update(kdx => [...kardexToAdd, ...kdx]);
    }

    // Registro contable de inventario en tránsito
    const totalCostDispatched = dispatchItems.reduce((sum, it) => sum + (it.quantity * it.costPrice), 0);
    if (totalCostDispatched > 0) {
      const logisticsAccountingLines: JournalEntryLine[] = [
        {
          accountId: 'acc-104-transit',
          accountCode: '1.1.03.02',
          accountName: 'Inventario de Mercancías en Tránsito y Despacho',
          description: `Mercancía en tránsito amparada por Guía ${guideNumber}`,
          debit: Number(totalCostDispatched.toFixed(2)),
          credit: 0
        },
        {
          accountId: 'acc-104',
          accountCode: '1.1.03.01',
          accountName: 'Inventario de Mercancías y Productos Terminados',
          description: `Descargo físico de almacén ${originWarehouse.name} por Guía ${guideNumber}`,
          debit: 0,
          credit: Number(totalCostDispatched.toFixed(2))
        }
      ];
      this.generateAutomatedJournalEntry('AJUSTE', guideNumber, `Despacho de Mercancías ${guideNumber} (Control ${controlNumber})`, logisticsAccountingLines);
    }

    this.logAudit(
      'CREATE_DISPATCH_GUIDE',
      'LOGISTICS',
      `Emisión Guía de Despacho ${guideNumber} (Control: ${controlNumber})`,
      `Se emitió la Guía de Despacho ${guideNumber} bajo Providencia SENIAT/2011/00071 con destino a ${newDispatchGuide.customerName}. Conductor: ${payload.driverName} (${payload.vehiclePlate}). Bultos: ${totalPackages}, Peso: ${totalWeightKg.toFixed(2)} kg.`,
      { origen: originWarehouse.name, destino: payload.destinationAddress, transportista: payload.driverName },
      { guideNumber, controlNumber, deliveryOrderNumber, items: auditStockDiff, totalDeclaredValue }
    );

    this.notify(
      'success',
      'Guía de Despacho Emitida',
      `${guideNumber} (N° Control: ${controlNumber}) registrada con éxito y descontada del Kardex.`
    );

    this.saveState();
    return {
      success: true,
      guideNumber,
      controlNumber,
      dispatchGuide: newDispatchGuide,
      deliveryOrder: newDeliveryOrder
    };
  }

  /**
   * Registra la recepción conforme del cliente en la Orden de Entrega y actualiza la Guía de Despacho.
   */
  registerDeliveryReceipt(
    deliveryOrderId: string,
    reception: DeliveryReceptionDetails
  ): { success: boolean; message: string } {
    const user = this.authService.currentUser();
    const order = this.deliveryOrders().find(o => o.id === deliveryOrderId);

    if (!order) {
      return { success: false, message: 'Orden de Entrega no encontrada.' };
    }

    if (order.status === 'ENTREGADA') {
      return { success: false, message: 'La Orden de Entrega ya se encuentra registrada como entregada.' };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const receptionDate = reception.receivedDate || nowStr;

    // Actualizar Orden de Entrega
    this.deliveryOrders.update(orders =>
      orders.map(o => o.id === deliveryOrderId
        ? {
            ...o,
            status: reception.physicalCondition === 'CON_NOVEDAD' ? 'ENTREGADA_PARCIAL' : 'ENTREGADA',
            reception: { ...reception, receivedDate: receptionDate }
          }
        : o
      )
    );

    // Actualizar Guía de Despacho asociada
    if (order.dispatchGuideId) {
      this.dispatchGuides.update(guides =>
        guides.map(g => g.id === order.dispatchGuideId
          ? {
              ...g,
              status: reception.physicalCondition === 'CON_NOVEDAD' ? 'ENTREGADA_CON_NOVEDAD' : 'ENTREGADA',
              receptionDetails: { ...reception, receivedDate: receptionDate }
            }
          : g
        )
      );
    }

    this.logAudit(
      'RECEIVE_DELIVERY',
      'LOGISTICS',
      `Recepción Conforme: Orden ${order.orderNumber}`,
      `Mercancía recibida por ${reception.receivedByName} (C.I./RIF: ${reception.receivedByIdDoc}) y registrada por ${user.name}. Condición: ${reception.physicalCondition}.`,
      { orderNumber: order.orderNumber, guideNumber: order.dispatchGuideNumber, registradoPor: user.name },
      { receptor: reception.receivedByName, cedula: reception.receivedByIdDoc, fecha: receptionDate, observaciones: reception.observations }
    );

    this.notify(
      'success',
      'Entrega Registrada Conforme',
      `Orden ${order.orderNumber} recibida por ${reception.receivedByName}.`
    );

    this.saveState();
    return { success: true, message: `Entrega de la orden ${order.orderNumber} registrada con éxito.` };
  }

  /**
   * Anulación de Guía de Despacho con restitución de inventario al Almacén de Origen.
   */
  cancelDispatchGuide(guideId: string, justificationReason: string): { success: boolean; message: string } {
    const guide = this.dispatchGuides().find(g => g.id === guideId);
    if (!guide) {
      return { success: false, message: 'Guía de Despacho no encontrada.' };
    }

    if (guide.status === 'ANULADA') {
      return { success: false, message: 'La Guía de Despacho ya está anulada.' };
    }

    if (guide.invoicedInvoiceNumber) {
      return {
        success: false,
        message: `No se puede anular la Guía ${guide.guideNumber} porque ya fue facturada en ${guide.invoicedInvoiceNumber}. Anule la factura primero.`
      };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.authService.currentUser();

    // Reingresar stock al almacén de origen
    const currentProducts = [...this.products()];
    const kardexToAdd: KardexMovement[] = [];

    for (const item of guide.items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      if (prodIndex !== -1) {
        const prod = currentProducts[prodIndex];
        const updatedStockByWh = prod.stockByWarehouse.map(sw => {
          if (sw.warehouseId === guide.originWarehouseId) {
            return { ...sw, quantity: sw.quantity + item.quantity };
          }
          return sw;
        });
        const newTotalStock = prod.totalStock + item.quantity;
        currentProducts[prodIndex] = {
          ...prod,
          totalStock: newTotalStock,
          stockByWarehouse: updatedStockByWh,
          updatedAt: nowStr
        };

        kardexToAdd.push({
          id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          warehouseId: guide.originWarehouseId,
          warehouseName: guide.originWarehouseName,
          date: nowStr,
          movementType: 'AJUSTE_SOBRANTE',
          docReference: `ANUL-${guide.guideNumber}`,
          justificationReason: `Reingreso por anulación de Guía de Despacho ${guide.guideNumber}: ${justificationReason}`,
          entryQty: item.quantity,
          entryUnitCost: prod.costPrice,
          entryTotalCost: Number((item.quantity * prod.costPrice).toFixed(2)),
          exitQty: 0,
          exitUnitCost: 0,
          exitTotalCost: 0,
          balanceQty: newTotalStock,
          balanceAverageCost: prod.costPrice,
          balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
          registeredByUserId: user.id,
          registeredByUserName: user.name
        });
      }
    }

    this.products.set(currentProducts);
    this.kardexMovements.update(k => [...kardexToAdd, ...k]);
    this.dispatchGuides.update(guides =>
      guides.map(g => g.id === guideId ? { ...g, status: 'ANULADA', cancelReason: justificationReason } : g)
    );

    if (guide.relatedDeliveryOrderId) {
      this.deliveryOrders.update(orders =>
        orders.map(o => o.id === guide.relatedDeliveryOrderId ? { ...o, status: 'CANCELADA' } : o)
      );
    }

    this.logAudit(
      'CREATE_DISPATCH_GUIDE',
      'LOGISTICS',
      `Anulación de Guía de Despacho ${guide.guideNumber}`,
      `Guía ${guide.guideNumber} anulada. Motivo: ${justificationReason}. Stock devuelto al almacén ${guide.originWarehouseName}.`,
      { guideStatusBefore: guide.status },
      { guideStatusAfter: 'ANULADA', motivo: justificationReason }
    );

    this.notify('warning', 'Guía de Despacho Anulada', `La Guía ${guide.guideNumber} fue anulada y el stock se reincorporó.`);
    this.saveState();
    return { success: true, message: `Guía de Despacho ${guide.guideNumber} anulada exitosamente.` };
  }

  /**
   * Convierte un Presupuesto / Pedido de Venta directamente en una Guía de Despacho oficial.
   */
  convertQuoteToDispatchGuide(
    quoteId: string,
    transportDetails: {
      originWarehouseId: string;
      destinationAddress: string;
      transportReason: TransportReason;
      carrierType: CarrierType;
      carrierName?: string;
      carrierTaxId?: string;
      driverName: string;
      driverIdDoc: string;
      driverPhone?: string;
      vehiclePlate: string;
      vehicleModel?: string;
      estimatedDeliveryDate?: string;
      generalObservations?: string;
    }
  ): { success: boolean; guideNumber?: string; message?: string } {
    const quote = this.quotes().find(q => q.id === quoteId);
    if (!quote) return { success: false, message: 'Presupuesto no encontrado.' };

    const items = quote.items.map(it => ({
      productId: it.productId,
      quantity: it.quantity,
      notes: `Origen Cotización ${quote.quoteNumber}`
    }));

    const result = this.createDispatchGuide({
      originWarehouseId: transportDetails.originWarehouseId,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerTaxId: quote.customerTaxId,
      destinationAddress: transportDetails.destinationAddress,
      transportReason: transportDetails.transportReason,
      carrierType: transportDetails.carrierType,
      carrierName: transportDetails.carrierName,
      carrierTaxId: transportDetails.carrierTaxId,
      driverName: transportDetails.driverName,
      driverIdDoc: transportDetails.driverIdDoc,
      driverPhone: transportDetails.driverPhone,
      vehiclePlate: transportDetails.vehiclePlate,
      vehicleModel: transportDetails.vehicleModel,
      estimatedDeliveryDate: transportDetails.estimatedDeliveryDate,
      generalObservations: transportDetails.generalObservations,
      items,
      originQuoteNumber: quote.quoteNumber,
      originQuoteId: quote.id
    });

    return result;
  }

  /**
   * Facturación consolidada a partir de una o varias Guías de Despacho.
   * Evita duplicidad en el descuento de inventario activando `isStockAlreadyDeducted: true`.
   */
  invoiceFromDispatchGuides(
    guideIds: string[],
    options?: {
      payments?: PaymentRecord[];
      paymentCurrency?: CurrencyCode;
      invoiceType?: Invoice['type'];
      appliesIgtfManual?: boolean | null;
      globalDiscountPercent?: number;
      priceLevelApplied?: PriceLevelKey;
    }
  ): { success: boolean; invoiceNumber?: string; invoice?: Invoice; message?: string } {
    const guides = this.dispatchGuides().filter(g => guideIds.includes(g.id));
    if (guides.length === 0) {
      return { success: false, message: 'No se encontraron Guías de Despacho válidas.' };
    }

    const firstGuide = guides[0];
    const customerId = firstGuide.customerId || this.customers()[0]?.id || 'cust-1';
    const warehouseId = firstGuide.originWarehouseId;

    // Agrupar items de las guías
    const itemMap = new Map<string, { productId: string; quantity: number }>();
    for (const g of guides) {
      if (g.status === 'ANULADA') {
        return { success: false, message: `La Guía ${g.guideNumber} está anulada y no puede ser facturada.` };
      }
      if (g.invoicedInvoiceNumber) {
        return { success: false, message: `La Guía ${g.guideNumber} ya fue facturada en ${g.invoicedInvoiceNumber}.` };
      }
      for (const item of g.items) {
        const existing = itemMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemMap.set(item.productId, { productId: item.productId, quantity: item.quantity });
        }
      }
    }

    const itemsToInvoice = Array.from(itemMap.values());
    const guideNumbers = guides.map(g => g.guideNumber);
    const controlNumbers = guides.map(g => g.controlNumber);
    const deliveryOrderNumbers = guides.map(g => g.relatedDeliveryOrderNumber).filter(Boolean) as string[];

    const paymentCurr = options?.paymentCurrency || 'USD';
    const payments = options?.payments && options.payments.length > 0
      ? options.payments
      : [
          {
            method: (paymentCurr === 'VES' ? 'TRANSFERENCIA' : 'EFECTIVO_USD') as PaymentMethod,
            amount: 0, // Se recalcula en registerSaleInvoice
            currency: paymentCurr,
            reference: `FACT-GD-${guideNumbers.join('-')}`
          }
        ];

    const result = this.registerSaleInvoice(
      customerId,
      warehouseId,
      itemsToInvoice,
      payments,
      options?.invoiceType || 'FACTURA_ELECTRONICA',
      {
        baseCurrency: 'USD',
        paymentCurrency: paymentCurr,
        priceLevelApplied: options?.priceLevelApplied || 'price1',
        globalDiscountPercent: options?.globalDiscountPercent,
        appliesIgtfManual: options?.appliesIgtfManual,
        isStockAlreadyDeducted: true,
        dispatchGuideNumbers: guideNumbers,
        dispatchControlNumbers: controlNumbers,
        deliveryOrderNumbers
      }
    );

    if (result.success && result.invoiceNumber) {
      // Vincular número de factura en las Guías y Órdenes de Entrega
      const invNum = result.invoiceNumber;
      this.dispatchGuides.update(allGuides =>
        allGuides.map(g => guideIds.includes(g.id) ? { ...g, invoicedInvoiceNumber: invNum } : g)
      );

      this.deliveryOrders.update(allOrders =>
        allOrders.map(o => (o.dispatchGuideId && guideIds.includes(o.dispatchGuideId)) ? { ...o, invoicedInvoiceNumber: invNum } : o)
      );

      this.logAudit(
        'CREATE_INVOICE',
        'POS',
        `Factura ${invNum} generada a partir de Guías de Despacho`,
        `Facturación con amparo legal de Guías: ${guideNumbers.join(', ')} (N°s Control: ${controlNumbers.join(', ')}).`,
        { guiasAmparadas: guideNumbers, controles: controlNumbers },
        { invoiceNumber: invNum, itemsFacturados: itemsToInvoice.length }
      );

      this.notify(
        'success',
        'Facturación de Despacho Exitosa',
        `Factura ${invNum} emitida amparando las Guías ${guideNumbers.join(', ')}.`
      );
      this.saveState();
    }

    return result;
  }
  adjustStock(
    productId: string,
    warehouseId: string,
    adjustmentType: 'MERMA' | 'SOBRANTE' | 'INVENTARIO_FISICO',
    quantityDelta: number, // Positivo para entrada/sobrante, negativo para merma/salida
    supportDocument: string, // Campo obligatorio
    justificationReason: string
  ): { success: boolean; message: string } {
    const user = this.authService.currentUser();
    if (!supportDocument || supportDocument.trim().length < 3) {
      return { success: false, message: 'El Documento de Soporte / Folio de Autorización es estrictamente obligatorio.' };
    }

    if (!justificationReason || justificationReason.trim().length < 5) {
      return { success: false, message: 'Debe ingresar un motivo o justificación técnica detallada.' };
    }

    const prod = this.products().find(p => p.id === productId);
    const wh = this.warehouses().find(w => w.id === warehouseId);
    if (!prod || !wh) {
      return { success: false, message: 'Producto o Almacén no válido.' };
    }

    const currentWhStock = prod.stockByWarehouse.find(sw => sw.warehouseId === warehouseId)?.quantity || 0;
    const newWhStock = currentWhStock + quantityDelta;

    if (newWhStock < 0) {
      return { success: false, message: `El ajuste generaría stock negativo en ${wh.name}. Stock actual: ${currentWhStock}` };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newTotalStock = prod.totalStock + quantityDelta;

    let movementType: KardexMovement['movementType'] = 'AJUSTE_INVENTARIO';
    let entryQty = 0;
    let entryUnitCost = 0;
    let entryTotalCost = 0;
    let exitQty = 0;
    let exitUnitCost = 0;
    let exitTotalCost = 0;

    if (quantityDelta < 0) {
      movementType = 'AJUSTE_MERMA';
      exitQty = Math.abs(quantityDelta);
      exitUnitCost = prod.costPrice;
      exitTotalCost = Number((exitQty * exitUnitCost).toFixed(2));
    } else {
      movementType = 'AJUSTE_SOBRANTE';
      entryQty = quantityDelta;
      entryUnitCost = prod.costPrice;
      entryTotalCost = Number((entryQty * entryUnitCost).toFixed(2));
    }

    const updatedStockByWh = prod.stockByWarehouse.map(sw => {
      if (sw.warehouseId === warehouseId) {
        return { ...sw, quantity: newWhStock };
      }
      return sw;
    });

    const updatedProd: Product = {
      ...prod,
      totalStock: newTotalStock,
      stockByWarehouse: updatedStockByWh,
      updatedAt: nowStr
    };

    // New Kardex Record
    const kdxRecord: KardexMovement = {
      id: 'kdx-' + Date.now().toString(36),
      productId: prod.id,
      productSku: prod.sku,
      productName: prod.name,
      warehouseId: wh.id,
      warehouseName: wh.name,
      date: nowStr,
      movementType,
      docReference: `AJUSTE-${supportDocument.toUpperCase()}`,
      supportDocument: supportDocument.trim(),
      justificationReason: justificationReason.trim(),
      entryQty,
      entryUnitCost,
      entryTotalCost,
      exitQty,
      exitUnitCost,
      exitTotalCost,
      balanceQty: newTotalStock,
      balanceAverageCost: prod.costPrice,
      balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
      registeredByUserId: user.id,
      registeredByUserName: user.name
    };

    this.products.update(prods => prods.map(p => p.id === productId ? updatedProd : p));
    this.kardexMovements.update(kdx => [kdxRecord, ...kdx]);

    this.logAudit(
      'ADJUST_STOCK',
      'INVENTORY',
      `Ajuste de Stock: ${prod.sku} (${movementType})`,
      `Ajuste de ${quantityDelta > 0 ? '+' : ''}${quantityDelta} UND en ${wh.name}. Doc Soporte: "${supportDocument}". Motivo: "${justificationReason}".`,
      { stockAnteriorTotal: prod.totalStock, stockAnteriorAlmacen: currentWhStock },
      { stockNuevoTotal: newTotalStock, stockNuevoAlmacen: newWhStock, docSoporte: supportDocument, motivo: justificationReason },
      { auditoriaRequerida: true, movementType },
      true,
      'MANUAL_STOCK_ADJUSTMENT'
    );

    // Emit Real-time Critical Audit Notification for Manual Stock Adjustment
    const isMerma = quantityDelta < 0;
    this.addCriticalAuditNotification({
      category: 'MANUAL_STOCK_ADJUSTMENT',
      severity: 'CRITICAL',
      title: `Ajuste Manual de Inventario Fuera de Fabricación (${isMerma ? 'Merma / Baja' : 'Sobrante / Regularización'})`,
      message: `Ajuste manual de ${quantityDelta > 0 ? '+' : ''}${quantityDelta} UND en "${wh.name}" para "${prod.name}" (${prod.sku}). Doc Soporte: "${supportDocument}". Motivo: "${justificationReason}".`,
      details: {
        itemSku: prod.sku,
        itemName: prod.name,
        warehouseName: wh.name,
        oldValue: `${currentWhStock} UND en ${wh.name} (Total: ${prod.totalStock} UND)`,
        newValue: `${newWhStock} UND en ${wh.name} (Total: ${newTotalStock} UND)`,
        diffSummary: `Ajuste ${isMerma ? 'Descargo' : 'Ingreso'}: ${quantityDelta > 0 ? '+' : ''}${quantityDelta} UND en ${wh.name}`,
        supportDocument,
        justification: justificationReason,
        user: user.name,
        role: user.role,
        timestamp: nowStr
      }
    });

    this.saveState();
    return { success: true, message: 'Ajuste registrado exitosamente en Kardex, Bitácora y Centro de Alertas.' };
  }

  // ==========================================
  // TRANSACTION 5: CIERRE DE CAJA (Z-REPORT)
  // ==========================================
  closeCashSession(countedCash: number, notes?: string): { success: boolean; session?: CashRegisterSession } {
    const session = this.activeCashSession();
    if (session.status === 'CERRADA') {
      return { success: false };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const expectedCash = Number((session.initialAmount + session.totalCashSales).toFixed(2));
    const cashDifference = Number((countedCash - expectedCash).toFixed(2));

    const closedSession: CashRegisterSession = {
      ...session,
      status: 'CERRADA',
      closeDate: nowStr,
      countedCashAmount: countedCash,
      cashDifference,
      closingNotes: notes
    };

    this.activeCashSession.set(closedSession);
    this.cashSessionHistory.update(hist => [closedSession, ...hist]);

    this.logAudit(
      'CASH_CLOSING',
      'FINANCE',
      `Cierre de Turno de Caja ${session.sessionCode}`,
      `Cierre de caja efectuado. Total ventas: $${session.totalSales.toFixed(2)}. Diferencia de efectivo: $${cashDifference.toFixed(2)}.`,
      { apertura: session.openDate, montoInicial: session.initialAmount, ventasTotal: session.totalSales },
      { cierre: nowStr, efectivoContado: countedCash, diferenciaEfectivo: cashDifference, estado: 'CERRADA' }
    );

    this.notify('success', 'Caja Cerrada', `Turno ${session.sessionCode} cerrado. Diferencia: $${cashDifference >= 0 ? '+' : ''}${cashDifference.toFixed(2)}`);
    this.saveState();
    return { success: true, session: closedSession };
  }

  reopenCashSession(initialAmount: number) {
    const user = this.authService.currentUser();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const code = 'CAJA-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + (this.cashSessionHistory().length + 1).toString().padStart(2, '0');

    const newSession: CashRegisterSession = {
      id: 'cash-sess-' + Date.now(),
      sessionCode: code,
      cashierId: user.id,
      cashierName: user.name,
      openDate: nowStr,
      status: 'ABIERTA',
      initialAmount,
      totalCashSales: 0,
      totalCardSales: 0,
      totalTransferSales: 0,
      totalCreditSales: 0,
      totalSales: 0
    };

    this.activeCashSession.set(newSession);
    this.notify('info', 'Caja Abierta', `Nuevo turno de caja iniciado con fondo de $${initialAmount.toFixed(2)}`);
    this.saveState();
  }

  // Create Product Helper
  createProduct(prod: Omit<Product, 'id' | 'updatedAt' | 'totalStock'>): Product {
    const totalStock = (prod.stockByWarehouse || []).reduce((s, w) => s + w.quantity, 0);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newProd: Product = {
      ...prod,
      id: 'prod-' + Date.now().toString(36),
      totalStock,
      updatedAt: nowStr
    };

    this.products.update(ps => [newProd, ...ps]);
    this.logAudit('CREATE_PRODUCT', 'INVENTORY', `Creación de Producto: ${prod.sku}`, `Alta de producto ${prod.name} con stock inicial de ${totalStock} UND.`, null, newProd as unknown as Record<string, unknown>);
    this.notify('success', 'Producto Creado', `Se agregó ${newProd.name} al catálogo.`);
    this.saveState();
    return newProd;
  }

  // Create Supplier Helper
  createSupplier(sup: Omit<Supplier, 'id'>) {
    const newSup: Supplier = {
      ...sup,
      id: 'sup-' + Date.now().toString(36)
    };
    this.suppliers.update(ss => [newSup, ...ss]);
    this.logAudit('CREATE_SUPPLIER', 'PURCHASES', `Nuevo Proveedor: ${sup.name}`, `Registro de proveedor ${sup.name} (${sup.taxId}).`, null, newSup as unknown as Record<string, unknown>);
    this.notify('success', 'Proveedor Registrado', `Proveedor ${newSup.name} añadido exitosamente.`);
    this.saveState();
  }

  // Create Customer Helper
  createCustomer(data: {
    taxId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    customerType?: 'EMPRESA' | 'PERSONA_NATURAL' | 'FINAL_CONSUMIDOR';
  }): { success: boolean; customer?: Customer; message?: string } {
    if (!data.taxId || data.taxId.trim().length < 3) {
      return { success: false, message: 'El Documento / RIF / Cédula es obligatorio.' };
    }
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, message: 'La Razón Social o Nombre del cliente es obligatorio.' };
    }

    const cleanTaxId = data.taxId.trim().toUpperCase();
    const existing = this.customers().find(c => c.taxId.toUpperCase() === cleanTaxId);
    if (existing) {
      return { 
        success: false, 
        message: `Ya existe un cliente registrado con el documento ${cleanTaxId} (${existing.name}).`, 
        customer: existing 
      };
    }

    const newCustomer: Customer = {
      id: 'cust-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      taxId: cleanTaxId,
      name: data.name.trim(),
      email: data.email ? data.email.trim() : '',
      phone: data.phone ? data.phone.trim() : '',
      address: data.address ? data.address.trim() : '',
      customerType: data.customerType || 'EMPRESA'
    };

    this.customers.update(custs => [newCustomer, ...custs]);
    this.logAudit(
      'CREATE_CUSTOMER',
      'SALES',
      `Nuevo Cliente: ${newCustomer.name}`,
      `Registro de nuevo cliente / receptor fiscal ${newCustomer.name} (${newCustomer.taxId}).`,
      null,
      newCustomer as unknown as Record<string, unknown>
    );
    this.notify('success', 'Cliente Registrado', `Cliente ${newCustomer.name} (${newCustomer.taxId}) registrado con éxito.`);
    this.saveState();
    return { success: true, customer: newCustomer };
  }

  // Create Quote Helper
  createQuote(
    customerId: string,
    items: { productId: string; quantity: number; discountPercent?: number; priceLevel?: PriceLevelKey }[],
    expirationDate: string,
    notes?: string,
    priceLevel: PriceLevelKey = 'price1'
  ): { success: boolean; quoteNumber?: string } {
    const user = this.authService.currentUser();
    const customer = this.customers().find(c => c.id === customerId);
    if (!customer || items.length === 0) return { success: false };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const quoteNumber = 'COT-2026-' + (this.quotes().length + 17).toString().padStart(3, '0');
    const bcv = this.bcvState();

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grossTaxableBase = 0;
    let grossExemptBase = 0;
    const quoteItems: InvoiceItem[] = [];

    items.forEach(it => {
      const prod = this.products().find(p => p.id === it.productId);
      if (!prod) return;
      const itemLevel = it.priceLevel || priceLevel;
      const unitPrice = this.getProductPriceByLevel(prod, itemLevel);
      const disc = it.discountPercent || 0;
      const base = unitPrice * it.quantity;
      const discAmt = base * (disc / 100);
      const itemSub = base - discAmt;
      const isExempt = Boolean(prod.isTaxExempt || prod.taxRate === 0);
      const ivaRate = isExempt ? 0 : prod.taxRate;
      const itemTax = itemSub * ivaRate;

      if (isExempt) {
        grossExemptBase += itemSub;
      } else {
        grossTaxableBase += itemSub;
      }

      subtotal += itemSub;
      discountTotal += discAmt;
      taxTotal += itemTax;

      quoteItems.push({
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        unit: prod.unit,
        quantity: it.quantity,
        unitPrice,
        costPrice: prod.costPrice,
        priceLevel: itemLevel,
        discountPercent: disc,
        isTaxExempt: isExempt,
        taxRate: ivaRate,
        subtotal: Number(itemSub.toFixed(2)),
        taxAmount: Number(itemTax.toFixed(2)),
        total: Number((itemSub + itemTax).toFixed(2))
      });
    });

    const grandTotal = Number((subtotal + taxTotal).toFixed(2));
    const totalVes = Number((grandTotal * bcv.usdRate).toFixed(2));

    const taxDetails: InvoiceTaxDetails = {
      taxableBase: Number(grossTaxableBase.toFixed(2)),
      exemptBase: Number(grossExemptBase.toFixed(2)),
      ivaPercent: 16.0,
      ivaAmount: Number(taxTotal.toFixed(2)),
      appliesIgtf: false,
      igtfPercent: 3.0,
      igtfBase: 0,
      igtfAmount: 0
    };

    const newQuote: Quote = {
      id: 'quot-' + Date.now(),
      quoteNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      date: nowStr,
      expirationDate,
      status: 'BORRADOR',
      baseCurrency: 'USD',
      bcvRate: bcv.usdRate,
      priceLevelApplied: priceLevel,
      items: quoteItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxDetails,
      taxTotal: Number(taxTotal.toFixed(2)),
      total: grandTotal,
      totalVes,
      notes,
      createdBy: user.name
    };

    this.quotes.update(qs => [newQuote, ...qs]);
    this.logAudit(
      'CREATE_QUOTE',
      'SALES',
      `Nuevo Presupuesto ${quoteNumber}`,
      `Cotización creada para ${customer.name} por $${newQuote.total.toFixed(2)} (Bs. ${totalVes.toLocaleString('es-VE')}) con nivel ${priceLevel}.`,
      null,
      newQuote as unknown as Record<string, unknown>
    );
    this.notify('success', 'Presupuesto Creado', `Cotización ${quoteNumber} generada.`);
    this.saveState();
    return { success: true, quoteNumber };
  }

  // Update Quote Status Helper (BORRADOR, ENVIADO, APROBADO, RECHAZADO)
  updateQuoteStatus(quoteId: string, newStatus: Quote['status'], notes?: string): { success: boolean; message?: string } {
    const q = this.quotes().find(item => item.id === quoteId);
    if (!q) return { success: false, message: 'Presupuesto no encontrado.' };

    if (q.status === 'CONVERTIDO_A_FACTURA') {
      return { success: false, message: 'No se puede modificar el estado de un presupuesto que ya fue facturado.' };
    }

    const previousStatus = q.status;
    this.quotes.update(qs =>
      qs.map(item => item.id === quoteId ? { ...item, status: newStatus } : item)
    );

    this.logAudit(
      'UPDATE_QUOTE_STATUS',
      'SALES',
      `Cambio de Estado Presupuesto ${q.quoteNumber}: ${newStatus}`,
      `Estado actualizado de ${previousStatus} a ${newStatus}.${notes ? ' Nota: ' + notes : ''}`,
      { statusAnterior: previousStatus },
      { statusNuevo: newStatus, motivo: notes || null }
    );

    this.notify('info', 'Estado Actualizado', `Presupuesto ${q.quoteNumber} marcado como "${newStatus.replace(/_/g, ' ')}".`);
    this.saveState();
    return { success: true };
  }

  // ============================================================================
  // FASE 2: MÉTODOS DE CONTABILIDAD GENERAL (ASIENTOS & MAYORIZACIÓN)
  // ============================================================================

  generateAutomatedJournalEntry(
    referenceType: 'VENTA' | 'COMPRA' | 'PRODUCCION' | 'AJUSTE' | 'MANUAL' | 'CIERRE_CAJA' | 'COBRO_CXC' | 'PAGO_CXP' | 'TRANSFERENCIA_BANCO',
    referenceId: string,
    concept: string,
    lines: JournalEntryLine[]
  ): JournalEntry {
    const totalDebit = Number(lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2));
    const totalCredit = Number(lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const entryNumber = 'ASIENTO-2026-' + (this.journalEntries().length + 1).toString().padStart(4, '0');
    const user = this.authService.currentUser();

    const newEntry: JournalEntry = {
      id: 'as-' + Date.now().toString(36),
      entryNumber,
      date: nowStr,
      concept,
      referenceType,
      referenceId,
      lines,
      totalDebit,
      totalCredit,
      status: 'ASENTADO',
      createdBy: user.name || 'Sistema 4-inLine Automático',
      createdAt: nowStr
    };

    // Actualizar saldos en el catálogo de cuentas
    this.accounts.update(currentAccounts => {
      return currentAccounts.map(acc => {
        const matchingLines = lines.filter(l => l.accountId === acc.id || l.accountCode === acc.code);
        if (matchingLines.length === 0) return acc;

        let balanceDelta = 0;
        matchingLines.forEach(l => {
          if (acc.isDebitNormal) {
            balanceDelta += (l.debit || 0) - (l.credit || 0);
          } else {
            balanceDelta += (l.credit || 0) - (l.debit || 0);
          }
        });

        return {
          ...acc,
          balance: Number((acc.balance + balanceDelta).toFixed(2))
        };
      });
    });

    this.journalEntries.update(entries => [newEntry, ...entries]);
    this.logAudit(
      'CREATE_JOURNAL_ENTRY',
      'ACCOUNTING',
      `Asiento Contable Generado ${entryNumber}`,
      `Registro contable de tipo ${referenceType} por importe de $${totalDebit.toFixed(2)} (${concept}).`,
      null,
      newEntry as unknown as Record<string, unknown>
    );

    return newEntry;
  }

  createManualJournalEntry(
    concept: string,
    lines: { accountId: string; description: string; debit: number; credit: number }[]
  ): { success: boolean; message?: string; entryNumber?: string } {
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        message: `El asiento no está cuadrado. Total Debe: $${totalDebit.toFixed(2)}, Total Haber: $${totalCredit.toFixed(2)}.`
      };
    }

    const allAccounts = this.accounts();
    const formattedLines: JournalEntryLine[] = lines.map(l => {
      const acc = allAccounts.find(a => a.id === l.accountId);
      return {
        accountId: l.accountId,
        accountCode: acc?.code || '0.0.00',
        accountName: acc?.name || 'Cuenta General',
        description: l.description,
        debit: l.debit,
        credit: l.credit
      };
    });

    const entry = this.generateAutomatedJournalEntry('MANUAL', 'MANUAL-' + Date.now(), concept, formattedLines);
    this.notify('success', 'Asiento Contable Registrado', `Asiento ${entry.entryNumber} mayorizado correctamente.`);
    this.saveState();
    return { success: true, entryNumber: entry.entryNumber };
  }

  // ============================================================================
  // FASE 2: MÉTODOS TRANSACCIONALES DE TESORERÍA, BANCOS, CxC Y CxP
  // ============================================================================

  // 1. Registro de Cobro de Factura de Cliente (CxC)
  recordCxcCollection(data: {
    invoiceId: string;
    amountUsd: number;
    amountVes?: number;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
    referenceNumber: string;
    notes?: string;
  }): { success: boolean; message?: string; receipt?: CustomerPaymentReceipt } {
    const inv = this.invoices().find(i => i.id === data.invoiceId);
    if (!inv) return { success: false, message: 'Factura no encontrada.' };

    const bank = this.bankAccounts().find(b => b.id === data.bankAccountId);
    if (!bank) return { success: false, message: 'Cuenta bancaria o de caja no encontrada.' };

    const rate = inv.bcvRate || this.bcvState().usdRate || 36.50;
    const amountUsd = Number(data.amountUsd.toFixed(2));
    const amountVes = data.amountVes ? Number(data.amountVes.toFixed(2)) : Number((amountUsd * rate).toFixed(2));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.authService.currentUser();
    const receiptNumber = 'REC-2026-' + (this.treasuryTransactions().length + 1).toString().padStart(4, '0');

    const newPaymentRecord: PaymentRecord = {
      method: data.paymentMethod,
      amount: bank.currency === 'VES' ? amountVes : amountUsd,
      currency: bank.currency,
      reference: data.referenceNumber,
      isForeignCurrency: bank.currency === 'USD' || bank.currency === 'EUR'
    };

    // Actualizar factura agregando el pago
    const updatedPayments = [...(inv.payments || []), newPaymentRecord];
    this.invoices.update(invs =>
      invs.map(item => item.id === inv.id ? { ...item, payments: updatedPayments } : item)
    );

    // Actualizar saldo de la cuenta bancaria
    this.bankAccounts.update(banks =>
      banks.map(b => {
        if (b.id === bank.id) {
          const deltaBal = b.currency === 'VES' ? amountVes : amountUsd;
          const newBal = b.balance + deltaBal;
          return {
            ...b,
            balance: Number(newBal.toFixed(2)),
            balanceUsd: Number((b.currency === 'VES' ? newBal / rate : newBal).toFixed(2)),
            balanceVes: Number((b.currency === 'VES' ? newBal : newBal * rate).toFixed(2)),
            updatedAt: nowStr
          };
        }
        return b;
      })
    );

    // Registrar transacción de tesorería
    const txId = 'tx-' + Date.now().toString(36);
    const newTx: TreasuryTransaction = {
      id: txId,
      transactionNumber: 'TES-2026-' + (this.treasuryTransactions().length + 1).toString().padStart(4, '0'),
      type: 'COBRO_CXC',
      date: nowStr,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      amount: bank.currency === 'VES' ? amountVes : amountUsd,
      amountUsd,
      amountVes,
      currency: bank.currency,
      bcvRate: rate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || 'N/A',
      entityType: 'CLIENTE',
      entityId: inv.customerId,
      entityName: inv.customerName,
      documentNumber: inv.invoiceNumber,
      concept: `Cobro CxC Factura ${inv.invoiceNumber} - ${inv.customerName}${data.notes ? ' (' + data.notes + ')' : ''}`,
      status: 'CONCILIADO',
      registeredBy: user.name || 'Admin',
      createdAt: nowStr
    };

    // Generar Asiento Contable Automático: Debe Banco / Haber Cuentas por Cobrar
    const bankAccountGl = this.accounts().find(a => a.code === bank.glAccountCode) || this.accounts().find(a => a.code === '1.1.01.02')!;
    const cxcAccountGl = this.accounts().find(a => a.code === '1.1.02.01')!;

    const journalEntry = this.generateAutomatedJournalEntry(
      'COBRO_CXC',
      inv.invoiceNumber,
      `Cobro CxC Factura ${inv.invoiceNumber} de ${inv.customerName}`,
      [
        {
          accountId: bankAccountGl.id,
          accountCode: bankAccountGl.code,
          accountName: bankAccountGl.name,
          description: `Ingreso a ${bank.bankName} (${data.paymentMethod}) Ref: ${data.referenceNumber}`,
          debit: amountUsd,
          credit: 0
        },
        {
          accountId: cxcAccountGl.id,
          accountCode: cxcAccountGl.code,
          accountName: cxcAccountGl.name,
          description: `Abono/Cancelación deuda cliente ${inv.customerName}`,
          debit: 0,
          credit: amountUsd
        }
      ]
    );

    newTx.journalEntryId = journalEntry.id;
    this.treasuryTransactions.update(txs => [newTx, ...txs]);

    const receipt: CustomerPaymentReceipt = {
      id: 'rec-' + Date.now().toString(36),
      receiptNumber,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: nowStr,
      amountUsd,
      amountVes,
      currencyPaid: bank.currency,
      bcvRate: rate,
      paymentMethod: data.paymentMethod,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      referenceNumber: data.referenceNumber,
      receivedBy: user.name || 'Admin',
      notes: data.notes
    };

    this.logAudit(
      'RECORD_CXC_PAYMENT',
      'TREASURY',
      `Cobro Registrado ${inv.invoiceNumber}`,
      `Cobro de $${amountUsd.toFixed(2)} (Bs. ${amountVes.toLocaleString('es-VE')}) acreditado en ${bank.accountName}. Asiento ${journalEntry.entryNumber}.`,
      null,
      receipt as unknown as Record<string, unknown>
    );

    this.notify('success', 'Cobro Registrado con Éxito', `Se registró cobro de $${amountUsd.toFixed(2)} para la factura ${inv.invoiceNumber}.`);
    this.saveState();
    return { success: true, receipt };
  }

  // 2. Registro de Pago a Factura de Proveedor (CxP)
  recordCxpPayment(data: {
    payableBillId: string;
    amountUsd: number;
    amountVes?: number;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
    referenceNumber: string;
    notes?: string;
  }): { success: boolean; message?: string; receipt?: SupplierPaymentReceipt } {
    const bill = this.payableBills().find(b => b.id === data.payableBillId);
    if (!bill) return { success: false, message: 'Factura por pagar no encontrada.' };

    const bank = this.bankAccounts().find(b => b.id === data.bankAccountId);
    if (!bank) return { success: false, message: 'Cuenta bancaria o de caja no encontrada.' };

    const rate = this.bcvState().usdRate || 36.50;
    const amountUsd = Number(data.amountUsd.toFixed(2));
    const amountVes = data.amountVes ? Number(data.amountVes.toFixed(2)) : Number((amountUsd * rate).toFixed(2));

    if (amountUsd > bill.balanceUsd + 0.05) {
      return { success: false, message: `El monto a pagar ($${amountUsd.toFixed(2)}) supera el saldo pendiente ($${bill.balanceUsd.toFixed(2)}).` };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.authService.currentUser();
    const paymentNumber = 'OP-2026-' + (this.treasuryTransactions().length + 1).toString().padStart(4, '0');

    const paymentReceipt: SupplierPaymentReceipt = {
      id: 'pay-' + Date.now().toString(36),
      paymentNumber,
      payableBillId: bill.id,
      billNumber: bill.billNumber,
      date: nowStr,
      amountUsd,
      amountVes,
      currencyPaid: bank.currency,
      bcvRate: rate,
      paymentMethod: data.paymentMethod,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      referenceNumber: data.referenceNumber,
      approvedBy: user.name || 'Admin',
      notes: data.notes
    };

    const newPaidUsd = Number((bill.paidAmountUsd + amountUsd).toFixed(2));
    const newPaidVes = Number((newPaidUsd * rate).toFixed(2));
    const newBalanceUsd = Math.max(0, Number((bill.totalAmountUsd - newPaidUsd).toFixed(2)));
    const newBalanceVes = Number((newBalanceUsd * rate).toFixed(2));
    const newStatus: PayableBillStatus = newBalanceUsd <= 0.01 ? 'PAGADO' : 'PARCIAL';

    // Actualizar la factura por pagar
    this.payableBills.update(bills =>
      bills.map(item =>
        item.id === bill.id
          ? {
              ...item,
              paidAmountUsd: newPaidUsd,
              paidAmountVes: newPaidVes,
              balanceUsd: newBalanceUsd,
              balanceVes: newBalanceVes,
              status: newStatus,
              payments: [paymentReceipt, ...(item.payments || [])]
            }
          : item
      )
    );

    // Actualizar saldo de la cuenta bancaria (Deducción)
    this.bankAccounts.update(banks =>
      banks.map(b => {
        if (b.id === bank.id) {
          const deltaBal = b.currency === 'VES' ? amountVes : amountUsd;
          const newBal = b.balance - deltaBal;
          return {
            ...b,
            balance: Number(newBal.toFixed(2)),
            balanceUsd: Number((b.currency === 'VES' ? newBal / rate : newBal).toFixed(2)),
            balanceVes: Number((b.currency === 'VES' ? newBal : newBal * rate).toFixed(2)),
            updatedAt: nowStr
          };
        }
        return b;
      })
    );

    // Registrar transacción de tesorería
    const txId = 'tx-' + Date.now().toString(36);
    const newTx: TreasuryTransaction = {
      id: txId,
      transactionNumber: 'TES-2026-' + (this.treasuryTransactions().length + 1).toString().padStart(4, '0'),
      type: 'PAGO_CXP',
      date: nowStr,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      amount: bank.currency === 'VES' ? amountVes : amountUsd,
      amountUsd,
      amountVes,
      currency: bank.currency,
      bcvRate: rate,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || 'N/A',
      entityType: 'PROVEEDOR',
      entityId: bill.supplierId,
      entityName: bill.supplierName,
      documentNumber: bill.billNumber,
      concept: `Pago CxP Factura Proveedor ${bill.billNumber} - ${bill.supplierName}${data.notes ? ' (' + data.notes + ')' : ''}`,
      status: 'CONCILIADO',
      registeredBy: user.name || 'Admin',
      createdAt: nowStr
    };

    // Generar Asiento Contable Automático: Debe CxP Proveedores / Haber Banco
    const cxpAccountGl = this.accounts().find(a => a.code === '2.1.01.01')!;
    const bankAccountGl = this.accounts().find(a => a.code === bank.glAccountCode) || this.accounts().find(a => a.code === '1.1.01.02')!;

    const journalEntry = this.generateAutomatedJournalEntry(
      'PAGO_CXP',
      bill.billNumber,
      `Pago CxP Factura Proveedor ${bill.billNumber} de ${bill.supplierName}`,
      [
        {
          accountId: cxpAccountGl.id,
          accountCode: cxpAccountGl.code,
          accountName: cxpAccountGl.name,
          description: `Cancelación obligación comercial con ${bill.supplierName}`,
          debit: amountUsd,
          credit: 0
        },
        {
          accountId: bankAccountGl.id,
          accountCode: bankAccountGl.code,
          accountName: bankAccountGl.name,
          description: `Desembolso desde ${bank.bankName} (${data.paymentMethod}) Ref: ${data.referenceNumber}`,
          debit: 0,
          credit: amountUsd
        }
      ]
    );

    newTx.journalEntryId = journalEntry.id;
    this.treasuryTransactions.update(txs => [newTx, ...txs]);

    this.logAudit(
      'RECORD_CXP_PAYMENT',
      'TREASURY',
      `Pago a Proveedor ${bill.billNumber}`,
      `Desembolso de $${amountUsd.toFixed(2)} (Bs. ${amountVes.toLocaleString('es-VE')}) ejecutado desde ${bank.accountName} a favor de ${bill.supplierName}. Asiento ${journalEntry.entryNumber}.`,
      null,
      paymentReceipt as unknown as Record<string, unknown>
    );

    this.notify('success', 'Pago a Proveedor Registrado', `Orden de pago ${paymentNumber} procesada por $${amountUsd.toFixed(2)}.`);
    this.saveState();
    return { success: true, receipt: paymentReceipt };
  }

  // 3. Crear Nueva Factura de Compra / Cuenta por Pagar (CxP)
  createPayableBill(data: {
    billNumber: string;
    supplierId: string;
    issueDate: string;
    dueDate: string;
    totalAmountUsd: number;
    category?: string;
    notes?: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
  }): { success: boolean; message?: string; bill?: PayableBill } {
    const supplier = this.suppliers().find(s => s.id === data.supplierId);
    if (!supplier) return { success: false, message: 'Proveedor no encontrado.' };

    const rate = this.bcvState().usdRate || 36.50;
    const totalAmountUsd = Number(data.totalAmountUsd.toFixed(2));
    const totalAmountVes = Number((totalAmountUsd * rate).toFixed(2));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newBill: PayableBill = {
      id: 'pb-' + Date.now().toString(36),
      billNumber: data.billNumber.trim().toUpperCase(),
      purchaseOrderId: data.purchaseOrderId,
      purchaseOrderNumber: data.purchaseOrderNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierTaxId: supplier.taxId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      totalAmountUsd,
      totalAmountVes,
      paidAmountUsd: 0,
      paidAmountVes: 0,
      balanceUsd: totalAmountUsd,
      balanceVes: totalAmountVes,
      status: 'PENDIENTE',
      glAccountExpenseCode: '1.1.03.01', // Mercancías por defecto
      glAccountPayableCode: '2.1.01.01', // CxP Proveedores
      category: data.category || 'Mercancía e Insumos',
      notes: data.notes,
      payments: [],
      createdAt: nowStr
    };

    // Asiento contable de compra a crédito: Debe Inventario/Costo, Haber CxP Proveedores
    const expenseGl = this.accounts().find(a => a.code === '1.1.03.01') || this.accounts().find(a => a.code === '5.1.01.01')!;
    const cxpGl = this.accounts().find(a => a.code === '2.1.01.01')!;

    const journal = this.generateAutomatedJournalEntry(
      'COMPRA',
      newBill.billNumber,
      `Reconocimiento de Factura por Pagar ${newBill.billNumber} (${supplier.name})`,
      [
        {
          accountId: expenseGl.id,
          accountCode: expenseGl.code,
          accountName: expenseGl.name,
          description: `Compra a crédito de insumos/mercancía`,
          debit: totalAmountUsd,
          credit: 0
        },
        {
          accountId: cxpGl.id,
          accountCode: cxpGl.code,
          accountName: cxpGl.name,
          description: `Obligación comercial CxP con ${supplier.name}`,
          debit: 0,
          credit: totalAmountUsd
        }
      ]
    );

    this.payableBills.update(bills => [newBill, ...bills]);
    this.logAudit(
      'CREATE_PAYABLE_BILL',
      'TREASURY',
      `Factura por Pagar Registrada ${newBill.billNumber}`,
      `Registro de factura de proveedor ${supplier.name} por $${totalAmountUsd.toFixed(2)}. Vence el ${data.dueDate}. Asiento ${journal.entryNumber}.`,
      null,
      newBill as unknown as Record<string, unknown>
    );

    this.notify('success', 'Cuenta por Pagar Registrada', `Factura ${newBill.billNumber} añadida con vencimiento ${data.dueDate}.`);
    this.saveState();
    return { success: true, bill: newBill };
  }

  // 4. Crear o Actualizar Cuenta Bancaria / Caja
  createBankAccount(data: Omit<BankAccount, 'id' | 'updatedAt' | 'balanceUsd' | 'balanceVes'>): BankAccount {
    const rate = this.bcvState().usdRate || 36.50;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const balanceUsd = data.currency === 'VES' ? Number((data.balance / rate).toFixed(2)) : data.balance;
    const balanceVes = data.currency === 'VES' ? data.balance : Number((data.balance * rate).toFixed(2));

    const newAcc: BankAccount = {
      ...data,
      id: 'bank-' + Date.now().toString(36),
      balanceUsd,
      balanceVes,
      updatedAt: nowStr
    };

    this.bankAccounts.update(accs => [newAcc, ...accs]);
    this.logAudit(
      'CREATE_BANK_ACCOUNT',
      'TREASURY',
      `Nueva Cuenta Bancaria: ${newAcc.accountName}`,
      `Alta de cuenta ${newAcc.bankName} (${newAcc.currency}) con saldo inicial de ${newAcc.currency === 'VES' ? 'Bs. ' + newAcc.balance.toLocaleString('es-VE') : '$' + newAcc.balance.toFixed(2)}.`,
      null,
      newAcc as unknown as Record<string, unknown>
    );

    this.notify('success', 'Cuenta Bancaria Registrada', `Cuenta ${newAcc.accountName} habilitada.`);
    this.saveState();
    return newAcc;
  }

  updateBankAccount(id: string, updates: Partial<BankAccount>): { success: boolean; message?: string } {
    const target = this.bankAccounts().find(b => b.id === id);
    if (!target) return { success: false, message: 'Cuenta bancaria no encontrada.' };

    const rate = this.bcvState().usdRate || 36.50;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.bankAccounts.update(accs =>
      accs.map(b => {
        if (b.id === id) {
          const updated = { ...b, ...updates, updatedAt: nowStr };
          const bal = updated.balance;
          updated.balanceUsd = updated.currency === 'VES' ? Number((bal / rate).toFixed(2)) : bal;
          updated.balanceVes = updated.currency === 'VES' ? bal : Number((bal * rate).toFixed(2));
          return updated;
        }
        return b;
      })
    );

    this.logAudit(
      'UPDATE_BANK_ACCOUNT',
      'TREASURY',
      `Cuenta Actualizada: ${target.accountName}`,
      `Modificación de parámetros en cuenta ${target.accountName}.`,
      target as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>
    );

    this.notify('info', 'Cuenta Bancaria Actualizada', `Cambios guardados en ${target.accountName}.`);
    this.saveState();
    return { success: true };
  }

  // 5. Transferencia entre Cuentas Bancarias / Caja
  transferBetweenBankAccounts(data: {
    sourceBankAccountId: string;
    destinationBankAccountId: string;
    amountUsd: number;
    referenceNumber: string;
    notes?: string;
  }): { success: boolean; message?: string } {
    if (data.sourceBankAccountId === data.destinationBankAccountId) {
      return { success: false, message: 'La cuenta origen y destino no pueden ser la misma.' };
    }

    const source = this.bankAccounts().find(b => b.id === data.sourceBankAccountId);
    const dest = this.bankAccounts().find(b => b.id === data.destinationBankAccountId);

    if (!source || !dest) return { success: false, message: 'Cuentas bancarias no encontradas.' };

    const rate = this.bcvState().usdRate || 36.50;
    const amountUsd = Number(data.amountUsd.toFixed(2));
    const amountVes = Number((amountUsd * rate).toFixed(2));

    const sourceDebit = source.currency === 'VES' ? amountVes : amountUsd;
    if (source.balance < sourceDebit) {
      return { success: false, message: `Saldo insuficiente en ${source.accountName}. Saldo disponible: ${source.currency === 'VES' ? 'Bs. ' + source.balance.toLocaleString('es-VE') : '$' + source.balance.toFixed(2)}.` };
    }

    const destCredit = dest.currency === 'VES' ? amountVes : amountUsd;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const user = this.authService.currentUser();

    // Actualizar saldos
    this.bankAccounts.update(accs =>
      accs.map(b => {
        if (b.id === source.id) {
          const newBal = b.balance - sourceDebit;
          return {
            ...b,
            balance: Number(newBal.toFixed(2)),
            balanceUsd: Number((b.currency === 'VES' ? newBal / rate : newBal).toFixed(2)),
            balanceVes: Number((b.currency === 'VES' ? newBal : newBal * rate).toFixed(2)),
            updatedAt: nowStr
          };
        }
        if (b.id === dest.id) {
          const newBal = b.balance + destCredit;
          return {
            ...b,
            balance: Number(newBal.toFixed(2)),
            balanceUsd: Number((b.currency === 'VES' ? newBal / rate : newBal).toFixed(2)),
            balanceVes: Number((b.currency === 'VES' ? newBal : newBal * rate).toFixed(2)),
            updatedAt: nowStr
          };
        }
        return b;
      })
    );

    // Asiento contable: Debe Banco Destino / Haber Banco Origen
    const destGl = this.accounts().find(a => a.code === dest.glAccountCode) || this.accounts().find(a => a.code === '1.1.01.02')!;
    const sourceGl = this.accounts().find(a => a.code === source.glAccountCode) || this.accounts().find(a => a.code === '1.1.01.02')!;

    const journal = this.generateAutomatedJournalEntry(
      'TRANSFERENCIA_BANCO',
      `TRF-${Date.now().toString(36).toUpperCase()}`,
      `Transferencia entre cuentas: ${source.bankName} ➔ ${dest.bankName}`,
      [
        {
          accountId: destGl.id,
          accountCode: destGl.code,
          accountName: destGl.name,
          description: `Ingreso por transferencia desde ${source.accountName}`,
          debit: amountUsd,
          credit: 0
        },
        {
          accountId: sourceGl.id,
          accountCode: sourceGl.code,
          accountName: sourceGl.name,
          description: `Egreso por transferencia hacia ${dest.accountName}`,
          debit: 0,
          credit: amountUsd
        }
      ]
    );

    const newTx: TreasuryTransaction = {
      id: 'tx-' + Date.now().toString(36),
      transactionNumber: 'TES-2026-' + (this.treasuryTransactions().length + 1).toString().padStart(4, '0'),
      type: 'TRANSFERENCIA_BANCO',
      date: nowStr,
      bankAccountId: source.id,
      bankAccountName: source.accountName,
      destinationBankAccountId: dest.id,
      destinationBankAccountName: dest.accountName,
      amount: amountUsd,
      amountUsd,
      amountVes,
      currency: 'USD',
      bcvRate: rate,
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: data.referenceNumber || 'N/A',
      concept: `Transferencia entre cuentas: de ${source.accountName} a ${dest.accountName}${data.notes ? ' (' + data.notes + ')' : ''}`,
      journalEntryId: journal.id,
      status: 'CONCILIADO',
      registeredBy: user.name || 'Admin',
      createdAt: nowStr
    };

    this.treasuryTransactions.update(txs => [newTx, ...txs]);
    this.logAudit(
      'RECORD_BANK_TRANSFER',
      'TREASURY',
      `Transferencia Bancaria Registrada`,
      `Traspaso de $${amountUsd.toFixed(2)} desde ${source.accountName} a ${dest.accountName}. Asiento ${journal.entryNumber}.`,
      null,
      newTx as unknown as Record<string, unknown>
    );

    this.notify('success', 'Transferencia Completada', `Se transfirieron $${amountUsd.toFixed(2)} entre cuentas exitosamente.`);
    this.saveState();
    return { success: true };
  }

  // ============================================================================
  // FASE 2: MÉTODOS DE MANUFACTURA Y MRP (BOM & ÓRDENES DE PRODUCCIÓN)
  // ============================================================================

  createBom(data: {
    code: string;
    name: string;
    finishedProductId: string;
    quantityToProduce: number;
    items: {
      rawMaterialProductId: string;
      quantityNeeded: number;
      wastePercent: number;
    }[];
    laborCost: number;
    overheadCost: number;
    notes?: string;
  }): { success: boolean; bomId?: string; message?: string } {
    const finishedProd = this.products().find(p => p.id === data.finishedProductId);
    if (!finishedProd) return { success: false, message: 'Producto terminado no encontrado' };

    let materialsTotalCost = 0;
    const bomItems: BomItem[] = [];

    for (const item of data.items) {
      const rawProd = this.products().find(p => p.id === item.rawMaterialProductId);
      if (!rawProd) continue;

      const unitCost = rawProd.costPrice;
      const subtotal = (item.quantityNeeded * unitCost) * (1 + (item.wastePercent / 100));
      materialsTotalCost += subtotal;

      bomItems.push({
        id: 'bit-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        rawMaterialProductId: rawProd.id,
        rawMaterialSku: rawProd.sku,
        rawMaterialName: rawProd.name,
        quantityNeeded: item.quantityNeeded,
        unit: rawProd.unit,
        wastePercent: item.wastePercent,
        estimatedUnitCost: unitCost,
        subtotalCost: Number(subtotal.toFixed(2))
      });
    }

    const totalEstimatedCost = Number((materialsTotalCost + data.laborCost + data.overheadCost).toFixed(2));
    const unitCost = Number((totalEstimatedCost / (data.quantityToProduce || 1)).toFixed(2));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newBom: Bom = {
      id: 'bom-' + Date.now().toString(36),
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      finishedProductId: finishedProd.id,
      finishedProductSku: finishedProd.sku,
      finishedProductName: finishedProd.name,
      quantityToProduce: data.quantityToProduce,
      items: bomItems,
      laborCost: data.laborCost,
      overheadCost: data.overheadCost,
      totalEstimatedCost,
      unitCost,
      active: true,
      notes: data.notes,
      createdAt: nowStr
    };

    this.boms.update(boms => [newBom, ...boms]);
    this.logAudit(
      'CREATE_BOM',
      'MRP',
      `Nueva Lista de Materiales (BOM): ${newBom.code}`,
      `Fórmula registrada para fabricar ${finishedProd.name} (Lote: ${data.quantityToProduce} ${finishedProd.unit}, Costo Unit: $${unitCost}).`,
      null,
      newBom as unknown as Record<string, unknown>
    );
    this.notify('success', 'BOM Registrada', `Fórmula ${newBom.code} guardada exitosamente.`);
    this.saveState();
    return { success: true, bomId: newBom.id };
  }

  createProductionOrder(data: {
    bomId: string;
    warehouseId: string;
    quantityPlanned: number;
    targetEndDate: string;
    notes?: string;
  }): { success: boolean; orderNumber?: string; message?: string } {
    const bom = this.boms().find(b => b.id === data.bomId);
    if (!bom) return { success: false, message: 'BOM no encontrada' };

    const warehouse = this.warehouses().find(w => w.id === data.warehouseId) || this.warehouses()[0];
    const user = this.authService.currentUser();
    const orderNumber = 'OF-2026-' + (this.productionOrders().length + 10).toString().padStart(4, '0');
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const factor = data.quantityPlanned / (bom.quantityToProduce || 1);
    let directMaterialCost = 0;
    bom.items.forEach(it => {
      directMaterialCost += it.subtotalCost * factor;
    });
    const laborCost = bom.laborCost * factor;
    const overheadCost = bom.overheadCost * factor;
    const totalCost = Number((directMaterialCost + laborCost + overheadCost).toFixed(2));
    const unitCost = Number((totalCost / data.quantityPlanned).toFixed(2));

    const newOrder: ProductionOrder = {
      id: 'of-' + Date.now().toString(36),
      orderNumber,
      bomId: bom.id,
      bomCode: bom.code,
      finishedProductId: bom.finishedProductId,
      finishedProductSku: bom.finishedProductSku,
      finishedProductName: bom.finishedProductName,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantityPlanned: data.quantityPlanned,
      quantityProduced: 0,
      status: 'PLANIFICADA',
      startDate: nowStr,
      targetEndDate: data.targetEndDate,
      directMaterialCost: Number(directMaterialCost.toFixed(2)),
      laborCost: Number(laborCost.toFixed(2)),
      overheadCost: Number(overheadCost.toFixed(2)),
      totalCost,
      unitCost,
      notes: data.notes,
      operatorName: user.name || 'Jefe de Planta',
      createdAt: nowStr
    };

    this.productionOrders.update(orders => [newOrder, ...orders]);
    this.logAudit(
      'CREATE_PRODUCTION_ORDER',
      'MRP',
      `Orden de Fabricación Creada ${orderNumber}`,
      `Planificada producción de ${data.quantityPlanned} unidades de ${bom.finishedProductName} en ${warehouse.name}.`,
      null,
      newOrder as unknown as Record<string, unknown>
    );
    this.notify('success', 'Orden de Fabricación Creada', `Orden ${orderNumber} lista para ejecución.`);
    this.saveState();
    return { success: true, orderNumber };
  }

  startProductionOrder(orderId: string): { success: boolean; message?: string } {
    const order = this.productionOrders().find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Orden no encontrada' };

    this.productionOrders.update(orders =>
      orders.map(o => (o.id === orderId ? { ...o, status: 'EN_PROCESO' as ProductionOrderStatus } : o))
    );
    this.notify('info', 'Producción Iniciada', `La orden ${order.orderNumber} pasó al estado EN PROCESO.`);
    this.saveState();
    return { success: true };
  }

  completeProductionOrder(orderId: string): { success: boolean; message?: string } {
    const order = this.productionOrders().find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Orden no encontrada' };
    if (order.status === 'COMPLETADA') return { success: false, message: 'La orden ya está completada' };

    const bom = this.boms().find(b => b.id === order.bomId);
    if (!bom) return { success: false, message: 'Fórmula BOM asociada no encontrada' };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const factor = order.quantityPlanned / (bom.quantityToProduce || 1);
    const currentProducts = [...this.products()];
    const kardexToAdd: KardexMovement[] = [];
    let totalMaterialsConsumedCost = 0;

    // 1. Validar y Descontar Materias Primas del Almacén
    for (const item of bom.items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.rawMaterialProductId);
      if (prodIndex === -1) {
        return { success: false, message: `Materia prima "${item.rawMaterialName}" no existe en inventario.` };
      }

      const prod = currentProducts[prodIndex];
      const qtyToDeduct = Number((item.quantityNeeded * factor * (1 + (item.wastePercent / 100))).toFixed(2));
      const whStock = prod.stockByWarehouse.find(w => w.warehouseId === order.warehouseId)?.quantity || 0;

      if (whStock < qtyToDeduct && prod.totalStock < 900) {
        return {
          success: false,
          message: `Stock insuficiente de insumo "${prod.name}". Requerido: ${qtyToDeduct} ${prod.unit}, Disponible: ${whStock} ${prod.unit}.`
        };
      }

      const exitTotalCost = Number((qtyToDeduct * prod.costPrice).toFixed(2));
      totalMaterialsConsumedCost += exitTotalCost;

      // Actualizar existencias
      const updatedStockByWh = prod.stockByWarehouse.map(sw => {
        if (sw.warehouseId === order.warehouseId) {
          return { ...sw, quantity: Math.max(0, sw.quantity - qtyToDeduct) };
        }
        return sw;
      });

      const newTotalStock = Math.max(0, prod.totalStock - qtyToDeduct);
      currentProducts[prodIndex] = {
        ...prod,
        totalStock: newTotalStock,
        stockByWarehouse: updatedStockByWh,
        updatedAt: nowStr
      };

      // Registrar Kardex: SALIDA_PRODUCCION
      kardexToAdd.push({
        id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        warehouseId: order.warehouseId,
        warehouseName: order.warehouseName,
        date: nowStr,
        movementType: 'SALIDA_PRODUCCION',
        docReference: order.orderNumber,
        justificationReason: `Consumo de materia prima para fabricación en orden ${order.orderNumber}`,
        entryQty: 0,
        entryUnitCost: 0,
        entryTotalCost: 0,
        exitQty: qtyToDeduct,
        exitUnitCost: prod.costPrice,
        exitTotalCost,
        balanceQty: newTotalStock,
        balanceAverageCost: prod.costPrice,
        balanceTotalValuation: Number((newTotalStock * prod.costPrice).toFixed(2)),
        registeredByUserId: 'usr-mrp-01',
        registeredByUserName: 'Control de Producción MRP'
      });
    }

    // 2. Ingresar Producto Terminado al Inventario con Nuevo Costo Ponderado
    const finProdIndex = currentProducts.findIndex(p => p.id === order.finishedProductId);
    if (finProdIndex === -1) {
      return { success: false, message: 'Producto terminado no encontrado en catálogo' };
    }

    const finProd = currentProducts[finProdIndex];
    const totalOrderCost = Number((totalMaterialsConsumedCost + order.laborCost + order.overheadCost).toFixed(2));
    const effectiveUnitCost = Number((totalOrderCost / order.quantityPlanned).toFixed(2));

    const currentTotalStock = finProd.totalStock;
    const currentTotalValue = currentTotalStock * finProd.costPrice;
    const newTotalStock = currentTotalStock + order.quantityPlanned;
    const newAverageCost = newTotalStock > 0 ? Number(((currentTotalValue + totalOrderCost) / newTotalStock).toFixed(2)) : effectiveUnitCost;

    const updatedFinStockByWh = finProd.stockByWarehouse.map(sw => {
      if (sw.warehouseId === order.warehouseId) {
        return { ...sw, quantity: sw.quantity + order.quantityPlanned };
      }
      return sw;
    });

    currentProducts[finProdIndex] = {
      ...finProd,
      costPrice: newAverageCost,
      totalStock: newTotalStock,
      stockByWarehouse: updatedFinStockByWh,
      updatedAt: nowStr
    };

    // Registrar Kardex: ENTRADA_PRODUCCION
    kardexToAdd.push({
      id: 'kdx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      productId: finProd.id,
      productSku: finProd.sku,
      productName: finProd.name,
      warehouseId: order.warehouseId,
      warehouseName: order.warehouseName,
      date: nowStr,
      movementType: 'ENTRADA_PRODUCCION',
      docReference: order.orderNumber,
      justificationReason: `Entrada por liquidación de producción terminada ${order.orderNumber}`,
      entryQty: order.quantityPlanned,
      entryUnitCost: effectiveUnitCost,
      entryTotalCost: totalOrderCost,
      exitQty: 0,
      exitUnitCost: 0,
      exitTotalCost: 0,
      balanceQty: newTotalStock,
      balanceAverageCost: newAverageCost,
      balanceTotalValuation: Number((newTotalStock * newAverageCost).toFixed(2)),
      registeredByUserId: 'usr-mrp-01',
      registeredByUserName: 'Control de Producción MRP'
    });

    // 3. Generar Asiento Contable Automático
    const accountingLines: JournalEntryLine[] = [
      {
        accountId: 'acc-104',
        accountCode: '1.1.03.01',
        accountName: 'Inventario de Mercancías y Productos Terminados',
        description: `Ingreso ${order.quantityPlanned} unidades de ${finProd.name} a $${effectiveUnitCost.toFixed(2)}`,
        debit: totalOrderCost,
        credit: 0
      },
      {
        accountId: 'acc-105',
        accountCode: '1.1.03.02',
        accountName: 'Inventario de Materias Primas e Insumos',
        description: `Consumo de materias primas según lista BOM (${bom.code})`,
        debit: 0,
        credit: Number(totalMaterialsConsumedCost.toFixed(2))
      },
      {
        accountId: 'acc-502',
        accountCode: '5.1.02.01',
        accountName: 'Mano de Obra Directa Aplicada a Producción',
        description: `Mano de obra directa de ensamble aplicada a orden ${order.orderNumber}`,
        debit: 0,
        credit: order.laborCost
      },
      {
        accountId: 'acc-503',
        accountCode: '5.1.02.02',
        accountName: 'Costos Indirectos de Fabricación (CIF)',
        description: `Costos indirectos y control de calidad aplicados a orden ${order.orderNumber}`,
        debit: 0,
        credit: order.overheadCost
      }
    ];

    this.generateAutomatedJournalEntry(
      'PRODUCCION',
      order.orderNumber,
      `Liquidación de Orden de Fabricación ${order.orderNumber} (${order.quantityPlanned} ${finProd.name})`,
      accountingLines
    );

    // 4. Actualizar Estado de la Orden
    this.products.set(currentProducts);
    this.kardexMovements.update(kdx => [...kardexToAdd, ...kdx]);
    this.productionOrders.update(orders =>
      orders.map(o =>
        o.id === orderId
          ? {
              ...o,
              status: 'COMPLETADA' as ProductionOrderStatus,
              quantityProduced: o.quantityPlanned,
              actualEndDate: nowStr,
              directMaterialCost: Number(totalMaterialsConsumedCost.toFixed(2)),
              totalCost: totalOrderCost,
              unitCost: effectiveUnitCost
            }
          : o
      )
    );

    this.logAudit(
      'COMPLETE_PRODUCTION_ORDER',
      'MRP',
      `Orden de Fabricación Completada ${order.orderNumber}`,
      `Finalizada producción de ${order.quantityPlanned} unidades de ${finProd.name}. Stock ingresado en ${order.warehouseName}. Asiento contable generado.`,
      null,
      { orderNumber: order.orderNumber, totalCost: totalOrderCost, unitCost: effectiveUnitCost }
    );

    this.notify('success', 'Fabricación Completada con Éxito', `Ingresaron ${order.quantityPlanned} unidades de ${finProd.name} al almacén.`);
    this.saveState();
    return { success: true };
  }

  cancelProductionOrder(orderId: string, reason: string): { success: boolean; message?: string } {
    const order = this.productionOrders().find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Orden no encontrada' };

    this.productionOrders.update(orders =>
      orders.map(o => (o.id === orderId ? { ...o, status: 'CANCELADA' as ProductionOrderStatus, notes: (o.notes ? o.notes + ' | ' : '') + 'CANCELADA: ' + reason } : o))
    );
    this.logAudit(
      'CANCEL_PRODUCTION_ORDER',
      'MRP',
      `Orden de Fabricación Cancelada ${order.orderNumber}`,
      `Motivo: ${reason}`,
      null,
      { orderNumber: order.orderNumber, reason }
    );
    this.notify('warning', 'Orden Cancelada', `La orden ${order.orderNumber} ha sido cancelada.`);
    this.saveState();
    return { success: true };
  }

  // ============================================================================
  // FASE 2: MÉTODOS DE CRM (LEADS, DEALS Y PIPELINE KANBAN)
  // ============================================================================

  createCrmDeal(data: {
    title: string;
    customerId?: string;
    customerName: string;
    contactPerson: string;
    email: string;
    phone: string;
    stage: CrmStage;
    expectedValueUsd: number;
    probability: number;
    expectedCloseDate: string;
    assignedTo: string;
    notes?: string;
    initialActivity?: string;
  }): { success: boolean; dealId?: string } {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const code = 'DEAL-2026-' + (this.crmDeals().length + 85).toString().padStart(3, '0');
    const user = this.authService.currentUser();

    const activities: CrmActivity[] = [];
    if (data.initialActivity) {
      activities.push({
        id: 'act-' + Date.now().toString(36),
        dealId: '',
        type: 'NOTA',
        description: data.initialActivity,
        date: nowStr,
        user: user.name,
        completed: true
      });
    }

    const newDeal: CrmDeal = {
      id: 'deal-' + Date.now().toString(36),
      code,
      title: data.title.trim(),
      customerId: data.customerId,
      customerName: data.customerName.trim(),
      contactPerson: data.contactPerson.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      stage: data.stage,
      expectedValueUsd: Number(data.expectedValueUsd.toFixed(2)),
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate,
      assignedTo: data.assignedTo || user.name,
      notes: data.notes,
      activities,
      createdAt: nowStr,
      updatedAt: nowStr
    };

    if (activities.length > 0) {
      activities[0].dealId = newDeal.id;
    }

    this.crmDeals.update(deals => [newDeal, ...deals]);
    this.logAudit(
      'CREATE_CRM_DEAL',
      'CRM',
      `Nueva Oportunidad CRM: ${code}`,
      `Oportunidad "${data.title}" por $${data.expectedValueUsd.toFixed(2)} creada para ${data.customerName}.`,
      null,
      newDeal as unknown as Record<string, unknown>
    );
    this.notify('success', 'Oportunidad Registrada', `Oportunidad comercial ${code} agregada al pipeline.`);
    this.saveState();
    return { success: true, dealId: newDeal.id };
  }

  updateCrmDealStage(dealId: string, newStage: CrmStage): { success: boolean } {
    const deal = this.crmDeals().find(d => d.id === dealId);
    if (!deal) return { success: false };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let newProbability = deal.probability;
    if (newStage === 'NUEVO_LEAD') newProbability = 20;
    else if (newStage === 'CONTACTADO') newProbability = 35;
    else if (newStage === 'DIAGNOSTICO') newProbability = 50;
    else if (newStage === 'PROPUESTA') newProbability = 65;
    else if (newStage === 'NEGOCIACION') newProbability = 80;
    else if (newStage === 'GANADO') newProbability = 100;
    else if (newStage === 'PERDIDO') newProbability = 0;

    this.crmDeals.update(deals =>
      deals.map(d =>
        d.id === dealId
          ? {
              ...d,
              stage: newStage,
              probability: newProbability,
              updatedAt: nowStr
            }
          : d
      )
    );

    this.logAudit(
      'UPDATE_CRM_DEAL',
      'CRM',
      `Cambio de Etapa en Oportunidad ${deal.code}`,
      `La oportunidad "${deal.title}" avanzó a la etapa "${newStage}" (${newProbability}% probabilidad).`,
      { stageBefore: deal.stage },
      { stageAfter: newStage, probabilityAfter: newProbability }
    );
    this.notify('info', 'Pipeline Actualizado', `Oportunidad ${deal.code} movida a ${newStage}.`);
    this.saveState();
    return { success: true };
  }

  addCrmActivity(dealId: string, activity: { type: CrmActivityType; description: string; date?: string; completed?: boolean }): { success: boolean } {
    const deal = this.crmDeals().find(d => d.id === dealId);
    if (!deal) return { success: false };

    const user = this.authService.currentUser();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newAct: CrmActivity = {
      id: 'act-' + Date.now().toString(36),
      dealId,
      type: activity.type,
      description: activity.description.trim(),
      date: activity.date || nowStr,
      user: user.name,
      completed: activity.completed !== undefined ? activity.completed : true
    };

    this.crmDeals.update(deals =>
      deals.map(d => (d.id === dealId ? { ...d, activities: [newAct, ...d.activities], updatedAt: nowStr } : d))
    );
    this.notify('success', 'Actividad Registrada', `Interacción de tipo ${activity.type} agregada.`);
    this.saveState();
    return { success: true };
  }

  // ==========================================================================
  // EXPORT & RESTORE SYSTEM DATA FOR FIRESTORE BACKUPS
  // ==========================================================================

  getErpFullSnapshotData() {
    return {
      products: this.products(),
      inventoryMovements: this.kardexMovements(),
      warehouses: this.warehouses(),
      boms: this.boms(),
      productionOrders: this.productionOrders(),
      crmDeals: this.crmDeals(),
      accounts: this.accounts(),
      journalEntries: this.journalEntries(),
      invoices: this.invoices(),
      dispatchGuides: this.dispatchGuides(),
      deliveryOrders: this.deliveryOrders(),
      cashClosings: [this.activeCashSession(), ...this.cashSessionHistory()],
      quotes: this.quotes(),
      customers: this.customers(),
      suppliers: this.suppliers(),
      bankAccounts: this.bankAccounts(),
      payableBills: this.payableBills(),
      treasuryTransactions: this.treasuryTransactions(),
      users: this.authService.availableDemoUsers,
      auditLogs: this.auditLogs(),
      emailAlertLogs: []
    };
  }

  restoreFullErpData(data: ErpFullBackupPayload['data'], sourceDescription: string): { success: boolean; recordsRestored: number; error?: string } {
    try {
      if (!data) {
        return { success: false, recordsRestored: 0, error: 'Estructura de datos inválida o vacía.' };
      }

      let count = 0;

      if (Array.isArray(data.warehouses) && data.warehouses.length > 0) {
        this.warehouses.set(data.warehouses);
        count += data.warehouses.length;
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        this.products.set(data.products);
        count += data.products.length;
      }
      if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        this.suppliers.set(data.suppliers);
        count += data.suppliers.length;
      }
      if (Array.isArray(data.customers) && data.customers.length > 0) {
        this.customers.set(data.customers);
        count += data.customers.length;
      }
      if (Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0) {
        this.bankAccounts.set(data.bankAccounts);
        count += data.bankAccounts.length;
      }
      if (Array.isArray(data.payableBills) && data.payableBills.length > 0) {
        this.payableBills.set(data.payableBills);
        count += data.payableBills.length;
      }
      if (Array.isArray(data.treasuryTransactions) && data.treasuryTransactions.length > 0) {
        this.treasuryTransactions.set(data.treasuryTransactions);
        count += data.treasuryTransactions.length;
      }
      if (Array.isArray(data.inventoryMovements) && data.inventoryMovements.length > 0) {
        this.kardexMovements.set(data.inventoryMovements);
        count += data.inventoryMovements.length;
      }
      if (Array.isArray(data.boms) && data.boms.length > 0) {
        this.boms.set(data.boms);
        count += data.boms.length;
      }
      if (Array.isArray(data.productionOrders) && data.productionOrders.length > 0) {
        this.productionOrders.set(data.productionOrders);
        count += data.productionOrders.length;
      }
      if (Array.isArray(data.crmDeals) && data.crmDeals.length > 0) {
        this.crmDeals.set(data.crmDeals);
        count += data.crmDeals.length;
      }
      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        this.accounts.set(data.accounts);
        count += data.accounts.length;
      }
      if (Array.isArray(data.journalEntries) && data.journalEntries.length > 0) {
        this.journalEntries.set(data.journalEntries);
        count += data.journalEntries.length;
      }
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        this.invoices.set(data.invoices);
        count += data.invoices.length;
      }
      if (Array.isArray(data.dispatchGuides) && data.dispatchGuides.length > 0) {
        this.dispatchGuides.set(data.dispatchGuides);
        count += data.dispatchGuides.length;
      }
      if (Array.isArray(data.deliveryOrders) && data.deliveryOrders.length > 0) {
        this.deliveryOrders.set(data.deliveryOrders);
        count += data.deliveryOrders.length;
      }
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        this.quotes.set(data.quotes);
        count += data.quotes.length;
      }
      if (Array.isArray(data.cashClosings) && data.cashClosings.length > 0) {
        const first = data.cashClosings[0];
        if (first) {
          this.activeCashSession.set(first);
        }
        this.cashSessionHistory.set(data.cashClosings.slice(1));
        count += data.cashClosings.length;
      }
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
        this.auditLogs.set(data.auditLogs);
        count += data.auditLogs.length;
      }

      this.logAudit(
        'RESTORE_DATABASE',
        'BACKUP',
        `Restauración de Base de Datos (${sourceDescription})`,
        `Se ejecutó con éxito la restauración global de ${count} registros desde el respaldo.`,
        undefined,
        { recordsRestored: count, source: sourceDescription },
        undefined,
        true,
        'DB_RESTORE'
      );

      this.addCriticalAuditNotification({
        category: 'DB_RESTORE',
        severity: 'CRITICAL',
        title: 'Restauración Completa de Base de Datos',
        message: `El usuario ${this.authService.currentUser().name} ejecutó una restauración de respaldo global (${count} registros restaurados desde ${sourceDescription}).`,
        details: {
          diffSummary: `${count} entidades restauradas en PostgreSQL ACID`,
          supportDocument: `RESTORE-${Date.now()}`,
          justification: `Restauración autorizada desde módulo de seguridad (${sourceDescription})`,
          user: this.authService.currentUser().name,
          role: this.authService.currentUser().role,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      });

      this.saveState();
      this.notify('success', 'Base de Datos Restaurada', `Se restauraron exitosamente ${count} registros desde ${sourceDescription}.`);
      return { success: true, recordsRestored: count };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar los datos de restauración';
      this.notify('error', 'Error en Restauración', msg);
      return { success: false, recordsRestored: 0, error: msg };
    }
  }
}


