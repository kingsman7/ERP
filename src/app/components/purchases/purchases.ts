import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { ProductPrices } from '../../models/erp.models';

interface TempItem {
  productId: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
}

@Component({
  selector: 'app-purchases',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <span class="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <mat-icon>local_shipping</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Compras, Recepción & Proveedores
            </h1>
            <p class="text-xs text-slate-500">
              Órdenes de entrada con recálculo automático de Costo Promedio Ponderado y Creación al Vuelo de Productos
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="showNewSupplierModal.set(true)"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer">
            <mat-icon class="text-sm">person_add</mat-icon>
            <span>Nuevo Proveedor</span>
          </button>

          <button 
            (click)="openNewPurchaseModal()"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
            <mat-icon class="text-base">add_shopping_cart</mat-icon>
            <span>Nueva Entrada de Mercancía</span>
          </button>
        </div>
      </div>

      <!-- Navigation Sub-tabs -->
      <div class="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-medium text-slate-600">
        <button 
          (click)="activeTab.set('orders')"
          [class]="activeTab() === 'orders' ? 'bg-indigo-50 text-indigo-700 font-semibold border-indigo-200' : 'hover:bg-slate-100 text-slate-600'"
          class="px-4 py-2 rounded-xl border border-transparent transition-colors flex items-center space-x-1.5 cursor-pointer">
          <mat-icon class="text-sm">receipt</mat-icon>
          <span>Órdenes de Entrada ({{ stateService.purchaseOrders().length }})</span>
        </button>

        <button 
          (click)="activeTab.set('suppliers')"
          [class]="activeTab() === 'suppliers' ? 'bg-indigo-50 text-indigo-700 font-semibold border-indigo-200' : 'hover:bg-slate-100 text-slate-600'"
          class="px-4 py-2 rounded-xl border border-transparent transition-colors flex items-center space-x-1.5 cursor-pointer">
          <mat-icon class="text-sm">contacts</mat-icon>
          <span>Directorio de Proveedores ({{ stateService.suppliers().length }})</span>
        </button>
      </div>

      <!-- Tab 1: Orders List -->
      @if (activeTab() === 'orders') {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4">Orden / Folio</th>
                  <th class="py-3 px-3">Fecha & Recepción</th>
                  <th class="py-3 px-3">Proveedor</th>
                  <th class="py-3 px-3">Almacén Destino</th>
                  <th class="py-3 px-3 text-center">Ítems</th>
                  <th class="py-3 px-3 text-right">Subtotal</th>
                  <th class="py-3 px-3 text-right">Total ($)</th>
                  <th class="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                @for (po of stateService.purchaseOrders(); track po.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="py-3 px-4">
                      <span class="font-mono font-bold text-slate-900 text-sm">{{ po.orderNumber }}</span>
                    </td>
                    <td class="py-3 px-3">
                      <p class="font-medium text-slate-800">{{ po.date }}</p>
                      <p class="text-[11px] text-slate-400">Recibió: {{ po.receivedBy }}</p>
                    </td>
                    <td class="py-3 px-3">
                      <p class="font-semibold text-slate-900">{{ po.supplierName }}</p>
                      <p class="text-[10px] text-slate-400 font-mono">{{ po.supplierTaxId }}</p>
                    </td>
                    <td class="py-3 px-3 font-medium text-slate-700">
                      {{ po.warehouseName }}
                    </td>
                    <td class="py-3 px-3 text-center font-mono">
                      <span class="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                        {{ po.items.length }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono text-slate-600">
                      \${{ po.subtotal.toFixed(2) }}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      \${{ po.total.toFixed(2) }}
                    </td>
                    <td class="py-3 px-4 text-center">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {{ po.status }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="text-center py-10 text-slate-400">
                      No hay órdenes de compra registradas.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab 2: Suppliers Directory -->
      @if (activeTab() === 'suppliers') {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (sup of stateService.suppliers(); track sup.id) {
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-all">
              <div class="flex items-start justify-between">
                <div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {{ sup.category }}
                  </span>
                  <h3 class="font-bold text-slate-900 text-sm mt-1">{{ sup.name }}</h3>
                  <p class="text-xs text-slate-500 font-mono">ID Fiscal: {{ sup.taxId }}</p>
                </div>
                <div class="flex items-center text-amber-500 text-xs font-bold">
                  <mat-icon class="text-sm">star</mat-icon>
                  <span>{{ sup.rating }}</span>
                </div>
              </div>

              <div class="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                <p class="flex items-center space-x-1">
                  <mat-icon class="text-xs text-slate-400">person</mat-icon>
                  <span>{{ sup.contactPerson }}</span>
                </p>
                <p class="flex items-center space-x-1">
                  <mat-icon class="text-xs text-slate-400">email</mat-icon>
                  <span class="text-indigo-600">{{ sup.email }}</span>
                </p>
                <p class="flex items-center space-x-1">
                  <mat-icon class="text-xs text-slate-400">phone</mat-icon>
                  <span>{{ sup.phone }}</span>
                </p>
              </div>

              <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span class="text-slate-400">Término de Pago:</span>
                <span class="font-semibold text-slate-800">{{ sup.paymentTerms.replace('_', ' ') }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: NUEVA ENTRADA DE COMPRA CON CÁLCULO DE COSTO CPP -->
      <!-- ========================================================= -->
      @if (showNewPurchaseModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon>add_shopping_cart</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Registrar Entrada de Mercancía / Orden de Compra</h3>
                  <p class="text-[11px] text-amber-100">Actualiza stock, genera Kardex y recalcula Costo Promedio Ponderado</p>
                </div>
              </div>
              <button (click)="showNewPurchaseModal.set(false)" class="text-white/80 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <!-- Form Top Grid: Supplier & Warehouse -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Proveedor *</span>
                  <select 
                    [value]="selectedSupplierId()"
                    (change)="selectedSupplierId.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    @for (sup of stateService.suppliers(); track sup.id) {
                      <option [value]="sup.id">{{ sup.name }} ({{ sup.taxId }})</option>
                    }
                  </select>
                </div>

                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Almacén de Recepción *</span>
                  <select 
                    [value]="selectedWarehouseId()"
                    (change)="selectedWarehouseId.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    @for (wh of stateService.warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Add Item Row with Quick Product Creator (Workflow) -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700 uppercase tracking-wider block text-[11px] flex items-center space-x-1.5">
                    <mat-icon class="text-xs text-amber-600">playlist_add</mat-icon>
                    <span>Agregar Producto a la Orden de Entrada</span>
                  </span>

                  <!-- Quick Create Button -->
                  <button 
                    type="button"
                    (click)="openQuickProductModal()"
                    class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer">
                    <mat-icon class="text-xs text-amber-700">add_circle</mat-icon>
                    <span>Crear Producto Expess</span>
                  </button>
                </div>

                <!-- Quick Filter / Search within product list -->
                <div class="relative">
                  <mat-icon class="absolute left-2.5 top-2 text-slate-400 text-sm">search</mat-icon>
                  <input 
                    type="text" 
                    [value]="productSearchQuery()"
                    (input)="productSearchQuery.set($any($event.target).value)"
                    placeholder="Filtrar catálogo por nombre, SKU o código de barra..." 
                    class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>

                <!-- No match warning with instant creation prompt -->
                @if (productSearchQuery().trim().length > 1 && filteredProducts().length === 0) {
                  <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
                    <div class="flex items-center space-x-2 text-amber-900">
                      <mat-icon class="text-amber-600 text-base">info</mat-icon>
                      <span>No se encontró <strong>"{{ productSearchQuery() }}"</strong> en el catálogo.</span>
                    </div>
                    <button 
                      type="button" 
                      (click)="openQuickProductModal(productSearchQuery())"
                      class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer shadow-xs">
                      <mat-icon class="text-xs">bolt</mat-icon>
                      <span>Crear "{{ productSearchQuery() }}" ahora</span>
                    </button>
                  </div>
                }

                <div class="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div class="md:col-span-6">
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Producto del Catálogo</span>
                    <select #prodSelect class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800">
                      @for (p of filteredProducts(); track p.id) {
                        <option [value]="p.id" [selected]="p.id === selectedProductIdForEntry()">
                          {{ p.sku }} - {{ p.name }} (Costo Actual: \${{ p.costPrice.toFixed(2) }})
                        </option>
                      }
                    </select>
                  </div>
                  <div class="md:col-span-2">
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Cantidad</span>
                    <input #qtyInput type="number" min="1" value="10" placeholder="Cant" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800" />
                  </div>
                  <div class="md:col-span-2">
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Costo Unit $</span>
                    <input #costInput type="number" step="0.01" value="40.00" placeholder="Costo Unit $" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800" />
                  </div>
                  <div class="md:col-span-2">
                    <button 
                      type="button" 
                      (click)="addItem(prodSelect.value, +qtyInput.value, +costInput.value)"
                      class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer">
                      <mat-icon class="text-xs">add</mat-icon>
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Items in Purchase Order Table with CPP Simulation -->
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th class="py-2 px-3">Producto</th>
                      <th class="py-2 px-2 text-center">Cant</th>
                      <th class="py-2 px-2 text-right">C. Unit Compra</th>
                      <th class="py-2 px-2 text-right">Subtotal</th>
                      <th class="py-2 px-3 text-right bg-teal-50 text-teal-900">Nuevo CPP Simulado</th>
                      <th class="py-2 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (item of itemsList(); track $index) {
                      <tr>
                        <td class="py-2 px-3 font-medium text-slate-900">{{ getProductName(item.productId) }}</td>
                        <td class="py-2 px-2 text-center font-mono">{{ item.quantity }}</td>
                        <td class="py-2 px-2 text-right font-mono">\${{ item.unitCost.toFixed(2) }}</td>
                        <td class="py-2 px-2 text-right font-mono font-medium">\${{ (item.quantity * item.unitCost).toFixed(2) }}</td>
                        <td class="py-2 px-3 text-right font-mono font-bold text-teal-800 bg-teal-50/50">
                          \${{ calculateSimulatedCPP(item.productId, item.quantity, item.unitCost).toFixed(2) }}
                        </td>
                        <td class="py-2 px-2 text-center">
                          <button (click)="removeItem($index)" class="text-rose-500 hover:text-rose-700 cursor-pointer">
                            <mat-icon class="text-sm">delete</mat-icon>
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center py-6 text-slate-400">
                          No has agregado ítems a la orden de compra.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Notes -->
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Notas / Guía de Despacho del Proveedor</span>
                <input #notesInput type="text" placeholder="Ej: Factura Proveedor F-902, Remisión 4022..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

            </div>

            <!-- Footer with Totals and Submit -->
            <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span class="text-xs text-slate-500">Total con IVA (16%):</span>
                <span class="font-mono font-bold text-base text-slate-900 ml-2">\${{ (purchaseTotal() * 1.16).toFixed(2) }}</span>
              </div>

              <div class="flex items-center space-x-2">
                <button type="button" (click)="showNewPurchaseModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  [disabled]="itemsList().length === 0"
                  (click)="submitPurchaseOrder(notesInput.value)"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs cursor-pointer">
                  Recibir Mercancía (Transacción ACID)
                </button>
              </div>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: CREAR PRODUCTO EXPRESS -->
      <!-- ========================================================= -->
      @if (showQuickProductModal()) {
        <div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="p-1.5 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center">
                  <mat-icon class="text-sm font-bold">bolt</mat-icon>
                </span>
                <div>
                  <h3 class="font-semibold text-sm">Crear Producto Express (Catálogo Rápido)</h3>
                  <p class="text-[11px] text-slate-300">Se registrará en inventario y se agregará de inmediato a esta compra</p>
                </div>
              </div>
              <button (click)="showQuickProductModal.set(false)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="quickProductForm" (ngSubmit)="submitQuickProduct()" class="p-6 overflow-y-auto space-y-3.5 text-xs">
              
              <!-- SKU & Barcode Row -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-slate-700">SKU / Código *</span>
                    <button type="button" (click)="generateAutoSku()" class="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
                      Generar Auto
                    </button>
                  </div>
                  <input type="text" formControlName="sku" placeholder="Ej: MAT-VAL-34" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Código de Barras</span>
                  <input type="text" formControlName="barcode" placeholder="Ej: 7751029384" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              <!-- Product Name -->
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Nombre / Descripción del Producto *</span>
                <input type="text" formControlName="name" placeholder="Ej: Válvula de Paso Esférica Bronce 1/2 pulgada" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-1 focus:ring-amber-500" />
              </div>

              <!-- Category & Unit -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Categoría *</span>
                  <select formControlName="category" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="Ferretería">Ferretería & Plomería</option>
                    <option value="Eléctricos">Material Eléctrico</option>
                    <option value="Iluminación">Iluminación LED</option>
                    <option value="Pinturas">Pinturas & Acabados</option>
                    <option value="Redes">Redes & Telecomunicaciones</option>
                    <option value="Herramientas">Herramientas</option>
                    <option value="Construcción">Materiales de Construcción</option>
                    <option value="General">General / Misceláneos</option>
                  </select>
                </div>

                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Unidad de Medida *</span>
                  <select formControlName="unit" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="UND">UND (Unidad)</option>
                    <option value="KG">KG (Kilogramo)</option>
                    <option value="LT">LT (Litro)</option>
                    <option value="CJ">CJ (Caja)</option>
                    <option value="MT">MT (Metro)</option>
                    <option value="PQ">PQ (Paquete)</option>
                    <option value="ROLLO">ROLLO (Rollo)</option>
                  </select>
                </div>
              </div>

              <!-- Cost, Sale Price & Margin Auto-Calculation -->
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 block text-xs">Costos y Precios de Venta ($ USD)</span>
                  <div class="flex items-center space-x-1 text-[10px]">
                    <span class="text-slate-400">Margen rápido:</span>
                    <button type="button" (click)="applyMargin(25)" class="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-700 cursor-pointer">+25%</button>
                    <button type="button" (click)="applyMargin(35)" class="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-700 cursor-pointer">+35%</button>
                    <button type="button" (click)="applyMargin(50)" class="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-700 cursor-pointer">+50%</button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="block font-semibold text-slate-700 mb-1">Costo Unit. Compra ($) *</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="costPrice" 
                      (input)="onCostChanged()"
                      placeholder="10.00" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900" />
                  </div>
                  <div>
                    <span class="block font-semibold text-slate-700 mb-1">Precio Venta Detal P1 ($) *</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      formControlName="salePrice" 
                      placeholder="13.50" 
                      class="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-emerald-700" />
                  </div>
                </div>

                <div class="pt-1">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" formControlName="isTaxExempt" class="rounded border-slate-300 text-emerald-600" />
                    <span class="font-medium text-slate-700">Producto Exento de IVA (0%)</span>
                  </label>
                </div>
              </div>

              <!-- Quantity to receive right now -->
              <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <span class="block font-bold text-amber-950 flex items-center space-x-1">
                  <mat-icon class="text-amber-600 text-sm">shopping_bag</mat-icon>
                  <span>Cantidad a Ingresar en esta Entrada *</span>
                </span>
                <div class="grid grid-cols-2 gap-2 items-center">
                  <input 
                    type="number" 
                    min="1" 
                    formControlName="initialBuyQty" 
                    placeholder="10" 
                    class="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-slate-900" />
                  <span class="text-[11px] text-amber-800">
                    Se insertará automáticamente en la tabla de compra.
                  </span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  (click)="showQuickProductModal.set(false)" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="quickProductForm.invalid" 
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer">
                  <mat-icon class="text-sm">check_circle</mat-icon>
                  <span>Crear y Añadir a la Compra</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: NUEVO PROVEEDOR -->
      <!-- ========================================================= -->
      @if (showNewSupplierModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 class="font-semibold text-sm">Registrar Nuevo Proveedor</h3>
              <button (click)="showNewSupplierModal.set(false)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="supplierForm" (ngSubmit)="submitSupplier()" class="p-6 space-y-3 text-xs">
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Razón Social / Nombre *</span>
                <input type="text" formControlName="name" placeholder="Ej: Materiales Eléctricos Central S.A." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">RUT / RFC / RIF *</span>
                  <input type="text" formControlName="taxId" placeholder="Ej: J-88192033-1" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Término de Pago *</span>
                  <select formControlName="paymentTerms" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="CONTADO">Contado</option>
                    <option value="15_DIAS">15 Días</option>
                    <option value="30_DIAS">30 Días</option>
                    <option value="60_DIAS">60 Días</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Contacto</span>
                  <input type="text" formControlName="contactPerson" placeholder="Persona contacto" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <span class="block font-semibold text-slate-700 mb-1">Categoría</span>
                  <input type="text" formControlName="category" placeholder="Ej: Ferretería" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div>
                <span class="block font-semibold text-slate-700 mb-1">Email</span>
                <input type="email" formControlName="email" placeholder="ventas@proveedor.com" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" (click)="showNewSupplierModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium cursor-pointer">Cancelar</button>
                <button type="submit" [disabled]="supplierForm.invalid" class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-xs cursor-pointer">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class PurchasesComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);

  activeTab = signal<'orders' | 'suppliers'>('orders');
  showNewPurchaseModal = signal<boolean>(false);
  showNewSupplierModal = signal<boolean>(false);
  showQuickProductModal = signal<boolean>(false);

  productSearchQuery = signal<string>('');
  selectedProductIdForEntry = signal<string>('');

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_PURCHASE') {
        this.activeTab.set('orders');
        this.openNewPurchaseModal();
      }
    });
  }

  selectedSupplierId = signal<string>(this.stateService.suppliers()[0]?.id || '');
  selectedWarehouseId = signal<string>(this.stateService.warehouses()[0]?.id || '');
  itemsList = signal<TempItem[]>([]);

  filteredProducts = computed(() => {
    const q = this.productSearchQuery().trim().toLowerCase();
    const prods = this.stateService.products();
    if (!q) return prods;
    return prods.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  purchaseTotal = computed(() => {
    return this.itemsList().reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);
  });

  supplierForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    taxId: new FormControl('', [Validators.required]),
    contactPerson: new FormControl(''),
    email: new FormControl('', [Validators.email]),
    phone: new FormControl('+52 55 0000 0000'),
    address: new FormControl('Zona Industrial'),
    paymentTerms: new FormControl<'CONTADO' | '15_DIAS' | '30_DIAS' | '60_DIAS'>('30_DIAS', [Validators.required]),
    category: new FormControl('General'),
    rating: new FormControl(5.0)
  });

  quickProductForm = new FormGroup({
    sku: new FormControl('', [Validators.required]),
    barcode: new FormControl(''),
    name: new FormControl('', [Validators.required]),
    category: new FormControl('Ferretería', [Validators.required]),
    unit: new FormControl('UND', [Validators.required]),
    costPrice: new FormControl(10.00, [Validators.required, Validators.min(0.01)]),
    salePrice: new FormControl(13.50, [Validators.required, Validators.min(0.01)]),
    isTaxExempt: new FormControl(false),
    initialBuyQty: new FormControl(10, [Validators.required, Validators.min(1)])
  });

  openNewPurchaseModal() {
    this.productSearchQuery.set('');
    if (this.stateService.products().length > 0) {
      this.selectedProductIdForEntry.set(this.stateService.products()[0].id);
    }
    this.showNewPurchaseModal.set(true);
  }

  openQuickProductModal(prefilledName = '') {
    const rawName = prefilledName.trim() || this.productSearchQuery().trim();
    const suggestedSku = this.generateSkuFromName(rawName);

    this.quickProductForm.reset({
      sku: suggestedSku,
      barcode: suggestedSku.replace(/[^A-Z0-9]/gi, ''),
      name: rawName,
      category: 'Ferretería',
      unit: 'UND',
      costPrice: 10.00,
      salePrice: 13.50,
      isTaxExempt: false,
      initialBuyQty: 10
    });

    this.showQuickProductModal.set(true);
  }

  generateAutoSku() {
    const name = this.quickProductForm.value.name || '';
    const newSku = this.generateSkuFromName(name);
    this.quickProductForm.patchValue({ sku: newSku, barcode: newSku.replace(/[^A-Z0-9]/gi, '') });
  }

  private generateSkuFromName(name: string): string {
    const prefix = name && name.length >= 3 ? name.substring(0, 3).toUpperCase() : 'PRD';
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}-${rand}`;
  }

  onCostChanged() {
    const cost = Number(this.quickProductForm.value.costPrice || 0);
    if (cost > 0) {
      // Default 35% margin
      const sale = Number((cost * 1.35).toFixed(2));
      this.quickProductForm.patchValue({ salePrice: sale });
    }
  }

  applyMargin(percent: number) {
    const cost = Number(this.quickProductForm.value.costPrice || 0);
      if (cost > 0 && percent < 100) {
      // Dividir entre (1 - margen) para obtener el precio de venta real de ERP
      const sale = Number((cost / (1 - percent / 100)).toFixed(2));
      this.quickProductForm.patchValue({ salePrice: sale });
    }
  }

  submitQuickProduct() {
    if (this.quickProductForm.invalid) return;

    const val = this.quickProductForm.value;
    const p1 = Number(val.salePrice);
    const isExempt = Boolean(val.isTaxExempt);
    const cost = Number(val.costPrice);
    const buyQty = Number(val.initialBuyQty || 10);
    const whCentral = this.stateService.warehouses()[0];

    const prices: ProductPrices = {
      price1: p1,
      price2: Number((p1 * 0.90).toFixed(2)),
      price3: Number((p1 * 0.82).toFixed(2)),
      price4: Number((p1 * 0.78).toFixed(2)),
      price5: Number((p1 * 0.75).toFixed(2))
    };

    const createdProduct = this.stateService.createProduct({
      sku: val.sku!.trim().toUpperCase(),
      barcode: val.barcode?.trim() || val.sku!.trim().toUpperCase(),
      name: val.name!.trim(),
      category: val.category!.trim(),
      unit: val.unit as 'UND',
      costPrice: cost,
      salePrice: p1,
      prices,
      isTaxExempt: isExempt,
      taxRate: isExempt ? 0 : 0.16,
      minStock: 5,
      stockByWarehouse: [
        { warehouseId: whCentral.id, warehouseName: whCentral.name, quantity: 0 }
      ],
      status: 'ACTIVE'
    });

    // Auto-select and add to current purchase order
    this.selectedProductIdForEntry.set(createdProduct.id);
    this.addItem(createdProduct.id, buyQty, cost);

    this.productSearchQuery.set('');
    this.showQuickProductModal.set(false);

    this.stateService.notify(
      'success',
      'Producto Creado al Vuelo',
      `"${createdProduct.sku} - ${createdProduct.name}" agregado con éxito a la orden de compra.`
    );
  }

  addItem(productId: string, quantity: number, unitCost: number) {
    if (!productId || quantity <= 0 || unitCost <= 0) return;
    
    // Check if item is tax exempt
    const p = this.stateService.products().find(item => item.id === productId);
    const taxRate = p?.isTaxExempt ? 0 : 0.16;

    this.itemsList.update(list => [...list, { productId, quantity, unitCost, taxRate }]);
  }

  removeItem(index: number) {
    this.itemsList.update(list => list.filter((_, i) => i !== index));
  }

  getProductName(prodId: string): string {
    const p = this.stateService.products().find(item => item.id === prodId);
    return p ? `${p.sku} - ${p.name}` : prodId;
  }

  calculateSimulatedCPP(prodId: string, incomingQty: number, incomingCost: number): number {
    const prod = this.stateService.products().find(p => p.id === prodId);
    if (!prod) return incomingCost;
    const currentStock = prod.totalStock;
    const currentCost = prod.costPrice;
    const newTotal = currentStock + incomingQty;
    if (newTotal <= 0) return incomingCost;
    return ((currentStock * currentCost) + (incomingQty * incomingCost)) / newTotal;
  }

  submitPurchaseOrder(notes: string) {
    if (this.itemsList().length === 0) return;

    const result = this.stateService.registerPurchaseOrder(
      this.selectedSupplierId(),
      this.selectedWarehouseId(),
      this.itemsList(),
      notes
    );

    if (result.success) {
      this.itemsList.set([]);
      this.showNewPurchaseModal.set(false);
    }
  }

  submitSupplier() {
    if (this.supplierForm.invalid) return;
    const val = this.supplierForm.value;
    this.stateService.createSupplier({
      name: val.name!.trim(),
      taxId: val.taxId!.trim().toUpperCase(),
      contactPerson: val.contactPerson || '',
      email: val.email || '',
      phone: val.phone || '',
      address: val.address || '',
      paymentTerms: val.paymentTerms as '30_DIAS',
      category: val.category || 'General',
      rating: 4.8
    });
    this.supplierForm.reset({ paymentTerms: '30_DIAS' });
    this.showNewSupplierModal.set(false);
  }
}
