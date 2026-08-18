import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { 
  Product, 
  PaymentMethod, 
  PaymentRecord, 
  Invoice, 
  CurrencyCode, 
  PriceLevelKey 
} from '../../models/erp.models';

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
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <mat-icon>point_of_sale</mat-icon>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h1 class="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Punto de Venta & Facturación Multimoneda
                </h1>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  IVA + IGTF 3%
                </span>
              </div>
              <p class="text-xs text-slate-500">Cobro flexible en USD, VES y EUR con 5 niveles de precios y sincronización BCV</p>
            </div>
          </div>

          <!-- Currency & BCV Exchange Rate Live Card -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            
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
                class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                <mat-icon [class.animate-spin]="stateService.bcvState().isSyncing" class="text-base">sync</mat-icon>
              </button>
            </div>

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

          </div>
        </div>
      </div>

      <!-- Main POS Layout: Left Catalog / Barcode Scanner (7 cols), Right Multi-Currency Cart & Taxes (5 cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- Left Column: Search, Scanner, Quick Products -->
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
              <div class="flex items-center space-x-1 overflow-x-auto pb-0.5">
                <button 
                  (click)="selectedCategoryFilter.set('ALL')"
                  [class]="selectedCategoryFilter() === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  class="px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-xs">
                  Todos
                </button>
                @for (cat of categories(); track cat) {
                  <button 
                    (click)="selectedCategoryFilter.set(cat)"
                    [class]="selectedCategoryFilter() === cat ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap text-xs">
                    {{ cat }}
                  </button>
                }
              </div>

              <div class="relative min-w-[130px]">
                <input 
                  type="text"
                  [value]="searchQuery()"
                  (input)="searchQuery.set($any($event.target).value)"
                  placeholder="Filtrar..."
                  class="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>
          </div>

          <!-- Product Catalog Quick Cards Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            @for (prod of filteredCatalog(); track prod.id) {
              @let whStock = getProductStockInSelectedWarehouse(prod);
              @let tierPrice = stateService.getProductPriceByLevel(prod, selectedPriceTier());
              @let vesPrice = tierPrice * stateService.bcvState().usdRate;
              <button 
                type="button"
                (click)="addToCart(prod)"
                [disabled]="prod.totalStock < 900 && whStock <= 0"
                [class.opacity-50]="prod.totalStock < 900 && whStock <= 0"
                class="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group text-left w-full disabled:cursor-not-allowed">
                
                <div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>{{ prod.sku }}</span>
                    <span [class]="whStock <= 3 && prod.totalStock < 900 ? 'text-amber-600 font-bold' : 'text-slate-500'">
                      {{ prod.totalStock >= 900 ? 'Servicio' : 'Stock: ' + whStock }}
                    </span>
                  </div>

                  <div class="flex items-start justify-between gap-1">
                    <h3 class="font-semibold text-slate-800 text-xs line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      {{ prod.name }}
                    </h3>
                  </div>

                  <!-- Tax Badge & Price Tier Tag -->
                  <div class="flex items-center space-x-1 mt-1">
                    @if (prod.isTaxExempt || prod.taxRate === 0) {
                      <span class="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-bold">
                        EXENTO (E)
                      </span>
                    } @else {
                      <span class="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-bold">
                        IVA {{ (prod.taxRate * 100).toFixed(0) }}% (G)
                      </span>
                    }
                    <span class="text-[9px] text-slate-400 uppercase font-mono">{{ prod.unit }}</span>
                  </div>
                </div>

                <!-- Price in USD and Bolívares -->
                <div class="pt-2 border-t border-slate-100 mt-2 flex items-baseline justify-between">
                  <div class="flex flex-col">
                    <span class="font-mono font-bold text-sm text-slate-900">\${{ tierPrice.toFixed(2) }}</span>
                    <span class="text-[10px] font-mono text-slate-400">Bs. {{ vesPrice.toFixed(2) }}</span>
                  </div>
                  <span class="text-[10px] text-indigo-600 font-medium font-mono">
                    {{ selectedPriceTierLabel() }}
                  </span>
                </div>
              </button>
            }
          </div>

        </div>

        <!-- Right Column: Cart, Customer, Multi-currency, Discounts, Taxes & Checkout (5 cols) -->
        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
          
          <div class="p-4 space-y-3.5 max-h-[calc(100vh-170px)] overflow-y-auto">
            
            <!-- Customer & Billing Currency Selector -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-700">Cliente / Receptor Fiscal:</span>
                <span class="text-[10px] text-indigo-600 font-mono">Facturación Electrónica</span>
              </div>
              <select 
                [value]="selectedCustomerId()"
                (change)="selectedCustomerId.set($any($event.target).value)"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                @for (cust of stateService.customers(); track cust.id) {
                  <option [value]="cust.id">{{ cust.name }} ({{ cust.taxId }})</option>
                }
              </select>
            </div>

            <!-- Currency of Invoice & Configurable IVA rate -->
            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
              <div>
                <span class="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Moneda de Pago</span>
                <select 
                  [value]="selectedPaymentCurrency()"
                  (change)="onPaymentCurrencyChange($any($event.target).value)"
                  class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none text-xs">
                  <option value="USD">Dólares ($ USD)</option>
                  <option value="VES">Bolívares (Bs. VES)</option>
                  <option value="EUR">Euros (€ EUR)</option>
                </select>
              </div>

              <div>
                <span class="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Alícuota IVA</span>
                <select 
                  [value]="selectedIvaRate()"
                  (change)="selectedIvaRate.set(+$any($event.target).value)"
                  class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none text-xs">
                  <option [value]="0.16">General 16%</option>
                  <option [value]="0.08">Reducido 8%</option>
                  <option [value]="0.00">Exento 0%</option>
                </select>
              </div>
            </div>

            <!-- Cart Table Items -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <div class="bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600 flex justify-between items-center">
                <span class="flex items-center space-x-1">
                  <span>Ítems en Venta ({{ cartItems().length }})</span>
                </span>
                <button (click)="clearCart()" class="text-rose-600 hover:underline text-[10px]">Limpiar Carrito</button>
              </div>

              <div class="max-h-52 overflow-y-auto divide-y divide-slate-100">
                @for (item of cartItems(); track item.product.id) {
                  @let unitPrice = stateService.getProductPriceByLevel(item.product, item.priceLevel);
                  @let isExempt = item.product.isTaxExempt || item.product.taxRate === 0;
                  @let lineSub = (item.quantity * unitPrice * (1 - item.discountPercent / 100));
                  <div class="p-2.5 text-xs flex flex-col space-y-1.5 hover:bg-slate-50">
                    <div class="flex items-center justify-between">
                      <div class="overflow-hidden max-w-[190px]">
                        <p class="font-semibold text-slate-900 truncate">{{ item.product.name }}</p>
                        <div class="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                          <span>\${{ unitPrice.toFixed(2) }} c/u</span>
                          @if (isExempt) {
                            <span class="text-emerald-700 bg-emerald-50 px-1 rounded font-bold">(E)</span>
                          } @else {
                            <span class="text-indigo-700 bg-indigo-50 px-1 rounded font-bold">(G)</span>
                          }
                        </div>
                      </div>

                      <!-- Subtotal & Remove -->
                      <div class="text-right flex items-center space-x-2">
                        <div class="flex flex-col items-end">
                          <span class="font-mono font-bold text-slate-900">\${{ lineSub.toFixed(2) }}</span>
                          <span class="text-[9px] font-mono text-slate-400">
                            Bs. {{ (lineSub * stateService.bcvState().usdRate).toFixed(2) }}
                          </span>
                        </div>
                        <button (click)="removeItem(item.product.id)" class="text-slate-300 hover:text-rose-600">
                          <mat-icon class="text-base">close</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Quantity, Line Level & Discount Controls -->
                    <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <!-- Quantity Adjuster -->
                      <div class="flex items-center space-x-1">
                        <button 
                          (click)="decreaseQty(item.product.id)"
                          class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                          -
                        </button>
                        <span class="font-mono font-bold w-5 text-center">{{ item.quantity }}</span>
                        <button 
                          (click)="increaseQty(item.product.id)"
                          class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                          +
                        </button>
                      </div>

                      <!-- Price Tier per Line -->
                      <select 
                        [value]="item.priceLevel"
                        (change)="setItemPriceLevel(item.product.id, $any($event.target).value)"
                        class="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        @for (cfg of stateService.priceLevelConfigs; track cfg.key) {
                          <option [value]="cfg.key">{{ cfg.label }}</option>
                        }
                      </select>

                      <!-- Line Discount Input -->
                      <div class="flex items-center space-x-1">
                        <span class="text-slate-400">Desc %:</span>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          [value]="item.discountPercent"
                          (input)="setItemDiscount(item.product.id, +$any($event.target).value)"
                          class="w-10 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded font-mono text-center text-[10px]" />
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="py-8 text-center text-slate-400 text-xs">
                    <mat-icon class="text-2xl text-slate-300">shopping_basket</mat-icon>
                    <p class="mt-1">Carrito vacío</p>
                    <p class="text-[10px]">Escanea un producto o selecciónalo del catálogo.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Global Invoice Discount & IGTF Trigger Controls -->
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-medium text-slate-600 flex items-center space-x-1">
                  <mat-icon class="text-sm text-slate-400">percent</mat-icon>
                  <span>Descuento Global a la Factura (%):</span>
                </span>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  [value]="globalDiscountPercent()"
                  (input)="globalDiscountPercent.set(+$any($event.target).value)"
                  class="w-14 px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900" />
              </div>

              <!-- IGTF 3% Toggle / Auto Indicator -->
              <div class="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                <div class="flex items-center space-x-1.5">
                  <input 
                    type="checkbox" 
                    id="igtfCheck"
                    [checked]="computedTaxDetails().appliesIgtf"
                    (change)="manualIgtfOverride.set($any($event.target).checked)"
                    class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <label for="igtfCheck" class="text-[11px] font-medium text-slate-700 cursor-pointer">
                    Aplicar IGTF (3% Moneda Extranjera / Divisas)
                  </label>
                </div>
                @if (computedTaxDetails().appliesIgtf) {
                  <span class="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    +3% IGTF
                  </span>
                }
              </div>
            </div>

            <!-- Payment Methods Multi-Grid -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-semibold text-slate-600 uppercase">Forma de Pago Principal</span>
              <div class="grid grid-cols-3 gap-1 text-[11px]">
                <button 
                  (click)="setPaymentMethod('EFECTIVO_USD')"
                  [class]="selectedPaymentMethod() === 'EFECTIVO_USD' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  $ Efectivo USD
                </button>
                <button 
                  (click)="setPaymentMethod('PAGO_MOVIL')"
                  [class]="selectedPaymentMethod() === 'PAGO_MOVIL' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  Pago Móvil (VES)
                </button>
                <button 
                  (click)="setPaymentMethod('PUNTO_VENTA_DEBITO')"
                  [class]="selectedPaymentMethod() === 'PUNTO_VENTA_DEBITO' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  Punto Débito
                </button>
                <button 
                  (click)="setPaymentMethod('ZELLE')"
                  [class]="selectedPaymentMethod() === 'ZELLE' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  Zelle ($ USD)
                </button>
                <button 
                  (click)="setPaymentMethod('TRANSFERENCIA')"
                  [class]="selectedPaymentMethod() === 'TRANSFERENCIA' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  Transferencia
                </button>
                <button 
                  (click)="setPaymentMethod('CREDITO')"
                  [class]="selectedPaymentMethod() === 'CREDITO' ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="py-1.5 px-1 rounded-lg text-center transition-colors">
                  Crédito 15d
                </button>
              </div>

              <!-- Cash Tendered & Change calculator -->
              @if (isCashPayment()) {
                <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium mb-0.5">
                      Recibido ({{ selectedPaymentCurrency() }}):
                    </span>
                    <input 
                      type="number" 
                      [value]="cashTendered()"
                      (input)="cashTendered.set(+$any($event.target).value)"
                      placeholder="0.00" 
                      class="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs" />
                  </div>
                  <div>
                    <span class="block text-[10px] text-slate-500 font-medium mb-0.5">Vuelto / Cambio:</span>
                    <p class="font-mono font-bold text-xs py-1" [class]="cashChange() >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                      {{ selectedPaymentCurrency() === 'VES' ? 'Bs. ' : '$' }}{{ cashChange().toFixed(2) }}
                    </p>
                  </div>
                </div>
              }
            </div>

          </div>

          <!-- Checkout Summary & Multi-Currency Totals (Dark Bento Panel) -->
          <div class="p-4 bg-slate-900 text-white space-y-3">
            
            <!-- Tax & Base Breakdown Itemized -->
            <div class="space-y-1 text-xs text-slate-300 border-b border-slate-800 pb-2">
              <div class="flex justify-between text-[11px]">
                <span>Base Imponible Gravada:</span>
                <span class="font-mono">\${{ computedTaxDetails().taxableBase.toFixed(2) }}</span>
              </div>
              @if (computedTaxDetails().exemptBase > 0) {
                <div class="flex justify-between text-[11px] text-emerald-400">
                  <span>Base Exenta (0% IVA):</span>
                  <span class="font-mono">\${{ computedTaxDetails().exemptBase.toFixed(2) }}</span>
                </div>
              }
              <div class="flex justify-between text-[11px]">
                <span>IVA ({{ (selectedIvaRate() * 100).toFixed(0) }}%):</span>
                <span class="font-mono">\${{ computedTaxDetails().ivaAmount.toFixed(2) }}</span>
              </div>
              @if (computedTaxDetails().appliesIgtf) {
                <div class="flex justify-between text-[11px] text-amber-400">
                  <span>IGTF (3% Divisas):</span>
                  <span class="font-mono">+\${{ computedTaxDetails().igtfAmount.toFixed(2) }}</span>
                </div>
              }
              @if (globalDiscountPercent() > 0) {
                <div class="flex justify-between text-[11px] text-sky-400">
                  <span>Descuento Global ({{ globalDiscountPercent() }}%):</span>
                  <span class="font-mono">-\${{ computedGlobalDiscountAmount().toFixed(2) }}</span>
                </div>
              }
            </div>

            <!-- Grand Totals in USD, VES and EUR -->
            <div class="space-y-1">
              <div class="flex justify-between items-baseline">
                <span class="text-xs font-semibold text-slate-300">TOTAL FACTURA ($ USD):</span>
                <span class="font-mono font-bold text-xl text-emerald-400">\${{ grandTotalUsd().toFixed(2) }}</span>
              </div>
              <div class="flex justify-between items-baseline text-xs text-slate-300">
                <span>Equivalente en Bolívares (VES):</span>
                <span class="font-mono font-bold text-slate-100 text-sm">
                  Bs. {{ grandTotalVes().toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </span>
              </div>
              <div class="flex justify-between items-baseline text-[11px] text-slate-400">
                <span>Equivalente en Euros (EUR):</span>
                <span class="font-mono">€ {{ grandTotalEur().toFixed(2) }}</span>
              </div>
            </div>

            <!-- Emit Button -->
            <button 
              (click)="checkout()"
              [disabled]="cartItems().length === 0"
              class="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed">
              <mat-icon>receipt_long</mat-icon>
              <span>EMITIR FACTURA FISCAL & TIMBRAR</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  `
})
export class SalesPosComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  openInvoiceView = output<Invoice>();

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
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  });

  // Gross Subtotals and Tax Breakdowns
  cartGrossTaxable = computed(() => {
    return this.cartItems().reduce((sum, item) => {
      const isExempt = item.product.isTaxExempt || item.product.taxRate === 0;
      if (isExempt) return sum;
      const unitPrice = this.stateService.getProductPriceByLevel(item.product, item.priceLevel);
      const discounted = unitPrice * (1 - item.discountPercent / 100);
      return sum + (item.quantity * discounted);
    }, 0);
  });

  cartGrossExempt = computed(() => {
    return this.cartItems().reduce((sum, item) => {
      const isExempt = item.product.isTaxExempt || item.product.taxRate === 0;
      if (!isExempt) return sum;
      const unitPrice = this.stateService.getProductPriceByLevel(item.product, item.priceLevel);
      const discounted = unitPrice * (1 - item.discountPercent / 100);
      return sum + (item.quantity * discounted);
    }, 0);
  });

  computedGlobalDiscountAmount = computed(() => {
    const grossTotal = this.cartGrossTaxable() + this.cartGrossExempt();
    return grossTotal * (this.globalDiscountPercent() / 100);
  });

  computedTaxDetails = computed(() => {
    const discFactor = 1 - (this.globalDiscountPercent() / 100);
    const taxableBase = Number((this.cartGrossTaxable() * discFactor).toFixed(2));
    const exemptBase = Number((this.cartGrossExempt() * discFactor).toFixed(2));
    const ivaRate = this.selectedIvaRate();
    const ivaAmount = Number((taxableBase * ivaRate).toFixed(2));

    // IGTF logic: Auto applies if USD / EUR or manual override
    const method = this.selectedPaymentMethod();
    const currency = this.selectedPaymentCurrency();
    const isForeign = method === 'EFECTIVO_USD' || method === 'EFECTIVO_EUR' || method === 'ZELLE' || currency === 'USD' || currency === 'EUR';
    const appliesIgtf = this.manualIgtfOverride() !== null ? Boolean(this.manualIgtfOverride()) : isForeign;

    const igtfBase = appliesIgtf ? (taxableBase + exemptBase + ivaAmount) : 0;
    const igtfAmount = appliesIgtf ? Number((igtfBase * 0.03).toFixed(2)) : 0;

    return {
      taxableBase,
      exemptBase,
      ivaPercent: Number((ivaRate * 100).toFixed(0)),
      ivaAmount,
      appliesIgtf,
      igtfPercent: appliesIgtf ? 3.0 : 0,
      igtfBase: Number(igtfBase.toFixed(2)),
      igtfAmount
    };
  });

  grandTotalUsd = computed(() => {
    const tax = this.computedTaxDetails();
    return Number((tax.taxableBase + tax.exemptBase + tax.ivaAmount + tax.igtfAmount).toFixed(2));
  });

  grandTotalVes = computed(() => {
    const bcv = this.stateService.bcvState();
    return Number((this.grandTotalUsd() * bcv.usdRate).toFixed(2));
  });

  grandTotalEur = computed(() => {
    const bcv = this.stateService.bcvState();
    return Number(((this.grandTotalUsd() * bcv.usdRate) / bcv.eurRate).toFixed(2));
  });

  cashChange = computed(() => {
    const target = this.selectedPaymentCurrency() === 'VES' ? this.grandTotalVes() : this.grandTotalUsd();
    return this.cashTendered() - target;
  });

  getProductStockInSelectedWarehouse(prod: Product): number {
    const whId = this.selectedWarehouseId();
    return prod.stockByWarehouse?.find(s => s.warehouseId === whId)?.quantity || 0;
  }

  isCashPayment(): boolean {
    const m = this.selectedPaymentMethod();
    return m === 'EFECTIVO' || m === 'EFECTIVO_USD' || m === 'EFECTIVO_EUR';
  }

  setPaymentMethod(method: PaymentMethod) {
    this.selectedPaymentMethod.set(method);
    if (method === 'EFECTIVO_USD' || method === 'ZELLE') {
      this.selectedPaymentCurrency.set('USD');
    } else if (method === 'PAGO_MOVIL' || method === 'PUNTO_VENTA_DEBITO') {
      this.selectedPaymentCurrency.set('VES');
    }
  }

  onPaymentCurrencyChange(curr: CurrencyCode) {
    this.selectedPaymentCurrency.set(curr);
    if (curr === 'VES') {
      this.cashTendered.set(Math.ceil(this.grandTotalVes()));
    } else {
      this.cashTendered.set(Math.ceil(this.grandTotalUsd()));
    }
  }

  addToCart(prod: Product) {
    const available = this.getProductStockInSelectedWarehouse(prod);
    if (prod.totalStock < 900 && available <= 0) {
      this.stateService.notify('warning', 'Sin Existencias', `El producto ${prod.name} no tiene stock en este almacén.`);
      return;
    }

    this.cartItems.update(items => {
      const existingIndex = items.findIndex(i => i.product.id === prod.id);
      if (existingIndex > -1) {
        const item = items[existingIndex];
        if (prod.totalStock < 900 && item.quantity + 1 > available) {
          this.stateService.notify('warning', 'Límite de Stock', `Solo hay ${available} unidades disponibles en este almacén.`);
          return items;
        }
        const updated = [...items];
        updated[existingIndex] = { ...item, quantity: item.quantity + 1 };
        return updated;
      } else {
        return [...items, { product: prod, quantity: 1, discountPercent: 0, priceLevel: this.selectedPriceTier() }];
      }
    });

    if (this.selectedPaymentCurrency() === 'VES') {
      this.cashTendered.set(Math.ceil(this.grandTotalVes()));
    } else {
      this.cashTendered.set(Math.ceil(this.grandTotalUsd()));
    }
  }

  onBarcodeScanned(code: string) {
    const term = code.trim().toLowerCase();
    if (!term) return;
    const found = this.stateService.products().find(p => p.barcode.toLowerCase() === term || p.sku.toLowerCase() === term);
    if (found) {
      this.addToCart(found);
      this.stateService.notify('info', 'Producto Escaneado', `Se añadió ${found.name}`);
    } else {
      this.stateService.notify('error', 'Código No Encontrado', `No existe producto con código: ${code}`);
    }
  }

  increaseQty(productId: string) {
    const prod = this.stateService.products().find(p => p.id === productId);
    if (prod) this.addToCart(prod);
  }

  decreaseQty(productId: string) {
    this.cartItems.update(items => {
      const existing = items.find(i => i.product.id === productId);
      if (!existing) return items;
      if (existing.quantity <= 1) {
        return items.filter(i => i.product.id !== productId);
      }
      return items.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  }

  setItemDiscount(productId: string, discount: number) {
    const validDisc = Math.max(0, Math.min(100, isNaN(discount) ? 0 : discount));
    this.cartItems.update(items => items.map(i => i.product.id === productId ? { ...i, discountPercent: validDisc } : i));
  }

  setItemPriceLevel(productId: string, level: PriceLevelKey) {
    this.cartItems.update(items => items.map(i => i.product.id === productId ? { ...i, priceLevel: level } : i));
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
    }
  }
}
