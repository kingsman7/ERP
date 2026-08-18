import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';

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
              Órdenes de entrada con recálculo automático de Costo Promedio Ponderado
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="showNewSupplierModal.set(true)"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors">
            <mat-icon class="text-sm">person_add</mat-icon>
            <span>Nuevo Proveedor</span>
          </button>

          <button 
            (click)="showNewPurchaseModal.set(true)"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors">
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
          class="px-4 py-2 rounded-xl border border-transparent transition-colors flex items-center space-x-1.5">
          <mat-icon class="text-sm">receipt</mat-icon>
          <span>Órdenes de Entrada ({{ stateService.purchaseOrders().length }})</span>
        </button>

        <button 
          (click)="activeTab.set('suppliers')"
          [class]="activeTab() === 'suppliers' ? 'bg-indigo-50 text-indigo-700 font-semibold border-indigo-200' : 'hover:bg-slate-100 text-slate-600'"
          class="px-4 py-2 rounded-xl border border-transparent transition-colors flex items-center space-x-1.5">
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
                  <p class="text-[11px] text-amber-100">Actualiza stock y calcula nuevo Costo Promedio Ponderado</p>
                </div>
              </div>
              <button (click)="showNewPurchaseModal.set(false)" class="text-white/80 hover:text-white">
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

              <!-- Add Item Row -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span class="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">Agregar Producto a la Orden</span>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div class="md:col-span-2">
                    <select #prodSelect class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800">
                      @for (p of stateService.products(); track p.id) {
                        <option [value]="p.id">{{ p.sku }} - {{ p.name }} (Actual: \${{ p.costPrice.toFixed(2) }})</option>
                      }
                    </select>
                  </div>
                  <div>
                    <input #qtyInput type="number" min="1" value="10" placeholder="Cant" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800" />
                  </div>
                  <div>
                    <input #costInput type="number" step="0.01" value="40.00" placeholder="Costo Unit $" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800" />
                  </div>
                </div>
                <div class="flex justify-end">
                  <button 
                    type="button" 
                    (click)="addItem(prodSelect.value, +qtyInput.value, +costInput.value)"
                    class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>Añadir Ítem</span>
                  </button>
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
                          <button (click)="removeItem($index)" class="text-rose-500 hover:text-rose-700">
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
                <button type="button" (click)="showNewPurchaseModal.set(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  [disabled]="itemsList().length === 0"
                  (click)="submitPurchaseOrder(notesInput.value)"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-xs">
                  Recibir Mercancía (Transacción ACID)
                </button>
              </div>
            </div>

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
              <button (click)="showNewSupplierModal.set(false)" class="text-slate-400 hover:text-white">
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
                  <span class="block font-semibold text-slate-700 mb-1">RUT / RFC *</span>
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
                <button type="button" (click)="showNewSupplierModal.set(false)" class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium">Cancelar</button>
                <button type="submit" [disabled]="supplierForm.invalid" class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-xs">Guardar Proveedor</button>
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

  activeTab = signal<'orders' | 'suppliers'>('orders');
  showNewPurchaseModal = signal<boolean>(false);
  showNewSupplierModal = signal<boolean>(false);

  selectedSupplierId = signal<string>(this.stateService.suppliers()[0]?.id || '');
  selectedWarehouseId = signal<string>(this.stateService.warehouses()[0]?.id || '');
  itemsList = signal<TempItem[]>([]);

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

  addItem(productId: string, quantity: number, unitCost: number) {
    if (!productId || quantity <= 0 || unitCost <= 0) return;
    this.itemsList.update(list => [...list, { productId, quantity, unitCost, taxRate: 0.16 }]);
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
