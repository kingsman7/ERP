import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Bom, ProductionOrder, Product, EmailAlertLog } from '../../models/erp.models';

@Component({
  selector: 'app-mrp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- TOP HEADER & TITLE -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
              FASE 2 • MANUFACTURA & MRP
            </span>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Planificación y Control de Producción (MRP)
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de fórmulas BOM, explosión de insumos, órdenes de fabricación y alertas automáticas por email ante descensos del punto de reorden.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          
          <!-- Email Notification Quick Config Button -->
          <button 
            type="button"
            (click)="openEmailConfigModal()" 
            class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer">
            <mat-icon class="text-emerald-600 text-base">forward_to_inbox</mat-icon>
            <span>Alertas Email</span>
            @if (emailService.reorderCount() > 0) {
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-mono">
                {{ emailService.reorderCount() }}
              </span>
            }
          </button>

          <button 
            type="button"
            (click)="openNewBomModal()" 
            class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer">
            <mat-icon class="text-amber-500 text-base">format_list_bulleted</mat-icon>
            <span>Nueva Fórmula BOM</span>
          </button>

          <button 
            type="button"
            (click)="openNewOrderModal()" 
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md flex items-center space-x-1.5 transition-all cursor-pointer">
            <mat-icon class="text-base">add_circle</mat-icon>
            <span>Crear Orden Fabricación</span>
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Bento Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Órdenes en Planta</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ activeOrdersCount() }}</h3>
            <p class="text-[11px] text-amber-600 font-medium mt-0.5">En proceso o planificadas</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <mat-icon class="text-xl">precision_manufacturing</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fórmulas BOM Activas</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ stateService.boms().length }}</h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">Estructuras de ensamble</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">account_tree</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Insumos Bajo Pto. Reorden</p>
            <div class="flex items-baseline space-x-2 mt-1">
              <h3 class="text-2xl font-bold font-mono" [class]="emailService.reorderCount() > 0 ? 'text-rose-600' : 'text-slate-800'">
                {{ emailService.reorderCount() }}
              </h3>
              @if (emailService.criticalCount() > 0) {
                <span class="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  {{ emailService.criticalCount() }} Críticos
                </span>
              }
            </div>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Alertas de compra por email</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <mat-icon class="text-xl">notification_important</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valor en Fabricación</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ totalWipValue().toFixed(2) }}</h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Bs. {{ (totalWipValue() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <mat-icon class="text-xl">monetization_on</mat-icon>
          </div>
        </div>

      </div>

      <!-- MAIN TABS: Órdenes, Fórmulas BOM, Simulador MRP, Alertas Email & Punto de Reorden -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <!-- Tab Bar -->
        <div class="flex items-center justify-between px-6 border-b border-slate-100 overflow-x-auto">
          <div class="flex space-x-6">
            <button 
              type="button"
              (click)="activeTab.set('orders')"
              [class]="activeTab() === 'orders' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2 cursor-pointer">
              <mat-icon class="text-base">assignment</mat-icon>
              <span>Órdenes de Fabricación ({{ stateService.productionOrders().length }})</span>
            </button>

            <button 
              type="button"
              (click)="activeTab.set('boms')"
              [class]="activeTab() === 'boms' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2 cursor-pointer">
              <mat-icon class="text-base">hub</mat-icon>
              <span>Estructura de Materiales BOM ({{ stateService.boms().length }})</span>
            </button>

            <button 
              type="button"
              (click)="activeTab.set('simulator')"
              [class]="activeTab() === 'simulator' ? 'border-b-2 border-amber-600 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2 cursor-pointer">
              <mat-icon class="text-base">calculate</mat-icon>
              <span>Simulador / Explosión de Materiales MRP</span>
            </button>

            <button 
              type="button"
              (click)="activeTab.set('reorder-alerts')"
              [class]="activeTab() === 'reorder-alerts' ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2 cursor-pointer">
              <mat-icon class="text-base text-emerald-600">mail</mat-icon>
              <span>Alertas Email & Punto de Reorden</span>
              @if (emailService.reorderCount() > 0) {
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-mono">
                  {{ emailService.reorderCount() }}
                </span>
              }
            </button>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- TAB 1: ÓRDENES DE FABRICACIÓN -->
        <!-- ========================================================= -->
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
                              type="button"
                              (click)="startOrder(order.id)"
                              title="Iniciar Producción"
                              class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
                              <mat-icon class="text-xs">play_arrow</mat-icon>
                              <span>Iniciar</span>
                            </button>
                          }

                          @if (order.status === 'EN_PROCESO') {
                            <button 
                              type="button"
                              (click)="completeOrder(order.id)"
                              title="Liquidar Producción (Descuenta Insumos y Alerta Email si baja del Punto de Reorden)"
                              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition-all cursor-pointer">
                              <mat-icon class="text-xs">check_circle</mat-icon>
                              <span>Liquidar</span>
                            </button>
                          }

                          @if (order.status === 'PLANIFICADA' || order.status === 'EN_PROCESO') {
                            <button 
                              type="button"
                              (click)="cancelOrder(order.id)"
                              title="Cancelar Orden"
                              class="p-1 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer">
                              <mat-icon class="text-sm">close</mat-icon>
                            </button>
                          }

                          <button 
                            type="button"
                            (click)="viewOrderDetails(order)"
                            title="Ver Detalle y Explosión de Insumos"
                            class="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer">
                            <mat-icon class="text-sm">visibility</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-12 text-center text-slate-400">
                        <mat-icon class="text-3xl text-slate-300 mb-1">precision_manufacturing</mat-icon>
                        <p class="font-medium">No hay órdenes de fabricación registradas.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

          </div>
        }

        <!-- ========================================================= -->
        <!-- TAB 2: FÓRMULAS / ESTRUCTURAS BOM -->
        <!-- ========================================================= -->
        @if (activeTab() === 'boms') {
          <div class="p-6 space-y-4">
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (bom of stateService.boms(); track bom.id) {
                <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
                  <div>
                    <div class="flex items-start justify-between">
                      <span class="px-2 py-0.5 text-[10px] font-bold font-mono bg-amber-50 text-amber-800 rounded border border-amber-200">
                        {{ bom.code }}
                      </span>
                      <span class="text-xs font-mono font-bold text-slate-900">
                        \${{ bom.unitCost.toFixed(2) }} / un.
                      </span>
                    </div>

                    <h3 class="text-sm font-bold text-slate-800 mt-2">{{ bom.name }}</h3>
                    <p class="text-xs text-slate-500 font-mono mt-0.5">Produce: {{ bom.finishedProductName }}</p>
                    
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div class="flex justify-between">
                        <span>Lote Base:</span>
                        <span class="font-bold text-slate-800">{{ bom.quantityToProduce }} unidades</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Materias Primas:</span>
                        <span class="font-semibold text-slate-800">{{ bom.items.length }} insumos</span>
                      </div>
                      <div class="flex justify-between">
                        <span>MOD + CIF:</span>
                        <span class="font-mono">\${{ (bom.laborCost + bom.overheadCost).toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button 
                      type="button"
                      (click)="viewBomDetails(bom)"
                      class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer">
                      <mat-icon class="text-xs">visibility</mat-icon>
                      <span>Ver Ficha</span>
                    </button>

                    <button 
                      type="button"
                      (click)="createOrderFromBom(bom)"
                      class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 shadow-xs cursor-pointer">
                      <mat-icon class="text-xs">add</mat-icon>
                      <span>Lanzar Orden</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="col-span-full py-12 text-center text-slate-400">
                  <mat-icon class="text-3xl text-slate-300 mb-1">hub</mat-icon>
                  <p class="font-medium">No se han registrado listas de materiales (BOM).</p>
                </div>
              }
            </div>

          </div>
        }

        <!-- ========================================================= -->
        <!-- TAB 3: SIMULADOR & EXPLOSIÓN DE MATERIALES MRP -->
        <!-- ========================================================= -->
        @if (activeTab() === 'simulator') {
          <div class="p-6 space-y-6">
            
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
                <mat-icon class="text-amber-600 text-base">tune</mat-icon>
                <span>Parámetros de Simulación de Producción</span>
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label for="sim-bom" class="block text-xs font-semibold text-slate-700 mb-1">Fórmula BOM a Evaluar</label>
                  <select 
                    id="sim-bom"
                    [value]="simulatedBomId()"
                    (change)="simulatedBomId.set($any($event.target).value)"
                    class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    @for (bom of stateService.boms(); track bom.id) {
                      <option [value]="bom.id">{{ bom.code }} - {{ bom.finishedProductName }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label for="sim-qty" class="block text-xs font-semibold text-slate-700 mb-1">Cantidad a Producir (Unidades)</label>
                  <input 
                    id="sim-qty"
                    type="number" 
                    min="1" 
                    [value]="simulatedQuantity()"
                    (input)="simulatedQuantity.set(+$any($event.target).value || 1)"
                    class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>

                <div>
                  <label for="sim-wh" class="block text-xs font-semibold text-slate-700 mb-1">Almacén de Insumos</label>
                  <select 
                    id="sim-wh"
                    [value]="simulatedWarehouseId()"
                    (change)="simulatedWarehouseId.set($any($event.target).value)"
                    class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    @for (wh of stateService.warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <!-- Simulation Results Explosion Table -->
            @if (simulatedExplosion(); as sim) {
              <div class="space-y-4">
                
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Explosión de Necesidades de Materiales (MRP)</h4>
                    <p class="text-xs text-slate-500">Requerimientos calculados con merma estimada vs disponibilidad real en almacén.</p>
                  </div>

                  <div class="flex items-center space-x-2">
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [class]="sim.isFullyAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                      {{ sim.isFullyAvailable ? 'STOCK COMPLETO DISPONIBLE' : 'DÉFICIT DE MATERIAS PRIMAS' }}
                    </span>
                  </div>
                </div>

                <div class="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                        <th class="py-3 px-4">Materia Prima</th>
                        <th class="py-3 px-4 text-center">Cant. Requerida</th>
                        <th class="py-3 px-4 text-center">Stock Almacén</th>
                        <th class="py-3 px-4 text-center">Punto Reorden</th>
                        <th class="py-3 px-4 text-center">Balance Post-Producción</th>
                        <th class="py-3 px-4 text-right">Costo Estimado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (item of sim.items; track item.rawMaterialProductId) {
                        <tr class="hover:bg-slate-50/80 transition-colors">
                          <td class="py-3 px-4">
                            <div class="font-bold text-slate-800">{{ item.rawMaterialName }}</div>
                            <div class="text-[11px] text-slate-400 font-mono">SKU: {{ item.rawMaterialSku }}</div>
                          </td>
                          <td class="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {{ item.quantityRequired.toFixed(2) }} {{ item.unit }}
                          </td>
                          <td class="py-3 px-4 text-center font-mono font-medium text-slate-600">
                            {{ item.stockInWarehouse.toFixed(2) }} {{ item.unit }}
                          </td>
                          <td class="py-3 px-4 text-center font-mono text-slate-500">
                            {{ item.reorderPoint }} {{ item.unit }}
                          </td>
                          <td class="py-3 px-4 text-center font-mono font-bold" [class]="item.balancePostProduction < item.reorderPoint ? 'text-rose-600' : 'text-emerald-700'">
                            {{ item.balancePostProduction.toFixed(2) }} {{ item.unit }}
                            @if (item.balancePostProduction < item.reorderPoint) {
                              <span class="block text-[9px] text-rose-500 font-semibold">ALERTA REORDEN</span>
                            }
                          </td>
                          <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            \${{ item.subtotalCost.toFixed(2) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

              </div>
            }

          </div>
        }

        <!-- ========================================================= -->
        <!-- TAB 4: ALERTAS POR EMAIL & PUNTO DE REORDEN MRP -->
        <!-- ========================================================= -->
        @if (activeTab() === 'reorder-alerts') {
          <div class="p-6 space-y-6">
            
            <!-- Summary Stats Banner -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80">
                <span class="text-[11px] font-bold uppercase text-rose-700 block">Insumos Bajo Pto. Reorden</span>
                <p class="text-2xl font-bold font-mono text-rose-900 mt-1">{{ emailService.reorderCount() }}</p>
                <span class="text-[10px] text-rose-600">Requieren reabastecimiento</span>
              </div>

              <div class="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                <span class="text-[11px] font-bold uppercase text-amber-700 block">Nivel Crítico (Bajo Mínimo)</span>
                <p class="text-2xl font-bold font-mono text-amber-900 mt-1">{{ emailService.criticalCount() }}</p>
                <span class="text-[10px] text-amber-600">Riesgo inminente de parada</span>
              </div>

              <div class="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                <span class="text-[11px] font-bold uppercase text-emerald-700 block">Presupuesto Sugerido MRP</span>
                <p class="text-2xl font-bold font-mono text-emerald-900 mt-1">\${{ totalReorderBudgetUsd().toFixed(2) }}</p>
                <span class="text-[10px] text-emerald-600 font-mono">
                  Bs. {{ (totalReorderBudgetUsd() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
                </span>
              </div>

              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span class="text-[11px] font-bold uppercase text-slate-600 block">Alertas Email Despachadas</span>
                <p class="text-2xl font-bold font-mono text-slate-900 mt-1">{{ emailService.sentAlerts().length }}</p>
                <span class="text-[10px] text-slate-500">Historial de notificaciones</span>
              </div>
            </div>

            <!-- Toolbar Actions for Email Alerts -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" [class]="emailService.config().enabled ? 'bg-emerald-500' : 'bg-slate-400'"></div>
                <span class="text-xs font-bold text-slate-800">
                  Motor de Alertas por Email: {{ emailService.config().enabled ? 'ACTIVO (Automático)' : 'INACTIVO' }}
                </span>
                <span class="text-xs text-slate-400">|</span>
                <span class="text-xs text-slate-500">
                  {{ emailService.config().recipients.length }} Destinatario(s) configurados
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button 
                  type="button"
                  (click)="triggerManualScan()"
                  title="Escanear inventario completo y despachar alertas a los correos configurados"
                  class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer">
                  <mat-icon class="text-sm">send</mat-icon>
                  <span>Notificar Reorden Ahora</span>
                </button>

                <button 
                  type="button"
                  (click)="emailService.sendTestEmail()"
                  title="Enviar correo de prueba de conectividad y plantilla HTML"
                  class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
                  <mat-icon class="text-sm text-slate-500">mark_email_read</mat-icon>
                  <span>Probar Envío</span>
                </button>

                <button 
                  type="button"
                  (click)="openEmailConfigModal()"
                  title="Configurar servidor SMTP y lista de correos de compras/gerencia"
                  class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
                  <mat-icon class="text-sm text-slate-500">settings</mat-icon>
                  <span>Ajustes SMTP</span>
                </button>

                <button 
                  type="button"
                  (click)="emailService.exportLogsToCsv()"
                  title="Descargar historial de alertas por email en formato CSV"
                  class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer">
                  <mat-icon class="text-sm text-slate-500">file_download</mat-icon>
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <!-- LIVE REORDER MONITOR TABLE -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <mat-icon class="text-rose-600 text-base">warning</mat-icon>
                    <span>Monitor de Existencias vs Punto de Reorden (MRP)</span>
                  </h3>
                  <p class="text-xs text-slate-500">Insumos y materias primas cuyo stock actual es menor o igual al umbral de reabastecimiento.</p>
                </div>
              </div>

              <div class="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th class="py-3 px-4">Insumo / Materia Prima</th>
                      <th class="py-3 px-4 text-center">Stock Actual</th>
                      <th class="py-3 px-4 text-center">Pto. Reorden</th>
                      <th class="py-3 px-4 text-center">Stock Mínimo</th>
                      <th class="py-3 px-4 text-center">Déficit</th>
                      <th class="py-3 px-4 text-center">Lote Sugerido (EOQ)</th>
                      <th class="py-3 px-4 text-right">Presupuesto ($ / Bs.)</th>
                      <th class="py-3 px-4 text-center">Severidad</th>
                      <th class="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of emailService.reorderItems(); track item.product.id) {
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        
                        <td class="py-3 px-4">
                          <div class="font-bold text-slate-900">{{ item.product.name }}</div>
                          <div class="text-[11px] text-slate-400 font-mono">
                            SKU: {{ item.product.sku }} • {{ item.product.category }}
                          </div>
                        </td>

                        <td class="py-3 px-4 text-center">
                          <span class="font-mono font-bold text-sm text-rose-600">
                            {{ item.currentStock }} {{ item.product.unit }}
                          </span>
                        </td>

                        <td class="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                          {{ item.reorderPoint }} {{ item.product.unit }}
                        </td>

                        <td class="py-3 px-4 text-center font-mono text-slate-500">
                          {{ item.minStock }} {{ item.product.unit }}
                        </td>

                        <td class="py-3 px-4 text-center font-mono font-bold text-rose-700">
                          -{{ item.deficit }} {{ item.product.unit }}
                        </td>

                        <td class="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                          {{ item.suggestedOrderQty }} {{ item.product.unit }}
                        </td>

                        <td class="py-3 px-4 text-right font-mono">
                          <div class="font-bold text-slate-900">\${{ item.estimatedCostUsd.toFixed(2) }}</div>
                          <div class="text-[10px] text-slate-400">Bs. {{ item.estimatedCostVes.toLocaleString('es-VE') }}</div>
                        </td>

                        <td class="py-3 px-4 text-center">
                          <span 
                            class="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block"
                            [class]="item.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'">
                            {{ item.severity === 'CRITICAL' ? 'CRÍTICO' : 'REORDEN' }}
                          </span>
                        </td>

                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <button 
                            type="button"
                            (click)="emailService.sendManualAlert(item.product)"
                            title="Enviar alerta por email inmediata para este insumo"
                            class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer transition-colors">
                            <mat-icon class="text-xs">forward_to_inbox</mat-icon>
                            <span>Notificar</span>
                          </button>
                        </td>

                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="9" class="py-12 text-center text-slate-400">
                          <mat-icon class="text-3xl text-emerald-400 mb-1">verified</mat-icon>
                          <p class="font-medium text-slate-700">¡Inventario Óptimo!</p>
                          <p class="text-xs text-slate-400">Todos los insumos y productos se encuentran por encima de sus puntos de reorden definidos.</p>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- OUTBOX / SENT EMAIL ALERTS LOG -->
            <div class="space-y-3 pt-4 border-t border-slate-200">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <mat-icon class="text-blue-600 text-base">mark_email_read</mat-icon>
                    <span>Historial de Alertas por Email Transmitidas</span>
                  </h3>
                  <p class="text-xs text-slate-500">Registro de notificaciones enviadas automáticamente al departamento de compras y producción.</p>
                </div>

                @if (emailService.sentAlerts().length > 0) {
                  <button 
                    type="button"
                    (click)="emailService.clearAlertLogs()"
                    class="text-xs text-slate-400 hover:text-rose-600 underline cursor-pointer">
                    Vaciar historial
                  </button>
                }
              </div>

              <div class="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th class="py-3 px-4">Fecha / Hora</th>
                      <th class="py-3 px-4">Destinatarios</th>
                      <th class="py-3 px-4">Insumo Notificado</th>
                      <th class="py-3 px-4 text-center">Stock / Reorden</th>
                      <th class="py-3 px-4">Motivo de Disparo</th>
                      <th class="py-3 px-4 text-center">Estado</th>
                      <th class="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (log of emailService.sentAlerts(); track log.id) {
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        
                        <td class="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {{ log.timestamp }}
                        </td>

                        <td class="py-3 px-4">
                          <div class="flex flex-wrap gap-1 max-w-[200px]">
                            @for (email of log.recipients; track email) {
                              <span class="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-mono">
                                {{ email }}
                              </span>
                            }
                          </div>
                        </td>

                        <td class="py-3 px-4">
                          <div class="font-bold text-slate-900">{{ log.productName }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">SKU: {{ log.productSku }}</div>
                        </td>

                        <td class="py-3 px-4 text-center font-mono">
                          <span class="font-bold text-rose-600">{{ log.currentStock }}</span>
                          <span class="text-slate-400"> / {{ log.reorderPoint }} {{ log.unit }}</span>
                        </td>

                        <td class="py-3 px-4 text-[11px] text-slate-600">
                          <span class="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-medium">
                            {{ formatTriggerReason(log.triggerReason) }}
                          </span>
                          @if (log.orderOrDocRef) {
                            <span class="block text-[10px] text-slate-400 font-mono mt-0.5">{{ log.orderOrDocRef }}</span>
                          }
                        </td>

                        <td class="py-3 px-4 text-center">
                          <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            ENTREGADO
                          </span>
                        </td>

                        <td class="py-3 px-4 text-right">
                          <button 
                            type="button"
                            (click)="previewEmail(log)"
                            title="Ver cuerpo HTML del mensaje enviado"
                            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer transition-colors">
                            <mat-icon class="text-xs">visibility</mat-icon>
                            <span>Ver Correo</span>
                          </button>
                        </td>

                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="py-8 text-center text-slate-400">
                          <p>No se han registrado envíos de email en la sesión actual.</p>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        }

      </div>

      <!-- ========================================================= -->
      <!-- MODAL: CONFIGURACIÓN DE ALERTAS POR EMAIL & DESTINATARIOS -->
      <!-- ========================================================= -->
      @if (showEmailConfigModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <mat-icon class="text-base">forward_to_inbox</mat-icon>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Configuración de Alertas por Email</h3>
                  <p class="text-xs text-slate-500">Parámetros SMTP y lista de correos de compras y planta</p>
                </div>
              </div>
              <button (click)="closeEmailConfigModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="mt-4 space-y-4 text-xs">
              
              <!-- Master Toggle -->
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span class="font-bold text-slate-900 block">Servicio de Alertas Automáticas</span>
                  <span class="text-slate-500">Despachar correos ante caídas bajo el Punto de Reorden</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [checked]="emailService.config().enabled"
                    (change)="toggleEmailEnabled($event)"
                    class="sr-only peer" />
                  <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <!-- Recipient Management -->
              <div class="space-y-2">
                <label for="new-recipient-input" class="font-bold text-slate-800 block">Destinatarios de Alertas de Reabastecimiento</label>
                
                <div class="flex items-center space-x-2">
                  <input 
                    id="new-recipient-input"
                    #recipientInput
                    type="email" 
                    placeholder="Ej: ae.barrios@hotmail.com o compras@empresa.com" 
                    class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button 
                    type="button"
                    (click)="addRecipientFromInput(recipientInput.value); recipientInput.value = ''"
                    class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer">
                    Añadir
                  </button>
                </div>

                <div class="flex flex-wrap gap-1.5 pt-1">
                  @for (rec of emailService.config().recipients; track rec) {
                    <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px]">
                      <span>{{ rec }}</span>
                      <button 
                        type="button" 
                        (click)="emailService.removeRecipient(rec)"
                        class="text-emerald-500 hover:text-rose-600 ml-1 cursor-pointer">
                        <mat-icon class="text-xs">close</mat-icon>
                      </button>
                    </span>
                  }
                </div>
              </div>

              <!-- Trigger Toggles -->
              <div class="space-y-2 pt-2 border-t border-slate-100">
                <span class="font-bold text-slate-800 block">Disparadores Automáticos</span>
                
                <div class="space-y-1.5">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      [checked]="emailService.config().autoTriggerOnProduction"
                      (change)="updateConfigProp('autoTriggerOnProduction', $event)"
                      class="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span class="text-slate-700">Notificar al consumir materia prima en Órdenes de Fabricación MRP</span>
                  </label>

                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      [checked]="emailService.config().autoTriggerOnSales"
                      (change)="updateConfigProp('autoTriggerOnSales', $event)"
                      class="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span class="text-slate-700">Notificar tras facturación / ventas en Punto de Venta (POS)</span>
                  </label>

                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      [checked]="emailService.config().includeCostValuation"
                      (change)="updateConfigProp('includeCostValuation', $event)"
                      class="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span class="text-slate-700">Incluir presupuesto valorizado en $ USD y Bolívares (Tasa BCV)</span>
                  </label>
                </div>
              </div>

              <!-- SMTP Server Info -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-600">
                <div class="flex justify-between">
                  <span>Servidor SMTP:</span>
                  <span class="font-bold text-slate-800">{{ emailService.config().smtpHost }}:{{ emailService.config().smtpPort }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Remitente Oficial:</span>
                  <span class="text-slate-800">{{ emailService.config().senderEmail }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Cifrado TLS:</span>
                  <span class="text-emerald-700 font-bold">Habilitado</span>
                </div>
              </div>

            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button 
                type="button" 
                (click)="emailService.sendTestEmail()"
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">
                Enviar Prueba
              </button>

              <button 
                type="button" 
                (click)="closeEmailConfigModal()"
                class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs">
                Guardar y Cerrar
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: VISTA PREVIA DEL CORREO HTML ENVIADO -->
      <!-- ========================================================= -->
      @if (showEmailPreviewModal() && selectedLogForPreview()) {
        @let log = selectedLogForPreview()!;
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div class="flex items-center space-x-2">
                  <mat-icon class="text-emerald-600">mail</mat-icon>
                  <h3 class="text-base font-bold text-slate-900">Vista Previa de Correo Transaccional</h3>
                </div>
                <p class="text-xs text-slate-500 font-mono mt-0.5">ID: {{ log.id }} • {{ log.timestamp }}</p>
              </div>
              <button (click)="closeEmailPreviewModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Envelope Header -->
            <div class="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div class="flex">
                <span class="w-16 font-bold text-slate-500">De:</span>
                <span class="text-slate-800">{{ emailService.config().senderName }} &lt;{{ emailService.config().senderEmail }}&gt;</span>
              </div>
              <div class="flex">
                <span class="w-16 font-bold text-slate-500">Para:</span>
                <span class="text-slate-800 font-mono font-medium">{{ log.recipients.join(', ') }}</span>
              </div>
              <div class="flex">
                <span class="w-16 font-bold text-slate-500">Asunto:</span>
                <span class="text-slate-900 font-bold">{{ log.subject }}</span>
              </div>
            </div>

            <!-- HTML Body Container -->
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-inner p-2 bg-slate-100 max-h-[480px] overflow-y-auto">
              <div [innerHTML]="log.previewHtml"></div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button 
                type="button" 
                (click)="closeEmailPreviewModal()"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs cursor-pointer">
                Cerrar Vista
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: REGISTRAR FÓRMULA BOM -->
      <!-- ========================================================= -->
      @if (showBomModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-600">hub</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Registrar Lista de Materiales (BOM)</h3>
              </div>
              <button (click)="closeBomModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
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
                  <button type="button" (click)="addBomItem()" class="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg hover:bg-amber-100 flex items-center space-x-1 cursor-pointer">
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
                      <button type="button" (click)="removeBomItem(i)" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
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
                <button type="button" (click)="closeBomModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" [disabled]="bomForm.invalid" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs cursor-pointer">Guardar BOM</button>
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

              <button (click)="closeOrderDetailsModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="mt-5 space-y-5 text-xs">
              
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
                          <tr>
                            <td class="py-2.5 px-3">
                              <span class="font-bold text-slate-800">{{ it.rawMaterialName }}</span>
                              <span class="block text-[10px] text-slate-400 font-mono">SKU: {{ it.rawMaterialSku }}</span>
                            </td>
                            <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                              {{ needed.toFixed(2) }} {{ it.unit }}
                            </td>
                            <td class="py-2.5 px-3 text-center font-mono font-semibold" [class]="stockInWh < needed ? 'text-rose-600' : 'text-emerald-700'">
                              {{ stockInWh }} {{ it.unit }}
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              \${{ (needed * (prod?.costPrice || it.estimatedUnitCost)).toFixed(2) }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button type="button" (click)="closeOrderDetailsModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">Cerrar</button>
              
              <div class="flex items-center space-x-2">
                @if (ord.status === 'PLANIFICADA') {
                  <button 
                    type="button" 
                    (click)="startOrderFromModal(ord.id)"
                    class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer">
                    <mat-icon class="text-sm">play_arrow</mat-icon>
                    <span>Iniciar Producción</span>
                  </button>
                }

                @if (ord.status === 'EN_PROCESO') {
                  <button 
                    type="button" 
                    (click)="completeOrderFromModal(ord.id)"
                    class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer">
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    <span>Liquidar Orden (Afectar Stock e Insumos)</span>
                  </button>
                }
              </div>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: CREAR NUEVA ORDEN DE FABRICACIÓN -->
      <!-- ========================================================= -->
      @if (showOrderModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-600">precision_manufacturing</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Lanzar Orden de Fabricación</h3>
              </div>
              <button (click)="closeOrderModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="orderForm" (ngSubmit)="submitOrderForm()" class="mt-4 space-y-4 text-xs">
              <div>
                <label for="ord-bom-select" class="block font-semibold text-slate-700 mb-1">Estructura BOM / Producto a Fabricar *</label>
                <select id="ord-bom-select" formControlName="bomId" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                  @for (b of stateService.boms(); track b.id) {
                    <option [value]="b.id">{{ b.code }} - {{ b.finishedProductName }} (Lote Base: {{ b.quantityToProduce }})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="ord-wh-select" class="block font-semibold text-slate-700 mb-1">Almacén Destino *</label>
                  <select id="ord-wh-select" formControlName="warehouseId" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    @for (w of stateService.warehouses(); track w.id) {
                      <option [value]="w.id">{{ w.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="ord-qty-input" class="block font-semibold text-slate-700 mb-1">Cantidad a Producir *</label>
                  <input id="ord-qty-input" type="number" min="1" formControlName="quantityPlanned" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="ord-date-input" class="block font-semibold text-slate-700 mb-1">Fecha Meta de Entrega</label>
                  <input id="ord-date-input" type="date" formControlName="targetEndDate" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label for="ord-notes-input" class="block font-semibold text-slate-700 mb-1">Notas / Lote de Fabricación</label>
                  <input id="ord-notes-input" type="text" formControlName="notes" placeholder="Ej: Lote #2026-LUB-01" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeOrderModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" [disabled]="orderForm.invalid" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs cursor-pointer">Crear Orden</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: FICHA TÉCNICA BOM -->
      <!-- ========================================================= -->
      @if (showBomDetailModal() && selectedBomForDetails()) {
        @let bom = selectedBomForDetails()!;
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div class="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span class="px-2 py-0.5 text-[10px] font-bold font-mono bg-amber-50 text-amber-800 rounded border border-amber-200">{{ bom.code }}</span>
                <h3 class="text-base font-bold text-slate-900 mt-1">{{ bom.name }}</h3>
                <p class="text-xs text-slate-500 font-mono">Producto Terminado: {{ bom.finishedProductName }} (SKU: {{ bom.finishedProductSku }})</p>
              </div>
              <button (click)="closeBomDetailModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="mt-4 space-y-4 text-xs">
              <div class="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono">
                <div>
                  <span class="text-[10px] text-slate-500 block">Lote Base:</span>
                  <span class="font-bold text-slate-900">{{ bom.quantityToProduce }} un.</span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block">Costo Total Lote:</span>
                  <span class="font-bold text-slate-900">\${{ bom.totalEstimatedCost.toFixed(2) }}</span>
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block">Costo Unitario:</span>
                  <span class="font-bold text-amber-700">\${{ bom.unitCost.toFixed(2) }}</span>
                </div>
              </div>

              <div>
                <h4 class="font-bold text-slate-800 mb-2">Desglose de Insumos</h4>
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                        <th class="py-2 px-3">Insumo</th>
                        <th class="py-2 px-3 text-center">Cant. Requerida</th>
                        <th class="py-2 px-3 text-center">% Merma</th>
                        <th class="py-2 px-3 text-right">Costo Subtotal</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (it of bom.items; track it.id) {
                        <tr>
                          <td class="py-2 px-3">
                            <span class="font-bold text-slate-800">{{ it.rawMaterialName }}</span>
                            <span class="block text-[10px] text-slate-400 font-mono">SKU: {{ it.rawMaterialSku }}</span>
                          </td>
                          <td class="py-2 px-3 text-center font-mono font-bold">{{ it.quantityNeeded }} {{ it.unit }}</td>
                          <td class="py-2 px-3 text-center font-mono">{{ it.wastePercent }}%</td>
                          <td class="py-2 px-3 text-right font-mono font-bold">\${{ it.subtotalCost.toFixed(2) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button type="button" (click)="closeBomDetailModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: CANCELAR ORDEN DE FABRICACIÓN -->
      <!-- ========================================================= -->
      @if (showCancelModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 class="text-base font-bold text-slate-900">Cancelar Orden de Fabricación</h3>
            <p class="text-xs text-slate-500 mt-1">Indique el motivo por el cual se cancela la orden.</p>

            <div class="mt-4">
              <label for="cancel-reason-input" class="block text-xs font-semibold text-slate-700 mb-1">Motivo de Cancelación *</label>
              <textarea 
                id="cancel-reason-input"
                [value]="cancelReason()"
                (input)="onCancelReasonInput($event)"
                rows="3" 
                placeholder="Ej: Insumos dañados o reprogramación de planta" 
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"></textarea>
            </div>

            <div class="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button type="button" (click)="closeCancelModal()" class="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer">Volver</button>
              <button 
                type="button" 
                (click)="confirmCancelOrder()" 
                [disabled]="!cancelReason().trim()"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer">
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
  emailService = inject(EmailNotificationService);
  shortcutService = inject(KeyboardShortcutsService);
  private fb = inject(FormBuilder);

  activeTab = signal<'orders' | 'boms' | 'simulator' | 'reorder-alerts'>('orders');
  selectedStatusFilter = signal<string>('ALL');

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (!action) return;

      if (action.actionId === 'NEW_PRODUCTION_ORDER') {
        this.activeTab.set('orders');
        this.openNewOrderModal();
      } else if (action.actionId === 'NEW_BOM') {
        this.activeTab.set('boms');
        this.openNewBomModal();
      }
    });
  }

  // Modals signals
  showBomModal = signal<boolean>(false);
  showOrderModal = signal<boolean>(false);
  showOrderDetailsModal = signal<boolean>(false);
  showBomDetailModal = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);
  showEmailConfigModal = signal<boolean>(false);
  showEmailPreviewModal = signal<boolean>(false);

  selectedOrderForDetails = signal<ProductionOrder | null>(null);
  selectedBomForDetails = signal<Bom | null>(null);
  selectedLogForPreview = signal<EmailAlertLog | null>(null);
  orderToCancelId = signal<string>('');
  cancelReason = signal<string>('');

  // Simulator signals
  simulatedBomId = signal<string>('');
  simulatedQuantity = signal<number>(100);
  simulatedWarehouseId = signal<string>('');

  // Reactive Forms
  bomForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required]],
    finishedProductId: ['', [Validators.required]],
    quantityToProduce: [1, [Validators.required, Validators.min(1)]],
    items: this.fb.array([]),
    laborCost: [10.00, [Validators.required, Validators.min(0)]],
    overheadCost: [5.00, [Validators.required, Validators.min(0)]]
  });

  orderForm = this.fb.group({
    bomId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    quantityPlanned: [100, [Validators.required, Validators.min(1)]],
    targetEndDate: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), Validators.required],
    notes: ['']
  });

  get bomItemsArray() {
    return this.bomForm.get('items') as FormArray;
  }

  // Computed state
  activeOrdersCount = computed(() => {
    return this.stateService.productionOrders().filter(o => o.status === 'PLANIFICADA' || o.status === 'EN_PROCESO').length;
  });

  completedOrdersCount = computed(() => {
    return this.stateService.productionOrders().filter(o => o.status === 'COMPLETADA').length;
  });

  totalWipValue = computed(() => {
    return this.stateService.productionOrders()
      .filter(o => o.status === 'EN_PROCESO')
      .reduce((sum, o) => sum + o.totalCost, 0);
  });

  totalReorderBudgetUsd = computed(() => {
    return this.emailService.reorderItems().reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  });

  filteredOrders = computed(() => {
    const filter = this.selectedStatusFilter();
    if (filter === 'ALL') return this.stateService.productionOrders();
    return this.stateService.productionOrders().filter(o => o.status === filter);
  });

  finishedProductsList = computed(() => {
    return this.stateService.products().filter(p => p.status === 'ACTIVE');
  });

  rawMaterialsList = computed(() => {
    return this.stateService.products().filter(p => p.status === 'ACTIVE');
  });

  simulatedExplosion = computed(() => {
    const bomId = this.simulatedBomId() || this.stateService.boms()[0]?.id;
    const qty = this.simulatedQuantity();
    const whId = this.simulatedWarehouseId() || this.stateService.warehouses()[0]?.id;

    if (!bomId || !whId) return null;

    const bom = this.stateService.boms().find(b => b.id === bomId);
    if (!bom) return null;

    const factor = qty / (bom.quantityToProduce || 1);
    let allAvailable = true;

    const items = bom.items.map(it => {
      const prod = this.stateService.products().find(p => p.id === it.rawMaterialProductId);
      const needed = Number((it.quantityNeeded * factor * (1 + (it.wastePercent / 100))).toFixed(2));
      const stockInWh = prod?.stockByWarehouse.find(w => w.warehouseId === whId)?.quantity || 0;
      const reorderPoint = prod?.reorderPoint ?? Math.max(Math.ceil((prod?.minStock || 5) * 1.5), 10);
      const balancePost = Number((stockInWh - needed).toFixed(2));
      const unitCost = prod?.costPrice || it.estimatedUnitCost;
      const subtotalCost = Number((needed * unitCost).toFixed(2));

      if (stockInWh < needed) allAvailable = false;

      return {
        rawMaterialProductId: it.rawMaterialProductId,
        rawMaterialSku: it.rawMaterialSku,
        rawMaterialName: it.rawMaterialName,
        quantityRequired: needed,
        stockInWarehouse: stockInWh,
        reorderPoint,
        balancePostProduction: balancePost,
        unit: it.unit,
        unitCost,
        subtotalCost
      };
    });

    return {
      bom,
      quantity: qty,
      warehouseId: whId,
      items,
      isFullyAvailable: allAvailable
    };
  });

  constructor() {
    if (this.stateService.boms().length > 0) {
      this.simulatedBomId.set(this.stateService.boms()[0].id);
    }
    if (this.stateService.warehouses().length > 0) {
      this.simulatedWarehouseId.set(this.stateService.warehouses()[0].id);
    }
  }

  onStatusFilterChange(event: Event) {
    this.selectedStatusFilter.set((event.target as HTMLSelectElement).value);
  }

  getProductById(id: string): Product | undefined {
    return this.stateService.products().find(p => p.id === id);
  }

  getBomById(id: string): Bom | undefined {
    return this.stateService.boms().find(b => b.id === id);
  }

  getStockInWarehouse(productId: string, warehouseId: string): number {
    const p = this.getProductById(productId);
    return p?.stockByWarehouse.find(w => w.warehouseId === warehouseId)?.quantity || 0;
  }

  formatTriggerReason(reason: string): string {
    switch (reason) {
      case 'MRP_CONSUMPTION': return 'Consumo en Fabricación';
      case 'SALE_POS': return 'Venta en Caja POS';
      case 'INVENTORY_SCAN': return 'Inspección de Stock';
      case 'TEST_EMAIL': return 'Prueba de Sistema';
      case 'MANUAL_TRIGGER': return 'Alerta Manual';
      default: return reason;
    }
  }

  // --- Production Order Actions with Automated Reorder Point Email Alerts ---
  startOrder(orderId: string) {
    this.stateService.startProductionOrder(orderId);
  }

  completeOrder(orderId: string) {
    const res = this.stateService.completeProductionOrder(orderId);
    if (res.success) {
      const order = this.stateService.productionOrders().find(o => o.id === orderId);
      // Automatic trigger check against reorder points!
      this.emailService.checkAndTriggerReorderAlerts('MRP_CONSUMPTION', order?.orderNumber);
    }
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
      // Automatic trigger check against reorder points!
      this.emailService.checkAndTriggerReorderAlerts('MRP_CONSUMPTION', updated?.orderNumber);
    }
  }

  triggerManualScan() {
    const count = this.emailService.checkAndTriggerReorderAlerts('INVENTORY_SCAN');
    if (count === 0) {
      this.stateService.notify('info', 'Inventario Verificado', 'No existen insumos por debajo del punto de reorden en este momento.');
    }
  }

  // --- Email Notification Modals ---
  openEmailConfigModal() {
    this.showEmailConfigModal.set(true);
  }

  closeEmailConfigModal() {
    this.showEmailConfigModal.set(false);
  }

  toggleEmailEnabled(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.emailService.updateConfig({ enabled: isChecked });
  }

  updateConfigProp(key: 'autoTriggerOnProduction' | 'autoTriggerOnSales' | 'includeCostValuation', event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.emailService.updateConfig({ [key]: isChecked });
  }

  addRecipientFromInput(email: string) {
    this.emailService.addRecipient(email);
  }

  previewEmail(log: EmailAlertLog) {
    this.selectedLogForPreview.set(log);
    this.showEmailPreviewModal.set(true);
  }

  closeEmailPreviewModal() {
    this.showEmailPreviewModal.set(false);
    this.selectedLogForPreview.set(null);
  }

  // --- Modal Helpers ---
  viewOrderDetails(order: ProductionOrder) {
    this.selectedOrderForDetails.set(order);
    this.showOrderDetailsModal.set(true);
  }

  closeOrderDetailsModal() {
    this.showOrderDetailsModal.set(false);
    this.selectedOrderForDetails.set(null);
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

  openNewOrderModal() {
    const firstBom = this.stateService.boms()[0];
    const firstWh = this.stateService.warehouses()[0];
    this.orderForm.patchValue({
      bomId: firstBom?.id || '',
      warehouseId: firstWh?.id || '',
      quantityPlanned: firstBom?.quantityToProduce || 100,
      targetEndDate: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      notes: ''
    });
    this.showOrderModal.set(true);
  }

  createOrderFromBom(bom: Bom) {
    const firstWh = this.stateService.warehouses()[0];
    this.orderForm.patchValue({
      bomId: bom.id,
      warehouseId: firstWh?.id || '',
      quantityPlanned: bom.quantityToProduce || 100,
      targetEndDate: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      notes: 'Lanzada desde Ficha BOM ' + bom.code
    });
    this.showOrderModal.set(true);
  }

  closeOrderModal() {
    this.showOrderModal.set(false);
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
}
