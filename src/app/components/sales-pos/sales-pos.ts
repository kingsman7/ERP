import { Component, ChangeDetectionStrategy, inject, signal, computed, output, effect } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { 
  Product, 
  PaymentMethod, 
  PaymentRecord, 
  Invoice, 
  CurrencyCode, 
  PriceLevelKey 
} from '../../models/erp.models';
import { exportSalesToCsv, exportSaleItemLinesToCsv } from '../../utils/csv-exporter';
import { DecimalPipe } from '@angular/common';
import { InvoiceModal } from '../invoice-modal/invoice-modal';

interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  priceLevel: PriceLevelKey;
}

export interface SplitPaymentLine {
  id: string;
  method: PaymentMethod;
  currency: CurrencyCode;
  amount: number;
  reference?: string;
}

@Component({
  selector: 'app-sales-pos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, DecimalPipe, InvoiceModal],
  template: `
    <div class="space-y-4 pb-12">
      
      <!-- Top Title & Multi-Currency / BCV Header Banner -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <mat-icon>{{ activeSalesTab() === 'pos' ? 'point_of_sale' : 'receipt_long' }}</mat-icon>
            </div>
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <h1 class="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {{ activeSalesTab() === 'pos' ? 'Punto de Venta & Facturación Multimoneda' : 'Historial de Facturas y Registro de Ventas' }}
                </h1>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  IVA + IGTF 3%
                </span>
              </div>
              <p class="text-xs text-slate-500">
                {{ activeSalesTab() === 'pos' ? 'Cobro flexible en USD, VES y EUR con 5 niveles de precios y sincronización BCV' : 'Consulta, auditoría fiscal, anulación y exportación de reportes de facturación' }}
              </p>
            </div>
          </div>

          <!-- Top Navigation & Action Controls -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            
            <!-- View Mode Switcher -->
            <div class="flex items-center p-1 bg-slate-100 border border-slate-200/80 rounded-xl">
              <button 
                type="button"
                (click)="activeSalesTab.set('pos')"
                [class]="activeSalesTab() === 'pos' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer">
                <mat-icon class="text-sm">point_of_sale</mat-icon>
                <span>Terminal POS</span>
              </button>

              <button 
                type="button"
                (click)="activeSalesTab.set('history')"
                [class]="activeSalesTab() === 'history' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                class="px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer">
                <mat-icon class="text-sm">receipt_long</mat-icon>
                <span>Historial Facturas</span>
                <span class="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-mono text-[10px]">
                  {{ stateService.invoices().length }}
                </span>
              </button>
            </div>

            <!-- Download CSV Direct Action -->
            <button 
              type="button"
              (click)="downloadSalesCsv()"
              title="Descargar lista de ventas y facturas a formato CSV para Excel"
              class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <mat-icon class="text-base text-emerald-600">file_download</mat-icon>
              <span>Descargar CSV</span>
            </button>

            <!-- BCV Rate Live Pill -->
            <div class="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
              <span class="flex h-2 w-2 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div class="flex flex-col">
                <div class="flex items-center space-x-1.5 font-mono font-bold text-slate-800 text-[11px]">
                  <span>USD: Bs. {{ stateService.bcvState().usdRate | number:'1.2-2' }}</span>
                  <span class="text-slate-300">|</span>
                  <span>EUR: Bs. {{ stateService.bcvState().eurRate | number:'1.2-2' }}</span>
                </div>
                <span class="text-[9px] text-slate-400">
                  {{ stateService.bcvState().origin === 'API_BCV' ? 'BCV Oficial ' + stateService.bcvState().bcvOfficialDate : 'Tasa Manual' }}
                </span>
              </div>
              <button 
                type="button"
                (click)="stateService.syncBcvRates()"
                [disabled]="stateService.bcvState().isSyncing"
                title="Sincronizar tasa oficial BCV"
                class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer">
                <mat-icon [class.animate-spin]="stateService.bcvState().isSyncing" class="text-base">sync</mat-icon>
              </button>
            </div>

            @if (activeSalesTab() === 'pos') {
              <!-- Warehouse Selector -->
              <div class="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
                <mat-icon class="text-emerald-600 text-sm">store</mat-icon>
                <div class="flex flex-col">
                  <span class="text-[9px] uppercase font-bold text-slate-400 leading-none">Almacén / Despacho</span>
                  <select 
                    [value]="selectedWarehouseId()"
                    (change)="onWarehouseChange($any($event.target).value)"
                    class="bg-transparent font-bold text-slate-800 focus:outline-none text-xs cursor-pointer">
                    @for (wh of stateService.warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }}</option>
                    }
                    <option value="ALL">🌐 Todos los Almacenes</option>
                  </select>
                </div>
              </div>

              <!-- Price Tier Master Switch -->
              <div class="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <mat-icon class="text-indigo-500 text-sm">sell</mat-icon>
                <select 
                  [value]="selectedPriceTier()"
                  (change)="selectedPriceTier.set($any($event.target).value)"
                  class="bg-transparent font-semibold text-indigo-700 focus:outline-none text-xs">
                  @for (tier of stateService.priceLevelConfigs; track tier.key) {
                    <option [value]="tier.key">{{ tier.label }} ({{ tier.shortName }})</option>
                  }
                </select>
              </div>
            }

          </div>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- TAB 1: TERMINAL DE PUNTO DE VENTA (POS) -->
      <!-- ========================================================= -->
      @if (activeSalesTab() === 'pos') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Left Column: Search, Scanner, Quick Products (7 cols) -->
          <div class="lg:col-span-7 space-y-3">
            
            <!-- Barcode Quick-Scanner & Search Bar -->
            <div class="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
              <div class="relative">
                <mat-icon class="absolute left-3 top-2.5 text-emerald-600">qr_code_scanner</mat-icon>
                <input 
                  #barcodeInput
                  type="text" 
                  (keydown.enter)="onBarcodeScanned(barcodeInput.value); barcodeInput.value = ''"
                  placeholder="Escanear código de barras o escribir SKU/nombre y presionar [ENTER]..." 
                  class="w-full pl-10 pr-24 py-2 bg-emerald-50/30 border border-emerald-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <span class="absolute right-3 top-2.5 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                  ESCÁNER ACTIVO
                </span>
              </div>

              <!-- Filter Categories & Search Query -->
              <div class="flex items-center justify-between gap-2 text-xs">
                <div class="flex items-center space-x-1 overflow-x-auto pb-0.5 max-w-[65%]">
                  <button 
                    (click)="selectedCategoryFilter.set('ALL')"
                    [class]="selectedCategoryFilter() === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer">
                    Todos
                  </button>
                  @for (cat of categories(); track cat) {
                    <button 
                      (click)="selectedCategoryFilter.set(cat)"
                      [class]="selectedCategoryFilter() === cat ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                      class="px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer">
                      {{ cat }}
                    </button>
                  }
                </div>

                <div class="relative min-w-[130px]">
                  <input 
                    type="text" 
                    [value]="searchQuery()"
                    (input)="searchQuery.set($any($event.target).value)"
                    placeholder="Filtrar catálogo..." 
                    class="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  <mat-icon class="absolute left-1.5 top-1.5 text-slate-400 text-sm">search</mat-icon>
                </div>
              </div>

              <!-- Dedicated Warehouse Filter Bar -->
              <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs flex-wrap">
                <!-- Current Active Warehouse Indicator -->
                <div class="flex items-center space-x-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg px-2.5 py-1">
                  <mat-icon class="text-xs text-emerald-600">warehouse</mat-icon>
                  <span class="text-[11px] font-semibold text-emerald-950">
                    Almacén: <strong class="text-emerald-800">{{ selectedWarehouseName() }}</strong>
                  </span>
                  <span class="text-[10px] font-mono font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded-full">
                    {{ filteredCatalog().length }} disp.
                  </span>
                </div>

                <!-- Warehouse Stock Filter Modes -->
                <div class="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
                  <button 
                    type="button"
                    (click)="warehouseFilterMode.set('STOCK_AVAILABLE')"
                    title="Mostrar solo productos con stock disponible en este almacén"
                    [class]="warehouseFilterMode() === 'STOCK_AVAILABLE' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                    class="px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 transition-all cursor-pointer">
                    <mat-icon class="text-[13px]">check_circle</mat-icon>
                    <span>Con Stock</span>
                  </button>
                  <button 
                    type="button"
                    (click)="warehouseFilterMode.set('IN_WAREHOUSE')"
                    title="Mostrar todos los productos registrados en este almacén (incluso si stock es 0)"
                    [class]="warehouseFilterMode() === 'IN_WAREHOUSE' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                    class="px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 transition-all cursor-pointer">
                    <mat-icon class="text-[13px]">inventory_2</mat-icon>
                    <span>Todo el Almacén</span>
                  </button>
                  <button 
                    type="button"
                    (click)="warehouseFilterMode.set('ALL')"
                    title="Mostrar catálogo completo sin filtrar por almacén"
                    [class]="warehouseFilterMode() === 'ALL' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                    class="px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 transition-all cursor-pointer">
                    <mat-icon class="text-[13px]">public</mat-icon>
                    <span>Todo Catálogo</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Product Quick Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto p-1">
              @for (product of filteredCatalog(); track product.id) {
                @let whStock = getProductWarehouseStock(product);
                <button 
                  type="button"
                  (click)="addToCart(product)"
                  [title]="product.itemType !== 'SERVICE' && whStock <= 0 ? 'Sin stock en ' + selectedWarehouseName() : 'Agregar ' + product.name"
                  class="text-left bg-white p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group"
                  [class]="product.itemType !== 'SERVICE' && whStock <= 0 ? 'border-rose-200 bg-rose-50/20 opacity-80 hover:border-rose-400' : 'border-slate-200/80 hover:border-emerald-500/60 hover:shadow-md'">
                  
                  <div class="w-full">
                    <div class="flex items-start justify-between">
                      <div class="flex items-center space-x-1">
                        <span class="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-emerald-600">{{ product.sku }}</span>
                        @if (product.itemType === 'SERVICE') {
                          <span class="text-[9px] px-1 py-0.2 rounded font-bold bg-violet-100 text-violet-800">SERVICIO</span>
                        }
                      </div>
                      <span 
                        class="text-[10px] px-1.5 py-0.2 rounded-full font-medium"
                        [class]="product.isTaxExempt ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'">
                        {{ product.isTaxExempt ? 'Exento' : 'IVA 16%' }}
                      </span>
                    </div>
                    
                    <h2 class="text-xs font-semibold text-slate-900 line-clamp-2 mt-1 leading-snug">
                      {{ product.name }}
                    </h2>
                  </div>

                  <div class="w-full mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span class="text-[10px] text-slate-400 block font-medium">
                        {{ selectedPriceTierLabel() }}
                      </span>
                      <span class="text-sm font-mono font-bold text-slate-900">
                        \${{ getAppliedProductPrice(product) | number:'1.2-2' }}
                      </span>
                      <span class="text-[10px] font-mono text-emerald-700 block">
                        Bs. {{ (getAppliedProductPrice(product) * stateService.bcvState().usdRate) | number:'1.2-2' }}
                      </span>
                    </div>

                    <div class="text-right">
                      @if (product.itemType === 'SERVICE') {
                        <span class="text-[10px] font-mono font-semibold block text-violet-700 bg-violet-50 px-1 rounded">
                          {{ product.unit }} (Servicio)
                        </span>
                      } @else {
                        <span 
                          class="text-[10px] font-mono font-bold block"
                          [class]="whStock <= 0 ? 'text-rose-600 bg-rose-50 px-1 rounded' : (whStock <= product.minStock ? 'text-amber-700' : 'text-emerald-700')">
                          {{ selectedWarehouseId() === 'ALL' ? 'Stock Total:' : 'Stock Almacén:' }} {{ whStock }} {{ product.unit || 'UND' }}
                        </span>
                        @if (selectedWarehouseId() !== 'ALL') {
                          <span class="text-[9px] font-mono text-slate-400 block">
                            Global: {{ product.totalStock }}
                          </span>
                        }
                      }
                      <span 
                        class="p-1 rounded-lg transition-colors inline-flex items-center justify-center mt-1"
                        [class]="product.itemType !== 'SERVICE' && whStock <= 0 ? 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white' : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'">
                        <mat-icon class="text-base">{{ product.itemType !== 'SERVICE' && whStock <= 0 ? 'block' : 'add_shopping_cart' }}</mat-icon>
                      </span>
                    </div>
                  </div>

                </button>
              } @empty {
                <div class="col-span-full py-10 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs">
                  <mat-icon class="text-4xl text-slate-300 mb-1">storefront</mat-icon>
                  <p class="font-bold text-slate-700">No hay productos disponibles en {{ selectedWarehouseName() }}</p>
                  <p class="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                    No se encontraron productos con existencias en este almacén para la búsqueda o categoría seleccionada.
                  </p>
                  <div class="flex items-center justify-center space-x-2 mt-3">
                    <button 
                      type="button"
                      (click)="warehouseFilterMode.set('ALL')"
                      class="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer">
                      Ver catálogo global
                    </button>
                    <button 
                      type="button"
                      (click)="selectedCategoryFilter.set('ALL'); searchQuery.set('')"
                      class="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors cursor-pointer">
                      Restablecer filtros
                    </button>
                  </div>
                </div>
              }
            </div>

          </div>

          <!-- Right Column: Cart / Items Details Card + Fiscal Settlement & Multi-Currency Payment Card (5 cols) -->
          <div class="lg:col-span-5 space-y-3">
            
            <!-- ======================================================== -->
            <!-- CARD 1: DETALLE DE PRODUCTOS Y CANTIDADES (Renglones) -->
            <!-- ======================================================== -->
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
              
              <!-- Card 1 Header: Title, Item Count & Clear Action -->
              <div class="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <mat-icon class="text-base">shopping_cart</mat-icon>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-slate-900 block leading-tight">Renglones de Factura</span>
                    <span class="text-[10px] text-slate-500 font-medium">Detalle de productos y cantidades</span>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {{ cartItems().length }} ítems ({{ cartTotalUnits() }} und)
                  </span>
                  @if (cartItems().length > 0) {
                    <button 
                      type="button" 
                      (click)="clearCart()"
                      title="Vaciar carrito de compras"
                      class="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-colors flex items-center space-x-0.5 cursor-pointer">
                      <mat-icon class="text-xs">delete_sweep</mat-icon>
                      <span>Vaciar</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Customer Selector -->
              <div class="p-3 border-b border-slate-100 bg-white space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                    <mat-icon class="text-xs text-slate-400">person</mat-icon>
                    <span>Cliente / Receptor Fiscal:</span>
                  </span>
                  <button 
                    type="button"
                    (click)="openNewCustomerModal()"
                    title="Registrar nuevo cliente en el catálogo"
                    class="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer border border-emerald-200/80">
                    <mat-icon class="text-xs">person_add</mat-icon>
                    <span>+ Nuevo Cliente</span>
                  </button>
                </div>

                <select 
                  [value]="selectedCustomerId()"
                  (change)="selectedCustomerId.set($any($event.target).value)"
                  class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white">
                  @for (c of stateService.customers(); track c.id) {
                    <option [value]="c.id">{{ c.name }} ({{ c.taxId }})</option>
                  }
                </select>

                @if (selectedCustomer(); as cust) {
                  <div class="flex items-center justify-between text-[10px] text-slate-500 px-0.5 pt-0.5">
                    <span class="font-mono font-bold text-slate-700">{{ cust.taxId }}</span>
                    <span class="truncate max-w-[220px] text-slate-400">{{ cust.email || cust.phone || cust.customerType }}</span>
                  </div>

                  @if (cust.advanceBalanceUsd && cust.advanceBalanceUsd > 0) {
                    <div class="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-between gap-2 shadow-2xs">
                      <div class="flex items-center space-x-1.5 text-emerald-900">
                        <mat-icon class="text-emerald-600 text-base">account_balance_wallet</mat-icon>
                        <div class="text-[11px] leading-tight">
                          <span class="font-bold text-emerald-950">Saldo a Favor disponible:</span>
                          <div class="font-mono text-xs font-extrabold text-emerald-700">
                            \${{ cust.advanceBalanceUsd | number:'1.2-2' }} USD
                            <span class="text-[10px] font-normal text-emerald-800">
                              (Bs. {{ (cust.advanceBalanceUsd * stateService.bcvState().usdRate) | number:'1.2-2' }})
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="applyCustomerCreditToPayment()"
                        title="Aplicar saldo a favor al pago de esta venta"
                        class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center space-x-1 shadow-2xs transition-all cursor-pointer shrink-0">
                        <mat-icon class="text-xs">bolt</mat-icon>
                        <span>Aplicar al Pago</span>
                      </button>
                    </div>
                  }
                }
              </div>

              <!-- Cart Products List: Clearly Visible with direct number input & controls -->
              <div class="min-h-[170px] max-h-[380px] overflow-y-auto p-3 space-y-2.5">
                @for (item of cartItems(); track item.product.id) {
                  <div class="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col space-y-1.5 shadow-2xs">
                    
                    <!-- Row Top: Name, SKU, Badges & Remove -->
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                          <span class="text-xs font-bold text-slate-900 leading-snug">{{ item.product.name }}</span>
                          @if (item.product.itemType === 'SERVICE') {
                            <span class="text-[9px] bg-violet-100 text-violet-800 px-1.5 py-0.2 rounded font-bold">SERVICIO</span>
                          }
                          @if (item.product.isTaxExempt) {
                            <span class="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">EXENTO</span>
                          } @else {
                            <span class="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-medium">IVA 16%</span>
                          }
                        </div>
                        <div class="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>SKU: {{ item.product.sku }}</span>
                          <span>•</span>
                          <span>\${{ getItemUnitPrice(item) | number:'1.2-2' }} / {{ item.product.unit || 'UND' }}</span>
                          <span>(Bs. {{ (getItemUnitPrice(item) * stateService.bcvState().usdRate) | number:'1.2-2' }})</span>
                        </div>
                        @if (item.product.itemType !== 'SERVICE') {
                          @let curWhStock = getProductWarehouseStock(item.product);
                          <div class="flex items-center space-x-1.5 mt-0.5 text-[10px]">
                            <span class="text-slate-500">En {{ selectedWarehouseName() }}:</span>
                            <span class="font-mono font-bold" [class]="item.quantity > curWhStock ? 'text-rose-600 bg-rose-100 px-1 rounded' : 'text-emerald-700'">
                              {{ curWhStock }} {{ item.product.unit || 'UND' }}
                            </span>
                            @if (item.quantity > curWhStock) {
                              <span class="text-[9px] font-bold text-rose-700 bg-rose-100 px-1 py-0.2 rounded">
                                ¡Excede stock disponible!
                              </span>
                            }
                          </div>
                        }
                      </div>

                      <button 
                        type="button" 
                        (click)="removeItem(item.product.id)" 
                        title="Quitar producto de la factura"
                        class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0">
                        <mat-icon class="text-sm">delete_outline</mat-icon>
                      </button>
                    </div>

                    <!-- Row Bottom: Direct Quantity Controls + Line Subtotal -->
                    <div class="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      
                      <!-- Quantity input and +/- buttons -->
                      <div class="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button 
                          type="button" 
                          (click)="decreaseQty(item.product.id)"
                          title="Restar 1"
                          class="w-6 h-6 rounded hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer">
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          max="9999"
                          [value]="item.quantity"
                          (change)="updateItemQty(item.product.id, $any($event.target).value)"
                          title="Editar cantidad directamente"
                          class="w-10 text-center font-mono font-bold text-xs py-0.5 text-slate-900 border-x border-slate-100 focus:outline-none focus:bg-emerald-50/50" />
                        <button 
                          type="button" 
                          (click)="increaseQty(item.product.id)"
                          title="Sumar 1"
                          class="w-6 h-6 rounded hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer">
                          +
                        </button>
                      </div>

                      <!-- Line Subtotal Amount in USD and VES -->
                      <div class="text-right">
                        <span class="font-mono font-bold text-xs text-slate-900 block">
                          \${{ getItemSubtotal(item) | number:'1.2-2' }}
                        </span>
                        <span class="font-mono text-[10px] text-emerald-700 block">
                          Bs. {{ (getItemSubtotal(item) * stateService.bcvState().usdRate) | number:'1.2-2' }}
                        </span>
                      </div>

                    </div>

                  </div>
                } @empty {
                  <div class="h-36 flex flex-col items-center justify-center text-slate-400 text-xs py-6">
                    <mat-icon class="text-3xl text-slate-300 mb-1">shopping_basket</mat-icon>
                    <p class="font-medium">No hay productos en la factura</p>
                    <p class="text-[10px] text-slate-400">Escanee códigos o seleccione del catálogo a la izquierda</p>
                  </div>
                }
              </div>

              <!-- Card 1 Footer: Immediate Subtotal Reference -->
              <div class="p-2.5 bg-slate-100/70 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Subtotal Renglones ({{ cartTotalUnits() }} und):</span>
                <div class="text-right">
                  <span class="font-mono font-bold text-slate-900">\${{ cartSubtotalGross() | number:'1.2-2' }}</span>
                  <span class="text-[10px] font-mono text-slate-500 block">
                    Bs. {{ (cartSubtotalGross() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </span>
                </div>
              </div>

            </div>

            <!-- ======================================================== -->
            <!-- CARD 2: LIQUIDACIÓN FISCAL, COBRO Y PAGOS (SENIAT) -->
            <!-- ======================================================== -->
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col p-3.5 space-y-3">
              
              <!-- Fiscal Regime Switcher -->
              <div class="px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px]"
                [class.bg-indigo-50]="stateService.companyProfile().isSpecialTaxpayer"
                [class.border-indigo-200]="stateService.companyProfile().isSpecialTaxpayer"
                [class.bg-slate-100]="!stateService.companyProfile().isSpecialTaxpayer"
                [class.border-slate-200]="!stateService.companyProfile().isSpecialTaxpayer">
                <div class="flex items-center space-x-1.5 truncate">
                  <mat-icon class="text-xs" [class.text-indigo-600]="stateService.companyProfile().isSpecialTaxpayer" [class.text-slate-500]="!stateService.companyProfile().isSpecialTaxpayer">
                    {{ stateService.companyProfile().isSpecialTaxpayer ? 'verified_user' : 'storefront' }}
                  </mat-icon>
                  <span class="truncate font-semibold" [class.text-indigo-900]="stateService.companyProfile().isSpecialTaxpayer" [class.text-slate-700]="!stateService.companyProfile().isSpecialTaxpayer">
                    {{ stateService.companyProfile().isSpecialTaxpayer ? 'Sujeto Pasivo Especial SENIAT' : 'Contribuyente Ordinario' }}
                  </span>
                </div>
                <button 
                  type="button"
                  (click)="toggleCompanyFiscalSpecial()" 
                  title="Alternar estado fiscal entre Sujeto Pasivo Especial y Ordinario"
                  class="text-[10px] font-bold underline px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  [class.text-indigo-700]="stateService.companyProfile().isSpecialTaxpayer"
                  [class.hover:bg-indigo-100]="stateService.companyProfile().isSpecialTaxpayer"
                  [class.text-slate-600]="!stateService.companyProfile().isSpecialTaxpayer"
                  [class.hover:bg-slate-200]="!stateService.companyProfile().isSpecialTaxpayer">
                  {{ stateService.companyProfile().isSpecialTaxpayer ? 'Cambiar a Ordinario' : 'Cambiar a Especial' }}
                </button>
              </div>

              <!-- Itemized Taxes Breakdown -->
              <div class="space-y-1 text-xs">
                <div class="flex justify-between text-slate-500">
                  <span>Subtotal Bruto:</span>
                  <span class="font-mono font-medium text-slate-800">\${{ cartSubtotalGross() | number:'1.2-2' }}</span>
                </div>

                @if (computedTaxDetails().exemptBase > 0) {
                  <div class="flex justify-between text-amber-700">
                    <span>Base Exenta (0% IVA):</span>
                    <span class="font-mono font-medium">\${{ computedTaxDetails().exemptBase | number:'1.2-2' }}</span>
                  </div>
                }

                <div class="flex justify-between text-slate-500">
                  <span>Base Gravable (IVA {{ (selectedIvaRate() * 100).toFixed(0) }}%):</span>
                  <span class="font-mono font-medium text-slate-800">\${{ computedTaxDetails().taxableBase | number:'1.2-2' }}</span>
                </div>

                <div class="flex justify-between text-slate-500">
                  <span>Impuesto IVA Liquidado:</span>
                  <span class="font-mono font-medium text-slate-800">\${{ computedTaxDetails().ivaAmount | number:'1.2-2' }}</span>
                </div>

                <!-- IGTF Alert & SENIAT Status -->
                @if (computedTaxDetails().appliesIgtf && computedTaxDetails().igtfAmount > 0) {
                  <div class="flex justify-between items-center text-indigo-700 bg-indigo-50/90 px-2.5 py-1.5 rounded-xl border border-indigo-200/80">
                    <div>
                      <span class="font-semibold flex items-center space-x-1 text-[11px]">
                        <mat-icon class="text-xs">account_balance</mat-icon>
                        <span>Percepción IGTF 3% (Divisas / SENIAT):</span>
                      </span>
                      <span class="block text-[9px] text-indigo-500 font-normal">Base imponible en divisas: \${{ computedTaxDetails().igtfBase | number:'1.2-2' }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-mono font-bold text-xs">\${{ computedTaxDetails().igtfAmount | number:'1.2-2' }}</span>
                      <span class="block text-[9px] text-indigo-600 font-mono">Bs. {{ (computedTaxDetails().igtfAmount * stateService.bcvState().usdRate) | number:'1.2-2' }}</span>
                    </div>
                  </div>
                } @else {
                  <div class="flex justify-between items-center text-slate-500 bg-slate-100/70 px-2.5 py-1.5 rounded-xl border border-slate-200/60 text-[11px]">
                    <div>
                      <span class="font-medium flex items-center space-x-1">
                        <mat-icon class="text-xs text-emerald-600">verified</mat-icon>
                        <span>Alícuota IGTF: <strong class="text-emerald-700">0.00% (No Aplica)</strong></span>
                      </span>
                      <span class="block text-[9px] text-slate-400">
                        Exento: Pago en Bolívares / Medios Electrónicos Nacionales
                      </span>
                    </div>
                    <span class="font-mono font-semibold text-slate-600">$0.00</span>
                  </div>
                }
              </div>

              <!-- Grand Total Summary Banner -->
              <div class="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-xs">
                <div class="flex justify-between items-baseline">
                  <div>
                    <span class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">TOTAL GENERAL FACTURA</span>
                    <span class="text-xl font-bold font-mono text-emerald-400">\${{ grandTotalUsd() | number:'1.2-2' }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block font-mono">Equivalente BCV</span>
                    <span class="font-mono font-bold text-sm text-white block">
                      Bs. {{ grandTotalVes().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Payment Mode Switcher Tabs: Pago Único vs Pagos Mixtos SENIAT -->
              <div class="flex items-center justify-between p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button" 
                  (click)="toggleMixedPayment(false)"
                  [class]="!isMixedPayment() ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-500 hover:text-slate-800 font-medium'"
                  class="flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer">
                  <mat-icon class="text-sm text-emerald-600">payment</mat-icon>
                  <span>Pago Único</span>
                </button>
                <button 
                  type="button" 
                  (click)="toggleMixedPayment(true)"
                  [class]="isMixedPayment() ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
                  class="flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer">
                  <mat-icon class="text-sm">call_split</mat-icon>
                  <span>Pagos Mixtos (SENIAT)</span>
                </button>
              </div>

              <!-- SINGLE PAYMENT MODE -->
              @if (!isMixedPayment()) {
                <div class="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Moneda de Cobro</span>
                    <select 
                      [value]="selectedPaymentCurrency()"
                      (change)="onPaymentCurrencyChange($any($event.target).value)"
                      class="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white">
                      <option value="USD">USD ($ Dólares)</option>
                      <option value="VES">VES (Bs. Bolívares BCV)</option>
                      <option value="EUR">EUR (€ Euros)</option>
                    </select>
                  </div>

                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Método de Pago</span>
                    <select 
                      [value]="selectedPaymentMethod()"
                      (change)="onPaymentMethodChange($any($event.target).value)"
                      class="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white">
                      <option value="EFECTIVO_USD">Efectivo USD (Divisas)</option>
                      <option value="EFECTIVO">Efectivo Bolívares (VES)</option>
                      <option value="PAGO_MOVIL">Pago Móvil (VES)</option>
                      <option value="PUNTO_VENTA_DEBITO">Punto de Venta Débito (VES)</option>
                      <option value="TARJETA_CREDITO">Tarjeta de Crédito (VES)</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="ZELLE">Zelle / Wire (USD)</option>
                      <option value="CRIPTO">Criptomonedas / USDT</option>
                      <option value="CREDITO">Crédito Comercial</option>
                      <option value="SALDO_A_FAVOR">Saldo a Favor / Anticipo Cliente</option>
                    </select>
                  </div>
                </div>

                <!-- Cash Tendered & Real-Time Change / Vuelto Calculation (Multi-Currency) -->
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div class="flex items-center justify-between">
                    <label for="pos-cash-tendered-input" class="text-[11px] font-bold text-slate-800 flex items-center space-x-1">
                      <mat-icon class="text-sm text-emerald-600">payments</mat-icon>
                      <span>Monto Pagado por Cliente:</span>
                    </label>
                    <button 
                      type="button" 
                      (click)="setExactTendered()"
                      title="Cobro exacto sin vuelto"
                      class="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer">
                      Paga Exacto
                    </button>
                  </div>

                  <!-- Tendered Input -->
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs font-bold font-mono text-slate-500">
                      {{ selectedPaymentCurrency() === 'VES' ? 'Bs.' : (selectedPaymentCurrency() === 'EUR' ? '€' : '$') }}
                    </span>
                    <input 
                      id="pos-cash-tendered-input"
                      type="number" 
                      step="0.01" 
                      min="0"
                      [value]="cashTendered() !== null ? cashTendered() : ''"
                      (input)="onCashTenderedInput($event)"
                      [placeholder]="currentTotalToPay().toFixed(2)"
                      class="w-full pl-9 pr-14 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                    
                    <span class="absolute right-3 top-2 text-[10px] font-semibold text-slate-400 font-mono">
                      {{ selectedPaymentCurrency() }}
                    </span>
                  </div>

                  <!-- Quick Denomination Buttons -->
                  @if (cashSuggestions().length > 0) {
                    <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span class="text-[10px] text-slate-400 font-medium">Sugerido:</span>
                      @for (denom of cashSuggestions(); track denom) {
                        <button 
                          type="button" 
                          (click)="setTenderedAmount(denom)"
                          [class.ring-2]="cashTendered() === denom"
                          [class.ring-emerald-600]="cashTendered() === denom"
                          class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold transition-all cursor-pointer">
                          {{ selectedPaymentCurrency() === 'VES' ? 'Bs.' : '$' }}{{ denom }}
                        </button>
                      }
                    </div>
                  }

                  <!-- Live Change / Vuelto Result -->
                  @let ch = cashChangeDetails();
                  @if (ch.isSurplus) {
                    <div class="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-[11px] flex items-center space-x-1 text-emerald-900">
                          <mat-icon class="text-sm text-emerald-600">price_check</mat-icon>
                          <span>CAMBIO / VUELTO A ENTREGAR:</span>
                        </span>
                        <span class="font-mono font-extrabold text-sm text-emerald-700">
                          {{ selectedPaymentCurrency() === 'VES' ? 'Bs. ' : '$' }}{{ ch.changeInCurrency | number:'1.2-2' }}
                        </span>
                      </div>
                      
                      <!-- Dual Currency Change Breakdown -->
                      <div class="text-[10px] font-mono text-emerald-800/90 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                        <span>Equivalente en {{ selectedPaymentCurrency() === 'USD' ? 'Bolívares' : 'Dólares' }}:</span>
                        @if (selectedPaymentCurrency() === 'USD') {
                          <span class="font-bold">Bs. {{ ch.changeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                        } @else if (selectedPaymentCurrency() === 'VES') {
                          <span class="font-bold">\${{ ch.changeUsd | number:'1.2-2' }} USD</span>
                        } @else {
                          <span class="font-bold">Bs. {{ ch.changeVes | number:'1.2-2' }} (\${{ ch.changeUsd | number:'1.2-2' }})</span>
                        }
                      </div>

                      <!-- Opción de retener vuelto como Saldo a Favor / Anticipo -->
                      <div class="pt-2 border-t border-emerald-200/80 mt-1">
                        @if (selectedCustomer(); as cust) {
                          <label class="flex items-start space-x-2 cursor-pointer select-none bg-white/90 hover:bg-white p-2 rounded-lg border border-emerald-300 transition-all">
                            <input 
                              type="checkbox" 
                              [checked]="saveChangeAsCustomerCredit()" 
                              (change)="saveChangeAsCustomerCredit.set($any($event.target).checked)"
                              class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0">
                            <div class="flex-1 text-[11px] leading-tight text-emerald-950">
                              <div class="font-bold flex items-center space-x-1">
                                <mat-icon class="text-xs text-emerald-700">account_balance_wallet</mat-icon>
                                <span>¿Sin cambio físico? Guardar vuelto como Saldo a Favor</span>
                              </div>
                              <p class="text-[10px] text-emerald-800 mt-0.5">
                                Acreditar <strong>\${{ ch.changeUsd | number:'1.2-2' }} USD (Bs. {{ ch.changeVes | number:'1.2-2' }})</strong> a la cuenta de <strong>{{ cust.name }}</strong> ({{ cust.taxId }}) para sus futuras compras.
                              </p>
                            </div>
                          </label>
                        } @else {
                          <div class="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center space-x-1">
                            <mat-icon class="text-xs text-amber-600">info</mat-icon>
                            <span>Para retener el vuelto como saldo a favor, seleccione un cliente identificado con RIF.</span>
                          </div>
                        }
                      </div>
                    </div>
                  } @else if (ch.isDeficit) {
                    <div class="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-0.5">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-[11px] flex items-center space-x-1 text-rose-900">
                          <mat-icon class="text-sm text-rose-600">error_outline</mat-icon>
                          <span>MONTO INSUFICIENTE:</span>
                        </span>
                        <span class="font-mono font-bold text-xs text-rose-700">
                          -{{ selectedPaymentCurrency() === 'VES' ? 'Bs. ' : '$' }}{{ ch.deficitInCurrency | number:'1.2-2' }}
                        </span>
                      </div>
                      <p class="text-[10px] text-rose-700 font-mono">
                        Faltan: {{ selectedPaymentCurrency() === 'VES' ? 'Bs. ' : '$' }}{{ ch.deficitInCurrency | number:'1.2-2' }}
                        @if (selectedPaymentCurrency() === 'USD') { (Bs. {{ ch.deficitVes  | number: '1.2-2'  }}) }
                      </p>
                    </div>
                  } @else {
                    <div class="p-1 bg-white border border-slate-200 rounded-lg text-center text-[10px] text-slate-500 font-medium flex items-center justify-center space-x-1">
                      <mat-icon class="text-xs text-emerald-600">check</mat-icon>
                      <span>Pago Exacto (Sin vuelto a devolver)</span>
                    </div>
                  }
                </div>
              } @else {
                <!-- MIXED PAYMENTS (SENIAT SPLIT-TENDER) MODE -->
                <div class="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-2.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-1.5">
                      <mat-icon class="text-sm text-indigo-600">account_balance_wallet</mat-icon>
                      <span class="text-[11px] font-bold text-indigo-950">Métodos de Pago Mixtos ({{ splitPayments().length }})</span>
                    </div>
                    <button 
                      type="button" 
                      (click)="addSplitPayment()"
                      class="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors flex items-center space-x-1 cursor-pointer">
                      <mat-icon class="text-xs">add</mat-icon>
                      <span>+ Agregar Método</span>
                    </button>
                  </div>

                  <!-- Split Payments List -->
                  <div class="space-y-2 max-h-[240px] overflow-y-auto pr-0.5">
                    @for (sp of splitPayments(); track sp.id; let idx = $index) {
                      @let isDiv = stateService.isForeignCurrencyPaymentMethod(sp.method, sp.currency);
                      <div class="p-2.5 rounded-xl border transition-all text-xs space-y-1.5"
                        [class.bg-indigo-50/40]="isDiv"
                        [class.border-indigo-200]="isDiv"
                        [class.bg-emerald-50/30]="!isDiv"
                        [class.border-emerald-200]="!isDiv">
                        
                        <div class="flex items-center justify-between gap-1.5">
                          <!-- Method Selector -->
                          <div class="flex-1">
                            <select 
                              [value]="sp.method"
                              (change)="updateSplitMethod(sp.id, $any($event.target).value)"
                              class="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none">
                              <option value="EFECTIVO_USD">Efectivo USD (Divisas)</option>
                              <option value="EFECTIVO">Efectivo Bolívares (VES)</option>
                              <option value="PAGO_MOVIL">Pago Móvil (VES)</option>
                              <option value="PUNTO_VENTA_DEBITO">Punto de Venta Débito (VES)</option>
                              <option value="TARJETA_CREDITO">Tarjeta de Crédito (VES)</option>
                              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                              <option value="ZELLE">Zelle / Wire (USD)</option>
                              <option value="CRIPTO">Criptomonedas / USDT</option>
                              <option value="CREDITO">Crédito Comercial</option>
                              <option value="SALDO_A_FAVOR">Saldo a Favor / Anticipo</option>
                            </select>
                          </div>

                          <!-- Currency Badge -->
                          <span class="px-2 py-0.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-[11px]"
                            [class.text-indigo-700]="isDiv"
                            [class.text-emerald-700]="!isDiv">
                            {{ sp.currency }}
                          </span>

                          <!-- Delete Row -->
                          @if (splitPayments().length > 1) {
                            <button 
                              type="button" 
                              (click)="removeSplitPayment(sp.id)" 
                              title="Eliminar método"
                              class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                              <mat-icon class="text-sm">delete</mat-icon>
                            </button>
                          }
                        </div>

                        <div class="flex items-center justify-between gap-1.5">
                          <!-- Amount Input -->
                          <div class="relative flex-1">
                            <span class="absolute left-2.5 top-1 text-xs font-bold font-mono text-slate-500">
                              {{ sp.currency === 'VES' ? 'Bs.' : (sp.currency === 'EUR' ? '€' : '$') }}
                            </span>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              [value]="sp.amount"
                              (input)="updateSplitAmount(sp.id, $any($event.target).value)"
                              placeholder="0.00"
                              class="w-full pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          </div>

                          <!-- Auto-cover button -->
                          <button 
                            type="button" 
                            (click)="autoCoverRemaining(sp.id)"
                            title="Ajustar monto para saldar el saldo pendiente"
                            class="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shrink-0 transition-colors cursor-pointer">
                            Saldar Restante
                          </button>
                        </div>

                        <!-- Conversion & SENIAT Badge -->
                        <div class="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/50">
                          <span class="text-slate-500 font-mono">
                            @if (sp.currency === 'VES') {
                              ≈ \${{ (sp.amount / stateService.bcvState().usdRate) | number:'1.2-2' }} USD
                            } @else {
                              ≈ Bs. {{ (sp.amount * stateService.bcvState().usdRate) | number:'1.2-2' }}
                            }
                          </span>
                          <span class="px-1.5 py-0.2 rounded font-semibold text-[9px]"
                            [class.bg-indigo-100]="isDiv"
                            [class.text-indigo-800]="isDiv"
                            [class.bg-emerald-100]="!isDiv"
                            [class.text-emerald-800]="!isDiv">
                            {{ isDiv ? 'Sujeto a IGTF 3%' : 'Exento IGTF (0%)' }}
                          </span>
                        </div>

                      </div>
                    }
                  </div>

                  <!-- SENIAT Mixed Summary Card -->
                  <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div class="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Base Venta (Subtotal + IVA):</span>
                      <span class="font-mono font-semibold">\${{ baseSaleWithIvaUsd() | number:'1.2-2' }}</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-[11px] text-indigo-700">
                      <span>Porción en Divisas (IGTF 3%):</span>
                      <span class="font-mono font-bold">\${{ splitTaxDetails().divisasPaidUsd | number:'1.2-2' }} ➔ +\${{ splitTaxDetails().igtfAmount | number:'1.2-2' }}</span>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-emerald-700">
                      <span>Porción en Bolívares (Exenta):</span>
                      <span class="font-mono font-bold">\${{ splitTaxDetails().bolivaresPaidUsd | number:'1.2-2' }} (Bs. {{ (splitTaxDetails().bolivaresPaidUsd * stateService.bcvState().usdRate) | number:'1.2-2' }})</span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-bold text-slate-900 border-t border-slate-200 pt-1">
                      <span>TOTAL GENERAL FACTURA:</span>
                      <span class="font-mono text-emerald-700 font-extrabold">\${{ grandTotalUsd() | number:'1.2-2' }}</span>
                    </div>

                    <!-- Balance status -->
                    @let bal = mixedBalanceDetails();
                    @if (bal.isDeficit) {
                      <div class="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center justify-between text-[11px]">
                        <span class="font-bold flex items-center space-x-1">
                          <mat-icon class="text-xs text-rose-600">error_outline</mat-icon>
                          <span>Falta por cubrir:</span>
                        </span>
                        <span class="font-mono font-bold">\${{ bal.deficitUsd | number:'1.2-2' }} USD (Bs. {{ bal.deficitVes | number:'1.2-2' }})</span>
                      </div>
                    } @else if (bal.isSurplus) {
                      <div class="space-y-1.5">
                        <div class="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-between text-[11px]">
                          <span class="font-bold flex items-center space-x-1">
                            <mat-icon class="text-xs text-emerald-600">price_check</mat-icon>
                            <span>Vuelto / Excedente:</span>
                          </span>
                          <span class="font-mono font-bold">\${{ bal.surplusUsd | number:'1.2-2' }} USD (Bs. {{ bal.surplusVes | number:'1.2-2' }})</span>
                        </div>

                        @if (selectedCustomer(); as cust) {
                          <label class="flex items-start space-x-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-emerald-300 text-[11px] transition-all hover:bg-emerald-50/50">
                            <input 
                              type="checkbox" 
                              [checked]="saveChangeAsCustomerCredit()" 
                              (change)="saveChangeAsCustomerCredit.set($any($event.target).checked)"
                              class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0">
                            <div class="flex-1 leading-tight text-emerald-950">
                              <span class="font-bold flex items-center space-x-1">
                                <mat-icon class="text-xs text-emerald-700">account_balance_wallet</mat-icon>
                                <span>Guardar excedente (\${{ bal.surplusUsd | number:'1.2-2' }}) como Saldo a Favor</span>
                              </span>
                              <span class="text-[10px] text-emerald-700 block mt-0.5">Se acreditará a {{ cust.name }} ({{ cust.taxId }}).</span>
                            </div>
                          </label>
                        }
                      </div>
                    } @else {
                      <div class="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center justify-center space-x-1 text-[11px] font-bold">
                        <mat-icon class="text-xs text-emerald-600">check_circle</mat-icon>
                        <span>Pagos 100% Cuadrados y Cubiertos</span>
                      </div>
                    }
                  </div>

                </div>
              }

              <!-- Checkout Action Button -->
              <button 
                type="button"
                (click)="checkout()"
                [disabled]="cartItems().length === 0 || (!isMixedPayment() && cashChangeDetails().isDeficit && selectedPaymentMethod() !== 'CREDITO') || (isMixedPayment() && mixedBalanceDetails().isDeficit && !hasCreditPayment())"
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed">
                <mat-icon class="text-base">receipt_long</mat-icon>
                <span>EMITIR FACTURA FISCAL (F10)</span>
              </button>

            </div>

          </div>

        </div>
      }

      <!-- ========================================================= -->
      <!-- TAB 2: HISTORIAL DE FACTURAS Y REGISTRO FISCAL DE VENTAS -->
      <!-- ========================================================= -->
      @if (activeSalesTab() === 'history') {
        <div class="space-y-4">
          
          <!-- Summary Metrics Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Total Facturado ($ USD)</span>
              <p class="text-lg font-bold font-mono text-emerald-700 mt-0.5">\${{ totalFilteredUsd() | number:'1.2-2' }}</p>
              <span class="text-[10px] text-slate-400 font-mono">
                Bs. {{ totalFilteredVes().toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
              </span>
            </div>

            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Total IVA Recaudado ($)</span>
              <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">\${{ totalFilteredIvaUsd() | number:'1.2-2' }}</p>
              <span class="text-[10px] text-slate-400">Débito fiscal IVA 16%</span>
            </div>

            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Percepción IGTF 3% ($)</span>
              <p class="text-lg font-bold font-mono text-indigo-900 mt-0.5">\${{ totalFilteredIgtfUsd() | number:'1.2-2' }}</p>
              <span class="text-[10px] text-slate-400">Cobros en efectivo / divisas</span>
            </div>

            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Comprobantes Auditados</span>
              <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">{{ filteredInvoices().length }}</p>
              <span class="text-[10px] text-slate-400">
                {{ emittedCount() }} Emitidas | {{ voidedCount() }} Anuladas
              </span>
            </div>

          </div>

          <!-- Search & Filter Controls -->
          <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            
            <div class="flex flex-col md:flex-row items-center justify-between gap-3">
              
              <!-- Search Bar -->
              <div class="relative flex-1 w-full">
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
                <input 
                  type="text" 
                  [value]="salesSearchQuery()"
                  (input)="salesSearchQuery.set($any($event.target).value)"
                  placeholder="Buscar por N° Factura, Cliente, RIF o Vendedor..." 
                  class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>

              <!-- Status Filter -->
              <div class="w-full md:w-44">
                <select 
                  [value]="salesStatusFilter()"
                  (change)="salesStatusFilter.set($any($event.target).value)"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="ALL">Todos los Estados</option>
                  <option value="EMITIDA">Solo EMITIDAS</option>
                  <option value="ANULADA">Solo ANULADAS</option>
                </select>
              </div>

              <!-- Payment Method Filter -->
              <div class="w-full md:w-52">
                <select 
                  [value]="salesPaymentFilter()"
                  (change)="salesPaymentFilter.set($any($event.target).value)"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="ALL">Todos los Métodos de Pago</option>
                  <option value="EFECTIVO_USD">Efectivo Divisas ($ USD)</option>
                  <option value="EFECTIVO">Efectivo Bolívares (VES)</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="PUNTO_VENTA_DEBITO">Punto de Venta Débito</option>
                  <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="CREDITO">Crédito Comercial</option>
                </select>
              </div>

              <!-- Export CSV Action Buttons -->
              <div class="flex items-center space-x-2 w-full md:w-auto">
                <button 
                  type="button"
                  (click)="downloadSalesCsv()"
                  title="Descargar listado de ventas a archivo CSV"
                  class="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
                  <mat-icon class="text-base">file_download</mat-icon>
                  <span>Exportar CSV</span>
                </button>

                <button 
                  type="button"
                  (click)="downloadDetailedLinesCsv()"
                  title="Descargar detalle de renglones vendidos con costo y margen de ganancia"
                  class="flex-1 md:flex-none px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer">
                  <mat-icon class="text-sm text-slate-500">list_alt</mat-icon>
                  <span>Renglones CSV</span>
                </button>
              </div>

            </div>

          </div>

          <!-- Sales Invoices Table -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-700">
                <thead class="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th class="py-3 px-3">N° Factura</th>
                    <th class="py-3 px-3">Fecha / Hora</th>
                    <th class="py-3 px-3">Cliente / RIF</th>
                    <th class="py-3 px-3">Moneda & Tasa</th>
                    <th class="py-3 px-3 text-right">Subtotal ($)</th>
                    <th class="py-3 px-3 text-right">IVA ($)</th>
                    <th class="py-3 px-3 text-right">IGTF ($)</th>
                    <th class="py-3 px-3 text-right">Total ($ USD)</th>
                    <th class="py-3 px-3 text-right">Total (Bs. BCV)</th>
                    <th class="py-3 px-3">Método Pago</th>
                    <th class="py-3 px-3 text-center">Estado</th>
                    <th class="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-sans">
                  @for (inv of filteredInvoices(); track inv.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      
                      <!-- Invoice Number -->
                      <td class="py-3 px-3 font-mono font-bold text-slate-900">
                        <button 
                          (click)="viewInvoice(inv)"
                          class="hover:text-emerald-600 hover:underline cursor-pointer flex items-center space-x-1">
                          <mat-icon class="text-xs text-slate-400">receipt</mat-icon>
                          <span>{{ inv.invoiceNumber }}</span>
                        </button>
                      </td>

                      <!-- Date -->
                      <td class="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {{ inv.date }}
                      </td>

                      <!-- Customer -->
                      <td class="py-3 px-3">
                        <div class="font-semibold text-slate-900">{{ inv.customerName }}</div>
                        <div class="text-[10px] text-slate-400 font-mono">{{ inv.customerTaxId }}</div>
                      </td>

                      <!-- Currency & BCV -->
                      <td class="py-3 px-3 text-[11px]">
                        <span class="font-bold text-slate-800">{{ inv.paymentCurrency }}</span>
                        <span class="block text-[10px] text-slate-400 font-mono">Tasa: {{ inv.bcvRate | number:'1.2-2' }}</span>
                      </td>

                      <!-- Subtotal -->
                      <td class="py-3 px-3 text-right font-mono text-slate-700">
                        \${{ inv.subtotal | number:'1.2-2' }}
                      </td>

                      <!-- IVA -->
                      <td class="py-3 px-3 text-right font-mono text-slate-700">
                        \${{ (inv.taxDetails.ivaAmount || 0) | number:'1.2-2' }}
                      </td>

                      <!-- IGTF -->
                      <td class="py-3 px-3 text-right font-mono" [class.text-indigo-700]="(inv.taxDetails.igtfAmount || 0) > 0">
                        \${{ (inv.taxDetails.igtfAmount || 0) | number:'1.2-2' }}
                      </td>

                      <!-- Total USD -->
                      <td class="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        \${{ inv.total | number:'1.2-2' }}
                      </td>

                      <!-- Total VES -->
                      <td class="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                        Bs. {{ (inv.totalVes || inv.total * inv.bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
                      </td>

                      <!-- Payment Method -->
                      <td class="py-3 px-3 text-[11px] whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {{ formatPaymentMethod(inv.payments[0]?.method) }}
                        </span>
                      </td>

                      <!-- Status Badge -->
                      <td class="py-3 px-3 text-center">
                        <span 
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block"
                          [class]="inv.status === 'EMITIDA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                          {{ inv.status }}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td class="py-3 px-3 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end space-x-1">
                          
                          <button 
                            type="button"
                            (click)="viewInvoice(inv)"
                            title="Ver e Imprimir Comprobante Fiscal"
                            class="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer">
                            <mat-icon class="text-base">visibility</mat-icon>
                          </button>

                          @if (inv.status === 'EMITIDA') {
                            <button 
                              type="button"
                              (click)="onCancelInvoiceClicked(inv)"
                              title="Anular Factura y Devolver Stock"
                              class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                              <mat-icon class="text-base">cancel</mat-icon>
                            </button>
                          }

                        </div>
                      </td>

                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="12" class="py-12 text-center text-slate-400">
                        <mat-icon class="text-3xl text-slate-300 mb-1">receipt</mat-icon>
                        <p class="font-medium">No se encontraron facturas con los filtros aplicados.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Table Footer -->
            <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div class="flex items-center space-x-3">
                <span>Mostrando <strong>{{ filteredInvoices().length }}</strong> de {{ stateService.invoices().length }} comprobantes</span>
                <button 
                  type="button"
                  (click)="downloadSalesCsv()"
                  class="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center space-x-1 underline cursor-pointer text-xs">
                  <mat-icon class="text-xs text-emerald-600">file_download</mat-icon>
                  <span>Descargar facturas mostradas en CSV</span>
                </button>
              </div>

              <span>Total acumulado en vista: <strong class="font-mono text-slate-900">\${{ totalFilteredUsd() | number:'1.2-2' }}</strong> (Bs. {{ totalFilteredVes().toLocaleString('es-VE') }})</span>
            </div>

          </div>

        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: REGISTRAR NUEVO CLIENTE / RECEPTOR FISCAL -->
      <!-- ========================================================= -->
      @if (showNewCustomerModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon>person_add</mat-icon>
                <h3 class="font-semibold text-sm">Registrar Nuevo Cliente / Receptor Fiscal</h3>
              </div>
              <button (click)="showNewCustomerModal.set(false)" class="text-white/80 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form (submit)="saveNewCustomer($event)" class="p-6 space-y-4 text-xs">
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="pos-cust-taxid" class="block font-semibold text-slate-700 mb-1">Documento / RIF / Cédula *</label>
                  <input 
                    id="pos-cust-taxid"
                    type="text" 
                    [value]="newCustomerTaxId()" 
                    (input)="newCustomerTaxId.set($any($event.target).value)" 
                    placeholder="Ej: J-12345678-0 o V-18234567" 
                    required 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>

                <div>
                  <label for="pos-cust-type" class="block font-semibold text-slate-700 mb-1">Tipo de Cliente *</label>
                  <select 
                    id="pos-cust-type"
                    [value]="newCustomerType()" 
                    (change)="newCustomerType.set($any($event.target).value)"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none">
                    <option value="EMPRESA">Empresa / Jurídico (J / G)</option>
                    <option value="PERSONA_NATURAL">Persona Natural (V / E)</option>
                    <option value="FINAL_CONSUMIDOR">Consumidor Final</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="pos-cust-name" class="block font-semibold text-slate-700 mb-1">Razón Social o Nombre Completo *</label>
                <input 
                  id="pos-cust-name"
                  type="text" 
                  [value]="newCustomerName()" 
                  (input)="newCustomerName.set($any($event.target).value)" 
                  placeholder="Ej: Inversiones Los Andes C.A." 
                  required 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label for="pos-cust-email" class="block font-semibold text-slate-700 mb-1">Correo Electrónico (Factura Digital)</label>
                  <input 
                    id="pos-cust-email"
                    type="email" 
                    [value]="newCustomerEmail()" 
                    (input)="newCustomerEmail.set($any($event.target).value)" 
                    placeholder="contacto@empresa.com" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>

                <div>
                  <label for="pos-cust-phone" class="block font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                  <input 
                    id="pos-cust-phone"
                    type="tel" 
                    [value]="newCustomerPhone()" 
                    (input)="newCustomerPhone.set($any($event.target).value)" 
                    placeholder="+58 412 1234567" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label for="pos-cust-address" class="block font-semibold text-slate-700 mb-1">Dirección Fiscal / Ubicación</label>
                <input 
                  id="pos-cust-address"
                  type="text" 
                  [value]="newCustomerAddress()" 
                  (input)="newCustomerAddress.set($any($event.target).value)" 
                  placeholder="Av. Principal, Edificio Torre Norte, Piso 4" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div>
                <label for="pos-cust-advance" class="block font-semibold text-slate-700 mb-1">
                  Saldo a Favor / Anticipo Inicial ($ USD)
                  <span class="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">$</span>
                  <input 
                    id="pos-cust-advance"
                    type="number" 
                    step="0.01"
                    min="0"
                    disabled
                    [value]="newCustomerAdvanceBalance()" 
                    (input)="newCustomerAdvanceBalance.set(+$any($event.target).value || 0)" 
                    placeholder="0.00" 
                    class="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono" />
                </div>
                <p class="text-[10px] text-slate-400 mt-0.5">Anticipo en custodia o saldo a favor preexistente para futuras compras.</p>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button" 
                  (click)="showNewCustomerModal.set(false)" 
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>Guardar y Seleccionar</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      }
      <!-- Modal de Factura para ver Comprobantes Fiscales Asociados -->
      @if (activeInvoiceForView(); as inv) {
        <app-invoice-modal 
          [invoice]="inv"
          (closeModal)="activeInvoiceForView.set(null)" />
      }
    </div>
  `
})
export default class SalesPosComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  emailService = inject(EmailNotificationService);
  shortcutService = inject(KeyboardShortcutsService);

  openInvoiceView = output<Invoice>();

  activeSalesTab = signal<'pos' | 'history'>('pos');

  // New Customer Modal Signals
  showNewCustomerModal = signal<boolean>(false);
  newCustomerTaxId = signal<string>('');
  newCustomerName = signal<string>('');
  newCustomerEmail = signal<string>('');
  newCustomerPhone = signal<string>('');
  newCustomerAddress = signal<string>('');
  newCustomerType = signal<'EMPRESA' | 'PERSONA_NATURAL' | 'FINAL_CONSUMIDOR'>('EMPRESA');
  newCustomerAdvanceBalance = signal<number>(0);

  activeInvoiceForView = signal<Invoice | null>(null);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (!action) return;

      if (action.actionId === 'NEW_SALE') {
        this.activeSalesTab.set('pos');
      } else if (action.actionId === 'POS_PAY') {
        this.activeSalesTab.set('pos');
        if (this.cartItems().length > 0) {
          this.checkout();
        }
      }
    });
  }

  selectedWarehouseId = signal<string>(this.stateService.warehouses()[0]?.id || '');
  warehouseFilterMode = signal<'STOCK_AVAILABLE' | 'IN_WAREHOUSE' | 'ALL'>('STOCK_AVAILABLE');
  selectedCustomerId = signal<string>(this.stateService.customers()[0]?.id || '');
  selectedCategoryFilter = signal<string>('ALL');
  searchQuery = signal<string>('');
  
  // Multi-Currency & Pricing Signals
  selectedPriceTier = signal<PriceLevelKey>('price1');
  selectedPaymentCurrency = signal<CurrencyCode>('USD');
  selectedPaymentMethod = signal<PaymentMethod>('EFECTIVO_USD');
  selectedIvaRate = signal<number>(0.16);
  globalDiscountPercent = signal<number>(0);
  manualIgtfOverride = signal<boolean | null>(null);
  cashTendered = signal<number | null>(null);
  saveChangeAsCustomerCredit = signal<boolean>(false);

  cartItems = signal<CartItem[]>([]);

  selectedWarehouseName = computed(() => {
    const id = this.selectedWarehouseId();
    if (!id || id === 'ALL') return 'Todos los Almacenes';
    const wh = this.stateService.warehouses().find(w => w.id === id);
    return wh ? wh.name : 'Almacén Principal';
  });

  getProductWarehouseStock(product: Product, warehouseId?: string): number {
    if (!product) return 0;
    const isService = product.itemType === 'SERVICE' || product.unit === 'HRA' || product.unit === 'SRV' || product.unit === 'GLB';
    if (isService) {
      return 9999;
    }
    const whId = warehouseId || this.selectedWarehouseId();
    if (!whId || whId === 'ALL') {
      return product.totalStock;
    }
    const entry = product.stockByWarehouse?.find(s => s.warehouseId === whId);
    return entry ? entry.quantity : 0;
  }

  isProductInSelectedWarehouse(product: Product, warehouseId?: string): boolean {
    if (!product) return false;
    const isService = product.itemType === 'SERVICE' || product.unit === 'HRA' || product.unit === 'SRV' || product.unit === 'GLB';
    if (isService) return true;
    const whId = warehouseId || this.selectedWarehouseId();
    if (!whId || whId === 'ALL') return true;
    const entry = product.stockByWarehouse?.find(s => s.warehouseId === whId);
    const qty = entry ? entry.quantity : 0;
    const isPrimary = product.primaryWarehouseId === whId;
    return isPrimary || !!entry || qty > 0;
  }

  onWarehouseChange(newWhId: string) {
    this.selectedWarehouseId.set(newWhId);
    const whName = newWhId === 'ALL' ? 'Todos los Almacenes' : (this.stateService.warehouses().find(w => w.id === newWhId)?.name || 'Almacén');

    if (newWhId !== 'ALL' && this.cartItems().length > 0) {
      const itemsExceedingStock = this.cartItems().filter(item => {
        const isSrv = item.product.itemType === 'SERVICE' || item.product.unit === 'HRA' || item.product.unit === 'SRV' || item.product.unit === 'GLB';
        if (isSrv) return false;
        const stock = this.getProductWarehouseStock(item.product, newWhId);
        return item.quantity > stock;
      });

      if (itemsExceedingStock.length > 0) {
        this.stateService.notify(
          'warning',
          'Atención: Stock en ' + whName,
          `${itemsExceedingStock.length} producto(s) en su factura superan el stock disponible en ${whName}.`
        );
      } else {
        this.stateService.notify('info', 'Almacén Seleccionado', `Mostrando productos para facturar desde: ${whName}`);
      }
    } else if (newWhId === 'ALL') {
      this.stateService.notify('info', 'Catálogo Global', 'Mostrando productos de todos los almacenes.');
    }
  }

  cartTotalUnits = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  // Mixed Payments (SENIAT Split-Tender) Signals
  isMixedPayment = signal<boolean>(false);
  splitPayments = signal<SplitPaymentLine[]>([
    { id: 'sp-1', method: 'EFECTIVO_USD', currency: 'USD', amount: 0 },
    { id: 'sp-2', method: 'PAGO_MOVIL', currency: 'VES', amount: 0 }
  ]);

  // History Tab Filters
  salesSearchQuery = signal<string>('');
  salesStatusFilter = signal<string>('ALL');
  salesPaymentFilter = signal<string>('ALL');

  categories = computed(() => {
    return Array.from(new Set(this.stateService.products().map(p => p.category)));
  });

  selectedPriceTierLabel = computed(() => {
    const config = this.stateService.priceLevelConfigs.find(c => c.key === this.selectedPriceTier());
    return config ? config.label : 'P1 Detal';
  });

  filteredCatalog = computed(() => {
    const cat = this.selectedCategoryFilter();
    const q = this.searchQuery().toLowerCase().trim();
    const whId = this.selectedWarehouseId();
    const mode = this.warehouseFilterMode();

    return this.stateService.products().filter(p => {
      if (p.status !== 'ACTIVE') return false;

      // 1. Text Search Filter (Name, SKU, Barcode)
      if (q) {
        const matchQ = p.name.toLowerCase().includes(q) || 
                       p.sku.toLowerCase().includes(q) || 
                       p.barcode.includes(q);
        if (!matchQ) return false;
      }

      // 2. Category Filter
      if (cat !== 'ALL') {
        const matchCat = p.category === cat || (p.categories && p.categories.includes(cat));
        if (!matchCat) return false;
      }

      // 3. Services are universally available
      const isService = p.itemType === 'SERVICE' || p.unit === 'HRA' || p.unit === 'SRV' || p.unit === 'GLB';
      if (isService) {
        return true;
      }

      // 4. Warehouse Filtering
      if (whId === 'ALL' || mode === 'ALL') {
        return true;
      }

      const whStock = this.getProductWarehouseStock(p, whId);

      if (mode === 'STOCK_AVAILABLE') {
        return whStock > 0;
      }

      if (mode === 'IN_WAREHOUSE') {
        const isAssigned = p.primaryWarehouseId === whId || p.stockByWarehouse?.some(s => s.warehouseId === whId);
        return isAssigned || whStock > 0;
      }

      return true;
    });
  });

  selectedCustomer = computed(() => {
    return this.stateService.customers().find(c => c.id === this.selectedCustomerId());
  });

  // Filtered Sales Invoices
  filteredInvoices = computed(() => {
    const q = this.salesSearchQuery().toLowerCase().trim();
    const status = this.salesStatusFilter();
    const method = this.salesPaymentFilter();

    return this.stateService.invoices().filter(inv => {
      const matchStatus = status === 'ALL' || inv.status === status;
      const matchMethod = method === 'ALL' || (inv.payments && inv.payments.some(p => p.method === method));
      const matchQ = !q || 
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerTaxId.toLowerCase().includes(q) ||
        (inv.sellerName && inv.sellerName.toLowerCase().includes(q));

      return matchStatus && matchMethod && matchQ;
    });
  });

  totalFilteredUsd = computed(() => {
    return this.filteredInvoices()
      .filter(i => i.status === 'EMITIDA')
      .reduce((sum, inv) => sum + inv.total, 0);
  });

  totalFilteredVes = computed(() => {
    const bcv = this.stateService.bcvState().usdRate;
    return this.filteredInvoices()
      .filter(i => i.status === 'EMITIDA')
      .reduce((sum, inv) => sum + (inv.totalVes || (inv.total * (inv.bcvRate || bcv))), 0);
  });

  totalFilteredIvaUsd = computed(() => {
    return this.filteredInvoices()
      .filter(i => i.status === 'EMITIDA')
      .reduce((sum, inv) => sum + (inv.taxDetails?.ivaAmount || 0), 0);
  });

  totalFilteredIgtfUsd = computed(() => {
    return this.filteredInvoices()
      .filter(i => i.status === 'EMITIDA')
      .reduce((sum, inv) => sum + (inv.taxDetails?.igtfAmount || 0), 0);
  });

  emittedCount = computed(() => {
    return this.filteredInvoices().filter(i => i.status === 'EMITIDA').length;
  });

  voidedCount = computed(() => {
    return this.filteredInvoices().filter(i => i.status === 'ANULADA').length;
  });

  getAppliedProductPrice(product: Product, level?: PriceLevelKey): number {
    const tier = level || this.selectedPriceTier();
    return this.stateService.getProductPriceByLevel(product, tier);
  }

  getItemUnitPrice(item: CartItem): number {
    return this.getAppliedProductPrice(item.product, item.priceLevel);
  }

  getItemSubtotal(item: CartItem): number {
    const unitPrice = this.getItemUnitPrice(item);
    const gross = unitPrice * item.quantity;
    const disc = gross * (item.discountPercent / 100);
    return gross - disc;
  }

  cartSubtotalGross = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + this.getItemSubtotal(item), 0);
  });

  baseSaleWithIvaUsd = computed(() => {
    let taxable = 0;
    let exempt = 0;
    const ivaRate = this.selectedIvaRate();

    for (const item of this.cartItems()) {
      const lineSubtotal = this.getItemSubtotal(item);
      if (item.product.isTaxExempt || item.product.taxRate === 0) {
        exempt += lineSubtotal;
      } else {
        taxable += lineSubtotal;
      }
    }

    const ivaAmount = Number((taxable * ivaRate).toFixed(2));
    return Number((taxable + exempt + ivaAmount).toFixed(2));
  });

  splitTaxDetails = computed(() => {
    const baseSale = this.baseSaleWithIvaUsd();
    const bcvRate = this.stateService.bcvState().usdRate;
    const eurRate = this.stateService.bcvState().eurRate || bcvRate;

    let divisasPaidUsd = 0;
    let bolivaresPaidUsd = 0;

    for (const sp of this.splitPayments()) {
      const isBs = this.stateService.isBolivaresPaymentMethod(sp.method, sp.currency);
      const isDiv = this.stateService.isForeignCurrencyPaymentMethod(sp.method, sp.currency);

      let amtUsd = 0;
      if (sp.currency === 'USD') {
        amtUsd = sp.amount;
      } else if (sp.currency === 'VES') {
        amtUsd = bcvRate > 0 ? (sp.amount / bcvRate) : 0;
      } else if (sp.currency === 'EUR') {
        amtUsd = bcvRate > 0 ? ((sp.amount * eurRate) / bcvRate) : sp.amount;
      }

      if (isBs) {
        bolivaresPaidUsd += amtUsd;
      } else if (isDiv || sp.currency === 'USD' || sp.currency === 'EUR') {
        divisasPaidUsd += amtUsd;
      } else {
        divisasPaidUsd += amtUsd;
      }
    }

    // Regla SENIAT: El cálculo del 3% solo se aplica sobre la porción pagada en divisas
    const igtfBase = Number(Math.min(baseSale, divisasPaidUsd).toFixed(2));
    const igtfAmount = Number((igtfBase * 0.03).toFixed(2));
    const appliesIgtf = igtfAmount > 0;

    return {
      baseSale,
      divisasPaidUsd: Number(divisasPaidUsd.toFixed(2)),
      bolivaresPaidUsd: Number(bolivaresPaidUsd.toFixed(2)),
      igtfBase,
      igtfAmount,
      appliesIgtf
    };
  });

  computedTaxDetails = computed(() => {
    let taxable = 0;
    let exempt = 0;
    const ivaRate = this.selectedIvaRate();

    for (const item of this.cartItems()) {
      const lineSubtotal = this.getItemSubtotal(item);
      if (item.product.isTaxExempt || item.product.taxRate === 0) {
        exempt += lineSubtotal;
      } else {
        taxable += lineSubtotal;
      }
    }

    const ivaAmount = Number((taxable * ivaRate).toFixed(2));
    const isSpecialTaxpayer = this.stateService.companyProfile().isSpecialTaxpayer;

    if (this.isMixedPayment()) {
      const sTax = this.splitTaxDetails();
      return {
        taxableBase: Number(taxable.toFixed(2)),
        exemptBase: Number(exempt.toFixed(2)),
        ivaPercent: ivaRate * 100,
        ivaAmount,
        appliesIgtf: sTax.appliesIgtf,
        igtfPercent: 3.0,
        igtfBase: sTax.igtfBase,
        igtfAmount: sTax.igtfAmount,
        isSpecialTaxpayer,
        isBolivares: sTax.bolivaresPaidUsd > 0 && sTax.divisasPaidUsd === 0,
        isDivisas: sTax.divisasPaidUsd > 0
      };
    }

    const paymentMethod = this.selectedPaymentMethod();
    const paymentCurrency = this.selectedPaymentCurrency();

    const isBolivares = this.stateService.isBolivaresPaymentMethod(paymentMethod, paymentCurrency);
    const isDivisas = this.stateService.isForeignCurrencyPaymentMethod(paymentMethod, paymentCurrency);

    let appliesIgtf = false;
    if (this.manualIgtfOverride() !== null) {
      appliesIgtf = Boolean(this.manualIgtfOverride());
    } else {
      // Regla SENIAT: se le cobra a todas las personas siempre que se pague en divisas/moneda extranjera
      appliesIgtf = isSpecialTaxpayer && isDivisas && !isBolivares;
    }

    const baseForIgtf = taxable + exempt + ivaAmount;
    const igtfAmount = appliesIgtf ? Number((baseForIgtf * 0.03).toFixed(2)) : 0;

    return {
      taxableBase: Number(taxable.toFixed(2)),
      exemptBase: Number(exempt.toFixed(2)),
      ivaPercent: ivaRate * 100,
      ivaAmount,
      appliesIgtf,
      igtfPercent: 3.0,
      igtfBase: appliesIgtf ? baseForIgtf : 0,
      igtfAmount,
      isSpecialTaxpayer,
      isBolivares,
      isDivisas
    };
  });

  grandTotalUsd = computed(() => {
    if (this.isMixedPayment()) {
      return Number((this.baseSaleWithIvaUsd() + this.splitTaxDetails().igtfAmount).toFixed(2));
    }
    const taxes = this.computedTaxDetails();
    return Number((taxes.taxableBase + taxes.exemptBase + taxes.ivaAmount + taxes.igtfAmount).toFixed(2));
  });

  grandTotalVes = computed(() => {
    const rate = this.stateService.bcvState().usdRate;
    return Number((this.grandTotalUsd() * rate).toFixed(2));
  });

  grandTotalEur = computed(() => {
    const usdRate = this.stateService.bcvState().usdRate;
    const eurRate = this.stateService.bcvState().eurRate;
    return Number(((this.grandTotalUsd() * usdRate) / eurRate).toFixed(2));
  });

  currentTotalToPay = computed(() => {
    const curr = this.selectedPaymentCurrency();
    if (curr === 'VES') {
      return this.grandTotalVes();
    } else if (curr === 'EUR') {
      return this.grandTotalEur();
    }
    return this.grandTotalUsd();
  });

  effectiveCashTendered = computed(() => {
    const custom = this.cashTendered();
    if (custom !== null && !isNaN(custom) && custom >= 0) {
      return custom;
    }
    return this.currentTotalToPay();
  });

  cashChangeDetails = computed(() => {
    const total = this.currentTotalToPay();
    const rawTendered = this.cashTendered();
    const tendered = rawTendered !== null && !isNaN(rawTendered) ? rawTendered : total;
    const bcvRate = this.stateService.bcvState().usdRate;
    const eurRate = this.stateService.bcvState().eurRate || bcvRate;
    const curr = this.selectedPaymentCurrency();

    const diff = Number((tendered - total).toFixed(2));
    const isExact = Math.abs(diff) < 0.005;
    const isSurplus = diff > 0.005;
    const isDeficit = diff < -0.005;

    let changeInCurrency = 0;
    let changeUsd = 0;
    let changeVes = 0;

    if (isSurplus) {
      changeInCurrency = diff;
      if (curr === 'USD') {
        changeUsd = diff;
        changeVes = Number((diff * bcvRate).toFixed(2));
      } else if (curr === 'VES') {
        changeVes = diff;
        changeUsd = Number((diff / bcvRate).toFixed(2));
      } else if (curr === 'EUR') {
        changeVes = Number((diff * eurRate).toFixed(2));
        changeUsd = Number((changeVes / bcvRate).toFixed(2));
      }
    }

    let deficitInCurrency = 0;
    let deficitUsd = 0;
    let deficitVes = 0;

    if (isDeficit) {
      const deficit = Math.abs(diff);
      deficitInCurrency = deficit;
      if (curr === 'USD') {
        deficitUsd = deficit;
        deficitVes = Number((deficit * bcvRate).toFixed(2));
      } else if (curr === 'VES') {
        deficitVes = deficit;
        deficitUsd = Number((deficit / bcvRate).toFixed(2));
      } else if (curr === 'EUR') {
        deficitVes = Number((deficit * eurRate).toFixed(2));
        deficitUsd = Number((deficitVes / bcvRate).toFixed(2));
      }
    }

    return {
      total,
      tendered,
      diff,
      isExact,
      isSurplus,
      isDeficit,
      changeInCurrency,
      changeUsd,
      changeVes,
      deficitInCurrency,
      deficitUsd,
      deficitVes
    };
  });

  cashSuggestions = computed(() => {
    const total = this.currentTotalToPay();
    const curr = this.selectedPaymentCurrency();
    if (total <= 0) return [];

    if (curr === 'USD') {
      const presets = [5, 10, 20, 50, 100];
      const valid = presets.filter(p => p >= total);
      if (valid.length === 0) {
        valid.push(Math.ceil(total / 50) * 50);
        valid.push(Math.ceil(total / 100) * 100);
      }
      return valid.slice(0, 4);
    } else if (curr === 'VES') {
      const rounded50 = Math.ceil(total / 50) * 50;
      const rounded100 = Math.ceil(total / 100) * 100;
      const rounded200 = Math.ceil(total / 200) * 200;
      const set = new Set([rounded50, rounded100, rounded200]);
      return Array.from(set).filter(v => v >= total).slice(0, 4);
    } else {
      const presets = [5, 10, 20, 50, 100];
      return presets.filter(p => p >= total).slice(0, 4);
    }
  });

  mixedBalanceDetails = computed(() => {
    const bcvRate = this.stateService.bcvState().usdRate;
    const eurRate = this.stateService.bcvState().eurRate || bcvRate;
    const totalTargetUsd = this.grandTotalUsd();

    let totalPaidUsd = 0;
    for (const sp of this.splitPayments()) {
      if (sp.currency === 'USD') {
        totalPaidUsd += sp.amount;
      } else if (sp.currency === 'VES') {
        totalPaidUsd += bcvRate > 0 ? (sp.amount / bcvRate) : 0;
      } else if (sp.currency === 'EUR') {
        totalPaidUsd += bcvRate > 0 ? ((sp.amount * eurRate) / bcvRate) : sp.amount;
      }
    }

    const diffUsd = Number((totalPaidUsd - totalTargetUsd).toFixed(2));
    const isExact = Math.abs(diffUsd) < 0.01;
    const isSurplus = diffUsd >= 0.01;
    const isDeficit = diffUsd <= -0.01;

    const deficitUsd = isDeficit ? Math.abs(diffUsd) : 0;
    const deficitVes = Number((deficitUsd * bcvRate).toFixed(2));
    const surplusUsd = isSurplus ? diffUsd : 0;
    const surplusVes = Number((surplusUsd * bcvRate).toFixed(2));

    return {
      totalTargetUsd,
      totalPaidUsd: Number(totalPaidUsd.toFixed(2)),
      diffUsd,
      isExact,
      isSurplus,
      isDeficit,
      deficitUsd,
      deficitVes,
      surplusUsd,
      surplusVes
    };
  });

  toggleMixedPayment(isMixed: boolean) {
    this.isMixedPayment.set(isMixed);
    if (isMixed) {
      const baseSale = this.baseSaleWithIvaUsd();
      const bcvRate = this.stateService.bcvState().usdRate;
      const currentList = this.splitPayments();
      const totalAllocated = currentList.reduce((acc, p) => acc + (p.currency === 'VES' ? (bcvRate > 0 ? p.amount / bcvRate : 0) : p.amount), 0);
      if (totalAllocated === 0 && baseSale > 0) {
        const halfUsd = Number((baseSale / 2).toFixed(2));
        const remUsd = Number((baseSale - halfUsd).toFixed(2));
        const vesAmt = Number((remUsd * bcvRate).toFixed(2));
        this.splitPayments.set([
          { id: 'sp-' + Date.now() + '-1', method: 'EFECTIVO_USD', currency: 'USD', amount: halfUsd },
          { id: 'sp-' + Date.now() + '-2', method: 'PAGO_MOVIL', currency: 'VES', amount: vesAmt }
        ]);
      }
    }
  }

  addSplitPayment() {
    const newId = 'sp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const last = this.splitPayments().slice(-1)[0];
    const nextMethod: PaymentMethod = (last?.currency === 'USD') ? 'PAGO_MOVIL' : 'EFECTIVO_USD';
    const nextCurr: CurrencyCode = nextMethod === 'PAGO_MOVIL' ? 'VES' : 'USD';
    
    this.splitPayments.update(list => [
      ...list,
      { id: newId, method: nextMethod, currency: nextCurr, amount: 0 }
    ]);
  }

  removeSplitPayment(id: string) {
    if (this.splitPayments().length <= 1) return;
    this.splitPayments.update(list => list.filter(sp => sp.id !== id));
  }

  updateSplitMethod(id: string, method: PaymentMethod) {
    let curr: CurrencyCode = 'USD';
    if (method === 'PAGO_MOVIL' || method === 'PUNTO_VENTA_DEBITO' || method === 'TARJETA_CREDITO' || method === 'EFECTIVO') {
      curr = 'VES';
    } else if (method === 'EFECTIVO_EUR') {
      curr = 'EUR';
    } else {
      curr = 'USD';
    }

    this.splitPayments.update(list => list.map(sp => {
      if (sp.id === id) {
        return { ...sp, method, currency: curr };
      }
      return sp;
    }));
  }

  updateSplitAmount(id: string, val: string | number) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    const amt = isNaN(num) || num < 0 ? 0 : Number(num.toFixed(2));
    this.splitPayments.update(list => list.map(sp => {
      if (sp.id === id) {
        return { ...sp, amount: amt };
      }
      return sp;
    }));
  }

  autoCoverRemaining(id: string) {
    const bcvRate = this.stateService.bcvState().usdRate;
    const eurRate = this.stateService.bcvState().eurRate || bcvRate;
    const targetUsd = this.grandTotalUsd();

    let otherPaidUsd = 0;
    for (const sp of this.splitPayments()) {
      if (sp.id !== id) {
        if (sp.currency === 'USD') otherPaidUsd += sp.amount;
        else if (sp.currency === 'VES') otherPaidUsd += bcvRate > 0 ? (sp.amount / bcvRate) : 0;
        else if (sp.currency === 'EUR') otherPaidUsd += bcvRate > 0 ? ((sp.amount * eurRate) / bcvRate) : sp.amount;
      }
    }

    const remainingUsd = Math.max(0, targetUsd - otherPaidUsd);
    this.splitPayments.update(list => list.map(sp => {
      if (sp.id === id) {
        let finalAmt = remainingUsd;
        if (sp.currency === 'VES') {
          finalAmt = Number((remainingUsd * bcvRate).toFixed(2));
        } else if (sp.currency === 'EUR') {
          finalAmt = Number(((remainingUsd * bcvRate) / eurRate).toFixed(2));
        } else {
          finalAmt = Number(remainingUsd.toFixed(2));
        }
        return { ...sp, amount: finalAmt };
      }
      return sp;
    }));
  }

  hasCreditPayment(): boolean {
    if (this.isMixedPayment()) {
      return this.splitPayments().some(sp => sp.method === 'CREDITO');
    }
    return this.selectedPaymentMethod() === 'CREDITO';
  }

  updateItemQty(productId: string, val: string | number) {
    const qty = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (isNaN(qty) || qty <= 0) {
      this.removeItem(productId);
      return;
    }
    const item = this.cartItems().find(i => i.product.id === productId);
    if (item) {
      const isService = item.product.itemType === 'SERVICE' || item.product.unit === 'HRA' || item.product.unit === 'SRV' || item.product.unit === 'GLB';
      const whStock = this.getProductWarehouseStock(item.product);
      if (!isService && qty > whStock) {
        this.stateService.notify(
          'warning',
          'Límite de Stock',
          `Stock disponible en ${this.selectedWarehouseName()}: ${whStock}. Se ajustó la cantidad.`
        );
        this.cartItems.update(items =>
          items.map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, whStock) } : i)
        );
        return;
      }
    }
    this.cartItems.update(items =>
      items.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)
    );
  }

  setExactTendered() {
    this.cashTendered.set(this.currentTotalToPay());
  }

  setTenderedAmount(amount: number) {
    this.cashTendered.set(Number(amount.toFixed(2)));
  }

  onCashTenderedInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.trim();
    if (val === '') {
      this.cashTendered.set(null);
      return;
    }
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      this.cashTendered.set(parsed);
    } else {
      this.cashTendered.set(null);
    }
  }

  toggleCompanyFiscalSpecial() {
    const current = this.stateService.companyProfile();
    const updated = !current.isSpecialTaxpayer;
    this.stateService.updateCompanyProfile({ isSpecialTaxpayer: updated });
    this.stateService.notify(
      'info',
      'Régimen Fiscal Actualizado',
      updated 
        ? 'Empresa configurada como Sujeto Pasivo Especial (Agente de Percepción IGTF 3%).'
        : 'Empresa configurada como Contribuyente Ordinario (No percibe IGTF).'
    );
  }

  applyCustomerCreditToPayment() {
    const cust = this.selectedCustomer();
    if (!cust || !cust.advanceBalanceUsd || cust.advanceBalanceUsd <= 0) {
      this.stateService.notify('warning', 'Sin Saldo', 'El cliente no tiene saldo a favor disponible.');
      return;
    }

    const availableCreditUsd = cust.advanceBalanceUsd;
    const totalToPayUsd = this.grandTotalUsd();

    if (totalToPayUsd <= 0) {
      this.stateService.notify('info', 'Carrito Vacío', 'Agregue productos al carrito antes de aplicar el saldo a favor.');
      return;
    }

    if (availableCreditUsd >= totalToPayUsd) {
      // El saldo a favor cubre la totalidad de la venta
      this.isMixedPayment.set(false);
      this.selectedPaymentCurrency.set('USD');
      this.selectedPaymentMethod.set('SALDO_A_FAVOR');
      this.cashTendered.set(totalToPayUsd);
      this.stateService.notify(
        'success',
        'Saldo a Favor Aplicado',
        `Se aplicaron $${totalToPayUsd.toFixed(2)} USD del saldo a favor de ${cust.name}. Le restarán $${(availableCreditUsd - totalToPayUsd).toFixed(2)} USD.`
      );
    } else {
      // El saldo cubre una parte: activar automáticamente Pagos Mixtos SENIAT
      this.isMixedPayment.set(true);
      const bcvRate = this.stateService.bcvState().usdRate;
      const remainingDeficitUsd = Number((totalToPayUsd - availableCreditUsd).toFixed(2));
      const remainingDeficitVes = Number((remainingDeficitUsd * bcvRate).toFixed(2));

      this.splitPayments.set([
        {
          id: 'sp-credit',
          method: 'SALDO_A_FAVOR',
          currency: 'USD',
          amount: availableCreditUsd,
          reference: 'ANTICIPO-' + cust.taxId
        },
        {
          id: 'sp-diff',
          method: 'PAGO_MOVIL',
          currency: 'VES',
          amount: remainingDeficitVes,
          reference: ''
        }
      ]);

      this.stateService.notify(
        'info',
        'Abono con Saldo a Favor',
        `Se abonaron $${availableCreditUsd.toFixed(2)} USD de saldo a favor. Restan $${remainingDeficitUsd.toFixed(2)} USD (Bs. ${remainingDeficitVes.toFixed(2)}) por cubrir en el segundo método.`
      );
    }
  }

  onPaymentMethodChange(method: PaymentMethod) {
    this.selectedPaymentMethod.set(method);
    if (method === 'PAGO_MOVIL' || method === 'PUNTO_VENTA_DEBITO' || method === 'TARJETA_CREDITO' || method === 'EFECTIVO') {
      this.selectedPaymentCurrency.set('VES');
    } else if (method === 'EFECTIVO_USD' || method === 'ZELLE' || method === 'SALDO_A_FAVOR') {
      this.selectedPaymentCurrency.set('USD');
      if (method === 'SALDO_A_FAVOR') {
        this.cashTendered.set(this.currentTotalToPay());
      }
    } else if (method === 'EFECTIVO_EUR') {
      this.selectedPaymentCurrency.set('EUR');
    }
  }

  onPaymentCurrencyChange(curr: 'USD' | 'VES' | 'EUR') {
    this.selectedPaymentCurrency.set(curr);
    this.cashTendered.set(null); // Reset custom tendered amount on currency switch
    if (curr === 'VES' && (this.selectedPaymentMethod() === 'EFECTIVO_USD' || this.selectedPaymentMethod() === 'EFECTIVO_EUR')) {
      this.selectedPaymentMethod.set('EFECTIVO');
    } else if (curr === 'USD' && this.selectedPaymentMethod() === 'EFECTIVO') {
      this.selectedPaymentMethod.set('EFECTIVO_USD');
    } else if (curr === 'EUR' && this.selectedPaymentMethod() === 'EFECTIVO') {
      this.selectedPaymentMethod.set('EFECTIVO_EUR');
    }
  }

  isCashPayment(): boolean {
    const m = this.selectedPaymentMethod();
    return m === 'EFECTIVO' || m === 'EFECTIVO_USD' || m === 'EFECTIVO_EUR';
  }

  formatPaymentMethod(method?: PaymentMethod): string {
    if (!method) return 'N/A';
    switch (method) {
      case 'EFECTIVO_USD': return 'Efectivo $ USD';
      case 'EFECTIVO': return 'Efectivo VES';
      case 'PAGO_MOVIL': return 'Pago Móvil';
      case 'PUNTO_VENTA_DEBITO': return 'Punto de Venta';
      case 'TARJETA_CREDITO': return 'Tarjeta Crédito';
      case 'TRANSFERENCIA': return 'Transferencia';
      case 'ZELLE': return 'Zelle';
      case 'CREDITO': return 'Crédito';
      case 'SALDO_A_FAVOR': return 'Saldo a Favor / Anticipo';
      default: return method;
    }
  }

  onBarcodeScanned(code: string) {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim().toLowerCase();
    
    const prod = this.stateService.products().find(p => 
      p.barcode.toLowerCase() === cleanCode || 
      p.sku.toLowerCase() === cleanCode ||
      p.name.toLowerCase().includes(cleanCode)
    );

    if (prod) {
      this.addToCart(prod);
      this.stateService.notify('info', 'Producto Agregado', `${prod.name} sumado al carrito.`);
    } else {
      this.stateService.notify('warning', 'No Encontrado', `No existe producto con código/SKU "${code}".`);
    }
  }

  addToCart(product: Product) {
    const isService = product.itemType === 'SERVICE' || product.unit === 'HRA' || product.unit === 'SRV' || product.unit === 'GLB';
    const whStock = this.getProductWarehouseStock(product);
    const existing = this.cartItems().find(i => i.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (!isService && whStock <= 0) {
      this.stateService.notify(
        'warning',
        'Sin Existencias',
        `"${product.name}" no tiene stock disponible en ${this.selectedWarehouseName()}.`
      );
      return;
    }

    if (!isService && currentQtyInCart + 1 > whStock) {
      this.stateService.notify(
        'warning',
        'Límite de Stock',
        `Solo hay ${whStock} unidades de "${product.name}" disponibles en ${this.selectedWarehouseName()}.`
      );
      return;
    }

    this.cartItems.update(items => {
      const existingIndex = items.findIndex(i => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [
          ...items,
          {
            product,
            quantity: 1,
            discountPercent: 0,
            priceLevel: this.selectedPriceTier()
          }
        ];
      }
    });
  }

  increaseQty(productId: string) {
    const item = this.cartItems().find(i => i.product.id === productId);
    if (!item) return;
    const isService = item.product.itemType === 'SERVICE' || item.product.unit === 'HRA' || item.product.unit === 'SRV' || item.product.unit === 'GLB';
    const whStock = this.getProductWarehouseStock(item.product);
    if (!isService && item.quantity + 1 > whStock) {
      this.stateService.notify(
        'warning',
        'Límite de Stock',
        `Stock disponible en ${this.selectedWarehouseName()}: ${whStock}`
      );
      return;
    }
    this.cartItems.update(items =>
      items.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i)
    );
  }

  decreaseQty(productId: string) {
    this.cartItems.update(items => {
      return items
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
    });
  }

  removeItem(productId: string) {
    this.cartItems.update(items => items.filter(i => i.product.id !== productId));
  }

  clearCart() {
    this.cartItems.set([]);
    this.cashTendered.set(null);
  }

  async checkout() {
    if (this.cartItems().length === 0) return;

    if (this.isMixedPayment()) {
      const bal = this.mixedBalanceDetails();
      if (bal.isDeficit && !this.hasCreditPayment()) {
        this.stateService.notify(
          'warning',
          'Monto Mixto Insuficiente',
          `Faltan $${bal.deficitUsd.toFixed(2)} USD (Bs. ${bal.deficitVes.toFixed(2)}) por cubrir en los métodos de pago registrados.`
        );
        return;
      }

      const saleItems = this.cartItems().map(ci => ({
        productId: ci.product.id,
        quantity: ci.quantity,
        discountPercent: ci.discountPercent,
        priceLevel: ci.priceLevel
      }));

      const payments: PaymentRecord[] = this.splitPayments().map(sp => {
        const isBs = this.stateService.isBolivaresPaymentMethod(sp.method, sp.currency);
        const isDiv = this.stateService.isForeignCurrencyPaymentMethod(sp.method, sp.currency);
        return {
          method: sp.method,
          amount: sp.amount,
          currency: sp.currency,
          reference: sp.reference || (sp.method.startsWith('EFECTIVO') ? 'CONTADO_CAJA' : 'REF-' + Math.floor(Math.random() * 90000 + 10000)),
          isForeignCurrency: isDiv && !isBs
        };
      });

      const sTax = this.splitTaxDetails();

      const custId = this.selectedCustomerId() || this.stateService.customers()[0]?.id || 'cust-01';
      const whId = (this.selectedWarehouseId() && this.selectedWarehouseId() !== 'ALL')
        ? this.selectedWarehouseId()
        : (this.stateService.warehouses().find(w => w.isMain)?.id || this.stateService.warehouses()[0]?.id || 'wh-01');

      const invalidItems = this.cartItems().filter(item => {
        const isSrv = item.product.itemType === 'SERVICE' || item.product.unit === 'HRA' || item.product.unit === 'SRV' || item.product.unit === 'GLB';
        if (isSrv) return false;
        const stock = this.getProductWarehouseStock(item.product, whId);
        return item.quantity > stock;
      });

      if (invalidItems.length > 0) {
        const first = invalidItems[0];
        const stock = this.getProductWarehouseStock(first.product, whId);
        this.stateService.notify(
          'warning',
          'Stock Insuficiente en Almacén',
          `"${first.product.name}" solo tiene ${stock} unidades disponibles en ${this.selectedWarehouseName()}. Ajuste la cantidad antes de emitir.`
        );
        return;
      }

      const result = await this.stateService.registerSaleInvoice(
        custId,
        whId,
        saleItems,
        payments,
        'FACTURA_ELECTRONICA',
        {
          baseCurrency: 'USD',
          paymentCurrency: 'USD',
          priceLevelApplied: this.selectedPriceTier(),
          globalDiscountPercent: this.globalDiscountPercent(),
          customIvaRate: this.selectedIvaRate(),
          appliesIgtfManual: sTax.appliesIgtf,
          cashTendered: bal.totalPaidUsd,
          cashChangeDue: bal.surplusUsd > 0 ? bal.surplusUsd : 0,
          saveChangeAsCustomerCredit: this.saveChangeAsCustomerCredit()
        }
      );

      if (result.success && result.invoice) {
        this.cartItems.set([]);
        this.cashTendered.set(null);
        this.saveChangeAsCustomerCredit.set(false);
        this.openInvoiceView.emit(result.invoice);
        try {
          this.emailService.checkAndTriggerReorderAlerts('SALE_POS', result.invoice.invoiceNumber);
        } catch (err) {
          console.warn('Alerta de stock no enviada:', err);
        }
      } else {
        this.stateService.notify('error', 'Error al Emitir Factura', result.message || 'No se pudo generar la factura fiscal.');
      }
      return;
    }

    const changeInfo = this.cashChangeDetails();

    // Prevent deficit / underpayment if not commercial credit
    if (changeInfo.isDeficit && this.selectedPaymentMethod() !== 'CREDITO') {
      const currSymbol = this.selectedPaymentCurrency() === 'VES' ? 'Bs. ' : (this.selectedPaymentCurrency() === 'EUR' ? '€' : '$');
      this.stateService.notify(
        'warning',
        'Monto Recibido Insuficiente',
        `El cliente entregó ${currSymbol}${changeInfo.tendered.toFixed(2)}, pero el total a cobrar es ${currSymbol}${changeInfo.total.toFixed(2)}. Faltan ${currSymbol}${changeInfo.deficitInCurrency.toFixed(2)}.`
      );
      return;
    }

    const saleItems = this.cartItems().map(ci => ({
      productId: ci.product.id,
      quantity: ci.quantity,
      discountPercent: ci.discountPercent,
      priceLevel: ci.priceLevel
    }));

    const targetAmount = this.selectedPaymentCurrency() === 'VES' ? this.grandTotalVes() : this.grandTotalUsd();
    const isDivisas = this.computedTaxDetails().isDivisas;
    const isBolivares = this.computedTaxDetails().isBolivares;

    const payments: PaymentRecord[] = [
      {
        method: this.selectedPaymentMethod(),
        amount: targetAmount,
        currency: this.selectedPaymentCurrency(),
        reference: this.isCashPayment() ? 'CONTADO_CAJA' : 'REF-' + Math.floor(Math.random() * 90000 + 10000),
        isForeignCurrency: isDivisas && !isBolivares
      }
    ];

    const custId = this.selectedCustomerId() || this.stateService.customers()[0]?.id || 'cust-01';
    const whId = (this.selectedWarehouseId() && this.selectedWarehouseId() !== 'ALL')
      ? this.selectedWarehouseId()
      : (this.stateService.warehouses().find(w => w.isMain)?.id || this.stateService.warehouses()[0]?.id || 'wh-01');

    const invalidItems = this.cartItems().filter(item => {
      const isSrv = item.product.itemType === 'SERVICE' || item.product.unit === 'HRA' || item.product.unit === 'SRV' || item.product.unit === 'GLB';
      if (isSrv) return false;
      const stock = this.getProductWarehouseStock(item.product, whId);
      return item.quantity > stock;
    });

    if (invalidItems.length > 0) {
      const first = invalidItems[0];
      const stock = this.getProductWarehouseStock(first.product, whId);
      this.stateService.notify(
        'warning',
        'Stock Insuficiente en Almacén',
        `"${first.product.name}" solo tiene ${stock} unidades disponibles en ${this.selectedWarehouseName()}. Ajuste la cantidad antes de emitir.`
      );
      return;
    }

    const result = await this.stateService.registerSaleInvoice(
      custId,
      whId,
      saleItems,
      payments,
      'FACTURA_ELECTRONICA',
      {
        baseCurrency: 'USD',
        paymentCurrency: this.selectedPaymentCurrency(),
        priceLevelApplied: this.selectedPriceTier(),
        globalDiscountPercent: this.globalDiscountPercent(),
        customIvaRate: this.selectedIvaRate(),
        appliesIgtfManual: this.computedTaxDetails().appliesIgtf,
        cashTendered: changeInfo.tendered,
        cashChangeDue: changeInfo.changeInCurrency,
        saveChangeAsCustomerCredit: this.saveChangeAsCustomerCredit()
      }
    );

    if (result.success && result.invoice) {
      this.cartItems.set([]);
      this.cashTendered.set(null);
      this.saveChangeAsCustomerCredit.set(false);
      this.activeInvoiceForView.set(result.invoice);
      try {
        this.emailService.checkAndTriggerReorderAlerts('SALE_POS', result.invoice.invoiceNumber);
      } catch (err) {
        console.warn('Alerta de stock no enviada:', err);
      }
    } else {
      this.stateService.notify('error', 'Error al Emitir Factura', result.message || 'No se pudo generar la factura fiscal.');
    }
  }

  viewInvoice(invoice: Invoice) {
    this.activeInvoiceForView.set(invoice);
  }

  onCancelInvoiceClicked(invoice: Invoice) {
    if (confirm(`¿Está seguro de que desea anular la factura ${invoice.invoiceNumber}? El inventario será reintegrado al almacén.`)) {
      this.stateService.cancelInvoice(invoice.id, 'Anulación solicitada desde el historial de ventas.');
    }
  }

  downloadSalesCsv() {
    const list = this.filteredInvoices();
    if (list.length === 0) {
      this.stateService.notify('warning', 'Sin Datos', 'No existen facturas para exportar con los filtros seleccionados.');
      return;
    }
    const bcvRate = this.stateService.bcvState().usdRate;
    const success = exportSalesToCsv(list, bcvRate);
    if (success) {
      this.stateService.notify('success', 'Descarga Completada', `Se han exportado ${list.length} facturas de venta a formato CSV.`);
    } else {
      this.stateService.notify('error', 'Error al Exportar', 'Ocurrió un error al generar el archivo CSV.');
    }
  }

  downloadDetailedLinesCsv() {
    const list = this.filteredInvoices();
    if (list.length === 0) {
      this.stateService.notify('warning', 'Sin Datos', 'No existen facturas para exportar con los filtros seleccionados.');
      return;
    }
    const success = exportSaleItemLinesToCsv(list);
    if (success) {
      this.stateService.notify('success', 'Descarga Completada', `Se han exportado los renglones detallados de ${list.length} facturas a CSV.`);
    } else {
      this.stateService.notify('error', 'Error al Exportar', 'Ocurrió un error al generar el archivo CSV.');
    }
  }

  openNewCustomerModal() {
    this.newCustomerTaxId.set('');
    this.newCustomerName.set('');
    this.newCustomerEmail.set('');
    this.newCustomerPhone.set('');
    this.newCustomerAddress.set('');
    this.newCustomerType.set('EMPRESA');
    this.newCustomerAdvanceBalance.set(0);
    this.showNewCustomerModal.set(true);
  }

  saveNewCustomer(event: Event) {
    event.preventDefault();
    if (!this.newCustomerTaxId().trim() || !this.newCustomerName().trim()) {
      this.stateService.notify('error', 'Datos Incompletos', 'El documento y la razón social son obligatorios.');
      return;
    }

    this.stateService.createCustomer({
      taxId: this.newCustomerTaxId().trim(),
      name: this.newCustomerName().trim(),
      email: this.newCustomerEmail().trim(),
      phone: this.newCustomerPhone().trim(),
      address: this.newCustomerAddress().trim(),
      customerType: this.newCustomerType(),
      advanceBalanceUsd: this.newCustomerAdvanceBalance() > 0 ? this.newCustomerAdvanceBalance() : undefined
    }).subscribe(customer => {
        this.selectedCustomerId.set(customer.id);
        this.showNewCustomerModal.set(false);
    });
  }
}
