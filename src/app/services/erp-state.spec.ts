import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
    http.verify();
    localStorage.clear();
  });

  it('initializes backend-owned collections empty', () => {
    expect(service.products()).toEqual([]);
    expect(service.purchaseOrders()).toEqual([]);
    expect(service.kardexMovements()).toEqual([]);
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

  it('loads purchase orders, suppliers, products and warehouses together', () => {
    let completed = false;
    service.loadRouteData('purchases').subscribe(() => completed = true);

    http.expectOne('/api/suppliers').flush([{ id: 'supplier-1', name: 'Proveedor de prueba' }]);
    http.expectOne('/api/purchase-orders').flush([{ id: 'po-1', orderNumber: 'PO-001' }]);
    http.expectOne('/api/warehouses').flush([{ id: 'warehouse-1', code: 'MAIN', name: 'Principal' }]);
    http.expectOne('/api/products').flush([{ id: 'product-1', sku: 'SKU-001', name: 'Producto de prueba' }]);

    expect(completed).toBe(true);
    expect(service.purchaseOrders()).toMatchObject([{ id: 'po-1', orderNumber: 'PO-001' }]);
    expect(service.suppliers()).toMatchObject([{ id: 'supplier-1', name: 'Proveedor de prueba' }]);
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

  it('loads invoices and customers for the POS flow', () => {
    service.loadRouteData('sales-pos').subscribe();

    http.expectOne('/api/invoices').flush([{ id: 'invoice-1', invoiceNumber: 'FAC-001', total: 125 }]);
    http.expectOne('/api/customers').flush([{ id: 'customer-1', name: 'Cliente de prueba' }]);

    expect(service.invoices()).toMatchObject([{ id: 'invoice-1', invoiceNumber: 'FAC-001', total: 125 }]);
    expect(service.customers()).toMatchObject([{ id: 'customer-1', name: 'Cliente de prueba' }]);
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

  it('separates closed cash sessions from the active POS session', () => {
    service.loadRouteData('cash-closing').subscribe();

    http.expectOne('/api/cash-sessions').flush([
      { id: 'session-open', sessionCode: 'OPEN-001', status: 'ABIERTA' },
      { id: 'session-closed', sessionCode: 'CLOSED-001', status: 'CERRADA' },
    ]);

    expect(service.activeCashSession()).toMatchObject({ id: 'session-open', status: 'ABIERTA' });
    expect(service.cashSessionHistory()).toMatchObject([{ id: 'session-closed', status: 'CERRADA' }]);
  });

  it('loads audit records and keeps super-admin access available in the base plan', () => {
    service.loadRouteData('audit-log').subscribe();
    http.expectOne('/api/audit/logs').flush([{ id: 'audit-1', action: 'CREATE_BACKUP', isCritical: true }]);

    service.setCompanyPlan('BASE');

    expect(service.auditLogs()).toContainEqual(expect.objectContaining({
      id: 'audit-1',
      action: 'CREATE_BACKUP',
      isCritical: true,
    }));
    expect(service.isTabAllowedInPlan('audit-log')).toBe(false);
    expect(service.isTabAllowedInPlan('super-admin')).toBe(true);
  });
});
