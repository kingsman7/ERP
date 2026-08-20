import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Quote, PriceLevelKey } from '../../models/erp.models';

@Component({
  selector: 'app-quotes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
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
              Emisión de propuestas con esquema de 5 precios, multimoneda y conversión a 1-clic en factura fiscal
            </p>
          </div>
        </div>

        <button 
          (click)="showNewQuoteModal.set(true)"
          class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
          <mat-icon class="text-base">add</mat-icon>
          <span>Nuevo Presupuesto</span>
        </button>
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
                  <span class="font-mono font-bold text-base text-slate-900">{{ q.quoteNumber }}</span>
                  <p class="text-xs text-slate-500">Emitido: {{ q.date.substring(0, 10) }} • Vence: {{ q.expirationDate }}</p>
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
                <span class="text-slate-400 font-medium uppercase text-[10px]">Cliente</span>
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

            <!-- Bottom: Total & Conversion Action -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-400 block uppercase">Total Cotizado</span>
                <div class="flex items-baseline space-x-1.5">
                  <span class="font-mono font-bold text-lg text-slate-900">\${{ q.total.toFixed(2) }}</span>
                  <span class="font-mono text-xs text-slate-500">
                    (Bs. {{ (q.totalVes || (q.total * bcvRate)).toLocaleString('es-VE', { maximumFractionDigits: 2 }) }})
                  </span>
                </div>
              </div>

              @if (q.status === 'CONVERTIDO_A_FACTURA') {
                <div class="text-right">
                  <span class="px-2 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                    Factura: {{ q.convertedInvoiceNumber }}
                  </span>
                </div>
              } @else {
                <button 
                  (click)="convertQuote(q.id)"
                  class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
                  <mat-icon class="text-sm">sync_alt</mat-icon>
                  <span>Convertir a Factura Fiscal</span>
                </button>
              }
            </div>

          </div>
        } @empty {
          <div class="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No existen presupuestos registrados en el sistema.
          </div>
        }
      </div>

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
                  <span class="block font-semibold text-slate-700 mb-1">Cliente *</span>
                  <select 
                    [value]="selectedCustomerId()"
                    (change)="selectedCustomerId.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    @for (cust of stateService.customers(); track cust.id) {
                      <option [value]="cust.id">{{ cust.name }} ({{ cust.taxId }})</option>
                    }
                  </select>
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

    </div>
  `
})
export class QuotesComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);

  showNewQuoteModal = signal<boolean>(false);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_QUOTE') {
        this.showNewQuoteModal.set(true);
      }
    });
  }

  selectedCustomerId = signal<string>(this.stateService.customers()[0]?.id || '');
  selectedPriceLevel = signal<PriceLevelKey>('price1');
  quoteItems = signal<{ productId: string; quantity: number; discountPercent: number }[]>([]);

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

  convertQuote(quoteId: string) {
    this.stateService.convertQuoteToInvoice(quoteId);
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
}
