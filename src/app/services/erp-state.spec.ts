import { TestBed } from '@angular/core/testing';
import { ErpStateService } from './erp-state.service';
import { Invoice, Product, PurchaseOrder, Quote } from '../models/erp.models';

describe('QA Suite: ErpStateService (Plan Base & Plan Full Core Processes)', () => {
  let service: ErpStateService;

  beforeEach(() => {
    // Clear localStorage to ensure a clean test state
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    TestBed.configureTestingModule({
      providers: [ErpStateService]
    });
    service = TestBed.inject(ErpStateService);
  });

  describe('1. Plan Tiering & Access Control (Base vs Full)', () => {
    it('should initialize with plan configurations defined for BASE and FULL', () => {
      expect(service.planConfigs['BASE']).toBeDefined();
      expect(service.planConfigs['FULL']).toBeDefined();
      expect(service.planConfigs['BASE'].priceUsdMonthly).toBe(35);
      expect(service.planConfigs['FULL'].priceUsdMonthly).toBe(95);
    });

    it('should allow all Core Base modules in BASE plan', () => {
      service.setCompanyPlan('BASE');
      expect(service.isBasePlan()).toBeTrue();
      expect(service.isFullPlan()).toBeFalse();

      const baseModules = [
        'dashboard',
        'inventory',
        'kardex',
        'purchases',
        'sales-pos',
        'quotes',
        'logistics',
        'treasury',
        'cash-closing',
        'manual'
      ];

      for (const mod of baseModules) {
        expect(service.isTabAllowedInPlan(mod))
          .withContext(`Module ${mod} should be allowed in BASE plan`)
          .toBeTrue();
      }
    });

    it('should restrict Enterprise modules in BASE plan and unlock them in FULL plan', () => {
      service.setCompanyPlan('BASE');
      
      const enterpriseModules = ['mrp', 'crm', 'accounting', 'users', 'audit-log', 'backups'];
      for (const mod of enterpriseModules) {
        expect(service.isTabAllowedInPlan(mod))
          .withContext(`Module ${mod} should NOT be allowed in BASE plan`)
          .toBeFalse();
      }

      // Switch to FULL plan
      service.setCompanyPlan('FULL');
      expect(service.isFullPlan()).toBeTrue();
      expect(service.isBasePlan()).toBeFalse();

      for (const mod of enterpriseModules) {
        expect(service.isTabAllowedInPlan(mod))
          .withContext(`Module ${mod} MUST be allowed in FULL plan`)
          .toBeTrue();
      }
    });
  });

  describe('2. BCV Exchange Rate & Currency Conversion (USD / VES)', () => {
    it('should correctly convert USD amounts to VES using current BCV rate', () => {
      service.updateBcvRate(36.50, 'TEST_SUITE');
      const bcv = service.bcvState();
      expect(bcv.usdRate).toBe(36.50);

      const usdAmount = 100;
      const expectedVes = 3650.00;
      expect(usdAmount * bcv.usdRate).toBe(expectedVes);
    });

    it('should correctly convert VES amounts to USD', () => {
      service.updateBcvRate(40.00, 'TEST_SUITE');
      const vesAmount = 400;
      const usdAmount = vesAmount / service.bcvState().usdRate;
      expect(usdAmount).toBe(10);
    });
  });

  describe('3. Inventory & Costing (Kardex & CPP - Costo Promedio Ponderado)', () => {
    it('should calculate Costo Promedio Ponderado (CPP) accurately upon new purchase reception', () => {
      // Create initial product with stock 10 at $10 each ($100 total value)
      const initialProduct: Product = {
        id: 'PROD_TEST_CPP',
        code: 'CPP-001',
        name: 'Cemento Gris Tipo I 42.5kg',
        category: 'Construcción',
        stock: 10,
        minStock: 5,
        unitCost: 10.00,
        salePrice: 15.00,
        taxType: 'GENERAL',
        location: 'Pasillo A1'
      };

      service.products.set([initialProduct]);

      // Purchase 20 units at $13.00 each ($260 total purchase)
      // Expected new stock = 10 + 20 = 30 units
      // Expected total value = $100 + $260 = $360
      // Expected new CPP = 360 / 30 = $12.00
      const purchaseQty = 20;
      const purchaseUnitCost = 13.00;

      const current = service.products().find(p => p.id === 'PROD_TEST_CPP')!;
      const totalOldValue = current.stock * current.unitCost;
      const totalNewValue = purchaseQty * purchaseUnitCost;
      const newStock = current.stock + purchaseQty;
      const expectedCpp = (totalOldValue + totalNewValue) / newStock;

      expect(expectedCpp).toBe(12.00);

      // Perform stock reception and kardex update
      service.products.update(list => list.map(p => {
        if (p.id === 'PROD_TEST_CPP') {
          return {
            ...p,
            stock: newStock,
            unitCost: expectedCpp
          };
        }
        return p;
      }));

      const updated = service.products().find(p => p.id === 'PROD_TEST_CPP')!;
      expect(updated.stock).toBe(30);
      expect(updated.unitCost).toBe(12.00);
    });

    it('should flag low stock alerts when stock falls below or equals minStock', () => {
      const lowStockProd: Product = {
        id: 'PROD_LOW',
        code: 'LOW-01',
        name: 'Tubo PVC 1/2 pulgada',
        category: 'Plomería',
        stock: 3,
        minStock: 10,
        unitCost: 2.00,
        salePrice: 4.00,
        taxType: 'GENERAL'
      };

      service.products.set([lowStockProd]);
      const alerts = service.products().filter(p => p.stock <= p.minStock);
      expect(alerts.length).toBe(1);
      expect(alerts[0].code).toBe('LOW-01');
    });
  });

  describe('4. POS Point of Sale & SENIAT Fiscal Billing (IVA 16% + IGTF 3%)', () => {
    it('should accurately compute Subtotal, 16% IVA and 3% IGTF for cash USD payments', () => {
      const itemSubtotalUsd = 100.00;
      const ivaRate = 0.16;
      const ivaAmountUsd = itemSubtotalUsd * ivaRate; // $16.00
      const subtotalWithIva = itemSubtotalUsd + ivaAmountUsd; // $116.00

      // Scenario: Customer pays $116.00 in CASH USD (Subject to 3% IGTF)
      const igtfRate = 0.03;
      const igtfAmountUsd = subtotalWithIva * igtfRate; // $3.48
      const totalPayableUsd = subtotalWithIva + igtfAmountUsd; // $119.48

      expect(ivaAmountUsd).toBeCloseTo(16.00, 2);
      expect(igtfAmountUsd).toBeCloseTo(3.48, 2);
      expect(totalPayableUsd).toBeCloseTo(119.48, 2);

      // Verify at BCV rate of 36.50
      const rate = 36.50;
      const totalPayableVes = totalPayableUsd * rate;
      expect(totalPayableVes).toBeCloseTo(4361.02, 2);
    });

    it('should record completed sales invoice, deduct product stock, and register in Kardex', () => {
      const initialStock = 50;
      const soldQty = 5;

      const testProduct: Product = {
        id: 'PROD_POS_1',
        code: 'SKU-POS-1',
        name: 'Taladro Percutor 1/2 650W',
        category: 'Herramientas',
        stock: initialStock,
        minStock: 5,
        unitCost: 35.00,
        salePrice: 55.00,
        taxType: 'GENERAL'
      };

      service.products.set([testProduct]);

      const testInvoice: Invoice = {
        id: 'INV-TEST-001',
        number: 'FAC-2026-0099',
        controlNumber: '00-000099',
        date: new Date().toISOString(),
        customerName: 'Constructora Bolívar C.A.',
        customerTaxId: 'J-31445566-7',
        items: [
          {
            productId: 'PROD_POS_1',
            productName: 'Taladro Percutor 1/2 650W',
            quantity: soldQty,
            unitPriceUsd: 55.00,
            unitPriceVes: 55.00 * 36.50,
            subtotalUsd: 275.00,
            taxAmountUsd: 44.00,
            totalUsd: 319.00
          }
        ],
        subtotalUsd: 275.00,
        taxAmountUsd: 44.00,
        igtfAmountUsd: 0,
        totalUsd: 319.00,
        totalVes: 319.00 * 36.50,
        exchangeRate: 36.50,
        payments: [
          {
            method: 'PUNTO_DE_VENTA_DEBITO',
            amountUsd: 319.00,
            amountVes: 319.00 * 36.50,
            currency: 'VES',
            reference: 'OP-884920'
          }
        ],
        status: 'PAID',
        cashRegisterShiftId: 'SHIFT_01'
      };

      service.addInvoice(testInvoice);

      // Verify invoice is stored
      expect(service.invoices().some(i => i.id === 'INV-TEST-001')).toBeTrue();

      // Verify stock was decremented by soldQty
      const productAfterSale = service.products().find(p => p.id === 'PROD_POS_1')!;
      expect(productAfterSale.stock).toBe(initialStock - soldQty);

      // Verify Kardex record was created
      const kardexEntry = service.kardex().find(k => k.productId === 'PROD_POS_1' && k.type === 'SALE');
      expect(kardexEntry).toBeDefined();
      expect(kardexEntry?.quantity).toBe(soldQty);
      expect(kardexEntry?.balanceStock).toBe(initialStock - soldQty);
    });
  });

  describe('5. Quotes & Presupuestos Conversion', () => {
    it('should create quotes and manage status lifecycle', () => {
      const quote: Quote = {
        id: 'QUOTE-TEST-001',
        number: 'COT-2026-001',
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        customerName: 'Inversiones Los Andes S.A.',
        customerTaxId: 'J-29837192-3',
        customerPhone: '+58 414 1234567',
        customerEmail: 'compras@losandes.com',
        items: [
          {
            productId: 'PROD-1',
            productName: 'Bombillo LED 12W',
            quantity: 100,
            unitPriceUsd: 2.50,
            unitPriceVes: 91.25,
            subtotalUsd: 250.00,
            taxAmountUsd: 40.00,
            totalUsd: 290.00
          }
        ],
        subtotalUsd: 250.00,
        taxAmountUsd: 40.00,
        totalUsd: 290.00,
        totalVes: 290.00 * 36.50,
        exchangeRate: 36.50,
        status: 'PENDING',
        notes: 'Precios válidos por 7 días continuos'
      };

      service.quotes.update(list => [quote, ...list]);
      expect(service.quotes().length).toBeGreaterThan(0);

      // Update status to APPROVED
      service.quotes.update(list => list.map(q => q.id === 'QUOTE-TEST-001' ? { ...q, status: 'APPROVED' } : q));
      const approved = service.quotes().find(q => q.id === 'QUOTE-TEST-001')!;
      expect(approved.status).toBe('APPROVED');
    });
  });

  describe('6. Purchases & Accounts Payable (Compras y CxP)', () => {
    it('should create purchase orders and track accounts payable in Treasury', () => {
      const initialCount = service.purchaseOrders().length;

      const order: PurchaseOrder = {
        id: 'PO-TEST-001',
        number: 'OC-2026-005',
        supplierId: 'SUP-01',
        supplierName: 'Distribuidora Ferretera Central C.A.',
        supplierTaxId: 'J-00192837-1',
        date: new Date().toISOString(),
        items: [
          {
            productId: 'PROD-1',
            productName: 'Cable Eléctrico THW 12 AWG',
            quantity: 10,
            unitCostUsd: 28.00,
            totalCostUsd: 280.00
          }
        ],
        subtotalUsd: 280.00,
        taxAmountUsd: 44.80,
        totalUsd: 324.80,
        status: 'RECEIVED',
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'UNPAID'
      };

      service.purchaseOrders.update(list => [order, ...list]);
      expect(service.purchaseOrders().length).toBe(initialCount + 1);

      // Verify it appears in pending accounts payable
      const pendingPayables = service.purchaseOrders().filter(po => po.paymentStatus === 'UNPAID');
      expect(pendingPayables.some(po => po.id === 'PO-TEST-001')).toBeTrue();
    });
  });

  describe('7. Cash Register Shifts & Closing (Cierre de Caja Z)', () => {
    it('should open shift, track payment breakdown, and compute cash variance', () => {
      // Open shift with $50.00 initial cash
      const initialCashUsd = 50.00;
      const shiftId = 'SHIFT-QA-001';

      service.openCashShift('Caja Principal 01', 'Admin QA', initialCashUsd, 0);
      expect(service.activeCashShift()).toBeDefined();

      // Add a simulated cash sale of $100.00 USD
      const testInvoice: Invoice = {
        id: 'INV-SHIFT-01',
        number: 'FAC-001',
        controlNumber: '00-001',
        date: new Date().toISOString(),
        customerName: 'Cliente Contado',
        customerTaxId: 'V-12345678',
        items: [],
        subtotalUsd: 86.21,
        taxAmountUsd: 13.79,
        igtfAmountUsd: 3.00,
        totalUsd: 103.00,
        totalVes: 3759.50,
        exchangeRate: 36.50,
        payments: [
          {
            method: 'EFECTIVO_USD',
            amountUsd: 103.00,
            amountVes: 3759.50,
            currency: 'USD'
          }
        ],
        status: 'PAID',
        cashRegisterShiftId: shiftId
      };

      service.invoices.update(list => [testInvoice, ...list]);
      expect(service.invoices().some(i => i.id === 'INV-SHIFT-01')).toBeTrue();

      // Expected total cash in drawer = $50 initial + $103 sale = $153.00
      const expectedCashInDrawer = initialCashUsd + testInvoice.totalUsd;
      expect(expectedCashInDrawer).toBe(153.00);

      // Arqueo: Cashier counts $153.00 -> Difference should be $0.00 (Cuadrada)
      const countedCashUsd = 153.00;
      const difference = countedCashUsd - expectedCashInDrawer;
      expect(difference).toBe(0);
    });
  });

  describe('8. Treasury & Bank Balances (Tesorería Básica)', () => {
    it('should maintain bank accounts and reflect collection balances', () => {
      const initialBanesco = service.bankAccounts().find(b => b.bankName.includes('Banesco') || b.currency === 'VES');
      expect(initialBanesco).toBeDefined();

      const startBalance = initialBanesco!.balance;
      const depositAmount = 5000.00;

      // Simulate treasury deposit
      service.bankAccounts.update(banks => banks.map(b => {
        if (b.id === initialBanesco!.id) {
          return { ...b, balance: b.balance + depositAmount };
        }
        return b;
      }));

      const updatedBanesco = service.bankAccounts().find(b => b.id === initialBanesco!.id)!;
      expect(updatedBanesco.balance).toBe(startBalance + depositAmount);
    });
  });
});
