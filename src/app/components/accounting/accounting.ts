import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { Account, AccountType } from '../../models/erp.models';

@Component({
  selector: 'app-accounting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- TOP HEADER & TITLE -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              FASE 2 • CONTABILIDAD NIIF
            </span>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Contabilidad General, Libro Diario & Balance NIIF
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Partida doble en tiempo real, mayorización automática (Ventas, Compras, Fabricación), catálogo de cuentas e informes financieros.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="openNewManualEntryModal()" 
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">add_circle</mat-icon>
            <span>Nuevo Asiento Manual</span>
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Bento Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Activos -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Activos (1)</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.totalAccountingAssets().toFixed(2) }}</h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Bs. {{ (stateService.totalAccountingAssets() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">account_balance</mat-icon>
          </div>
        </div>

        <!-- Pasivos -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pasivos (2)</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.totalAccountingLiabilities().toFixed(2) }}</h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Obligaciones y deudas</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <mat-icon class="text-xl">receipt_long</mat-icon>
          </div>
        </div>

        <!-- Patrimonio -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Patrimonio Neto (3)</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.totalAccountingEquity().toFixed(2) }}</h3>
            <p class="text-[11px] text-emerald-600 font-medium mt-0.5">Capital y reservas</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <mat-icon class="text-xl">pie_chart</mat-icon>
          </div>
        </div>

        <!-- Utilidad Neta P&L -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Utilidad Neta Período</p>
            <h3 class="text-2xl font-bold mt-1" [class]="stateService.netIncomePeriod() >= 0 ? 'text-emerald-700' : 'text-rose-600'">
              \${{ stateService.netIncomePeriod().toFixed(2) }}
            </h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">Ingresos - Costos - Gastos</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <mat-icon class="text-xl">trending_up</mat-icon>
          </div>
        </div>

      </div>

      <!-- MAIN TABS: Libro Diario, Catálogo de Cuentas, Estado Financiero NIIF -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        <!-- Tab Bar -->
        <div class="flex items-center justify-between px-6 border-b border-slate-100 overflow-x-auto">
          <div class="flex space-x-6">
            <button 
              (click)="activeTab.set('journal')"
              [class]="activeTab() === 'journal' ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">menu_book</mat-icon>
              <span>Libro Diario ({{ stateService.journalEntries().length }} Asientos)</span>
            </button>

            <button 
              (click)="activeTab.set('chart')"
              [class]="activeTab() === 'chart' ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">account_tree</mat-icon>
              <span>Catálogo de Cuentas NIIF ({{ stateService.accounts().length }})</span>
            </button>

            <button 
              (click)="activeTab.set('financials')"
              [class]="activeTab() === 'financials' ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'"
              class="py-4 text-xs tracking-wide transition-all flex items-center space-x-2">
              <mat-icon class="text-base">assessment</mat-icon>
              <span>Balance de Comprobación y P&L</span>
            </button>
          </div>

          <!-- Cuadre Badge -->
          <div class="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <mat-icon class="text-xs">verified</mat-icon>
            <span>Partida Doble Cuadrada (Debe = Haber)</span>
          </div>
        </div>

        <!-- TAB 1: LIBRO DIARIO -->
        @if (activeTab() === 'journal') {
          <div class="p-6 space-y-4">
            
            <!-- Filters -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center space-x-2">
                <span class="text-xs text-slate-500 font-medium">Filtrar origen:</span>
                <select 
                  [value]="selectedOriginFilter()"
                  (change)="onOriginFilterChange($event)"
                  class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700">
                  <option value="ALL">Todos los orígenes</option>
                  <option value="VENTA">Ventas (POS/Facturas)</option>
                  <option value="COMPRA">Compras (Órdenes)</option>
                  <option value="PRODUCCION">Producción (MRP)</option>
                  <option value="MANUAL">Asientos Manuales</option>
                </select>
              </div>

              <div class="text-xs text-slate-400 font-mono">
                Mayorizado en tiempo real con aislamiento ACID
              </div>
            </div>

            <!-- Journal Entries List -->
            <div class="space-y-4">
              @for (entry of filteredEntries(); track entry.id) {
                <div class="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-all bg-white shadow-xs">
                  
                  <!-- Entry Header -->
                  <div class="bg-slate-50/90 px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="flex items-center space-x-2.5">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase"
                        [class]="entry.referenceType === 'VENTA' ? 'bg-blue-100 text-blue-800' :
                                (entry.referenceType === 'COMPRA' ? 'bg-amber-100 text-amber-800' :
                                (entry.referenceType === 'PRODUCCION' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-800'))">
                        {{ entry.referenceType }}
                      </span>
                      <span class="font-bold text-slate-800 text-xs font-mono">{{ entry.entryNumber }}</span>
                      <span class="text-slate-400 text-xs">•</span>
                      <span class="text-xs text-slate-600 font-medium">{{ entry.concept }}</span>
                    </div>

                    <div class="flex items-center space-x-3 text-xs">
                      <span class="text-slate-400 font-mono">{{ entry.date }}</span>
                      <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                        {{ entry.status }}
                      </span>
                    </div>
                  </div>

                  <!-- Entry Lines Table -->
                  <div class="p-3 overflow-x-auto">
                    <table class="w-full text-left text-xs">
                      <thead>
                        <tr class="text-slate-400 font-semibold uppercase text-[9px] border-b border-slate-100">
                          <th class="py-1.5 px-3">Código Cuenta</th>
                          <th class="py-1.5 px-3">Nombre de la Cuenta Contable</th>
                          <th class="py-1.5 px-3">Glosa / Detalle</th>
                          <th class="py-1.5 px-3 text-right">Debe ($)</th>
                          <th class="py-1.5 px-3 text-right">Haber ($)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-50 font-mono">
                        @for (line of entry.lines; track $index) {
                          <tr class="hover:bg-slate-50/50">
                            <td class="py-1.5 px-3 font-bold text-slate-700">{{ line.accountCode }}</td>
                            <td class="py-1.5 px-3 font-sans text-slate-800 font-medium">{{ line.accountName }}</td>
                            <td class="py-1.5 px-3 font-sans text-slate-500 text-[11px]">{{ line.description }}</td>
                            <td class="py-1.5 px-3 text-right font-bold" [class.text-emerald-700]="line.debit > 0">
                              {{ line.debit > 0 ? ('$' + line.debit.toFixed(2)) : '-' }}
                            </td>
                            <td class="py-1.5 px-3 text-right font-bold" [class.text-blue-700]="line.credit > 0">
                              {{ line.credit > 0 ? ('$' + line.credit.toFixed(2)) : '-' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                      <tfoot>
                        <tr class="bg-slate-50/75 font-bold font-mono border-t border-slate-200 text-slate-800">
                          <td colspan="3" class="py-2 px-3 text-right uppercase text-[10px] tracking-wider text-slate-500 font-sans">Sumas Iguales:</td>
                          <td class="py-2 px-3 text-right text-emerald-800">\${{ entry.totalDebit.toFixed(2) }}</td>
                          <td class="py-2 px-3 text-right text-blue-800">\${{ entry.totalCredit.toFixed(2) }}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                </div>
              } @empty {
                <div class="text-center py-10 text-slate-400">
                  <mat-icon class="text-3xl text-slate-300">menu_book</mat-icon>
                  <p class="mt-1 text-xs">No hay asientos contables registrados con este filtro.</p>
                </div>
              }
            </div>

          </div>
        }

        <!-- TAB 2: CATÁLOGO DE CUENTAS NIIF -->
        @if (activeTab() === 'chart') {
          <div class="p-6 space-y-4">
            
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Estructura del Plan de Cuentas NIIF</span>
              <span class="text-xs text-slate-400 font-mono">{{ stateService.accounts().length }} Cuentas Mayorizadas</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                    <th class="py-3 px-4">Código NIIF</th>
                    <th class="py-3 px-4">Nombre de la Cuenta</th>
                    <th class="py-3 px-4 text-center">Clasificación</th>
                    <th class="py-3 px-4 text-center">Naturaleza</th>
                    <th class="py-3 px-4 text-right">Saldo Actual ($)</th>
                    <th class="py-3 px-4 text-right">Saldo en Bs. (BCV)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (acc of stateService.accounts(); track acc.id) {
                    <tr class="hover:bg-slate-50 transition-colors" [class.bg-slate-50]="acc.level === 1">
                      
                      <td class="py-2.5 px-4 font-mono font-bold" [class.text-emerald-800]="acc.type === 'ACTIVO'" [class.text-rose-800]="acc.type === 'PASIVO'" [class.text-purple-800]="acc.type === 'PATRIMONIO'">
                        {{ acc.code }}
                      </td>

                      <td class="py-2.5 px-4 font-semibold text-slate-800">
                        {{ acc.name }}
                      </td>

                      <td class="py-2.5 px-4 text-center">
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                          [class]="acc.type === 'ACTIVO' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  (acc.type === 'PASIVO' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  (acc.type === 'PATRIMONIO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  (acc.type === 'INGRESO' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-700 border border-slate-200')))">
                          {{ acc.type }}
                        </span>
                      </td>

                      <td class="py-2.5 px-4 text-center font-mono text-[11px] text-slate-500">
                        {{ acc.isDebitNormal ? 'DEUDORA (Debe)' : 'ACREEDORA (Haber)' }}
                      </td>

                      <td class="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        \${{ acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </td>

                      <td class="py-2.5 px-4 text-right font-mono text-slate-500 text-xs">
                        Bs. {{ (acc.balance * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>

          </div>
        }

        <!-- TAB 3: BALANCE DE COMPROBACIÓN & ESTADO DE RESULTADOS -->
        @if (activeTab() === 'financials') {
          <div class="p-6 space-y-6">
            
            <!-- Financial Statements Layout (2 Columns) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- Left: Balance General Sintético -->
              <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 class="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                    <mat-icon class="text-emerald-600 text-base">account_balance</mat-icon>
                    <span>Balance General Clasificado (NIIF)</span>
                  </h4>
                  <span class="text-xs font-mono font-bold text-emerald-700">A = P + Patrimonio</span>
                </div>

                <div class="space-y-3 text-xs">
                  <!-- Activos -->
                  <div>
                    <div class="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                      <span>1. TOTAL ACTIVOS</span>
                      <span class="font-mono">\${{ stateService.totalAccountingAssets().toFixed(2) }}</span>
                    </div>
                    <div class="pl-3 pt-1.5 space-y-1 text-slate-600 font-mono text-[11px]">
                      @for (acc of getAccountsByType('ACTIVO'); track acc.id) {
                        <div class="flex justify-between">
                          <span>{{ acc.code }} {{ acc.name }}</span>
                          <span>\${{ acc.balance.toFixed(2) }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Pasivos -->
                  <div class="pt-2">
                    <div class="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                      <span>2. TOTAL PASIVOS</span>
                      <span class="font-mono">\${{ stateService.totalAccountingLiabilities().toFixed(2) }}</span>
                    </div>
                    <div class="pl-3 pt-1.5 space-y-1 text-slate-600 font-mono text-[11px]">
                      @for (acc of getAccountsByType('PASIVO'); track acc.id) {
                        <div class="flex justify-between">
                          <span>{{ acc.code }} {{ acc.name }}</span>
                          <span>\${{ acc.balance.toFixed(2) }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Patrimonio -->
                  <div class="pt-2">
                    <div class="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                      <span>3. TOTAL PATRIMONIO</span>
                      <span class="font-mono">\${{ stateService.totalAccountingEquity().toFixed(2) }}</span>
                    </div>
                    <div class="pl-3 pt-1.5 space-y-1 text-slate-600 font-mono text-[11px]">
                      @for (acc of getAccountsByType('PATRIMONIO'); track acc.id) {
                        <div class="flex justify-between">
                          <span>{{ acc.code }} {{ acc.name }}</span>
                          <span>\${{ acc.balance.toFixed(2) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Estado de Resultados (P&L) -->
              <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/40 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 class="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                    <mat-icon class="text-purple-600 text-base">assessment</mat-icon>
                    <span>Estado de Pérdidas y Ganancias (P&L)</span>
                  </h4>
                  <span class="text-xs font-mono font-bold text-purple-700">En Tiempo Real</span>
                </div>

                <div class="space-y-3 text-xs">
                  
                  <div class="flex justify-between font-semibold text-slate-700 py-1.5 border-b border-slate-200">
                    <span>(+) Ingresos Operacionales por Ventas (4)</span>
                    <span class="font-mono font-bold text-teal-700">\${{ stateService.totalAccountingRevenue().toFixed(2) }}</span>
                  </div>

                  <div class="flex justify-between font-semibold text-slate-700 py-1.5 border-b border-slate-200">
                    <span>(-) Costo de Ventas y Producción (5)</span>
                    <span class="font-mono font-bold text-rose-700">\${{ stateService.totalAccountingCost().toFixed(2) }}</span>
                  </div>

                  <div class="flex justify-between font-bold text-slate-900 py-2 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
                    <span>(=) Utilidad Bruta en Ventas</span>
                    <span class="font-mono font-bold text-emerald-800">\${{ (stateService.totalAccountingRevenue() - stateService.totalAccountingCost()).toFixed(2) }}</span>
                  </div>

                  <div class="flex justify-between font-semibold text-slate-700 py-1.5 border-b border-slate-200">
                    <span>(-) Gastos de Operación y Administración (6)</span>
                    <span class="font-mono font-bold text-amber-700">\${{ stateService.totalAccountingExpenses().toFixed(2) }}</span>
                  </div>

                  <div class="flex justify-between font-bold text-slate-900 py-2.5 bg-slate-900 text-white px-3 rounded-lg mt-4">
                    <span>(=) UTILIDAD NETA DEL EJERCICIO</span>
                    <span class="font-mono text-emerald-400 text-sm">\${{ stateService.netIncomePeriod().toFixed(2) }}</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        }

      </div>

      <!-- ========================================================= -->
      <!-- MODAL: NUEVO ASIENTO MANUAL -->
      <!-- ========================================================= -->
      @if (showManualEntryModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-emerald-600">post_add</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Registrar Asiento Contable Manual (Partida Doble)</h3>
              </div>
              <button (click)="closeManualEntryModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="manualEntryForm" (ngSubmit)="submitManualEntryForm()" class="mt-4 space-y-4 text-xs">
              <div>
                <label for="manual-concept" class="block font-semibold text-slate-700 mb-1">Concepto / Glosa Principal *</label>
                <input id="manual-concept" type="text" formControlName="concept" placeholder="Ej: Ajuste de provisiones contables de fin de mes..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <!-- Lines Array -->
              <div class="pt-2 border-t border-slate-100">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-slate-800 text-xs">Partidas Contables (Debe vs Haber):</span>
                  <button type="button" (click)="addEntryLine()" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-100 flex items-center space-x-1">
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>Agregar Partida</span>
                  </button>
                </div>

                <div formArrayName="lines" class="space-y-2 max-h-56 overflow-y-auto pr-1">
                  @for (line of entryLinesArray.controls; track $index; let i = $index) {
                    <div [formGroupName]="i" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div class="flex-1">
                        <select formControlName="accountId" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800">
                          @for (acc of stateService.accounts(); track acc.id) {
                            <option [value]="acc.id">{{ acc.code }} - {{ acc.name }}</option>
                          }
                        </select>
                      </div>
                      <div class="w-28">
                        <input type="number" step="0.01" min="0" formControlName="debit" placeholder="Debe ($)" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-emerald-700" />
                      </div>
                      <div class="w-28">
                        <input type="number" step="0.01" min="0" formControlName="credit" placeholder="Haber ($)" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-blue-700" />
                      </div>
                      <button type="button" (click)="removeEntryLine(i)" class="text-rose-500 hover:text-rose-700 p-1">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Sum verification banner -->
              <div class="p-3 rounded-xl border flex items-center justify-between font-mono font-bold text-xs"
                [class]="isBalanced() ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'">
                <div>
                  <span>Total Debe: \${{ formTotalDebit().toFixed(2) }}</span>
                  <span class="mx-3">|</span>
                  <span>Total Haber: \${{ formTotalCredit().toFixed(2) }}</span>
                </div>
                <div>
                  @if (isBalanced()) {
                    <span class="text-emerald-700 flex items-center space-x-1">
                      <mat-icon class="text-xs">check_circle</mat-icon>
                      <span>CUADRADO</span>
                    </span>
                  } @else {
                    <span class="text-rose-700 flex items-center space-x-1">
                      <mat-icon class="text-xs">error</mat-icon>
                      <span>DIFERENCIA: \${{ Math.abs(formTotalDebit() - formTotalCredit()).toFixed(2) }}</span>
                    </span>
                  }
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeManualEntryModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Cancelar</button>
                <button type="submit" [disabled]="manualEntryForm.invalid || !isBalanced()" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm">Asentar en Libro Mayor</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class AccountingComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);
  fb = inject(FormBuilder);
  Math = Math;

  activeTab = signal<'journal' | 'chart' | 'financials'>('journal');
  selectedOriginFilter = signal<string>('ALL');
  showManualEntryModal = signal<boolean>(false);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_JOURNAL_ENTRY') {
        this.activeTab.set('journal');
        this.openNewManualEntryModal();
      }
    });
  }

  manualEntryForm = this.fb.group({
    concept: ['', [Validators.required, Validators.minLength(5)]],
    lines: this.fb.array([])
  });

  get entryLinesArray() {
    return this.manualEntryForm.get('lines') as FormArray;
  }

  filteredEntries = computed(() => {
    const filter = this.selectedOriginFilter();
    if (filter === 'ALL') return this.stateService.journalEntries();
    return this.stateService.journalEntries().filter(e => e.referenceType === filter);
  });

  onOriginFilterChange(event: Event) {
    this.selectedOriginFilter.set((event.target as HTMLSelectElement).value);
  }

  getAccountsByType(type: AccountType): Account[] {
    return this.stateService.accounts().filter(a => a.type === type);
  }

  openNewManualEntryModal() {
    this.manualEntryForm.reset({
      concept: ''
    });
    this.entryLinesArray.clear();

    const accs = this.stateService.accounts();
    // Default 2 lines
    this.entryLinesArray.push(
      this.fb.group({
        accountId: [accs[0]?.id || '', Validators.required],
        debit: [100, [Validators.required, Validators.min(0)]],
        credit: [0, [Validators.required, Validators.min(0)]]
      })
    );
    this.entryLinesArray.push(
      this.fb.group({
        accountId: [accs[1]?.id || '', Validators.required],
        debit: [0, [Validators.required, Validators.min(0)]],
        credit: [100, [Validators.required, Validators.min(0)]]
      })
    );

    this.showManualEntryModal.set(true);
  }

  closeManualEntryModal() {
    this.showManualEntryModal.set(false);
  }

  addEntryLine() {
    const accs = this.stateService.accounts();
    this.entryLinesArray.push(
      this.fb.group({
        accountId: [accs[0]?.id || '', Validators.required],
        debit: [0, [Validators.required, Validators.min(0)]],
        credit: [0, [Validators.required, Validators.min(0)]]
      })
    );
  }

  removeEntryLine(index: number) {
    if (this.entryLinesArray.length > 2) {
      this.entryLinesArray.removeAt(index);
    }
  }

  formTotalDebit(): number {
    const lines = (this.manualEntryForm.value.lines as { debit: number }[]) || [];
    return lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  }

  formTotalCredit(): number {
    const lines = (this.manualEntryForm.value.lines as { credit: number }[]) || [];
    return lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  }

  isBalanced(): boolean {
    const deb = this.formTotalDebit();
    const cred = this.formTotalCredit();
    return deb > 0 && Math.abs(deb - cred) < 0.01;
  }

  submitManualEntryForm() {
    if (this.manualEntryForm.invalid || !this.isBalanced()) return;
    const v = this.manualEntryForm.value;
    const lines = (v.lines as { accountId: string; debit: number; credit: number }[]).map(l => ({
      accountId: l.accountId,
      description: v.concept || 'Asiento manual',
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0
    }));

    const res = this.stateService.createManualJournalEntry(v.concept!, lines);
    if (res.success) {
      this.closeManualEntryModal();
    }
  }
}
