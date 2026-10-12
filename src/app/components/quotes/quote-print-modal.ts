import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Quote } from '../../models/erp.models';
import { ErpStateService } from '../../services/erp-state.service';
import { DecimalPipe, DatePipe } from '@angular/common';
import { findQuoteCustomer, quoteCompanyDetails, quoteCustomerDetails } from './quote-document';

@Component({
  selector: 'app-quote-print-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, DecimalPipe, DatePipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="quote-print-title" class="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 bg-slate-900 px-4 py-4 text-white no-print sm:px-6">
          <div class="flex items-center space-x-2.5">
            <div class="p-2 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-400/30 flex items-center justify-center">
              <mat-icon>print</mat-icon>
            </div>
            <div>
              <h2 id="quote-print-title" class="flex items-center space-x-2 text-sm font-bold tracking-tight sm:text-base">
                <span>Documento Comercial Proforma</span>
                <span class="px-2 py-0.5 bg-violet-500/30 rounded-lg font-mono text-xs border border-violet-300/30">
                  {{ quote().quoteNumber }}
                </span>
              </h2>
              <p class="text-[11px] text-slate-300">
                Presupuesto listo para impresión oficial, descarga en PDF o envío al cliente
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button 
              type="button"
              (click)="printDoc()" 
              class="inline-flex min-h-10 items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <mat-icon aria-hidden="true" class="text-sm">print</mat-icon>
              <span class="hidden sm:inline">Imprimir / Guardar PDF</span>
            </button>
            <button 
              type="button"
              (click)="closeModal.emit()" 
              aria-label="Cerrar vista de impresión"
              class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <mat-icon aria-hidden="true">close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Printable Document Area -->
        <div id="printable-quote-document" class="space-y-5 overflow-y-auto bg-white p-4 text-xs text-slate-800 print-document sm:space-y-6 sm:p-8">
          
          <!-- Company & Document Title Header -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <!-- <span class="p-1.5 bg-violet-600 text-white rounded-lg font-black text-sm">ERP</span> -->
                <h2 class="text-lg font-black text-slate-900 tracking-tight">{{ issuer().legalName }}</h2>
              </div>
              <p class="text-slate-500 font-mono text-xs font-semibold">RIF: {{ issuer().taxId }}</p>
              <p class="text-slate-600 max-w-sm">{{ issuer().address }}</p>
              @if (issuer().phone || issuer().email) {
                <p class="text-slate-500">{{ issuer().phone }}{{ issuer().phone && issuer().email ? ' | ' : '' }}{{ issuer().email }}</p>
              }
              <p class="text-[11px] text-violet-700 font-medium font-mono">
                {{ issuer().isSpecialTaxpayer ? 'Contribuyente Especial' : 'Contribuyente Ordinario' }}
              </p>
            </div>

            <div class="text-right sm:self-center p-4 bg-slate-50 rounded-2xl border border-slate-200 min-w-[200px] space-y-1">
              <span class="text-[10px] font-bold text-violet-700 uppercase tracking-widest block">Presupuesto / Cotización</span>
              <p class="font-mono text-xl font-black text-slate-900">{{ quote().quoteNumber }}</p>
              <div class="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <div>Fecha Emisión: <strong class="text-slate-800">{{ (quote().issueDate || quote().date) | date: 'dd-M-yyyy' }}</strong></div>
                <div>Válido Hasta: <strong class="text-slate-800">{{ quote().validUntil | date: 'dd-M-yyyy' }}</strong></div>
                <div>Estado: <strong class="uppercase text-violet-700">{{ quote().status.replace(/_/g, ' ') }}</strong></div>
              </div>
            </div>
          </div>

          <!-- Customer Info & BCV Rate Banner -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="space-y-1">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Datos del Cliente / Receptor</span>
              <p class="font-bold text-slate-900 text-sm">{{ customer().name }}</p>
              @if (customer().taxId) { <p class="font-mono text-slate-700 font-semibold">RIF/CI: {{ customer().taxId }}</p> }
              @if (customer().address) { <p class="text-slate-600">{{ customer().address }}</p> }
              @if (customer().phone || customer().email) { <p class="text-slate-500">{{ customer().phone }} {{ customer().email ? '• ' + customer().email : '' }}</p> }
            </div>

            <div class="sm:text-right space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condiciones Comerciales</span>
              <p class="text-slate-700">Moneda Base: <strong class="text-slate-900 font-bold">Dólares Americanos (USD)</strong></p>
              <p class="text-slate-700">Porcentaje de descuento: <strong class="text-slate-900 font-bold">{{ quote().discountGlobalPercent | number: '1.2-2' }}%</strong></p>
              
              <!-- <p class="text-slate-700">Tasa Oficial BCV: <strong class="font-mono font-bold text-slate-900">Bs. {{ (quote().bcvRate || stateService.bcvState().usdRate)  | number: '1.2-2' }}</strong></p>
              <p class="text-slate-700">Nivel de Precio: <strong class="font-mono uppercase text-violet-700">{{ quote().priceLevelApplied || 'price1' }}</strong></p> -->
              @if (quote().notes) {
                <p class="text-slate-500 italic pt-1 text-[11px]">Notas: "{{ quote().notes }}"</p>
              }
            </div>
          </div>

          <!-- Line Items Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="w-full text-left divide-y divide-slate-200">
              <thead class="bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th class="py-2.5 px-3">Código</th>
                  <th class="py-2.5 px-3">Descripción</th>
                  <th class="py-2.5 px-3 text-right">Cant.</th>
                  <th class="py-2.5 px-3 text-right">Precio Unit.</th>
                  <th class="py-2.5 px-3 text-right">IVA</th>
                  <th class="py-2.5 px-3 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                @for (item of quote().items; track item.productId) {
                  <tr class="hover:bg-slate-50/50">
                    <td class="py-2 px-3 font-mono font-semibold text-slate-600">{{ item.sku || 'SKU' }}</td>
                    <td class="py-2 px-3 font-medium text-slate-900">{{ item.name }}</td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-slate-800">{{ item.quantity }} {{ item.unit || 'UND' }}</td>
                    <td class="py-2 px-3 text-right font-mono text-slate-700">\${{ (item.unitPrice || 0)  | number: '1.2-2' }}</td>
                    <td class="py-2 px-3 text-right font-mono text-slate-500">
                      {{ item.isTaxExempt ? 'E (0%)' : formatTaxRate(item.taxRate) }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">\${{ (item.total || 0)  | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Totalization Section -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div class="p-3 bg-violet-50/60 rounded-xl border border-violet-100 text-[11px] text-violet-900 space-y-1 max-w-sm">
              <span class="font-bold flex items-center space-x-1">
                <mat-icon class="text-xs text-violet-600">verified</mat-icon>
                <span>Condiciones de Pago y Validez</span>
              </span>
              <p class="text-slate-600">
                • Los precios en Bolívares se calculan a la tasa oficial del BCV vigente al momento del pago.
              </p>
              <p class="text-slate-600">
                • Esta cotización no reserva mercancía en almacén hasta su confirmación y facturación.
              </p>
              <p class="text-slate-600">
                • El cargo del {{ issuer().igtfRate * 100 | number: '1.0-2' }}% por concepto de IGTF aplica exclusivamente si el pago es procesado en divisas en efectivo o métodos no electrónicos de acuerdo a la Providencia SNAT/2022/00013
              </p>
              <p class="text-slate-600">
                • Todos los precios están sujetos a cambios sin previo aviso.
              </p>
              <p class="text-slate-600">
                •  DOCUMENTO SIN VALOR COMERCIAL — NO VÁLIDO COMO FACTURA 
              </p>
            </div>

            <div class="w-full sm:w-72 p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <div class="flex justify-between text-slate-300">
                <span>Sub-Total (Base Imponible):</span>
                <span class="font-mono">\${{ (quote().subtotal || 0) | number: '1.2-2' }}</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>IVA estimado:</span>
                <span class="font-mono">\${{ (quote().taxTotal || 0)  | number: '1.2-2' }}</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Descuento Global ({{ quote().discountGlobalPercent | number: '1.2-2' }}%):</span>
                <span class="font-mono">\${{ (quote().discountTotal || 0)  | number: '1.2-2' }}</span>
              </div>
              <div class="pt-2 border-t border-slate-700 space-y-1">
                <div class="flex justify-between items-baseline">
                  <span class="font-bold text-slate-200">TOTAL (USD):</span>
                  <span class="font-mono font-black text-lg text-emerald-400">\${{ quote().total | number: '1.2-2' }}</span>
                </div>
                <div class="flex justify-between items-baseline text-[11px]">
                  <span class="text-slate-400">TOTAL ESTIMADO BS:</span>
                  <span class="font-mono font-bold text-slate-200">
                    Bs. {{ (quote().totalVes || (quote().total * (quote().bcvRate || stateService.bcvState().usdRate))) | number: '1.2-2' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Actions (Screen Only) -->
        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
          <button 
            type="button" 
            (click)="closeModal.emit()" 
            class="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600">
            Cerrar
          </button>

          <div class="flex items-center space-x-2">
            <button 
              type="button"
              (click)="printDoc()" 
              class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
              <mat-icon aria-hidden="true" class="text-sm">print</mat-icon>
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

      </section>
    </div>
  `,
  styles: [`
    @media print {
      body * {
        visibility: hidden;
      }
      #printable-quote-document, #printable-quote-document * {
        visibility: visible;
      }
      #printable-quote-document {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 20px;
      }
      .no-print {
        display: none !important;
      }
    }
  `]
})
export class QuotePrintModal {
  quote = input.required<Quote>();
  
  closeModal = output<void>();
  stateService = inject(ErpStateService);
  issuer = computed(() => quoteCompanyDetails(this.quote(), this.stateService.companyProfile()));
  customer = computed(() => quoteCustomerDetails(
    this.quote(),
    findQuoteCustomer(this.quote(), this.stateService.customers())
  ));
  
  formatTaxRate(rate: number): string {
    const percent = rate <= 1 ? rate * 100 : rate;
    return `${percent.toLocaleString('es-VE', { maximumFractionDigits: 2 })}%`;
  }

  printDoc() {
    window.print();
  }
}
