import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Quote, PriceLevelKey, Invoice, PaymentMethod, PaymentRecord, CurrencyCode, InvoiceType } from '../../models/erp.models';
import { InvoiceModal } from '../invoice-modal/invoice-modal';
import { QuotePrintModal } from './quote-print-modal';
import { DecimalPipe, DatePipe } from '@angular/common';
import { matchesEntitySearch } from '../../utils/entity-search';
import {
  buildQuoteEmail,
  buildQuoteWhatsAppMessage,
  filterQuoteCustomers,
  findQuoteCustomer,
  quoteCustomerDetails
} from './quote-document';

@Component({
  selector: 'app-quotes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, InvoiceModal, QuotePrintModal, DecimalPipe, DatePipe],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <section class="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/80 p-4 shadow-sm sm:p-6">
        <div class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-100/70 blur-3xl"></div>
        <div class="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-200">
              <mat-icon aria-hidden="true">request_quote</mat-icon>
            </span>
            <div class="min-w-0">
              <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">Ventas · Propuestas</p>
              <h1 class="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Presupuestos y cotizaciones
              </h1>
              <p class="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                Prepare propuestas multimoneda, compártalas con sus clientes y conviértalas en factura cuando estén aprobadas.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 sm:flex sm:shrink-0 sm:items-center">
          <button 
            (click)="openNewCustomerModal()"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            <mat-icon aria-hidden="true" class="text-base text-emerald-600">person_add</mat-icon>
            <span>Nuevo cliente</span>
          </button>

          <button 
            (click)="openNewQuote()"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-violet-200 transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
            <mat-icon aria-hidden="true" class="text-base">add</mat-icon>
            <span>Nuevo presupuesto</span>
          </button>
          </div>
        </div>
      </section>

      <!-- Quotes List Cards -->
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        @for (q of stateService.quotes(); track q.id) {
          @let bcvRate = q.bcvRate || stateService.bcvState().usdRate;
          <article class="group relative flex flex-col justify-between space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md sm:p-5">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-400 to-transparent opacity-70"></div>
            
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
                  <p class="text-xs text-slate-500 mt-0.5">Emitido: {{ q.date | date:'shortDate' }} • Vence: {{ q.validUntil | date:'shortDate' }}</p>
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
                      <span class="text-slate-700 truncate max-w-[200px]">{{ item.quantity }}x {{ item.name }}</span>
                      <span class="font-mono font-medium text-slate-900">\${{ item.total  | number: '1.2-2' }}</span>
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
                  <span class="font-mono font-bold text-lg text-slate-900">\${{ q.total  | number: '1.2-2' }}</span>
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
                  [attr.aria-label]="'Ver e imprimir presupuesto ' + q.quoteNumber"
                  class="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2">
                  <mat-icon aria-hidden="true" class="text-sm text-slate-600">print</mat-icon>
                  <span>Imprimir</span>
                </button>

                <!-- Action: Enviar por WhatsApp -->
                <button 
                  type="button"
                  (click)="shareViaWhatsApp(q)"
                  [attr.aria-label]="'Compartir presupuesto ' + q.quoteNumber + ' por WhatsApp'"
                  class="inline-flex min-h-10 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                  <mat-icon aria-hidden="true" class="text-sm text-emerald-600">chat</mat-icon>
                  <span>WhatsApp</span>
                </button>

                <!-- Action: Enviar por Correo Electrónico -->
                <button 
                  type="button"
                  (click)="shareViaEmail(q)"
                  [attr.aria-label]="'Compartir presupuesto ' + q.quoteNumber + ' por correo electrónico'"
                  class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                  <mat-icon class="text-sm text-sky-600">mail</mat-icon>
                  <span class="hidden sm:inline">Email</span>
                </button>

                @if (q.status === 'BORRADOR') {
                  <button 
                    type="button"
                    (click)="changeQuoteStatus(q.id, 'ENVIADO')"
                    [attr.aria-label]="'Marcar cotización ' + q.quoteNumber + ' como enviada al cliente'"
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
                        type="button"
                        (click)="viewFiscalInvoice(q.convertedInvoiceNumber)"
                        [attr.aria-label]="'Ver factura ' + q.convertedInvoiceNumber"
                        class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
                        <mat-icon class="text-sm">receipt_long</mat-icon>
                        <span>Ver Factura</span>
                      </button>
                    }
                  </div>
                } @else {
                  <button 
                    type="button"
                    (click)="openConversionPreview(q)"
                    [attr.aria-label]="'Convertir presupuesto ' + q.quoteNumber + ' en factura'"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
                    <mat-icon class="text-sm">sync_alt</mat-icon>
                    <span>Facturar</span>
                  </button>
                }
              </div>
            </div>

          </article>
        } @empty {
          <div class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <span class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <mat-icon aria-hidden="true">request_quote</mat-icon>
            </span>
            <h2 class="text-sm font-bold text-slate-900">Aún no hay presupuestos</h2>
            <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Cree una propuesta para comenzar; podrá compartirla por correo o WhatsApp e imprimirla como PDF.</p>
            <button type="button" (click)="openNewQuote()" class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
              <mat-icon aria-hidden="true" class="text-base">add</mat-icon>
              Crear presupuesto
            </button>
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
                      Tasa BCV: Bs. {{ calc.bcvRate  | number: '1.2-2' }}
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
                            <div class="font-semibold text-slate-900">{{ it.name }}</div>
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
                            \${{ it.unitPrice  | number: '1.2-2' }}
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
                            \${{ it.lineNet  | number: '1.2-2' }}
                          </td>
                          <td class="px-3 py-2 text-right font-mono text-slate-600 text-[11px]">
                            Bs. {{ (it.lineNet * calc.bcvRate)  | number: '1.2-2' }}
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

                  <label class="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 cursor-pointer">
                    <input
                      id="conv-create-pickup"
                      type="checkbox"
                      [checked]="createPickupOrder()"
                      (change)="createPickupOrder.set($any($event.target).checked)"
                      class="mt-0.5 accent-amber-600" />
                    <span><strong>Preparar para retiro en despacho.</strong> Genera una orden pendiente vinculada a esta factura. Requiere pago completo; la mercancía se descuenta del inventario una sola vez al facturar.</span>
                  </label>

                  <!-- SENIAT IGTF Evaluation Banner -->
                  @if (calc.appliesIgtf && calc.igtfAmount > 0) {
                    <div class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                      <div class="flex items-center space-x-1.5 text-indigo-900 font-bold text-[11px]">
                        <mat-icon class="text-xs text-indigo-600">account_balance</mat-icon>
                        <span>Percepción IGTF 3.00% (SENIAT)</span>
                      </div>
                      <p class="text-[10px] text-indigo-700">
                        Aplica 3% por cobro en divisas/moneda extranjera emitido por Sujeto Pasivo Especial. Base: \${{ calc.igtfBase | number:'1.2-2' }} (Bs. {{ (calc.igtfBase * calc.bcvRate) | number:'1.2-2' }}).
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
                        <span class="font-mono font-medium text-white">\${{ calc.grossSubtotal  | number: '1.2-2' }}</span>
                      </div>

                      @if (calc.discountTotal > 0) {
                        <div class="flex justify-between text-emerald-400">
                          <span>Descuentos Otorgados:</span>
                          <span class="font-mono font-medium">-\${{ calc.discountTotal  | number: '1.2-2' }}</span>
                        </div>
                      }

                      <div class="flex justify-between text-slate-400">
                        <span>Base Imponible Gravable (16%):</span>
                        <span class="font-mono font-medium text-white">\${{ calc.taxableBase  | number: '1.2-2' }}</span>
                      </div>

                      @if (calc.exemptBase > 0) {
                        <div class="flex justify-between text-slate-400">
                          <span>Base Exenta (0%):</span>
                          <span class="font-mono font-medium text-white">\${{ calc.exemptBase  | number: '1.2-2' }}</span>
                        </div>
                      }

                      <div class="flex justify-between text-slate-300">
                        <span>Débito Fiscal IVA (16.00%):</span>
                        <span class="font-mono font-bold text-white">\${{ calc.ivaAmount  | number: '1.2-2' }}</span>
                      </div>

                      @if (calc.appliesIgtf && calc.igtfAmount > 0) {
                        <div class="flex justify-between text-indigo-300 font-semibold">
                          <span>Percepción IGTF (3.00% Divisas):</span>
                          <span class="font-mono">+\${{ calc.igtfAmount  | number: '1.2-2' }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Grand Totals Box -->
                  <div class="pt-3 border-t border-slate-700 space-y-1">
                    <div class="flex justify-between items-baseline">
                      <span class="text-xs font-bold text-slate-300">TOTAL FACTURA (USD):</span>
                      <span class="font-mono font-black text-xl text-emerald-400">
                        \${{ calc.grandTotalUsd  | number: '1.2-2' }}
                      </span>
                    </div>

                    <div class="flex justify-between items-baseline text-xs">
                      <span class="text-slate-400 font-bold">TOTAL OFICIAL EN BOLÍVARES:</span>
                      <span class="font-mono font-bold text-slate-200">
                        Bs. {{ calc.grandTotalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </span>
                    </div>

                    <div class="text-[10px] text-slate-400 text-right pt-0.5">
                      Cobro a registrar: <strong class="text-emerald-300 font-mono">{{ calc.paymentTargetAmount  | number: '1.2-2' }} {{ conversionPaymentCurrency() }}</strong>
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
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="new-quote-title" (keydown.escape)="closeNewQuote()" class="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div class="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-800 to-indigo-800 px-4 py-4 text-white sm:px-6">
              <div class="flex min-w-0 items-center gap-2.5">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <mat-icon aria-hidden="true">request_quote</mat-icon>
                </span>
                <div class="min-w-0">
                  <h2 id="new-quote-title" class="text-sm font-bold">Crear presupuesto comercial</h2>
                  <p class="mt-0.5 text-[11px] text-violet-100">Seleccione un cliente y agregue los artículos de la propuesta.</p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <div role="radiogroup" aria-label="Tasa de cambio BCV" class="rounded-xl border border-white/20 bg-white/10 p-1">
                  <span class="block px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-violet-200">Tasas BCV · Bs.</span>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="selectedBcvRateId() === 'usd'"
                      (click)="selectedBcvRateId.set('usd')"
                      class="min-h-9 rounded-lg px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      [class.bg-white]="selectedBcvRateId() === 'usd'"
                      [class.text-violet-900]="selectedBcvRateId() === 'usd'"
                      [class.shadow-sm]="selectedBcvRateId() === 'usd'"
                      [class.text-white]="selectedBcvRateId() !== 'usd'"
                      [class.hover:bg-white/10]="selectedBcvRateId() !== 'usd'">
                      <span class="block text-[9px] font-semibold uppercase">USD</span>
                      <span class="block whitespace-nowrap font-mono text-[11px] font-bold">{{ stateService.bcvState().usdRate | number: '1.2-4' }}</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="selectedBcvRateId() === 'eur'"
                      (click)="selectedBcvRateId.set('eur')"
                      class="min-h-9 rounded-lg px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      [class.bg-white]="selectedBcvRateId() === 'eur'"
                      [class.text-violet-900]="selectedBcvRateId() === 'eur'"
                      [class.shadow-sm]="selectedBcvRateId() === 'eur'"
                      [class.text-white]="selectedBcvRateId() !== 'eur'"
                      [class.hover:bg-white/10]="selectedBcvRateId() !== 'eur'">
                      <span class="block text-[9px] font-semibold uppercase">EUR</span>
                      <span class="block whitespace-nowrap font-mono text-[11px] font-bold">{{ stateService.bcvState().eurRate | number: '1.2-4' }}</span>
                    </button>
                  </div>
                </div>
                <button type="button" (click)="closeNewQuote()" aria-label="Cerrar presupuesto" class="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <mat-icon aria-hidden="true">close</mat-icon>
                </button>
              </div>
            </div>

            <div class="space-y-5 overflow-y-auto p-4 text-xs sm:p-6">

              <div>
                <label for="quote-warehouse" class="mb-1 block font-semibold text-slate-700">Almacén de despacho</label>
                <select id="quote-warehouse"
                  [value]="selectedWarehouse()"
                  (change)="selectedWarehouse.set($any($event.target).value)"
                  class="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                  @for (wh of stateService.warehouses(); track wh.id) {
                    <option [value]="wh.id">{{ wh.name }}</option>
                  } @empty {
                    <option value="">Sin almacenes disponibles</option>
                  }
                </select>
              </div>
              
              <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div class="min-w-0">
                  <div class="mb-1 flex items-center justify-between gap-2">
                    <label for="quote-customer-search" class="font-semibold text-slate-800">Cliente / receptor fiscal <span class="text-rose-600">*</span></label>
                    <button
                      type="button"
                      (click)="openNewCustomerModal()"
                      aria-label="Registrar nuevo cliente"
                      class="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                      <mat-icon aria-hidden="true" class="text-sm">person_add</mat-icon>
                      Nuevo
                    </button>
                  </div>

                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <mat-icon aria-hidden="true" class="text-lg">search</mat-icon>
                    </div>
                    <input
                      id="quote-customer-search"
                      type="search"
                      [value]="customerSearchQuery()"
                      (input)="customerSearchQuery.set($any($event.target).value); customerSearchOpen.set(true)"
                      (focus)="customerSearchOpen.set(true)"
                      (keydown.escape)="customerSearchOpen.set(false)"
                      placeholder="Buscar por nombre, cédula o RIF"
                      autocomplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="quote-customer-results"
                      [attr.aria-expanded]="customerSearchOpen()"
                      class="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20" />

                    @if (customerSearchOpen()) {
                      <div id="quote-customer-results" role="listbox" aria-label="Resultados de clientes" class="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        @for (cust of filteredCustomers(); track cust.id) {
                          <button
                            type="button"
                            role="option"
                            [attr.aria-selected]="selectedCustomerId() === cust.id"
                            (click)="selectCustomer(cust.id)"
                            class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-600">
                            <span class="min-w-0">
                              <span class="block truncate text-xs font-semibold text-slate-900">{{ cust.name }}</span>
                              <span class="mt-0.5 block truncate text-[10px] text-slate-500">{{ cust.email || cust.phone || cust.customerType }}</span>
                            </span>
                            <span class="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">{{ cust.taxId }}</span>
                          </button>
                        } @empty {
                          <p aria-live="polite" class="px-3 py-3 text-xs text-slate-500">
                            {{ customerSearchQuery().trim() ? 'No hay clientes que coincidan. Revise el nombre o documento, o registre uno nuevo.' : 'No hay clientes registrados.' }}
                          </p>
                        }
                      </div>
                    }
                  </div>

                  @if (selectedCustomer(); as cust) {
                    <div class="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <mat-icon aria-hidden="true" class="mt-0.5 text-base text-emerald-700">verified_user</mat-icon>
                      <div class="min-w-0">
                        <p class="truncate text-xs font-bold text-emerald-950">{{ cust.name }}</p>
                        <p class="mt-0.5 truncate font-mono text-[10px] text-emerald-800">{{ cust.taxId }}</p>
                        <p class="mt-0.5 truncate text-[10px] text-emerald-800">{{ cust.email || cust.phone || 'Sin contacto registrado' }}</p>
                      </div>
                    </div>
                  } @else {
                    <p class="mt-1 text-[10px] text-rose-700">Seleccione un cliente de los resultados para continuar.</p>
                  }
                </div>

                <div class="min-w-0">
                  <label for="quote-price-level" class="mb-1 flex min-h-9 items-center font-semibold text-slate-700">Nivel de precio aplicado</label>
                  <select id="quote-price-level"
                    [value]="selectedPriceLevel()"
                    (change)="selectedPriceLevel.set($any($event.target).value)"
                    class="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                    <option value="price1">Precio 1: Detal (Base)</option>
                    <option value="price2">Precio 2: Mayorista</option>
                    <option value="price3">Precio 3: Distribuidor</option>
                    <option value="price4">Precio 4: VIP / Aliado</option>
                    <option value="price5">Precio 5: Especial</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
                <div>
                  <label for="quote-expiration" class="mb-1 block font-semibold text-slate-700">Válido hasta <span class="text-rose-600">*</span></label>
                  <input #expDate id="quote-expiration" type="date" [value]="today" class="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600" />
                </div>
                <div>
                  <label for="quote-notes" class="mb-1 block font-semibold text-slate-700">Notas comerciales</label>
                  <input #notesInput id="quote-notes" type="text" placeholder="Términos de entrega..." class="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600" />
                </div>
              </div>

              <!-- Products Builder -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                
                <div class="grid grid-cols-1 items-end gap-2 md:grid-cols-4">
                  <div class="relative min-w-0 md:col-span-2">
                    <label for="quote-product-search" class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">Agregar producto</label>
                    <div class="relative">
                      <mat-icon aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</mat-icon>
                      <input
                        id="quote-product-search"
                        type="search"
                        [value]="quoteProductSearchQuery()"
                        (input)="onQuoteProductSearchInput($any($event.target).value)"
                        (focus)="quoteProductSearchOpen.set(true)"
                        (keydown.escape)="quoteProductSearchOpen.set(false)"
                        placeholder="Buscar por nombre, SKU o código"
                        autocomplete="off"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls="quote-product-results"
                        [attr.aria-expanded]="quoteProductSearchOpen()"
                        class="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                    </div>

                    @if (quoteProductSearchOpen()) {
                      <div id="quote-product-results" role="listbox" aria-label="Resultados de productos" class="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        @for (product of filteredQuoteProducts(); track product.id) {
                          @let price = stateService.getProductPriceByLevel(product, selectedPriceLevel());
                          <button
                            type="button"
                            role="option"
                            [attr.aria-selected]="selectedQuoteProductId() === product.id"
                            (click)="selectQuoteProduct(product.id)"
                            class="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-600">
                            <span class="min-w-0">
                              <span class="block truncate text-xs font-semibold text-slate-900">{{ product.name }}</span>
                              <span class="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{{ product.sku }}{{ product.barcode ? ' · ' + product.barcode : '' }}</span>
                            </span>
                            <span class="shrink-0 font-mono text-[10px] font-semibold text-slate-700">\${{ price | number: '1.2-2' }}</span>
                          </button>
                        } @empty {
                          <p aria-live="polite" class="px-3 py-3 text-xs text-slate-500">
                            {{ quoteProductSearchQuery().trim() ? 'No hay productos que coincidan con la búsqueda.' : 'No hay productos disponibles para este almacén.' }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                  <div>
                    <label for="quote-quantity" class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">Cantidad</label>
                    <input #qtySel id="quote-quantity" type="number" min="1" value="2" placeholder="Cant" class="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600" />
                  </div>
                  <div>
                    <label for="quote-discount" class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-700">Descuento (%)</label>
                    <input #discSel id="quote-discount" type="number" min="0" max="50" value="0" placeholder="Desc %" class="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600" />
                  </div>
                </div>
                <div class="flex justify-end">
                  <button 
                    type="button" 
                    (click)="addSelectedQuoteItem(+qtySel.value, +discSel.value)"
                    [disabled]="!selectedQuoteProductId()"
                    class="inline-flex min-h-10 items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                    <mat-icon aria-hidden="true" class="text-xs">add</mat-icon>
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
                      <button type="button" (click)="removeQuoteItem($index)" [attr.aria-label]="'Eliminar ' + getProdName(it.productId)" class="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
                        <mat-icon aria-hidden="true" class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  } @empty {
                    <p class="py-4 text-center text-slate-400 text-xs">Agrega productos al presupuesto.</p>
                  }
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <button type="button" (click)="closeNewQuote()" class="min-h-11 rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">Cancelar</button>
              <button 
                [disabled]="quoteItems().length === 0 || !selectedCustomer()"
                (click)="submitQuote(expDate.value, notesInput.value)"
                class="min-h-11 rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                Guardar presupuesto
              </button>
            </div>

          </section>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: REGISTRAR NUEVO CLIENTE -->
      <!-- ========================================================= -->
      @if (showNewCustomerModal()) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="new-customer-title" class="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div class="flex items-center justify-between bg-emerald-800 px-4 py-4 text-white sm:px-6">
              <div class="flex items-center gap-2">
                <mat-icon aria-hidden="true">person_add</mat-icon>
                <h2 id="new-customer-title" class="text-sm font-semibold">Registrar nuevo cliente</h2>
              </div>
              <button type="button" (click)="showNewCustomerModal.set(false)" aria-label="Cerrar registro de cliente" class="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <mat-icon aria-hidden="true">close</mat-icon>
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

          </section>
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
export default class QuotesComponent {

  selectedBcvRateId = signal<string>('usd');
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);

  showNewQuoteModal = signal<boolean>(false);

  //select warehouse
  selectedWarehouse = signal<string>(this.stateService.warehouses()[0]?.id || '');

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
  conversionWarehouseId = signal<string>('');
  conversionPaymentCurrency = signal<CurrencyCode>('USD');
  conversionPaymentMethod = signal<PaymentMethod>('TRANSFERENCIA');
  conversionPaymentRef = signal<string>('');
  conversionInvoiceType = signal<InvoiceType>('FACTURA_ELECTRONICA');
  conversionManualIgtf = signal<boolean | null>(null);
  createPickupOrder = signal<boolean>(false);
  isSubmittingConversion = signal<boolean>(false);

  // Active Invoice Modal for viewing & printing
  activeInvoiceForModal = signal<Invoice | null>(null);

  customers = computed(() => this.stateService.customers());
  today: string = new Date().toISOString().slice(0, 10);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_QUOTE') {
        this.openNewQuote();
      }
    });
  }

  selectedCustomerId = signal<string>(this.customers()[0]?.id || '');
  selectedCustomer = computed(() => this.customers().find(c => c.id === this.selectedCustomerId()));
  customerSearchQuery = signal<string>('');
  customerSearchOpen = signal<boolean>(false);
  filteredCustomers = computed(() => filterQuoteCustomers(this.customers(), this.customerSearchQuery()));
  selectedPriceLevel = signal<PriceLevelKey>('price1');
  quoteItems = signal<{ productId: string; quantity: number; discountPercent: number }[]>([]);

  selectedConversionCustomer = computed(() => {
    const q = this.selectedQuoteForConversion();
    if (!q) return null;
    return this.customers().find(c => c.id === q.customerId || c.taxId === q.customerTaxId);
  });

  filteredProducts = computed(() => {
      const wh = this.selectedWarehouse();
  
      return this.stateService.products().filter(prod => {
        // Warehouse
        const matchesWh = wh === '' || 
          (prod.primaryWarehouseId === wh) ||
          prod.itemType === 'SERVICE' || prod.stockByWarehouse.some(s => s.warehouseId === wh && s.quantity > 0);
  
        return matchesWh;
      });
    });

  quoteProductSearchQuery = signal<string>('');
  quoteProductSearchOpen = signal<boolean>(false);
  selectedQuoteProductId = signal<string>('');
  filteredQuoteProducts = computed(() => this.filteredProducts()
      .filter(product => matchesEntitySearch(
        this.quoteProductSearchQuery(),
        product.name,
        product.sku,
        product.barcode
      ))
      .slice(0, 50));

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
        name: it.name || prod?.name || 'Producto',
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

    const cleanTaxId = this.newCustomerTaxId().trim().toUpperCase();
    const existing = this.customers().find(c => c.taxId.toUpperCase() === cleanTaxId);
    if (existing) {
      this.stateService.notify('error', 'Cliente Existente', `Ya existe un cliente registrado con el documento ${cleanTaxId} (${existing.name}).`);
      return; 
    }

    this.stateService.createCustomer({
      taxId: this.newCustomerTaxId().trim(),
      name: this.newCustomerName().trim(),
      email: this.newCustomerEmail().trim(),
      phone: this.newCustomerPhone().trim(),
      address: this.newCustomerAddress().trim(),
      customerType: this.newCustomerType()
    }).subscribe(costumer => {
        this.selectCustomer(costumer.id);
        this.showNewCustomerModal.set(false);
    });
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
    if (!productId || quantity <= 0) return false;
    this.quoteItems.update(list => [...list, { productId, quantity, discountPercent: discountPercent || 0 }]);
    return true;
  }

  addSelectedQuoteItem(quantity: number, discountPercent: number) {
    if (this.addQuoteItem(this.selectedQuoteProductId(), quantity, discountPercent)) {
      this.clearQuoteProductSelection();
    }
  }

  onQuoteProductSearchInput(query: string) {
    this.quoteProductSearchQuery.set(query);
    this.selectedQuoteProductId.set('');
    this.quoteProductSearchOpen.set(true);
  }

  selectQuoteProduct(productId: string) {
    const product = this.filteredProducts().find(item => item.id === productId);
    if (!product) return;
    this.selectedQuoteProductId.set(product.id);
    this.quoteProductSearchQuery.set(product.name);
    this.quoteProductSearchOpen.set(false);
  }

  clearQuoteProductSelection() {
    this.selectedQuoteProductId.set('');
    this.quoteProductSearchQuery.set('');
    this.quoteProductSearchOpen.set(false);
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
    this.createPickupOrder.set(false);
    this.isSubmittingConversion.set(false);
    this.showConversionModal.set(true);
  }

  closeConversionModal() {
    this.showConversionModal.set(false);
    this.selectedQuoteForConversion.set(null);
    this.createPickupOrder.set(false);
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

  async confirmAndIssueFiscalInvoice() {
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

    let result: Awaited<ReturnType<ErpStateService['convertQuoteToInvoice']>>;
    try {
      result = await this.stateService.convertQuoteToInvoice(calc.quote.id, {
        warehouseId: this.conversionWarehouseId(),
        payments: paymentRecords,
        paymentCurrency: this.conversionPaymentCurrency(),
        invoiceType: this.conversionInvoiceType(),
        appliesIgtfManual: this.conversionManualIgtf(),
        createPickupOrder: this.createPickupOrder()
      });
    } finally {
      this.isSubmittingConversion.set(false);
    }

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
    const customer = this.selectedCustomer();
    if (!customer) return;
    this.stateService.createQuote(
      this.selectedCustomerId(),
      this.quoteItems(),
      expDate || this.today,
      notes,
      this.selectedPriceLevel(),
      this.selectedWarehouse(),
      this.selectedBcvRateId()
    ).subscribe({
      next: (res) => {
        console.log('Quote created successfully:', res);
        this.showNewQuoteModal.set(false);
        this.quoteItems.set([]);
      },
      error: (err) => {
        console.error('Error creating quote:', err);
      }
    });

  }

  openNewQuote() {
    this.customerSearchQuery.set('');
    this.customerSearchOpen.set(false);
    this.clearQuoteProductSelection();
    this.showNewQuoteModal.set(true);
  }

  closeNewQuote() {
    this.customerSearchOpen.set(false);
    this.clearQuoteProductSelection();
    this.showNewQuoteModal.set(false);
  }

  selectCustomer(customerId: string) {
    this.selectedCustomerId.set(customerId);
    this.customerSearchQuery.set('');
    this.customerSearchOpen.set(false);
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
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      this.stateService.notify('error', 'No se pudo compartir', 'Permite las ventanas emergentes para abrir WhatsApp.');
      return;
    }

    this.prepareQuoteForSharing(quote, 'Compartido vía WhatsApp', popup, saved => {
      const customer = findQuoteCustomer(saved, this.stateService.customers());
      const customerDetails = quoteCustomerDetails(saved, customer);
      const bcvRate = saved.bcvRate || this.stateService.bcvState().usdRate;
      const message = buildQuoteWhatsAppMessage(saved, this.stateService.companyProfile(), customer, bcvRate);
      const cleanPhone = customerDetails.phone.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(message);
      popup.location.href = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    });
  }

  // Share via Email
  shareViaEmail(quote: Quote) {
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      this.stateService.notify('error', 'No se pudo compartir', 'Permite las ventanas emergentes para abrir tu aplicación de correo.');
      return;
    }

    this.prepareQuoteForSharing(quote, 'Compartido vía Correo', popup, saved => {
      const customer = findQuoteCustomer(saved, this.stateService.customers());
      const bcvRate = saved.bcvRate || this.stateService.bcvState().usdRate;
      const email = buildQuoteEmail(saved, this.stateService.companyProfile(), customer, bcvRate);
      popup.location.href = `mailto:${encodeURIComponent(email.recipient)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    });
  }

  private prepareQuoteForSharing(
    quote: Quote,
    channel: string,
    popup: Window,
    openDocument: (savedQuote: Quote) => void
  ) {
    const status = quote.status === 'BORRADOR' ? 'ENVIADO' : quote.status;
    this.stateService.updateQuoteStatus(quote.id, status, channel).subscribe({
      next: saved => {
        if (!popup.closed) openDocument(saved);
      },
      error: () => popup.close()
    });
  }
}
