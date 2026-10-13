import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CriticalAuditNotification, Invoice, Quote } from '../models/erp.models';
import { ErpStateService } from './erp-state.service';

describe('ErpStateService', () => {
  let service: ErpStateService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ErpStateService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ErpStateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match('/api/audit/logs').forEach(request => request.flush({ id: 'audit-test' }));
    http.verify();
    localStorage.clear();
  });

  it('initializes backend-owned collections empty', () => {
    expect(service.products()).toEqual([]);
    expect(service.purchaseOrders()).toEqual([]);
    expect(service.kardexMovements()).toEqual([]);
  });

  it('loads critical audit notifications from the backend', () => {
    service.loadCriticalAuditNotifications();

    const request = http.expectOne('/api/audit/notifications');
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: 'notification-1',
      category: 'PRICE_CHANGE',
      severity: 'HIGH',
      title: 'Precio actualizado',
      message: 'Se modificó el precio base.',
      details: { user: 'Admin', role: 'ADMIN', timestamp: '2026-10-12 12:00:00' },
      isRead: false,
      createdAt: '2026-10-12T16:00:00.000Z'
    }]);

    expect(service.criticalAuditNotifications()).toHaveLength(1);
    expect(service.unreadCriticalAuditCount()).toBe(1);
  });

  it('persists an individual notification read state in the backend', () => {
    const notification: CriticalAuditNotification = {
      id: 'notification-1',
      category: 'PRICE_CHANGE',
      severity: 'HIGH',
      title: 'Precio actualizado',
      message: 'Se modificó el precio base.',
      details: { user: 'Admin', role: 'ADMIN', timestamp: '2026-10-12 12:00:00' },
      isRead: false,
      createdAt: '2026-10-12 12:00:00'
    };
    service.criticalAuditNotifications.set([notification]);

    service.markAuditNotificationAsRead(notification.id);

    const request = http.expectOne('/api/audit/notifications/notification-1/read');
    expect(request.request.method).toBe('PUT');
    request.flush({ ...notification, isRead: true });

    expect(service.unreadCriticalAuditCount()).toBe(0);
  });

  it('persists marking all critical notifications as read in the backend', () => {
    service.criticalAuditNotifications.set([{
      id: 'notification-1',
      category: 'PRICE_CHANGE',
      severity: 'HIGH',
      title: 'Precio actualizado',
      message: 'Se modificó el precio base.',
      details: { user: 'Admin', role: 'ADMIN', timestamp: '2026-10-12 12:00:00' },
      isRead: false,
      createdAt: '2026-10-12 12:00:00'
    }]);

    service.markAllAuditNotificationsAsRead();

    const request = http.expectOne('/api/audit/notifications/read-all');
    expect(request.request.method).toBe('PUT');
    request.flush({});

    expect(service.unreadCriticalAuditCount()).toBe(0);
  });

  it('enables enterprise modules after selecting the full plan', () => {
    service.setCompanyPlan('FULL');

    expect(service.companyPlan()).toBe('FULL');
    expect(service.isFullPlan()).toBe(true);
    expect(service.isBasePlan()).toBe(false);
    expect(service.isTabAllowedInPlan('mrp')).toBe(true);
  });

  it('limits enterprise modules after selecting the base plan', () => {
    service.setCompanyPlan('BASE');

    expect(service.isBasePlan()).toBe(true);
    expect(service.isTabAllowedInPlan('inventory')).toBe(true);
    expect(service.isTabAllowedInPlan('purchases')).toBe(true);
    expect(service.isTabAllowedInPlan('mrp')).toBe(false);
    expect(service.isTabAllowedInPlan('accounting')).toBe(false);
  });

  it('updates the manual BCV exchange rate', () => {
    service.setManualExchangeRate(40.25, 43.75);

    expect(service.bcvState()).toMatchObject({
      usdRate: 40.25,
      eurRate: 43.75,
      origin: 'MANUAL',
      status: 'FALLBACK_MANUAL',
    });
  });

  it('persists customer and company snapshots before marking a quote as sent', () => {
    const quote: Quote = {
      id: 'quote-1',
      quoteNumber: 'COT-2026-001',
      customerId: 'customer-1',
      customerName: 'Cliente al emitir',
      customerTaxId: 'J-12345678-9',
      warehouseId: 'warehouse-1',
      issueDate: '2026-10-11T12:00:00.000Z',
      validUntil: '2026-10-20T00:00:00.000Z',
      date: '2026-10-11T12:00:00.000Z',
      status: 'BORRADOR',
      items: [],
      baseCurrency: 'USD',
      bcvRate: 36.5,
      priceLevelApplied: 'price1',
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
      totalVes: 0,
      createdBy: 'Vendedor',
      sellerName: 'Vendedor'
    };
    service.quotes.set([quote]);
    service.customers.set([{
      id: 'customer-1',
      name: 'Cliente al emitir',
      taxId: 'J-12345678-9',
      email: 'cliente@ejemplo.test',
      phone: '+58 412 1234567',
      address: 'Dirección del cliente',
      customerType: 'EMPRESA'
    }]);

    let result: Quote | undefined;
    service.updateQuoteStatus(quote.id, 'ENVIADO').subscribe(saved => result = saved);
    const request = http.expectOne('/api/quotes/quote-1');

    expect(request.request.body).toMatchObject({
      status: 'ENVIADO',
      customerSnapshot: {
        name: 'Cliente al emitir',
        taxId: 'J-12345678-9',
        email: 'cliente@ejemplo.test',
        phone: '+58 412 1234567',
        address: 'Dirección del cliente'
      },
      companySnapshot: {
        legalName: service.companyProfile().legalName,
        taxId: service.companyProfile().taxId
      }
    });
    expect(request.request.body.snapshotAt).toEqual(expect.any(String));

    request.flush({ ...quote, ...request.request.body });

    expect(result?.customerSnapshot?.email).toBe('cliente@ejemplo.test');
    expect(service.quotes()[0].companySnapshot?.legalName).toBe(service.companyProfile().legalName);
  });

  it('loads inventory data used for stock adjustments and shrinkage', () => {
    let completed = false;
    service.loadInventory().subscribe(() => completed = true);

    http.expectOne('/api/products').flush([{
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Producto de prueba',
      category: 'Insumos',
      costPrice: 10,
      salePrice: 15,
      totalStock: 8,
      stocks: [{ warehouseId: 'warehouse-1', quantity: 8, warehouse: { name: 'Principal' } }],
    }]);
    http.expectOne('/api/categories').flush([{ id: 'category-1', code: 'INS', name: 'Insumos' }]);
    http.expectOne('/api/warehouses').flush([{ id: 'warehouse-1', code: 'MAIN', name: 'Principal' }]);

    expect(completed).toBe(true);
    expect(service.inventoryLoading()).toBe(false);
    expect(service.products()).toMatchObject([{ id: 'product-1', categories: ['Insumos'], primaryWarehouseId: 'warehouse-1' }]);
  });

  it('loads shared data once for use across ERP routes', () => {
    service.loadSharedData().subscribe();

    http.expectOne('/api/products').flush([{
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Producto de prueba',
      category: 'Insumos',
      stocks: [{ warehouseId: 'warehouse-1', quantity: 8, warehouse: { name: 'Principal' } }],
    }]);
    http.expectOne('/api/categories').flush([{ id: 'category-1', code: 'INS', name: 'Insumos' }]);
    http.expectOne('/api/warehouses').flush([{ id: 'warehouse-1', code: 'MAIN', name: 'Principal' }]);
    http.expectOne('/api/suppliers').flush([{ id: 'supplier-1', name: 'Proveedor de prueba' }]);
    http.expectOne('/api/customers').flush([{ id: 'customer-1', name: 'Cliente de prueba' }]);
    http.expectOne('/api/purchase-orders').flush([{ id: 'po-1', orderNumber: 'PO-001' }]);
    http.expectOne('/api/invoices').flush([{ id: 'invoice-1', invoiceNumber: 'FAC-001', total: 125 }]);
    http.expectOne('/api/fiscal/company-profile').flush({ legalName: 'Empresa de prueba', taxId: 'J-123' });
    http.expectOne('/api/cash-sessions').flush([
      { id: 'session-open', sessionCode: 'OPEN-001', status: 'ABIERTA' },
      { id: 'session-closed', sessionCode: 'CLOSED-001', status: 'CERRADA' },
    ]);
    http.expectOne('/api/accounting/accounts').flush([{ id: 'account-1', name: 'Caja' }]);

    expect(service.purchaseOrders()).toMatchObject([{ id: 'po-1', orderNumber: 'PO-001' }]);
    expect(service.suppliers()).toMatchObject([{ id: 'supplier-1', name: 'Proveedor de prueba' }]);
    expect(service.products()).toMatchObject([{ id: 'product-1', primaryWarehouseId: 'warehouse-1' }]);
    expect(service.invoices()).toMatchObject([{ id: 'invoice-1', invoiceNumber: 'FAC-001', total: 125 }]);
    expect(service.customers()).toMatchObject([{ id: 'customer-1', name: 'Cliente de prueba' }]);
    expect(service.companyProfile()).toMatchObject({ legalName: 'Empresa de prueba', taxId: 'J-123' });
    expect(service.accounts()).toMatchObject([{ id: 'account-1', name: 'Caja' }]);
    expect(service.activeCashSession()).toMatchObject({ id: 'session-open', status: 'ABIERTA' });
    expect(service.cashSessionHistory()).toMatchObject([{ id: 'session-closed', status: 'CERRADA' }]);

    service.loadSharedData().subscribe();
    http.expectNone('/api/products');
    http.expectNone('/api/fiscal/company-profile');
  });

  it('loads Kardex movements for purchase, POS and shrinkage traceability', () => {
    service.loadRouteData('kardex').subscribe();

    http.expectOne('/api/kardex').flush([{
      id: 'movement-1',
      productId: 'product-1',
      movementDate: '2026-09-21T12:00:00.000Z',
      movementType: 'AJUSTE_MERMA',
      entryQty: 0,
      exitQty: 2,
    }]);

    expect(service.kardexMovements()).toMatchObject([{
      id: 'movement-1',
      date: '2026-09-21T12:00:00.000Z',
      movementType: 'AJUSTE_MERMA',
      exitQty: 2,
    }]);
  });

  it('shows the POS down payment against the credit balance in CxC', () => {
    service.invoices.set([{
      id: 'invoice-credit',
      invoiceNumber: 'FAC-001',
      customerId: 'customer-1',
      customerName: 'Cliente de prueba',
      customerTaxId: 'J-123',
      warehouseId: 'warehouse-1',
      date: '2026-10-05T10:00:00.000Z',
      type: 'FACTURA_ELECTRONICA',
      status: 'EMITIDA',
      items: [],
      baseCurrency: 'USD',
      paymentCurrency: 'USD',
      bcvRate: 36.5,
      eurRate: 39.8,
      rateOrigin: 'MANUAL',
      priceLevelApplied: 'price1',
      subtotal: 200,
      discountTotal: 0,
      taxDetails: {
        taxableBase: 200,
        exemptBase: 0,
        ivaPercent: 0,
        ivaAmount: 0,
        appliesIgtf: false,
        igtfPercent: 0,
        igtfBase: 0,
        igtfAmount: 0,
      },
      taxTotal: 0,
      total: 200,
      totalVes: 7300,
      totalEur: 183.42,
      payments: [{ method: 'CREDITO', amount: 190, currency: 'USD' }],
      sellerId: 'user-1',
      sellerName: 'Caja',
    } satisfies Invoice]);

    expect(service.customerReceivables()[0]).toMatchObject({
      paidUsd: 10,
      balanceUsd: 190,
      status: 'PARCIAL',
    });
  });

  it('loads treasury CxC/CxP collections without retaining stale state', () => {
    service.loadRouteData('treasury').subscribe();

    http.expectOne('/api/treasury/bank-accounts').flush([{ id: 'bank-1', accountName: 'Banco principal' }]);
    http.expectOne('/api/treasury/transactions').flush([{ id: 'transaction-1', amount: 250 }]);
    http.expectOne('/api/treasury/payable-bills').flush([{ id: 'bill-1', billNumber: 'CXP-001', balance: 75 }]);

    expect(service.bankAccounts()).toMatchObject([{ id: 'bank-1', accountName: 'Banco principal' }]);
    expect(service.treasuryTransactions()).toMatchObject([{ id: 'transaction-1', amount: 250 }]);
    expect(service.payableBills()).toMatchObject([{ id: 'bill-1', billNumber: 'CXP-001', balance: 75 }]);
  });

  it('loads audit records and keeps company management available in the base plan', () => {
    service.loadRouteData('audit-log').subscribe();
    http.expectOne('/api/audit/logs').flush([{ id: 'audit-1', action: 'CREATE_BACKUP', isCritical: true }]);
    http.expectOne('/api/users').flush([]);

    expect(service.auditLogs()).toContainEqual(expect.objectContaining({
      id: 'audit-1',
      action: 'CREATE_BACKUP',
      isCritical: true,
    }));

    service.setCompanyPlan('BASE');
    http.expectOne('/api/audit/logs').flush({ id: 'audit-plan-change' });

    expect(service.isTabAllowedInPlan('audit-log')).toBe(false);
    expect(service.isTabAllowedInPlan('company-admin')).toBe(true);
  });

  it('persists audit events in the backend and replaces the temporary local record', () => {
    service.logAudit('CREATE_PRODUCT', 'INVENTORY', 'Producto creado', 'Se creó un producto.');

    const request = http.expectOne('/api/audit/logs');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      action: 'CREATE_PRODUCT',
      module: 'INVENTORY',
      details: {
        title: 'Producto creado',
        description: 'Se creó un producto.',
      },
    });
    expect(request.request.body.userId).toBeUndefined();
    expect(request.request.body.ipAddress).toBeUndefined();
    request.flush({
      id: 'audit-saved',
      userName: 'Usuario de prueba',
      userRole: 'ADMIN',
      action: 'CREATE_PRODUCT',
      module: 'INVENTORY',
      details: { title: 'Producto creado', description: 'Se creó un producto.' },
    });

    expect(service.auditLogs()[0].id).toBe('audit-saved');
  });
});
