import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompanyFiscalProfile, Customer, Quote } from '../../models/erp.models';
import { ErpStateService } from '../../services/erp-state.service';
import { QuotePrintModal } from './quote-print-modal';

const company: CompanyFiscalProfile = {
  legalName: 'Emisor vigente, C.A.',
  tradeName: 'Emisor',
  taxId: 'J-55555555-5',
  isSpecialTaxpayer: false,
  address: 'Av. Central 10',
  phone: '0212-1111111',
  email: 'actual@emisor.test',
  defaultIvaRate: 0.16,
  igtfRate: 0.03
};

const customer: Customer = {
  id: 'customer-current',
  name: 'Cliente actualizado',
  taxId: 'V-12345678',
  email: 'cliente@test',
  phone: '0412-1234567',
  address: 'Calle actual',
  customerType: 'PERSONA_NATURAL'
};

const quote: Quote = {
  id: 'quote-1',
  quoteNumber: 'COT-2026-021',
  customerId: 'customer-deleted',
  customerName: 'Cliente guardado en cotización',
  customerTaxId: 'V-12345678',
  warehouseId: 'warehouse-1',
  issueDate: '2026-10-11T12:00:00.000Z',
  validUntil: '2026-10-20T00:00:00.000Z',
  date: '2026-10-11',
  status: 'BORRADOR',
  items: [{
    productId: 'product-1',
    sku: 'SKU-1',
    name: 'Producto cotizado',
    unit: 'UND',
    quantity: 2,
    unitPrice: 50,
    costPrice: 20,
    discountPercent: 0,
    isTaxExempt: false,
    taxRate: 0.16,
    subtotal: 100,
    taxAmount: 16,
    total: 116
  }],
  baseCurrency: 'USD',
  bcvRate: 36.5,
  subtotal: 100,
  discountGlobalPercent: 0,
  discountTotal: 0,
  taxTotal: 16,
  total: 116,
  totalVes: 4234,
  createdBy: 'Vendedor',
  sellerName: 'Vendedor'
};

describe('QuotePrintModal', () => {
  let fixture: ComponentFixture<QuotePrintModal>;
  const companyProfile = signal(company);

  beforeEach(async () => {
    companyProfile.set(company);
    await TestBed.configureTestingModule({
      imports: [QuotePrintModal],
      providers: [{
        provide: ErpStateService,
        useValue: {
          companyProfile,
          customers: signal([customer]),
          bcvState: signal({ usdRate: 36.5 })
        }
      }]
    }).compileComponents();
    fixture = TestBed.createComponent(QuotePrintModal);
    fixture.componentRef.setInput('quote', quote);
  });

  it('prints current issuer and resolves a customer by tax ID when the saved ID is outdated', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Emisor vigente, C.A.');
    expect(text).toContain('J-55555555-5');
    expect(text).toContain('Cliente actualizado');
    expect(text).toContain('Calle actual');
    expect(text).toContain('COT-2026-021');
  });

  it('falls back to the customer snapshot and keeps the quote total free of a speculative IGTF addition', () => {
    TestBed.inject(ErpStateService).customers.set([]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cliente guardado en cotización');
    expect(text).toContain('V-12345678');
    expect(text).toContain('116.00');
    expect(text).not.toContain('119.48');
  });

  it('updates issuer values when the company profile changes while the print view is open', () => {
    fixture.detectChanges();
    companyProfile.set({ ...company, legalName: 'Nuevo nombre legal', taxId: 'J-11111111-1' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nuevo nombre legal');
    expect(fixture.nativeElement.textContent).toContain('J-11111111-1');
  });

  it('prints the saved issuer and customer snapshots when current profiles have changed', () => {
    fixture.componentRef.setInput('quote', {
      ...quote,
      customerSnapshot: {
        name: 'Cliente histórico',
        taxId: 'V-87654321',
        email: 'historico@cliente.test',
        phone: '0412-8765432',
        address: 'Dirección histórica'
      },
      companySnapshot: {
        legalName: 'Emisor histórico, C.A.',
        tradeName: 'Emisor histórico',
        taxId: 'J-22222222-2',
        address: 'Dirección del emisor histórica',
        phone: '0212-2222222',
        email: 'historico@emisor.test',
        defaultIvaRate: 0.16,
        isSpecialTaxpayer: false,
        specialTaxpayerDesignationNumber: '',
        igtfRate: 0.03
      }
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Emisor histórico, C.A.');
    expect(text).toContain('J-22222222-2');
    expect(text).toContain('Cliente histórico');
    expect(text).toContain('V-87654321');
    expect(text).toContain('Dirección histórica');
    expect(text).not.toContain('Emisor vigente, C.A.');
    expect(text).not.toContain('Cliente actualizado');
  });
});
