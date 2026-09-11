import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Product, ProductPrices, ProductCategory, Warehouse } from '../../models/erp.models';
import { exportInventoryToCsv } from '../../utils/csv-exporter';

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Top Section: Header & Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <mat-icon>inventory_2</mat-icon>
            </span>
            <div>
              <div class="flex items-center space-x-2">
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Inventario, Esquema de 5 Precios e Impuestos
                </h1>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                  Tasa BCV: Bs. {{ stateService.bcvState().usdRate.toFixed(2) }}
                </span>
              </div>
              <p class="text-xs text-slate-500">
                Catálogo centralizado, 5 niveles de precio (Detal, Mayor, Distribuidor, VIP, Especial) y exención de IVA
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Manage Categories Button -->
          <button 
            type="button"
            (click)="openCategoryModal()"
            title="Administrar catálogo de categorías de productos (CRUD)"
            class="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
            <mat-icon class="text-base text-purple-600">category</mat-icon>
            <span>Categorías</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-200/80 text-purple-800">
              {{ stateService.categories().length }}
            </span>
          </button>

          <!-- Manage Warehouses Button -->
          <button 
            type="button"
            (click)="openWarehouseModal()"
            title="Administrar almacenes, bodegas y depósitos físicos (CRUD)"
            class="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
            <mat-icon class="text-base text-sky-600">warehouse</mat-icon>
            <span>Almacenes</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-200/80 text-sky-800">
              {{ stateService.warehouses().length }}
            </span>
          </button>

          <!-- Download CSV Button -->
          <button 
            type="button"
            (click)="downloadInventoryCsv()"
            title="Exportar inventario actual a archivo CSV para Excel"
            class="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
            <mat-icon class="text-base text-emerald-600">file_download</mat-icon>
            <span>Descargar CSV</span>
          </button>

          <!-- Adjust Stock Button -->
          <button 
            (click)="openAdjustModal()"
            class="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer">
            <mat-icon class="text-base text-amber-600">tune</mat-icon>
            <span>Ajuste / Merma</span>
          </button>

          <!-- New Product Button -->
          <button 
            (click)="openNewProductModal()"
            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm shadow-blue-200 transition-colors cursor-pointer">
            <mat-icon class="text-base">add</mat-icon>
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <!-- Filters & Barcode Quick Search -->
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        
        <!-- Text & Barcode Search -->
        <div class="relative flex-1 w-full">
          <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
          <input 
            type="text" 
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event.target).value)"
            placeholder="Buscar por Nombre, SKU o Código de Barras (Escáner activo)..." 
            class="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          
          <span class="absolute right-3 top-2.5 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            ESC / F2
          </span>
        </div>

        <!-- Category Filter -->
        <div class="w-full md:w-48">
          <select 
            [value]="selectedCategory()"
            (change)="selectedCategory.set($any($event.target).value)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="ALL">Todas las Categorías</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        </div>

        <!-- Warehouse Filter -->
        <div class="w-full md:w-56">
          <select 
            [value]="selectedWarehouse()"
            (change)="selectedWarehouse.set($any($event.target).value)"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option value="ALL">Todos los Almacenes (Consolidado)</option>
            @for (wh of stateService.warehouses(); track wh.id) {
              <option [value]="wh.id">{{ wh.name }}</option>
            }
          </select>
        </div>

        <!-- Stock Status Filter -->
        <button 
          (click)="toggleOnlyLowStock()"
          [class]="onlyLowStock() ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200'"
          class="px-3 py-2 rounded-xl text-xs border flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer">
          <mat-icon class="text-sm" [class.text-amber-600]="onlyLowStock()">warning</mat-icon>
          <span>Solo Bajo Stock ({{ stateService.lowStockProducts().length }})</span>
        </button>

      </div>

      <!-- Products Catalog Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th class="py-3 px-4">Producto & SKU</th>
                <th class="py-3 px-3">Categorías</th>
                <th class="py-3 px-3 text-center">Unidad</th>
                <th class="py-3 px-3 text-right">Costo Promedio (CPP)</th>
                <th class="py-3 px-3 text-center">Niveles de Precio ($ / Bs.)</th>
                <th class="py-3 px-3 text-center">Impuesto</th>
                <th class="py-3 px-3 text-center">Stock Total & Almacenes</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (prod of filteredProducts(); track prod.id) {
                @let bcv = stateService.bcvState();
                @let p1 = prod.prices.price1;
                <tr class="hover:bg-slate-50/60 transition-colors">
                  
                  <!-- Product Name, SKU, Barcode -->
                  <td class="py-3 px-4">
                    <div class="space-y-0.5">
                      <p class="font-semibold text-slate-900 text-xs sm:text-sm">{{ prod.name }}</p>
                      <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                        <span class="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">SKU: {{ prod.sku }}</span>
                        <span>•</span>
                        <span class="flex items-center space-x-0.5">
                          <mat-icon class="text-[13px]">qr_code</mat-icon>
                          <span>{{ prod.barcode }}</span>
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Categories (Multiple support) -->
                  <td class="py-3 px-3">
                    <div class="flex flex-wrap gap-1 max-w-[210px]">
                      @if (prod.categories && prod.categories.length > 0) {
                        @for (cName of prod.categories; track cName) {
                          @let catObj = getCategoryObj(cName);
                          <span [class]="getCategoryBadgeClass(catObj?.color)" class="px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center">
                            {{ cName }}
                          </span>
                        }
                      } @else {
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {{ prod.category || 'General' }}
                        </span>
                      }
                    </div>
                  </td>

                  <!-- Unit -->
                  <td class="py-3 px-3 text-center font-mono font-medium text-slate-600">
                    {{ prod.unit }}
                  </td>

                  <!-- Cost Price (Weighted Average) -->
                  <td class="py-3 px-3 text-right font-mono font-medium text-slate-900">
                    \${{ prod.costPrice.toFixed(2) }}
                  </td>

                  <!-- 5 Price Tiers Snapshot -->
                  <td class="py-3 px-3 text-center">
                    <div class="inline-flex flex-col items-center space-y-0.5">
                      <div class="flex items-center space-x-1 font-mono font-bold text-slate-900">
                        <span>P1 Detal: \${{ p1.toFixed(2) }}</span>
                      </div>
                      <div class="flex items-center space-x-1 text-[10px] font-mono text-slate-500">
                        <span>Bs. {{ (p1 * bcv.usdRate).toFixed(2) }}</span>
                        <span class="text-slate-300">•</span>
                        <button 
                          (click)="openPricesModal(prod)"
                          class="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline">
                          Ver 5 Niveles
                        </button>
                      </div>
                    </div>
                  </td>

                  <!-- Tax Condition -->
                  <td class="py-3 px-3 text-center">
                    @if (prod.isTaxExempt || prod.taxRate === 0) {
                      <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                        Exento (0%)
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200/60">
                        IVA {{ (prod.taxRate * 100).toFixed(0) }}%
                      </span>
                    }
                  </td>

                  <!-- Total Stock & Stock per Warehouse Breakdown -->
                  <td class="py-3 px-3 text-center">
                    <div class="inline-flex flex-col items-center space-y-1">
                      <div class="flex items-center space-x-1.5">
                        <span class="font-mono font-bold text-sm"
                          [class]="prod.totalStock <= prod.minStock ? 'text-amber-600' : 'text-slate-900'">
                          {{ prod.totalStock }}
                        </span>
                        @if (prod.totalStock <= prod.minStock) {
                          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase">
                            Bajo Mín ({{ prod.minStock }})
                          </span>
                        } @else {
                          <span class="text-[10px] text-slate-400">Mín: {{ prod.minStock }}</span>
                        }
                      </div>

                      <!-- Breakdown per warehouse -->
                      <div class="flex flex-wrap items-center justify-center gap-1 text-[9px] font-mono text-slate-500 max-w-[200px]">
                        @for (whEntry of prod.stockByWarehouse; track whEntry.warehouseId) {
                          <span 
                            class="px-1.5 py-0.5 rounded border text-[9px]"
                            [class]="whEntry.quantity > 0 ? 'bg-slate-100 border-slate-200 text-slate-700 font-semibold' : 'bg-slate-50 border-slate-150 text-slate-400'"
                            [title]="whEntry.warehouseName + ': ' + whEntry.quantity + ' ' + prod.unit">
                            {{ getWarehouseShortName(whEntry.warehouseId) }}: {{ whEntry.quantity }}
                          </span>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end space-x-1.5">
                      <button 
                        (click)="openPricesModal(prod)"
                        title="Configurar 5 Precios e Impuesto"
                        class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer">
                        <mat-icon class="text-xs">sell</mat-icon>
                        <span>Precios</span>
                      </button>

                      <button 
                        (click)="openAdjustModalForProduct(prod)"
                        title="Ajustar Stock / Merma con Soporte"
                        class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 transition-colors text-xs font-medium inline-flex items-center space-x-1 cursor-pointer">
                        <mat-icon class="text-xs">tune</mat-icon>
                        <span>Ajustar</span>
                      </button>
                    </div>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center py-10 text-slate-400 text-xs">
                    No se encontraron productos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div class="flex items-center space-x-3">
            <span>Mostrando <strong>{{ filteredProducts().length }}</strong> de {{ stateService.products().length }} productos</span>
            <button 
              type="button"
              (click)="downloadInventoryCsv()"
              class="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center space-x-1 underline cursor-pointer text-xs">
              <mat-icon class="text-xs text-emerald-600">file_download</mat-icon>
              <span>Exportar filtrados a CSV</span>
            </button>
          </div>
          <span>Valor total de catálogo actual: <strong class="font-mono text-slate-900">\${{ stateService.totalInventoryValuation().toFixed(2) }}</strong> (Bs. {{ (stateService.totalInventoryValuation() * stateService.bcvState().usdRate).toLocaleString('es-VE') }})</span>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MODAL: GESTIÓN DE 5 NIVELES DE PRECIO E IMPUESTO (IVA) -->
      <!-- ========================================================= -->
      @if (selectedProductForPrices(); as prod) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-indigo-400">sell</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Configuración de Precios & Condición Tributaria</h3>
                  <p class="text-[11px] text-slate-300">{{ prod.sku }} - {{ prod.name }}</p>
                </div>
              </div>
              <button (click)="selectedProductForPrices.set(null)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="pricesForm" (ngSubmit)="saveProductPrices()" class="p-6 space-y-4 text-xs">
              
              <!-- Critical Audit Notice -->
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2 text-amber-900">
                <mat-icon class="text-amber-600 text-base shrink-0 mt-0.5">warning</mat-icon>
                <div class="text-[11px]">
                  <p class="font-bold">Control de Auditoría Crítica</p>
                  <p class="text-amber-800 leading-tight mt-0.5">
                    Toda variación en los precios base genera una notificación inmediata en el Centro de Alertas y se almacena con trazabilidad inmutable en el registro de auditoría.
                  </p>
                </div>
              </div>

              <!-- Tax Condition Checkbox -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-800 block text-xs">Condición de Impuesto IVA</span>
                  <p class="text-[11px] text-slate-500">Marque si el artículo está exento según la normativa legal</p>
                </div>
                <div class="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isExemptCheck" 
                    formControlName="isTaxExempt" 
                    class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <label for="isExemptCheck" class="font-semibold text-slate-700 text-xs cursor-pointer">
                    Producto Exento (0% IVA)
                  </label>
                </div>
              </div>

              <!-- 5 Price Tiers Form Fields -->
              <div class="space-y-2">
                <span class="font-semibold text-slate-700 block uppercase tracking-wider text-[11px]">
                  Hasta 5 Niveles de Precio ($ USD y equivalente Bs.)
                </span>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  <!-- Price 1 (Detal / Base) -->
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800">Precio 1: Detal (Base)</span>
                      <span class="text-[10px] text-slate-400 font-mono">0% desc</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="price1" 
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                    <p class="text-[10px] text-slate-400 font-mono">
                      Bs. {{ ((pricesForm.get('price1')?.value || 0) * stateService.bcvState().usdRate).toFixed(2) }}
                    </p>
                  </div>

                  <!-- Price 2 (Mayorista) -->
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800">Precio 2: Mayorista</span>
                      <span class="text-[10px] text-slate-400 font-mono">~10% desc</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="price2" 
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                    <p class="text-[10px] text-slate-400 font-mono">
                      Bs. {{ ((pricesForm.get('price2')?.value || 0) * stateService.bcvState().usdRate).toFixed(2) }}
                    </p>
                  </div>

                  <!-- Price 3 (Distribuidor) -->
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800">Precio 3: Distribuidor</span>
                      <span class="text-[10px] text-slate-400 font-mono">~18% desc</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="price3" 
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                    <p class="text-[10px] text-slate-400 font-mono">
                      Bs. {{ ((pricesForm.get('price3')?.value || 0) * stateService.bcvState().usdRate).toFixed(2) }}
                    </p>
                  </div>

                  <!-- Price 4 (VIP / Aliado) -->
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800">Precio 4: VIP / Aliado</span>
                      <span class="text-[10px] text-slate-400 font-mono">~22% desc</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="price4" 
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                    <p class="text-[10px] text-slate-400 font-mono">
                      Bs. {{ ((pricesForm.get('price4')?.value || 0) * stateService.bcvState().usdRate).toFixed(2) }}
                    </p>
                  </div>

                  <!-- Price 5 (Especial / Liquidación) -->
                  <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-800">Precio 5: Especial / Liquidación</span>
                      <span class="text-[10px] text-slate-400 font-mono">~25% desc</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="price5" 
                      class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
                    <p class="text-[10px] text-slate-400 font-mono">
                      Bs. {{ ((pricesForm.get('price5')?.value || 0) * stateService.bcvState().usdRate).toFixed(2) }}
                    </p>
                  </div>

                </div>
              </div>

              <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="selectedProductForPrices.set(null)" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-xs cursor-pointer">
                  Guardar 5 Niveles de Precio
                </button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: AJUSTE DE STOCK / MERMA CON DOCUMENTO DE SOPORTE -->
      <!-- ========================================================= -->
      @if (showAdjustModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon>tune</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Ajuste de Stock / Registro de Merma</h3>
                  <p class="text-[11px] text-amber-100">Requiere Documento de Soporte y Justificación Obligatoria</p>
                </div>
              </div>
              <button (click)="showAdjustModal.set(false)" class="text-white/80 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="adjustForm" (ngSubmit)="submitStockAdjustment()" class="p-6 space-y-4 text-xs">
              
              <!-- Critical Audit Notice -->
              <div class="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-start space-x-2 text-sky-950">
                <mat-icon class="text-sky-600 text-base shrink-0 mt-0.5">warning</mat-icon>
                <div class="text-[11px]">
                  <p class="font-bold">Ajuste Manual Fuera de Fabricación</p>
                  <p class="text-sky-800 leading-tight mt-0.5">
                    Este movimiento de inventario es clasificado como Evento Crítico de Auditoría. Se requiere documento de soporte físico y justificación detallada para el Kardex.
                  </p>
                </div>
              </div>

              <!-- Product Select -->
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Producto a Ajustar *</span>
                <select formControlName="productId" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-amber-500/20">
                  @for (prod of stateService.products(); track prod.id) {
                    <option [value]="prod.id">{{ prod.sku }} - {{ prod.name }} (Stock: {{ prod.totalStock }})</option>
                  }
                </select>
              </div>

              <!-- Warehouse Select -->
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Almacén Afectado *</span>
                <select formControlName="warehouseId" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-amber-500/20">
                  @for (wh of stateService.warehouses(); track wh.id) {
                    <option [value]="wh.id">{{ wh.name }}</option>
                  }
                </select>
              </div>

              <!-- Adjustment Type & Quantity -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Tipo de Ajuste *</span>
                  <select formControlName="adjustmentType" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    <option value="MERMA">Merma / Pérdida / Daño (-)</option>
                    <option value="SOBRANTE">Sobrante de Conteo (+)</option>
                    <option value="INVENTARIO_FISICO">Ajuste por Inventario Físico</option>
                  </select>
                </div>

                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Cantidad a Ajustar *</span>
                  <input 
                    type="number" 
                    min="1" 
                    formControlName="quantity" 
                    placeholder="Ej: 3" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800" />
                </div>
              </div>

              <!-- Support Document (OBLIGATORY) -->
              <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <span class="block font-bold text-amber-950 flex items-center space-x-1">
                  <mat-icon class="text-amber-600 text-sm">assignment</mat-icon>
                  <span>Documento de Soporte / Folio de Autorización (Obligatorio) *</span>
                </span>
                <input 
                  type="text" 
                  formControlName="supportDocument" 
                  placeholder="Ej: ACTA-MERMA-2026-081, FOLIO-AUD-4401, MEMO-SUP-12" 
                  class="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <p class="text-[10px] text-amber-800">Este folio quedará registrado permanentemente en la Bitácora de Auditoría y Kardex.</p>
              </div>

              <!-- Justification Reason (OBLIGATORY) -->
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Motivo / Justificación Técnica *</span>
                <textarea 
                  rows="2" 
                  formControlName="justificationReason" 
                  placeholder="Describa la causa (ej: 'Empaque roto por caída en estiba', 'Conteo trimestral de cierre')..."
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-amber-500/20"></textarea>
              </div>

              <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="showAdjustModal.set(false)" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="adjustForm.invalid"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs cursor-pointer">
                  Procesar Ajuste Atómico
                </button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: GESTIÓN DE CATEGORÍAS (CRUD) -->
      <!-- ========================================================= -->
      @if (showCategoryCrudModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-purple-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-purple-300">category</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Gestión y Catálogo de Categorías</h3>
                  <p class="text-[11px] text-purple-200">Crear, modificar y organizar categorías de productos</p>
                </div>
              </div>
              <button (click)="showCategoryCrudModal.set(false)" class="text-purple-200 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-6 text-xs">
              
              <!-- Form to Create/Edit Category -->
              <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <mat-icon class="text-sm text-purple-600">{{ editingCategoryId() ? 'edit' : 'add_circle' }}</mat-icon>
                    <span>{{ editingCategoryId() ? 'Editar Categoría' : 'Nueva Categoría' }}</span>
                  </h4>
                  @if (editingCategoryId()) {
                    <span class="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Modo Edición
                    </span>
                  }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Nombre de la Categoría *</label>
                    <input 
                      type="text" 
                      formControlName="name" 
                      placeholder="Ej: Herramientas Neumáticas" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Código / Sigla *</label>
                    <input 
                      type="text" 
                      formControlName="code" 
                      placeholder="Ej: NEUM" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Descripción</label>
                  <input 
                    type="text" 
                    formControlName="description" 
                    placeholder="Breve descripción del tipo de productos en esta categoría..." 
                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>

                <!-- Color selector -->
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Color del Distintivo</label>
                  <div class="flex flex-wrap gap-2">
                    @for (col of ['blue', 'emerald', 'amber', 'purple', 'rose', 'sky', 'indigo']; track col) {
                      <button 
                        type="button" 
                        (click)="categoryForm.patchValue({ color: col })"
                        [class]="categoryForm.value.color === col ? 'ring-2 ring-offset-2 ring-purple-600 scale-105' : 'opacity-70 hover:opacity-100'"
                        [class]="getCategoryBadgeClass(col)"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize">
                        {{ col }}
                      </button>
                    }
                  </div>
                </div>

                <div class="flex items-center justify-end space-x-2 pt-2 border-t border-purple-100">
                  @if (editingCategoryId()) {
                    <button 
                      type="button" 
                      (click)="cancelCategoryEdit()" 
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                      Cancelar
                    </button>
                  }
                  <button 
                    type="submit" 
                    [disabled]="categoryForm.invalid" 
                    class="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center space-x-1">
                    <mat-icon class="text-sm">save</mat-icon>
                    <span>{{ editingCategoryId() ? 'Actualizar Categoría' : 'Crear Categoría' }}</span>
                  </button>
                </div>
              </form>

              <!-- Category List Table -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-800 text-xs">
                    Listado de Categorías Registradas ({{ stateService.categories().length }})
                  </h4>
                  <span class="text-[11px] text-slate-500">
                    Las categorías están disponibles en el catálogo y selector múltiple
                  </span>
                </div>

                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th class="py-2.5 px-3">Categoría</th>
                        <th class="py-2.5 px-2">Código</th>
                        <th class="py-2.5 px-3">Descripción</th>
                        <th class="py-2.5 px-2 text-center">Productos</th>
                        <th class="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (cat of stateService.categories(); track cat.id) {
                        @let prodCount = getProductsCountForCategory(cat.name);
                        <tr class="hover:bg-slate-50/70 transition-colors">
                          <td class="py-2.5 px-3 font-semibold text-slate-900">
                            <span [class]="getCategoryBadgeClass(cat.color)" class="px-2 py-0.5 rounded-full text-[11px] font-medium">
                              {{ cat.name }}
                            </span>
                          </td>
                          <td class="py-2.5 px-2 font-mono text-slate-600">
                            {{ cat.code }}
                          </td>
                          <td class="py-2.5 px-3 text-slate-500 max-w-[180px] truncate">
                            {{ cat.description || '-' }}
                          </td>
                          <td class="py-2.5 px-2 text-center font-mono font-medium">
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px]">
                              {{ prodCount }}
                            </span>
                          </td>
                          <td class="py-2.5 px-3 text-right">
                            <div class="flex items-center justify-end space-x-1">
                              <button 
                                type="button" 
                                (click)="startEditCategory(cat)"
                                title="Editar Categoría"
                                class="p-1 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer">
                                <mat-icon class="text-sm">edit</mat-icon>
                              </button>
                              <button 
                                type="button" 
                                (click)="deleteCategory(cat)"
                                title="Eliminar Categoría"
                                class="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                                <mat-icon class="text-sm">delete</mat-icon>
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div class="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                (click)="showCategoryCrudModal.set(false)" 
                class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium cursor-pointer">
                Cerrar
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: GESTIÓN DE ALMACENES (CRUD) -->
      <!-- ========================================================= -->
      @if (showWarehouseCrudModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-sky-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-sky-300">warehouse</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Gestión de Almacenes, Bodegas y Depósitos</h3>
                  <p class="text-[11px] text-sky-200">Administrar ubicaciones físicas de inventario y bodega principal</p>
                </div>
              </div>
              <button (click)="showWarehouseCrudModal.set(false)" class="text-sky-200 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-6 text-xs">
              
              <!-- Form to Create/Edit Warehouse -->
              <form [formGroup]="warehouseForm" (ngSubmit)="saveWarehouse()" class="p-4 bg-sky-50/50 border border-sky-100 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <mat-icon class="text-sm text-sky-600">{{ editingWarehouseId() ? 'edit' : 'add_business' }}</mat-icon>
                    <span>{{ editingWarehouseId() ? 'Editar Almacén' : 'Nuevo Almacén / Depósito' }}</span>
                  </h4>
                  @if (editingWarehouseId()) {
                    <span class="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                      Modo Edición
                    </span>
                  }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Código del Almacén *</label>
                    <input 
                      type="text" 
                      formControlName="code" 
                      placeholder="Ej: ALM-SUR" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Nombre del Almacén *</label>
                    <input 
                      type="text" 
                      formControlName="name" 
                      placeholder="Ej: Almacén Sucursal Sur" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Dirección / Ubicación Física *</label>
                  <input 
                    type="text" 
                    formControlName="location" 
                    placeholder="Ej: Av. Principal Los Cortijos, Edif. Industrial Galpón 4" 
                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Responsable / Encargado</label>
                    <input 
                      type="text" 
                      formControlName="managerName" 
                      placeholder="Ej: Luis Valera" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      formControlName="phone" 
                      placeholder="Ej: +58 412 555-9000" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Capacidad Estimada (UND)</label>
                    <input 
                      type="number" 
                      formControlName="capacity" 
                      placeholder="10000" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  </div>
                </div>

                <div class="flex items-center space-x-2 pt-1">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" formControlName="isMain" class="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    <span class="font-semibold text-slate-700">Designar como Almacén Principal (Bodega predeterminada)</span>
                  </label>
                </div>

                <div class="flex items-center justify-end space-x-2 pt-2 border-t border-sky-100">
                  @if (editingWarehouseId()) {
                    <button 
                      type="button" 
                      (click)="cancelWarehouseEdit()" 
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                      Cancelar
                    </button>
                  }
                  <button 
                    type="submit" 
                    [disabled]="warehouseForm.invalid" 
                    class="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center space-x-1">
                    <mat-icon class="text-sm">save</mat-icon>
                    <span>{{ editingWarehouseId() ? 'Actualizar Almacén' : 'Crear Almacén' }}</span>
                  </button>
                </div>
              </form>

              <!-- Warehouse List Cards -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-800 text-xs">
                    Almacenes Registrados ({{ stateService.warehouses().length }})
                  </h4>
                  <span class="text-[11px] text-slate-500">
                    Control de existencias y disponibilidad física
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (wh of stateService.warehouses(); track wh.id) {
                    @let totalItems = getWarehouseStockCount(wh.id);
                    @let totalProds = getWarehouseProductTypesCount(wh.id);
                    <div class="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 relative"
                      [class.ring-2]="wh.isMain"
                      [class.ring-sky-500]="wh.isMain">
                      
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="flex items-center space-x-1.5">
                            <span class="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700">
                              {{ wh.code }}
                            </span>
                            <span class="font-bold text-slate-900 text-xs">{{ wh.name }}</span>
                          </div>
                          <p class="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <mat-icon class="text-[12px] text-slate-400">place</mat-icon>
                            <span>{{ wh.location }}</span>
                          </p>
                        </div>

                        @if (wh.isMain) {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-0.5">
                            <mat-icon class="text-[11px]">star</mat-icon>
                            <span>PRINCIPAL</span>
                          </span>
                        }
                      </div>

                      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        <div>
                          <span class="text-slate-400 block text-[10px]">Existencia Total:</span>
                          <span class="font-mono font-bold text-slate-800">{{ totalItems }} unidades</span>
                          <span class="text-[10px] text-slate-400 block">({{ totalProds }} productos)</span>
                        </div>
                        <div>
                          <span class="text-slate-400 block text-[10px]">Responsable:</span>
                          <span class="text-slate-700 font-medium truncate block">{{ wh.managerName || 'No asignado' }}</span>
                          @if (wh.phone) {
                            <span class="text-[10px] font-mono text-slate-500 block">{{ wh.phone }}</span>
                          }
                        </div>
                      </div>

                      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                        @if (!wh.isMain) {
                          <button 
                            type="button" 
                            (click)="setAsMainWarehouse(wh)"
                            class="text-[11px] font-semibold text-sky-600 hover:text-sky-800 cursor-pointer flex items-center space-x-0.5">
                            <mat-icon class="text-[13px]">check_circle</mat-icon>
                            <span>Hacer Principal</span>
                          </button>
                        } @else {
                          <span class="text-[11px] text-slate-400">Predeterminado</span>
                        }

                        <div class="flex items-center space-x-1">
                          <button 
                            type="button" 
                            (click)="startEditWarehouse(wh)"
                            title="Editar Almacén"
                            class="p-1 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer">
                            <mat-icon class="text-sm">edit</mat-icon>
                          </button>
                          @if (!wh.isMain) {
                            <button 
                              type="button" 
                              (click)="deleteWarehouse(wh)"
                              title="Eliminar Almacén"
                              class="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                              <mat-icon class="text-sm">delete</mat-icon>
                            </button>
                          }
                        </div>
                      </div>

                    </div>
                  }
                </div>
              </div>

            </div>

            <div class="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                (click)="showWarehouseCrudModal.set(false)" 
                class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium cursor-pointer">
                Cerrar
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: NUEVO PRODUCTO CON ALMACÉN Y CATEGORÍAS MÚLTIPLES -->
      <!-- ========================================================= -->
      @if (showNewProductModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-indigo-400">add_box</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Registrar Nuevo Producto</h3>
                  <p class="text-[11px] text-slate-300">Asignación a Almacén, Categorías Múltiples y 5 Niveles de Precios</p>
                </div>
              </div>
              <button (click)="showNewProductModal.set(false)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="newProductForm" (ngSubmit)="submitNewProduct()" class="p-6 space-y-4 text-xs">
              
              <!-- 1. Warehouse Selection Section -->
              <div class="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block font-semibold text-sky-950 flex items-center space-x-1.5">
                    <mat-icon class="text-sm text-sky-600">warehouse</mat-icon>
                    <span>Almacén de Ubicación / Asignación Inicial *</span>
                  </label>
                  <span class="text-[10px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    Pertenencia de Stock
                  </span>
                </div>
                <select 
                  formControlName="warehouseId" 
                  class="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20">
                  @for (wh of stateService.warehouses(); track wh.id) {
                    <option [value]="wh.id">
                      [{{ wh.code }}] {{ wh.name }} @if (wh.isMain) { (Principal) } - {{ wh.location }}
                    </option>
                  }
                </select>
                <p class="text-[11px] text-sky-800">
                  El stock inicial de este producto se guardará directamente en este almacén físico.
                </p>
              </div>

              <!-- 2. SKU, Barcode, Name -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">SKU / Código *</span>
                  <input type="text" formControlName="sku" placeholder="Ej: HER-TAL-09" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Código de Barras *</span>
                  <input type="text" formControlName="barcode" placeholder="Ej: 775123400109" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>

              <div>
                <span class="block font-semibold text-slate-700 mb-1">Nombre / Descripción del Producto *</span>
                <input type="text" formControlName="name" placeholder="Ej: Taladro Percutor Inalámbrico 20V Motor Brushless" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              <!-- 3. Multi-Select Categories Section -->
              <div class="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-2">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="block font-semibold text-slate-800 flex items-center space-x-1.5">
                      <mat-icon class="text-sm text-purple-600">category</mat-icon>
                      <span>Categorías del Producto (Selección Múltiple) *</span>
                    </span>
                    <p class="text-[11px] text-slate-500">
                      Seleccione una o más categorías a las que pertenece este producto:
                    </p>
                  </div>
                  <span class="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {{ selectedNewProductCategories().length }} seleccionada(s)
                  </span>
                </div>

                <!-- Chips selector -->
                <div class="flex flex-wrap gap-1.5 pt-1">
                  @for (cat of stateService.categories(); track cat.id) {
                    @let isSelected = selectedNewProductCategories().includes(cat.name);
                    <button 
                      type="button"
                      (click)="toggleNewProductCategory(cat.name)"
                      [class]="isSelected 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'"
                      class="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer">
                      <mat-icon class="text-[13px]">{{ isSelected ? 'check_circle' : 'add_circle_outline' }}</mat-icon>
                      <span>{{ cat.name }}</span>
                    </button>
                  }
                </div>

                @if (selectedNewProductCategories().length === 0) {
                  <p class="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                    <mat-icon class="text-[13px]">error_outline</mat-icon>
                    <span>Debe seleccionar al menos una categoría para el producto.</span>
                  </p>
                }

                <!-- Quick add new category input -->
                <div class="pt-2 flex items-center space-x-2 border-t border-purple-100">
                  <input 
                    type="text" 
                    [value]="quickAddCategoryName()"
                    (input)="quickAddCategoryName.set($any($event.target).value)"
                    (keydown.enter)="$event.preventDefault(); quickAddNewCategory()"
                    placeholder="+ Agregar nueva categoría al vuelo..." 
                    class="flex-1 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <button 
                    type="button"
                    (click)="quickAddNewCategory()"
                    [disabled]="!quickAddCategoryName().trim()"
                    class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap">
                    + Crear
                  </button>
                </div>
              </div>

              <!-- 4. Unit & Cost & Taxes -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Unidad de Medida *</span>
                  <select formControlName="unit" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="UND">UND (Unidad)</option>
                    <option value="KG">KG (Kilogramo)</option>
                    <option value="LT">LT (Litro)</option>
                    <option value="CJ">CJ (Caja)</option>
                    <option value="MT">MT (Metro)</option>
                    <option value="PQ">PQ (Paquete)</option>
                  </select>
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Costo Compra ($) *</span>
                  <input type="number" step="0.01" formControlName="costPrice" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span class="font-semibold text-slate-800 block text-xs">Régimen Fiscal (Impuesto al Valor Agregado)</span>
                  <p class="text-[11px] text-slate-500">Marque si este producto está legalmente exento de IVA (tasa 0%)</p>
                </div>
                <label class="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  <input type="checkbox" formControlName="isTaxExempt" class="rounded border-slate-300 text-emerald-600" />
                  <span class="font-semibold text-slate-700">Exento de IVA (0%)</span>
                </label>
              </div>

              <!-- 5 Prices Entry -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 block text-xs">5 Niveles de Precio de Venta ($ USD)</span>
                  <span class="text-[10px] text-slate-500">Calcula automáticamente o personalice cada nivel</span>
                </div>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium">P1 Detal *</span>
                    <input type="number" step="0.01" formControlName="salePrice" class="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs" />
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium">P2 Mayor</span>
                    <input type="number" step="0.01" formControlName="price2" class="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" />
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium">P3 Distrib.</span>
                    <input type="number" step="0.01" formControlName="price3" class="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" />
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium">P4 VIP</span>
                    <input type="number" step="0.01" formControlName="price4" class="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" />
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium">P5 Especial</span>
                    <input type="number" step="0.01" formControlName="price5" class="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs" />
                  </div>
                </div>
              </div>

              <!-- Stock Values -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Stock Mínimo (Alerta de reposición) *</span>
                  <input type="number" formControlName="minStock" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Stock Inicial de Apertura *</span>
                  <input type="number" min="0" formControlName="initialStock" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>

              <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" (click)="showNewProductModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="newProductForm.invalid || selectedNewProductCategories().length === 0" 
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs cursor-pointer flex items-center space-x-1">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>Guardar Producto</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      }

    </div>
  `
})
export class InventoryComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);

  searchTerm = signal<string>('');
  selectedCategory = signal<string>('ALL');
  selectedWarehouse = signal<string>('ALL');
  onlyLowStock = signal<boolean>(false);

  showAdjustModal = signal<boolean>(false);
  showNewProductModal = signal<boolean>(false);
  showCategoryCrudModal = signal<boolean>(false);
  showWarehouseCrudModal = signal<boolean>(false);
  
  selectedProductForPrices = signal<Product | null>(null);
  selectedNewProductCategories = signal<string[]>([]);
  quickAddCategoryName = signal<string>('');

  editingCategoryId = signal<string | null>(null);
  editingWarehouseId = signal<string | null>(null);

  categoryForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    code: new FormControl('', [Validators.required, Validators.minLength(2)]),
    description: new FormControl(''),
    color: new FormControl('blue')
  });

  warehouseForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.minLength(2)]),
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    location: new FormControl('', [Validators.required, Validators.minLength(3)]),
    isMain: new FormControl(false),
    status: new FormControl<'ACTIVE' | 'INACTIVE'>('ACTIVE'),
    capacity: new FormControl(10000, [Validators.min(1)]),
    managerName: new FormControl(''),
    phone: new FormControl(''),
    description: new FormControl('')
  });

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (!action) return;

      if (action.actionId === 'NEW_PRODUCT') {
        this.openNewProductModal();
      } else if (action.actionId === 'NEW_STOCK_ADJUST') {
        this.openAdjustModal();
      }
    });
  }

  categories = computed(() => {
    const catNames = this.stateService.categories().map(c => c.name);
    const prodCats = this.stateService.products().flatMap(p => p.categories && p.categories.length > 0 ? p.categories : [p.category]);
    const set = new Set([...catNames, ...prodCats]);
    return Array.from(set).filter(Boolean);
  });

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const cat = this.selectedCategory();
    const wh = this.selectedWarehouse();
    const low = this.onlyLowStock();

    return this.stateService.products().filter(prod => {
      // Search
      const matchesSearch = !term ||
        prod.name.toLowerCase().includes(term) ||
        prod.sku.toLowerCase().includes(term) ||
        prod.barcode.toLowerCase().includes(term);

      // Category (handles single category and categories array)
      const matchesCat = cat === 'ALL' || 
        prod.category === cat || 
        (prod.categories && prod.categories.includes(cat));

      // Warehouse
      const matchesWh = wh === 'ALL' || 
        (prod.primaryWarehouseId === wh) ||
        prod.stockByWarehouse.some(s => s.warehouseId === wh && s.quantity > 0);

      // Low Stock
      const matchesLow = !low || prod.totalStock <= prod.minStock;

      return matchesSearch && matchesCat && matchesWh && matchesLow;
    });
  });

  // Adjust Stock Form
  adjustForm = new FormGroup({
    productId: new FormControl('', [Validators.required]),
    warehouseId: new FormControl(this.stateService.warehouses()[0]?.id || '', [Validators.required]),
    adjustmentType: new FormControl<'MERMA' | 'SOBRANTE' | 'INVENTARIO_FISICO'>('MERMA', [Validators.required]),
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
    supportDocument: new FormControl('', [Validators.required, Validators.minLength(3)]),
    justificationReason: new FormControl('', [Validators.required, Validators.minLength(5)])
  });

  // 5 Prices Form
  pricesForm = new FormGroup({
    price1: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    price2: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    price3: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    price4: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    price5: new FormControl(0, [Validators.required, Validators.min(0.01)]),
    isTaxExempt: new FormControl(false)
  });

  // New Product Form
  newProductForm = new FormGroup({
    warehouseId: new FormControl('', [Validators.required]),
    sku: new FormControl('', [Validators.required]),
    barcode: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    unit: new FormControl<'UND' | 'KG' | 'LT' | 'CJ' | 'MT' | 'PQ'>('UND', [Validators.required]),
    costPrice: new FormControl(10.00, [Validators.required, Validators.min(0.01)]),
    salePrice: new FormControl(18.00, [Validators.required, Validators.min(0.01)]),
    price2: new FormControl(16.20),
    price3: new FormControl(14.76),
    price4: new FormControl(14.04),
    price5: new FormControl(13.50),
    isTaxExempt: new FormControl(false),
    minStock: new FormControl(5, [Validators.required, Validators.min(1)]),
    initialStock: new FormControl(10, [Validators.required, Validators.min(0)])
  });

  toggleOnlyLowStock() {
    this.onlyLowStock.set(!this.onlyLowStock());
  }

  getWarehouseShortName(whId: string): string {
    const wh = this.stateService.warehouses().find(w => w.id === whId);
    return wh ? wh.code : whId;
  }

  getWarehouseName(whId?: string): string {
    if (!whId) return 'Almacén Principal';
    const wh = this.stateService.warehouses().find(w => w.id === whId);
    return wh ? wh.name : whId;
  }

  getCategoryObj(name: string): ProductCategory | undefined {
    return this.stateService.categories().find(c => c.name.toLowerCase() === name.toLowerCase());
  }

  getCategoryBadgeClass(color?: string): string {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'sky':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  }

  // ==========================================
  // CATEGORY CRUD ACTIONS
  // ==========================================
  openCategoryModal() {
    this.cancelCategoryEdit();
    this.showCategoryCrudModal.set(true);
  }

  startEditCategory(cat: ProductCategory) {
    this.editingCategoryId.set(cat.id);
    this.categoryForm.patchValue({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      color: cat.color || 'blue'
    });
  }

  cancelCategoryEdit() {
    this.editingCategoryId.set(null);
    this.categoryForm.reset({
      name: '',
      code: '',
      description: '',
      color: 'blue'
    });
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;
    const val = this.categoryForm.value;
    const editId = this.editingCategoryId();

    if (editId) {
      const res = this.stateService.updateCategory(editId, {
        name: val.name!.trim(),
        code: val.code!.trim().toUpperCase(),
        description: (val.description || '').trim(),
        color: (val.color as any) || 'blue'
      });
      if (res.success) {
        this.cancelCategoryEdit();
      }
    } else {
      const res = this.stateService.createCategory({
        name: val.name!.trim(),
        code: val.code!.trim().toUpperCase(),
        description: (val.description || '').trim(),
        color: (val.color as any) || 'blue'
      });
      if (res.success) {
        this.cancelCategoryEdit();
      }
    }
  }

  deleteCategory(cat: ProductCategory) {
    if (confirm(`¿Está seguro de eliminar la categoría "${cat.name}"?`)) {
      this.stateService.deleteCategory(cat.id);
    }
  }

  getProductsCountForCategory(catName: string): number {
    return this.stateService.products().filter(p => 
      p.category === catName || (p.categories && p.categories.includes(catName))
    ).length;
  }

  // ==========================================
  // WAREHOUSE CRUD ACTIONS
  // ==========================================
  openWarehouseModal() {
    this.cancelWarehouseEdit();
    this.showWarehouseCrudModal.set(true);
  }

  startEditWarehouse(wh: Warehouse) {
    this.editingWarehouseId.set(wh.id);
    this.warehouseForm.patchValue({
      code: wh.code,
      name: wh.name,
      location: wh.location,
      isMain: Boolean(wh.isMain),
      status: wh.status || 'ACTIVE',
      capacity: wh.capacity || 10000,
      managerName: wh.managerName || '',
      phone: wh.phone || '',
      description: wh.description || ''
    });
  }

  cancelWarehouseEdit() {
    this.editingWarehouseId.set(null);
    this.warehouseForm.reset({
      code: '',
      name: '',
      location: '',
      isMain: false,
      status: 'ACTIVE',
      capacity: 10000,
      managerName: '',
      phone: '',
      description: ''
    });
  }

  saveWarehouse() {
    if (this.warehouseForm.invalid) return;
    const val = this.warehouseForm.value;
    const editId = this.editingWarehouseId();

    if (editId) {
      const res = this.stateService.updateWarehouse(editId, {
        code: val.code!.trim().toUpperCase(),
        name: val.name!.trim(),
        location: val.location!.trim(),
        isMain: Boolean(val.isMain),
        status: val.status || 'ACTIVE',
        capacity: Number(val.capacity) || 10000,
        managerName: (val.managerName || '').trim(),
        phone: (val.phone || '').trim(),
        description: (val.description || '').trim()
      });
      if (res.success) {
        this.cancelWarehouseEdit();
      }
    } else {
      const res = this.stateService.createWarehouse({
        code: val.code!.trim().toUpperCase(),
        name: val.name!.trim(),
        location: val.location!.trim(),
        isMain: Boolean(val.isMain),
        status: val.status || 'ACTIVE',
        capacity: Number(val.capacity) || 10000,
        managerName: (val.managerName || '').trim(),
        phone: (val.phone || '').trim(),
        description: (val.description || '').trim()
      });
      if (res.success) {
        this.cancelWarehouseEdit();
      }
    }
  }

  deleteWarehouse(wh: Warehouse) {
    if (confirm(`¿Está seguro de eliminar el almacén "${wh.name}" (${wh.code})?`)) {
      this.stateService.deleteWarehouse(wh.id);
    }
  }

  setAsMainWarehouse(wh: Warehouse) {
    this.stateService.setMainWarehouse(wh.id);
  }

  getWarehouseStockCount(whId: string): number {
    return this.stateService.products().reduce((total, p) => {
      const entry = p.stockByWarehouse?.find(s => s.warehouseId === whId);
      return total + (entry ? entry.quantity : 0);
    }, 0);
  }

  getWarehouseProductTypesCount(whId: string): number {
    return this.stateService.products().filter(p => {
      const entry = p.stockByWarehouse?.find(s => s.warehouseId === whId);
      return entry && entry.quantity > 0;
    }).length;
  }

  // ==========================================
  // NEW PRODUCT & MULTI-CATEGORY HANDLING
  // ==========================================
  openNewProductModal() {
    const firstCat = this.stateService.categories()[0]?.name || 'Herramientas Eléctricas';
    this.selectedNewProductCategories.set([firstCat]);
    const defaultWh = this.stateService.warehouses().find(w => w.isMain)?.id || this.stateService.warehouses()[0]?.id || '';
    
    this.newProductForm.reset({
      warehouseId: defaultWh,
      sku: '',
      barcode: '',
      name: '',
      unit: 'UND',
      costPrice: 10.00,
      salePrice: 18.00,
      price2: 16.20,
      price3: 14.76,
      price4: 14.04,
      price5: 13.50,
      isTaxExempt: false,
      minStock: 5,
      initialStock: 10
    });
    this.showNewProductModal.set(true);
  }

  toggleNewProductCategory(catName: string) {
    this.selectedNewProductCategories.update(current => {
      if (current.includes(catName)) {
        if (current.length === 1) {
          this.stateService.notify('warning', 'Categoría requerida', 'El producto debe pertenecer al menos a una categoría.');
          return current;
        }
        return current.filter(c => c !== catName);
      } else {
        return [...current, catName];
      }
    });
  }

  quickAddNewCategory() {
    const name = this.quickAddCategoryName().trim();
    if (!name) return;
    const res = this.stateService.createCategory({ name });
    if (res.success && res.category) {
      this.selectedNewProductCategories.update(curr => [...curr, res.category!.name]);
      this.quickAddCategoryName.set('');
    }
  }

  openAdjustModal() {
    const firstProd = this.stateService.products()[0];
    if (firstProd) {
      this.adjustForm.patchValue({
        productId: firstProd.id,
        warehouseId: this.stateService.warehouses()[0].id,
        quantity: 1,
        supportDocument: 'FOLIO-ADJ-' + Math.floor(Math.random() * 9000 + 1000),
        justificationReason: ''
      });
    }
    this.showAdjustModal.set(true);
  }

  openAdjustModalForProduct(prod: Product) {
    this.adjustForm.patchValue({
      productId: prod.id,
      warehouseId: this.stateService.warehouses()[0].id,
      quantity: 1,
      supportDocument: 'FOLIO-MERMA-' + Math.floor(Math.random() * 9000 + 1000),
      justificationReason: ''
    });
    this.showAdjustModal.set(true);
  }

  openPricesModal(prod: Product) {
    this.selectedProductForPrices.set(prod);
    const p1 = prod.prices?.price1 ?? prod.salePrice;
    this.pricesForm.patchValue({
      price1: p1,
      price2: prod.prices?.price2 ?? Number((p1 * 0.90).toFixed(2)),
      price3: prod.prices?.price3 ?? Number((p1 * 0.82).toFixed(2)),
      price4: prod.prices?.price4 ?? Number((p1 * 0.78).toFixed(2)),
      price5: prod.prices?.price5 ?? Number((p1 * 0.75).toFixed(2)),
      isTaxExempt: Boolean(prod.isTaxExempt || prod.taxRate === 0)
    });
  }

  saveProductPrices() {
    const prod = this.selectedProductForPrices();
    if (!prod || this.pricesForm.invalid) return;

    const val = this.pricesForm.value;
    const prices: ProductPrices = {
      price1: Number(val.price1 || prod.salePrice),
      price2: Number(val.price2 || (val.price1! * 0.90)),
      price3: Number(val.price3 || (val.price1! * 0.82)),
      price4: Number(val.price4 || (val.price1! * 0.78)),
      price5: Number(val.price5 || (val.price1! * 0.75))
    };

    const isExempt = Boolean(val.isTaxExempt);
    this.stateService.updateProductPricesAndTaxes(prod.id, prices, isExempt, isExempt ? 0 : 0.16);
    this.selectedProductForPrices.set(null);
  }

  submitStockAdjustment() {
    if (this.adjustForm.invalid) return;

    const val = this.adjustForm.value;
    const qty = Number(val.quantity || 1);
    const qtyDelta = val.adjustmentType === 'MERMA' ? -qty : qty;

    const result = this.stateService.adjustStock(
      val.productId!,
      val.warehouseId!,
      val.adjustmentType!,
      qtyDelta,
      val.supportDocument!,
      val.justificationReason!
    );

    if (result.success) {
      this.showAdjustModal.set(false);
    }
  }

  submitNewProduct() {
    if (this.newProductForm.invalid) return;
    if (this.selectedNewProductCategories().length === 0) {
      this.stateService.notify('warning', 'Categoría obligatoria', 'Seleccione al menos una categoría para el producto.');
      return;
    }

    const val = this.newProductForm.value;
    const targetWhId = val.warehouseId || this.stateService.warehouses().find(w => w.isMain)?.id || this.stateService.warehouses()[0]?.id || '';
    const targetWh = this.stateService.warehouses().find(w => w.id === targetWhId);
    const targetWhName = targetWh ? targetWh.name : 'Almacén';

    const p1 = Number(val.salePrice);
    const isExempt = Boolean(val.isTaxExempt);

    const prices: ProductPrices = {
      price1: p1,
      price2: Number(val.price2 || (p1 * 0.90)),
      price3: Number(val.price3 || (p1 * 0.82)),
      price4: Number(val.price4 || (p1 * 0.78)),
      price5: Number(val.price5 || (p1 * 0.75))
    };

    const chosenCategories = this.selectedNewProductCategories();
    const primaryCat = chosenCategories[0] || 'General';

    this.stateService.createProduct({
      sku: val.sku!.trim().toUpperCase(),
      barcode: val.barcode!.trim(),
      name: val.name!.trim(),
      category: primaryCat,
      categories: chosenCategories,
      primaryWarehouseId: targetWhId,
      unit: val.unit as 'UND',
      costPrice: Number(val.costPrice),
      salePrice: p1,
      prices,
      isTaxExempt: isExempt,
      taxRate: isExempt ? 0 : 0.16,
      minStock: Number(val.minStock),
      stockByWarehouse: [
        { warehouseId: targetWhId, warehouseName: targetWhName, quantity: Number(val.initialStock) }
      ],
      status: 'ACTIVE'
    });

    this.showNewProductModal.set(false);
  }

  downloadInventoryCsv() {
    const list = this.filteredProducts();
    if (list.length === 0) {
      this.stateService.notify('warning', 'Sin Registros', 'No hay productos para exportar con los filtros actuales.');
      return;
    }
    const bcv = this.stateService.bcvState().usdRate;
    const success = exportInventoryToCsv(list, bcv);
    if (success) {
      this.stateService.notify('success', 'Descarga Completada', `Se han exportado ${list.length} productos a formato CSV exitosamente.`);
    } else {
      this.stateService.notify('error', 'Error de Exportación', 'No fue posible generar el archivo CSV.');
    }
  }
}
