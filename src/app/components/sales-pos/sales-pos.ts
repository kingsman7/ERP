import { Component, ChangeDetectionStrategy, inject, signal, computed, output, effect } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
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

interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  priceLevel: PriceLevelKey;
}

@Component({
  selector: 'app-sales-pos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, MatIconModule],
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
                  <span>USD: Bs. {{ stateService.bcvState().usdRate.toFixed(2) }}</span>
                  <span class="text-slate-300">|</span>
                  <span>EUR: Bs. {{ stateService.bcvState().eurRate.toFixed(2) }}</span>
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
              <div class="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                <mat-icon class="text-slate-400 text-sm">store</mat-icon>
                <select 
                  [value]="selectedWarehouseId()"
                  (change)="selectedWarehouseId.set($any($event.target).value)"
                  class="bg-transparent font-medium text-slate-800 focus:outline-none text-xs">
                  @for (wh of stateService.warehouses(); track wh.id) {
                    <option [value]="wh.id">{{ wh.name }}</option>
                  }
                </select>
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
            </div>

            <!-- Product Quick Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto p-1">
              @for (product of filteredCatalog(); track product.id) {
                <button 
                  type="button"
                  (click)="addToCart(product)"
                  class="text-left bg-white p-3 rounded-2xl border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group">
                  
                  <div class="w-full">
                    <div class="flex items-start justify-between">
                      <span class="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-emerald-600">{{ product.sku }}</span>
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
                        \${{ getAppliedProductPrice(product).toFixed(2) }}
                      </span>
                      <span class="text-[10px] font-mono text-emerald-700 block">
                        Bs. {{ (getAppliedProductPrice(product) * stateService.bcvState().usdRate).toFixed(2) }}
                      </span>
                    </div>

                    <div class="text-right">
                      <span 
                        class="text-[10px] font-mono font-medium block"
                        [class]="product.totalStock <= product.minStock ? 'text-rose-600 font-bold' : 'text-slate-500'">
                        Stock: {{ product.totalStock }}
                      </span>
                      <span 
                        class="p-1 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors inline-flex items-center justify-center">
                        <mat-icon class="text-base">add_shopping_cart</mat-icon>
                      </span>
                    </div>
                  </div>

                </button>
              } @empty {
                <div class="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                  <mat-icon class="text-3xl text-slate-300 mb-1">search_off</mat-icon>
                  <p>No se encontraron productos disponibles con los filtros actuales.</p>
                </div>
              }
            </div>

          </div>

          <!-- Right Column: Cart, Customer & Multi-Currency Payment (5 cols) -->
          <div class="lg:col-span-5 space-y-3">
            
            <!-- Cart Box -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[590px]">
              
              <!-- Customer Selector Header -->
              <div class="p-3.5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-1.5">
                    <mat-icon class="text-slate-500 text-base">person</mat-icon>
                    <span class="text-xs font-semibold text-slate-800">Cliente / Receptor Fiscal</span>
                  </div>
                  <span class="text-[10px] text-slate-500 font-mono">
                    {{ selectedCustomer()?.taxId }}
                  </span>
                </div>

                <select 
                  [value]="selectedCustomerId()"
                  (change)="selectedCustomerId.set($any($event.target).value)"
                  class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500">
                  @for (c of stateService.customers(); track c.id) {
                    <option [value]="c.id">{{ c.name }} ({{ c.taxId }})</option>
                  }
                </select>
              </div>

              <!-- Cart Item List -->
              <div class="flex-1 overflow-y-auto p-3 space-y-2">
                @for (item of cartItems(); track item.product.id) {
                  <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-2">
                    
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-1.5">
                        <span class="text-xs font-semibold text-slate-900 truncate">{{ item.product.name }}</span>
                        @if (item.product.isTaxExempt) {
                          <span class="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">EXENTO</span>
                        }
                      </div>
                      <div class="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500">
                        <span class="font-mono">\${{ getItemUnitPrice(item).toFixed(2) }} c/u</span>
                        <span>•</span>
                        <span class="font-mono text-emerald-700">Bs. {{ (getItemUnitPrice(item) * stateService.bcvState().usdRate).toFixed(2) }}</span>
                      </div>
                    </div>

                    <!-- Quantity Controls -->
                    <div class="flex items-center space-x-1">
                      <button 
                        (click)="decreaseQty(item.product.id)"
                        class="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs">
                        -
                      </button>
                      <span class="font-mono font-bold text-xs px-1.5">{{ item.quantity }}</span>
                      <button 
                        (click)="increaseQty(item.product.id)"
                        class="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-xs">
                        +
                      </button>
                    </div>

                    <!-- Item Subtotal -->
                    <div class="text-right min-w-[65px]">
                      <span class="font-mono font-bold text-xs text-slate-900 block">
                        \${{ getItemSubtotal(item).toFixed(2) }}
                      </span>
                      <button 
                        (click)="removeItem(item.product.id)"
                        class="text-[10px] text-rose-500 hover:text-rose-700 underline">
                        Quitar
                      </button>
                    </div>

                  </div>
                } @empty {
                  <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                    <mat-icon class="text-4xl text-slate-300 mb-1">shopping_basket</mat-icon>
                    <p class="font-medium">El carrito de compras está vacío</p>
                    <p class="text-[11px] text-slate-400">Escanee códigos de barras o seleccione del catálogo</p>
                  </div>
                }
              </div>

              <!-- Cart Calculations & Tax Summary -->
              <div class="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                
                <div class="flex justify-between text-slate-500">
                  <span>Subtotal Bruto:</span>
                  <span class="font-mono font-medium text-slate-800">\${{ cartSubtotalGross().toFixed(2) }}</span>
                </div>

                @if (computedTaxDetails().exemptBase > 0) {
                  <div class="flex justify-between text-amber-700">
                    <span>Base Exenta (0% IVA):</span>
                    <span class="font-mono font-medium">\${{ computedTaxDetails().exemptBase.toFixed(2) }}</span>
                  </div>
                }

                <div class="flex justify-between text-slate-500">
                  <span>Base Gravable (IVA {{ (selectedIvaRate() * 100).toFixed(0) }}%):</span>
                  <span class="font-mono font-medium text-slate-800">\${{ computedTaxDetails().taxableBase.toFixed(2) }}</span>
                </div>

                <div class="flex justify-between text-slate-500">
                  <span>Impuesto IVA Liquidado:</span>
                  <span class="font-mono font-medium text-slate-800">\${{ computedTaxDetails().ivaAmount.toFixed(2) }}</span>
                </div>

                <!-- IGTF Alert & Toggle -->
                @if (computedTaxDetails().appliesIgtf) {
                  <div class="flex justify-between text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-lg border border-indigo-100">
                    <span class="font-medium flex items-center space-x-1">
                      <mat-icon class="text-sm">account_balance</mat-icon>
                      <span>Percepción IGTF 3% (Divisas):</span>
                    </span>
                    <span class="font-mono font-bold">\${{ computedTaxDetails().igtfAmount.toFixed(2) }}</span>
                  </div>
                }

                <!-- Totals Multi-Currency Summary -->
                <div class="pt-2 border-t border-slate-200/80 space-y-1">
                  <div class="flex justify-between items-baseline">
                    <span class="font-bold text-slate-900 text-sm">TOTAL A COBRAR:</span>
                    <div class="text-right">
                      <span class="font-mono font-bold text-lg text-emerald-600">\${{ grandTotalUsd().toFixed(2) }}</span>
                      <span class="block font-mono font-bold text-xs text-slate-700">
                        Bs. {{ grandTotalVes().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Payment Method & Currency Selector -->
                <div class="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Moneda de Cobro</span>
                    <select 
                      [value]="selectedPaymentCurrency()"
                      (change)="selectedPaymentCurrency.set($any($event.target).value)"
                      class="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none">
                      <option value="USD">USD ($ Dólares)</option>
                      <option value="VES">VES (Bs. Bolívares BCV)</option>
                      <option value="EUR">EUR (€ Euros)</option>
                    </select>
                  </div>

                  <div>
                    <span class="block text-[10px] font-semibold text-slate-500 mb-0.5">Método de Pago</span>
                    <select 
                      [value]="selectedPaymentMethod()"
                      (change)="selectedPaymentMethod.set($any($event.target).value)"
                      class="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none">
                      <option value="EFECTIVO_USD">Efectivo USD (IGTF 3%)</option>
                      <option value="EFECTIVO">Efectivo Bolívares</option>
                      <option value="PAGO_MOVIL">Pago Móvil</option>
                      <option value="PUNTO_VENTA_DEBITO">Punto de Venta Débito</option>
                      <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="ZELLE">Zelle / Wire</option>
                      <option value="CREDITO">Crédito Comercial</option>
                    </select>
                  </div>
                </div>

                <!-- Checkout Action -->
                <button 
                  (click)="checkout()"
                  [disabled]="cartItems().length === 0"
                  class="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed">
                  <mat-icon class="text-base">receipt_long</mat-icon>
                  <span>EMITIR FACTURA FISCAL (F10)</span>
                </button>

              </div>

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
              <p class="text-lg font-bold font-mono text-emerald-700 mt-0.5">\${{ totalFilteredUsd().toFixed(2) }}</p>
              <span class="text-[10px] text-slate-400 font-mono">
                Bs. {{ totalFilteredVes().toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
              </span>
            </div>

            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Total IVA Recaudado ($)</span>
              <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">\${{ totalFilteredIvaUsd().toFixed(2) }}</p>
              <span class="text-[10px] text-slate-400">Débito fiscal IVA 16%</span>
            </div>

            <div class="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span class="text-[11px] font-medium text-slate-500 block">Percepción IGTF 3% ($)</span>
              <p class="text-lg font-bold font-mono text-indigo-900 mt-0.5">\${{ totalFilteredIgtfUsd().toFixed(2) }}</p>
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
                        <span class="block text-[10px] text-slate-400 font-mono">Tasa: {{ inv.bcvRate.toFixed(2) }}</span>
                      </td>

                      <!-- Subtotal -->
                      <td class="py-3 px-3 text-right font-mono text-slate-700">
                        \${{ inv.subtotal.toFixed(2) }}
                      </td>

                      <!-- IVA -->
                      <td class="py-3 px-3 text-right font-mono text-slate-700">
                        \${{ (inv.taxDetails.ivaAmount || 0).toFixed(2) }}
                      </td>

                      <!-- IGTF -->
                      <td class="py-3 px-3 text-right font-mono" [class.text-indigo-700]="(inv.taxDetails.igtfAmount || 0) > 0">
                        \${{ (inv.taxDetails.igtfAmount || 0).toFixed(2) }}
                      </td>

                      <!-- Total USD -->
                      <td class="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        \${{ inv.total.toFixed(2) }}
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

              <span>Total acumulado en vista: <strong class="font-mono text-slate-900">\${{ totalFilteredUsd().toFixed(2) }}</strong> (Bs. {{ totalFilteredVes().toLocaleString('es-VE') }})</span>
            </div>

          </div>

        </div>
      }

    </div>
  `
})
export class SalesPosComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  emailService = inject(EmailNotificationService);
  shortcutService = inject(KeyboardShortcutsService);

  openInvoiceView = output<Invoice>();

  activeSalesTab = signal<'pos' | 'history'>('pos');

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (!action) return;

      if (action.actionId === 'NEW_SALE') {
        this.activeSalesTab.set('pos');
      } else if (action.actionId === 'POS_PAY') {
        this.activeSalesTab.set('pos');
        if (this.cartItems().length > 0) {
          this.processSale();
        }
      }
    });
  }

  selectedWarehouseId = signal<string>(this.stateService.warehouses()[0]?.id || '');
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
  cashTendered = signal<number>(0);

  cartItems = signal<CartItem[]>([]);

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
    return this.stateService.products().filter(p => {
      const matchCat = cat === 'ALL' || p.category === cat;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
      return matchCat && matchQ && p.status === 'ACTIVE';
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
    
    // IGTF 3% applies if foreign currency (USD or EUR) paid in cash or foreign method
    const isForeignMethod = this.selectedPaymentCurrency() === 'USD' || 
                            this.selectedPaymentCurrency() === 'EUR' ||
                            this.selectedPaymentMethod() === 'EFECTIVO_USD' ||
                            this.selectedPaymentMethod() === 'EFECTIVO_EUR' ||
                            this.selectedPaymentMethod() === 'ZELLE';

    const appliesIgtf = this.manualIgtfOverride() !== null 
      ? Boolean(this.manualIgtfOverride()) 
      : isForeignMethod;

    const baseForIgtf = taxable + exempt + ivaAmount;
    const igtfAmount = appliesIgtf ? Number((baseForIgtf * 0.03).toFixed(2)) : 0;

    return {
      taxableBase: Number(taxable.toFixed(2)),
      exemptBase: Number(exempt.toFixed(2)),
      ivaPercent: ivaRate * 100,
      ivaAmount,
      appliesIgtf,
      igtfPercent: 3.0,
      igtfBase: baseForIgtf,
      igtfAmount
    };
  });

  grandTotalUsd = computed(() => {
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
  }

  checkout() {
    if (this.cartItems().length === 0) return;

    const saleItems = this.cartItems().map(ci => ({
      productId: ci.product.id,
      quantity: ci.quantity,
      discountPercent: ci.discountPercent,
      priceLevel: ci.priceLevel
    }));

    const targetAmount = this.selectedPaymentCurrency() === 'VES' ? this.grandTotalVes() : this.grandTotalUsd();

    const payments: PaymentRecord[] = [
      {
        method: this.selectedPaymentMethod(),
        amount: targetAmount,
        currency: this.selectedPaymentCurrency(),
        reference: this.isCashPayment() ? 'CONTADO_CAJA' : 'REF-' + Math.floor(Math.random() * 90000 + 10000),
        isForeignCurrency: this.selectedPaymentCurrency() === 'USD' || this.selectedPaymentCurrency() === 'EUR'
      }
    ];

    const result = this.stateService.registerSaleInvoice(
      this.selectedCustomerId(),
      this.selectedWarehouseId(),
      saleItems,
      payments,
      'FACTURA_ELECTRONICA',
      {
        baseCurrency: 'USD',
        paymentCurrency: this.selectedPaymentCurrency(),
        priceLevelApplied: this.selectedPriceTier(),
        globalDiscountPercent: this.globalDiscountPercent(),
        customIvaRate: this.selectedIvaRate(),
        appliesIgtfManual: this.computedTaxDetails().appliesIgtf
      }
    );

    if (result.success && result.invoice) {
      this.cartItems.set([]);
      this.openInvoiceView.emit(result.invoice);
      // Trigger automatic reorder check for inventory items sold
      this.emailService.checkAndTriggerReorderAlerts('SALE_POS', result.invoice.invoiceNumber);
    }
  }

  viewInvoice(invoice: Invoice) {
    this.openInvoiceView.emit(invoice);
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
}
