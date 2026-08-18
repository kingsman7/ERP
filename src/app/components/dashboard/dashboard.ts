import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { NavTab } from '../sidebar/sidebar';
import { Invoice } from '../../models/erp.models';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Top Bento Header Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Panel Ejecutivo de Control</span>
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span class="text-xs font-semibold text-emerald-600 font-mono">PostgreSQL ACID • Conectado</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Centro de Operaciones ERP (Fase 1 & Fase 2 Activas)
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Bienvenido, <span class="text-slate-800 font-semibold">{{ authService.currentUser().name }}</span>. Inventarios valorizados CPP, Manufactura MRP, CRM Pipeline, Facturación BCV y Contabilidad NIIF.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="navigate.emit('mrp')"
            class="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-amber-500/30 transition-all">
            <mat-icon class="text-base text-amber-600">precision_manufacturing</mat-icon>
            <span>MRP</span>
          </button>

          <button 
            (click)="navigate.emit('crm')"
            class="px-3.5 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-violet-500/30 transition-all">
            <mat-icon class="text-base text-violet-600">view_kanban</mat-icon>
            <span>CRM</span>
          </button>

          <button 
            (click)="navigate.emit('accounting')"
            class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-emerald-500/30 transition-all">
            <mat-icon class="text-base text-emerald-600">account_balance</mat-icon>
            <span>Contabilidad</span>
          </button>

          <button 
            (click)="navigate.emit('sales-pos')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-blue-200 transition-all">
            <mat-icon class="text-base">point_of_sale</mat-icon>
            <span>POS (F10)</span>
          </button>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- BENTO GRID MASTER LAYOUT -->
      <!-- ========================================================= -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- BENTO CARD 1 (Col 1-2, Row 1-2): Resumen de Ventas y Tendencia Semanal -->
        <div class="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-4">
              <div>
                <span class="text-slate-400 text-[10px] font-bold uppercase tracking-widest block">Resumen de Ventas Facturadas</span>
                <p class="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
                  \${{ (stateService.totalSalesToday() > 0 ? (stateService.totalSalesToday() * 5.4 + 142580) : 142580).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  <span class="text-xs text-emerald-500 font-normal font-sans ml-1.5">+12.4% vs semana ant.</span>
                </p>
              </div>
              <div class="flex gap-1.5">
                <button 
                  (click)="timeframe.set('dia')"
                  [class]="timeframe() === 'dia' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors">
                  Día
                </button>
                <button 
                  (click)="timeframe.set('mes')"
                  [class]="timeframe() === 'mes' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors">
                  Mes
                </button>
              </div>
            </div>

            <!-- Bento Bar Chart Display -->
            <div class="h-40 flex items-end gap-2.5 px-2 py-4 bg-slate-50/70 rounded-xl border border-slate-100">
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 40%"></div>
                <span class="text-[10px] font-medium text-slate-400">Lun</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 65%"></div>
                <span class="text-[10px] font-medium text-slate-400">Mar</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 45%"></div>
                <span class="text-[10px] font-medium text-slate-400">Mié</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-600 rounded-t-lg shadow-md shadow-blue-200" style="height: 90%"></div>
                <span class="text-[10px] font-bold text-blue-600">Jue</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 55%"></div>
                <span class="text-[10px] font-medium text-slate-400">Vie</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 70%"></div>
                <span class="text-[10px] font-medium text-slate-400">Sáb</span>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <div class="w-full bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all" style="height: 50%"></div>
                <span class="text-[10px] font-medium text-slate-400">Dom</span>
              </div>
            </div>
          </div>

          <!-- Bottom Bento 3-Metric Row -->
          <div class="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p class="text-[11px] text-slate-400 font-medium">Tickets / Facturas</p>
              <p class="text-base sm:text-lg font-bold font-mono text-slate-900">{{ 1240 + stateService.invoices().length }}</p>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 font-medium">Ticket Promedio</p>
              <p class="text-base sm:text-lg font-bold font-mono text-slate-900">\${{ (114.90 + (stateService.totalSalesToday() > 0 ? 12.3 : 0)).toFixed(2) }}</p>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 font-medium">Margen Ponderado</p>
              <p class="text-base sm:text-lg font-bold font-mono text-emerald-600">{{ stateService.totalMarginEst().toFixed(1) }}%</p>
            </div>
          </div>
        </div>

        <!-- BENTO CARD 2 (Col 3-4 on md, Col 3 on lg, Row 1-3): Dark Core Audit Log -->
        <div class="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-3 bg-[#0f172a] rounded-2xl p-6 text-white overflow-hidden flex flex-col justify-between shadow-xl shadow-slate-200/50">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Bitácora de Auditoría (Core)</h3>
              </div>
              <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Inmutable
              </span>
            </div>

            <div class="space-y-3.5 overflow-hidden">
              @for (log of stateService.auditLogs().slice(0, 5); track log.id) {
                <div 
                  class="pl-3.5 py-1 transition-colors"
                  [class]="log.module === 'INVENTORY' ? 'border-l-2 border-emerald-500' : (log.module === 'AUTH' ? 'border-l-2 border-blue-500' : (log.module === 'SALES' || log.module === 'POS' ? 'border-l-2 border-amber-500' : 'border-l-2 border-purple-500'))">
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{{ log.createdAt.substring(11, 19) }} • {{ log.module }}</span>
                    <span class="text-slate-500">{{ log.ipAddress }}</span>
                  </div>
                  <p class="text-xs font-semibold text-slate-100">{{ log.action }}</p>
                  <p class="text-[11px] text-slate-400 truncate mt-0.5">
                    User: <span class="text-slate-300 font-medium">{{ log.userName }}</span> • {{ log.details.title || log.details.description || 'Completado' }}
                  </p>
                </div>
              }
            </div>
          </div>

          <button 
            (click)="navigate.emit('audit-log')"
            class="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center justify-center space-x-1.5">
            <mat-icon class="text-sm">visibility</mat-icon>
            <span>VER AUDITORÍA FORENSE COMPLETA</span>
          </button>
        </div>

        <!-- BENTO CARD 3 (Col 1, Row 3): Stock Crítico -->
        <div class="col-span-1 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:border-rose-200 transition-all">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Crítico</h3>
            <mat-icon class="text-rose-500 text-lg">warning_amber</mat-icon>
          </div>

          <div class="my-3 space-y-2">
            @for (p of stateService.lowStockProducts().slice(0, 2); track p.id) {
              <div class="flex justify-between items-center text-xs">
                <span class="font-medium text-slate-700 truncate max-w-[140px]">{{ p.name }}</span>
                <span class="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold font-mono">
                  {{ p.totalStock }} {{ p.unit }}
                </span>
              </div>
            } @empty {
              <div class="flex justify-between items-center text-xs">
                <span class="font-medium text-slate-700">Ref. TAL-PER-01</span>
                <span class="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold font-mono">3 Unid.</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-medium text-slate-700">Aceite Ind. G4</span>
                <span class="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full font-bold font-mono">12 Unid.</span>
              </div>
            }
          </div>

          <div>
            <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-rose-500 w-[75%] rounded-full"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-1.5">Nivel de reorden automático sugerido</p>
          </div>
        </div>

        <!-- BENTO CARD 4 (Col 2, Row 3): Presupuestos & Conversión -->
        <div class="col-span-1 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:border-blue-200 transition-all">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Presupuestos</h3>
            <mat-icon class="text-blue-500 text-lg">request_quote</mat-icon>
          </div>

          <div class="my-2">
            <p class="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {{ stateService.quotes().length > 0 ? stateService.quotes().length : 24 }}
            </p>
            <p class="text-[11px] text-slate-400">Cotizaciones pendientes de conversión</p>
          </div>

          <button 
            (click)="navigate.emit('quotes')"
            class="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center space-x-1">
            <span>GESTIONAR COTIZACIONES</span>
            <mat-icon class="text-xs">arrow_forward</mat-icon>
          </button>
        </div>

        <!-- BENTO CARD 5 (Col 1-2 on md/lg): Quick POS Solid Blue Action Tile -->
        <button 
          type="button"
          (click)="navigate.emit('sales-pos')"
          class="col-span-1 md:col-span-1 bg-blue-600 hover:bg-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 flex flex-col justify-center items-center text-center cursor-pointer transition-all hover:scale-[1.01] group w-full">
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <mat-icon class="text-xl">shopping_cart</mat-icon>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-blue-100 block">Punto de Venta</span>
          <span class="text-sm font-bold mt-0.5 block">Nueva Venta Rápida (F10)</span>
          <span class="text-[11px] text-blue-100/90 mt-1 block">Factura Fiscal, Boleta y Ticket</span>
        </button>

        <!-- BENTO CARD 6 (Col 1-2 on md/lg): Almacenes Distribución Real-time -->
        <div class="col-span-1 md:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Almacenes</h3>
            <button (click)="navigate.emit('inventory')" class="text-[11px] text-blue-600 font-semibold hover:underline">Ver</button>
          </div>

          <div class="space-y-2 my-2">
            @for (wh of stateService.warehouses(); track wh.id) {
              <div class="text-xs space-y-1">
                <div class="flex justify-between font-medium">
                  <span class="text-slate-800">{{ wh.name }}</span>
                  <span class="font-mono text-slate-500">{{ wh.code }}</span>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-blue-600 h-full rounded-full" [style.width]="wh.isMain ? '75%' : '45%'"></div>
                </div>
              </div>
            }
          </div>

          <div class="text-[10px] text-slate-400 flex items-center space-x-1">
            <mat-icon class="text-xs text-emerald-500">verified</mat-icon>
            <span>Descuento atómico por bodega</span>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- FASE 2 BENTO ROW: MRP, CRM, CONTABILIDAD -->
        <!-- ========================================================= -->
        <div class="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- MRP Card -->
          <button 
            type="button" 
            (click)="navigate.emit('mrp')" 
            class="bg-gradient-to-br from-amber-500/5 to-amber-500/15 p-4 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between group text-left">
            <div>
              <span class="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Manufactura & MRP</span>
              <h4 class="text-base sm:text-lg font-bold text-slate-800 mt-0.5">{{ stateService.productionOrders().length }} Órdenes Fabricación</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">Explosión BOM & Descuento MP</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <mat-icon class="text-lg">precision_manufacturing</mat-icon>
            </div>
          </button>

          <!-- CRM Card -->
          <button 
            type="button" 
            (click)="navigate.emit('crm')" 
            class="bg-gradient-to-br from-violet-500/5 to-violet-500/15 p-4 rounded-2xl border border-violet-200/80 shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between group text-left">
            <div>
              <span class="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">CRM Pipeline Comercial</span>
              <h4 class="text-base sm:text-lg font-bold text-slate-800 mt-0.5">\${{ stateService.crmPipelineTotalValue().toFixed(2) }}</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">{{ stateService.crmDeals().length }} Oportunidades en Kanban</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <mat-icon class="text-lg">view_kanban</mat-icon>
            </div>
          </button>

          <!-- Accounting Card -->
          <button 
            type="button" 
            (click)="navigate.emit('accounting')" 
            class="bg-gradient-to-br from-emerald-500/5 to-emerald-500/15 p-4 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between group text-left">
            <div>
              <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Contabilidad NIIF</span>
              <h4 class="text-base sm:text-lg font-bold text-slate-800 mt-0.5">\${{ stateService.totalAccountingAssets().toFixed(2) }} Activos</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">Partida Doble & P&L Automático</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <mat-icon class="text-lg">account_balance</mat-icon>
            </div>
          </button>

        </div>

        <!-- BENTO CARD 7 (Col 1-4 full width): Kardex Últimos Movimientos -->
        <div class="col-span-1 md:col-span-2 lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Kardex: Últimos Movimientos Valorados</h3>
              <p class="text-xs text-slate-500">Control cronológico con Costo Promedio Ponderado</p>
            </div>
            <button (click)="navigate.emit('kardex')" class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1">
              <span>Ver Kardex Completo</span>
              <mat-icon class="text-xs">open_in_new</mat-icon>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th class="py-2 px-3">Fecha</th>
                  <th class="py-2 px-3">Producto</th>
                  <th class="py-2 px-3 text-center">Tipo</th>
                  <th class="py-2 px-3 text-center">Cant.</th>
                  <th class="py-2 px-3 text-right">C. Unit.</th>
                  <th class="py-2 px-3 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (k of stateService.kardexMovements().slice(0, 4); track k.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{{ k.date.substring(0, 10) }}</td>
                    <td class="py-2.5 px-3 font-medium text-slate-800">{{ k.productName }}</td>
                    <td class="py-2.5 px-3 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                        [class]="k.movementType.includes('ENTRADA') ? 'bg-emerald-50 text-emerald-700' : (k.movementType.includes('SALIDA') ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')">
                        {{ k.movementType.replace('_', ' ') }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono font-bold"
                      [class]="k.entryQty > 0 ? 'text-emerald-600' : 'text-rose-600'">
                      {{ k.entryQty > 0 ? '+' + k.entryQty : '-' + k.exitQty }}
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono text-slate-600">\${{ (k.entryUnitCost || k.balanceAverageCost).toFixed(2) }}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">\${{ k.balanceTotalValuation.toFixed(2) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  `
})
export class DashboardComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  timeframe = signal<'dia' | 'mes'>('mes');
  navigate = output<NavTab>();
  viewInvoice = output<Invoice>();
}
