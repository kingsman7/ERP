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
  status?: 'ACTIVO' | 'INACTIVO';
  department?: string;
  phone?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE_INVOICE' | 'ADJUST_STOCK' | 'PURCHASE_RECEIPT' | 'CONVERT_QUOTE' | 'CREATE_QUOTE' | 'UPDATE_QUOTE_STATUS' | 'CASH_CLOSING' | 'USER_LOGIN' | 'CREATE_PRODUCT' | 'CREATE_SUPPLIER' | 'CREATE_CUSTOMER' | 'UPDATE_CUSTOMER' | 'SYNC_BCV_RATES' | 'UPDATE_EXCHANGE_RATE' | 'UPDATE_PRODUCT_PRICES' | 'CREATE_BOM' | 'UPDATE_BOM' | 'CREATE_PRODUCTION_ORDER' | 'COMPLETE_PRODUCTION_ORDER' | 'CANCEL_PRODUCTION_ORDER' | 'CREATE_CRM_DEAL' | 'UPDATE_CRM_DEAL' | 'CREATE_JOURNAL_ENTRY' | 'CONFIG_BACKUP_SCHEDULE' | 'CREATE_BACKUP' | 'RESTORE_DATABASE' | 'CREATE_DISPATCH_GUIDE' | 'UPDATE_DISPATCH_STATUS' | 'RECEIVE_DELIVERY' | 'RECEIVE_DELIVERY_ORDER' | 'CANCEL_DISPATCH_GUIDE' | 'INVOICE_DISPATCH_GUIDE';
  module: 'INVENTORY' | 'AUTH' | 'PURCHASES' | 'SALES' | 'POS' | 'FINANCE' | 'MRP' | 'CRM' | 'ACCOUNTING' | 'BACKUP' | 'LOGISTICS';
  isCritical?: boolean;
  criticalCategory?: 'PRICE_CHANGE' | 'MANUAL_STOCK_ADJUSTMENT' | 'INVOICE_CANCEL' | 'DB_RESTORE' | 'SECURITY_ROLE';
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

export type CriticalAuditCategory = 'PRICE_CHANGE' | 'MANUAL_STOCK_ADJUSTMENT' | 'INVOICE_CANCEL' | 'DB_RESTORE' | 'SECURITY_ROLE';
export type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface CriticalAuditNotification {
  id: string;
  auditLogId?: string;
  category: CriticalAuditCategory;
  severity: AuditSeverity;
  title: string;
  message: string;
  details: {
    itemSku?: string;
    itemName?: string;
    warehouseName?: string;
    oldValue?: string | number | Record<string, unknown>;
    newValue?: string | number | Record<string, unknown>;
    diffSummary?: string;
    supportDocument?: string;
    justification?: string;
    user: string;
    role: string;
    timestamp: string;
    ipAddress?: string;
  };
  isRead: boolean;
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
  reorderPoint?: number; // Punto de Reorden calculado (Lead Time Demand + Safety Stock)
  safetyStock?: number; // Stock de Seguridad para contingencias MRP
  leadTimeDays?: number; // Tiempo de reposición de proveedores en días
  reorderQuantity?: number; // Lote óptimo de compra sugerido (EOQ / Lote Mínimo)
  totalStock: number;
  stockByWarehouse: StockByWarehouse[];
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  updatedAt: string;
}

export type KardexMovementType = 
  | 'ENTRADA_COMPRA' 
  | 'SALIDA_VENTA' 
  | 'ENTRADA_PRODUCCION' 
  | 'SALIDA_PRODUCCION' 
  | 'AJUSTE_MERMA' 
  | 'AJUSTE_SOBRANTE' 
  | 'AJUSTE_INVENTARIO' 
  | 'TRANSFERENCIA_ALMACEN'
  | 'DESPACHO_GUIA'
  | 'SALIDA_ORDEN_ENTREGA'
  | 'ENTRADA_DEVOLUCION_GUIA';

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

export interface CompanyFiscalProfile {
  legalName: string;
  tradeName: string;
  taxId: string; // RIF ej. J-50493821-4
  isSpecialTaxpayer: boolean; // Sujeto Pasivo Especial (SENIAT) - Agente de percepción IGTF 3%
  specialTaxpayerDesignationNumber?: string; // Providencia administrativa SENIAT
  address: string;
  phone: string;
  email: string;
  defaultIvaRate: number; // 0.16 (16%)
  igtfRate: number; // 0.03 (3%)
}

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number; // amount in payment currency or base currency
  currency?: CurrencyCode; // 'USD' | 'VES' | 'EUR'
  reference?: string;
  isForeignCurrency?: boolean; // triggers IGTF 3% if cash/foreign and issuer is Special Taxpayer
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

export type InvoiceType = 'FACTURA_ELECTRONICA' | 'BOLETA_POS' | 'TICKET_VENTA';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "FAC-2026-0089"
  customerId: string;
  customerName: string;
  customerTaxId: string;
  warehouseId: string;
  date: string;
  type: InvoiceType;
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
  
  // Trazabilidad SENIAT SNAT/2011/00071
  dispatchGuideNumbers?: string[];     // e.g. ["GD-2026-0001"]
  dispatchControlNumbers?: string[];   // e.g. ["00-00000101"] (Control SENIAT obligatorio)
  deliveryOrderNumbers?: string[];     // e.g. ["OE-2026-0001"]
  isStockAlreadyDeducted?: boolean;    // Verdadero si el inventario fue rebajado previamente por Guía de Despacho
}

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. "COT-2026-015"
  customerId: string;
  customerName: string;
  customerTaxId: string;
  date: string;
  expirationDate: string;
  status: 'BORRADOR' | 'ENVIADO' | 'APROBADO' | 'CONVERTIDO_A_FACTURA' | 'ENVIADO_A_DESPACHO' | 'DESPACHADO' | 'RECHAZADO';
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
  dispatchedGuideNumber?: string;
  notes?: string;
  createdBy: string;
}

// ============================================================================
// SENIAT PROVIDENCIA ADMINISTRATIVA SNAT/2011/00071: GUÍAS DE DESPACHO Y ÓRDENES DE ENTREGA
// ============================================================================

export type CarrierType = 
  | 'PROPIO' 
  | 'TERCERO_EMPRESA' 
  | 'TERCERO_PARTICULAR';

export type TransportReason = 
  | 'VENTA' 
  | 'VENTA_MERCANCIA' 
  | 'TRASLADO_ALMACEN' 
  | 'TRASLADO_ENTRE_ALMACENES' 
  | 'CONSIGNACION' 
  | 'DEVOLUCION' 
  | 'DEVOLUCION_PROVEEDOR' 
  | 'DEMOSTRACION' 
  | 'DEMOSTRACION_EXHIBICION' 
  | 'REPARACION_GARANTIA' 
  | 'REPARACION_MANTENIMIENTO' 
  | 'OTRO';

export type DispatchGuideStatus = 
  | 'BORRADOR' 
  | 'EN_TRANSITO' 
  | 'EMITIDA' 
  | 'ENTREGADA' 
  | 'ENTREGADA_CON_NOVEDAD' 
  | 'FACTURADA' 
  | 'ANULADA';

export type DeliveryOrderStatus = 
  | 'PENDIENTE' 
  | 'PENDIENTE_DESPACHO' 
  | 'EN_RUTA' 
  | 'ENTREGADA' 
  | 'ENTREGADA_CONFORME' 
  | 'ENTREGADA_CON_NOVEDAD' 
  | 'ENTREGADA_PARCIAL' 
  | 'FACTURADA' 
  | 'CANCELADA' 
  | 'ANULADA';

export type ReceptionConformityStatus = 
  | 'COMPLETO' 
  | 'PARCIAL' 
  | 'CON_NOVEDAD';

export interface DispatchItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  costPrice: number;
  unitPrice?: number;
  salePrice?: number;
  subtotal?: number;
  packagesCount?: number;
  weightKg?: number;
  volumeM3?: number;
  totalDeclaredValue?: number;
  notes?: string;
}

export interface DeliveryReceptionDetails {
  receivedByFullName?: string;       // Nombre y Apellido legible de quien recibe
  receivedByName?: string;
  receiverIdNumber?: string;         // Cédula de Identidad / RIF del receptor
  receivedByIdDoc?: string;
  receivedDate: string;             // Fecha de recepción efectiva (YYYY-MM-DD)
  receivedTime?: string;             // Hora de recepción efectiva (HH:mm)
  hasSignature?: boolean;            // Indicador de firma del receptor
  hasStamp?: boolean;                // Indicador de sello húmedo de la empresa receptora
  signatureDataUrl?: string;        // Firma digital / trazo capturado en base64
  receptionStatus?: ReceptionConformityStatus;
  physicalCondition?: 'CONFORME' | 'CON_NOVEDAD' | 'RECHAZADO';
  observations?: string;            // Observaciones / Novedades en la entrega
  attachedProofUrl?: string;        // Comprobante firmado/sellado adjuntado
  signedProofUrl?: string;          // Alias para compatibilidad de comprobante firmado
}

export interface DispatchGuide {
  id: string;
  guideNumber: string;             // Número de Guía de Despacho, e.g. "GD-2026-0001"
  controlNumber: string;           // Número de Control Consecutivo y Único SENIAT, e.g. "00-00000101"
  issueDate: string;               // Fecha y hora de emisión (YYYY-MM-DD HH:mm:ss)
  dispatchDate?: string;
  estimatedTransferDate?: string;   // Fecha estimada de inicio de traslado
  estimatedDeliveryDate?: string;
  status: DispatchGuideStatus;
  
  // Origen (Almacén Emisor)
  originWarehouseId: string;
  originWarehouseName: string;
  originAddress: string;           // Dirección exacta del almacén de salida
  issuerName?: string;
  issuerTaxId?: string;
  
  // Destino (Cliente / Receptor Fiscal)
  customerId?: string;
  customerName: string;
  customerTaxId: string;           // RIF / Cédula
  customerAddress?: string;         // Domicilio fiscal
  destinationAddress: string;      // Dirección exacta de entrega / punto de destino
  destinationWarehouseId?: string;
  destinationState?: string;
  destinationCity?: string;
  customerPhone?: string;
  customerContact?: string;
  recipientContactName?: string;
  recipientPhone?: string;
  
  // Motivo del Traslado (Art. 13 Providencia SNAT/2011/00071)
  transferReason?: TransportReason;
  transportReason?: TransportReason;
  transferReasonDetails?: string;  // Justificación complementaria
  transportReasonDescription?: string;
  
  // Datos del Transportista y Vehículo (Amparo en Vía Pública)
  carrierType?: CarrierType;
  carrierName?: string;             // Nombre o Razón Social de la empresa de transporte o transportista
  carrierTaxId?: string;            // RIF / Cédula del transportista
  carrierPhone?: string;
  driverName: string;              // Nombre completo del chofer / conductor
  driverIdNumber?: string;          // Cédula de Identidad del chofer (e.g. "V-18.452.123")
  driverIdDoc?: string;
  driverPhone?: string;
  driverLicenseNumber?: string;
  vehicleBrand?: string;            // Marca del vehículo (e.g. "Ford", "Iveco", "Chevrolet")
  vehicleModel?: string;            // Modelo (e.g. "F-350", "Cargo 1722", "NPR")
  vehiclePlate: string;            // Placa del vehículo de carga (e.g. "A34BK8D")
  vehicleColor?: string;           // Color
  vehicleYear?: number;
  
  // Detalle de Mercancía
  items: DispatchItem[];
  totalQuantity: number;
  totalPackages?: number;
  totalWeightKg?: number;
  totalVolumeM3?: number;
  totalValuationCost?: number;      // Total valorado a costo promedio (Kardex)
  totalEstimatedSale?: number;      // Total valorado a precio de venta
  totalDeclaredValue?: number;
  currency?: string;
  
  // Trazabilidad de Documentos
  originQuoteId?: string;
  originQuoteNumber?: string;      // Pedido de Venta / Cotización de origen
  relatedDeliveryOrderId?: string; // Orden de Entrega asociada
  relatedDeliveryOrderNumber?: string;
  invoicedInvoiceNumber?: string;  // Factura fiscal oficial generada a partir de esta guía
  invoicedAt?: string;
  routeDetails?: string;
  generalObservations?: string;
  cancelReason?: string;
  legalNotice?: string;
  
  // Auditoría y Metadatos
  notes?: string;
  issuedByUserId?: string;
  issuedByUserName?: string;
  createdUserId?: string;
  createdUserName?: string;
  digitalSecuritySeal?: string;     // Timbre / Sello de seguridad digital de amparo
  digitalSeal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryOrder {
  id: string;
  orderNumber: string;             // Número de Orden de Entrega, e.g. "OE-2026-0001"
  controlNumber: string;           // Número de control consecutivo, e.g. "00-00000201"
  dispatchGuideId?: string;        // Guía de Despacho enlazada
  dispatchGuideNumber?: string;
  dispatchControlNumber?: string;
  
  // Cliente & Destino
  customerId?: string;
  customerName: string;
  customerTaxId: string;
  deliveryAddress: string;
  warehouseId?: string;
  warehouseName?: string;
  contactPerson?: string;
  contactPhone?: string;
  
  // Fechas y Estado
  issueDate: string;
  scheduledDate?: string;
  estimatedDeliveryDate?: string;
  status: DeliveryOrderStatus;
  
  // Artículos Despachados
  items: DispatchItem[];
  totalQuantity: number;
  totalPackages?: number;
  totalWeightKg?: number;
  
  // Transporte
  carrierType?: CarrierType;
  carrierName?: string;
  driverName: string;
  driverIdNumber?: string;
  driverIdDoc?: string;
  driverPhone?: string;
  vehiclePlate: string;
  
  // Bloque de Recepción y Conformidad del Cliente (SENIAT)
  reception?: DeliveryReceptionDetails;
  receptionDetails?: DeliveryReceptionDetails;
  
  // Trazabilidad
  specialInstructions?: string;
  originQuoteNumber?: string;
  invoicedInvoiceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdUserId?: string;
  createdUserName?: string;
  createdAt: string;
  updatedAt: string;
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

// ============================================================================
// FASE 2: MODELOS DE MANUFACTURA (MRP / BOM)
// ============================================================================

export interface BomItem {
  id: string;
  rawMaterialProductId: string;
  rawMaterialSku: string;
  rawMaterialName: string;
  quantityNeeded: number;
  unit: string;
  wastePercent: number; // e.g. 2% merma estimada
  estimatedUnitCost: number;
  subtotalCost: number;
}

export interface Bom {
  id: string;
  code: string; // e.g. "BOM-LUB-01"
  name: string;
  finishedProductId: string;
  finishedProductSku: string;
  finishedProductName: string;
  quantityToProduce: number; // e.g. 100 UND
  items: BomItem[];
  laborCost: number; // Mano de obra directa
  overheadCost: number; // Costos indirectos de fabricación (CIF)
  totalEstimatedCost: number;
  unitCost: number;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export type ProductionOrderStatus = 'PLANIFICADA' | 'EN_PROCESO' | 'CONTROL_CALIDAD' | 'COMPLETADA' | 'CANCELADA';

export interface ProductionOrder {
  id: string;
  orderNumber: string; // e.g. "OF-2026-0012"
  bomId: string;
  bomCode: string;
  finishedProductId: string;
  finishedProductSku: string;
  finishedProductName: string;
  warehouseId: string;
  warehouseName: string;
  quantityPlanned: number;
  quantityProduced: number;
  status: ProductionOrderStatus;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  
  // Costos Reales Acumulados
  directMaterialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  unitCost: number;
  
  notes?: string;
  operatorName: string;
  createdAt: string;
}

// ============================================================================
// FASE 2: MODELOS DE CRM & PIPELINE COMERCIAL (KANBAN)
// ============================================================================

export type CrmStage = 
  | 'NUEVO_LEAD' 
  | 'CONTACTADO' 
  | 'DIAGNOSTICO' 
  | 'PROPUESTA' 
  | 'NEGOCIACION' 
  | 'GANADO' 
  | 'PERDIDO';

export type CrmActivityType = 'LLAMADA' | 'REUNION' | 'WHATSAPP' | 'CORREO' | 'NOTA';

export interface CrmActivity {
  id: string;
  dealId: string;
  type: CrmActivityType;
  description: string;
  date: string;
  user: string;
  completed: boolean;
}

export interface CrmDeal {
  id: string;
  code: string; // e.g. "DEAL-2026-089"
  title: string;
  customerId?: string;
  customerName: string;
  contactPerson: string;
  email: string;
  phone: string;
  stage: CrmStage;
  expectedValueUsd: number;
  probability: number; // 0 to 100%
  expectedCloseDate: string;
  assignedTo: string;
  notes?: string;
  activities: CrmActivity[];
  quoteId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FASE 2: MODELOS DE CONTABILIDAD GENERAL NIIF (ASIENTOS & LIBROS)
// ============================================================================

export type AccountType = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'COSTO' | 'GASTO';

export interface Account {
  id: string;
  code: string; // e.g. "1.1.01.01" (Caja y Bancos)
  name: string;
  type: AccountType;
  level: number; // 1: Clase, 2: Grupo, 3: Cuenta, 4: Subcuenta
  parentCode?: string;
  balance: number; // Saldo actual en USD
  currency: 'USD' | 'VES';
  isDebitNormal: boolean; // True: saldo normal deudor (Activo, Costo, Gasto), False: acreedor (Pasivo, Patrimonio, Ingreso)
  description?: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;   // Debe (USD)
  credit: number;  // Haber (USD)
  debitVes?: number;
  creditVes?: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. "ASIENTO-2026-0045"
  date: string;
  concept: string;
  referenceType: 'VENTA' | 'COMPRA' | 'PRODUCCION' | 'AJUSTE' | 'MANUAL' | 'CIERRE_CAJA';
  referenceId?: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: 'BORRADOR' | 'ASENTADO' | 'ANULADO';
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// FASE 2: MODELOS DE NOTIFICACIONES Y ALERTAS POR EMAIL (MRP & REORDEN)
// ============================================================================

export type EmailAlertTriggerReason = 
  | 'MRP_CONSUMPTION' 
  | 'SALE_POS' 
  | 'INVENTORY_SCAN' 
  | 'MANUAL_TRIGGER'
  | 'TEST_EMAIL';

export interface EmailNotificationConfig {
  enabled: boolean;
  recipients: string[]; // List of emails to receive alerts
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  useTls: boolean;
  alertOnReorderPoint: boolean; // Alert when totalStock <= reorderPoint
  alertOnCriticalStock: boolean; // Alert when totalStock <= minStock
  autoTriggerOnProduction: boolean; // Auto check upon MRP production completion
  autoTriggerOnSales: boolean; // Auto check upon sales POS checkout
  includeCostValuation: boolean; // Include $ USD & Bs. in email body
  includePreferredSupplier: boolean;
  dailyDigestOnly: boolean;
}

export interface EmailAlertLog {
  id: string;
  timestamp: string;
  recipients: string[];
  subject: string;
  productSku: string;
  productName: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  minStock: number;
  deficitQuantity: number;
  suggestedOrderQty: number;
  estimatedCostUsd: number;
  estimatedCostVes: number;
  triggerReason: EmailAlertTriggerReason;
  orderOrDocRef?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  previewHtml: string;
}

export interface ReorderAlertItem {
  product: Product;
  currentStock: number;
  reorderPoint: number;
  minStock: number;
  deficit: number;
  suggestedOrderQty: number;
  estimatedCostUsd: number;
  estimatedCostVes: number;
  severity: 'CRITICAL' | 'REORDER_REQUIRED' | 'WARNING';
  isRawMaterial: boolean;
  associatedBomsCount: number;
}

// ============================================================================
// FASE 2: MODELOS DE COPIAS DE SEGURIDAD Y RESPALDOS PROGRAMADOS FIRESTORE
// ============================================================================

export type BackupType = 'MANUAL' | 'SCHEDULED' | 'AUTOMATIC' | 'PRE_RESTORE';
export type BackupStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'RESTORED';
export type BackupScheduleFrequency = 'HOURLY' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM_MINUTES';

export interface BackupCollectionSummary {
  collectionName: string;
  count: number;
}

export interface ErpBackupMetadata {
  id: string;
  backupCode: string; // e.g. "BKP-20260819-0805"
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  createdAt: string;
  createdBy: string;
  userEmail: string;
  sizeBytes: number;
  sizeFormatted: string;
  checksumSha256: string;
  totalCollections: number;
  totalRecords: number;
  collectionsSummary: BackupCollectionSummary[];
  firestoreDocumentId?: string;
  storageTarget: 'FIRESTORE_CLOUD' | 'LOCAL_DOWNLOAD' | 'HYBRID';
  erpVersion: string;
  payloadJson?: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: BackupScheduleFrequency;
  customIntervalMinutes: number; // e.g. 60 min
  timeOfDay?: string; // e.g. "00:00" for daily
  autoSyncToFirestore: boolean;
  autoDownloadJson: boolean;
  maxBackupsToRetain: number; // e.g. 20
  lastRunAt?: string;
  nextRunAt?: string;
  notifyOnBackupComplete: boolean;
  targetEmail?: string;
}

export interface ErpFullBackupPayload {
  version: string;
  exportDate: string;
  system: string;
  checksum: string;
  metadata: ErpBackupMetadata;
  data: {
    products: Product[];
    inventoryMovements: KardexMovement[];
    warehouses: Warehouse[];
    boms: Bom[];
    productionOrders: ProductionOrder[];
    crmDeals: CrmDeal[];
    accounts: Account[];
    journalEntries: JournalEntry[];
    invoices: Invoice[];
    cashClosings: CashRegisterSession[];
    quotes: Quote[];
    dispatchGuides?: DispatchGuide[];
    deliveryOrders?: DeliveryOrder[];
    customers: Customer[];
    suppliers: Supplier[];
    users: User[];
    auditLogs: AuditLog[];
    emailAlertLogs: EmailAlertLog[];
    notificationConfig?: EmailNotificationConfig;
    backupScheduleConfig?: BackupScheduleConfig;
  };
}



