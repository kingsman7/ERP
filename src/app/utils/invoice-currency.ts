import { Invoice, PaymentRecord } from '../models/erp.models';

function rate(invoice: Invoice): number {
  return invoice.bcvRate > 0 ? invoice.bcvRate : 1;
}

export function isInvoiceInVes(invoice: Invoice): boolean {
  return invoice.baseCurrency === 'VES';
}

/** Convierte un monto fiscal de la moneda base de la factura a bolívares. */
export function invoiceAmountBs(invoice: Invoice, amount: number | undefined | null): number {
  const value = amount || 0;
  return isInvoiceInVes(invoice) ? value : value * rate(invoice);
}

/** Convierte un monto fiscal de la moneda base de la factura a dólares. */
export function invoiceAmountUsd(invoice: Invoice, amount: number | undefined | null): number {
  const value = amount || 0;
  return isInvoiceInVes(invoice) ? value / rate(invoice) : value;
}

export function invoiceTotalUsd(invoice: Invoice): number {
  return invoiceAmountUsd(invoice, invoice.total);
}

export function invoiceTotalVes(invoice: Invoice): number {
  if (invoice.totalVes) return invoice.totalVes;
  return invoiceAmountBs(invoice, invoice.total);
}

export function paymentAmountBs(invoice: Invoice, payment: PaymentRecord): number {
  const amount = payment.amount || 0;
  if (payment.currency === 'VES') return amount;
  if (payment.currency === 'EUR') return amount * (invoice.eurRate || rate(invoice));
  return amount * rate(invoice);
}

export function isUsdCreditBalance(payment: PaymentRecord): boolean {
  return payment.method === 'SALDO_A_FAVOR' && (payment.currency || 'USD') === 'USD';
}
