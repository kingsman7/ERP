import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Product } from '../../models/erp.models';
import { AuthService } from '../../services/auth.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { ErpStateService } from '../../services/erp-state.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import SalesPosComponent from './sales-pos';

const product: Product = {
  id: 'product-1',
  sku: 'SKU-CAFE-01',
  barcode: '7791234567890',
  name: 'Café molido',
  category: 'Bebidas',
  unit: 'UND',
  costPrice: 3,
  salePrice: 5,
  prices: { price1: 5, price2: 5, price3: 5, price4: 5, price5: 5 },
  isTaxExempt: false,
  taxRate: 0.16,
  minStock: 1,
  totalStock: 8,
  stockByWarehouse: [],
  status: 'ACTIVE',
  updatedAt: '2026-10-12',
};

describe('SalesPosComponent product search', () => {
  const products = signal<Product[]>([product]);
  const activeCashSession = signal<any>({ status: 'ABIERTA', sessionCode: 'CAJA-01' });
  const bcvState = signal<any>({ usdRate: 36.5, eurRate: 39.0, origin: 'API_BCV', isSyncing: false });
  const notify = vi.fn();
  const reopenCashSession = vi.fn().mockResolvedValue({ success: true });
  const registerSaleInvoice = vi.fn();

  beforeEach(async () => {
    products.set([product]);
    activeCashSession.set({ status: 'ABIERTA', sessionCode: 'CAJA-01' });
    notify.mockClear();
    reopenCashSession.mockClear();
    registerSaleInvoice.mockClear();

    await TestBed.configureTestingModule({
      imports: [SalesPosComponent],
      providers: [
        {
          provide: ErpStateService,
          useValue: {
            products,
            warehouses: signal([{ id: 'wh-01', name: 'Almacén Principal', code: 'AP', isMain: true }]),
            customers: signal([{ id: 'cust-01', name: 'Cliente General' }]),
            invoices: signal([]),
            companyProfile: signal({ isSpecialTaxpayer: false }),
            activeCashSession,
            bcvState,
            notify,
            reopenCashSession,
            registerSaleInvoice,
            getProductPriceByLevel: (p: any) => p?.salePrice || 5,
            isBolivaresPaymentMethod: () => false,
            isForeignCurrencyPaymentMethod: () => false,
          },
        },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'usr-1', name: 'Cajero' }) } },
        { provide: EmailNotificationService, useValue: {} },
        { provide: KeyboardShortcutsService, useValue: { lastExecutedAction: signal(null) } },
      ],
    }).compileComponents();
  });

  it('does not expose the catalog until a search query is entered', () => {
    const fixture = TestBed.createComponent(SalesPosComponent);
    const component = fixture.componentInstance;
    component.selectedWarehouseId.set('ALL');

    expect(component.filteredCatalog()).toEqual([]);

    component.searchQuery.set('cafe');

    expect(component.filteredCatalog()).toEqual([product]);
  });

  it('filters by SKU and barcode without requiring a category selection', () => {
    const fixture = TestBed.createComponent(SalesPosComponent);
    const component = fixture.componentInstance;
    component.selectedWarehouseId.set('ALL');

    component.searchQuery.set('sku-cafe');
    expect(component.filteredCatalog()).toEqual([product]);

    component.searchQuery.set('7791234567890');
    expect(component.filteredCatalog()).toEqual([product]);
  });

  it('adds an exact scanned SKU or barcode to the cart and clears the query', () => {
    const fixture = TestBed.createComponent(SalesPosComponent);
    const component = fixture.componentInstance;
    const addToCart = vi.spyOn(component, 'addToCart').mockImplementation(() => undefined);
    component.searchQuery.set(product.sku);

    component.onBarcodeScanned(product.sku);

    expect(addToCart).toHaveBeenCalledWith(product);
    expect(component.searchQuery()).toBe('');
  });

  it('correctly tracks open cash register session and blocks checkout when closed', async () => {
    const fixture = TestBed.createComponent(SalesPosComponent);
    const component = fixture.componentInstance;

    expect(component.isCashSessionOpen()).toBe(true);
    expect(component.isCheckoutDisabled()).toBe(true); // empty cart

    // Add item to cart
    component.cartItems.set([{ product, quantity: 1, discountPercent: 0, priceLevel: 'price1' }]);
    expect(component.isCheckoutDisabled()).toBe(false);

    // Close cash session
    activeCashSession.set({ status: 'CERRADA', sessionCode: 'CAJA-01' });
    expect(component.isCashSessionOpen()).toBe(false);
    expect(component.isCheckoutDisabled()).toBe(true);

    // Attempt checkout while closed
    await component.checkout();
    expect(notify).toHaveBeenCalledWith(
      'warning',
      'Turno de Caja Cerrado',
      expect.stringContaining('Debe abrir un turno de caja')
    );
    expect(component.showOpenSessionModal()).toBe(true);
    expect(registerSaleInvoice).not.toHaveBeenCalled();
  });

  it('opens a new cash session via confirmOpenCashSession and updates modal state', async () => {
    const fixture = TestBed.createComponent(SalesPosComponent);
    const component = fixture.componentInstance;

    component.showOpenSessionModal.set(true);
    await component.confirmOpenCashSession(100, 500);

    expect(reopenCashSession).toHaveBeenCalledWith(100, 500, expect.any(String));
    expect(component.showOpenSessionModal()).toBe(false);
  });
});
