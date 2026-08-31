import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { 
  BankAccountType, 
  PayableBill, 
  PaymentMethod,
  Invoice,
  PurchaseOrder
} from '../../models/erp.models';

export type TreasurySubTab = 'overview' | 'bank-accounts' | 'cxc' | 'cxp' | 'transactions';

export interface CustomerReceivableItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerTaxId: string;
  date: string;
  dueDate: string;
  totalUsd: number;
  totalVes: number;
  paidUsd: number;
  paidVes: number;
  balanceUsd: number;
  balanceVes: number;
  status: string;
}

export interface DetailItemRow {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
  discountPercent: number;
}

@Component({
  selector: 'app-treasury',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- TOP HEADER & TITLE -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-500/10 text-sky-600 border border-sky-500/20">
              TESORERÍA & BANCOS
            </span>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Tesorería, Cuentas por Cobrar (CxC) y Cuentas por Pagar (CxP)
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Control de liquidez multimoneda (USD/VES), cobros a clientes, pagos a proveedores, transferencias y asientos contables en tiempo real.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button 
            id="btn-treasury-transfer-top"
            (click)="openTransferModal()" 
            class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">sync_alt</mat-icon>
            <span>Transferir entre Cuentas</span>
          </button>
          
          <button 
            id="btn-treasury-new-bill-top"
            (click)="openNewBillModal()" 
            class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">post_add</mat-icon>
            <span>Nueva Factura CxP</span>
          </button>

          <button 
            id="btn-treasury-new-account-top"
            (click)="openNewAccountModal()" 
            class="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">add_business</mat-icon>
            <span>Nueva Cuenta Bancaria</span>
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Bento Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Liquidez Total en Bancos -->
        <div id="card-kpi-bank-liquidity" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Disponibilidad en Bancos</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.totalBankLiquidityUsd().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h3>
            <p class="text-[11px] text-sky-600 font-semibold mt-0.5">
              Bs. {{ (stateService.totalBankLiquidityUsd() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <mat-icon class="text-xl">account_balance</mat-icon>
          </div>
        </div>

        <!-- Cuentas por Cobrar (CxC) -->
        <div id="card-kpi-cxc-receivables" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-1.5">
              <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Por Cobrar Clientes (CxC)</p>
              @if (stateService.overdueReceivablesCount() > 0) {
                <span class="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-100 text-rose-700">
                  {{ stateService.overdueReceivablesCount() }} vencidas
                </span>
              }
            </div>
            <h3 class="text-2xl font-bold text-emerald-600 mt-1">\${{ stateService.totalReceivablesUsd().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">
              {{ stateService.pendingCustomerReceivables().length }} facturas con saldo pendiente
            </p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <mat-icon class="text-xl">call_received</mat-icon>
          </div>
        </div>

        <!-- Cuentas por Pagar (CxP) -->
        <div id="card-kpi-cxp-payables" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-1.5">
              <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Por Pagar Proveed. (CxP)</p>
              @if (stateService.overduePayablesCount() > 0) {
                <span class="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-100 text-rose-700">
                  {{ stateService.overduePayablesCount() }} vencidas
                </span>
              }
            </div>
            <h3 class="text-2xl font-bold text-amber-600 mt-1">\${{ stateService.totalPayablesUsd().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">
              {{ stateService.payableBills().length }} obligaciones registradas
            </p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <mat-icon class="text-xl">call_made</mat-icon>
          </div>
        </div>

        <!-- Posición Neta de Tesorería -->
        <div id="card-kpi-net-treasury" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Posición Neta Estimada</p>
            <h3 class="text-2xl font-bold" [class]="stateService.netTreasuryPositionUsd() >= 0 ? 'text-blue-600' : 'text-rose-600'">
              \${{ stateService.netTreasuryPositionUsd().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">
              (Bancos + CxC - CxP)
            </p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">account_balance_wallet</mat-icon>
          </div>
        </div>

      </div>

      <!-- NAVIGATION SUBTABS -->
      <div class="border-b border-slate-200 flex space-x-2 sm:space-x-4 overflow-x-auto select-none">
        <button 
          id="tab-treasury-overview"
          (click)="activeSubTab.set('overview')"
          [class]="activeSubTab() === 'overview' ? 'border-sky-600 text-sky-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'"
          class="pb-3 text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors">
          <mat-icon class="text-lg">dashboard</mat-icon>
          <span>Panel de Tesorería</span>
        </button>

        <button 
          id="tab-treasury-accounts"
          (click)="activeSubTab.set('bank-accounts')"
          [class]="activeSubTab() === 'bank-accounts' ? 'border-sky-600 text-sky-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'"
          class="pb-3 text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors">
          <mat-icon class="text-lg">account_balance</mat-icon>
          <span>Cuentas Bancarias & Cajas ({{ stateService.bankAccounts().length }})</span>
        </button>

        <button 
          id="tab-treasury-cxc"
          (click)="activeSubTab.set('cxc')"
          [class]="activeSubTab() === 'cxc' ? 'border-sky-600 text-sky-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'"
          class="pb-3 text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors">
          <mat-icon class="text-lg">receipt_long</mat-icon>
          <span>Cuentas por Cobrar - CxC ({{ stateService.pendingCustomerReceivables().length }})</span>
        </button>

        <button 
          id="tab-treasury-cxp"
          (click)="activeSubTab.set('cxp')"
          [class]="activeSubTab() === 'cxp' ? 'border-sky-600 text-sky-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'"
          class="pb-3 text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors">
          <mat-icon class="text-lg">payment</mat-icon>
          <span>Cuentas por Pagar - CxP ({{ pendingPayableBillsCount() }})</span>
        </button>

        <button 
          id="tab-treasury-txs"
          (click)="activeSubTab.set('transactions')"
          [class]="activeSubTab() === 'transactions' ? 'border-sky-600 text-sky-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'"
          class="pb-3 text-xs sm:text-sm border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors">
          <mat-icon class="text-lg">history</mat-icon>
          <span>Movimientos & Bitácora ({{ stateService.treasuryTransactions().length }})</span>
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: OVERVIEW / DASHBOARD DE TESORERÍA -->
      <!-- ========================================================================= -->
      @if (activeSubTab() === 'overview') {
        <div class="space-y-6">
          
          <!-- BANCOS & CUENTAS GRID CARDS -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <mat-icon class="text-sky-600 text-base">account_balance</mat-icon>
                <span>Cuentas Bancarias y Cajas Activas</span>
              </h2>
              <button 
                id="btn-add-account-overview"
                (click)="openNewAccountModal()" 
                class="text-xs text-sky-600 font-semibold hover:underline flex items-center space-x-1">
                <mat-icon class="text-sm">add</mat-icon>
                <span>Añadir Cuenta</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (acc of stateService.bankAccounts(); track acc.id) {
                <div [id]="'bank-card-' + acc.id" class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                  <!-- Header Badge -->
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold text-slate-800">{{ acc.bankName }}</span>
                        @if (acc.isDefault) {
                          <span class="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">PRINCIPAL</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 font-mono mt-0.5">{{ acc.accountNumber }}</p>
                    </div>
                    <span 
                      class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                      [class]="acc.currency === 'USD' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'">
                      {{ acc.currency }}
                    </span>
                  </div>

                  <!-- Saldos -->
                  <div class="my-4 pt-2 border-t border-slate-100">
                    <p class="text-[10px] uppercase font-semibold text-slate-400">Saldo Disponible</p>
                    <div class="flex items-baseline space-x-1.5 mt-0.5">
                      <span class="text-xl font-extrabold text-slate-900">
                        {{ acc.currency === 'VES' ? 'Bs. ' : '$' }}{{ acc.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-medium">
                      {{ acc.currency === 'VES' ? '≈ $' + acc.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '≈ Bs. ' + acc.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
                    </p>
                  </div>

                  <!-- Footer Actions -->
                  <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span class="text-[10px] text-slate-400">Contabilidad: {{ acc.glAccountCode }}</span>
                    <button 
                      [id]="'btn-transfer-from-' + acc.id"
                      (click)="openTransferModal(acc.id)"
                      class="text-sky-600 hover:text-sky-700 font-semibold flex items-center space-x-1">
                      <span>Transferir</span>
                      <mat-icon class="text-sm">arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- RESUMEN DUAL: ÚLTIMOS COBROS Y PAGOS PENDIENTES -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- CxC Pendientes Urgentes -->
            <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <mat-icon class="text-emerald-600 text-base">call_received</mat-icon>
                    <span>Cuentas por Cobrar Pendientes (CxC)</span>
                  </h3>
                  <p class="text-xs text-slate-500">Facturas emitidas con saldo por recaudar</p>
                </div>
                <button 
                  id="btn-view-all-cxc-overview"
                  (click)="activeSubTab.set('cxc')" 
                  class="text-xs text-sky-600 font-semibold hover:underline">
                  Ver Todas ({{ stateService.pendingCustomerReceivables().length }})
                </button>
              </div>

              <div class="space-y-2.5 max-h-80 overflow-y-auto">
                @for (cxc of stateService.pendingCustomerReceivables().slice(0, 5); track cxc.id) {
                  <div [id]="'cxc-row-overview-' + cxc.id" class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="font-bold text-xs text-slate-800">{{ cxc.invoiceNumber }}</span>
                        <span 
                          class="px-1.5 py-0.2 text-[9px] font-bold rounded-full"
                          [class]="cxc.status === 'VENCIDO' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'">
                          {{ cxc.status }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-600 font-medium">{{ cxc.customerName }}</p>
                      <p class="text-[10px] text-slate-400">Vence: {{ cxc.dueDate }}</p>
                    </div>

                    <div class="text-right flex flex-col items-end">
                      <p class="text-xs font-bold text-slate-900">\${{ cxc.balanceUsd.toFixed(2) }}</p>
                      <p class="text-[10px] text-slate-500">Bs. {{ cxc.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
                      <div class="flex items-center space-x-1.5 mt-1">
                        <button 
                          [id]="'btn-view-cxc-overview-' + cxc.id"
                          (click)="openCxcDetailModal(cxc)"
                          title="Ver detalle de factura de venta"
                          class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center space-x-0.5 transition-all">
                          <mat-icon class="text-xs">visibility</mat-icon>
                          <span>Ver</span>
                        </button>
                        <button 
                          [id]="'btn-collect-overview-' + cxc.id"
                          (click)="openCollectionModal(cxc)"
                          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-0.5">
                          <mat-icon class="text-xs">payments</mat-icon>
                          <span>Cobrar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-6 text-center text-slate-400 text-xs">
                    <mat-icon class="text-2xl text-slate-300">done_all</mat-icon>
                    <p class="mt-1 font-medium">No hay cobros pendientes. Todas las facturas están saldadas.</p>
                  </div>
                }
              </div>
            </div>

            <!-- CxP Facturas de Proveedores Pendientes -->
            <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <mat-icon class="text-amber-600 text-base">call_made</mat-icon>
                    <span>Cuentas por Pagar a Proveedores (CxP)</span>
                  </h3>
                  <p class="text-xs text-slate-500">Obligaciones comerciales por cancelar</p>
                </div>
                <button 
                  id="btn-view-all-cxp-overview"
                  (click)="activeSubTab.set('cxp')" 
                  class="text-xs text-sky-600 font-semibold hover:underline">
                  Ver Todas ({{ pendingPayableBillsCount() }})
                </button>
              </div>

              <div class="space-y-2.5 max-h-80 overflow-y-auto">
                @for (bill of pendingPayableBills().slice(0, 5); track bill.id) {
                  <div [id]="'cxp-row-overview-' + bill.id" class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="font-bold text-xs text-slate-800">{{ bill.billNumber }}</span>
                        <span 
                          class="px-1.5 py-0.2 text-[9px] font-bold rounded-full"
                          [class]="bill.status === 'VENCIDO' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'">
                          {{ bill.status }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-600 font-medium">{{ bill.supplierName }}</p>
                      <p class="text-[10px] text-slate-400">Vencimiento: {{ bill.dueDate }}</p>
                    </div>

                    <div class="text-right flex flex-col items-end">
                      <p class="text-xs font-bold text-slate-900">\${{ bill.balanceUsd.toFixed(2) }}</p>
                      <p class="text-[10px] text-slate-500">Bs. {{ bill.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
                      <div class="flex items-center space-x-1.5 mt-1">
                        <button 
                          [id]="'btn-view-cxp-overview-' + bill.id"
                          (click)="openCxpDetailModal(bill)"
                          title="Ver detalle de factura de proveedor"
                          class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg flex items-center space-x-0.5 transition-all">
                          <mat-icon class="text-xs">visibility</mat-icon>
                          <span>Ver</span>
                        </button>
                        <button 
                          [id]="'btn-pay-overview-' + bill.id"
                          (click)="openPaymentModal(bill)"
                          class="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-0.5">
                          <mat-icon class="text-xs">payment</mat-icon>
                          <span>Pagar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-6 text-center text-slate-400 text-xs">
                    <mat-icon class="text-2xl text-slate-300">verified</mat-icon>
                    <p class="mt-1 font-medium">No existen obligaciones pendientes por pagar.</p>
                  </div>
                }
              </div>
            </div>

          </div>

        </div>
      }

      <!-- ========================================================================= -->
      <!-- TAB 2: GESTIÓN DETALLADA DE CUENTAS BANCARIAS & CAJAS -->
      <!-- ========================================================================= -->
      @if (activeSubTab() === 'bank-accounts') {
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Cuentas Bancarias, Billeteras y Bóvedas de Efectivo</h2>
              <p class="text-xs text-slate-500">Configuración de entidades financieras, saldos y enlaces con el catálogo de cuentas contable NIIF.</p>
            </div>
            <button 
              id="btn-new-account-banktab"
              (click)="openNewAccountModal()" 
              class="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all">
              <mat-icon class="text-base">add</mat-icon>
              <span>Registrar Nueva Cuenta</span>
            </button>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">Banco / Entidad</th>
                    <th class="py-3 px-4">Número / Identificador</th>
                    <th class="py-3 px-4">Tipo & Moneda</th>
                    <th class="py-3 px-4">Cuenta Contable</th>
                    <th class="py-3 px-4 text-right">Saldo Moneda Base</th>
                    <th class="py-3 px-4 text-right">Equivalente USD</th>
                    <th class="py-3 px-4 text-right">Equivalente VES</th>
                    <th class="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                  @for (acc of stateService.bankAccounts(); track acc.id) {
                    <tr [id]="'row-bank-account-' + acc.id" class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center space-x-2">
                          <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                            <mat-icon class="text-base">account_balance</mat-icon>
                          </div>
                          <div>
                            <span class="font-bold text-slate-900 block">{{ acc.accountName }}</span>
                            <span class="text-[10px] text-slate-400">{{ acc.bankName }} • {{ acc.holderName }}</span>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-600">{{ acc.accountNumber }}</td>
                      <td class="py-3.5 px-4">
                        <span 
                          class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                          [class]="acc.currency === 'USD' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'">
                          {{ acc.accountType.replace(/_/g, ' ') }} ({{ acc.currency }})
                        </span>
                      </td>
                      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-600">{{ acc.glAccountCode }}</td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                        {{ acc.currency === 'VES' ? 'Bs. ' : '$' }}{{ acc.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-emerald-600">
                        \${{ acc.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-sky-600">
                        Bs. {{ acc.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center space-x-1.5">
                          <button 
                            [id]="'btn-transfer-row-' + acc.id"
                            (click)="openTransferModal(acc.id)"
                            title="Transferir fondos"
                            class="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                            <mat-icon class="text-base">sync_alt</mat-icon>
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
      }

      <!-- ========================================================================= -->
      <!-- TAB 3: CUENTAS POR COBRAR (CxC) -->
      <!-- ========================================================================= -->
      @if (activeSubTab() === 'cxc') {
        <div class="space-y-4">
          
          <!-- FILTROS Y BÚSQUEDA CXC -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div class="flex flex-wrap items-center gap-2">
              <button 
                id="btn-filter-cxc-all"
                (click)="cxcFilter.set('ALL')"
                [class]="cxcFilter() === 'ALL' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Todas ({{ stateService.customerReceivables().length }})
              </button>
              <button 
                id="btn-filter-cxc-pending"
                (click)="cxcFilter.set('PENDING')"
                [class]="cxcFilter() === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Pendientes ({{ stateService.pendingCustomerReceivables().length }})
              </button>
              <button 
                id="btn-filter-cxc-overdue"
                (click)="cxcFilter.set('OVERDUE')"
                [class]="cxcFilter() === 'OVERDUE' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Vencidas ({{ stateService.overdueReceivablesCount() }})
              </button>
            </div>

            <div class="relative min-w-[240px]">
              <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-sm">search</mat-icon>
              <input 
                id="input-search-cxc"
                [value]="cxcSearch()"
                (input)="handleCxcSearchInput($event)"
                type="text" 
                placeholder="Buscar cliente, RIF o factura..."
                class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>

          <!-- TABLA DE CUENTAS POR COBRAR -->
          <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">Factura</th>
                    <th class="py-3 px-4">Cliente / Documento</th>
                    <th class="py-3 px-4">Fecha Emisión</th>
                    <th class="py-3 px-4">Vencimiento</th>
                    <th class="py-3 px-4 text-right">Total Factura</th>
                    <th class="py-3 px-4 text-right">Cobrado</th>
                    <th class="py-3 px-4 text-right">Saldo Pendiente</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                    <th class="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                  @for (cxc of filteredCxcList(); track cxc.id) {
                    <tr [id]="'row-cxc-' + cxc.id" class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4 font-bold text-slate-900 font-mono">{{ cxc.invoiceNumber }}</td>
                      <td class="py-3.5 px-4">
                        <span class="font-bold text-slate-900 block">{{ cxc.customerName }}</span>
                        <span class="text-[10px] text-slate-400">{{ cxc.customerTaxId }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{{ cxc.date.substring(0, 10) }}</td>
                      <td class="py-3.5 px-4 font-mono text-[11px]" [class]="cxc.status === 'VENCIDO' ? 'text-rose-600 font-bold' : 'text-slate-500'">
                        {{ cxc.dueDate }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900">
                        \${{ cxc.totalUsd.toFixed(2) }}
                      </td>
                      <td class="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                        \${{ cxc.paidUsd.toFixed(2) }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-extrabold" [class]="cxc.balanceUsd > 0 ? 'text-amber-600' : 'text-slate-400'">
                        \${{ cxc.balanceUsd.toFixed(2) }}
                        <span class="block text-[10px] text-slate-400 font-normal">Bs. {{ cxc.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span 
                          class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                          [class]="cxc.status === 'COBRADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (cxc.status === 'VENCIDO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')">
                          {{ cxc.status }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center space-x-1.5">
                          <button 
                            [id]="'btn-view-cxc-' + cxc.id"
                            (click)="openCxcDetailModal(cxc)"
                            title="Ver detalles de la factura de venta"
                            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1 transition-all">
                            <mat-icon class="text-sm">visibility</mat-icon>
                            <span>Ver Detalles</span>
                          </button>
                          @if (cxc.balanceUsd > 0.01) {
                            <button 
                              [id]="'btn-collect-cxc-' + cxc.id"
                              (click)="openCollectionModal(cxc)"
                              class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm text-xs flex items-center space-x-1 transition-all">
                              <mat-icon class="text-sm">payments</mat-icon>
                              <span>Cobrar</span>
                            </button>
                          } @else {
                            <span class="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1 px-1">
                              <mat-icon class="text-sm">check_circle</mat-icon>
                              <span>Saldada</span>
                            </span>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="py-8 text-center text-slate-400 text-xs font-medium">
                        No se encontraron registros de cuentas por cobrar para el filtro actual.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- TAB 4: CUENTAS POR PAGAR (CxP) -->
      <!-- ========================================================================= -->
      @if (activeSubTab() === 'cxp') {
        <div class="space-y-4">
          
          <!-- FILTROS Y BOTÓN NUEVA FACTURA CxP -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div class="flex flex-wrap items-center gap-2">
              <button 
                id="btn-filter-cxp-all"
                (click)="cxpFilter.set('ALL')"
                [class]="cxpFilter() === 'ALL' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Todas ({{ stateService.payableBills().length }})
              </button>
              <button 
                id="btn-filter-cxp-pending"
                (click)="cxpFilter.set('PENDING')"
                [class]="cxpFilter() === 'PENDING' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Pendientes ({{ pendingPayableBillsCount() }})
              </button>
              <button 
                id="btn-filter-cxp-overdue"
                (click)="cxpFilter.set('OVERDUE')"
                [class]="cxpFilter() === 'OVERDUE' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'"
                class="px-3 py-1.5 text-xs rounded-xl transition-all">
                Vencidas ({{ stateService.overduePayablesCount() }})
              </button>
            </div>

            <div class="flex items-center space-x-2">
              <div class="relative min-w-[200px]">
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-sm">search</mat-icon>
                <input 
                  id="input-search-cxp"
                  [value]="cxpSearch()"
                  (input)="handleCxpSearchInput($event)"
                  type="text" 
                  placeholder="Buscar proveedor o factura..."
                  class="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <button 
                id="btn-new-bill-cxptab"
                (click)="openNewBillModal()"
                class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1 whitespace-nowrap transition-all">
                <mat-icon class="text-sm">add</mat-icon>
                <span>Nueva CxP</span>
              </button>
            </div>
          </div>

          <!-- TABLA DE CUENTAS POR PAGAR -->
          <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">Factura Prov.</th>
                    <th class="py-3 px-4">Proveedor / RIF</th>
                    <th class="py-3 px-4">Categoría</th>
                    <th class="py-3 px-4">Emisión</th>
                    <th class="py-3 px-4">Vencimiento</th>
                    <th class="py-3 px-4 text-right">Total Factura</th>
                    <th class="py-3 px-4 text-right">Pagado</th>
                    <th class="py-3 px-4 text-right">Saldo Deudor</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                    <th class="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                  @for (bill of filteredCxpList(); track bill.id) {
                    <tr [id]="'row-cxp-' + bill.id" class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4 font-bold text-slate-900 font-mono">{{ bill.billNumber }}</td>
                      <td class="py-3.5 px-4">
                        <span class="font-bold text-slate-900 block">{{ bill.supplierName }}</span>
                        <span class="text-[10px] text-slate-400">{{ bill.supplierTaxId }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-500">{{ bill.category }}</td>
                      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500">{{ bill.issueDate }}</td>
                      <td class="py-3.5 px-4 font-mono text-[11px]" [class]="bill.status === 'VENCIDO' ? 'text-rose-600 font-bold' : 'text-slate-500'">
                        {{ bill.dueDate }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900">
                        \${{ bill.totalAmountUsd.toFixed(2) }}
                      </td>
                      <td class="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                        \${{ bill.paidAmountUsd.toFixed(2) }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-extrabold" [class]="bill.balanceUsd > 0 ? 'text-amber-600' : 'text-slate-400'">
                        \${{ bill.balanceUsd.toFixed(2) }}
                        <span class="block text-[10px] text-slate-400 font-normal">Bs. {{ bill.balanceVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span 
                          class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                          [class]="bill.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (bill.status === 'VENCIDO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')">
                          {{ bill.status }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center space-x-1.5">
                          <button 
                            [id]="'btn-view-cxp-' + bill.id"
                            (click)="openCxpDetailModal(bill)"
                            title="Ver detalles de la factura de proveedor"
                            class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1 transition-all">
                            <mat-icon class="text-sm">visibility</mat-icon>
                            <span>Ver Detalles</span>
                          </button>
                          @if (bill.balanceUsd > 0.01) {
                            <button 
                              [id]="'btn-pay-cxp-' + bill.id"
                              (click)="openPaymentModal(bill)"
                              class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm text-xs flex items-center space-x-1 transition-all">
                              <mat-icon class="text-sm">payment</mat-icon>
                              <span>Pagar</span>
                            </button>
                          } @else {
                            <span class="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1 px-1">
                              <mat-icon class="text-sm">check_circle</mat-icon>
                              <span>Pagada</span>
                            </span>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="10" class="py-8 text-center text-slate-400 text-xs font-medium">
                        No hay facturas por pagar registradas bajo los criterios seleccionados.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- TAB 5: MOVIMIENTOS & BITÁCORA DE TESORERÍA -->
      <!-- ========================================================================= -->
      @if (activeSubTab() === 'transactions') {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-slate-800">Libro de Movimientos de Tesorería</h2>
              <p class="text-xs text-slate-500">Trazabilidad de cobros, pagos, transferencias y asientos contables asociados.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">Nº Operación</th>
                    <th class="py-3 px-4">Fecha & Hora</th>
                    <th class="py-3 px-4">Tipo</th>
                    <th class="py-3 px-4">Concepto / Descripción</th>
                    <th class="py-3 px-4">Cuenta / Banco</th>
                    <th class="py-3 px-4">Método / Ref</th>
                    <th class="py-3 px-4 text-right">Monto USD</th>
                    <th class="py-3 px-4 text-right">Monto VES</th>
                    <th class="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                  @for (tx of stateService.treasuryTransactions(); track tx.id) {
                    <tr [id]="'row-tx-' + tx.id" class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4 font-mono font-bold text-slate-900">{{ tx.transactionNumber }}</td>
                      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500">{{ tx.date }}</td>
                      <td class="py-3.5 px-4">
                        <span 
                          class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                          [class]="tx.type === 'COBRO_CXC' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (tx.type === 'PAGO_CXP' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200')">
                          {{ tx.type.replace(/_/g, ' ') }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="font-medium text-slate-800 block">{{ tx.concept }}</span>
                        @if (tx.entityName) {
                          <span class="text-[10px] text-slate-400">{{ tx.entityType }}: {{ tx.entityName }}</span>
                        }
                      </td>
                      <td class="py-3.5 px-4 text-slate-600 font-medium">{{ tx.bankAccountName }}</td>
                      <td class="py-3.5 px-4 text-[11px] font-mono text-slate-600">
                        {{ tx.paymentMethod }} ({{ tx.referenceNumber || 'N/A' }})
                      </td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900">
                        \${{ tx.amountUsd.toFixed(2) }}
                      </td>
                      <td class="py-3.5 px-4 text-right font-medium text-slate-600">
                        Bs. {{ tx.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {{ tx.status }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="py-8 text-center text-slate-400 text-xs font-medium">
                        No hay movimientos registrados en la bitácora de tesorería.
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

    <!-- ========================================================================= -->
    <!-- MODAL 1: REGISTRO DE COBRO CXC -->
    <!-- ========================================================================= -->
    @if (showCollectionModal()) {
      <div id="modal-cxc-collection" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
                <mat-icon class="text-emerald-600">payments</mat-icon>
                <span>Registrar Cobro de Factura</span>
              </h3>
              <p class="text-xs text-slate-500 font-mono">{{ selectedCxc()?.invoiceNumber }} - {{ selectedCxc()?.customerName }}</p>
            </div>
            <button id="btn-close-cxc-modal" (click)="closeCollectionModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="collectionForm" (ngSubmit)="submitCollection()" class="space-y-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p class="text-[10px] uppercase font-semibold text-slate-400">Saldo Pendiente</p>
                <p class="text-lg font-bold text-slate-900">\${{ selectedCxc()?.balanceUsd?.toFixed(2) }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase font-semibold text-slate-400">Tasa Oficial BCV</p>
                <p class="text-xs font-mono font-bold text-sky-600">Bs. {{ stateService.bcvState().usdRate.toFixed(2) }} / USD</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="cxc-amount-usd" class="block font-semibold text-slate-700 mb-1">Monto a Cobrar (USD) *</label>
                <input 
                  id="cxc-amount-usd"
                  formControlName="amountUsd" 
                  type="number" 
                  step="0.01"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800" />
              </div>

              <div>
                <label for="cxc-payment-method" class="block font-semibold text-slate-700 mb-1">Método de Pago *</label>
                <select 
                  id="cxc-payment-method"
                  formControlName="paymentMethod" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800">
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="ZELLE">Zelle / Divisa Digital</option>
                  <option value="EFECTIVO_USD">Efectivo USD (Caja/Bóveda)</option>
                  <option value="EFECTIVO_BS">Efectivo Bolívares</option>
                  <option value="PUNTO_VENTA">Punto de Venta / Tarjeta</option>
                </select>
              </div>
            </div>

            <div>
              <label for="cxc-bank-account-id" class="block font-semibold text-slate-700 mb-1">Cuenta Bancaria Receptora *</label>
              <select 
                id="cxc-bank-account-id"
                formControlName="bankAccountId" 
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800">
                @for (bank of stateService.bankAccounts(); track bank.id) {
                  <option [value]="bank.id">{{ bank.accountName }} ({{ bank.currency }}) - Saldo: {{ bank.currency === 'VES' ? 'Bs. ' : '$' }}{{ bank.balance.toFixed(2) }}</option>
                }
              </select>
            </div>

            <div>
              <label for="cxc-reference-number" class="block font-semibold text-slate-700 mb-1">Nº Referencia / Comprobante *</label>
              <input 
                id="cxc-reference-number"
                formControlName="referenceNumber" 
                type="text" 
                placeholder="Ej. TRF-908123 o Ref Zelle"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono" />
            </div>

            <div>
              <label for="cxc-notes" class="block font-semibold text-slate-700 mb-1">Notas / Observaciones</label>
              <input 
                id="cxc-notes"
                formControlName="notes" 
                type="text" 
                placeholder="Opcional: Cancelación parcial o total..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                id="btn-cancel-cxc"
                type="button" 
                (click)="closeCollectionModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors">
                Cancelar
              </button>
              <button 
                id="btn-submit-cxc"
                type="submit" 
                [disabled]="collectionForm.invalid"
                class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5 transition-all">
                <mat-icon class="text-base">check_circle</mat-icon>
                <span>Confirmar y Contabilizar Cobro</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 2: REGISTRO DE PAGO CXP -->
    <!-- ========================================================================= -->
    @if (showPaymentModal()) {
      <div id="modal-cxp-payment" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
                <mat-icon class="text-amber-600">payment</mat-icon>
                <span>Registrar Pago a Proveedor (CxP)</span>
              </h3>
              <p class="text-xs text-slate-500 font-mono">{{ selectedBill()?.billNumber }} - {{ selectedBill()?.supplierName }}</p>
            </div>
            <button id="btn-close-cxp-modal" (click)="closePaymentModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="paymentForm" (ngSubmit)="submitPayment()" class="space-y-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <p class="text-[10px] uppercase font-semibold text-slate-400">Saldo por Pagar</p>
                <p class="text-lg font-bold text-slate-900">\${{ selectedBill()?.balanceUsd?.toFixed(2) }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase font-semibold text-slate-400">Tasa Oficial BCV</p>
                <p class="text-xs font-mono font-bold text-sky-600">Bs. {{ stateService.bcvState().usdRate.toFixed(2) }} / USD</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="cxp-amount-usd" class="block font-semibold text-slate-700 mb-1">Monto a Desembolsar (USD) *</label>
                <input 
                  id="cxp-amount-usd"
                  formControlName="amountUsd" 
                  type="number" 
                  step="0.01"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800" />
              </div>

              <div>
                <label for="cxp-payment-method" class="block font-semibold text-slate-700 mb-1">Método de Pago *</label>
                <select 
                  id="cxp-payment-method"
                  formControlName="paymentMethod" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800">
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="ZELLE">Zelle Corporativo</option>
                  <option value="EFECTIVO_USD">Efectivo Divisas</option>
                  <option value="EFECTIVO_BS">Efectivo Bolívares</option>
                </select>
              </div>
            </div>

            <div>
              <label for="cxp-bank-account-id" class="block font-semibold text-slate-700 mb-1">Cuenta Bancaria Emisora *</label>
              <select 
                id="cxp-bank-account-id"
                formControlName="bankAccountId" 
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800">
                @for (bank of stateService.bankAccounts(); track bank.id) {
                  <option [value]="bank.id">{{ bank.accountName }} ({{ bank.currency }}) - Saldo: {{ bank.currency === 'VES' ? 'Bs. ' : '$' }}{{ bank.balance.toFixed(2) }}</option>
                }
              </select>
            </div>

            <div>
              <label for="cxp-reference-number" class="block font-semibold text-slate-700 mb-1">Nº Referencia / Transferencia *</label>
              <input 
                id="cxp-reference-number"
                formControlName="referenceNumber" 
                type="text" 
                placeholder="Ej. OP-BANE-89012"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono" />
            </div>

            <div>
              <label for="cxp-notes" class="block font-semibold text-slate-700 mb-1">Notas / Motivo</label>
              <input 
                id="cxp-notes"
                formControlName="notes" 
                type="text" 
                placeholder="Opcional: Cancelación factura o abono parcial..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                id="btn-cancel-cxp"
                type="button" 
                (click)="closePaymentModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors">
                Cancelar
              </button>
              <button 
                id="btn-submit-cxp"
                type="submit" 
                [disabled]="paymentForm.invalid"
                class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5 transition-all">
                <mat-icon class="text-base">check_circle</mat-icon>
                <span>Confirmar Orden de Pago</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 3: NUEVA FACTURA POR PAGAR (CxP) -->
    <!-- ========================================================================= -->
    @if (showNewBillModal()) {
      <div id="modal-new-cxp-bill" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
                <mat-icon class="text-amber-600">post_add</mat-icon>
                <span>Registrar Factura por Pagar (CxP)</span>
              </h3>
              <p class="text-xs text-slate-500">Alta de pasivo comercial a crédito con asiento contable automático</p>
            </div>
            <button id="btn-close-new-bill" (click)="closeNewBillModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="newBillForm" (ngSubmit)="submitNewBill()" class="space-y-4 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="bill-number" class="block font-semibold text-slate-700 mb-1">Nº Factura Proveedor *</label>
                <input 
                  id="bill-number"
                  formControlName="billNumber" 
                  type="text" 
                  placeholder="Ej. FP-2026-0091"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold" />
              </div>

              <div>
                <label for="bill-supplier-id" class="block font-semibold text-slate-700 mb-1">Proveedor *</label>
                <select 
                  id="bill-supplier-id"
                  formControlName="supplierId" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800">
                  <option value="">Seleccione proveedor...</option>
                  @for (sup of stateService.suppliers(); track sup.id) {
                    <option [value]="sup.id">{{ sup.name }} ({{ sup.taxId }})</option>
                  }
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="bill-issue-date" class="block font-semibold text-slate-700 mb-1">Fecha Emisión *</label>
                <input 
                  id="bill-issue-date"
                  formControlName="issueDate" 
                  type="date" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div>
                <label for="bill-due-date" class="block font-semibold text-slate-700 mb-1">Fecha Vencimiento *</label>
                <input 
                  id="bill-due-date"
                  formControlName="dueDate" 
                  type="date" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="bill-total-usd" class="block font-semibold text-slate-700 mb-1">Total a Pagar (USD) *</label>
                <input 
                  id="bill-total-usd"
                  formControlName="totalAmountUsd" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800" />
              </div>

              <div>
                <label for="bill-category" class="block font-semibold text-slate-700 mb-1">Categoría de Gasto / Compra</label>
                <input 
                  id="bill-category"
                  formControlName="category" 
                  type="text" 
                  placeholder="Ej. Mercancía, Insumos, Servicios..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>

            <div>
              <label for="bill-notes" class="block font-semibold text-slate-700 mb-1">Descripción / Concepto</label>
              <textarea 
                id="bill-notes"
                formControlName="notes" 
                rows="2"
                placeholder="Detalles de la compra o términos de crédito..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"></textarea>
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                id="btn-cancel-new-bill"
                type="button" 
                (click)="closeNewBillModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors">
                Cancelar
              </button>
              <button 
                id="btn-submit-new-bill"
                type="submit" 
                [disabled]="newBillForm.invalid"
                class="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5 transition-all">
                <mat-icon class="text-base">save</mat-icon>
                <span>Guardar Factura CxP</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 4: TRANSFERENCIA ENTRE CUENTAS BANCARIAS -->
    <!-- ========================================================================= -->
    @if (showTransferModal()) {
      <div id="modal-transfer-accounts" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
                <mat-icon class="text-blue-600">sync_alt</mat-icon>
                <span>Transferencia entre Cuentas / Cajas</span>
              </h3>
              <p class="text-xs text-slate-500">Traspaso interno con asiento contable de mayorización automática</p>
            </div>
            <button id="btn-close-transfer-modal" (click)="closeTransferModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="transferForm" (ngSubmit)="submitTransfer()" class="space-y-4 text-xs">
            <div>
              <label for="transfer-source-bank" class="block font-semibold text-slate-700 mb-1">Cuenta Origen (Egreso) *</label>
              <select 
                id="transfer-source-bank"
                formControlName="sourceBankAccountId" 
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800">
                @for (bank of stateService.bankAccounts(); track bank.id) {
                  <option [value]="bank.id">{{ bank.accountName }} ({{ bank.currency }}) - Disp: {{ bank.currency === 'VES' ? 'Bs. ' : '$' }}{{ bank.balance.toFixed(2) }}</option>
                }
              </select>
            </div>

            <div>
              <label for="transfer-dest-bank" class="block font-semibold text-slate-700 mb-1">Cuenta Destino (Ingreso) *</label>
              <select 
                id="transfer-dest-bank"
                formControlName="destinationBankAccountId" 
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800">
                @for (bank of stateService.bankAccounts(); track bank.id) {
                  <option [value]="bank.id">{{ bank.accountName }} ({{ bank.currency }}) - Disp: {{ bank.currency === 'VES' ? 'Bs. ' : '$' }}{{ bank.balance.toFixed(2) }}</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="transfer-amount-usd" class="block font-semibold text-slate-700 mb-1">Monto a Transferir (USD) *</label>
                <input 
                  id="transfer-amount-usd"
                  formControlName="amountUsd" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800" />
              </div>

              <div>
                <label for="transfer-ref" class="block font-semibold text-slate-700 mb-1">Nº Referencia Bancaria *</label>
                <input 
                  id="transfer-ref"
                  formControlName="referenceNumber" 
                  type="text" 
                  placeholder="Ej. TRF-INTER-01"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
            </div>

            <div>
              <label for="transfer-notes" class="block font-semibold text-slate-700 mb-1">Notas / Justificación</label>
              <input 
                id="transfer-notes"
                formControlName="notes" 
                type="text" 
                placeholder="Opcional: Reposición de fondo de caja, cambio de divisas..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                id="btn-cancel-transfer"
                type="button" 
                (click)="closeTransferModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors">
                Cancelar
              </button>
              <button 
                id="btn-submit-transfer"
                type="submit" 
                [disabled]="transferForm.invalid"
                class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5 transition-all">
                <mat-icon class="text-base">sync</mat-icon>
                <span>Ejecutar Transferencia</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 5: NUEVA CUENTA BANCARIA / CAJA -->
    <!-- ========================================================================= -->
    @if (showNewAccountModal()) {
      <div id="modal-new-bank-account" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900 flex items-center space-x-2">
                <mat-icon class="text-sky-600">add_business</mat-icon>
                <span>Registrar Nueva Cuenta Bancaria / Caja</span>
              </h3>
              <p class="text-xs text-slate-500">Configuración de cuenta receptora/pagadora con saldo inicial</p>
            </div>
            <button id="btn-close-new-account" (click)="closeNewAccountModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="newAccountForm" (ngSubmit)="submitNewAccount()" class="space-y-4 text-xs">
            <div>
              <label for="acc-name" class="block font-semibold text-slate-700 mb-1">Nombre Descriptivo de la Cuenta *</label>
              <input 
                id="acc-name"
                formControlName="accountName" 
                type="text" 
                placeholder="Ej. Banco Nacional de Crédito - Cta Principal"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="acc-bank-name" class="block font-semibold text-slate-700 mb-1">Institución / Banco *</label>
                <input 
                  id="acc-bank-name"
                  formControlName="bankName" 
                  type="text" 
                  placeholder="Ej. BNC, Banesco, Chase..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label for="acc-number" class="block font-semibold text-slate-700 mb-1">Número de Cuenta / IBAN / Email *</label>
                <input 
                  id="acc-number"
                  formControlName="accountNumber" 
                  type="text" 
                  placeholder="0102-0000-00-0000000000"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="acc-type" class="block font-semibold text-slate-700 mb-1">Tipo de Cuenta *</label>
                <select 
                  id="acc-type"
                  formControlName="accountType" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="CORRIENTE_VES">Cuenta Corriente (VES)</option>
                  <option value="CUSTODIA_USD">Cuenta Custodia / Divisa Nacional (USD)</option>
                  <option value="EXTRANJERA_USD">Cuenta Internacional / Extranjera (USD)</option>
                  <option value="BILLETERA_DIGITAL">Billetera Digital (Zelle / PayPal)</option>
                  <option value="CAJA_EFECTIVO_USD">Caja Bóveda Efectivo (USD)</option>
                  <option value="CAJA_EFECTIVO_VES">Caja Menor Efectivo (VES)</option>
                </select>
              </div>

              <div>
                <label for="acc-currency" class="block font-semibold text-slate-700 mb-1">Moneda Principal *</label>
                <select 
                  id="acc-currency"
                  formControlName="currency" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold">
                  <option value="VES">Bolívares (VES)</option>
                  <option value="USD">Dólares (USD)</option>
                  <option value="EUR">Euros (EUR)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="acc-balance" class="block font-semibold text-slate-700 mb-1">Saldo Inicial *</label>
                <input 
                  id="acc-balance"
                  formControlName="balance" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-900" />
              </div>

              <div>
                <label for="acc-gl-code" class="block font-semibold text-slate-700 mb-1">Cuenta Contable Asociada *</label>
                <select 
                  id="acc-gl-code"
                  formControlName="glAccountCode" 
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono">
                  <option value="1.1.01.02">1.1.01.02 - Bancos e Instituciones Financieras</option>
                  <option value="1.1.01.01">1.1.01.01 - Caja Principal y Bóveda</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="acc-holder-name" class="block font-semibold text-slate-700 mb-1">Titular de la Cuenta</label>
                <input 
                  id="acc-holder-name"
                  formControlName="holderName" 
                  type="text" 
                  placeholder="Corporación Industrial 4-InLine C.A."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>

              <div>
                <label for="acc-holder-tax-id" class="block font-semibold text-slate-700 mb-1">RIF / Documento Titular</label>
                <input 
                  id="acc-holder-tax-id"
                  formControlName="holderTaxId" 
                  type="text" 
                  placeholder="J-50493821-4"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>

            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                id="btn-cancel-new-account"
                type="button" 
                (click)="closeNewAccountModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors">
                Cancelar
              </button>
              <button 
                id="btn-submit-new-account"
                type="submit" 
                [disabled]="newAccountForm.invalid"
                class="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5 transition-all">
                <mat-icon class="text-base">save</mat-icon>
                <span>Crear Cuenta</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 6: DETALLE DE FACTURA DE VENTA / CXC (ESTILO ODOO ERP) -->
    <!-- ========================================================================= -->
    @if (showCxcDetailModal()) {
      <div id="modal-cxc-detail" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
          
          <!-- Encabezado de Documento Odoo -->
          <div class="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <mat-icon>receipt_long</mat-icon>
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Facturación / Ventas</span>
                  <span class="text-slate-300">•</span>
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">PUBLICADA</span>
                  <span 
                    class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                    [class]="selectedCxcItem()?.status === 'COBRADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (selectedCxcItem()?.status === 'VENCIDO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')">
                    {{ selectedCxcItem()?.status }}
                  </span>
                </div>
                <h3 class="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <span>Factura de Cliente:</span>
                  <span class="font-mono text-emerald-700">{{ selectedCxcDetailInvoice()?.invoiceNumber || selectedCxcItem()?.invoiceNumber }}</span>
                </h3>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button 
                id="btn-print-cxc-detail"
                (click)="printDocument()" 
                class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all">
                <mat-icon class="text-sm">print</mat-icon>
                <span>Imprimir / PDF</span>
              </button>
              <button 
                id="btn-close-cxc-detail" 
                (click)="closeCxcDetailModal()" 
                class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Barra de Acciones y Pestañas Estilo Odoo -->
          <div class="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-2">
              @if ((selectedCxcItem()?.balanceUsd || 0) > 0.01) {
                <button 
                  id="btn-collect-from-detail-modal"
                  (click)="openCollectionFromDetail()" 
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1.5 transition-all">
                  <mat-icon class="text-sm">payments</mat-icon>
                  <span>Registrar Cobro</span>
                </button>
              }
              <span class="text-xs text-slate-500 font-medium">Tasa Oficial BCV: <strong class="text-sky-700 font-mono">Bs. {{ (selectedCxcDetailInvoice()?.bcvRate || stateService.bcvState().usdRate).toFixed(2) }} / USD</strong></span>
            </div>

            <!-- Navegación de Sub-Pestañas del Documento -->
            <div class="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button 
                id="tab-cxc-lines"
                (click)="cxcDetailTab.set('lines')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
                [class]="cxcDetailTab() === 'lines' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                Líneas de Factura
              </button>
              <button 
                id="tab-cxc-payments"
                (click)="cxcDetailTab.set('payments')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1"
                [class]="cxcDetailTab() === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                <span>Cobros & Pagos</span>
                <span class="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">{{ getCxcTransactions(selectedCxcItem()?.invoiceNumber || '').length }}</span>
              </button>
              <button 
                id="tab-cxc-accounting"
                (click)="cxcDetailTab.set('accounting')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
                [class]="cxcDetailTab() === 'accounting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                Asiento Contable NIIF
              </button>
            </div>
          </div>

          <!-- Cuerpo Principal Scrolleable -->
          <div class="p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
            
            <!-- Ficha de Encabezado Comercial / Fiscal -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70 text-xs">
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cliente / Razón Social</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">{{ selectedCxcDetailInvoice()?.customerName || selectedCxcItem()?.customerName }}</p>
                <p class="text-slate-500 font-mono mt-0.5">RIF: {{ selectedCxcDetailInvoice()?.customerTaxId || selectedCxcItem()?.customerTaxId }}</p>
                <p class="text-slate-500 mt-0.5">Dirección fiscal registrada en expediente</p>
              </div>

              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fechas de Gestión</p>
                <div class="mt-1 space-y-1">
                  <p class="text-slate-700"><span class="text-slate-400">Emisión:</span> <strong class="font-mono">{{ (selectedCxcDetailInvoice()?.date || selectedCxcItem()?.date || '').substring(0, 10) }}</strong></p>
                  <p [class]="selectedCxcItem()?.status === 'VENCIDO' ? 'text-rose-600 font-bold' : 'text-slate-700'">
                    <span class="text-slate-400">Vencimiento:</span> <strong class="font-mono">{{ selectedCxcItem()?.dueDate }}</strong>
                  </p>
                  <p class="text-slate-700"><span class="text-slate-400">Vendedor:</span> {{ selectedCxcDetailInvoice()?.sellerName || 'Ventas General' }}</p>
                </div>
              </div>

              <div class="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <p class="text-[10px] uppercase font-bold text-slate-400">Estado de Saldo CxC</p>
                  <div class="flex items-baseline space-x-2 mt-1">
                    <span class="text-lg font-black" [class]="(selectedCxcItem()?.balanceUsd || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'">
                      \${{ (selectedCxcItem()?.balanceUsd || 0).toFixed(2) }}
                    </span>
                    <span class="text-[10px] text-slate-400">saldo pendiente</span>
                  </div>
                  <p class="text-[11px] text-slate-500 font-mono">Bs. {{ (selectedCxcItem()?.balanceVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
                </div>
                <div class="mt-2 pt-2 border-t border-slate-100 text-[10px] flex justify-between text-slate-500">
                  <span>Facturado: <strong>\${{ (selectedCxcItem()?.totalUsd || 0).toFixed(2) }}</strong></span>
                  <span>Cobrado: <strong class="text-emerald-600">\${{ (selectedCxcItem()?.paidUsd || 0).toFixed(2) }}</strong></span>
                </div>
              </div>
            </div>

            <!-- CONTENIDO PESTAÑA 1: LÍNEAS DE FACTURA -->
            @if (cxcDetailTab() === 'lines') {
              <div class="space-y-4">
                <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th class="py-2.5 px-3">Ítem / Producto</th>
                        <th class="py-2.5 px-3">SKU</th>
                        <th class="py-2.5 px-3 text-right">Cantidad</th>
                        <th class="py-2.5 px-3 text-right">Precio Unit. ($)</th>
                        <th class="py-2.5 px-3 text-right">Desc %</th>
                        <th class="py-2.5 px-3 text-right">IVA %</th>
                        <th class="py-2.5 px-3 text-right">Subtotal ($)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                      @for (item of getInvoiceItems(selectedCxcDetailInvoice(), selectedCxcItem()); track item.id) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-3 font-semibold text-slate-900">{{ item.productName }}</td>
                          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">{{ item.sku }}</td>
                          <td class="py-2.5 px-3 text-right font-mono">{{ item.quantity }}</td>
                          <td class="py-2.5 px-3 text-right font-mono">\${{ item.unitPrice.toFixed(2) }}</td>
                          <td class="py-2.5 px-3 text-right text-slate-400 font-mono">{{ item.discountPercent || 0 }}%</td>
                          <td class="py-2.5 px-3 text-right text-slate-500 font-mono">{{ item.taxRate ? (item.taxRate * 100).toFixed(0) : '16' }}%</td>
                          <td class="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">\${{ item.total.toFixed(2) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Resumen de Impuestos y Totales -->
                <div class="flex justify-end">
                  <div class="w-full sm:w-80 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div class="flex justify-between text-slate-600">
                      <span>Base Gravada (16%):</span>
                      <span class="font-mono font-semibold">\${{ (selectedCxcDetailInvoice()?.taxDetails?.taxableBase || (selectedCxcItem()?.totalUsd || 0) / 1.16).toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-slate-600">
                      <span>Débito Fiscal IVA (16%):</span>
                      <span class="font-mono font-semibold">\${{ (selectedCxcDetailInvoice()?.taxDetails?.ivaAmount || (selectedCxcItem()?.totalUsd || 0) - ((selectedCxcItem()?.totalUsd || 0) / 1.16)).toFixed(2) }}</span>
                    </div>
                    @if (selectedCxcDetailInvoice()?.taxDetails?.igtfAmount) {
                      <div class="flex justify-between text-slate-600">
                        <span>IGTF (3% Divisas):</span>
                        <span class="font-mono font-semibold">\${{ selectedCxcDetailInvoice()?.taxDetails?.igtfAmount?.toFixed(2) }}</span>
                      </div>
                    }
                    <div class="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900 text-sm">
                      <span>Total Facturado:</span>
                      <div class="text-right">
                        <span class="font-mono text-base text-emerald-700">\${{ (selectedCxcDetailInvoice()?.total || selectedCxcItem()?.totalUsd || 0).toFixed(2) }}</span>
                        <span class="block text-[10px] text-slate-400 font-normal">Bs. {{ (selectedCxcDetailInvoice()?.totalVes || selectedCxcItem()?.totalVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- CONTENIDO PESTAÑA 2: HISTORIAL DE PAGOS Y COBROS (WIDGET DE PAGOS) -->
            @if (cxcDetailTab() === 'payments') {
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Comprobantes de Pago y Recaudación Vinculados</h4>
                  <span class="text-xs text-slate-500 font-medium">Conciliación en tiempo real</span>
                </div>

                <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th class="py-2.5 px-3">Fecha</th>
                        <th class="py-2.5 px-3">Nº Operación / Recibo</th>
                        <th class="py-2.5 px-3">Método de Pago</th>
                        <th class="py-2.5 px-3">Cuenta Bancaria Receptora</th>
                        <th class="py-2.5 px-3">Nº Referencia</th>
                        <th class="py-2.5 px-3 text-right">Monto USD</th>
                        <th class="py-2.5 px-3 text-right">Monto VES</th>
                        <th class="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                      @for (tx of getCxcTransactions(selectedCxcItem()?.invoiceNumber || ''); track tx.id) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">{{ tx.date.substring(0, 16) }}</td>
                          <td class="py-2.5 px-3 font-mono font-bold text-slate-900">{{ tx.transactionNumber }}</td>
                          <td class="py-2.5 px-3">{{ tx.paymentMethod }}</td>
                          <td class="py-2.5 px-3 text-slate-600">{{ tx.bankAccountName }}</td>
                          <td class="py-2.5 px-3 font-mono text-[11px]">{{ tx.referenceNumber || 'N/A' }}</td>
                          <td class="py-2.5 px-3 text-right font-bold text-emerald-600 font-mono">\${{ tx.amountUsd.toFixed(2) }}</td>
                          <td class="py-2.5 px-3 text-right font-mono text-slate-500">Bs. {{ tx.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</td>
                          <td class="py-2.5 px-3 text-center">
                            <span class="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                              {{ tx.status }}
                            </span>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="8" class="py-8 text-center text-slate-400 text-xs font-medium">
                            <mat-icon class="text-2xl text-slate-300 block mb-1">hourglass_empty</mat-icon>
                            No se registran recaudaciones o abonos para esta factura aún.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2">
                    <mat-icon class="text-emerald-600">verified</mat-icon>
                    <span class="font-medium text-emerald-900">Total Recaudado: <strong class="font-mono">\${{ (selectedCxcItem()?.paidUsd || 0).toFixed(2) }}</strong> (Bs. {{ (selectedCxcItem()?.paidVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }})</span>
                  </div>
                  <div class="font-bold text-slate-700">
                    Remanente pendiente: <span class="font-mono text-amber-700">\${{ (selectedCxcItem()?.balanceUsd || 0).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- CONTENIDO PESTAÑA 3: ASIENTO CONTABLE NIIF -->
            @if (cxcDetailTab() === 'accounting') {
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Partidas del Libro Diario (Asiento Contable)</h4>
                    <p class="text-[11px] text-slate-500">Imputación automática bajo principios NIIF / VEN-NIF</p>
                  </div>
                </div>

                <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th class="py-2.5 px-3">Código</th>
                        <th class="py-2.5 px-3">Cuenta Contable</th>
                        <th class="py-2.5 px-3">Concepto / Glosa</th>
                        <th class="py-2.5 px-3 text-right">Debe ($)</th>
                        <th class="py-2.5 px-3 text-right">Haber ($)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                      @for (line of getCxcJournalLines(selectedCxcItem()); track line.accountId + line.accountCode) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-3 font-mono text-[11px] text-sky-700 font-bold">{{ line.accountCode }}</td>
                          <td class="py-2.5 px-3 font-semibold text-slate-900">{{ line.accountName }}</td>
                          <td class="py-2.5 px-3 text-slate-500">{{ line.description }}</td>
                          <td class="py-2.5 px-3 text-right font-mono font-bold" [class]="line.debit > 0 ? 'text-slate-900' : 'text-slate-300'">
                            \${{ line.debit.toFixed(2) }}
                          </td>
                          <td class="py-2.5 px-3 text-right font-mono font-bold" [class]="line.credit > 0 ? 'text-slate-900' : 'text-slate-300'">
                            \${{ line.credit.toFixed(2) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

          </div>

          <!-- Pie del Modal Odoo -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div class="text-xs text-slate-500">
              Documento Fiscal Oficial • Registrado en Tesorería
            </div>
            <button 
              id="btn-close-cxc-detail-footer"
              (click)="closeCxcDetailModal()" 
              class="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    }

    <!-- ========================================================================= -->
    <!-- MODAL 7: DETALLE DE FACTURA DE COMPRA / CXP (ESTILO ODOO ERP) -->
    <!-- ========================================================================= -->
    @if (showCxpDetailModal()) {
      <div id="modal-cxp-detail" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
          
          <!-- Encabezado de Documento Odoo -->
          <div class="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <mat-icon>receipt</mat-icon>
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Facturación / Proveedores</span>
                  <span class="text-slate-300">•</span>
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">FACTURA PROVEEDOR</span>
                  <span 
                    class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                    [class]="selectedCxpBill()?.status === 'PAGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (selectedCxpBill()?.status === 'VENCIDO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')">
                    {{ selectedCxpBill()?.status }}
                  </span>
                </div>
                <h3 class="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <span>Factura de Proveedor:</span>
                  <span class="font-mono text-amber-700">{{ selectedCxpBill()?.billNumber }}</span>
                </h3>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <button 
                id="btn-print-cxp-detail"
                (click)="printDocument()" 
                class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all">
                <mat-icon class="text-sm">print</mat-icon>
                <span>Imprimir / PDF</span>
              </button>
              <button 
                id="btn-close-cxp-detail" 
                (click)="closeCxpDetailModal()" 
                class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Barra de Acciones y Pestañas Estilo Odoo -->
          <div class="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-2">
              @if ((selectedCxpBill()?.balanceUsd || 0) > 0.01) {
                <button 
                  id="btn-pay-from-detail-modal"
                  (click)="openPaymentFromDetail()" 
                  class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1.5 transition-all">
                  <mat-icon class="text-sm">payment</mat-icon>
                  <span>Registrar Pago a Proveedor</span>
                </button>
              }
              <span class="text-xs text-slate-500 font-medium">Tasa Oficial BCV: <strong class="text-sky-700 font-mono">Bs. {{ stateService.bcvState().usdRate.toFixed(2) }} / USD</strong></span>
            </div>

            <!-- Navegación de Sub-Pestañas del Documento -->
            <div class="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button 
                id="tab-cxp-lines"
                (click)="cxpDetailTab.set('lines')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
                [class]="cxpDetailTab() === 'lines' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                Detalle de Obligación
              </button>
              <button 
                id="tab-cxp-payments"
                (click)="cxpDetailTab.set('payments')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1"
                [class]="cxpDetailTab() === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                <span>Pagos Realizados</span>
                <span class="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">{{ getCxpTransactions(selectedCxpBill()?.billNumber || '').length }}</span>
              </button>
              <button 
                id="tab-cxp-accounting"
                (click)="cxpDetailTab.set('accounting')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition-all"
                [class]="cxpDetailTab() === 'accounting' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'">
                Asiento Contable NIIF
              </button>
            </div>
          </div>

          <!-- Cuerpo Principal Scrolleable -->
          <div class="p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
            
            <!-- Ficha de Encabezado Comercial / Fiscal -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70 text-xs">
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proveedor / Acreedor</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">{{ selectedCxpBill()?.supplierName }}</p>
                <p class="text-slate-500 font-mono mt-0.5">RIF: {{ selectedCxpBill()?.supplierTaxId }}</p>
                <p class="text-slate-500 mt-0.5">Categoría: <span class="font-semibold text-slate-700">{{ selectedCxpBill()?.category }}</span></p>
              </div>

              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fechas & Referencia</p>
                <div class="mt-1 space-y-1">
                  <p class="text-slate-700"><span class="text-slate-400">Emisión Factura:</span> <strong class="font-mono">{{ selectedCxpBill()?.issueDate }}</strong></p>
                  <p [class]="selectedCxpBill()?.status === 'VENCIDO' ? 'text-rose-600 font-bold' : 'text-slate-700'">
                    <span class="text-slate-400">Vencimiento:</span> <strong class="font-mono">{{ selectedCxpBill()?.dueDate }}</strong>
                  </p>
                  <p class="text-slate-700"><span class="text-slate-400">Orden de Compra:</span> <strong class="font-mono text-sky-700">{{ selectedCxpBill()?.purchaseOrderNumber || 'Compra Directa / Servicios' }}</strong></p>
                </div>
              </div>

              <div class="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <p class="text-[10px] uppercase font-bold text-slate-400">Estado de Saldo CxP</p>
                  <div class="flex items-baseline space-x-2 mt-1">
                    <span class="text-lg font-black" [class]="(selectedCxpBill()?.balanceUsd || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'">
                      \${{ (selectedCxpBill()?.balanceUsd || 0).toFixed(2) }}
                    </span>
                    <span class="text-[10px] text-slate-400">por liquidar</span>
                  </div>
                  <p class="text-[11px] text-slate-500 font-mono">Bs. {{ (selectedCxpBill()?.balanceVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
                </div>
                <div class="mt-2 pt-2 border-t border-slate-100 text-[10px] flex justify-between text-slate-500">
                  <span>Facturado: <strong>\${{ (selectedCxpBill()?.totalAmountUsd || 0).toFixed(2) }}</strong></span>
                  <span>Pagado: <strong class="text-emerald-600">\${{ (selectedCxpBill()?.paidAmountUsd || 0).toFixed(2) }}</strong></span>
                </div>
              </div>
            </div>

            <!-- CONTENIDO PESTAÑA 1: DETALLE DE OBLIGACIÓN / RENGLONES -->
            @if (cxpDetailTab() === 'lines') {
              <div class="space-y-4">
                @if (selectedCxpPurchaseOrder() && selectedCxpPurchaseOrder()?.items && (selectedCxpPurchaseOrder()?.items?.length || 0) > 0) {
                  <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th class="py-2.5 px-3">Ítem / Insumo</th>
                          <th class="py-2.5 px-3">SKU</th>
                          <th class="py-2.5 px-3 text-right">Cantidad</th>
                          <th class="py-2.5 px-3 text-right">Costo Unit. ($)</th>
                          <th class="py-2.5 px-3 text-right">IVA %</th>
                          <th class="py-2.5 px-3 text-right">Total ($)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                        @for (it of selectedCxpPurchaseOrder()?.items || []; track it.productId) {
                          <tr class="hover:bg-slate-50/60">
                            <td class="py-2.5 px-3 font-semibold text-slate-900">{{ it.productName }}</td>
                            <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">{{ it.sku }}</td>
                            <td class="py-2.5 px-3 text-right font-mono">{{ it.quantity }}</td>
                            <td class="py-2.5 px-3 text-right font-mono">\${{ it.unitCost.toFixed(2) }}</td>
                            <td class="py-2.5 px-3 text-right text-slate-500 font-mono">{{ it.taxRate ? (it.taxRate * 100).toFixed(0) : '16' }}%</td>
                            <td class="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">\${{ (it.quantity * it.unitCost).toFixed(2) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <h4 class="font-bold text-slate-900">Concepto de Gasto o Servicio de Proveedor</h4>
                    <p class="text-slate-600">{{ selectedCxpBill()?.notes || 'Factura comercial registrada para imputación directa a costo o gasto operativo.' }}</p>
                    <div class="grid grid-cols-2 gap-3 pt-2">
                      <div class="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span class="text-[10px] uppercase font-bold text-slate-400">Cuenta de Gasto/Inventario</span>
                        <p class="font-mono text-sky-700 font-semibold mt-0.5">1.1.03.01 / 6.1.01.01</p>
                        <p class="text-[11px] text-slate-500">Costo de Insumos / Gastos Operativos</p>
                      </div>
                      <div class="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span class="text-[10px] uppercase font-bold text-slate-400">Cuenta Pasivo CxP</span>
                        <p class="font-mono text-amber-700 font-semibold mt-0.5">2.1.01.01</p>
                        <p class="text-[11px] text-slate-500">Cuentas por Pagar Comerciales</p>
                      </div>
                    </div>
                  </div>
                }

                <!-- Totales de la Factura de Compra -->
                <div class="flex justify-end">
                  <div class="w-full sm:w-80 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div class="flex justify-between text-slate-600">
                      <span>Total Factura Proveedor (USD):</span>
                      <span class="font-mono font-bold text-slate-900 text-sm">\${{ (selectedCxpBill()?.totalAmountUsd || 0).toFixed(2) }}</span>
                    </div>
                    <div class="flex justify-between text-slate-600">
                      <span>Equivalente Oficial (VES):</span>
                      <span class="font-mono font-semibold text-slate-700">Bs. {{ (selectedCxpBill()?.totalAmountVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</span>
                    </div>
                    <div class="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                      <span>Saldo Pendiente:</span>
                      <span class="font-mono text-amber-700 text-base">\${{ (selectedCxpBill()?.balanceUsd || 0).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- CONTENIDO PESTAÑA 2: HISTORIAL DE PAGOS A PROVEEDOR (ODOO VENDOR PAYMENTS) -->
            @if (cxpDetailTab() === 'payments') {
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Órdenes de Pago y Egresos Emitidos</h4>
                  <span class="text-xs text-slate-500 font-medium">Historial de Tesorería</span>
                </div>

                <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th class="py-2.5 px-3">Fecha</th>
                        <th class="py-2.5 px-3">Nº Operación / OP</th>
                        <th class="py-2.5 px-3">Método de Pago</th>
                        <th class="py-2.5 px-3">Cuenta Bancaria Emisora</th>
                        <th class="py-2.5 px-3">Nº Referencia</th>
                        <th class="py-2.5 px-3 text-right">Monto USD</th>
                        <th class="py-2.5 px-3 text-right">Monto VES</th>
                        <th class="py-2.5 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                      @for (tx of getCxpTransactions(selectedCxpBill()?.billNumber || ''); track tx.id) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">{{ tx.date.substring(0, 16) }}</td>
                          <td class="py-2.5 px-3 font-mono font-bold text-slate-900">{{ tx.transactionNumber }}</td>
                          <td class="py-2.5 px-3">{{ tx.paymentMethod }}</td>
                          <td class="py-2.5 px-3 text-slate-600">{{ tx.bankAccountName }}</td>
                          <td class="py-2.5 px-3 font-mono text-[11px]">{{ tx.referenceNumber || 'N/A' }}</td>
                          <td class="py-2.5 px-3 text-right font-bold text-amber-600 font-mono">\${{ tx.amountUsd.toFixed(2) }}</td>
                          <td class="py-2.5 px-3 text-right font-mono text-slate-500">Bs. {{ tx.amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</td>
                          <td class="py-2.5 px-3 text-center">
                            <span class="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800">
                              {{ tx.status }}
                            </span>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="8" class="py-8 text-center text-slate-400 text-xs font-medium">
                            <mat-icon class="text-2xl text-slate-300 block mb-1">hourglass_empty</mat-icon>
                            No se han emitido pagos ni transferencias para esta obligación aún.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between text-xs">
                  <div class="flex items-center space-x-2">
                    <mat-icon class="text-amber-600">verified</mat-icon>
                    <span class="font-medium text-amber-900">Total Liquidado: <strong class="font-mono">\${{ (selectedCxpBill()?.paidAmountUsd || 0).toFixed(2) }}</strong> (Bs. {{ (selectedCxpBill()?.paidAmountVes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }})</span>
                  </div>
                  <div class="font-bold text-slate-700">
                    Saldo Restante Adeudado: <span class="font-mono text-rose-700">\${{ (selectedCxpBill()?.balanceUsd || 0).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- CONTENIDO PESTAÑA 3: ASIENTO CONTABLE NIIF -->
            @if (cxpDetailTab() === 'accounting') {
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Partidas del Libro Diario (Asiento Contable)</h4>
                    <p class="text-[11px] text-slate-500">Provisión y Liquidación de Pasivo Comercial</p>
                  </div>
                </div>

                <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th class="py-2.5 px-3">Código</th>
                        <th class="py-2.5 px-3">Cuenta Contable</th>
                        <th class="py-2.5 px-3">Concepto / Glosa</th>
                        <th class="py-2.5 px-3 text-right">Debe ($)</th>
                        <th class="py-2.5 px-3 text-right">Haber ($)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                      @for (line of getCxpJournalLines(selectedCxpBill()); track line.accountId + line.accountCode) {
                        <tr class="hover:bg-slate-50/60">
                          <td class="py-2.5 px-3 font-mono text-[11px] text-sky-700 font-bold">{{ line.accountCode }}</td>
                          <td class="py-2.5 px-3 font-semibold text-slate-900">{{ line.accountName }}</td>
                          <td class="py-2.5 px-3 text-slate-500">{{ line.description }}</td>
                          <td class="py-2.5 px-3 text-right font-mono font-bold" [class]="line.debit > 0 ? 'text-slate-900' : 'text-slate-300'">
                            \${{ line.debit.toFixed(2) }}
                          </td>
                          <td class="py-2.5 px-3 text-right font-mono font-bold" [class]="line.credit > 0 ? 'text-slate-900' : 'text-slate-300'">
                            \${{ line.credit.toFixed(2) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

          </div>

          <!-- Pie del Modal Odoo -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div class="text-xs text-slate-500">
              Obligación Comercial de Proveedor • Control de Pagos y Auditoría
            </div>
            <button 
              id="btn-close-cxp-detail-footer"
              (click)="closeCxpDetailModal()" 
              class="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    }

  `
})
export class TreasuryComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  fb = inject(FormBuilder);

  activeSubTab = signal<TreasurySubTab>('overview');

  // Filtros
  cxcFilter = signal<'ALL' | 'PENDING' | 'OVERDUE'>('ALL');
  cxcSearch = signal<string>('');

  cxpFilter = signal<'ALL' | 'PENDING' | 'OVERDUE'>('ALL');
  cxpSearch = signal<string>('');

  // Modales
  showCollectionModal = signal<boolean>(false);
  selectedCxc = signal<CustomerReceivableItem | null>(null);

  showPaymentModal = signal<boolean>(false);
  selectedBill = signal<PayableBill | null>(null);

  showNewBillModal = signal<boolean>(false);
  showTransferModal = signal<boolean>(false);
  showNewAccountModal = signal<boolean>(false);

  // Modales de Detalle (Estilo Odoo ERP)
  showCxcDetailModal = signal<boolean>(false);
  selectedCxcItem = signal<CustomerReceivableItem | null>(null);
  selectedCxcDetailInvoice = signal<Invoice | null>(null);
  cxcDetailTab = signal<'lines' | 'payments' | 'accounting'>('lines');

  showCxpDetailModal = signal<boolean>(false);
  selectedCxpBill = signal<PayableBill | null>(null);
  selectedCxpPurchaseOrder = signal<PurchaseOrder | null>(null);
  cxpDetailTab = signal<'lines' | 'payments' | 'accounting'>('lines');

  // Formularios Reactivos
  collectionForm = this.fb.group({
    amountUsd: [0, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['TRANSFERENCIA' as PaymentMethod, Validators.required],
    bankAccountId: ['', Validators.required],
    referenceNumber: ['', [Validators.required, Validators.minLength(3)]],
    notes: ['']
  });

  paymentForm = this.fb.group({
    amountUsd: [0, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['TRANSFERENCIA' as PaymentMethod, Validators.required],
    bankAccountId: ['', Validators.required],
    referenceNumber: ['', [Validators.required, Validators.minLength(3)]],
    notes: ['']
  });

  newBillForm = this.fb.group({
    billNumber: ['', [Validators.required, Validators.minLength(3)]],
    supplierId: ['', Validators.required],
    issueDate: [new Date().toISOString().substring(0, 10), Validators.required],
    dueDate: [new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10), Validators.required],
    totalAmountUsd: [0, [Validators.required, Validators.min(0.01)]],
    category: ['Mercancía e Insumos'],
    notes: ['']
  });

  transferForm = this.fb.group({
    sourceBankAccountId: ['', Validators.required],
    destinationBankAccountId: ['', Validators.required],
    amountUsd: [0, [Validators.required, Validators.min(0.01)]],
    referenceNumber: ['', [Validators.required, Validators.minLength(3)]],
    notes: ['']
  });

  newAccountForm = this.fb.group({
    accountName: ['', [Validators.required, Validators.minLength(4)]],
    bankName: ['', Validators.required],
    accountNumber: ['', [Validators.required, Validators.minLength(4)]],
    accountType: ['CORRIENTE_VES' as BankAccountType, Validators.required],
    currency: ['VES' as 'USD' | 'VES' | 'EUR', Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
    glAccountCode: ['1.1.01.02', Validators.required],
    holderName: ['Corporación Industrial 4-InLine C.A.'],
    holderTaxId: ['J-50493821-4'],
    isDefault: [false]
  });

  // Computed Lists
  readonly pendingPayableBills = computed(() => {
    return this.stateService.payableBills().filter(b => b.status !== 'PAGADO' && b.status !== 'ANULADO');
  });

  readonly pendingPayableBillsCount = computed(() => {
    return this.pendingPayableBills().length;
  });

  readonly filteredCxcList = computed(() => {
    const list = this.stateService.customerReceivables();
    const filter = this.cxcFilter();
    const query = this.cxcSearch().toLowerCase().trim();

    return list.filter(item => {
      if (filter === 'PENDING' && item.balanceUsd <= 0.01) return false;
      if (filter === 'OVERDUE' && item.status !== 'VENCIDO') return false;
      if (query) {
        const matchesInv = item.invoiceNumber.toLowerCase().includes(query);
        const matchesCust = item.customerName.toLowerCase().includes(query);
        const matchesTax = item.customerTaxId.toLowerCase().includes(query);
        return matchesInv || matchesCust || matchesTax;
      }
      return true;
    });
  });

  readonly filteredCxpList = computed(() => {
    const list = this.stateService.payableBills();
    const filter = this.cxpFilter();
    const query = this.cxpSearch().toLowerCase().trim();

    return list.filter(item => {
      if (filter === 'PENDING' && item.status === 'PAGADO') return false;
      if (filter === 'OVERDUE' && item.status !== 'VENCIDO') return false;
      if (query) {
        const matchesBill = item.billNumber.toLowerCase().includes(query);
        const matchesSup = item.supplierName.toLowerCase().includes(query);
        const matchesTax = item.supplierTaxId.toLowerCase().includes(query);
        return matchesBill || matchesSup || matchesTax;
      }
      return true;
    });
  });

  handleCxcSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.cxcSearch.set(target.value);
  }

  handleCxpSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.cxpSearch.set(target.value);
  }

  // Collection Modal Handlers
  openCollectionModal(cxc: CustomerReceivableItem) {
    this.selectedCxc.set(cxc);
    const defaultBank = this.stateService.bankAccounts().find(b => b.isDefault) || this.stateService.bankAccounts()[0];
    this.collectionForm.patchValue({
      amountUsd: cxc.balanceUsd,
      bankAccountId: defaultBank ? defaultBank.id : '',
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: '',
      notes: `Cobro de Factura ${cxc.invoiceNumber}`
    });
    this.showCollectionModal.set(true);
  }

  closeCollectionModal() {
    this.showCollectionModal.set(false);
    this.selectedCxc.set(null);
  }

  submitCollection() {
    if (this.collectionForm.invalid || !this.selectedCxc()) return;
    const val = this.collectionForm.value;
    const res = this.stateService.recordCxcCollection({
      invoiceId: this.selectedCxc()!.invoiceId,
      amountUsd: Number(val.amountUsd),
      paymentMethod: val.paymentMethod as PaymentMethod,
      bankAccountId: val.bankAccountId!,
      referenceNumber: val.referenceNumber!,
      notes: val.notes || undefined
    });

    if (res.success) {
      this.closeCollectionModal();
    }
  }

  // Payment Modal Handlers
  openPaymentModal(bill: PayableBill) {
    this.selectedBill.set(bill);
    const defaultBank = this.stateService.bankAccounts().find(b => b.isDefault) || this.stateService.bankAccounts()[0];
    this.paymentForm.patchValue({
      amountUsd: bill.balanceUsd,
      bankAccountId: defaultBank ? defaultBank.id : '',
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: '',
      notes: `Pago a Factura Proveedor ${bill.billNumber}`
    });
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedBill.set(null);
  }

  submitPayment() {
    if (this.paymentForm.invalid || !this.selectedBill()) return;
    const val = this.paymentForm.value;
    const res = this.stateService.recordCxpPayment({
      payableBillId: this.selectedBill()!.id,
      amountUsd: Number(val.amountUsd),
      paymentMethod: val.paymentMethod as PaymentMethod,
      bankAccountId: val.bankAccountId!,
      referenceNumber: val.referenceNumber!,
      notes: val.notes || undefined
    });

    if (res.success) {
      this.closePaymentModal();
    }
  }

  // New Bill Handlers
  openNewBillModal() {
    this.newBillForm.reset({
      billNumber: 'FP-2026-' + (this.stateService.payableBills().length + 1).toString().padStart(4, '0'),
      supplierId: this.stateService.suppliers()[0]?.id || '',
      issueDate: new Date().toISOString().substring(0, 10),
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().substring(0, 10),
      totalAmountUsd: 0,
      category: 'Mercancía e Insumos',
      notes: ''
    });
    this.showNewBillModal.set(true);
  }

  closeNewBillModal() {
    this.showNewBillModal.set(false);
  }

  submitNewBill() {
    if (this.newBillForm.invalid) return;
    const val = this.newBillForm.value;
    const res = this.stateService.createPayableBill({
      billNumber: val.billNumber!,
      supplierId: val.supplierId!,
      issueDate: val.issueDate!,
      dueDate: val.dueDate!,
      totalAmountUsd: Number(val.totalAmountUsd),
      category: val.category || 'Mercancía e Insumos',
      notes: val.notes || undefined
    });

    if (res.success) {
      this.closeNewBillModal();
    }
  }

  // Transfer Handlers
  openTransferModal(sourceBankId?: string) {
    const banks = this.stateService.bankAccounts();
    const sourceId = sourceBankId || (banks[0]?.id || '');
    const destId = banks.find(b => b.id !== sourceId)?.id || '';

    this.transferForm.patchValue({
      sourceBankAccountId: sourceId,
      destinationBankAccountId: destId,
      amountUsd: 0,
      referenceNumber: 'TRF-INT-' + Math.floor(100000 + Math.random() * 900000),
      notes: 'Transferencia interna de tesorería'
    });
    this.showTransferModal.set(true);
  }

  closeTransferModal() {
    this.showTransferModal.set(false);
  }

  submitTransfer() {
    if (this.transferForm.invalid) return;
    const val = this.transferForm.value;
    const res = this.stateService.transferBetweenBankAccounts({
      sourceBankAccountId: val.sourceBankAccountId!,
      destinationBankAccountId: val.destinationBankAccountId!,
      amountUsd: Number(val.amountUsd),
      referenceNumber: val.referenceNumber!,
      notes: val.notes || undefined
    });

    if (res.success) {
      this.closeTransferModal();
    }
  }

  // New Account Handlers
  openNewAccountModal() {
    this.newAccountForm.reset({
      accountName: '',
      bankName: '',
      accountNumber: '',
      accountType: 'CORRIENTE_VES',
      currency: 'VES',
      balance: 0,
      glAccountCode: '1.1.01.02',
      holderName: 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: 'J-50493821-4',
      isDefault: false
    });
    this.showNewAccountModal.set(true);
  }

  closeNewAccountModal() {
    this.showNewAccountModal.set(false);
  }

  submitNewAccount() {
    if (this.newAccountForm.invalid) return;
    const val = this.newAccountForm.value;
    this.stateService.createBankAccount({
      accountName: val.accountName!,
      bankName: val.bankName!,
      accountNumber: val.accountNumber!,
      accountType: val.accountType as BankAccountType,
      currency: val.currency as 'USD' | 'VES' | 'EUR',
      balance: Number(val.balance),
      glAccountCode: val.glAccountCode || '1.1.01.02',
      holderName: val.holderName || 'Corporación Industrial 4-InLine C.A.',
      holderTaxId: val.holderTaxId || 'J-50493821-4',
      status: 'ACTIVE',
      isDefault: Boolean(val.isDefault)
    });

    this.closeNewAccountModal();
  }

  // Métodos de Apertura y Cierre de Detalles CxC
  openCxcDetailModal(cxc: CustomerReceivableItem) {
    this.selectedCxcItem.set(cxc);
    const invoice = this.stateService.invoices().find(i => i.id === cxc.invoiceId || i.invoiceNumber === cxc.invoiceNumber);
    this.selectedCxcDetailInvoice.set(invoice || null);
    this.cxcDetailTab.set('lines');
    this.showCxcDetailModal.set(true);
  }

  closeCxcDetailModal() {
    this.showCxcDetailModal.set(false);
  }

  openCollectionFromDetail() {
    const item = this.selectedCxcItem();
    this.closeCxcDetailModal();
    if (item) {
      this.openCollectionModal(item);
    }
  }

  // Métodos de Apertura y Cierre de Detalles CxP
  openCxpDetailModal(bill: PayableBill) {
    this.selectedCxpBill.set(bill);
    let po: PurchaseOrder | undefined;
    if (bill.purchaseOrderId || bill.purchaseOrderNumber) {
      po = this.stateService.purchaseOrders().find(p => p.id === bill.purchaseOrderId || p.orderNumber === bill.purchaseOrderNumber);
    }
    this.selectedCxpPurchaseOrder.set(po || null);
    this.cxpDetailTab.set('lines');
    this.showCxpDetailModal.set(true);
  }

  closeCxpDetailModal() {
    this.showCxpDetailModal.set(false);
  }

  openPaymentFromDetail() {
    const bill = this.selectedCxpBill();
    this.closeCxpDetailModal();
    if (bill) {
      this.openPaymentModal(bill);
    }
  }

  // Auxiliares de consulta para Modales de Detalle
  getInvoiceItems(inv: Invoice | null, cxc: CustomerReceivableItem | null): DetailItemRow[] {
    if (inv && inv.items && inv.items.length > 0) {
      return inv.items.map((it, idx) => ({
        id: it.productId || `item-${idx}`,
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total || (it.quantity * it.unitPrice),
        taxRate: it.taxRate || 0.16,
        discountPercent: it.discountPercent || 0
      }));
    }
    const total = cxc?.totalUsd || inv?.total || 100;
    const base = Number((total / 1.16).toFixed(2));
    return [
      {
        id: 'item-01',
        productId: 'prod-def',
        productName: 'Facturación de Bienes / Servicios Comerciales',
        sku: 'SRV-001',
        quantity: 1,
        unitPrice: base,
        total: total,
        taxRate: 0.16,
        discountPercent: 0
      }
    ];
  }

  getCxcTransactions(invoiceNumber: string) {
    if (!invoiceNumber) return [];
    return this.stateService.treasuryTransactions().filter(t => 
      t.documentNumber === invoiceNumber || 
      (t.concept && t.concept.includes(invoiceNumber))
    );
  }

  getCxpTransactions(billNumber: string) {
    if (!billNumber) return [];
    return this.stateService.treasuryTransactions().filter(t => 
      t.documentNumber === billNumber || 
      (t.concept && t.concept.includes(billNumber))
    );
  }

  getCxcJournalLines(cxc: CustomerReceivableItem | null) {
    if (!cxc) return [];
    const entry = this.stateService.journalEntries().find(j => 
      j.referenceId === cxc.invoiceNumber || 
      j.referenceId === cxc.invoiceId || 
      (j.concept && j.concept.includes(cxc.invoiceNumber))
    );
    if (entry && entry.lines && entry.lines.length > 0) {
      return entry.lines;
    }
    const total = cxc.totalUsd;
    const base = Number((total / 1.16).toFixed(2));
    const iva = Number((total - base).toFixed(2));
    return [
      {
        accountId: 'acc-cxc',
        accountCode: '1.1.02.01',
        accountName: 'Cuentas por Cobrar Clientes Nacionales',
        description: `Derecho de cobro factura ${cxc.invoiceNumber}`,
        debit: total,
        credit: 0
      },
      {
        accountId: 'acc-ing',
        accountCode: '4.1.01.01',
        accountName: 'Ingresos Operacionales por Ventas',
        description: `Venta según factura ${cxc.invoiceNumber}`,
        debit: 0,
        credit: base
      },
      {
        accountId: 'acc-iva',
        accountCode: '2.1.02.01',
        accountName: 'Débito Fiscal IVA por Pagar (16%)',
        description: `IVA generado en venta ${cxc.invoiceNumber}`,
        debit: 0,
        credit: iva
      }
    ];
  }

  getCxpJournalLines(bill: PayableBill | null) {
    if (!bill) return [];
    const entry = this.stateService.journalEntries().find(j => 
      j.referenceId === bill.billNumber || 
      j.referenceId === bill.id || 
      (j.concept && j.concept.includes(bill.billNumber))
    );
    if (entry && entry.lines && entry.lines.length > 0) {
      return entry.lines;
    }
    const total = bill.totalAmountUsd;
    return [
      {
        accountId: 'acc-gasto',
        accountCode: '1.1.03.01',
        accountName: 'Inventario de Mercancías / Gastos Operativos',
        description: `Provisión de compra según factura proveedor ${bill.billNumber}`,
        debit: total,
        credit: 0
      },
      {
        accountId: 'acc-cxp',
        accountCode: '2.1.01.01',
        accountName: 'Cuentas por Pagar Comerciales a Proveedores',
        description: `Obligación de pago a favor de ${bill.supplierName}`,
        debit: 0,
        credit: total
      }
    ];
  }

  printDocument() {
    window.print();
  }
}
