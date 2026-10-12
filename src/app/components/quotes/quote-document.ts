import { CompanyFiscalProfile, Customer, Quote, QuoteCustomerSnapshot } from '../../models/erp.models';
import { matchesEntitySearch } from '../../utils/entity-search';

export function filterQuoteCustomers(customers: Customer[], query: string): Customer[] {
  return customers.filter(customer =>
    matchesEntitySearch(query, customer.name, customer.taxId)
  );
}

export function findQuoteCustomer(quote: Quote, customers: Customer[]): Customer | undefined {
  return customers.find(customer => customer.id === quote.customerId)
    ?? customers.find(customer => customer.taxId.trim().toLowerCase() === quote.customerTaxId.trim().toLowerCase());
}

export function quoteCustomerDetails(quote: Quote, customer?: Customer): QuoteCustomerSnapshot {
  if (quote.customerSnapshot) return quote.customerSnapshot;
  return {
    name: customer?.name || quote.customerName || 'Cliente',
    taxId: customer?.taxId || quote.customerTaxId || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || ''
  };
}

export function quoteCompanyDetails(quote: Quote, company: CompanyFiscalProfile): CompanyFiscalProfile {
  return quote.companySnapshot ? { ...company, ...quote.companySnapshot } : company;
}

export function quoteCustomerName(quote: Quote, customer?: Customer): string {
  return quoteCustomerDetails(quote, customer).name;
}

export function quoteCustomerTaxId(quote: Quote, customer?: Customer): string {
  return quoteCustomerDetails(quote, customer).taxId;
}

function quoteDate(quote: Quote): string {
  const date = quote.issueDate || quote.date;
  return date ? date.substring(0, 10) : 'N/A';
}

function companyContact(company: CompanyFiscalProfile, separator: string): string {
  return [company.phone, company.email].filter(Boolean).join(separator);
}

function companyAddress(company: CompanyFiscalProfile): string {
  return company.address ? `Dirección: ${company.address}` : '';
}

export function buildQuoteWhatsAppMessage(
  quote: Quote,
  company: CompanyFiscalProfile,
  customer: Customer | undefined,
  bcvRate: number
): string {
  const issuer = quoteCompanyDetails(quote, company);
  const customerDetails = quoteCustomerDetails(quote, customer);
  const customerName = customerDetails.name;
  const customerTaxId = customerDetails.taxId;
  const totalVes = quote.totalVes || quote.total * bcvRate;
  const items = quote.items
    .map(item => `• ${item.quantity}x ${item.name}: $${Number(item.total || 0).toFixed(2)}`)
    .join('\n');
  const issuerDetails = [
    issuer.taxId ? `RIF: ${issuer.taxId}` : '',
    companyAddress(issuer),
    companyContact(issuer, ' · ')
  ].filter(Boolean).join('\n');

  return `*PRESUPUESTO COMERCIAL - ${issuer.legalName}*
${issuerDetails ? `${issuerDetails}\n` : ''}*Cotización Nº:* ${quote.quoteNumber}
*Cliente:* ${customerName}${customerTaxId ? ` (${customerTaxId})` : ''}
*Fecha:* ${quoteDate(quote)} | *Válido hasta:* ${quote.validUntil?.substring(0, 10) || 'N/A'}

*Detalle de Artículos:*
${items || 'Sin artículos'}

*Total Cotizado:* $${Number(quote.total).toFixed(2)} USD
*Contravalor Oficial BCV:* Bs. ${totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa: Bs. ${Number(bcvRate).toFixed(2)})${quote.notes ? `\n\n*Condiciones:* ${quote.notes}` : ''}

_Quedamos atentos a su confirmación para proceder con el despacho y facturación fiscal._`;
}

export function buildQuoteEmail(
  quote: Quote,
  company: CompanyFiscalProfile,
  customer: Customer | undefined,
  bcvRate: number
): { recipient: string; subject: string; body: string } {
  const issuer = quoteCompanyDetails(quote, company);
  const customerDetails = quoteCustomerDetails(quote, customer);
  const customerName = customerDetails.name;
  const customerTaxId = customerDetails.taxId;
  const totalVes = quote.totalVes || quote.total * bcvRate;
  const issuerDetails = [
    issuer.taxId ? `RIF: ${issuer.taxId}` : '',
    companyAddress(issuer),
    companyContact(issuer, '\r\n')
  ].filter(Boolean).join('\r\n');
  const items = quote.items
    .map(item => `- ${item.quantity}x ${item.name}: $${Number(item.total || 0).toFixed(2)}`)
    .join('\r\n');

  return {
    recipient: customerDetails.email,
    subject: `Presupuesto Comercial ${quote.quoteNumber} - ${issuer.legalName}`,
    body: `Estimado/a ${customerName},

Adjuntamos el presupuesto comercial solicitado:

Número: ${quote.quoteNumber}
Cliente: ${customerName}${customerTaxId ? ` (${customerTaxId})` : ''}
Fecha: ${quoteDate(quote)}
Válido hasta: ${quote.validUntil?.substring(0, 10) || 'N/A'}

Artículos incluidos:
${items || 'Sin artículos'}

Subtotal: $${Number(quote.subtotal || 0).toFixed(2)}
Descuento: $${Number(quote.discountTotal || 0).toFixed(2)}
IVA estimado: $${Number(quote.taxTotal || 0).toFixed(2)}
TOTAL USD: $${Number(quote.total).toFixed(2)}
TOTAL OFICIAL BS: Bs. ${totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa BCV: Bs. ${Number(bcvRate).toFixed(2)})${quote.notes ? `\r\n\r\nCondiciones: ${quote.notes}` : ''}

Quedamos a su disposición para cualquier consulta.

Atentamente,
${issuer.legalName}
${issuerDetails}`
  };
}
