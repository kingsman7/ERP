import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cash-closing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <span class="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <mat-icon>payments</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Cierre de Turno de Caja & Cuadre Financiero (Z-Report)
            </h1>
            <p class="text-xs text-slate-500">
              Arqueo de fondos por método de pago, auditoría de efectivo y reporte diario
            </p>
          </div>
        </div>

        @if (stateService.activeCashSession().status === 'CERRADA') {
          <button 
            (click)="showOpenSessionModal.set(true)"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors">
            <mat-icon class="text-base">lock_open</mat-icon>
            <span>Abrir Nuevo Turno de Caja</span>
          </button>
        }
      </div>

      <!-- Current Session Dashboard Card -->
      @let sess = stateService.activeCashSession();
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        
        <!-- Status Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-mono font-bold text-lg text-slate-900">{{ sess.sessionCode }}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                [class]="sess.status === 'ABIERTA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'">
                {{ sess.status }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Cajero a cargo: <strong class="text-slate-800">{{ sess.cashierName }}</strong> • Apertura: {{ sess.openDate }}</p>
          </div>

          <div class="text-right">
            <span class="text-xs text-slate-400 block">Monto Inicial de Fondo:</span>
            <span class="font-mono font-bold text-base text-slate-900">\${{ sess.initialAmount.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Breakdown by Payment Method Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <!-- Cash Card -->
          <div class="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
            <div class="flex items-center justify-between text-emerald-900 font-semibold">
              <span>Efectivo en Caja</span>
              <mat-icon class="text-emerald-600 text-base">attach_money</mat-icon>
            </div>
            <p class="font-mono font-bold text-xl text-slate-900">\${{ sess.totalCashSales.toFixed(2) }}</p>
            <p class="text-[11px] text-slate-500">Ventas netas en efectivo</p>
          </div>

          <!-- Cards Card -->
          <div class="p-4 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1">
            <div class="flex items-center justify-between text-sky-900 font-semibold">
              <span>Tarjetas Débito/Crédito</span>
              <mat-icon class="text-sky-600 text-base">credit_card</mat-icon>
            </div>
            <p class="font-mono font-bold text-xl text-slate-900">\${{ sess.totalCardSales.toFixed(2) }}</p>
            <p class="text-[11px] text-slate-500">Vouchers autorizados</p>
          </div>

          <!-- Transfers Card -->
          <div class="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
            <div class="flex items-center justify-between text-indigo-900 font-semibold">
              <span>Transferencias Bancarias</span>
              <mat-icon class="text-indigo-600 text-base">account_balance</mat-icon>
            </div>
            <p class="font-mono font-bold text-xl text-slate-900">\${{ sess.totalTransferSales.toFixed(2) }}</p>
            <p class="text-[11px] text-slate-500">Comprobantes SPEI/Bancarizados</p>
          </div>

          <!-- Total Sales in Session -->
          <div class="p-4 rounded-xl bg-slate-900 text-white space-y-1">
            <div class="flex items-center justify-between text-slate-300 font-semibold">
              <span>TOTAL RECAUDADO</span>
              <mat-icon class="text-emerald-400 text-base">savings</mat-icon>
            </div>
            <p class="font-mono font-bold text-xl text-emerald-400">\${{ sess.totalSales.toFixed(2) }}</p>
            <p class="text-[11px] text-slate-400">Total facturado en turno</p>
          </div>

        </div>

        <!-- Reconciliation / Cash Count Action Section -->
        @if (sess.status === 'ABIERTA') {
          <div class="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div class="flex items-center space-x-2">
              <mat-icon class="text-indigo-600">balance</mat-icon>
              <h3 class="font-semibold text-sm text-slate-900">Arqueo de Efectivo Físico para Cierre</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div class="p-3 bg-white rounded-lg border border-slate-200">
                <span class="text-slate-500 block">Efectivo Físico Esperado:</span>
                <span class="text-slate-400 text-[10px]">(Fondo Inicial + Ventas Efectivo)</span>
                <p class="font-mono font-bold text-base text-slate-900 mt-1">
                  \${{ (sess.initialAmount + sess.totalCashSales).toFixed(2) }}
                </p>
              </div>

              <div>
                <span class="block font-semibold text-slate-700 mb-1">Efectivo Contado en Gaveta ($) *</span>
                <input 
                  type="number" 
                  [value]="countedCashInput()"
                  (input)="countedCashInput.set(+$any($event.target).value)"
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20" />
              </div>

              <div class="p-3 rounded-lg border"
                [class]="calculatedDifference() === 0 ? 'bg-emerald-50 border-emerald-200' : (calculatedDifference() > 0 ? 'bg-sky-50 border-sky-200' : 'bg-rose-50 border-rose-200')">
                <span class="text-slate-600 font-medium block">Diferencia de Caja:</span>
                <p class="font-mono font-bold text-base mt-1"
                  [class]="calculatedDifference() >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ calculatedDifference() >= 0 ? '+' : '' }}\${{ calculatedDifference().toFixed(2) }}
                  <span class="text-xs font-sans font-normal ml-1">
                    ({{ calculatedDifference() === 0 ? 'Cuadre Perfecto' : (calculatedDifference() > 0 ? 'Sobrante' : 'Faltante') }})
                  </span>
                </p>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button 
                (click)="closeShift()"
                class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors">
                <mat-icon class="text-sm">lock</mat-icon>
                <span>CERRAR TURNO & GENERAR REPORTE Z</span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Closed Shift Summary -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <p class="font-semibold text-slate-900">Turno Cerrado el {{ sess.closeDate }}</p>
              <p class="text-slate-500">Diferencia registrada: \${{ (sess.cashDifference || 0).toFixed(2) }}</p>
            </div>
            <button (click)="printZReport()" class="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-medium flex items-center space-x-1">
              <mat-icon class="text-xs">print</mat-icon>
              <span>Imprimir Reporte Z</span>
            </button>
          </div>
        }

      </div>

      <!-- Historical Closures Log -->
      @if (stateService.cashSessionHistory().length > 0) {
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 class="font-semibold text-sm text-slate-900">Historial de Turnos Cerrados</h3>
          <div class="divide-y divide-slate-100 text-xs">
            @for (h of stateService.cashSessionHistory(); track h.id) {
              <div class="py-2.5 flex items-center justify-between">
                <div>
                  <span class="font-mono font-bold text-slate-900">{{ h.sessionCode }}</span>
                  <span class="text-slate-400 ml-2">{{ h.openDate }} a {{ h.closeDate }}</span>
                </div>
                <div class="flex items-center space-x-4">
                  <span class="font-mono font-semibold text-slate-900">Ventas: \${{ h.totalSales.toFixed(2) }}</span>
                  <span class="font-mono font-medium" [class]="(h.cashDifference || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                    Dif: \${{ (h.cashDifference || 0).toFixed(2) }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Open Session Modal -->
      @if (showOpenSessionModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs animate-in fade-in zoom-in-95">
            <h3 class="font-bold text-sm text-slate-900">Apertura de Nuevo Turno de Caja</h3>
            <p class="text-slate-500">Ingrese el fondo inicial asignado al cajero en efectivo:</p>
            <div>
              <span class="block font-semibold text-slate-700 mb-1">Monto Inicial en Efectivo ($):</span>
              <input #initialInput type="number" value="150.00" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold" />
            </div>
            <div class="flex justify-end space-x-2 pt-2">
              <button (click)="showOpenSessionModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium">Cancelar</button>
              <button (click)="confirmOpenSession(+initialInput.value)" class="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-xs">Iniciar Turno</button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class CashClosingComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  showOpenSessionModal = signal<boolean>(false);
  countedCashInput = signal<number>(470.00);

  calculatedDifference = computed(() => {
    const sess = this.stateService.activeCashSession();
    const expected = sess.initialAmount + sess.totalCashSales;
    return Number((this.countedCashInput() - expected).toFixed(2));
  });

  closeShift() {
    this.stateService.closeCashSession(this.countedCashInput(), 'Arqueo de cierre de jornada habitual');
  }

  confirmOpenSession(initialAmount: number) {
    this.stateService.reopenCashSession(initialAmount || 100);
    this.showOpenSessionModal.set(false);
  }

  printZReport() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
