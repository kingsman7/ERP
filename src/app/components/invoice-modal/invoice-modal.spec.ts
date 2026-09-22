import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Invoice, CompanyFiscalProfile } from '../../models/erp.models';
import { ErpStateService } from '../../services/erp-state.service';
import { InvoiceModal } from './invoice-modal';

const companyProfile: CompanyFiscalProfile = {
  legalName: 'Empresa Demo',
  tradeName: 'Demo',
  taxId: 'J-12345678-9',
  isSpecialTaxpayer: true,
  address: 'Av. Principal',
  phone: '0212-0000000',
  email: 'demo@example.com',
  defaultIvaRate: 0.16,
  igtfRate: 0.03,
};

const invoice: Invoice & {
  withholdingIvaPercent: number;
  withholdingIvaAmount: number;
  withholdingIslrPercent: number;
  withholdingIslrAmount: number;
  withholdingIslrNature: string;
} = {
  id: 'invoice-1', invoiceNumber: 'FAC-0001', customerId: 'customer-1', customerName: 'Cliente Demo', customerTaxId: 'V-123',
  warehouseId: 'warehouse-1', date: '21/09/2026', type: 'FACTURA_ELECTRONICA', status: 'EMITIDA',
  baseCurrency: 'USD', paymentCurrency: 'USD', bcvRate: 36.5, eurRate: 39.8, rateOrigin: 'API_BCV', priceLevelApplied: 'price1',
  subtotal: 200, discountTotal: 0, taxTotal: 38, total: 238, totalVes: 8687, totalEur: 218.09,
  taxDetails: { taxableBase: 200, exemptBase: 0, ivaPercent: 16, ivaAmount: 32, appliesIgtf: true, igtfPercent: 3, igtfBase: 200, igtfAmount: 6 },
  withholdingIvaPercent: 75, withholdingIvaAmount: 24, withholdingIslrPercent: 2, withholdingIslrAmount: 4, withholdingIslrNature: 'Honorarios',
  items: [{ productId: 'product-1', sku: 'SKU-1', productName: 'Producto Demo', unit: 'UND', quantity: 2, unitPrice: 100, costPrice: 40, discountPercent: 0, taxRate: 0.16, subtotal: 200, taxAmount: 32, total: 232 }],
  payments: [{ method: 'EFECTIVO_USD', amount: 200, currency: 'USD', reference: 'ref-1' }], sellerId: 'seller-1', sellerName: 'Caja principal', digitalSeal: 'seal-1',
};

describe('InvoiceModal', () => {
  let fixture: ComponentFixture<InvoiceModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceModal],
      providers: [{ provide: ErpStateService, useValue: { companyProfile: signal(companyProfile) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(InvoiceModal);
  });

  it('renders currency, BCV rate, payment, IVA, retentions and IGTF details', () => {
    fixture.componentRef.setInput('invoice', invoice);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('FAC-0001');
    expect(text).toContain('Tasa BCV: Bs. 36.50 / USD');
    expect(text).toContain('EFECTIVO USD');
    expect(text).toContain('IVA (16%)');
    expect(text).toContain('Retención IVA (75%)');
    expect(text).toContain('-$24.00');
    expect(text).toContain('Retención ISLR (2% - Honorarios)');
    expect(text).toContain('-$4.00');
    expect(text).toContain('Percepción IGTF 3.00%');
    expect(text).not.toContain('Retención IGTF');
    expect(text).toContain('TOTAL EN BOLÍVARES (VES)');
  });

  it('shows the non-IGTF message when the invoice has no foreign tax', () => {
    fixture.componentRef.setInput('invoice', { ...invoice, taxDetails: { ...invoice.taxDetails, appliesIgtf: false, igtfAmount: 0 } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Exento de IGTF (0.00%)');
    expect(fixture.nativeElement.textContent).not.toContain('Percepción IGTF 3.00%');
  });

  it('emits closeModal when the close action is clicked', () => {
    fixture.componentRef.setInput('invoice', invoice);
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const closeButton = buttons.find(button => button.textContent?.includes('Cerrar Comprobante')) as HTMLButtonElement;
    let emitted = false;
    fixture.componentInstance.closeModal.subscribe(() => emitted = true);

    closeButton.click();

    expect(emitted).toBe(true);
  });
});