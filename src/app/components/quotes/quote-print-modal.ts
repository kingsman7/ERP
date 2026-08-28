import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Quote } from '../../models/erp.models';
import { ErpStateService } from '../../services/erp-state.service';

@Component({
  selector: 'app-quote-print-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Header -->
        <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div class="flex items-center space-x-2.5">
            <div class="p-2 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-400/30 flex items-center justify-center">
              <mat-icon>print</mat-icon>
            </div>
            <div>
              <h3 class="font-bold text-sm sm:text-base tracking-tight flex items-center space-x-2">
                <span>Documento Comercial Proforma</span>
                <span class="px-2 py-0.5 bg-violet-500/30 rounded-lg font-mono text-xs border border-violet-300/30">
                  {{ quote().quoteNumber }}
                </span>
              </h3>
              <p class="text-[11px] text-slate-300">
                Presupuesto listo para impresión oficial, descarga en PDF o envío al cliente
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button 
              (click)="printDoc()" 
              class="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
              <mat-icon class="text-sm">print</mat-icon>
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button 
              (click)="closeModal.emit()" 
              class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <!-- Printable Document Area -->
        <div id="printable-quote-document" class="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
          
          <!-- Company & Document Title Header -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="p-1.5 bg-violet-600 text-white rounded-lg font-black text-sm">ERP</span>
                <h2 class="text-lg font-black text-slate-900 tracking-tight">{{ company().legalName }}</h2>
              </div>
              <p class="text-slate-500 font-mono text-xs font-semibold">RIF: {{ company().taxId }}</p>
              <p class="text-slate-600 max-w-sm">{{ company().address }}</p>
              <p class="text-slate-500">{{ company().phone }} | {{ company().email }}</p>
              <p class="text-[11px] text-violet-700 font-medium font-mono">
                {{ company().isSpecialTaxpayer ? 'Contribuyente Especial' : 'Contribuyente Ordinario' }}
              </p>
            </div>

            <div class="text-right sm:self-center p-4 bg-slate-50 rounded-2xl border border-slate-200 min-w-[200px] space-y-1">
              <span class="text-[10px] font-bold text-violet-700 uppercase tracking-widest block">Presupuesto / Cotización</span>
              <p class="font-mono text-xl font-black text-slate-900">{{ quote().quoteNumber }}</p>
              <div class="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <div>Fecha Emisión: <strong class="text-slate-800">{{ quote().date }}</strong></div>
                <div>Válido Hasta: <strong class="text-slate-800">{{ quote().expirationDate }}</strong></div>
                <div>Estado: <strong class="uppercase text-violet-700">{{ quote().status.replace(/_/g, ' ') }}</strong></div>
              </div>
            </div>
          </div>

          <!-- Customer Info & BCV Rate Banner -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="space-y-1">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Datos del Cliente / Receptor</span>
              <p class="font-bold text-slate-900 text-sm">{{ quote().customerName }}</p>
              <p class="font-mono text-slate-700 font-semibold">RIF/CI: {{ quote().customerTaxId }}</p>
              @if (customer(); as cust) {
                @if (cust.address) { <p class="text-slate-600">{{ cust.address }}</p> }
                @if (cust.phone || cust.email) { <p class="text-slate-500">{{ cust.phone }} {{ cust.email ? '• ' + cust.email : '' }}</p> }
              }
            </div>

            <div class="sm:text-right space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condiciones Comerciales</span>
              <p class="text-slate-700">Moneda Base: <strong class="text-slate-900 font-bold">Dólares Americanos (USD)</strong></p>
              <p class="text-slate-700">Tasa Oficial BCV: <strong class="font-mono font-bold text-slate-900">Bs. {{ (quote().bcvRate || stateService.bcvState().usdRate).toFixed(2) }}</strong></p>
              <p class="text-slate-700">Nivel de Precio: <strong class="font-mono uppercase text-violet-700">{{ quote().priceLevelApplied || 'price1' }}</strong></p>
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
                    <td class="py-2 px-3 font-medium text-slate-900">{{ item.productName }}</td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-slate-800">{{ item.quantity }} {{ item.unit || 'UND' }}</td>
                    <td class="py-2 px-3 text-right font-mono text-slate-700">\${{ (item.unitPrice || 0).toFixed(2) }}</td>
                    <td class="py-2 px-3 text-right font-mono text-slate-500">
                      {{ item.isTaxExempt ? 'E (0%)' : '16%' }}
                    </td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">\${{ (item.total || 0).toFixed(2) }}</td>
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
            </div>

            <div class="w-full sm:w-72 p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <div class="flex justify-between text-slate-300">
                <span>Subtotal Neto:</span>
                <span class="font-mono">\${{ (quote().subtotal || 0).toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>IVA Estimado (16%):</span>
                <span class="font-mono">\${{ (quote().taxTotal || 0).toFixed(2) }}</span>
              </div>
              <div class="pt-2 border-t border-slate-700 space-y-1">
                <div class="flex justify-between items-baseline">
                  <span class="font-bold text-slate-200">TOTAL (USD):</span>
                  <span class="font-mono font-black text-lg text-emerald-400">\${{ quote().total.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between items-baseline text-[11px]">
                  <span class="text-slate-400">TOTAL ESTIMADO BS:</span>
                  <span class="font-mono font-bold text-slate-200">
                    Bs. {{ (quote().totalVes || (quote().total * (quote().bcvRate || stateService.bcvState().usdRate))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
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
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer">
            Cerrar
          </button>

          <div class="flex items-center space-x-2">
            <button 
              type="button"
              (click)="printDoc()" 
              class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer">
              <mat-icon class="text-sm">print</mat-icon>
              <span>Imprimir Documento / PDF</span>
            </button>
          </div>
        </div>

      </div>
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
  company = computed(() => this.stateService.companyProfile());
  customer = computed(() => this.stateService.customers().find(c => c.id === this.quote().customerId || c.taxId === this.quote().customerTaxId));

  printDoc() {
    window.print();
  }
}
