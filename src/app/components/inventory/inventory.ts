import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { Product, ProductPrices } from '../../models/erp.models';

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
          <!-- Adjust Stock Button -->
          <button 
            (click)="openAdjustModal()"
            class="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer">
            <mat-icon class="text-base text-amber-600">tune</mat-icon>
            <span>Ajuste / Merma con Soporte</span>
          </button>

          <!-- New Product Button -->
          <button 
            (click)="showNewProductModal.set(true)"
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
                <th class="py-3 px-3">Categoría</th>
                <th class="py-3 px-3 text-center">Unidad</th>
                <th class="py-3 px-3 text-right">Costo Promedio (CPP)</th>
                <th class="py-3 px-3 text-center">Niveles de Precio ($ / Bs.)</th>
                <th class="py-3 px-3 text-center">Impuesto</th>
                <th class="py-3 px-3 text-center">Stock Total</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (prod of filteredProducts(); track prod.id) {
                @let bcv = stateService.bcvState();
                @let p1 = prod.prices.price1 ?? prod.salePrice;
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

                  <!-- Category -->
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {{ prod.category }}
                    </span>
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

                  <!-- Total Stock & Minimum Alert -->
                  <td class="py-3 px-3 text-center">
                    <div class="inline-flex flex-col items-center">
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
          <span>Mostrando {{ filteredProducts().length }} de {{ stateService.products().length }} productos</span>
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
      <!-- MODAL: NUEVO PRODUCTO CON 5 NIVELES DE PRECIO E IVA -->
      <!-- ========================================================= -->
      @if (showNewProductModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-indigo-400">add_box</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Registrar Nuevo Producto</h3>
                  <p class="text-[11px] text-slate-300">Catálogo general, 5 niveles de precios e impuesto</p>
                </div>
              </div>
              <button (click)="showNewProductModal.set(false)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="newProductForm" (ngSubmit)="submitNewProduct()" class="p-6 space-y-3.5 text-xs">
              
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">SKU / Código *</span>
                  <input type="text" formControlName="sku" placeholder="Ej: HER-TAL-09" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Código de Barras *</span>
                  <input type="text" formControlName="barcode" placeholder="Ej: 775123400109" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>

              <div>
                <span class="block font-semibold text-slate-700 mb-1">Nombre / Descripción *</span>
                <input type="text" formControlName="name" placeholder="Ej: Disco de Corte Diamantado 4.5 pulg" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Categoría *</span>
                  <input type="text" formControlName="category" placeholder="Ej: Abrasivos" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Unidad de Medida *</span>
                  <select formControlName="unit" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="UND">UND (Unidad)</option>
                    <option value="KG">KG (Kilogramo)</option>
                    <option value="LT">LT (Litro)</option>
                    <option value="CJ">CJ (Caja)</option>
                    <option value="MT">MT (Metro)</option>
                  </select>
                </div>
              </div>

              <!-- Cost and Tax Exempt Flag -->
              <div class="grid grid-cols-2 gap-3 items-center">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Costo Compra ($) *</span>
                  <input type="number" step="0.01" formControlName="costPrice" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div class="pt-4">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" formControlName="isTaxExempt" class="rounded border-slate-300 text-emerald-600" />
                    <span class="font-semibold text-slate-700">Exento de IVA (0%)</span>
                  </label>
                </div>
              </div>

              <!-- 5 Prices Entry -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span class="font-bold text-slate-800 block text-xs">5 Niveles de Precio ($ USD)</span>
                <div class="grid grid-cols-3 gap-2">
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

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Stock Mínimo *</span>
                  <input type="number" formControlName="minStock" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Stock Inicial *</span>
                  <input type="number" min="0" formControlName="initialStock" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>

              <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" (click)="showNewProductModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" [disabled]="newProductForm.invalid" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs cursor-pointer">
                  Guardar Producto
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

  searchTerm = signal<string>('');
  selectedCategory = signal<string>('ALL');
  selectedWarehouse = signal<string>('ALL');
  onlyLowStock = signal<boolean>(false);

  showAdjustModal = signal<boolean>(false);
  showNewProductModal = signal<boolean>(false);
  selectedProductForPrices = signal<Product | null>(null);

  categories = computed(() => {
    const set = new Set(this.stateService.products().map(p => p.category));
    return Array.from(set);
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

      // Category
      const matchesCat = cat === 'ALL' || prod.category === cat;

      // Warehouse
      const matchesWh = wh === 'ALL' || prod.stockByWarehouse.some(s => s.warehouseId === wh && s.quantity > 0);

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
    sku: new FormControl('', [Validators.required]),
    barcode: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    category: new FormControl('Herramientas', [Validators.required]),
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

    const val = this.newProductForm.value;
    const whCentral = this.stateService.warehouses()[0];
    const p1 = Number(val.salePrice);
    const isExempt = Boolean(val.isTaxExempt);

    const prices: ProductPrices = {
      price1: p1,
      price2: Number(val.price2 || (p1 * 0.90)),
      price3: Number(val.price3 || (p1 * 0.82)),
      price4: Number(val.price4 || (p1 * 0.78)),
      price5: Number(val.price5 || (p1 * 0.75))
    };

    this.stateService.createProduct({
      sku: val.sku!.trim().toUpperCase(),
      barcode: val.barcode!.trim(),
      name: val.name!.trim(),
      category: val.category!.trim(),
      unit: val.unit as 'UND',
      costPrice: Number(val.costPrice),
      salePrice: p1,
      prices,
      isTaxExempt: isExempt,
      taxRate: isExempt ? 0 : 0.16,
      minStock: Number(val.minStock),
      stockByWarehouse: [
        { warehouseId: whCentral.id, warehouseName: whCentral.name, quantity: Number(val.initialStock) }
      ],
      status: 'ACTIVE'
    });

    this.newProductForm.reset({
      category: 'Herramientas',
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
    this.showNewProductModal.set(false);
  }
}
