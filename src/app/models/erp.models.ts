export type UserRole = 'ADMIN' | 'OPERATIONS_MANAGER' | 'WAREHOUSE_KEEPER' | 'CASHIER_SELLER' | 'AUDITOR';

export interface RoleConfig {
  id: UserRole;
  name: string;
  badgeClass: string;
  description: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  token?: string;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE_INVOICE' | 'ADJUST_STOCK' | 'PURCHASE_RECEIPT' | 'CONVERT_QUOTE' | 'CREATE_QUOTE' | 'CASH_CLOSING' | 'USER_LOGIN' | 'CREATE_PRODUCT' | 'CREATE_SUPPLIER' | 'SYNC_BCV_RATES' | 'UPDATE_EXCHANGE_RATE' | 'UPDATE_PRODUCT_PRICES';
  module: 'INVENTORY' | 'AUTH' | 'PURCHASES' | 'SALES' | 'POS' | 'FINANCE';
  details: {
    title: string;
    description: string;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  };
  ipAddress: string;
  createdAt: string;
}

export type CurrencyCode = 'USD' | 'VES' | 'EUR';
export type RateOrigin = 'API_BCV' | 'MANUAL';
export type PriceLevelKey = 'price1' | 'price2' | 'price3' | 'price4' | 'price5';

export interface PriceLevelConfig {
  key: PriceLevelKey;
  label: string;
  shortName: string;
  badgeClass: string;
  defaultDiscountRatio?: number; // e.g. 0.0 (detal), 0.15 (mayor), 0.25 (distribuidor), 0.30 (vip), 0.35 (especial)
}

export interface ProductPrices {
  price1: number; // Detal / General
  price2: number; // Mayor
  price3: number; // Distribuidor
  price4: number; // VIP / Corporativo
  price5: number; // Especial / Empleado
}

export interface BcvExchangeRateState {
  usdRate: number; // e.g. 36.50
  eurRate: number; // e.g. 39.80
  origin: RateOrigin;
  lastSync: string;
  isSyncing: boolean;
  status: 'ONLINE' | 'FALLBACK_MANUAL' | 'SYNCED';
  bcvOfficialDate: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  isMain: boolean;
}

export interface StockByWarehouse {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: 'UND' | 'KG' | 'LT' | 'CJ' | 'MT' | 'PQ';
  costPrice: number; // Costo Promedio Ponderado actual
  salePrice: number; // Alias or Base Price (Nivel 1)
  prices: ProductPrices; // Hasta 5 niveles de precio
  isTaxExempt: boolean; // Exento de IVA (0%)
  taxRate: number; // e.g. 0.16 (16%), 0.08 (8%), 0 (Exento)
  minStock: number;
  totalStock: number;
  stockByWarehouse: StockByWarehouse[];
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  updatedAt: string;
}

export type KardexMovementType = 'ENTRADA_COMPRA' | 'SALIDA_VENTA' | 'AJUSTE_MERMA' | 'AJUSTE_SOBRANTE' | 'AJUSTE_INVENTARIO' | 'TRANSFERENCIA_ALMACEN';

export interface KardexMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  date: string;
  movementType: KardexMovementType;
  docReference: string; // e.g. "FACT-00124", "OC-0045", "ADJ-2025-01"
  supportDocument?: string; // Obligatorio para ajustes
  justificationReason?: string;
  
  // Entradas
  entryQty: number;
  entryUnitCost: number;
  entryTotalCost: number;
  
  // Salidas
  exitQty: number;
  exitUnitCost: number;
  exitTotalCost: number;
  
  // Saldo Resultante
  balanceQty: number;
  balanceAverageCost: number;
  balanceTotalValuation: number;
  
  registeredByUserId: string;
  registeredByUserName: string;
}

export interface Supplier {
  id: string;
  taxId: string; // RFC / RUT / NIT
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: 'CONTADO' | '15_DIAS' | '30_DIAS' | '60_DIAS';
  category: string;
  rating: number;
}

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  subtotal: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // e.g. "OC-2026-0042"
  supplierId: string;
  supplierName: string;
  supplierTaxId: string;
  warehouseId: string;
  warehouseName: string;
  date: string;
  status: 'RECIBIDA' | 'PENDIENTE' | 'CANCELADA';
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  receivedBy: string;
}

export interface Customer {
  id: string;
  taxId: string; // RFC / RUT / DNI
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: 'EMPRESA' | 'PERSONA_NATURAL' | 'FINAL_CONSUMIDOR';
}

export interface InvoiceItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // at moment of sale
  priceLevel?: PriceLevelKey; // 'price1'..'price5'
  discountPercent: number;
  isTaxExempt?: boolean;
  taxRate: number; // e.g. 0.16, 0.08, 0
  subtotal: number;
  taxAmount: number;
  total: number;
}

export type PaymentMethod = 
  | 'EFECTIVO' 
  | 'EFECTIVO_USD' 
  | 'EFECTIVO_EUR' 
  | 'PAGO_MOVIL' 
  | 'PUNTO_VENTA_DEBITO' 
  | 'TARJETA_CREDITO' 
  | 'TRANSFERENCIA' 
  | 'ZELLE' 
  | 'CREDITO';

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number; // amount in payment currency or base currency
  currency?: CurrencyCode; // 'USD' | 'VES' | 'EUR'
  reference?: string;
  isForeignCurrency?: boolean; // triggers IGTF 3% if cash/foreign
}

export interface InvoiceTaxDetails {
  taxableBase: number;   // Base imponible gravada general (16% u 8%)
  exemptBase: number;    // Base exenta (0% IVA)
  ivaPercent: number;    // e.g. 16.0
  ivaAmount: number;     // Monto IVA calculado
  appliesIgtf: boolean;  // Verdadero si aplica IGTF (pago en divisas en efectivo)
  igtfPercent: number;   // e.g. 3.0
  igtfBase: number;      // Base imponible sujeta a IGTF
  igtfAmount: number;    // Monto IGTF calculado
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "FAC-2026-0089"
  customerId: string;
  customerName: string;
  customerTaxId: string;
  warehouseId: string;
  date: string;
  type: 'FACTURA_ELECTRONICA' | 'BOLETA_POS' | 'TICKET_VENTA';
  status: 'EMITIDA' | 'ANULADA';
  items: InvoiceItem[];
  
  // Multimoneda y Tasas
  baseCurrency: CurrencyCode;     // e.g. 'USD'
  paymentCurrency: CurrencyCode;  // e.g. 'VES' | 'USD' | 'EUR'
  bcvRate: number;                // Tasa oficial BCV aplicada (VES/USD)
  eurRate?: number;               // Tasa oficial BCV EUR (VES/EUR)
  rateOrigin: RateOrigin;         // 'API_BCV' | 'MANUAL'
  priceLevelApplied: PriceLevelKey; // 'price1' | 'price2' | 'price3' | 'price4' | 'price5'
  
  // Totales Matemáticos
  subtotal: number;
  discountGlobalPercent?: number; // Descuento global a la factura
  discountTotal: number;          // Total descuentos (renglones + global)
  taxDetails: InvoiceTaxDetails;  // Desglose IVA e IGTF
  taxTotal: number;               // IVA + IGTF
  total: number;                  // Total general en Moneda Base (USD)
  totalVes: number;               // Total equivalente en Bolívares (VES) a tasa BCV
  totalEur: number;               // Total equivalente en Euros (EUR)
  
  payments: PaymentRecord[];
  sellerId: string;
  sellerName: string;
  digitalSeal?: string; // Digital stamp simulation
  quoteOriginNumber?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. "COT-2026-015"
  customerId: string;
  customerName: string;
  customerTaxId: string;
  date: string;
  expirationDate: string;
  status: 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'CONVERTIDO_A_FACTURA' | 'RECHAZADO';
  items: InvoiceItem[];
  baseCurrency?: CurrencyCode;
  bcvRate?: number;
  priceLevelApplied?: PriceLevelKey;
  subtotal: number;
  discountTotal: number;
  taxDetails?: InvoiceTaxDetails;
  taxTotal: number;
  total: number;
  totalVes?: number;
  convertedInvoiceNumber?: string;
  notes?: string;
  createdBy: string;
}

export interface CashRegisterSession {
  id: string;
  sessionCode: string; // e.g. "CAJA-20260818-01"
  cashierId: string;
  cashierName: string;
  openDate: string;
  closeDate?: string;
  status: 'ABIERTA' | 'CERRADA';
  initialAmount: number;
  
  // Computed collections
  totalCashSales: number;
  totalCardSales: number;
  totalTransferSales: number;
  totalCreditSales: number;
  totalSales: number;
  
  // Count on closing
  countedCashAmount?: number;
  cashDifference?: number; // countedCashAmount - (initialAmount + totalCashSales)
  closingNotes?: string;
}
