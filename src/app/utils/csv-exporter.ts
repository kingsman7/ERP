import { Product, Invoice } from '../models/erp.models';

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 */
function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes(';')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates and triggers the browser download of a CSV file with UTF-8 BOM encoding.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const headerLine = headers.map(escapeCsvCell).join(',');
    const rowLines = rows.map(row => row.map(escapeCsvCell).join(','));
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error generating CSV file:', err);
    return false;
  }
}

/**
 * Exports current inventory / products catalog to CSV with complete pricing tiers and tax details.
 */
export function exportInventoryToCsv(
  products: Product[],
  bcvRate: number
): boolean {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Inventario_NexusERP_${dateStr}`;

  const headers = [
    'ID Sistema',
    'SKU',
    'Código de Barras',
    'Nombre del Producto',
    'Categoría',
    'Unidad de Medida',
    'Costo Promedio Unitario ($ USD)',
    'Costo Promedio Unitario (Bs. BCV)',
    'Precio 1 Detal ($ USD)',
    'Precio 1 Detal (Bs. BCV)',
    'Precio 2 Mayor ($ USD)',
    'Precio 3 Distribuidor ($ USD)',
    'Precio 4 VIP ($ USD)',
    'Precio 5 Especial ($ USD)',
    'Condición IVA',
    'Alícuota IVA (%)',
    'Stock Total Físico',
    'Stock Mínimo',
    'Estado de Stock',
    'Valorización Total Costo ($ USD)',
    'Valorización Total Costo (Bs. BCV)',
    'Valorización Total Venta P1 ($ USD)',
    'Estado',
    'Última Actualización'
  ];

  const rows = products.map(p => {
    const p1 = p.prices?.price1 ?? p.salePrice;
    const p2 = p.prices?.price2 ?? (p1 * 0.90);
    const p3 = p.prices?.price3 ?? (p1 * 0.82);
    const p4 = p.prices?.price4 ?? (p1 * 0.78);
    const p5 = p.prices?.price5 ?? (p1 * 0.75);

    const costUsd = p.costPrice || 0;
    const costVes = costUsd * bcvRate;
    const p1Ves = p1 * bcvRate;

    const isExempt = p.isTaxExempt || p.taxRate === 0;
    const taxCondition = isExempt ? 'EXENTO (0%)' : `GRAVADO (${(p.taxRate * 100).toFixed(0)}%)`;
    const taxRatePercent = isExempt ? 0 : Number((p.taxRate * 100).toFixed(0));

    const isLowStock = p.totalStock <= p.minStock;
    const stockStatus = isLowStock ? 'BAJO_MINIMO' : 'NORMAL';

    const valCostUsd = Number((p.totalStock * costUsd).toFixed(2));
    const valCostVes = Number((valCostUsd * bcvRate).toFixed(2));
    const valSaleUsd = Number((p.totalStock * p1).toFixed(2));

    return [
      p.id,
      p.sku,
      p.barcode,
      p.name,
      p.category,
      p.unit,
      costUsd.toFixed(2),
      costVes.toFixed(2),
      p1.toFixed(2),
      p1Ves.toFixed(2),
      p2.toFixed(2),
      p3.toFixed(2),
      p4.toFixed(2),
      p5.toFixed(2),
      taxCondition,
      taxRatePercent,
      p.totalStock,
      p.minStock,
      stockStatus,
      valCostUsd.toFixed(2),
      valCostVes.toFixed(2),
      valSaleUsd.toFixed(2),
      p.status,
      p.updatedAt || ''
    ];
  });

  return exportToCsv(filename, headers, rows);
}

/**
 * Exports sales / invoices registry to CSV with multi-currency breakdown, taxes, IGTF, and payment methods.
 */
export function exportSalesToCsv(
  invoices: Invoice[],
  bcvRate: number
): boolean {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Ventas_Facturacion_NexusERP_${dateStr}`;

  const headers = [
    'N° Factura / Comprobante',
    'Fecha y Hora',
    'Cliente',
    'RIF / Documento Fiscal',
    'Almacén / Sucursal',
    'Tipo Comprobante',
    'Estado',
    'Moneda Base',
    'Moneda de Pago',
    'Tasa BCV Aplicada (Bs./$)',
    'Subtotal Gravado ($ USD)',
    'Subtotal Exento ($ USD)',
    'IVA Monto ($ USD)',
    'Alícuota IVA (%)',
    'Aplica IGTF 3%',
    'IGTF Monto ($ USD)',
    'Descuento Global ($ USD)',
    'Total Factura ($ USD)',
    'Total Factura (Bs. VES)',
    'Total Factura (€ EUR)',
    'Método de Pago Principal',
    'Referencia de Pago',
    'Cant. Ítems Renglones',
    'Resumen de Productos',
    'Vendedor / Cajero'
  ];

  const rows = invoices.map(inv => {
    const primaryPayment = inv.payments && inv.payments.length > 0 ? inv.payments[0] : null;
    const paymentMethod = primaryPayment ? primaryPayment.method : 'NO_REGISTRADO';
    const paymentRef = primaryPayment?.reference || 'N/A';

    const itemsSummary = (inv.items || [])
      .map(i => `${i.quantity}x ${i.productName} ($${i.unitPrice.toFixed(2)})`)
      .join(' | ');

    const totalVes = inv.totalVes || (inv.total * (inv.bcvRate || bcvRate));
    const totalEur = inv.totalEur || (inv.total * (inv.bcvRate || bcvRate) / (inv.eurRate || 39.80));

    return [
      inv.invoiceNumber,
      inv.date,
      inv.customerName,
      inv.customerTaxId,
      inv.warehouseId,
      inv.type,
      inv.status,
      inv.baseCurrency,
      inv.paymentCurrency,
      inv.bcvRate ? inv.bcvRate.toFixed(2) : bcvRate.toFixed(2),
      inv.taxDetails?.taxableBase ? inv.taxDetails.taxableBase.toFixed(2) : '0.00',
      inv.taxDetails?.exemptBase ? inv.taxDetails.exemptBase.toFixed(2) : '0.00',
      inv.taxDetails?.ivaAmount ? inv.taxDetails.ivaAmount.toFixed(2) : '0.00',
      inv.taxDetails?.ivaPercent ? `${inv.taxDetails.ivaPercent}%` : '16%',
      inv.taxDetails?.appliesIgtf ? 'SÍ (3%)' : 'NO',
      inv.taxDetails?.igtfAmount ? inv.taxDetails.igtfAmount.toFixed(2) : '0.00',
      inv.discountTotal ? inv.discountTotal.toFixed(2) : '0.00',
      inv.total.toFixed(2),
      totalVes.toFixed(2),
      totalEur.toFixed(2),
      paymentMethod,
      paymentRef,
      inv.items ? inv.items.length : 0,
      itemsSummary,
      inv.sellerName || 'Cajero'
    ];
  });

  return exportToCsv(filename, headers, rows);
}

/**
 * Exports detailed sales line items (Renglones de Facturación) to CSV for deep granular analysis.
 */
export function exportSaleItemLinesToCsv(
  invoices: Invoice[]
): boolean {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Renglones_Detalle_Ventas_${dateStr}`;

  const headers = [
    'N° Factura',
    'Fecha',
    'Cliente',
    'RIF / Doc',
    'Estado Factura',
    'SKU',
    'Producto',
    'Unidad',
    'Cantidad',
    'Nivel Precio Aplicado',
    'Precio Unitario ($ USD)',
    'Costo Unitario ($ USD)',
    '% Descuento Renglón',
    'Condición IVA',
    'Tasa IVA (%)',
    'Subtotal Renglón ($ USD)',
    'Monto IVA ($ USD)',
    'Total Renglón ($ USD)',
    'Margen Ganancia Bruta ($ USD)',
    '% Margen Ganancia'
  ];

  const rows: (string | number | boolean | null | undefined)[][] = [];

  for (const inv of invoices) {
    for (const item of inv.items || []) {
      const isExempt = item.isTaxExempt || item.taxRate === 0;
      const taxLabel = isExempt ? 'EXENTO' : 'GRAVADO';
      const taxPct = isExempt ? 0 : Number((item.taxRate * 100).toFixed(0));
      const totalCost = item.quantity * (item.costPrice || 0);
      const grossProfit = item.subtotal - totalCost;
      const profitMarginPct = item.subtotal > 0 ? ((grossProfit / item.subtotal) * 100).toFixed(1) : '0.0';

      rows.push([
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.customerTaxId,
        inv.status,
        item.sku,
        item.productName,
        item.unit || 'UND',
        item.quantity,
        item.priceLevel || inv.priceLevelApplied || 'price1',
        item.unitPrice.toFixed(2),
        (item.costPrice || 0).toFixed(2),
        item.discountPercent || 0,
        taxLabel,
        taxPct,
        item.subtotal.toFixed(2),
        (item.taxAmount || 0).toFixed(2),
        item.total.toFixed(2),
        grossProfit.toFixed(2),
        `${profitMarginPct}%`
      ]);
    }
  }

  return exportToCsv(filename, headers, rows);
}
