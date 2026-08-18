import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { KardexMovement } from '../../models/erp.models';

@Component({
  selector: 'app-kardex',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <span class="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <mat-icon>query_stats</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Kardex Valorado (Costo Promedio Ponderado)
            </h1>
            <p class="text-xs text-slate-500">
              Trazabilidad física y monetaria por producto según normativa contable y transaccional ACID
            </p>
          </div>
        </div>

        <button 
          (click)="printKardex()" 
          class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors">
          <mat-icon class="text-sm">print</mat-icon>
          <span>Imprimir / Exportar Reporte</span>
        </button>
      </div>

      <!-- Product & Warehouse Selectors -->
      <div class="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <!-- Select Product -->
          <div>
            <span class="block text-xs font-semibold text-slate-600 mb-1">Producto a Auditar en Kardex</span>
            <select 
              [value]="selectedProductId()"
              (change)="selectedProductId.set($any($event.target).value)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              <option value="ALL">-- Ver Todos los Productos (Histórico Global) --</option>
              @for (prod of stateService.products(); track prod.id) {
                <option [value]="prod.id">{{ prod.sku }} - {{ prod.name }}</option>
              }
            </select>
          </div>

          <!-- Select Movement Type -->
          <div>
            <span class="block text-xs font-semibold text-slate-600 mb-1">Filtrar por Tipo de Movimiento</span>
            <select 
              [value]="selectedMovementType()"
              (change)="selectedMovementType.set($any($event.target).value)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20">
              <option value="ALL">Todos los Movimientos</option>
              <option value="ENTRADA_COMPRA">Entradas por Compra (Recepción)</option>
              <option value="SALIDA_VENTA">Salidas por Venta (Facturación / POS)</option>
              <option value="AJUSTE_MERMA">Ajustes de Merma / Daño</option>
              <option value="AJUSTE_SOBRANTE">Ajustes de Sobrante</option>
              <option value="AJUSTE_INVENTARIO">Ajustes de Inventario Físico</option>
            </select>
          </div>

          <!-- Valuation Methodology Pill -->
          <div class="p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl flex items-center space-x-3 text-xs text-teal-950">
            <mat-icon class="text-teal-600 text-2xl">calculate</mat-icon>
            <div>
              <span class="font-bold">Método: Promedio Ponderado</span>
              <p class="text-[11px] text-slate-600">CPP = (Valor Total Saldo + Entrada $) / (Cant Total + Entrada Q)</p>
            </div>
          </div>

        </div>

        @if (selectedProduct(); as currentProd) {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span class="text-slate-400 font-medium">SKU / Código:</span>
              <p class="font-mono font-bold text-slate-900">{{ currentProd.sku }}</p>
            </div>
            <div>
              <span class="text-slate-400 font-medium">Costo Promedio Actual:</span>
              <p class="font-mono font-bold text-teal-800">\${{ currentProd.costPrice.toFixed(2) }}</p>
            </div>
            <div>
              <span class="text-slate-400 font-medium">Stock Total Físico:</span>
              <p class="font-mono font-bold text-slate-900">{{ currentProd.totalStock }} {{ currentProd.unit }}</p>
            </div>
            <div>
              <span class="text-slate-400 font-medium">Valorización Actual:</span>
              <p class="font-mono font-bold text-indigo-900">\${{ (currentProd.totalStock * currentProd.costPrice).toFixed(2) }}</p>
            </div>
          </div>
        }

      </div>

      <!-- Ledger Table (Format 3-Sections: Entradas, Salidas, Saldos) -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="printable-kardex">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[11px] border-collapse min-w-[950px]">
            <thead>
              <!-- Top Grouped Header -->
              <tr class="bg-slate-900 text-white font-semibold text-center border-b border-slate-800">
                <th colspan="4" class="py-2.5 px-3 text-left border-r border-slate-800">Datos del Documento y Movimiento</th>
                <th colspan="3" class="py-2.5 px-2 bg-emerald-950/80 text-emerald-300 border-r border-slate-800">ENTRADAS</th>
                <th colspan="3" class="py-2.5 px-2 bg-rose-950/80 text-rose-300 border-r border-slate-800">SALIDAS</th>
                <th colspan="3" class="py-2.5 px-2 bg-indigo-950/80 text-indigo-300">SALDO VALORIZADO</th>
              </tr>
              <!-- Sub Header -->
              <tr class="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <th class="py-2 px-3">Fecha</th>
                <th class="py-2 px-3">Doc Ref</th>
                <th class="py-2 px-3">Producto / SKU</th>
                <th class="py-2 px-3 border-r border-slate-200">Tipo</th>
                
                <!-- Entradas -->
                <th class="py-2 px-2 text-center bg-emerald-50/50">Cant</th>
                <th class="py-2 px-2 text-right bg-emerald-50/50">C. Unit</th>
                <th class="py-2 px-2 text-right bg-emerald-50/50 border-r border-slate-200">Total $</th>

                <!-- Salidas -->
                <th class="py-2 px-2 text-center bg-rose-50/50">Cant</th>
                <th class="py-2 px-2 text-right bg-rose-50/50">C. Unit</th>
                <th class="py-2 px-2 text-right bg-rose-50/50 border-r border-slate-200">Total $</th>

                <!-- Saldos -->
                <th class="py-2 px-2 text-center bg-indigo-50/50">Cant</th>
                <th class="py-2 px-2 text-right bg-indigo-50/50">CPP Unit</th>
                <th class="py-2 px-3 text-right bg-indigo-50/50">Valor Total $</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (m of filteredMovements(); track m.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  
                  <!-- Metadata -->
                  <td class="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono">{{ m.date.substring(5, 16) }}</td>
                  <td class="py-2.5 px-3">
                    <span class="font-mono font-bold text-slate-900">{{ m.docReference }}</span>
                    @if (m.supportDocument) {
                      <span class="block text-[10px] text-amber-700">Soporte: {{ m.supportDocument }}</span>
                    }
                  </td>
                  <td class="py-2.5 px-3">
                    <p class="font-medium text-slate-900 truncate max-w-[160px]">{{ m.productName }}</p>
                    <p class="text-[10px] text-slate-400 font-mono">{{ m.productSku }} • {{ m.warehouseName }}</p>
                  </td>
                  <td class="py-2.5 px-3 border-r border-slate-100">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      [class]="getMovementBadgeClass(m.movementType)">
                      {{ m.movementType.replace('_', ' ') }}
                    </span>
                  </td>

                  <!-- Entradas -->
                  <td class="py-2.5 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/20">
                    {{ m.entryQty > 0 ? '+' + m.entryQty : '-' }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-mono text-slate-600 bg-emerald-50/20">
                    {{ m.entryUnitCost > 0 ? '$' + m.entryUnitCost.toFixed(2) : '-' }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-mono font-medium text-emerald-900 bg-emerald-50/20 border-r border-slate-100">
                    {{ m.entryTotalCost > 0 ? '$' + m.entryTotalCost.toFixed(2) : '-' }}
                  </td>

                  <!-- Salidas -->
                  <td class="py-2.5 px-2 text-center font-mono font-bold text-rose-700 bg-rose-50/20">
                    {{ m.exitQty > 0 ? '-' + m.exitQty : '-' }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-mono text-slate-600 bg-rose-50/20">
                    {{ m.exitUnitCost > 0 ? '$' + m.exitUnitCost.toFixed(2) : '-' }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-mono font-medium text-rose-900 bg-rose-50/20 border-r border-slate-100">
                    {{ m.exitTotalCost > 0 ? '$' + m.exitTotalCost.toFixed(2) : '-' }}
                  </td>

                  <!-- Saldos Resultantes -->
                  <td class="py-2.5 px-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/20">
                    {{ m.balanceQty }}
                  </td>
                  <td class="py-2.5 px-2 text-right font-mono font-semibold text-teal-800 bg-indigo-50/20">
                    \${{ m.balanceAverageCost.toFixed(2) }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-indigo-50/20">
                    \${{ m.balanceTotalValuation.toFixed(2) }}
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="13" class="text-center py-10 text-slate-400">
                    No existen movimientos de Kardex registrados para los criterios seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
          <span>Total de transacciones auditadas: <strong>{{ filteredMovements().length }}</strong></span>
          <span>Actualizado atómicamente en PostgreSQL</span>
        </div>
      </div>

    </div>
  `
})
export class KardexComponent {
  stateService = inject(ErpStateService);

  selectedProductId = signal<string>('ALL');
  selectedMovementType = signal<string>('ALL');

  selectedProduct = computed(() => {
    const id = this.selectedProductId();
    if (id === 'ALL') return null;
    return this.stateService.products().find(p => p.id === id) || null;
  });

  filteredMovements = computed(() => {
    const prodId = this.selectedProductId();
    const movType = this.selectedMovementType();

    return this.stateService.kardexMovements().filter(m => {
      const matchProd = prodId === 'ALL' || m.productId === prodId;
      const matchType = movType === 'ALL' || m.movementType === movType;
      return matchProd && matchType;
    });
  });

  getMovementBadgeClass(type: KardexMovement['movementType']): string {
    switch (type) {
      case 'ENTRADA_COMPRA':
        return 'bg-emerald-100 text-emerald-800';
      case 'SALIDA_VENTA':
        return 'bg-indigo-100 text-indigo-800';
      case 'AJUSTE_MERMA':
        return 'bg-rose-100 text-rose-800';
      case 'AJUSTE_SOBRANTE':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  printKardex() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
