import { CompanyFiscalProfile, Customer, Quote } from '../../models/erp.models';
import {
  buildQuoteEmail,
  buildQuoteWhatsAppMessage,
  filterQuoteCustomers,
  findQuoteCustomer,
  quoteCustomerName,
  quoteCustomerTaxId
} from './quote-document';

const company: CompanyFiscalProfile = {
  legalName: 'Comercial Actualizada, C.A.',
  tradeName: 'Comercial',
  taxId: 'J-98765432-1',
  isSpecialTaxpayer: false,
  address: 'Av. Nueva',
  phone: '0212-5550000',
  email: 'ventas@actualizada.test',
  defaultIvaRate: 0.16,
  igtfRate: 0.03
};

const customer: Customer = {
  id: 'customer-1',
  name: 'Inversiones Águila',
  taxId: 'J-12345678-9',
  email: 'compras@aguila.test',
  phone: '+58 412 1234567',
  address: 'Calle 1',
  customerType: 'EMPRESA'
};

const quote: Quote = {
  id: 'quote-1',
  quoteNumber: 'COT-2026-021',
  customerId: 'customer-1',
  customerName: 'Nombre al emitir',
  customerTaxId: 'J-12345678-9',
  warehouseId: 'warehouse-1',
  issueDate: '2026-10-11T12:00:00.000Z',
  date: '2026-10-10 12:00:00',
  validUntil: '2026-10-20T00:00:00.000Z',
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
  discountTotal: 0,
  taxTotal: 16,
  total: 116,
  totalVes: 4234,
  createdBy: 'Vendedor',
  sellerName: 'Vendedor'
};

describe('quote document helpers', () => {
  it('filters customers by normalized name or RIF/cédula', () => {
    expect(filterQuoteCustomers([customer], 'aguila')).toEqual([customer]);
    expect(filterQuoteCustomers([customer], 'j123456789')).toEqual([customer]);
    expect(filterQuoteCustomers([customer], 'no existe')).toEqual([]);
  });

  it('resolves the current customer by id, then falls back to tax ID', () => {
    const currentCustomer = { ...customer, name: 'Razón social vigente' };
    expect(findQuoteCustomer(quote, [currentCustomer])).toBe(currentCustomer);
    expect(findQuoteCustomer({ ...quote, customerId: 'deleted-id' }, [currentCustomer])).toBe(currentCustomer);
    expect(quoteCustomerName(quote, currentCustomer)).toBe('Razón social vigente');
    expect(quoteCustomerTaxId(quote, currentCustomer)).toBe('J-12345678-9');
  });

  it('uses current company, customer contact and quote values in the WhatsApp content', () => {
    const message = buildQuoteWhatsAppMessage(quote, company, customer, 36.5);

    expect(message).toContain('Comercial Actualizada, C.A.');
    expect(message).toContain('RIF: J-98765432-1');
    expect(message).toContain('Inversiones Águila (J-12345678-9)');
    expect(message).toContain('COT-2026-021');
    expect(message).toContain('Producto cotizado');
    expect(message).toContain('Bs. 4.234,00');
  });

  it('builds the email with current recipient/company and falls back to quote customer snapshot', () => {
    const email = buildQuoteEmail(quote, company, customer, 36.5);
    expect(email.recipient).toBe('compras@aguila.test');
    expect(email.subject).toContain('Comercial Actualizada, C.A.');
    expect(email.body).toContain('ventas@actualizada.test');
    expect(email.body).toContain('Inversiones Águila (J-12345678-9)');

    const snapshotEmail = buildQuoteEmail(quote, company, undefined, 36.5);
    expect(snapshotEmail.recipient).toBe('');
    expect(snapshotEmail.body).toContain('Nombre al emitir (J-12345678-9)');
  });

  it('uses saved issuer and customer snapshots instead of subsequently changed profiles', () => {
    const historicalQuote: Quote = {
      ...quote,
      customerSnapshot: {
        name: 'Cliente histórico',
        taxId: 'J-11111111-1',
        email: 'historico@cliente.test',
        phone: '+58 412 1111111',
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
    };

    const message = buildQuoteWhatsAppMessage(historicalQuote, company, customer, 36.5);
    const email = buildQuoteEmail(historicalQuote, company, customer, 36.5);

    expect(message).toContain('Emisor histórico, C.A.');
    expect(message).toContain('Cliente histórico (J-11111111-1)');
    expect(message).not.toContain('Comercial Actualizada, C.A.');
    expect(email.recipient).toBe('historico@cliente.test');
    expect(email.subject).toContain('Emisor histórico, C.A.');
    expect(email.body).toContain('historico@emisor.test');
    expect(email.body).not.toContain('compras@aguila.test');
  });
});
