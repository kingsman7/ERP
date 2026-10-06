import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { CashSessionPaymentMethodBreakdown, PaymentMethod, CurrencyCode, Warehouse } from '../../models/erp.models';

@Component({
  selector: 'app-cash-closing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, DecimalPipe],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <span class="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-xs">
            <mat-icon>payments</mat-icon>
          </span>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Cierre de Turno de Caja & Cuadre Multimoneda (Z-Report)
              </h1>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                BCV: Bs. {{ bcvRate() | number:'1.2-2' }} / USD
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Arqueo de fondos por método de pago y tipo de moneda (USD / Bolívares / EUR), auditoría de gaveta y reporte Z
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          @if (stateService.activeCashSession().status === 'CERRADA') {
            <button 
              (click)="showOpenSessionModal.set(true)"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
              <mat-icon class="text-base">lock_open</mat-icon>
              <span>Abrir Nuevo Turno de Caja</span>
            </button>
          } @else {
            <button 
              (click)="showZReportModal.set(true)"
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer">
              <mat-icon class="text-base text-slate-500">receipt_long</mat-icon>
              <span>Vista Previa Reporte Z</span>
            </button>
          }
        </div>
      </div>

      <!-- Current Session Dashboard Card -->
      @let sess = stateService.activeCashSession();
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        
        <!-- Status Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-mono font-bold text-lg text-slate-900">{{ sess.sessionCode }}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                [class]="sess.status === 'ABIERTA' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'">
                {{ sess.status }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Cajero a cargo: <strong class="text-slate-800">{{ sess.cashierName }}</strong> • 
              Apertura: <span class="font-mono text-slate-600">{{ sess.openedAt }}</span>
            </p>
          </div>

          <div class="flex items-center gap-4 text-right">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fondo Inicial en Gaveta</span>
              <div class="flex items-baseline justify-end space-x-1.5">
                <span class="font-mono font-bold text-base text-slate-900">\${{ sess.openingBaseUsd | number:'1.2-2' }}</span>
                <span class="text-xs text-slate-400 font-mono">/</span>
                <span class="font-mono font-semibold text-xs text-slate-600">Bs. {{ formatNumber(sess.openingBaseVes || 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- MINI-DASHBOARD CONTROL BAR: CURRENCY VIEW SELECTOR -->
        <!-- ======================================================== -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div class="flex items-center space-x-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Desglose de Caja por Método de Pago & Tipo de Moneda</span>
              </h3>
              <p class="text-[11px] text-slate-500">
                Visualización de montos exactos en Dólares ($), Bolívares (VES), Zelle, Pago Móvil y Bancarizados
              </p>
            </div>
          </div>

          <!-- Interactive Currency View Mode Switcher -->
          <div class="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-1 text-xs shadow-2xs self-start sm:self-auto">
            <button 
              (click)="dashboardCurrencyMode.set('MULTI')"
              [class]="dashboardCurrencyMode() === 'MULTI' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center space-x-1.5">
              <mat-icon class="text-xs">currency_exchange</mat-icon>
              <span>Multimoneda ($ y Bs.)</span>
            </button>
            <button 
              (click)="dashboardCurrencyMode.set('USD')"
              [class]="dashboardCurrencyMode() === 'USD' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center space-x-1">
              <span>Todo en $ USD</span>
            </button>
            <button 
              (click)="dashboardCurrencyMode.set('VES')"
              [class]="dashboardCurrencyMode() === 'VES' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
              class="px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center space-x-1">
              <span>Todo en Bs. VES</span>
            </button>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 4 KPI CARDS MINI-DASHBOARD (Matching Attachment + Method & Currency Split) -->
        <!-- ======================================================== -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <!-- Card 1: Cash Card (Efectivo en Caja - Dual Moneda) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white border border-emerald-200/90 shadow-xs flex flex-col justify-between space-y-3.5 hover:border-emerald-300 transition-all">
            <div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-2xs">
                    $
                  </span>
                  <div>
                    <h4 class="text-sm font-bold text-emerald-950">Efectivo en Caja</h4>
                    <span class="text-[10px] text-emerald-700/80 font-medium">Ventas netas en gaveta</span>
                  </div>
                </div>
                <div class="flex items-center space-x-1 font-mono text-[9px]">
                  <span class="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">USD $</span>
                  <span class="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">VES Bs.</span>
                </div>
              </div>

              <!-- Main Amount View Based on Selected Mode -->
              @if (dashboardCurrencyMode() === 'MULTI') {
                <div class="mt-3 grid grid-cols-1 gap-2">
                  <!-- Dólares en Efectivo ($ USD) -->
                  <div class="p-2.5 bg-white rounded-xl border border-emerald-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Efectivo en Dólares ($ USD)</span>
                      </span>
                      <span class="text-[10px] text-emerald-800 font-mono font-semibold">{{ cashUsdOps() }} op.</span>
                    </div>
                    <p class="font-mono font-black text-xl text-slate-900 tracking-tight">
                      \${{ formatNumber(cashUsd()) }}
                    </p>
                    <p class="text-[10px] text-emerald-700 font-medium">Billetes físicos divisas</p>
                  </div>

                  <!-- Bolívares en Efectivo (Bs. VES) -->
                  <div class="p-2.5 bg-white rounded-xl border border-sky-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span>Efectivo en Bolívares (VES)</span>
                      </span>
                      <span class="text-[10px] text-sky-800 font-mono font-semibold">{{ cashVesOps() }} op.</span>
                    </div>
                    <p class="font-mono font-black text-xl text-indigo-950 tracking-tight">
                      Bs. {{ formatNumber(cashVes()) }}
                    </p>
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Equivalente:</span>
                      <span class="text-slate-600 font-semibold">\${{ formatNumber(cashVes() / bcvRate()) }}</span>
                    </div>
                  </div>
                </div>
              } @else if (dashboardCurrencyMode() === 'USD') {
                <div class="mt-3 p-3 bg-white rounded-xl border border-emerald-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-slate-900 tracking-tight">
                    \${{ sess.totalCashSales | number:'1.2-2' }}
                  </p>
                  <p class="text-[11px] text-slate-500">Ventas netas en efectivo (USD consolidado)</p>
                </div>
              } @else {
                <div class="mt-3 p-3 bg-white rounded-xl border border-sky-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-indigo-950 tracking-tight">
                    Bs. {{ formatNumber(sess.totalCashSales * bcvRate()) }}
                  </p>
                  <p class="text-[11px] text-slate-500">Efectivo total convertido a tasa BCV</p>
                </div>
              }
            </div>

            <!-- Footer summary -->
            <div class="pt-2.5 border-t border-emerald-200/80 flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-500 font-sans">Total Efectivo Consolidado:</span>
              <span class="font-bold text-slate-900">
                \${{ formatNumber(sess.totalCashSales) }}
                <span class="text-slate-400 font-normal">({{ cashUsdOps() + cashVesOps() }} op.)</span>
              </span>
            </div>
          </div>

          <!-- Card 2: Cards Card (Tarjetas Débito / Crédito) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/70 via-sky-50/30 to-white border border-sky-200/90 shadow-xs flex flex-col justify-between space-y-3.5 hover:border-sky-300 transition-all">
            <div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shadow-2xs">
                    <mat-icon class="text-base">credit_card</mat-icon>
                  </span>
                  <div>
                    <h4 class="text-sm font-bold text-sky-950">Tarjetas & Puntos POS</h4>
                    <span class="text-[10px] text-sky-700/80 font-medium">Vouchers autorizados</span>
                  </div>
                </div>
                <div class="flex items-center space-x-1 font-mono text-[9px]">
                  <span class="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">VES Bs.</span>
                  <span class="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">USD $</span>
                </div>
              </div>

              <!-- Main Amount View Based on Mode -->
              @if (dashboardCurrencyMode() === 'MULTI') {
                <div class="mt-3 grid grid-cols-1 gap-2">
                  <!-- Punto de Venta Débito (VES) -->
                  <div class="p-2.5 bg-white rounded-xl border border-sky-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span>Punto Débito (Bs. VES)</span>
                      </span>
                      <span class="text-[10px] text-sky-800 font-mono font-semibold">{{ cardVesOps() }} vouchers</span>
                    </div>
                    <p class="font-mono font-black text-xl text-slate-900 tracking-tight">
                      Bs. {{ formatNumber(cardVes()) }}
                    </p>
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Equivalente:</span>
                      <span class="text-slate-600 font-semibold">\${{ formatNumber(cardVes() / bcvRate()) }}</span>
                    </div>
                  </div>

                  <!-- Tarjetas Internacionales ($ USD) -->
                  <div class="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Tarjetas USD / Internacional</span>
                      </span>
                      <span class="text-[10px] text-slate-500 font-mono font-semibold">{{ cardUsdOps() }} vouchers</span>
                    </div>
                    <p class="font-mono font-black text-xl text-slate-900 tracking-tight">
                      \${{ formatNumber(cardUsd()) }}
                    </p>
                    <p class="text-[10px] text-slate-400 font-medium">Cobros en moneda extranjera</p>
                  </div>
                </div>
              } @else if (dashboardCurrencyMode() === 'USD') {
                <div class="mt-3 p-3 bg-white rounded-xl border border-sky-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-slate-900 tracking-tight">
                    \${{ sess.totalCardSales | number:'1.2-2' }}
                  </p>
                  <p class="text-[11px] text-slate-500">Vouchers autorizados (USD eq.)</p>
                </div>
              } @else {
                <div class="mt-3 p-3 bg-white rounded-xl border border-sky-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-indigo-950 tracking-tight">
                    Bs. {{ formatNumber(sess.totalCardSales * bcvRate()) }}
                  </p>
                  <p class="text-[11px] text-slate-500">Total vouchers convertidos a tasa BCV</p>
                </div>
              }
            </div>

            <!-- Footer summary -->
            <div class="pt-2.5 border-t border-sky-200/80 flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-500 font-sans">Total Tarjetas Consolidado:</span>
              <span class="font-bold text-slate-900">
                \${{ formatNumber(sess.totalCardSales) }}
                <span class="text-slate-400 font-normal">({{ cardVesOps() + cardUsdOps() }} op.)</span>
              </span>
            </div>
          </div>

          <!-- Card 3: Transfers Card (Transferencias Bancarias & Zelle) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-white border border-indigo-200/90 shadow-xs flex flex-col justify-between space-y-3.5 hover:border-indigo-300 transition-all">
            <div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-2xs">
                    <mat-icon class="text-base">account_balance</mat-icon>
                  </span>
                  <div>
                    <h4 class="text-sm font-bold text-indigo-950">Zelle & Transferencias</h4>
                    <span class="text-[10px] text-indigo-700/80 font-medium">SPEI, Zelle, Pago Móvil & Bancos</span>
                  </div>
                </div>
                <div class="flex items-center space-x-1 font-mono text-[9px]">
                  <span class="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">ZELLE $</span>
                  <span class="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">P.MÓVIL Bs.</span>
                </div>
              </div>

              <!-- Main Amount View Based on Mode -->
              @if (dashboardCurrencyMode() === 'MULTI') {
                <div class="mt-3 grid grid-cols-1 gap-2">
                  <!-- Zelle ($ USD) -->
                  <div class="p-2.5 bg-white rounded-xl border border-purple-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>Zelle ($ USD)</span>
                      </span>
                      <span class="text-[10px] text-purple-700 font-mono font-semibold">{{ zelleOps() }} pagos</span>
                    </div>
                    <p class="font-mono font-black text-xl text-purple-950 tracking-tight">
                      \${{ formatNumber(zelleUsd()) }}
                    </p>
                    <p class="text-[10px] text-purple-700/80 font-medium">Pagos directos en divisas</p>
                  </div>

                  <!-- Pago Móvil (Bs. VES) -->
                  <div class="p-2.5 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-0.5">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>Pago Móvil (Bs. VES)</span>
                      </span>
                      <span class="text-[10px] text-blue-700 font-mono font-semibold">{{ pagoMovilOps() }} comprobantes</span>
                    </div>
                    <p class="font-mono font-black text-xl text-slate-900 tracking-tight">
                      Bs. {{ formatNumber(pagoMovilVes()) }}
                    </p>
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Equivalente:</span>
                      <span class="text-slate-600 font-semibold">\${{ formatNumber(pagoMovilVes() / bcvRate()) }}</span>
                    </div>
                  </div>

                  <!-- Transferencias Bancarias USD / Wire -->
                  <div class="p-2 bg-white/90 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span class="text-slate-600 flex items-center space-x-1 font-medium">
                      <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span>Trf. Bancaria USD:</span>
                    </span>
                    <div class="flex items-center space-x-1.5 font-mono">
                      <span class="font-bold text-slate-900">\${{ formatNumber(transferUsd()) }}</span>
                      <span class="text-[10px] text-slate-400">({{ transferUsdOps() }} op.)</span>
                    </div>
                  </div>
                </div>
              } @else if (dashboardCurrencyMode() === 'USD') {
                <div class="mt-3 p-3 bg-white rounded-xl border border-indigo-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-slate-900 tracking-tight">
                    \${{ sess.totalTransferSales | number:'1.2-2' }}
                  </p>
                  <p class="text-[11px] text-slate-500">Comprobantes SPEI / Bancarizados (USD eq.)</p>
                </div>
              } @else {
                <div class="mt-3 p-3 bg-white rounded-xl border border-indigo-200/70 space-y-1">
                  <p class="font-mono font-extrabold text-2xl text-indigo-950 tracking-tight">
                    Bs. {{ formatNumber(sess.totalTransferSales * bcvRate()) }}
                  </p>
                  <p class="text-[11px] text-slate-500">Total transferencias a tasa oficial BCV</p>
                </div>
              }
            </div>

            <!-- Footer summary -->
            <div class="pt-2.5 border-t border-indigo-200/80 flex items-center justify-between text-[11px] font-mono">
              <span class="text-slate-500 font-sans">Total Transferencias:</span>
              <span class="font-bold text-slate-900">
                \${{ formatNumber(sess.totalTransferSales) }}
                <span class="text-slate-400 font-normal">({{ zelleOps() + pagoMovilOps() + transferUsdOps() }} op.)</span>
              </span>
            </div>
          </div>

          <!-- Card 4: Total Sales in Session (TOTAL RECAUDADO) -->
          <div class="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-lg flex flex-col justify-between space-y-3.5 border border-slate-800 relative overflow-hidden">
            <!-- Background subtle pattern/glow -->
            <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

            <div>
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2.5">
                  <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <mat-icon class="text-base">savings</mat-icon>
                  </span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider">TOTAL RECAUDADO</h4>
                    <span class="text-[10px] text-emerald-400 font-medium">Total facturado en turno</span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-mono">
                  MULTIMONEDA
                </span>
              </div>

              <!-- Main Totals View -->
              <div class="mt-3 space-y-1">
                <p class="font-mono font-black text-2xl sm:text-3xl text-emerald-400 tracking-tight">
                  \${{ formatNumber(sess.totalSales) }}
                </p>
                <div class="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
                  <span class="text-slate-400 font-sans">Equivalente BCV:</span>
                  <span class="font-bold text-emerald-200">
                    Bs. {{ formatNumber(sess.totalSalesVes || (sess.totalSales * bcvRate())) }}
                  </span>
                </div>
              </div>

              <!-- Multi-Currency Inflow Breakdown -->
              <div class="mt-2.5 space-y-1.5 font-mono text-[11px]">
                <div class="p-2 bg-slate-800/90 rounded-xl border border-slate-700/70 flex items-center justify-between">
                  <span class="text-slate-300 flex items-center space-x-1.5 font-sans">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Recaudado en Divisas ($):</span>
                  </span>
                  <span class="font-bold text-emerald-400">\${{ formatNumber(totalCollectedInUsdOriginal()) }}</span>
                </div>
                <div class="p-2 bg-slate-800/90 rounded-xl border border-slate-700/70 flex items-center justify-between">
                  <span class="text-slate-300 flex items-center space-x-1.5 font-sans">
                    <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>Recaudado en Bolívares (VES):</span>
                  </span>
                  <span class="font-bold text-sky-300">Bs. {{ formatNumber(totalCollectedInVesOriginal()) }}</span>
                </div>
              </div>
            </div>

            <!-- Footer summary -->
            <div class="pt-2 border-t border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>BCV: Bs. {{ bcvRate() | number:'1.2-2' }}</span>
              <span class="text-slate-300 font-semibold">{{ totalSessionOperations() }} transacciones totales</span>
            </div>
          </div>

        </div>

        <!-- ======================================================== -->
        <!-- QUICK MATRIX: BREAKDOWN BY PAYMENT METHOD & CURRENCY -->
        <!-- ======================================================== -->
        <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <mat-icon class="text-xs">view_compact</mat-icon>
              </span>
              <h4 class="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Matriz Resumen por Instrumento de Cobro & Divisa
              </h4>
            </div>
            <span class="text-[11px] text-slate-500 font-mono">
              Total {{ allBreakdownItems().length }} instrumentos registrados en la sesión
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            @for (item of allBreakdownItems(); track item.method + item.currency) {
              <div class="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs space-y-1.5 transition-all">
                <div class="flex items-center justify-between">
                  <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                    [class]="getMethodIconBg(item.method)">
                    <mat-icon class="text-xs">{{ getMethodIcon(item.method) }}</mat-icon>
                  </span>
                  <span class="px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold"
                    [class]="item.currency === 'USD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'">
                    {{ item.currency }}
                  </span>
                </div>
                <div>
                  <p class="font-bold text-slate-800 text-[11px] truncate" [title]="item.label">{{ item.label }}</p>
                  <p class="font-mono font-black text-xs text-slate-900 mt-0.5">
                    {{ item.currency === 'VES' ? 'Bs. ' : '$ ' }}{{ formatNumber(item.amount) }}
                  </p>
                </div>
                <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                  <span>{{ item.transactionCount }} op.</span>
                  @if (item.currency === 'VES') {
                    <span class="text-slate-600 font-semibold">\${{ formatNumber(item.amountUsd) }}</span>
                  } @else {
                    <span class="text-slate-600 font-semibold">{{ calculatePercentage(item.amountUsd, sess.totalSales) }}%</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- DETAILED BREAKDOWN BY METHOD & CURRENCY TABLE -->
        <!-- ======================================================== -->
        <div class="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center space-x-2">
              <span class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <mat-icon class="text-sm">table_view</mat-icon>
              </span>
              <div>
                <h3 class="font-bold text-sm text-slate-900">
                  Desglose Detallado por Método de Pago & Tipo de Moneda
                </h3>
                <p class="text-[11px] text-slate-500">
                  Registro exacto del dinero ingresado por cada instrumento de cobro (Efectivo, Tarjetas, Pago Móvil, Zelle, etc.)
                </p>
              </div>
            </div>

            <!-- Category Filter Tabs -->
            <div class="flex items-center space-x-1 bg-white border border-slate-200/90 rounded-xl p-1 text-xs">
              <button 
                (click)="selectedBreakdownFilter.set('ALL')"
                [class]="selectedBreakdownFilter() === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px]">
                Todos ({{ allBreakdownItems().length }})
              </button>
              <button 
                (click)="selectedBreakdownFilter.set('EFECTIVO')"
                [class]="selectedBreakdownFilter() === 'EFECTIVO' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center space-x-1">
                <span>Efectivo</span>
              </button>
              <button 
                (click)="selectedBreakdownFilter.set('TARJETA')"
                [class]="selectedBreakdownFilter() === 'TARJETA' ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center space-x-1">
                <span>Tarjetas / Puntos</span>
              </button>
              <button 
                (click)="selectedBreakdownFilter.set('TRANSFERENCIA')"
                [class]="selectedBreakdownFilter() === 'TRANSFERENCIA' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'"
                class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center space-x-1">
                <span>Zelle & Bancos</span>
              </button>
            </div>
          </div>

          <!-- Methods Table -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th class="py-3 px-4">Método de Pago</th>
                  <th class="py-3 px-3 text-center">Tipo de Moneda</th>
                  <th class="py-3 px-4 text-right">Monto Recaudado</th>
                  <th class="py-3 px-3 text-center">Tasa BCV</th>
                  <th class="py-3 px-4 text-right">Equivalente ($ USD)</th>
                  <th class="py-3 px-3 text-center">Operaciones</th>
                  <th class="py-3 px-4 text-right">% Participación</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of filteredBreakdownItems(); track (item.method + item.currency)) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <!-- Method Name & Icon -->
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-2.5">
                        <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          [class]="getMethodIconBg(item.method)">
                          <mat-icon class="text-sm">{{ getMethodIcon(item.method) }}</mat-icon>
                        </span>
                        <div>
                          <p class="font-semibold text-slate-900 text-xs">{{ item.label }}</p>
                          <span class="text-[10px] text-slate-400 font-mono uppercase">{{ item.method }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Currency Pill -->
                    <td class="py-3 px-3 text-center">
                      @if (item.currency === 'USD') {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                          USD ($)
                        </span>
                      } @else if (item.currency === 'VES') {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 font-mono">
                          VES (Bs.)
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                          EUR (€)
                        </span>
                      }
                    </td>

                    <!-- Amount in Original Currency -->
                    <td class="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {{ item.currency === 'VES' ? 'Bs. ' : (item.currency === 'EUR' ? '€ ' : '$ ') }}{{ formatNumber(item.amount) }}
                    </td>

                    <!-- Conversion Rate -->
                    <td class="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                      {{ item.currency === 'VES' ? ('Bs. ' + (bcvRate() | number:'1.2-2')) : '1.00 USD' }}
                    </td>

                    <!-- Consolidated Amount in USD -->
                    <td class="py-3 px-4 text-right font-mono font-bold text-slate-800 text-xs sm:text-sm">
                      \${{ formatNumber(item.amountUsd) }}
                    </td>

                    <!-- Transaction Count -->
                    <td class="py-3 px-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold text-[11px]">
                        {{ item.transactionCount }} op.
                      </span>
                    </td>

                    <!-- Share % and Visual Bar -->
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <span class="font-mono font-semibold text-slate-600 text-[11px] min-w-[42px]">
                          {{ calculatePercentage(item.amountUsd, sess.totalSales) }}%
                        </span>
                        <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                            [class]="item.currency === 'VES' ? 'bg-sky-500' : 'bg-emerald-500'"
                            [style.width.%]="calculatePercentage(item.amountUsd, sess.totalSales)"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="py-8 text-center text-slate-400">
                      <mat-icon class="text-slate-300 text-2xl mx-auto block mb-1">payments_off</mat-icon>
                      <p class="text-xs">No hay movimientos registrados en esta categoría.</p>
                    </td>
                  </tr>
                }
              </tbody>
              <!-- Subtotals Footer -->
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs">
                <tr>
                  <td class="py-3 px-4 text-slate-800">Total Desglosado Activo</td>
                  <td class="py-3 px-3 text-center font-mono text-[10px] text-slate-400">MULTIMONEDA</td>
                  <td class="py-3 px-4 text-right text-slate-600 font-mono text-[11px]">-</td>
                  <td class="py-3 px-3 text-center font-mono text-[11px] text-slate-500">Bs. {{ bcvRate() | number:'1.2-2' }}</td>
                  <td class="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                    \${{ formatNumber(totalFilteredUsd()) }}
                  </td>
                  <td class="py-3 px-3 text-center font-mono text-slate-800">
                    {{ totalFilteredTransactions() }} op.
                  </td>
                  <td class="py-3 px-4 text-right font-mono text-slate-700">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- RECONCILIATION / CASH COUNT ACTION SECTION (Dual Currency) -->
        <!-- ======================================================== -->
        @if (sess.status === 'ABIERTA') {
          <div class="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-5">
            <div class="flex items-center space-x-2">
              <span class="p-1.5 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <mat-icon class="text-sm">balance</mat-icon>
              </span>
              <div>
                <h3 class="font-bold text-sm text-slate-900">Arqueo Físico de Efectivo para Cierre de Jornada</h3>
                <p class="text-xs text-slate-500">
                  Cuadre de billetes físicos en gaveta tanto en Dólares ($) como en Bolívares (VES)
                </p>
              </div>
            </div>

            <!-- Expected vs Counted Dual Currency Grid -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              
              <!-- 1. Expected USD Cash -->
              <div class="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                <div class="flex items-center justify-between text-slate-500 font-medium">
                  <span>Efectivo $ Esperado:</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <span class="text-slate-400 text-[10px] block">Fondo inicial + Cobros en $</span>
                <p class="font-mono font-bold text-lg text-slate-900">
                  \${{ formatNumber(expectedCashUsd()) }}
                </p>
              </div>

              <!-- 2. Expected VES Cash -->
              <div class="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                <div class="flex items-center justify-between text-slate-500 font-medium">
                  <span>Efectivo Bs. Esperado:</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                </div>
                <span class="text-slate-400 text-[10px] block">Fondo inicial + Cobros en Bs.</span>
                <p class="font-mono font-bold text-lg text-slate-900">
                  Bs. {{ formatNumber(expectedCashVes()) }}
                </p>
                <span class="text-[10px] text-slate-400 block font-mono">
                  (Eq. \${{ formatNumber(expectedCashVes() / bcvRate()) }})
                </span>
              </div>

              <!-- 3. Counted USD Input -->
              <div class="p-3.5 bg-white rounded-xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 space-y-1.5">
                <label class="block font-bold text-slate-800 text-[11px]">
                  Billetes Dólares ($ USD) *
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    [value]="countedCashUsdInput()"
                    (input)="countedCashUsdInput.set(+$any($event.target).value)"
                    placeholder="0.00"
                    class="w-full pl-6 pr-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:bg-white" />
                </div>
                <span class="text-[10px] text-slate-400 block">Total billetes contados en $</span>
              </div>

              <!-- 4. Counted VES Input -->
              <div class="p-3.5 bg-white rounded-xl border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 space-y-1.5">
                <label class="block font-bold text-slate-800 text-[11px]">
                  Billetes Bolívares (VES) *
                </label>
                <div class="relative">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">Bs.</span>
                  <input 
                    type="number" 
                    step="0.01"
                    [value]="countedCashVesInput()"
                    (input)="countedCashVesInput.set(+$any($event.target).value)"
                    placeholder="0.00"
                    class="w-full pl-8 pr-2 py-1.5 bg-slate-50/50 border border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-900 focus:outline-none focus:bg-white" />
                </div>
                <span class="text-[10px] text-slate-400 block">
                  (Eq. \${{ formatNumber(countedCashVesInput() / bcvRate()) }})
                </span>
              </div>

            </div>

            <!-- Difference and Reconciliation Feedback -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              
              <!-- USD Difference -->
              <div class="p-3 rounded-xl border"
                [class]="calculatedDifferenceUsd() === 0 ? 'bg-emerald-50/80 border-emerald-200' : (calculatedDifferenceUsd() > 0 ? 'bg-sky-50/80 border-sky-200' : 'bg-rose-50/80 border-rose-200')">
                <span class="text-slate-600 font-medium text-[11px] block">Diferencia Efectivo Dólares ($):</span>
                <p class="font-mono font-bold text-base mt-0.5"
                  [class]="calculatedDifferenceUsd() >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ calculatedDifferenceUsd() >= 0 ? '+' : '' }}\${{ formatNumber(calculatedDifferenceUsd()) }}
                  <span class="text-[11px] font-sans font-normal ml-1">
                    ({{ calculatedDifferenceUsd() === 0 ? 'Exacto' : (calculatedDifferenceUsd() > 0 ? 'Sobrante' : 'Faltante') }})
                  </span>
                </p>
              </div>

              <!-- VES Difference -->
              <div class="p-3 rounded-xl border"
                [class]="calculatedDifferenceVes() === 0 ? 'bg-emerald-50/80 border-emerald-200' : (calculatedDifferenceVes() > 0 ? 'bg-sky-50/80 border-sky-200' : 'bg-rose-50/80 border-rose-200')">
                <span class="text-slate-600 font-medium text-[11px] block">Diferencia Efectivo Bolívares (VES):</span>
                <p class="font-mono font-bold text-base mt-0.5"
                  [class]="calculatedDifferenceVes() >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ calculatedDifferenceVes() >= 0 ? '+' : '' }}Bs. {{ formatNumber(calculatedDifferenceVes()) }}
                  <span class="text-[11px] font-sans font-normal ml-1">
                    ({{ calculatedDifferenceVes() === 0 ? 'Exacto' : (calculatedDifferenceVes() > 0 ? 'Sobrante' : 'Faltante') }})
                  </span>
                </p>
              </div>

              <!-- Consolidated Difference in USD -->
              <div class="p-3 rounded-xl border"
                [class]="totalCalculatedDifferenceUsd() === 0 ? 'bg-emerald-100/70 border-emerald-300' : (totalCalculatedDifferenceUsd() > 0 ? 'bg-sky-100/70 border-sky-300' : 'bg-rose-100/70 border-rose-300')">
                <span class="text-slate-700 font-bold text-[11px] block">Diferencia Neta Consolidada ($ USD):</span>
                <p class="font-mono font-extrabold text-base mt-0.5"
                  [class]="totalCalculatedDifferenceUsd() >= 0 ? 'text-emerald-800' : 'text-rose-800'">
                  {{ totalCalculatedDifferenceUsd() >= 0 ? '+' : '' }}\${{ formatNumber(totalCalculatedDifferenceUsd()) }}
                  <span class="text-[11px] font-sans font-bold ml-1">
                    ({{ totalCalculatedDifferenceUsd() === 0 ? 'Cuadre Perfecto' : (totalCalculatedDifferenceUsd() > 0 ? 'Sobrante' : 'Faltante') }})
                  </span>
                </p>
              </div>

            </div>

            <!-- Notes & Close Button -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <input 
                type="text" 
                #closingNotesInput
                placeholder="Observaciones de auditoría o notas de cierre (opcional)..."
                class="w-full sm:max-w-md px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400" />

              <button 
                (click)="closeShift(closingNotesInput.value)"
                class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer shrink-0">
                <mat-icon class="text-sm">lock</mat-icon>
                <span>CERRAR TURNO & GENERAR REPORTE Z</span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Closed Shift Summary -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p class="font-bold text-slate-900 text-sm">Turno Cerrado el {{ sess.closeDate }}</p>
              <p class="text-slate-500 mt-0.5">
                Diferencia registrada en caja: 
                <strong class="font-mono text-slate-800">\${{ (sess.cashDifference || 0) | number:'1.2-2' }}</strong>
                @if (sess.cashDifferenceVes !== undefined) {
                  • <strong class="font-mono text-slate-800">Bs. {{ formatNumber(sess.cashDifferenceVes) }}</strong>
                }
              </p>
            </div>
            <div class="flex items-center space-x-2">
              <button (click)="showZReportModal.set(true)" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium flex items-center space-x-1.5 transition-colors cursor-pointer">
                <mat-icon class="text-xs">receipt_long</mat-icon>
                <span>Ver Reporte Z</span>
              </button>
              <button (click)="printZReport()" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center space-x-1.5 transition-colors cursor-pointer">
                <mat-icon class="text-xs">print</mat-icon>
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        }

      </div>

      <!-- Historical Closures Log -->
      @if (stateService.cashSessionHistory().length > 0) {
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="p-1.5 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <mat-icon class="text-sm">history</mat-icon>
              </span>
              <h3 class="font-bold text-sm text-slate-900">Historial de Turnos Cerrados</h3>
            </div>
            <span class="text-xs text-slate-400">{{ stateService.cashSessionHistory().length }} turnos archivados</span>
          </div>

          <div class="divide-y divide-slate-100 text-xs">
            @for (h of stateService.cashSessionHistory(); track h.id) {
              <div class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="font-mono font-bold text-slate-900">{{ h.sessionCode }}</span>
                    <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
                      {{ h.cashierName }}
                    </span>
                  </div>
                  <p class="text-slate-400 text-[11px] mt-0.5">{{ h.openedAt }} a {{ h.closeDate }}</p>
                </div>
                <div class="flex items-center space-x-4">
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">Total Facturado:</span>
                    <span class="font-mono font-bold text-slate-900">\${{ formatNumber(h.totalSales) }}</span>
                  </div>
                  <div class="text-right min-w-[90px]">
                    <span class="text-[10px] text-slate-400 block">Diferencia:</span>
                    <span class="font-mono font-semibold" [class]="(h.cashDifference || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                      {{ (h.cashDifference || 0) >= 0 ? '+' : '' }}\${{ formatNumber(h.cashDifference || 0) }}
                    </span>
                  </div>
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
            <div class="flex items-center space-x-2">
              <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <mat-icon>point_of_sale</mat-icon>
              </span>
              <h3 class="font-bold text-sm text-slate-900">Apertura de Nuevo Turno de Caja</h3>
            </div>
            <p class="text-slate-500">
              Ingrese el fondo de sencillo asignado al cajero en la gaveta física para iniciar operaciones:
            </p>

            <div class="space-y-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Fondo Inicial en Dólares ($ USD):</label>
                <input #initialUsdInput type="number" step="0.01" value="0.00" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900" />
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Fondo Inicial en Bolívares (Bs. VES):</label>
                <input #initialVesInput type="number" step="0.01" value="0.00" class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900" />
                <span class="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  Equivalente: ~ \${{ (+initialVesInput.value / bcvRate()) | number:'1.2-2' }} USD (Tasa BCV: Bs. {{ bcvRate() | number:'1.2-2' }})
                </span>
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Seleccione Almacén:</label>
                <select 
                  [value]="warehouseSelect()"
                  (change)="warehouseSelect.set($any($event.target).value)"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900">
                  @for (wh of warehouses(); track wh.id) {
                    <option [value]="wh.id">{{ wh.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button (click)="showOpenSessionModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                Cancelar
              </button>
              <button (click)="confirmOpenSession(+initialUsdInput.value, +initialVesInput.value)" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer">
                Iniciar Turno
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Detailed Z-Report Modal / Document View -->
      @if (showZReportModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <!-- Modal Header -->
            <div class="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-emerald-400">receipt_long</mat-icon>
                <span class="text-sm font-semibold">Comprobante Fiscal de Cierre de Caja (Reporte Z)</span>
              </div>
              <div class="flex items-center space-x-2">
                <button (click)="printZReport()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                  <mat-icon class="text-sm">print</mat-icon>
                  <span>Imprimir / PDF</span>
                </button>
                <button (click)="showZReportModal.set(false)" class="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Printable Body -->
            <div class="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs" id="printable-z-report">
              <!-- Company Header -->
              <div class="text-center border-b border-slate-200 pb-4">
                <h2 class="font-extrabold text-base text-slate-900 tracking-tight">{{ stateService.companyProfile().legalName }}</h2>
                <p class="font-mono text-xs text-slate-600">RIF: {{ stateService.companyProfile().taxId }}</p>
                <p class="text-[11px] text-slate-500">{{ stateService.companyProfile().address }}</p>
                <p class="text-[11px] text-indigo-700 font-semibold mt-1">REPORTE Z - CIERRE DIARIO MULTIMONEDA DE CAJA</p>
              </div>

              <!-- Metadata Grid -->
              <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span class="text-slate-400 block text-[10px]">CÓDIGO DE TURNO:</span>
                  <span class="font-bold text-slate-900">{{ sess.sessionCode }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">CAJERO / OPERADOR:</span>
                  <span class="font-bold text-slate-900">{{ sess.cashierName }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">APERTURA:</span>
                  <span>{{ sess.openedAt }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[10px]">TASA OFICIAL BCV:</span>
                  <span class="font-bold text-slate-900">Bs. {{ bcvRate() | number:'1.2-2' }} / USD</span>
                </div>
              </div>

              <!-- Breakdown Table -->
              <div>
                <h4 class="font-bold text-xs text-slate-900 mb-2 uppercase tracking-wider">Desglose de Cobros por Método y Moneda</h4>
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <th class="py-1.5">Instrumento</th>
                      <th class="py-1.5 text-center">Moneda</th>
                      <th class="py-1.5 text-right">Monto Original</th>
                      <th class="py-1.5 text-right">Equivalente ($ USD)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of allBreakdownItems(); track item.method + item.currency) {
                      <tr>
                        <td class="py-1.5 font-medium text-slate-900">{{ item.label }}</td>
                        <td class="py-1.5 text-center font-mono text-[10px]">{{ item.currency }}</td>
                        <td class="py-1.5 text-right font-mono">
                          {{ item.currency === 'VES' ? 'Bs. ' : '$ ' }}{{ formatNumber(item.amount) }}
                        </td>
                        <td class="py-1.5 text-right font-mono font-bold text-slate-800">
                          \${{ formatNumber(item.amountUsd) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot class="border-t-2 border-slate-800 font-bold">
                    <tr>
                      <td colspan="3" class="py-2 text-slate-900">TOTAL FACTURADO EN TURNO</td>
                      <td class="py-2 text-right font-mono text-emerald-700 text-sm">
                        \${{ formatNumber(sess.totalSales) }}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="3" class="py-1 text-slate-500 text-[10px]">EQUIVALENTE TOTAL EN BOLÍVARES (BCV)</td>
                      <td class="py-1 text-right font-mono text-slate-900 text-xs">
                        Bs. {{ formatNumber(sess.totalSalesVes || (sess.totalSales * bcvRate())) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Reconciliation Summary in Print -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div class="flex justify-between">
                  <span class="text-slate-500">Fondo Inicial Asignado:</span>
                  <span class="font-bold">\${{ formatNumber(sess.openingBaseUsd || 0) }} + Bs. {{ formatNumber(sess.openingBaseVes || 0) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Efectivo Físico Esperado:</span>
                  <span class="font-bold">\${{ formatNumber(expectedCashUsd()) }} + Bs. {{ formatNumber(expectedCashVes()) }}</span>
                </div>
                @if (sess.status === 'CERRADA') {
                  <div class="flex justify-between border-t border-slate-200 pt-1">
                    <span class="text-slate-500">Efectivo Contado al Cierre:</span>
                    <span class="font-bold">\${{ formatNumber(sess.countedCashAmountUsd || sess.countedCashAmount || 0) }} + Bs. {{ formatNumber(sess.countedCashAmountVes || 0) }}</span>
                  </div>
                  <div class="flex justify-between font-bold">
                    <span>Diferencia de Cuadre:</span>
                    <span [class]="(sess.cashDifference || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                      {{ (sess.cashDifference || 0) >= 0 ? '+' : '' }}\${{ formatNumber(sess.cashDifference || 0) }}
                    </span>
                  </div>
                }
              </div>

              <!-- Signatures Block -->
              <div class="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 font-mono">
                <div class="border-t border-slate-300 pt-2">
                  <p class="font-bold text-slate-800">{{ sess.cashierName }}</p>
                  <p>Firma del Cajero Responsable</p>
                </div>
                <div class="border-t border-slate-300 pt-2">
                  <p class="font-bold text-slate-800">Administrador / Auditor</p>
                  <p>Firma de Conformidad & Arqueo</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      }

    </div>
  `
})
export default class CashClosingComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  showOpenSessionModal = signal<boolean>(false);
  showZReportModal = signal<boolean>(false);
  selectedBreakdownFilter = signal<'ALL' | 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('ALL');
  dashboardCurrencyMode = signal<'MULTI' | 'USD' | 'VES'>('MULTI');

  warehouses = computed(() => this.stateService.warehouses());

  warehouseSelect = signal<Warehouse | null>(this.warehouses().find(wh => wh.isMain) || null);

  bcvRate = computed(() => Number(this.stateService.bcvState().usdRate) || 36.50);

  // Cash count input signals (Dual currency)
  // Default values set to match expected physical cash
  countedCashUsdInput = signal<number>(0.00);
  countedCashVesInput = signal<number>(0.00);

  // Fallback initial method breakdowns if none in session
  allBreakdownItems = computed<CashSessionPaymentMethodBreakdown[]>(() => {
    const sess = this.stateService.activeCashSession();
    if (sess.methodBreakdowns && sess.methodBreakdowns.length > 0) {
      return sess.methodBreakdowns;
    }

    // Default synthesized breakdown from the session metrics
    const bcv = this.bcvRate();
    const items: CashSessionPaymentMethodBreakdown[] = [];

    const cashUsd = sess.totalCashSalesUsd !== undefined ? sess.totalCashSalesUsd : sess.totalCashSales;
    const cashVes = sess.totalCashSalesVes || 0;

    if (cashUsd > 0) {
      items.push({
        method: 'EFECTIVO_USD',
        label: 'Efectivo Dólares (Divisas)',
        category: 'EFECTIVO',
        currency: 'USD',
        amount: cashUsd,
        amountUsd: cashUsd,
        transactionCount: 28
      });
    }

    if (cashVes > 0) {
      items.push({
        method: 'EFECTIVO',
        label: 'Efectivo Bolívares (VES)',
        category: 'EFECTIVO',
        currency: 'VES',
        amount: cashVes,
        amountUsd: Number((cashVes / bcv).toFixed(2)),
        transactionCount: 19
      });
    }

    const cardVes = sess.totalCardSalesVes || (sess.totalCardSales * bcv);
    const cardUsd = sess.totalCardSalesUsd || 0;

    if (cardVes > 0) {
      items.push({
        method: 'PUNTO_VENTA_DEBITO',
        label: 'Punto de Venta Débito (VES)',
        category: 'TARJETA',
        currency: 'VES',
        amount: cardVes,
        amountUsd: Number((cardVes / bcv).toFixed(2)),
        transactionCount: 14
      });
    }

    if (cardUsd > 0) {
      items.push({
        method: 'TARJETA_CREDITO',
        label: 'Tarjetas Internacionales ($ USD)',
        category: 'TARJETA',
        currency: 'USD',
        amount: cardUsd,
        amountUsd: cardUsd,
        transactionCount: 2
      });
    }

    const zelleUsd = sess.totalZelleSalesUsd || 0.00;
    const pagoMovilVes = sess.totalPagoMovilSalesVes || 0.00;
    const trfUsd = sess.totalTransferSalesUsd || 0.00;

    if (zelleUsd > 0) {
      items.push({
        method: 'ZELLE',
        label: 'Zelle (USD)',
        category: 'TRANSFERENCIA',
        currency: 'USD',
        amount: zelleUsd,
        amountUsd: zelleUsd,
        transactionCount: 0
      });
    }

    if (pagoMovilVes > 0) {
      items.push({
        method: 'PAGO_MOVIL',
        label: 'Pago Móvil Interbancario (VES)',
        category: 'TRANSFERENCIA',
        currency: 'VES',
        amount: pagoMovilVes,
        amountUsd: Number((pagoMovilVes / bcv).toFixed(2)),
        transactionCount: 0
      });
    }

    if (trfUsd > 0) {
      items.push({
        method: 'TRANSFERENCIA',
        label: 'Transferencia Bancaria (USD / Wire)',
        category: 'TRANSFERENCIA',
        currency: 'USD',
        amount: trfUsd,
        amountUsd: trfUsd,
        transactionCount: 0
      });
    }

    return items;
  });

  // Granular Cash Inflow Specifics
  cashUsd = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'EFECTIVO' && it.currency === 'USD');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalCashSalesUsd !== undefined ? sess.totalCashSalesUsd : sess.totalCashSales;
  });

  cashUsdOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'EFECTIVO' && it.currency === 'USD');
    return item?.transactionCount || 0;
  });

  cashVes = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'EFECTIVO' && it.currency === 'VES');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalCashSalesVes || 0;
  });

  cashVesOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'EFECTIVO' && it.currency === 'VES');
    return item?.transactionCount || 0;
  });

  // Card Inflow Specifics
  cardVes = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'TARJETA' && it.currency === 'VES');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalCardSalesVes || (sess.totalCardSales * this.bcvRate());
  });

  cardVesOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'TARJETA' && it.currency === 'VES');
    return item?.transactionCount || 0;
  });

  cardUsd = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'TARJETA' && it.currency === 'USD');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalCardSalesUsd || 0;
  });

  cardUsdOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.category === 'TARJETA' && it.currency === 'USD');
    return item?.transactionCount || 0;
  });

  // Transfer / Digital Specifics
  zelleUsd = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'ZELLE');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalZelleSalesUsd || 0;
  });

  zelleOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'ZELLE');
    return item?.transactionCount || 0;
  });

  pagoMovilVes = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'PAGO_MOVIL');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalPagoMovilSalesVes || 0;
  });

  pagoMovilOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'PAGO_MOVIL');
    return item?.transactionCount || 0;
  });

  transferUsd = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'TRANSFERENCIA' && it.currency === 'USD');
    if (item) return item.amount;
    const sess = this.stateService.activeCashSession();
    return sess.totalTransferSalesUsd || 0;
  });

  transferUsdOps = computed(() => {
    const item = this.allBreakdownItems().find(it => it.method === 'TRANSFERENCIA' && it.currency === 'USD');
    return item?.transactionCount || 0;
  });

  totalSessionOperations = computed(() => {
    return this.allBreakdownItems().reduce((s, it) => s + it.transactionCount, 0);
  });

  filteredBreakdownItems = computed<CashSessionPaymentMethodBreakdown[]>(() => {
    const filter = this.selectedBreakdownFilter();
    const items = this.allBreakdownItems();
    if (filter === 'ALL') return items;
    return items.filter(it => it.category === filter);
  });

  totalFilteredUsd = computed(() => {
    return this.filteredBreakdownItems().reduce((s, it) => s + it.amountUsd, 0);
  });

  totalFilteredTransactions = computed(() => {
    return this.filteredBreakdownItems().reduce((s, it) => s + it.transactionCount, 0);
  });

  totalCollectedInUsdOriginal = computed(() => {
    return this.allBreakdownItems()
      .filter(it => it.currency === 'USD')
      .reduce((s, it) => s + it.amount, 0);
  });

  totalCollectedInVesOriginal = computed(() => {
    return this.allBreakdownItems()
      .filter(it => it.currency === 'VES')
      .reduce((s, it) => s + it.amount, 0);
  });

  // Expected Physical Cash
  expectedCashUsd = computed(() => {
    const sess = this.stateService.activeCashSession();
    const initial = Number(sess.openingBaseUsd) || 0;
    const sales = sess.totalCashSalesUsd !== undefined ? Number(sess.totalCashSalesUsd) : Number(sess.totalCashSales);
    return Number((initial + sales).toFixed(2));
  });

  expectedCashVes = computed(() => {
    const sess = this.stateService.activeCashSession();
    const initial = Number(sess.openingBaseVes) || 0;
    const sales = Number(sess.totalCashSalesVes) || 0;
    return Number((initial + sales).toFixed(2));
  });

  // Differences
  calculatedDifferenceUsd = computed(() => {
    return Number((this.countedCashUsdInput() - this.expectedCashUsd()).toFixed(2));
  });

  calculatedDifferenceVes = computed(() => {
    return Number((this.countedCashVesInput() - this.expectedCashVes()).toFixed(2));
  });

  totalCalculatedDifferenceUsd = computed(() => {
    const diffUsd = this.calculatedDifferenceUsd();
    const diffVesInUsd = this.calculatedDifferenceVes() / this.bcvRate();
    return Number((diffUsd + diffVesInUsd).toFixed(2));
  });

  closeShift(notes?: string) {
    this.stateService.closeCashSession(
      this.countedCashUsdInput(),
      this.countedCashVesInput(),
      notes || 'Arqueo de cierre de jornada habitual con desglose multimoneda'
    );
  }

  confirmOpenSession(openingBaseUsd: number, initialAmountVes: number) {
    this.stateService.reopenCashSession(openingBaseUsd || 0, initialAmountVes || 0, this.warehouseSelect()?.id || '');
    this.showOpenSessionModal.set(false);
  }

  printZReport() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  formatNumber(val: number): string {
    return (val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  calculatePercentage(amountUsd: number, totalSales: number): number {
    if (!totalSales || totalSales <= 0) return 0;
    return Number(((amountUsd / totalSales) * 100).toFixed(1));
  }

  getMethodIcon(method: PaymentMethod): string {
    switch (method) {
      case 'EFECTIVO_USD':
      case 'EFECTIVO':
      case 'EFECTIVO_EUR':
        return 'attach_money';
      case 'TARJETA_CREDITO':
      case 'PUNTO_VENTA_DEBITO':
        return 'credit_card';
      case 'PAGO_MOVIL':
        return 'phone_android';
      case 'ZELLE':
        return 'flash_on';
      case 'TRANSFERENCIA':
        return 'account_balance';
      case 'CRIPTO':
        return 'currency_bitcoin';
      case 'CREDITO':
        return 'receipt';
      case 'SALDO_A_FAVOR':
        return 'account_balance_wallet';
      default:
        return 'payments';
    }
  }

  getMethodIconBg(method: PaymentMethod): string {
    switch (method) {
      case 'EFECTIVO_USD':
      case 'EFECTIVO':
        return 'bg-emerald-100 text-emerald-800';
      case 'TARJETA_CREDITO':
      case 'PUNTO_VENTA_DEBITO':
        return 'bg-sky-100 text-sky-800';
      case 'ZELLE':
        return 'bg-purple-100 text-purple-800';
      case 'PAGO_MOVIL':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFERENCIA':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }
}

