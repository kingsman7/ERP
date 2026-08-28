import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Quote, PriceLevelKey, Invoice, PaymentMethod, PaymentRecord, CurrencyCode, InvoiceType } from '../../models/erp.models';
import { InvoiceModal } from '../invoice-modal/invoice-modal';
import { QuotePrintModal } from './quote-print-modal';

@Component({
  selector: 'app-quotes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, InvoiceModal, QuotePrintModal],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <span class="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center">
            <mat-icon>request_quote</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Presupuestos y Cotizaciones Comerciales
            </h1>
            <p class="text-xs text-slate-500">
              Emisión de propuestas comerciales multimoneda con vista previa y totalización fiscal para emisión de factura SENIAT
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="openNewCustomerModal()"
            class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs">
            <mat-icon class="text-base text-emerald-600">person_add</mat-icon>
            <span>+ Nuevo Cliente</span>
          </button>

          <button 
            (click)="showNewQuoteModal.set(true)"
            class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
            <mat-icon class="text-base">add</mat-icon>
            <span>Nuevo Presupuesto</span>
          </button>
        </div>
      </div>

      <!-- Quotes List Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (q of stateService.quotes(); track q.id) {
          @let bcvRate = stateService.bcvState().usdRate;
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-violet-300 transition-all">
            
            <div class="space-y-3">
              <!-- Top Row: Code & Status -->
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="font-mono font-bold text-base text-slate-900">{{ q.quoteNumber }}</span>
                    @if (q.status === 'CONVERTIDO_A_FACTURA') {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                        <mat-icon class="text-xs">task_alt</mat-icon>
                        <span>Facturado</span>
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">Emitido: {{ q.date.substring(0, 10) }} • Vence: {{ q.expirationDate }}</p>
                </div>

                <div class="flex items-center space-x-1.5">
                  @if (q.priceLevelApplied) {
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 font-mono">
                      {{ q.priceLevelApplied }}
                    </span>
                  }
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    [class]="getStatusBadgeClass(q.status)">
                    {{ q.status.replace(/_/g, ' ') }}
                  </span>
                </div>
              </div>

              <!-- Customer Info -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span class="text-slate-400 font-medium uppercase text-[10px]">Cliente / Receptor Fiscal</span>
                <p class="font-bold text-slate-900">{{ q.customerName }}</p>
                <p class="text-slate-500 font-mono">{{ q.customerTaxId }}</p>
              </div>

              <!-- Line Items Summary -->
              <div class="space-y-1 text-xs">
                <span class="text-slate-400 font-medium text-[10px] uppercase">Artículos Incluidos:</span>
                <div class="divide-y divide-slate-100 max-h-28 overflow-y-auto pr-1">
                  @for (item of q.items; track item.productId) {
                    <div class="py-1 flex items-center justify-between">
                      <span class="text-slate-700 truncate max-w-[200px]">{{ item.quantity }}x {{ item.productName }}</span>
                      <span class="font-mono font-medium text-slate-900">\${{ item.total.toFixed(2) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Actions Bar: Print, WhatsApp, Email, Status & Conversion -->
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Total Cotizado</span>
                <div class="flex items-baseline space-x-1.5">
                  <span class="font-mono font-bold text-lg text-slate-900">\${{ q.total.toFixed(2) }}</span>
                  <span class="font-mono text-xs text-slate-500">
                    (Bs. {{ (q.totalVes || (q.total * bcvRate)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }})
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <!-- Action: Ver / Imprimir Documento Proforma -->
                <button 
                  type="button"
                  (click)="openPrintQuote(q)"
                  title="Ver / Imprimir Presupuesto Formal (PDF)"
                  class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                  <mat-icon class="text-sm text-slate-600">print</mat-icon>
                  <span class="hidden sm:inline">Imprimir</span>
                </button>

                <!-- Action: Enviar por WhatsApp -->
                <button 
                  type="button"
                  (click)="shareViaWhatsApp(q)"
                  title="Enviar Presupuesto por WhatsApp"
                  class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                  <mat-icon class="text-sm text-emerald-600">chat</mat-icon>
                  <span>WhatsApp</span>
                </button>

                <!-- Action: Enviar por Correo Electrónico -->
                <button 
                  type="button"
                  (click)="shareViaEmail(q)"
                  title="Enviar por Correo Electrónico"
                  class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                  <mat-icon class="text-sm text-sky-600">mail</mat-icon>
                  <span class="hidden sm:inline">Email</span>
                </button>

                @if (q.status === 'BORRADOR') {
                  <button 
                    type="button"
                    (click)="changeQuoteStatus(q.id, 'ENVIADO')"
                    title="Marcar cotización como enviada al cliente"
                    class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                    <mat-icon class="text-sm text-amber-600">send</mat-icon>
                    <span>Marcar Enviado</span>
                  </button>
                }

                @if (q.status === 'CONVERTIDO_A_FACTURA') {
                  <div class="flex items-center space-x-1.5">
                    <span class="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-bold border border-indigo-200">
                      {{ q.convertedInvoiceNumber }}
                    </span>
                    @if (q.convertedInvoiceNumber) {
                      <button 
                        (click)="viewFiscalInvoice(q.convertedInvoiceNumber)"
                        title="Ver Comprobante Fiscal Emitido"
                        class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
                        <mat-icon class="text-sm">receipt_long</mat-icon>
                        <span>Ver Factura</span>
                      </button>
                    }
                  </div>
                } @else {
                  <button 
                    (click)="openConversionPreview(q)"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
                    <mat-icon class="text-sm">sync_alt</mat-icon>
                    <span>Facturar</span>
                  </button>
                }
              </div>
            </div>

          </div>
        } @empty {
          <div class="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No existen presupuestos registrados en el sistema.
          </div>
        }
      </div>

      <!-- ========================================================= -->
      <!-- MODAL: VISTA PREVIA Y CONFIRMACIÓN DE CONVERSIÓN A FACTURA FISCAL -->
      <!-- ========================================================= -->
      @if (showConversionModal() && conversionCalculations(); as calc) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2.5">
                <div class="p-2 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <mat-icon>receipt_long</mat-icon>
                </div>
                <div>
                  <h3 class="font-bold text-sm sm:text-base tracking-tight flex items-center space-x-2">
                    <span>Vista Previa y Totalización Fiscal</span>
                    <span class="px-2 py-0.5 bg-emerald-700/80 rounded-lg font-mono text-xs border border-white/20">
                      {{ calc.quote.quoteNumber }}
                    </span>
                  </h3>
                  <p class="text-[11px] text-emerald-100">
                    Confirme el almacén de despacho, desglose impositivo y método de cobro antes de generar el comprobante fiscal oficial
                  </p>
                </div>
              </div>
              <button 
                (click)="closeConversionModal()" 
                class="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Modal Content (Scrollable) -->
            <div class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <!-- Customer & Fiscal Issuer Banner -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <!-- Receptor / Cliente -->
                <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Receptor Fiscal / Cliente</span>
                    <span class="font-mono text-slate-700 font-semibold">{{ calc.quote.customerTaxId }}</span>
                  </div>
                  <p class="font-bold text-slate-900 text-sm">{{ calc.quote.customerName }}</p>
                  @if (selectedConversionCustomer(); as cust) {
                    <p class="text-[11px] text-slate-500 truncate">{{ cust.address || 'Sin dirección fiscal registrada' }}</p>
                    <p class="text-[10px] text-slate-400">{{ cust.email || cust.phone || 'Sin contacto directo' }}</p>
                  }
                </div>

                <!-- Emisor & Régimen Fiscal -->
                <div class="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                    <span>Emisor Fiscal (SENIAT)</span>
                    <span class="font-mono text-indigo-900 font-semibold">{{ stateService.companyProfile().taxId }}</span>
                  </div>
                  <p class="font-bold text-indigo-950 text-sm">{{ stateService.companyProfile().legalName }}</p>
                  <div class="flex items-center space-x-2 text-[11px]">
                    <span class="px-2 py-0.5 rounded-md font-semibold"
                      [class.bg-indigo-100]="calc.isSpecialTaxpayer"
                      [class.text-indigo-800]="calc.isSpecialTaxpayer"
                      [class.bg-slate-200]="!calc.isSpecialTaxpayer"
                      [class.text-slate-800]="!calc.isSpecialTaxpayer">
                      {{ calc.isSpecialTaxpayer ? 'Sujeto Pasivo Especial (Agente IGTF)' : 'Contribuyente Ordinario' }}
                    </span>
                    <span class="font-mono text-indigo-700 font-bold">
                      Tasa BCV: Bs. {{ calc.bcvRate.toFixed(2) }}
                    </span>
                  </div>
                </div>

              </div>

              <!-- Dispatch Warehouse & Invoice Type Configuration -->
              <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="conv-wh-select" class="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <mat-icon class="text-xs text-slate-500">warehouse</mat-icon>
                    <span>Almacén de Despacho (Descargo de Stock) *</span>
                  </label>
                  <select 
                    id="conv-wh-select"
                    [value]="conversionWarehouseId()"
                    (change)="conversionWarehouseId.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none">
                    @for (wh of stateService.warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }} ({{ wh.code }}) - {{ wh.location }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="conv-inv-type" class="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <mat-icon class="text-xs text-slate-500">description</mat-icon>
                    <span>Tipo de Comprobante Fiscal *</span>
                  </label>
                  <select 
                    id="conv-inv-type"
                    [value]="conversionInvoiceType()"
                    (change)="conversionInvoiceType.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none">
                    <option value="FACTURA_ELECTRONICA">Factura Electrónica SENIAT (A-000)</option>
                    <option value="BOLETA_POS">Boleta Fiscal Punto de Venta</option>
                    <option value="TICKET_VENTA">Ticket / Comprobante de Entrega</option>
                  </select>
                </div>
              </div>

              <!-- Detailed Items Breakdown Table -->
              <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div class="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span class="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Desglose de Renglones & Validación de Inventario
                  </span>
                  <span class="text-[10px] text-slate-500">
                    {{ calc.detailedItems.length }} artículos cotizados
                  </span>
                </div>

                <div class="overflow-x-auto max-h-52 divide-y divide-slate-100 bg-white">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th class="px-3 py-2">Item / Producto</th>
                        <th class="px-2 py-2 text-center">Cant.</th>
                        <th class="px-2 py-2 text-center">Stock Almacén</th>
                        <th class="px-3 py-2 text-right">P. Unitario ($)</th>
                        <th class="px-2 py-2 text-center">Desc.</th>
                        <th class="px-2 py-2 text-center">IVA</th>
                        <th class="px-3 py-2 text-right">Total ($)</th>
                        <th class="px-3 py-2 text-right">Total (Bs.)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (it of calc.detailedItems; track it.productId) {
                        <tr class="hover:bg-slate-50/60 transition-colors">
                          <td class="px-3 py-2">
                            <div class="font-semibold text-slate-900">{{ it.productName }}</div>
                            <div class="font-mono text-[10px] text-slate-400">{{ it.productSku }}</div>
                          </td>
                          <td class="px-2 py-2 text-center font-mono font-bold text-slate-800">
                            {{ it.quantity }}
                          </td>
                          <td class="px-2 py-2 text-center">
                            @if (it.hasSufficientStock) {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {{ it.whStock }} disp.
                              </span>
                            } @else {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Stock actual menor a cantidad cotizada">
                                {{ it.whStock }} disp. (Alerta)
                              </span>
                            }
                          </td>
                          <td class="px-3 py-2 text-right font-mono text-slate-700">
                            \${{ it.unitPrice.toFixed(2) }}
                          </td>
                          <td class="px-2 py-2 text-center font-mono text-slate-500">
                            {{ it.discountPercent ? it.discountPercent + '%' : '-' }}
                          </td>
                          <td class="px-2 py-2 text-center">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              [class.bg-blue-50]="it.isTaxable"
                              [class.text-blue-700]="it.isTaxable"
                              [class.bg-slate-100]="!it.isTaxable"
                              [class.text-slate-600]="!it.isTaxable">
                              {{ it.isTaxable ? '16%' : 'Exento (E)' }}
                            </span>
                          </td>
                          <td class="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            \${{ it.lineNet.toFixed(2) }}
                          </td>
                          <td class="px-3 py-2 text-right font-mono text-slate-600 text-[11px]">
                            Bs. {{ (it.lineNet * calc.bcvRate).toFixed(2) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Payment & Fiscal Totalization Form Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                
                <!-- Left: Payment Configuration (7 cols) -->
                <div class="lg:col-span-6 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span class="font-bold text-slate-800 uppercase tracking-wider block text-[11px] flex items-center space-x-1.5">
                    <mat-icon class="text-sm text-emerald-600">payments</mat-icon>
                    <span>Forma de Pago y Cobro Fiscal</span>
                  </span>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label for="conv-pay-curr" class="block font-semibold text-slate-600 text-[11px] mb-1">Moneda de Cobro</label>
                      <select 
                        id="conv-pay-curr"
                        [value]="conversionPaymentCurrency()"
                        (change)="onConversionPaymentCurrencyChange($any($event.target).value)"
                        class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none">
                        <option value="USD">USD ($ Dólares)</option>
                        <option value="VES">VES (Bs. Bolívares BCV)</option>
                        <option value="EUR">EUR (€ Euros BCV)</option>
                      </select>
                    </div>

                    <div>
                      <label for="conv-pay-method" class="block font-semibold text-slate-600 text-[11px] mb-1">Método de Pago</label>
                      <select 
                        id="conv-pay-method"
                        [value]="conversionPaymentMethod()"
                        (change)="onConversionPaymentMethodChange($any($event.target).value)"
                        class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none">
                        <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                        <option value="PAGO_MOVIL">Pago Móvil (VES)</option>
                        <option value="PUNTO_VENTA_DEBITO">Punto de Venta Débito (VES)</option>
                        <option value="TARJETA_CREDITO">Tarjeta de Crédito (VES)</option>
                        <option value="EFECTIVO">Efectivo Bolívares (VES)</option>
                        <option value="EFECTIVO_USD">Efectivo USD (Divisas)</option>
                        <option value="ZELLE">Zelle / Wire (USD)</option>
                        <option value="CREDITO">Crédito Comercial</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label for="conv-pay-ref" class="block font-semibold text-slate-600 text-[11px] mb-1">Referencia / Comprobante de Pago</label>
                    <input 
                      id="conv-pay-ref"
                      type="text"
                      [value]="conversionPaymentRef()"
                      (input)="conversionPaymentRef.set($any($event.target).value)"
                      placeholder="Ej: REF-984321 / TRANSFERENCIA"
                      class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none" />
                  </div>

                  <!-- SENIAT IGTF Evaluation Banner -->
                  @if (calc.appliesIgtf && calc.igtfAmount > 0) {
                    <div class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                      <div class="flex items-center space-x-1.5 text-indigo-900 font-bold text-[11px]">
                        <mat-icon class="text-xs text-indigo-600">account_balance</mat-icon>
                        <span>Percepción IGTF 3.00% (SENIAT)</span>
                      </div>
                      <p class="text-[10px] text-indigo-700">
                        Aplica 3% por cobro en divisas/moneda extranjera emitido por Sujeto Pasivo Especial. Base: \${{ calc.igtfBase.toFixed(2) }} (Bs. {{ (calc.igtfBase * calc.bcvRate).toFixed(2) }}).
                      </p>
                    </div>
                  } @else {
                    <div class="p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center space-x-1.5 text-[10px] text-emerald-800">
                      <mat-icon class="text-xs text-emerald-600">verified</mat-icon>
                      <span>
                        @if (!calc.isSpecialTaxpayer) {
                          <strong>Exento de IGTF (0%):</strong> Emisor configurado como Contribuyente Ordinario.
                        } @else {
                          <strong>Exento de IGTF (0%):</strong> Operación cancelada en Bolívares / Medios Electrónicos Nacionales.
                        }
                      </span>
                    </div>
                  }

                </div>

                <!-- Right: Fiscal Totalization Summary (6 cols) -->
                <div class="lg:col-span-6 p-4 bg-slate-900 text-white rounded-xl space-y-2.5 flex flex-col justify-between">
                  <div>
                    <span class="font-bold text-slate-300 uppercase tracking-wider block text-[10px] mb-2 flex items-center space-x-1">
                      <mat-icon class="text-xs text-emerald-400">calculate</mat-icon>
                      <span>Totalización Fiscal Oficial (SENIAT)</span>
                    </span>

                    <div class="space-y-1.5 text-xs">
                      <div class="flex justify-between text-slate-400">
                        <span>Subtotal Bruto:</span>
                        <span class="font-mono font-medium text-white">\${{ calc.grossSubtotal.toFixed(2) }}</span>
                      </div>

                      @if (calc.discountTotal > 0) {
                        <div class="flex justify-between text-emerald-400">
                          <span>Descuentos Otorgados:</span>
                          <span class="font-mono font-medium">-\${{ calc.discountTotal.toFixed(2) }}</span>
                        </div>
                      }

                      <div class="flex justify-between text-slate-400">
                        <span>Base Imponible Gravable (16%):</span>
                        <span class="font-mono font-medium text-white">\${{ calc.taxableBase.toFixed(2) }}</span>
                      </div>

                      @if (calc.exemptBase > 0) {
                        <div class="flex justify-between text-slate-400">
                          <span>Base Exenta (0%):</span>
                          <span class="font-mono font-medium text-white">\${{ calc.exemptBase.toFixed(2) }}</span>
                        </div>
                      }

                      <div class="flex justify-between text-slate-300">
                        <span>Débito Fiscal IVA (16.00%):</span>
                        <span class="font-mono font-bold text-white">\${{ calc.ivaAmount.toFixed(2) }}</span>
                      </div>

                      @if (calc.appliesIgtf && calc.igtfAmount > 0) {
                        <div class="flex justify-between text-indigo-300 font-semibold">
                          <span>Percepción IGTF (3.00% Divisas):</span>
                          <span class="font-mono">+\${{ calc.igtfAmount.toFixed(2) }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Grand Totals Box -->
                  <div class="pt-3 border-t border-slate-700 space-y-1">
                    <div class="flex justify-between items-baseline">
                      <span class="text-xs font-bold text-slate-300">TOTAL FACTURA (USD):</span>
                      <span class="font-mono font-black text-xl text-emerald-400">
                        \${{ calc.grandTotalUsd.toFixed(2) }}
                      </span>
                    </div>

                    <div class="flex justify-between items-baseline text-xs">
                      <span class="text-slate-400 font-bold">TOTAL OFICIAL EN BOLÍVARES:</span>
                      <span class="font-mono font-bold text-slate-200">
                        Bs. {{ calc.grandTotalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </span>
                    </div>

                    <div class="text-[10px] text-slate-400 text-right pt-0.5">
                      Cobro a registrar: <strong class="text-emerald-300 font-mono">{{ calc.paymentTargetAmount.toFixed(2) }} {{ conversionPaymentCurrency() }}</strong>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            <!-- Modal Footer Actions -->
            <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button 
                type="button"
                (click)="closeConversionModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer text-xs">
                Cancelar y Volver
              </button>

              <button 
                type="button"
                [disabled]="isSubmittingConversion()"
                (click)="confirmAndIssueFiscalInvoice()"
                class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md flex items-center space-x-2 transition-all cursor-pointer text-xs">
                <mat-icon class="text-base">verified</mat-icon>
                <span>Confirmar y Emitir Factura Fiscal</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: NUEVO PRESUPUESTO -->
      <!-- ========================================================= -->
      @if (showNewQuoteModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-violet-700 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon>request_quote</mat-icon>
                <h3 class="font-semibold text-sm">Crear Presupuesto Comercial</h3>
              </div>
              <button (click)="showNewQuoteModal.set(false)" class="text-white/80 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-slate-700">Cliente / Receptor *</span>
                    <button 
                      type="button"
                      (click)="openNewCustomerModal()"
                      class="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center space-x-1 cursor-pointer">
                      <mat-icon class="text-xs">person_add</mat-icon>
                      <span>+ Nuevo Cliente</span>
                    </button>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <select 
                      [value]="selectedCustomerId()"
                      (change)="selectedCustomerId.set($any($event.target).value)"
                      class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      @for (cust of stateService.customers(); track cust.id) {
                        <option [value]="cust.id">{{ cust.name }} ({{ cust.taxId }})</option>
                      }
                    </select>
                    <button
                      type="button"
                      (click)="openNewCustomerModal()"
                      title="Registrar nuevo cliente"
                      class="p-2 bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-slate-600 transition-colors cursor-pointer shrink-0">
                      <mat-icon class="text-base">person_add</mat-icon>
                    </button>
                  </div>

                  @if (selectedCustomer(); as cust) {
                    <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
                      <span class="font-mono font-semibold text-slate-700">{{ cust.taxId }}</span>
                      <span class="truncate max-w-[180px] text-slate-400">{{ cust.email || cust.phone || cust.customerType }}</span>
                    </div>
                  }
                </div>

                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Nivel de Precio Aplicado</span>
                  <select 
                    [value]="selectedPriceLevel()"
                    (change)="selectedPriceLevel.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800">
                    <option value="price1">Precio 1: Detal (Base)</option>
                    <option value="price2">Precio 2: Mayorista</option>
                    <option value="price3">Precio 3: Distribuidor</option>
                    <option value="price4">Precio 4: VIP / Aliado</option>
                    <option value="price5">Precio 5: Especial</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Validez Hasta *</span>
                  <input #expDate type="date" value="2026-09-15" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Notas Comerciales</span>
                  <input #notesInput type="text" placeholder="Términos de entrega..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <!-- Products Builder -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span class="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Agregar Producto</span>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div class="md:col-span-2">
                    <select #prodSel class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg">
                      @for (p of stateService.products(); track p.id) {
                        @let pVal = stateService.getProductPriceByLevel(p, selectedPriceLevel());
                        <option [value]="p.id">{{ p.name }} - \${{ pVal.toFixed(2) }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <input #qtySel type="number" min="1" value="2" placeholder="Cant" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono" />
                  </div>
                  <div>
                    <input #discSel type="number" min="0" max="50" value="0" placeholder="Desc %" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono" />
                  </div>
                </div>
                <div class="flex justify-end">
                  <button 
                    type="button" 
                    (click)="addQuoteItem(prodSel.value, +qtySel.value, +discSel.value)"
                    class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer">
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>Añadir Producto</span>
                  </button>
                </div>
              </div>

              <!-- Added Items -->
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  @for (it of quoteItems(); track $index) {
                    <div class="p-2.5 flex items-center justify-between text-xs">
                      <span class="font-medium text-slate-800">{{ it.quantity }}x {{ getProdName(it.productId) }} ({{ it.discountPercent }}% desc)</span>
                      <button (click)="removeQuoteItem($index)" class="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  } @empty {
                    <p class="py-4 text-center text-slate-400 text-xs">Agrega productos al presupuesto.</p>
                  }
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button (click)="showNewQuoteModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Cancelar</button>
              <button 
                [disabled]="quoteItems().length === 0"
                (click)="submitQuote(expDate.value, notesInput.value)"
                class="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs cursor-pointer">
                Guardar Presupuesto
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: REGISTRAR NUEVO CLIENTE -->
      <!-- ========================================================= -->
      @if (showNewCustomerModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon>person_add</mat-icon>
                <h3 class="font-semibold text-sm">Registrar Nuevo Cliente</h3>
              </div>
              <button (click)="showNewCustomerModal.set(false)" class="text-white/80 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form (submit)="saveNewCustomer($event)" class="p-6 space-y-4 text-xs">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="quote-cust-taxid" class="block font-semibold text-slate-700 mb-1">Documento / RIF / Cédula *</label>
                  <input 
                    id="quote-cust-taxid"
                    type="text" 
                    [value]="newCustomerTaxId()" 
                    (input)="newCustomerTaxId.set($any($event.target).value)" 
                    placeholder="Ej: J-12345678-0 o V-18234567" 
                    required 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>

                <div>
                  <label for="quote-cust-type" class="block font-semibold text-slate-700 mb-1">Tipo de Cliente *</label>
                  <select 
                    id="quote-cust-type"
                    [value]="newCustomerType()" 
                    (change)="newCustomerType.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none">
                    <option value="EMPRESA">Empresa / Jurídico (J / G)</option>
                    <option value="PERSONA_NATURAL">Persona Natural (V / E)</option>
                    <option value="FINAL_CONSUMIDOR">Consumidor Final</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="quote-cust-name" class="block font-semibold text-slate-700 mb-1">Razón Social o Nombre Completo *</label>
                <input 
                  id="quote-cust-name"
                  type="text" 
                  [value]="newCustomerName()" 
                  (input)="newCustomerName.set($any($event.target).value)" 
                  placeholder="Ej: Inversiones Los Andes C.A." 
                  required 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="quote-cust-email" class="block font-semibold text-slate-700 mb-1">Correo Electrónico (Cotizaciones/Facturas)</label>
                  <input 
                    id="quote-cust-email"
                    type="email" 
                    [value]="newCustomerEmail()" 
                    (input)="newCustomerEmail.set($any($event.target).value)" 
                    placeholder="contacto@empresa.com" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>

                <div>
                  <label for="quote-cust-phone" class="block font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                  <input 
                    id="quote-cust-phone"
                    type="tel" 
                    [value]="newCustomerPhone()" 
                    (input)="newCustomerPhone.set($any($event.target).value)" 
                    placeholder="+58 412 1234567" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label for="quote-cust-address" class="block font-semibold text-slate-700 mb-1">Dirección Fiscal / Ubicación</label>
                <input 
                  id="quote-cust-address"
                  type="text" 
                  [value]="newCustomerAddress()" 
                  (input)="newCustomerAddress.set($any($event.target).value)" 
                  placeholder="Av. Principal, Edificio Torre Norte, Piso 4" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  (click)="showNewCustomerModal.set(false)" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>Guardar y Seleccionar</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: IMPRESIÓN Y VISTA FORMAL DE COTIZACIÓN -->
      <!-- ========================================================= -->
      @if (activeQuoteForPrint(); as quoteToPrint) {
        <app-quote-print-modal 
          [quote]="quoteToPrint"
          (closeModal)="activeQuoteForPrint.set(null)" />
      }

      <!-- ========================================================= -->
      <!-- MODAL: VISOR DE FACTURA FISCAL EMITIDA -->
      <!-- ========================================================= -->
      @if (activeInvoiceForModal(); as inv) {
        <app-invoice-modal 
          [invoice]="inv"
          (closeModal)="activeInvoiceForModal.set(null)" />
      }

    </div>
  `
})
export class QuotesComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);

  showNewQuoteModal = signal<boolean>(false);

  // Active quote for print modal
  activeQuoteForPrint = signal<Quote | null>(null);

  // New Customer Modal Signals
  showNewCustomerModal = signal<boolean>(false);
  newCustomerTaxId = signal<string>('');
  newCustomerName = signal<string>('');
  newCustomerEmail = signal<string>('');
  newCustomerPhone = signal<string>('');
  newCustomerAddress = signal<string>('');
  newCustomerType = signal<'EMPRESA' | 'PERSONA_NATURAL' | 'FINAL_CONSUMIDOR'>('EMPRESA');

  // Conversion to Fiscal Invoice Modal Signals
  showConversionModal = signal<boolean>(false);
  selectedQuoteForConversion = signal<Quote | null>(null);
  conversionWarehouseId = signal<string>('wh-01');
  conversionPaymentCurrency = signal<CurrencyCode>('USD');
  conversionPaymentMethod = signal<PaymentMethod>('TRANSFERENCIA');
  conversionPaymentRef = signal<string>('');
  conversionInvoiceType = signal<InvoiceType>('FACTURA_ELECTRONICA');
  conversionManualIgtf = signal<boolean | null>(null);
  isSubmittingConversion = signal<boolean>(false);

  // Active Invoice Modal for viewing & printing
  activeInvoiceForModal = signal<Invoice | null>(null);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_QUOTE') {
        this.showNewQuoteModal.set(true);
      }
    });
  }

  selectedCustomerId = signal<string>(this.stateService.customers()[0]?.id || '');
  selectedCustomer = computed(() => this.stateService.customers().find(c => c.id === this.selectedCustomerId()));
  selectedPriceLevel = signal<PriceLevelKey>('price1');
  quoteItems = signal<{ productId: string; quantity: number; discountPercent: number }[]>([]);

  selectedConversionCustomer = computed(() => {
    const q = this.selectedQuoteForConversion();
    if (!q) return null;
    return this.stateService.customers().find(c => c.id === q.customerId || c.taxId === q.customerTaxId);
  });

  conversionCalculations = computed(() => {
    const quote = this.selectedQuoteForConversion();
    if (!quote) return null;

    const bcv = this.stateService.bcvState();
    const usdRate = bcv.usdRate || 36.50;
    const eurRate = bcv.eurRate || 39.50;
    const company = this.stateService.companyProfile();
    const isSpecialTaxpayer = company.isSpecialTaxpayer;

    const method = this.conversionPaymentMethod();
    const currency = this.conversionPaymentCurrency();

    const isBolivares = this.stateService.isBolivaresPaymentMethod(method, currency);
    const isDivisas = this.stateService.isForeignCurrencyPaymentMethod(method, currency);

    let appliesIgtf = false;
    if (this.conversionManualIgtf() !== null) {
      appliesIgtf = Boolean(this.conversionManualIgtf());
    } else {
      appliesIgtf = isSpecialTaxpayer && isDivisas && !isBolivares;
    }

    let grossSubtotal = 0;
    let discountTotal = 0;
    let taxableBase = 0;
    let exemptBase = 0;
    let ivaAmount = 0;

    const whId = this.conversionWarehouseId();

    const detailedItems = (quote.items || []).map(it => {
      const prod = this.stateService.products().find(p => p.id === it.productId);
      const unitPrice = it.unitPrice || 0;
      const lineGross = Number((unitPrice * it.quantity).toFixed(2));
      const discPct = it.discountPercent || 0;
      const lineDisc = Number((lineGross * (discPct / 100)).toFixed(2));
      const lineNet = Number((lineGross - lineDisc).toFixed(2));

      grossSubtotal += lineGross;
      discountTotal += lineDisc;

      const isTaxable = it.isTaxExempt === false || (it.taxRate !== undefined && it.taxRate > 0) || (it.isTaxExempt === undefined && (prod ? !prod.isTaxExempt && prod.taxRate > 0 : true));
      const lineTaxRate = it.taxRate !== undefined ? it.taxRate : (prod?.taxRate ?? 0.16);

      if (isTaxable && lineTaxRate > 0) {
        taxableBase += lineNet;
        const tax = Number((lineNet * lineTaxRate).toFixed(2));
        ivaAmount += tax;
      } else {
        exemptBase += lineNet;
      }

      const whStock = prod?.stockByWarehouse?.find(sw => sw.warehouseId === whId)?.quantity ?? (prod?.totalStock ?? 0);
      const hasSufficientStock = whStock >= it.quantity;

      return {
        ...it,
        productName: it.productName || prod?.name || 'Producto',
        productSku: it.sku || prod?.sku || 'SKU-000',
        lineGross,
        lineDisc,
        lineNet,
        isTaxable,
        whStock,
        hasSufficientStock
      };
    });

    const baseForIgtf = taxableBase + exemptBase + ivaAmount;
    const igtfAmount = appliesIgtf ? Number((baseForIgtf * 0.03).toFixed(2)) : 0;
    const grandTotalUsd = Number((taxableBase + exemptBase + ivaAmount + igtfAmount).toFixed(2));
    const grandTotalVes = Number((grandTotalUsd * usdRate).toFixed(2));
    const grandTotalEur = Number(((grandTotalUsd * usdRate) / eurRate).toFixed(2));

    const paymentTargetAmount = currency === 'VES' 
      ? grandTotalVes 
      : (currency === 'EUR' ? grandTotalEur : grandTotalUsd);

    return {
      quote,
      detailedItems,
      bcvRate: usdRate,
      eurRate,
      grossSubtotal,
      discountTotal,
      taxableBase,
      exemptBase,
      ivaAmount,
      appliesIgtf,
      igtfBase: appliesIgtf ? baseForIgtf : 0,
      igtfAmount,
      grandTotalUsd,
      grandTotalVes,
      grandTotalEur,
      isSpecialTaxpayer,
      isBolivares,
      isDivisas,
      paymentTargetAmount,
      allStockAvailable: detailedItems.every(i => i.hasSufficientStock)
    };
  });

  openNewCustomerModal() {
    this.newCustomerTaxId.set('');
    this.newCustomerName.set('');
    this.newCustomerEmail.set('');
    this.newCustomerPhone.set('');
    this.newCustomerAddress.set('');
    this.newCustomerType.set('EMPRESA');
    this.showNewCustomerModal.set(true);
  }

  saveNewCustomer(event: Event) {
    event.preventDefault();
    if (!this.newCustomerTaxId().trim() || !this.newCustomerName().trim()) {
      this.stateService.notify('error', 'Datos Incompletos', 'El documento y la razón social son obligatorios.');
      return;
    }

    const res = this.stateService.createCustomer({
      taxId: this.newCustomerTaxId().trim(),
      name: this.newCustomerName().trim(),
      email: this.newCustomerEmail().trim(),
      phone: this.newCustomerPhone().trim(),
      address: this.newCustomerAddress().trim(),
      customerType: this.newCustomerType()
    });

    if (res.success && res.customer) {
      this.selectedCustomerId.set(res.customer.id);
      this.showNewCustomerModal.set(false);
    }
  }

  getStatusBadgeClass(status: Quote['status']): string {
    switch (status) {
      case 'APROBADO':
        return 'bg-emerald-100 text-emerald-800';
      case 'CONVERTIDO_A_FACTURA':
        return 'bg-indigo-100 text-indigo-800';
      case 'ENVIADO':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getProdName(id: string): string {
    return this.stateService.products().find(p => p.id === id)?.name || id;
  }

  addQuoteItem(productId: string, quantity: number, discountPercent: number) {
    if (!productId || quantity <= 0) return;
    this.quoteItems.update(list => [...list, { productId, quantity, discountPercent: discountPercent || 0 }]);
  }

  removeQuoteItem(index: number) {
    this.quoteItems.update(list => list.filter((_, i) => i !== index));
  }

  openConversionPreview(quote: Quote) {
    this.selectedQuoteForConversion.set(quote);
    this.conversionWarehouseId.set(this.stateService.warehouses()[0]?.id || 'wh-01');
    this.conversionPaymentCurrency.set('USD');
    this.conversionPaymentMethod.set('TRANSFERENCIA');
    this.conversionPaymentRef.set(`COT-CONVERT-${quote.quoteNumber}`);
    this.conversionInvoiceType.set('FACTURA_ELECTRONICA');
    this.conversionManualIgtf.set(null);
    this.isSubmittingConversion.set(false);
    this.showConversionModal.set(true);
  }

  closeConversionModal() {
    this.showConversionModal.set(false);
    this.selectedQuoteForConversion.set(null);
  }

  onConversionPaymentMethodChange(method: PaymentMethod) {
    this.conversionPaymentMethod.set(method);
    if (method === 'PAGO_MOVIL' || method === 'PUNTO_VENTA_DEBITO' || method === 'TARJETA_CREDITO' || method === 'EFECTIVO') {
      this.conversionPaymentCurrency.set('VES');
    } else if (method === 'EFECTIVO_USD' || method === 'ZELLE') {
      this.conversionPaymentCurrency.set('USD');
    } else if (method === 'EFECTIVO_EUR') {
      this.conversionPaymentCurrency.set('EUR');
    }
  }

  onConversionPaymentCurrencyChange(curr: CurrencyCode) {
    this.conversionPaymentCurrency.set(curr);
    if (curr === 'VES' && (this.conversionPaymentMethod() === 'EFECTIVO_USD' || this.conversionPaymentMethod() === 'EFECTIVO_EUR')) {
      this.conversionPaymentMethod.set('EFECTIVO');
    } else if (curr === 'USD' && this.conversionPaymentMethod() === 'EFECTIVO') {
      this.conversionPaymentMethod.set('EFECTIVO_USD');
    } else if (curr === 'EUR' && this.conversionPaymentMethod() === 'EFECTIVO') {
      this.conversionPaymentMethod.set('EFECTIVO_EUR');
    }
  }

  confirmAndIssueFiscalInvoice() {
    const calc = this.conversionCalculations();
    if (!calc || !calc.quote) return;

    this.isSubmittingConversion.set(true);

    const paymentRecords: PaymentRecord[] = [
      {
        method: this.conversionPaymentMethod(),
        amount: calc.paymentTargetAmount,
        currency: this.conversionPaymentCurrency(),
        reference: this.conversionPaymentRef().trim() || `COT-CONVERT-${calc.quote.quoteNumber}`,
        isForeignCurrency: calc.isDivisas && !calc.isBolivares
      }
    ];

    const result = this.stateService.convertQuoteToInvoice(calc.quote.id, {
      warehouseId: this.conversionWarehouseId(),
      payments: paymentRecords,
      paymentCurrency: this.conversionPaymentCurrency(),
      invoiceType: this.conversionInvoiceType(),
      appliesIgtfManual: this.conversionManualIgtf()
    });

    this.isSubmittingConversion.set(false);

    if (result.success) {
      this.closeConversionModal();
      if (result.invoice) {
        this.activeInvoiceForModal.set(result.invoice);
      }
    }
  }

  viewFiscalInvoice(invoiceNumber: string) {
    const inv = this.stateService.invoices().find(i => i.invoiceNumber === invoiceNumber);
    if (inv) {
      this.activeInvoiceForModal.set(inv);
    } else {
      this.stateService.notify('warning', 'Factura No Encontrada', `No se localizó el documento fiscal ${invoiceNumber}.`);
    }
  }

  submitQuote(expDate: string, notes: string) {
    if (this.quoteItems().length === 0) return;

    this.stateService.createQuote(
      this.selectedCustomerId(),
      this.quoteItems(),
      expDate || '2026-09-15',
      notes,
      this.selectedPriceLevel()
    );

    this.quoteItems.set([]);
    this.showNewQuoteModal.set(false);
  }

  // Open Printable / PDF Document
  openPrintQuote(quote: Quote) {
    this.activeQuoteForPrint.set(quote);
  }

  // Change quote status (e.g. BORRADOR -> ENVIADO / APROBADO)
  changeQuoteStatus(quoteId: string, newStatus: Quote['status']) {
    this.stateService.updateQuoteStatus(quoteId, newStatus);
  }

  // Share via WhatsApp with structured text
  shareViaWhatsApp(quote: Quote) {
    const cust = this.stateService.customers().find(c => c.id === quote.customerId || c.taxId === quote.customerTaxId);
    const bcvRate = quote.bcvRate || this.stateService.bcvState().usdRate || 36.50;
    const totalBs = quote.totalVes || (quote.total * bcvRate);
    const company = this.stateService.companyProfile();

    let itemsText = '';
    quote.items.forEach(item => {
      itemsText += `• ${item.quantity}x ${item.productName}: $${(item.total || 0).toFixed(2)}\n`;
    });

    const msg = 
      `*PRESUPUESTO COMERCIAL - ${company.legalName}*\n` +
      `*Cotización Nº:* ${quote.quoteNumber}\n` +
      `*Cliente:* ${quote.customerName} (${quote.customerTaxId})\n` +
      `*Fecha:* ${quote.date.substring(0, 10)} | *Válido hasta:* ${quote.expirationDate}\n\n` +
      `*Detalle de Artículos:*\n` +
      itemsText + `\n` +
      `*Total Cotizado:* $${quote.total.toFixed(2)} USD\n` +
      `*Contravalor Oficial BCV:* Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa: Bs. ${bcvRate.toFixed(2)})\n\n` +
      (quote.notes ? `*Condiciones:* ${quote.notes}\n\n` : '') +
      `_Quedamos atentos a su confirmación para proceder con el despacho y facturación fiscal._`;

    // Auto-update status to ENVIADO if was BORRADOR
    if (quote.status === 'BORRADOR') {
      this.stateService.updateQuoteStatus(quote.id, 'ENVIADO', 'Compartido vía WhatsApp');
    }

    const cleanPhone = (cust?.phone || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(msg);
    const whatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    window.open(whatsappUrl, '_blank');
  }

  // Share via Email
  shareViaEmail(quote: Quote) {
    const cust = this.stateService.customers().find(c => c.id === quote.customerId || c.taxId === quote.customerTaxId);
    const bcvRate = quote.bcvRate || this.stateService.bcvState().usdRate || 36.50;
    const totalBs = quote.totalVes || (quote.total * bcvRate);
    const company = this.stateService.companyProfile();

    let itemsText = '';
    quote.items.forEach(item => {
      itemsText += `- ${item.quantity}x ${item.productName}: $${(item.total || 0).toFixed(2)}\r\n`;
    });

    const subject = encodeURIComponent(`Presupuesto Comercial ${quote.quoteNumber} - ${company.legalName}`);
    const body = encodeURIComponent(
      `Estimado/a ${quote.customerName},\r\n\r\n` +
      `Adjuntamos el presupuesto comercial solicitado:\r\n\r\n` +
      `Número: ${quote.quoteNumber}\r\n` +
      `Fecha: ${quote.date.substring(0, 10)}\r\n` +
      `Válido hasta: ${quote.expirationDate}\r\n\r\n` +
      `Artículos incluidos:\r\n` +
      itemsText + `\r\n` +
      `Subtotal: $${(quote.subtotal || 0).toFixed(2)}\r\n` +
      `IVA Estimado: $${(quote.taxTotal || 0).toFixed(2)}\r\n` +
      `TOTAL USD: $${quote.total.toFixed(2)}\r\n` +
      `TOTAL OFICIAL BS: Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa BCV: Bs. ${bcvRate.toFixed(2)})\r\n\r\n` +
      `Quedamos a su disposición para cualquier consulta.\r\n\r\n` +
      `Atentamente,\r\n` +
      `${company.legalName}\r\n` +
      `RIF: ${company.taxId}\r\n` +
      `Tel: ${company.phone || ''}`
    );

    // Auto-update status to ENVIADO if was BORRADOR
    if (quote.status === 'BORRADOR') {
      this.stateService.updateQuoteStatus(quote.id, 'ENVIADO', 'Compartido vía Correo');
    }

    const email = cust?.email || '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }
}
