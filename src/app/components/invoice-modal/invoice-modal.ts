import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Invoice } from '../../models/erp.models';

@Component({
  selector: 'app-invoice-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (invoice(); as inv) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <!-- Actions Bar -->
          <div class="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
            <div class="flex items-center space-x-2">
              <mat-icon class="text-emerald-400">check_circle</mat-icon>
              <span class="text-sm font-semibold">Comprobante Fiscal Digital Multimoneda</span>
            </div>
            <div class="flex items-center space-x-2">
              <button (click)="printInvoice()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                <mat-icon class="text-sm">print</mat-icon>
                <span>Imprimir / PDF</span>
              </button>
              <button (click)="closeModal.emit()" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Printable Document Container -->
          <div class="p-8 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm print:p-0 print:m-0" id="printable-invoice">
            
            <!-- Document Header -->
            <div class="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-base">
                    N
                  </div>
                  <span class="font-bold text-lg text-slate-900 tracking-tight">NexusERP Corp</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">RIF: J-50493821-4 • Providencia Administrativa SENIAT</p>
                <p class="text-xs text-slate-500">Av. Francisco de Miranda, Centro Financiero Torre Alpha, Piso 8</p>
                <p class="text-xs text-slate-500">facturacion&#64;nexuserp.com • +58 212 500-8800</p>
              </div>

              <div class="text-right border border-slate-200 bg-slate-50/80 p-3 rounded-xl min-w-[210px]">
                <div class="flex justify-end space-x-1.5 mb-1">
                  <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 text-white uppercase tracking-wider">
                    {{ inv.type.replace('_', ' ') }}
                  </span>
                  @if (inv.priceLevelApplied) {
                    <span class="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800 uppercase font-mono">
                      {{ inv.priceLevelApplied }}
                    </span>
                  }
                </div>
                <p class="font-mono text-base font-bold text-slate-900">{{ inv.invoiceNumber }}</p>
                <p class="text-[11px] text-slate-500">Fecha de Emisión: {{ inv.date }}</p>
                @if (inv.quoteOriginNumber) {
                  <p class="text-[11px] text-emerald-700 font-medium mt-0.5">Ref. Cotización: {{ inv.quoteOriginNumber }}</p>
                }
              </div>
            </div>

            <!-- Client Info Grid & Exchange Rate Stamp -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span class="font-bold text-slate-400 uppercase tracking-wider block text-[10px] mb-0.5">Receptor / Cliente</span>
                <p class="font-semibold text-slate-900 text-sm">{{ inv.customerName }}</p>
                <p class="text-slate-600 font-mono">RIF / CI: {{ inv.customerTaxId }}</p>
              </div>

              <div>
                <span class="font-bold text-slate-400 uppercase tracking-wider block text-[10px] mb-0.5">Emisor & Despacho</span>
                <p class="text-slate-700">Vendedor: <span class="font-medium text-slate-900">{{ inv.sellerName }}</span></p>
                <p class="text-slate-700">Condición: <span class="text-emerald-700 font-bold">EMITIDA / PAGADA</span></p>
              </div>

              <div class="border-l-0 sm:border-l sm:border-slate-200 sm:pl-3">
                <span class="font-bold text-slate-400 uppercase tracking-wider block text-[10px] mb-0.5">Tipo de Cambio Oficial</span>
                <p class="font-mono font-bold text-slate-800">
                  Tasa BCV: Bs. {{ (inv.bcvRate || 36.54).toFixed(2) }} / USD
                </p>
                <p class="text-[10px] text-slate-500">
                  Origen: {{ inv.rateOrigin === 'API_BCV' ? 'Oficial BCV' : 'Manual' }} • Base: {{ inv.paymentCurrency || 'USD' }}
                </p>
              </div>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b-2 border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                  <th class="py-2">SKU</th>
                  <th class="py-2">Descripción</th>
                  <th class="py-2 text-center">Cant.</th>
                  <th class="py-2 text-right">P. Unit ($)</th>
                  <th class="py-2 text-center">Alícuota</th>
                  <th class="py-2 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of inv.items; track item.productId) {
                  <tr>
                    <td class="py-2 font-mono text-slate-500 text-[11px]">{{ item.sku }}</td>
                    <td class="py-2 font-medium text-slate-900">
                      {{ item.productName }}
                      @if (item.discountPercent > 0) {
                        <span class="text-[10px] text-emerald-600 font-mono ml-1">(-{{ item.discountPercent }}%)</span>
                      }
                    </td>
                    <td class="py-2 text-center">{{ item.quantity }} {{ item.unit }}</td>
                    <td class="py-2 text-right font-mono">\${{ item.unitPrice.toFixed(2) }}</td>
                    <td class="py-2 text-center">
                      @if (item.isTaxExempt || item.taxRate === 0) {
                        <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          (E) Exento
                        </span>
                      } @else {
                        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                          (G) {{ ((item.taxRate || 0.16) * 100).toFixed(0) }}%
                        </span>
                      }
                    </td>
                    <td class="py-2 text-right font-mono font-medium text-slate-900">\${{ item.subtotal.toFixed(2) }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <!-- Tax Breakdown, Payment & Mathematical Multimoneda Totals -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
              
              <!-- Payment methods used & IGTF declaration -->
              <div class="space-y-2.5">
                <div>
                  <span class="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Formas de Pago Registradas:
                  </span>
                  @for (pay of inv.payments; track pay.method) {
                    <div class="flex items-center space-x-2 text-xs py-0.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span class="font-medium text-slate-800">{{ pay.method.replace('_', ' ') }}:</span>
                      <span class="font-mono font-bold text-slate-900">
                        {{ pay.currency === 'VES' ? 'Bs. ' : '$' }}{{ pay.amount.toFixed(2) }}
                      </span>
                      @if (pay.reference) {
                        <span class="text-slate-400 text-[10px]">({{ pay.reference }})</span>
                      }
                    </div>
                  }
                </div>

                @if (inv.taxDetails.appliesIgtf) {
                  <div class="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                    <p class="font-bold flex items-center space-x-1">
                      <mat-icon class="text-sm text-amber-600">account_balance</mat-icon>
                      <span>Aplicación IGTF Ley Vigente (3.00%)</span>
                    </p>
                    <p class="text-[10px] text-amber-800">
                      Base IGTF: \${{ inv.taxDetails.igtfBase.toFixed(2) }} • Monto Impuesto: \${{ inv.taxDetails.igtfAmount.toFixed(2) }}
                    </p>
                  </div>
                }
              </div>

              <!-- Itemized Tax Breakdown and Multi-Currency Conversion Box -->
              <div class="space-y-1.5 text-xs text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div class="flex justify-between text-slate-600">
                  <span>Base Imponible Gravada:</span>
                  <span class="font-mono font-medium">\${{ (inv.taxDetails.taxableBase || inv.subtotal).toFixed(2) }}</span>
                </div>
                
                @if (inv.taxDetails.exemptBase > 0) {
                  <div class="flex justify-between text-emerald-700 font-medium">
                    <span>Base Exenta (0% IVA):</span>
                    <span class="font-mono">\${{ inv.taxDetails.exemptBase.toFixed(2) }}</span>
                  </div>
                }

                @if (inv.discountTotal > 0) {
                  <div class="flex justify-between text-indigo-600 font-medium">
                    <span>Descuento Total:</span>
                    <span class="font-mono">-\${{ inv.discountTotal.toFixed(2) }}</span>
                  </div>
                }

                <div class="flex justify-between text-slate-600">
                  <span>IVA ({{ inv.taxDetails.ivaPercent || 16 }}%):</span>
                  <span class="font-mono font-medium">\${{ (inv.taxDetails.ivaAmount || (inv.taxTotal - (inv.taxDetails.igtfAmount || 0))).toFixed(2) }}</span>
                </div>

                @if (inv.taxDetails.appliesIgtf) {
                  <div class="flex justify-between text-amber-700 font-medium">
                    <span>IGTF (3% Divisas):</span>
                    <span class="font-mono">+\${{ inv.taxDetails.igtfAmount.toFixed(2) }}</span>
                  </div>
                }

                <!-- Grand Total USD -->
                <div class="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>TOTAL FACTURA ($ USD):</span>
                  <span class="font-mono text-base text-emerald-700">\${{ inv.total.toFixed(2) }}</span>
                </div>

                <!-- Grand Total Bolívares -->
                <div class="flex justify-between text-xs font-bold text-slate-800">
                  <span>TOTAL EN BOLÍVARES (VES):</span>
                  <span class="font-mono text-indigo-700">
                    Bs. {{ (inv.totalVes || (inv.total * (inv.bcvRate || 36.54))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </span>
                </div>

                <!-- Grand Total Euros -->
                @if (inv.totalEur) {
                  <div class="flex justify-between text-[11px] text-slate-500">
                    <span>Equivalente Euros (EUR):</span>
                    <span class="font-mono">€ {{ inv.totalEur.toFixed(2) }}</span>
                  </div>
                }
              </div>

            </div>

            <!-- Digital Seal Simulation -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3 text-[10px] text-slate-500">
              <div class="w-12 h-12 bg-white border border-slate-300 rounded flex items-center justify-center shrink-0">
                <mat-icon class="text-slate-400 text-2xl">qr_code_2</mat-icon>
              </div>
              <div class="overflow-hidden">
                <p class="font-semibold text-slate-700">Timbre Fiscal Digital Oficial (SENIAT / Facturación Electrónica)</p>
                <p class="font-mono truncate text-slate-400">{{ inv.digitalSeal }}</p>
                <p>Documento tributario electrónico certificado con trazabilidad y tipo de cambio BCV oficial.</p>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end no-print">
            <button (click)="closeModal.emit()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer">
              Cerrar Comprobante
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class InvoiceModal {
  invoice = input<Invoice | null>(null);
  closeModal = output<void>();

  printInvoice() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
