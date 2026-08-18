import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { Bom, ProductionOrder } from '../../models/erp.models';

@Component({
  selector: 'app-mrp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- TOP HEADER & TITLE -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
              FASE 2 • MANUFACTURA
            </span>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Planificación y Control de Producción (MRP)
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de fórmulas BOM, explosión de materiales, liquidación de órdenes de fabricación e integración contable automática.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="openNewBomModal()" 
            class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-amber-500 text-base">format_list_bulleted</mat-icon>
            <span>Nueva Fórmula BOM</span>
          </button>

          <button 
            (click)="openNewOrderModal()" 
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">add_circle</mat-icon>
            <span>Crear Orden Fabricación</span>
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Bento Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Órdenes en Planta</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ activeOrdersCount() }}</h3>
            <p class="text-[11px] text-amber-600 font-medium mt-0.5">En proceso o planificadas</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <mat-icon class="text-xl">precision_manufacturing</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fórmulas BOM Activas</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ stateService.boms().length }}</h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">Estructuras de ensamble</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">account_tree</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valor en Fabricación</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ totalWipValue().toFixed(2) }}</h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Bs. {{ (totalWipValue() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <mat-icon class="text-xl">monetization_on</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Órdenes Completadas</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ completedOrdersCount() }}</h3>
            <p class="text-[11px] text-emerald-600 font-medium mt-0.5">Stock ingresado a almacén</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <mat-icon class="text-xl">inventory</mat-icon>
          </div>
        </div>

      </div>

      <!-- MAIN TABS: Órdenes, Fórmulas BOM, Simulador Explosión de Materiales -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        <!-- Tab Bar -->
        <div class="flex items-center justify-between px-6 border-b border-slate-100 overflow-x-auto">
          <div class="flex space-x-6">
            <button 
              (click)="activeTab.set('orders')"
              [class]="activeTab() === 'orders' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">assignment</mat-icon>
              <span>Órdenes de Fabricación ({{ stateService.productionOrders().length }})</span>
            </button>

            <button 
              (click)="activeTab.set('boms')"
              [class]="activeTab() === 'boms' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">hub</mat-icon>
              <span>Estructura de Materiales BOM ({{ stateService.boms().length }})</span>
            </button>

            <button 
              (click)="activeTab.set('simulator')"
              [class]="activeTab() === 'simulator' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">calculate</mat-icon>
              <span>Simulador / Explosión de Materiales MRP</span>
            </button>
          </div>
        </div>

        <!-- TAB 1: ÓRDENES DE FABRICACIÓN -->
        @if (activeTab() === 'orders') {
          <div class="p-6">
            
            <!-- Filters -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div class="flex items-center space-x-2">
                <span class="text-xs text-slate-500 font-medium">Filtrar estado:</span>
                <select 
                  [value]="selectedStatusFilter()"
                  (change)="onStatusFilterChange($event)"
                  class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700">
                  <option value="ALL">Todos los estados</option>
                  <option value="PLANIFICADA">Planificada</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>

            <!-- Orders Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th class="py-3 px-4">Orden / Folio</th>
                    <th class="py-3 px-4">Producto Terminado</th>
                    <th class="py-3 px-4 text-center">Cant. Plan / Prod</th>
                    <th class="py-3 px-4">Almacén Destino</th>
                    <th class="py-3 px-4">Costo Total ($ / Bs.)</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (order of filteredOrders(); track order.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-4">
                        <div class="font-bold text-slate-800 font-mono">{{ order.orderNumber }}</div>
                        <div class="text-[11px] text-slate-400 font-mono">{{ order.bomCode }} • {{ order.startDate.substring(0, 10) }}</div>
                      </td>
                      
                      <td class="py-3 px-4">
                        <div class="font-semibold text-slate-800">{{ order.finishedProductName }}</div>
                        <div class="text-[11px] text-slate-500 font-mono">SKU: {{ order.finishedProductSku }}</div>
                      </td>

                      <td class="py-3 px-4 text-center">
                        <span class="font-bold text-slate-800 text-sm">{{ order.quantityProduced }}</span>
                        <span class="text-slate-400"> / {{ order.quantityPlanned }}</span>
                        <div class="w-20 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            class="h-full rounded-full" 
                            [class]="order.status === 'COMPLETADA' ? 'bg-emerald-500' : 'bg-amber-500'"
                            [style.width.%]="(order.quantityProduced / (order.quantityPlanned || 1)) * 100">
                          </div>
                        </div>
                      </td>

                      <td class="py-3 px-4 text-slate-600">
                        <div class="flex items-center space-x-1">
                          <mat-icon class="text-slate-400 text-xs">store</mat-icon>
                          <span>{{ order.warehouseName }}</span>
                        </div>
                      </td>

                      <td class="py-3 px-4">
                        <div class="font-bold text-slate-800 font-mono">\${{ order.totalCost.toFixed(2) }}</div>
                        <div class="text-[10px] text-slate-400 font-mono">Unit: \${{ order.unitCost.toFixed(2) }}</div>
                      </td>

                      <td class="py-3 px-4 text-center">
                        <span 
                          class="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase"
                          [class]="order.status === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  (order.status === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  (order.status === 'CANCELADA' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'))">
                          {{ order.status }}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end space-x-1.5">
                          @if (order.status === 'PLANIFICADA') {
                            <button 
                              (click)="startOrder(order.id)"
                              title="Iniciar Producción"
                              class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all">
                              <mat-icon class="text-xs">play_arrow</mat-icon>
                              <span>Iniciar</span>
                            </button>
                          }

                          @if (order.status === 'EN_PROCESO') {
                            <button 
                              (click)="completeOrder(order.id)"
                              title="Liquidar Producción (Descuenta Insumos e Ingresa Producto Terminado)"
                              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all">
                              <mat-icon class="text-xs">check_circle</mat-icon>
                              <span>Liquidar</span>
                            </button>
                          }

                          @if (order.status === 'PLANIFICADA' || order.status === 'EN_PROCESO') {
                            <button 
                              (click)="cancelOrder(order.id)"
                              title="Cancelar Orden"
                              class="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-all">
                              <mat-icon class="text-sm">close</mat-icon>
                            </button>
                          }

                          <button 
                            (click)="viewOrderDetails(order)"
                            title="Ver Detalle y Explosión de Insumos"
                            class="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-all">
                            <mat-icon class="text-sm">visibility</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="text-center py-10 text-slate-400">
                        <mat-icon class="text-3xl text-slate-300">precision_manufacturing</mat-icon>
                        <p class="mt-1 text-xs">No hay órdenes de fabricación registradas en este estado.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

          </div>
        }

        <!-- TAB 2: LISTAS DE MATERIALES (BOM) -->
        @if (activeTab() === 'boms') {
          <div class="p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (bom of stateService.boms(); track bom.id) {
                <div class="border border-slate-200 rounded-xl p-5 hover:border-amber-400 transition-all bg-slate-50/30 flex flex-col justify-between">
                  <div>
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center space-x-2">
                          <span class="font-bold text-slate-800 text-sm font-mono">{{ bom.code }}</span>
                          <span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold">Lote: {{ bom.quantityToProduce }} un.</span>
                        </div>
                        <h4 class="font-bold text-slate-900 mt-1">{{ bom.finishedProductName }}</h4>
                        <p class="text-xs text-slate-500 font-mono">SKU: {{ bom.finishedProductSku }}</p>
                      </div>

                      <div class="text-right">
                        <p class="text-[10px] text-slate-400 uppercase font-semibold">Costo Unit. Estimado</p>
                        <p class="text-lg font-bold text-slate-900 font-mono">\${{ bom.unitCost.toFixed(2) }}</p>
                        <p class="text-[10px] text-slate-500 font-mono">Lote: \${{ bom.totalEstimatedCost.toFixed(2) }}</p>
                      </div>
                    </div>

                    <!-- Items Table -->
                    <div class="mt-4 pt-3 border-t border-slate-200/80">
                      <p class="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Materias Primas e Insumos ({{ bom.items.length }}):</p>
                      <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        @for (it of bom.items; track it.id) {
                          <div class="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-100">
                            <span class="font-medium text-slate-700 truncate max-w-[200px]">{{ it.rawMaterialName }}</span>
                            <span class="font-mono text-slate-500 shrink-0">{{ it.quantityNeeded }} {{ it.unit }} ({{ it.wastePercent }}% merma) • \${{ it.subtotalCost.toFixed(2) }}</span>
                          </div>
                        }
                      </div>

                      <div class="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-dashed border-slate-200">
                        <span>MOD: \${{ bom.laborCost.toFixed(2) }}</span>
                        <span>CIF: \${{ bom.overheadCost.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button 
                      (click)="viewBomDetails(bom)"
                      class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all">
                      <mat-icon class="text-xs">visibility</mat-icon>
                      <span>Ver Ficha Técnica</span>
                    </button>

                    <button 
                      (click)="createOrderFromBom(bom)"
                      class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition-all">
                      <mat-icon class="text-xs">add</mat-icon>
                      <span>Lanzar Producción</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 3: SIMULADOR EXPLOSIÓN DE MATERIALES (MRP) -->
        @if (activeTab() === 'simulator') {
          <div class="p-6 space-y-6">
            <div class="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-600">info</mat-icon>
                <h4 class="font-bold text-amber-900 text-xs uppercase tracking-wider">Explosión de Materiales y Disponibilidad en Almacén</h4>
              </div>
              <p class="text-xs text-amber-800 mt-1">
                Selecciona una fórmula BOM y la cantidad deseada para calcular los requerimientos netos de insumos, validar el stock actual en almacén y detectar posibles cuellos de botella.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="sim-bom" class="block text-xs font-semibold text-slate-700 mb-1">Seleccionar Fórmula BOM:</label>
                <select 
                  id="sim-bom"
                  [value]="selectedSimBomId()"
                  (change)="onSimBomChange($event)"
                  class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  @for (b of stateService.boms(); track b.id) {
                    <option [value]="b.id">{{ b.code }} - {{ b.finishedProductName }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="sim-qty" class="block text-xs font-semibold text-slate-700 mb-1">Cantidad a Producir:</label>
                <input 
                  id="sim-qty"
                  type="number" 
                  min="1" 
                  [value]="simQuantity()"
                  (input)="onSimQtyChange($event)"
                  class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>

              <div>
                <label for="sim-wh" class="block text-xs font-semibold text-slate-700 mb-1">Almacén de Validación:</label>
                <select 
                  id="sim-wh"
                  [value]="selectedSimWarehouseId()"
                  (change)="onSimWhChange($event)"
                  class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  @for (w of stateService.warehouses(); track w.id) {
                    <option [value]="w.id">{{ w.name }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Simulation Results Table -->
            @if (activeSimBom()) {
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-800">Requerimiento Calculado para {{ simQuantity() }} un. de {{ activeSimBom()?.finishedProductName }}</span>
                  <span class="text-xs font-mono font-bold text-amber-700">Costo Total Estimado: \${{ simulatedTotalCost().toFixed(2) }}</span>
                </div>

                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-white border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                      <th class="py-2.5 px-4">Insumo / Materia Prima</th>
                      <th class="py-2.5 px-4 text-center">Cant. Requerida</th>
                      <th class="py-2.5 px-4 text-center">Stock en Almacén</th>
                      <th class="py-2.5 px-4 text-center">Faltante / Sobrante</th>
                      <th class="py-2.5 px-4 text-right">Costo Estimado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (row of simulatedRows(); track row.sku) {
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-4">
                          <div class="font-semibold text-slate-800">{{ row.name }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">SKU: {{ row.sku }}</div>
                        </td>
                        <td class="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                          {{ row.neededQty }} {{ row.unit }}
                        </td>
                        <td class="py-2.5 px-4 text-center font-mono text-slate-600">
                          {{ row.availableQty }} {{ row.unit }}
                        </td>
                        <td class="py-2.5 px-4 text-center font-mono">
                          @if (row.isMissing) {
                            <span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              -{{ row.missingQty }} {{ row.unit }} (DÉFICIT)
                            </span>
                          } @else {
                            <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              +{{ row.surplusQty }} {{ row.unit }} (OK)
                            </span>
                          }
                        </td>
                        <td class="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                          \${{ row.estimatedCost.toFixed(2) }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

      </div>

      <!-- ========================================================= -->
      <!-- MODAL: NUEVA ORDEN DE FABRICACIÓN -->
      <!-- ========================================================= -->
      @if (showOrderModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-600">precision_manufacturing</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Crear Orden de Fabricación</h3>
              </div>
              <button (click)="closeOrderModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="orderForm" (ngSubmit)="submitOrderForm()" class="mt-4 space-y-4 text-xs">
              <div>
                <label for="ord-bom-id" class="block font-semibold text-slate-700 mb-1">Fórmula BOM / Producto a Fabricar *</label>
                <select id="ord-bom-id" formControlName="bomId" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  @for (b of stateService.boms(); track b.id) {
                    <option [value]="b.id">{{ b.code }} - {{ b.finishedProductName }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="ord-qty" class="block font-semibold text-slate-700 mb-1">Cantidad a Producir *</label>
                  <input id="ord-qty" type="number" min="1" formControlName="quantityPlanned" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label for="ord-target-date" class="block font-semibold text-slate-700 mb-1">Fecha Meta Entrega *</label>
                  <input id="ord-target-date" type="date" formControlName="targetEndDate" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label for="ord-wh-id" class="block font-semibold text-slate-700 mb-1">Almacén de Ejecución e Ingreso *</label>
                <select id="ord-wh-id" formControlName="warehouseId" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  @for (w of stateService.warehouses(); track w.id) {
                    <option [value]="w.id">{{ w.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="ord-notes" class="block font-semibold text-slate-700 mb-1">Notas / Instrucciones de Planta</label>
                <textarea id="ord-notes" formControlName="notes" rows="2" placeholder="Observaciones técnicas para operadores..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"></textarea>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeOrderModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all">Cancelar</button>
                <button type="submit" [disabled]="orderForm.invalid" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all">Generar Orden</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: NUEVA FÓRMULA BOM -->
      <!-- ========================================================= -->
      @if (showBomModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-600">hub</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Registrar Lista de Materiales (BOM)</h3>
              </div>
              <button (click)="closeBomModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="bomForm" (ngSubmit)="submitBomForm()" class="mt-4 space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="bom-code" class="block font-semibold text-slate-700 mb-1">Código / Folio BOM *</label>
                  <input id="bom-code" type="text" formControlName="code" placeholder="Ej: BOM-TERM-01" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase" />
                </div>
                <div>
                  <label for="bom-name" class="block font-semibold text-slate-700 mb-1">Nombre Descriptivo *</label>
                  <input id="bom-name" type="text" formControlName="name" placeholder="Ej: Ensamble Estándar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="bom-fin-prod" class="block font-semibold text-slate-700 mb-1">Producto Terminado a Fabricar *</label>
                  <select id="bom-fin-prod" formControlName="finishedProductId" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    @for (p of finishedProductsList(); track p.id) {
                      <option [value]="p.id">{{ p.sku }} - {{ p.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="bom-batch-qty" class="block font-semibold text-slate-700 mb-1">Tamaño de Lote Base (Unidades) *</label>
                  <input id="bom-batch-qty" type="number" min="1" formControlName="quantityToProduce" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <!-- BOM Items Array -->
              <div class="pt-3 border-t border-slate-100">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-slate-800 text-xs">Materias Primas e Insumos Requeridos</span>
                  <button type="button" (click)="addBomItem()" class="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg hover:bg-amber-100 flex items-center space-x-1">
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>Agregar Insumo</span>
                  </button>
                </div>

                <div formArrayName="items" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                  @for (it of bomItemsArray.controls; track $index; let i = $index) {
                    <div [formGroupName]="i" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div class="flex-1">
                        <select formControlName="rawMaterialProductId" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800">
                          @for (rm of rawMaterialsList(); track rm.id) {
                            <option [value]="rm.id">{{ rm.sku }} - {{ rm.name }} (Cost: \${{ rm.costPrice.toFixed(2) }})</option>
                          }
                        </select>
                      </div>
                      <div class="w-24">
                        <input type="number" step="0.01" min="0.01" formControlName="quantityNeeded" placeholder="Cant." class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold" />
                      </div>
                      <div class="w-20">
                        <input type="number" step="1" min="0" max="100" formControlName="wastePercent" placeholder="% Merma" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono" />
                      </div>
                      <button type="button" (click)="removeBomItem(i)" class="text-rose-500 hover:text-rose-700 p-1">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Costos Adicionales (MOD & CIF) -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label for="bom-labor-cost" class="block font-semibold text-slate-700 mb-1">Mano de Obra Directa ($ por Lote)</label>
                  <input id="bom-labor-cost" type="number" step="0.01" min="0" formControlName="laborCost" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800" />
                </div>
                <div>
                  <label for="bom-overhead-cost" class="block font-semibold text-slate-700 mb-1">Costos Indirectos CIF ($ por Lote)</label>
                  <input id="bom-overhead-cost" type="number" step="0.01" min="0" formControlName="overheadCost" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800" />
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeBomModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Cancelar</button>
                <button type="submit" [disabled]="bomForm.invalid" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm">Guardar BOM</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: DETALLE Y FICHA TÉCNICA DE ORDEN DE FABRICACIÓN -->
      <!-- ========================================================= -->
      @if (showOrderDetailsModal() && selectedOrderForDetails()) {
        @let ord = selectedOrderForDetails()!;
        @let bcv = stateService.bcvState();
        @let bom = getBomById(ord.bomId);
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <!-- Modal Header -->
            <div class="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-mono font-bold text-lg text-slate-900">{{ ord.orderNumber }}</span>
                  <span 
                    class="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase"
                    [class]="ord.status === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            (ord.status === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            (ord.status === 'CANCELADA' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'))">
                    {{ ord.status }}
                  </span>
                </div>
                <h3 class="text-sm font-bold text-slate-800 mt-1">{{ ord.finishedProductName }}</h3>
                <p class="text-xs text-slate-500 font-mono">SKU: {{ ord.finishedProductSku }} • Fórmula: {{ ord.bomCode }} • Almacén: {{ ord.warehouseName }}</p>
              </div>

              <button (click)="closeOrderDetailsModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Content -->
            <div class="mt-5 space-y-5 text-xs">
              
              <!-- Key Stats Bento -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span class="text-[10px] font-semibold uppercase text-slate-400 block">Cantidad Planificada</span>
                  <span class="text-base font-bold font-mono text-slate-900 mt-0.5 block">{{ ord.quantityPlanned }} un.</span>
                  <span class="text-[10px] text-slate-500">Producido: {{ ord.quantityProduced }} un.</span>
                </div>

                <div class="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                  <span class="text-[10px] font-semibold uppercase text-amber-700 block">Costo Total Orden</span>
                  <span class="text-base font-bold font-mono text-amber-900 mt-0.5 block">\${{ ord.totalCost.toFixed(2) }}</span>
                  <span class="text-[10px] text-amber-600 font-mono">Bs. {{ (ord.totalCost * bcv.usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</span>
                </div>

                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span class="text-[10px] font-semibold uppercase text-slate-400 block">Costo Unitario Efectivo</span>
                  <span class="text-base font-bold font-mono text-slate-900 mt-0.5 block">\${{ ord.unitCost.toFixed(2) }}</span>
                  <span class="text-[10px] text-slate-500 font-mono">Bs. {{ (ord.unitCost * bcv.usdRate).toFixed(2) }}</span>
                </div>

                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span class="text-[10px] font-semibold uppercase text-slate-400 block">Fecha Meta Entrega</span>
                  <span class="text-sm font-bold text-slate-800 mt-0.5 block">{{ ord.targetEndDate }}</span>
                  <span class="text-[10px] text-slate-500">Operador: {{ ord.operatorName }}</span>
                </div>
              </div>

              <!-- Cost Breakdown Summary -->
              <div class="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <div class="flex items-center space-x-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span class="text-slate-600">Materiales Directos:</span>
                  <span class="font-bold text-slate-900">\${{ ord.directMaterialCost.toFixed(2) }}</span>
                </div>
                <div class="flex items-center space-x-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span class="text-slate-600">Mano de Obra (MOD):</span>
                  <span class="font-bold text-slate-900">\${{ ord.laborCost.toFixed(2) }}</span>
                </div>
                <div class="flex items-center space-x-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span class="text-slate-600">Costos Indirectos (CIF):</span>
                  <span class="font-bold text-slate-900">\${{ ord.overheadCost.toFixed(2) }}</span>
                </div>
              </div>

              <!-- Explosion Table of Materials -->
              <div>
                <h4 class="font-bold text-slate-800 text-xs mb-2 flex items-center space-x-1.5">
                  <mat-icon class="text-sm text-amber-600">format_list_numbered</mat-icon>
                  <span>Explosión y Descuento de Materias Primas Requeridas:</span>
                </h4>
                
                @if (bom) {
                  @let factor = ord.quantityPlanned / (bom.quantityToProduce || 1);
                  <div class="border border-slate-200 rounded-xl overflow-hidden">
                    <table class="w-full text-left text-xs">
                      <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                          <th class="py-2.5 px-3">Materia Prima / Insumo</th>
                          <th class="py-2.5 px-3 text-center">Cant. Requerida</th>
                          <th class="py-2.5 px-3 text-center">Stock Almacén</th>
                          <th class="py-2.5 px-3 text-right">Costo Estimado</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (it of bom.items; track it.id) {
                          @let prod = getProductById(it.rawMaterialProductId);
                          @let needed = (it.quantityNeeded * factor * (1 + (it.wastePercent / 100)));
                          @let stockInWh = getStockInWarehouse(it.rawMaterialProductId, ord.warehouseId);
                          <tr class="hover:bg-slate-50/60">
                            <td class="py-2 px-3">
                              <div class="font-semibold text-slate-800">{{ it.rawMaterialName }}</div>
                              <div class="text-[10px] text-slate-400 font-mono">SKU: {{ it.rawMaterialSku }} • Merma: {{ it.wastePercent }}%</div>
                            </td>
                            <td class="py-2 px-3 text-center font-mono font-bold text-slate-900">
                              {{ needed.toFixed(2) }} {{ it.unit }}
                            </td>
                            <td class="py-2 px-3 text-center font-mono">
                              <span 
                                class="px-2 py-0.5 rounded text-[10px] font-semibold"
                                [class]="stockInWh >= needed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
                                {{ stockInWh }} {{ it.unit }}
                              </span>
                            </td>
                            <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              \${{ (needed * (prod?.costPrice || it.estimatedUnitCost)).toFixed(2) }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

              <!-- Production & Accounting Integration Card -->
              <div class="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <div class="flex items-center space-x-1.5 font-bold">
                  <mat-icon class="text-sm text-emerald-700">account_balance</mat-icon>
                  <span>Automatización Contable y Kardex:</span>
                </div>
                <p class="text-[11px] text-emerald-800">
                  Al liquidar la orden, el sistema descuenta automáticamente los insumos con movimiento <code class="font-bold">SALIDA_PRODUCCION</code>, ingresa el producto terminado con movimiento <code class="font-bold">ENTRADA_PRODUCCION</code> y genera el asiento contable de partida doble afectando la cuenta <code class="font-bold">1.1.03.01 (Productos Terminados)</code> contra <code class="font-bold">1.1.03.02 (Materias Primas)</code> y costos de transformación.
                </p>
              </div>

              @if (ord.notes) {
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span class="font-bold text-slate-700 block mb-0.5">Notas de Fabricación:</span>
                  <p class="text-slate-600">{{ ord.notes }}</p>
                </div>
              }

            </div>

            <!-- Modal Footer Actions -->
            <div class="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button 
                (click)="closeOrderDetailsModal()" 
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs">
                Cerrar
              </button>

              <div class="flex items-center space-x-2">
                @if (ord.status === 'PLANIFICADA') {
                  <button 
                    (click)="startOrderFromModal(ord.id)"
                    class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-sm">
                    <mat-icon class="text-sm">play_arrow</mat-icon>
                    <span>Iniciar Producción en Planta</span>
                  </button>
                }

                @if (ord.status === 'EN_PROCESO') {
                  <button 
                    (click)="completeOrderFromModal(ord.id)"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-sm">
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span>Liquidar Producción (Consumir Insumos e Ingresar PT)</span>
                  </button>
                }

                @if (ord.status === 'PLANIFICADA' || ord.status === 'EN_PROCESO') {
                  <button 
                    (click)="openCancelModal(ord.id)"
                    class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs flex items-center space-x-1">
                    <mat-icon class="text-sm">cancel</mat-icon>
                    <span>Cancelar Orden</span>
                  </button>
                }
              </div>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: FICHA TÉCNICA DE FORMULA BOM -->
      <!-- ========================================================= -->
      @if (showBomDetailModal() && selectedBomForDetails()) {
        @let bom = selectedBomForDetails()!;
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div class="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-mono font-bold text-base text-amber-700">{{ bom.code }}</span>
                  <span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold">Lote: {{ bom.quantityToProduce }} un.</span>
                </div>
                <h3 class="text-base font-bold text-slate-800 mt-1">{{ bom.finishedProductName }}</h3>
                <p class="text-xs text-slate-500 font-mono">SKU: {{ bom.finishedProductSku }}</p>
              </div>

              <button (click)="closeBomDetailModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="mt-4 space-y-4 text-xs">
              <div class="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono">
                <div>
                  <span class="text-[10px] text-slate-400 uppercase font-semibold block">Costo Total Lote</span>
                  <span class="text-base font-bold text-slate-900">\${{ bom.totalEstimatedCost.toFixed(2) }}</span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-400 uppercase font-semibold block">Costo Unit. Estimado</span>
                  <span class="text-base font-bold text-amber-700">\${{ bom.unitCost.toFixed(2) }}</span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-400 uppercase font-semibold block">Total Insumos</span>
                  <span class="text-base font-bold text-slate-800">{{ bom.items.length }} tipos</span>
                </div>
              </div>

              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th class="py-2.5 px-3">Insumo Requerido</th>
                      <th class="py-2.5 px-3 text-center">Cant. / Lote</th>
                      <th class="py-2.5 px-3 text-center">% Merma</th>
                      <th class="py-2.5 px-3 text-right">Subtotal ($)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (it of bom.items; track it.id) {
                      <tr class="hover:bg-slate-50">
                        <td class="py-2 px-3">
                          <div class="font-semibold text-slate-800">{{ it.rawMaterialName }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">SKU: {{ it.rawMaterialSku }}</div>
                        </td>
                        <td class="py-2 px-3 text-center font-mono font-semibold text-slate-800">{{ it.quantityNeeded }} {{ it.unit }}</td>
                        <td class="py-2 px-3 text-center font-mono text-slate-500">{{ it.wastePercent }}%</td>
                        <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">\${{ it.subtotalCost.toFixed(2) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-700">
                <div>Mano de Obra Directa (MOD): <strong class="text-slate-900">\${{ bom.laborCost.toFixed(2) }}</strong></div>
                <div>Costos Indirectos (CIF): <strong class="text-slate-900">\${{ bom.overheadCost.toFixed(2) }}</strong></div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button (click)="closeBomDetailModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs">Cerrar</button>
              <button (click)="createOrderFromBom(bom); closeBomDetailModal()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 shadow-sm">
                <mat-icon class="text-xs">precision_manufacturing</mat-icon>
                <span>Crear Orden desde esta BOM</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: CONFIRMACIÓN DE CANCELACIÓN DE ORDEN -->
      <!-- ========================================================= -->
      @if (showCancelModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center space-x-2 text-rose-600 mb-3">
              <mat-icon>warning</mat-icon>
              <h3 class="text-base font-bold text-slate-900">Cancelar Orden de Fabricación</h3>
            </div>
            
            <p class="text-xs text-slate-600 mb-3">
              Por favor indica el motivo técnico o administrativo de la cancelación:
            </p>

            <div>
              <label for="cancel-reason-input" class="block font-semibold text-slate-700 text-xs mb-1">Motivo de Cancelación *</label>
              <textarea 
                id="cancel-reason-input"
                [value]="cancelReason()"
                (input)="onCancelReasonInput($event)"
                rows="3" 
                placeholder="Ej: Falta de insumos importados / Cambio en especificación del cliente..."
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none">
              </textarea>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button (click)="closeCancelModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs">Atrás</button>
              <button 
                [disabled]="!cancelReason().trim()"
                (click)="confirmCancelOrder()" 
                class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-sm">
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class MrpComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  fb = inject(FormBuilder);

  activeTab = signal<'orders' | 'boms' | 'simulator'>('orders');
  selectedStatusFilter = signal<string>('ALL');

  // Modals
  showOrderModal = signal<boolean>(false);
  showBomModal = signal<boolean>(false);
  showOrderDetailsModal = signal<boolean>(false);
  selectedOrderForDetails = signal<ProductionOrder | null>(null);
  showBomDetailModal = signal<boolean>(false);
  selectedBomForDetails = signal<Bom | null>(null);
  showCancelModal = signal<boolean>(false);
  orderToCancelId = signal<string>('');
  cancelReason = signal<string>('');

  // Simulator
  selectedSimBomId = signal<string>('');
  simQuantity = signal<number>(10);
  selectedSimWarehouseId = signal<string>('');

  // Forms
  orderForm = this.fb.group({
    bomId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    quantityPlanned: [10, [Validators.required, Validators.min(1)]],
    targetEndDate: [new Date().toISOString().substring(0, 10), Validators.required],
    notes: ['']
  });

  bomForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    finishedProductId: ['', Validators.required],
    quantityToProduce: [1, [Validators.required, Validators.min(1)]],
    laborCost: [0, Validators.min(0)],
    overheadCost: [0, Validators.min(0)],
    items: this.fb.array([])
  });

  get bomItemsArray() {
    return this.bomForm.get('items') as FormArray;
  }

  // Computed Values
  activeOrdersCount = computed(() => {
    return this.stateService.productionOrders().filter(o => o.status === 'EN_PROCESO' || o.status === 'PLANIFICADA').length;
  });

  completedOrdersCount = computed(() => {
    return this.stateService.productionOrders().filter(o => o.status === 'COMPLETADA').length;
  });

  totalWipValue = computed(() => {
    return this.stateService.productionOrders()
      .filter(o => o.status === 'EN_PROCESO' || o.status === 'PLANIFICADA')
      .reduce((sum, o) => sum + o.totalCost, 0);
  });

  filteredOrders = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'ALL') return this.stateService.productionOrders();
    return this.stateService.productionOrders().filter(o => o.status === filter);
  });

  finishedProductsList = computed(() => {
    return this.stateService.products().filter(p => p.category !== 'MATERIA_PRIMA');
  });

  rawMaterialsList = computed(() => {
    return this.stateService.products().filter(p => p.category === 'MATERIA_PRIMA' || p.category === 'FABRICACION');
  });

  activeSimBom = computed(() => {
    const bomId = this.selectedSimBomId() || this.stateService.boms()[0]?.id;
    return this.stateService.boms().find(b => b.id === bomId) || null;
  });

  simulatedTotalCost = computed(() => {
    const bom = this.activeSimBom();
    if (!bom) return 0;
    const factor = this.simQuantity() / (bom.quantityToProduce || 1);
    return bom.totalEstimatedCost * factor;
  });

  simulatedRows = computed(() => {
    const bom = this.activeSimBom();
    if (!bom) return [];

    const factor = this.simQuantity() / (bom.quantityToProduce || 1);
    const whId = this.selectedSimWarehouseId() || this.stateService.warehouses()[0]?.id;
    const allProds = this.stateService.products();

    return bom.items.map(it => {
      const prod = allProds.find(p => p.id === it.rawMaterialProductId);
      const neededQty = Number((it.quantityNeeded * factor * (1 + (it.wastePercent / 100))).toFixed(2));
      const availableQty = prod?.stockByWarehouse.find(w => w.warehouseId === whId)?.quantity || prod?.totalStock || 0;
      const isMissing = availableQty < neededQty;
      const missingQty = isMissing ? Number((neededQty - availableQty).toFixed(2)) : 0;
      const surplusQty = !isMissing ? Number((availableQty - neededQty).toFixed(2)) : 0;
      const estimatedCost = Number((neededQty * (prod?.costPrice || it.estimatedUnitCost)).toFixed(2));

      return {
        sku: it.rawMaterialSku,
        name: it.rawMaterialName,
        unit: it.unit,
        neededQty,
        availableQty,
        isMissing,
        missingQty,
        surplusQty,
        estimatedCost
      };
    });
  });

  constructor() {
    const firstBom = this.stateService.boms()[0];
    if (firstBom) {
      this.selectedSimBomId.set(firstBom.id);
    }
    const firstWh = this.stateService.warehouses()[0];
    if (firstWh) {
      this.selectedSimWarehouseId.set(firstWh.id);
    }
  }

  getProductById(productId: string) {
    return this.stateService.products().find(p => p.id === productId);
  }

  getStockInWarehouse(productId: string, warehouseId: string): number {
    const prod = this.getProductById(productId);
    if (!prod) return 0;
    const whStock = prod.stockByWarehouse.find(w => w.warehouseId === warehouseId);
    return whStock ? whStock.quantity : prod.totalStock;
  }

  getBomById(bomId: string) {
    return this.stateService.boms().find(b => b.id === bomId);
  }

  onStatusFilterChange(event: Event) {
    this.selectedStatusFilter.set((event.target as HTMLSelectElement).value);
  }

  onSimBomChange(event: Event) {
    this.selectedSimBomId.set((event.target as HTMLSelectElement).value);
  }

  onSimQtyChange(event: Event) {
    const val = Number((event.target as HTMLInputElement).value) || 1;
    this.simQuantity.set(val);
  }

  onSimWhChange(event: Event) {
    this.selectedSimWarehouseId.set((event.target as HTMLSelectElement).value);
  }

  openNewOrderModal() {
    const firstBom = this.stateService.boms()[0];
    const firstWh = this.stateService.warehouses()[0];
    this.orderForm.patchValue({
      bomId: firstBom?.id || '',
      warehouseId: firstWh?.id || '',
      quantityPlanned: 10,
      targetEndDate: new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10),
      notes: ''
    });
    this.showOrderModal.set(true);
  }

  closeOrderModal() {
    this.showOrderModal.set(false);
  }

  createOrderFromBom(bom: Bom) {
    const firstWh = this.stateService.warehouses()[0];
    this.orderForm.patchValue({
      bomId: bom.id,
      warehouseId: firstWh?.id || '',
      quantityPlanned: bom.quantityToProduce,
      targetEndDate: new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10),
      notes: `Producción lanzada desde plantilla ${bom.code}`
    });
    this.showOrderModal.set(true);
  }

  submitOrderForm() {
    if (this.orderForm.invalid) return;
    const v = this.orderForm.value;
    const res = this.stateService.createProductionOrder({
      bomId: v.bomId!,
      warehouseId: v.warehouseId!,
      quantityPlanned: Number(v.quantityPlanned!),
      targetEndDate: v.targetEndDate!,
      notes: v.notes || undefined
    });

    if (res.success) {
      this.closeOrderModal();
    }
  }

  startOrder(orderId: string) {
    this.stateService.startProductionOrder(orderId);
  }

  completeOrder(orderId: string) {
    this.stateService.completeProductionOrder(orderId);
  }

  viewOrderDetails(order: ProductionOrder) {
    this.selectedOrderForDetails.set(order);
    this.showOrderDetailsModal.set(true);
  }

  closeOrderDetailsModal() {
    this.showOrderDetailsModal.set(false);
    this.selectedOrderForDetails.set(null);
  }

  startOrderFromModal(orderId: string) {
    this.startOrder(orderId);
    const updated = this.stateService.productionOrders().find(o => o.id === orderId);
    if (updated) this.selectedOrderForDetails.set(updated);
  }

  completeOrderFromModal(orderId: string) {
    const res = this.stateService.completeProductionOrder(orderId);
    if (res.success) {
      const updated = this.stateService.productionOrders().find(o => o.id === orderId);
      if (updated) this.selectedOrderForDetails.set(updated);
    }
  }

  viewBomDetails(bom: Bom) {
    this.selectedBomForDetails.set(bom);
    this.showBomDetailModal.set(true);
  }

  closeBomDetailModal() {
    this.showBomDetailModal.set(false);
    this.selectedBomForDetails.set(null);
  }

  openCancelModal(orderId: string) {
    this.orderToCancelId.set(orderId);
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  closeCancelModal() {
    this.showCancelModal.set(false);
    this.orderToCancelId.set('');
    this.cancelReason.set('');
  }

  onCancelReasonInput(event: Event) {
    this.cancelReason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmCancelOrder() {
    const id = this.orderToCancelId();
    const reason = this.cancelReason().trim();
    if (id && reason) {
      this.stateService.cancelProductionOrder(id, reason);
      this.closeCancelModal();
      if (this.showOrderDetailsModal()) {
        const updated = this.stateService.productionOrders().find(o => o.id === id);
        if (updated) this.selectedOrderForDetails.set(updated);
      }
    }
  }

  cancelOrder(orderId: string) {
    this.openCancelModal(orderId);
  }

  openNewBomModal() {
    const firstFin = this.finishedProductsList()[0];
    this.bomItemsArray.clear();
    this.bomForm.patchValue({
      code: 'BOM-' + Math.floor(Math.random() * 899 + 100),
      name: '',
      finishedProductId: firstFin?.id || '',
      quantityToProduce: 1,
      laborCost: 15.00,
      overheadCost: 5.00
    });
    this.addBomItem();
    this.showBomModal.set(true);
  }

  closeBomModal() {
    this.showBomModal.set(false);
  }

  addBomItem() {
    const firstRaw = this.rawMaterialsList()[0];
    this.bomItemsArray.push(
      this.fb.group({
        rawMaterialProductId: [firstRaw?.id || '', Validators.required],
        quantityNeeded: [1, [Validators.required, Validators.min(0.01)]],
        wastePercent: [2, [Validators.required, Validators.min(0)]]
      })
    );
  }

  removeBomItem(index: number) {
    if (this.bomItemsArray.length > 1) {
      this.bomItemsArray.removeAt(index);
    }
  }

  submitBomForm() {
    if (this.bomForm.invalid) return;
    const v = this.bomForm.value;
    const items = (v.items as { rawMaterialProductId: string; quantityNeeded: number; wastePercent: number }[]).map(it => ({
      rawMaterialProductId: it.rawMaterialProductId,
      quantityNeeded: Number(it.quantityNeeded),
      wastePercent: Number(it.wastePercent)
    }));

    const res = this.stateService.createBom({
      code: v.code!,
      name: v.name!,
      finishedProductId: v.finishedProductId!,
      quantityToProduce: Number(v.quantityToProduce!),
      items,
      laborCost: Number(v.laborCost || 0),
      overheadCost: Number(v.overheadCost || 0)
    });

    if (res.success) {
      this.closeBomModal();
    }
  }
}
