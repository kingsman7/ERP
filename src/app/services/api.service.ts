import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';
import { Account, AuditLog, BankAccount, BcvExchangeRateState, Bom, CashRegisterSession, CompanyFiscalProfile, CrmDeal, CurrencyCode, Customer, DeliveryOrder, DispatchGuide, Invoice, InvoiceItem, InvoiceTaxDetails, JournalEntry, KardexMovement, PayableBill, PaymentRecord, PriceLevelKey, Product, ProductCategory, ProductionOrder, PurchaseOrder, Quote, Supplier, TreasuryTransaction, Warehouse } from '../models/erp.models';

export interface CreateInvoiceRequest {
  customerId: string;
  warehouseId: string;
  invoiceDate: string;
  type: Invoice['type'];
  baseCurrency: CurrencyCode;
  paymentCurrency: CurrencyCode;
  priceLevelApplied: PriceLevelKey;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    priceLevel: PriceLevelKey;
  }>;
  payments: Array<Pick<PaymentRecord, 'method' | 'amount' | 'currency' | 'reference'>>;
  sellerName: string;
  sellerId?: string;
  creditChangeAsAdvance?: boolean;
  globalDiscountPercent?: number;
  customIvaRate?: number;
  appliesIgtfManual?: boolean | null;
  isStockAlreadyDeducted?: boolean;
  dispatchGuideNumbers?: string[];
}

export interface StockAdjustmentPayload {
  productId: string;
  warehouseId: string;
  quantityDelta: number;
  type: 'SHRINKAGE' | 'PHYSICAL_COUNT' | 'INTERNAL_USE' | 'OTHER';
  reason: string;
  supportDocType: string;
  supportDocNum: string;
  supportDocUrl?: string;
}

export interface StockAdjustmentResponse {
  adjustment: unknown;
  kardexMovement: KardexMovement;
  stock: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  private normalizeKardexMovement(raw: KardexMovement & { movementDate?: string }): KardexMovement {
    return {
      ...raw,
      date: raw.date ?? raw.movementDate ?? ''
    };
  }

  private normalizeInvoice(raw: Record<string, unknown>): Invoice {
    const number = (value: unknown) => Number(value ?? 0);
    const text = (value: unknown) => typeof value === 'string' ? value : '';
    const customer = raw['customer'] as { name?: unknown; taxId?: unknown } | null | undefined;
    const rawItems = Array.isArray(raw['items']) ? raw['items'] as Record<string, unknown>[] : [];
    const rawTaxDetails = raw['taxDetails'] as Partial<InvoiceTaxDetails> | null | undefined;
    const taxDetails: InvoiceTaxDetails = rawTaxDetails ? {
      taxableBase: number(rawTaxDetails.taxableBase),
      exemptBase: number(rawTaxDetails.exemptBase),
      ivaPercent: number(rawTaxDetails.ivaPercent),
      ivaAmount: number(rawTaxDetails.ivaAmount),
      appliesIgtf: Boolean(rawTaxDetails.appliesIgtf),
      igtfPercent: number(rawTaxDetails.igtfPercent),
      igtfBase: number(rawTaxDetails.igtfBase),
      igtfAmount: number(rawTaxDetails.igtfAmount)
    } : {
      taxableBase: number(raw['taxTaxableBase']),
      exemptBase: number(raw['taxExemptBase']),
      ivaPercent: number(raw['taxIvaPercent']),
      ivaAmount: number(raw['taxIvaAmount']),
      appliesIgtf: Boolean(raw['taxAppliesIgtf']),
      igtfPercent: number(raw['taxIgtfPercent']),
      igtfBase: number(raw['taxIgtfBase']),
      igtfAmount: number(raw['taxIgtfAmount'])
    };
    const payments = Array.isArray(raw['payments']) ? raw['payments'] as PaymentRecord[] : [];
    const items: InvoiceItem[] = rawItems.map(item => ({
      productId: text(item['productId']),
      sku: text(item['sku']),
      name: text(item['name']),
      unit: text(item['unit']) || 'UND',
      quantity: number(item['quantity']),
      unitPrice: number(item['unitPrice']),
      costPrice: number(item['costPrice']),
      priceLevel: item['priceLevel'] as PriceLevelKey | undefined,
      discountPercent: number(item['discountPercent']),
      isTaxExempt: Boolean(item['isTaxExempt']),
      taxRate: number(item['taxRate']),
      subtotal: number(item['subtotal']),
      taxAmount: number(item['taxAmount']),
      total: number(item['total'])
    }));

    return {
      id: text(raw['id']),
      invoiceNumber: text(raw['invoiceNumber']),
      customerId: text(raw['customerId']),
      customerName: text(raw['customerName']) || text(customer?.name),
      customerTaxId: text(raw['customerTaxId']) || text(customer?.taxId),
      warehouseId: text(raw['warehouseId']),
      date: text(raw['date']) || text(raw['invoiceDate']),
      type: raw['type'] as Invoice['type'],
      status: raw['status'] === 'ANULADA' ? 'ANULADA' : 'EMITIDA',
      items,
      baseCurrency: (raw['baseCurrency'] as CurrencyCode | undefined) || 'USD',
      paymentCurrency: (raw['paymentCurrency'] as CurrencyCode | undefined) || 'VES',
      bcvRate: number(raw['bcvRate']),
      eurRate: number(raw['eurRate']),
      rateOrigin: raw['rateOrigin'] as Invoice['rateOrigin'],
      priceLevelApplied: (raw['priceLevelApplied'] as PriceLevelKey | undefined) || 'price1',
      subtotal: number(raw['subtotal']),
      discountGlobalPercent: number(raw['discountGlobalPercent']),
      discountTotal: number(raw['discountTotal']),
      taxDetails,
      taxTotal: number(raw['taxTotal']),
      total: number(raw['total']),
      totalVes: number(raw['totalVes']),
      totalEur: number(raw['totalEur']),
      payments,
      sellerId: text(raw['sellerId']),
      sellerName: text(raw['sellerName']),
      digitalSeal: text(raw['digitalSeal']) || undefined,
      quoteOriginNumber: text(raw['quoteOriginNumber']) || undefined,
      dispatchGuideNumbers: Array.isArray(raw['dispatchGuideNumbers']) ? raw['dispatchGuideNumbers'] as string[] : undefined,
      dispatchControlNumbers: Array.isArray(raw['dispatchControlNumbers']) ? raw['dispatchControlNumbers'] as string[] : undefined,
      deliveryOrderNumbers: Array.isArray(raw['deliveryOrderNumbers']) ? raw['deliveryOrderNumbers'] as string[] : undefined,
      isStockAlreadyDeducted: Boolean(raw['isStockAlreadyDeducted'])
    };
  }

  private normalizeProduct(raw: Product & { stocks?: { warehouseId: string; quantity: number; warehouse?: { name: string } }[]; price1?: number; price2?: number; price3?: number; price4?: number; price5?: number }): Product {
    const categories = Array.isArray(raw.categories)
      ? raw.categories.map(category => typeof category === 'string' ? category : (category as { name: string }).name)
      : [];
    const normalizedCategories = categories.length ? categories : raw.category ? [raw.category] : [];
    const stockByWarehouse = raw.stockByWarehouse?.length
      ? raw.stockByWarehouse
      : (raw.stocks || []).map(stock => ({
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse?.name || stock.warehouseId,
        quantity: Number(stock.quantity || 0)
      }));
    const prices = raw.prices || {
      price1: Number(raw.price1 ?? raw.salePrice ?? 0),
      price2: Number(raw.price2 ?? 0),
      price3: Number(raw.price3 ?? 0),
      price4: Number(raw.price4 ?? 0),
      price5: Number(raw.price5 ?? 0)
    };

    return {
      ...raw,
      category: raw.category || normalizedCategories[0] || '',
      categories: normalizedCategories,
      prices,
      salePrice: Number(raw.salePrice || prices.price1 || 0),
      costPrice: Number(raw.costPrice || 0),
      taxRate: Number(raw.taxRate ?? 0),
      minStock: Number(raw.minStock || 0),
      totalStock: Number(raw.totalStock || stockByWarehouse.reduce((total, stock) => total + Number(stock.quantity || 0), 0)),
      stockByWarehouse,
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  private productPayload(product: Partial<Product>) {
    const prices = product.prices;
    const categories = product.categories;
    const fields = Object.fromEntries(
      Object.entries(product).filter(([key]) => !['id', 'updatedAt', 'prices', 'stockByWarehouse', 'primaryWarehouseId', 'categories'].includes(key))
    );
    return {
      ...fields,
      categories: categories?.length ? categories : product.category ? [product.category] : undefined,
      price1: prices?.price1 ?? product.salePrice,
      price2: prices?.price2,
      price3: prices?.price3,
      price4: prices?.price4,
      price5: prices?.price5
    };
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`).pipe(
      map(products => products.map(product => this.normalizeProduct(product as Product & { stocks?: { warehouseId: string; quantity: number; warehouse?: { name: string } }[] }))),
      catchError(error => throwError(() => error))
    );
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.baseUrl}/categories`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateFiscalProfile(profile: Partial<CompanyFiscalProfile>): Observable<CompanyFiscalProfile> {
    return this.http.put<CompanyFiscalProfile>(`${this.baseUrl}/fiscal/company-profile`, profile);
  }

  createCategory(category: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(`${this.baseUrl}/categories`, category);
  }

  updateCategory(id: string, category: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.put<ProductCategory>(`${this.baseUrl}/categories/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${id}`);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.baseUrl}/warehouses`).pipe(
      catchError(() => of([]))
    );
  }

  createWarehouse(warehouse: Warehouse): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/warehouses`, warehouse);
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`).pipe(
      catchError(() => of([]))
    );
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.baseUrl}/suppliers`).pipe(
      catchError(() => of([]))
    );
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.baseUrl}/invoices`).pipe(
      map(invoices => invoices.map(invoice => this.normalizeInvoice(invoice))),
      catchError(() => of([]))
    );
  }

  getKardexMovements(): Observable<KardexMovement[]> {
    return this.http.get<KardexMovement[]>(`${this.baseUrl}/kardex`).pipe(
      map(movements => movements.map(movement => this.normalizeKardexMovement(movement as KardexMovement & { movementDate?: string }))),
      catchError(() => of([]))
    );
  }

  createCustomer(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/customers`, customer);
  }

  createStockAdjustment(payload: StockAdjustmentPayload): Observable<StockAdjustmentResponse> {
    return this.http.post<StockAdjustmentResponse>(`${this.baseUrl}/adjustments`, payload);
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, this.productPayload(product)).pipe(
      map(response => this.normalizeProduct(response as Product & { stocks?: { warehouseId: string; quantity: number; warehouse?: { name: string } }[] }))
    );
  }

  createPurchaseOrder(purchaseOrder: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders`, purchaseOrder);
  }

  createKardexMovements(movements: KardexMovement[]): Observable<KardexMovement[]> {
    return forkJoin(movements.map(movement => this.http.post<KardexMovement>(
      `${this.baseUrl}/kardex/movement`,
      {
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        movementDate: movement.date,
        movementType: movement.movementType,
        docReference: movement.docReference,
        supportDocument: movement.supportDocument,
        justificationReason: movement.justificationReason,
        entryQty: Number(movement.entryQty),
        entryUnitCost: Number(movement.entryUnitCost),
        entryTotalCost: Number(movement.entryTotalCost),
        exitQty: Number(movement.exitQty),
        exitUnitCost: Number(movement.exitUnitCost),
        exitTotalCost: Number(movement.exitTotalCost),
        balanceQty: Number(movement.balanceQty),
        balanceAverageCost: Number(movement.balanceAverageCost),
        balanceTotalValuation: Number(movement.balanceTotalValuation),
        registeredByUserId: movement.registeredByUserId
      }
    ).pipe(
      map(response => this.normalizeKardexMovement(response as KardexMovement & { movementDate?: string }))
    )));
  }

  //crear proveedores

  createSupplier(supplier: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.baseUrl}/suppliers`, supplier);
  }

  createQuote(quote: Partial<Quote>): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/quotes`, quote);
  }

  updateQuote(id: string, quote: Partial<Quote>): Observable<Quote> {
    return this.http.put<Quote>(`${this.baseUrl}/quotes/${id}`, quote);
  }

  createDispatchGuide(guide: Partial<DispatchGuide>): Observable<DispatchGuide> {
    return this.http.post<DispatchGuide>(`${this.baseUrl}/logistics/dispatch-guides`, guide);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/products/${id}`, this.productPayload(product)).pipe(
      map(response => this.normalizeProduct(response as Product & { stocks?: { warehouseId: string; quantity: number; warehouse?: { name: string } }[] }))
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${id}`);
  }

  createInvoice(invoice: CreateInvoiceRequest): Observable<Pick<Invoice, 'id' | 'invoiceNumber'>> {
    return this.http.post<Pick<Invoice, 'id' | 'invoiceNumber'>>(`${this.baseUrl}/invoices`, invoice);
  }

  getBoms(): Observable<Bom[]> {
    return this.http.get<Bom[]>(`${this.baseUrl}/mrp/boms`).pipe(
      catchError(() => of([]))
    );
  }

  getProductionOrders(): Observable<ProductionOrder[]> {
    return this.http.get<ProductionOrder[]>(`${this.baseUrl}/mrp/orders`).pipe(
      catchError(() => of([]))
    );
  }

  getCrmDeals(): Observable<CrmDeal[]> {
    return this.http.get<CrmDeal[]>(`${this.baseUrl}/crm/deals`).pipe(
      catchError(() => of([]))
    );
  }

  getPurchaseOrders(): Observable<PurchaseOrder[]> {
    return this.http.get<PurchaseOrder[]>(`${this.baseUrl}/purchase-orders`).pipe(catchError(() => of([])));
  }

  getQuotes(): Observable<Quote[]> {
    return this.http.get<Quote[]>(`${this.baseUrl}/quotes`).pipe(catchError(() => of([])));
  }

  getDispatchGuides(): Observable<DispatchGuide[]> {
    return this.http.get<DispatchGuide[]>(`${this.baseUrl}/logistics/dispatch-guides`).pipe(catchError(() => of([])));
  }

  getDeliveryOrders(): Observable<DeliveryOrder[]> {
    return this.http.get<DeliveryOrder[]>(`${this.baseUrl}/logistics/delivery-orders`).pipe(catchError(() => of([])));
  }

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/accounting/accounts`).pipe(catchError(() => of([])));
  }

  getJournalEntries(): Observable<JournalEntry[]> {
    return this.http.get<JournalEntry[]>(`${this.baseUrl}/accounting/journal-entries`).pipe(catchError(() => of([])));
  }

  getBankAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.baseUrl}/treasury/bank-accounts`).pipe(catchError(() => of([])));
  }

  getTreasuryTransactions(): Observable<TreasuryTransaction[]> {
    return this.http.get<TreasuryTransaction[]>(`${this.baseUrl}/treasury/transactions`).pipe(catchError(() => of([])));
  }

  getPayableBills(): Observable<PayableBill[]> {
    return this.http.get<PayableBill[]>(`${this.baseUrl}/treasury/payable-bills`).pipe(catchError(() => of([])));
  }

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.baseUrl}/audit/logs`).pipe(catchError(() => of([])));
  }

  getCurrentBcv(): Observable<Partial<BcvExchangeRateState>> {
    return this.http.get<Partial<BcvExchangeRateState>>(`${this.baseUrl}/bcv/current`);
  }

  getCompanyProfile(): Observable<Partial<CompanyFiscalProfile>> {
    return this.http.get<Partial<CompanyFiscalProfile>>(`${this.baseUrl}/fiscal/company-profile`);
  }

  getCashSessions(): Observable<CashRegisterSession[]> {
    return this.http.get<CashRegisterSession[]>(`${this.baseUrl}/cash-sessions`).pipe(catchError(() => of([])));
  }
}
