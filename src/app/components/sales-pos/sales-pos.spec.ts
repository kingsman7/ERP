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
  const notify = vi.fn();

  beforeEach(async () => {
    products.set([product]);
    notify.mockClear();

    await TestBed.configureTestingModule({
      imports: [SalesPosComponent],
      providers: [
        {
          provide: ErpStateService,
          useValue: {
            products,
            warehouses: signal([]),
            customers: signal([]),
            notify,
          },
        },
        { provide: AuthService, useValue: {} },
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
});
