import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { AuditLog } from '../../models/erp.models';

@Component({
  selector: 'app-audit-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-2">
          <span class="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <mat-icon>shield</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Bitácora de Auditoría & Seguridad (AuditLog)
            </h1>
            <p class="text-xs text-slate-500">
              Trazabilidad inmutable, alertas de eventos críticos (precios/stock) y control de roles RBAC
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <div class="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex items-center space-x-2 shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Interceptors NestJS: <strong class="text-indigo-300 font-mono">&#64;AuditInterceptor() Activo</strong></span>
          </div>
        </div>
      </div>

      <!-- Critical Events Summary KPI Bento Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <!-- Total Audit Events -->
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-blue-50 text-blue-700">
            <mat-icon class="text-lg">format_list_bulleted</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Registros</span>
            <p class="text-lg font-bold text-slate-900">{{ stateService.auditLogs().length }}</p>
          </div>
        </div>

        <!-- Critical Alerts -->
        <button 
          type="button"
          (click)="filterOnlyCritical.set(!filterOnlyCritical())"
          class="p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-3 text-left w-full"
          [class]="filterOnlyCritical() ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' : 'bg-white border-slate-200 hover:border-rose-200'">
          <div class="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <mat-icon class="text-lg">warning</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-rose-800 block">Eventos Críticos</span>
            <div class="flex items-center space-x-1.5">
              <p class="text-lg font-bold text-rose-950">{{ criticalLogsCount() }}</p>
              <span class="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-200 text-rose-900">Filtrar</span>
            </div>
          </div>
        </button>

        <!-- Price Change Events -->
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <mat-icon class="text-lg">price_change</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Cambios Precio Base</span>
            <p class="text-lg font-bold text-slate-900">{{ priceChangesCount() }}</p>
          </div>
        </div>

        <!-- Manual Stock Adjustments -->
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-sky-50 text-sky-700">
            <mat-icon class="text-lg">inventory_2</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Stock Manual / Mermas</span>
            <p class="text-lg font-bold text-slate-900">{{ manualStockAdjustmentsCount() }}</p>
          </div>
        </div>

      </div>

      <!-- Filters Bar -->
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          <!-- Search Action/Title -->
          <div class="sm:col-span-2">
            <span class="block font-semibold text-slate-600 mb-1">Buscar por Acción, Folio o Detalle</span>
            <div class="relative">
              <input 
                type="text" 
                [value]="searchTerm()"
                (input)="searchTerm.set($any($event.target).value)"
                placeholder="Ej: UPDATE_PRODUCT_PRICES, MER-2026, FAC-2026..." 
                class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              <mat-icon class="absolute left-2.5 top-2.5 text-slate-400 text-sm">search</mat-icon>
            </div>
          </div>

          <!-- Filter by Module -->
          <div>
            <span class="block font-semibold text-slate-600 mb-1">Módulo del Sistema</span>
            <select 
              [value]="selectedModule()"
              (change)="selectedModule.set($any($event.target).value)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
              <option value="ALL">Todos los Módulos</option>
              <option value="AUTH">AUTH (Seguridad & Login)</option>
              <option value="INVENTORY">INVENTORY (Inventario & Precios)</option>
              <option value="PURCHASES">PURCHASES (Compras & CPP)</option>
              <option value="POS">POS (Facturación & Ventas)</option>
              <option value="SALES">SALES (Presupuestos)</option>
              <option value="FINANCE">FINANCE (Caja & Cierres)</option>
              <option value="BACKUP">BACKUP (Seguridad & BD)</option>
            </select>
          </div>

          <!-- Filter by Role -->
          <div>
            <span class="block font-semibold text-slate-600 mb-1">Rol de Usuario</span>
            <select 
              [value]="selectedRole()"
              (change)="selectedRole.set($any($event.target).value)"
              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
              <option value="ALL">Todos los Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATIONS_MANAGER">OPERATIONS_MANAGER</option>
              <option value="CASHIER_SELLER">CASHIER_SELLER</option>
              <option value="WAREHOUSE_KEEPER">WAREHOUSE_KEEPER</option>
              <option value="AUDITOR">AUDITOR</option>
            </select>
          </div>

        </div>

        <!-- Quick Filter Toggles -->
        <div class="flex items-center space-x-2 pt-2 border-t border-slate-100 flex-wrap gap-y-1">
          <span class="text-[11px] font-semibold text-slate-500">Filtrado Rápido:</span>
          
          <button 
            (click)="toggleCriticalFilter()"
            class="px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            [class]="filterOnlyCritical() ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'">
            <mat-icon class="text-xs">warning</mat-icon>
            <span>Solo Eventos Críticos</span>
          </button>

          <button 
            (click)="setSearchFilter('UPDATE_PRODUCT_PRICES')"
            class="px-2.5 py-1 rounded-lg font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1 transition-colors cursor-pointer">
            <mat-icon class="text-xs">price_change</mat-icon>
            <span>Precios Base</span>
          </button>

          <button 
            (click)="setSearchFilter('ADJUST_STOCK')"
            class="px-2.5 py-1 rounded-lg font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-1 transition-colors cursor-pointer">
            <mat-icon class="text-xs">inventory_2</mat-icon>
            <span>Ajustes de Stock / Merma</span>
          </button>

          @if (searchTerm() || filterOnlyCritical() || selectedModule() !== 'ALL' || selectedRole() !== 'ALL') {
            <button 
              (click)="resetFilters()"
              class="px-2.5 py-1 rounded-lg font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
              Limpiar filtros
            </button>
          }
        </div>

      </div>

      <!-- Audit Logs Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th class="py-3 px-4">Timestamp & IP</th>
                <th class="py-3 px-3">Módulo</th>
                <th class="py-3 px-3">Acción & Severidad</th>
                <th class="py-3 px-3">Usuario & Rol</th>
                <th class="py-3 px-3">Descripción de Operación</th>
                <th class="py-3 px-4 text-center">Estado / Diff</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (log of filteredLogs(); track log.id) {
                <tr class="hover:bg-slate-50/60 transition-colors" [class.bg-rose-50/20]="isLogCritical(log)">
                  
                  <!-- Timestamp & IP -->
                  <td class="py-3 px-4 whitespace-nowrap">
                    <p class="font-mono font-medium text-slate-900">{{ log.createdAt }}</p>
                    <p class="font-mono text-[10px] text-slate-400">IP: {{ log.ipAddress }}</p>
                  </td>

                  <!-- Module Badge -->
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [class]="getModuleBadgeClass(log.module)">
                      {{ log.module }}
                    </span>
                  </td>

                  <!-- Action Name & Critical Flag -->
                  <td class="py-3 px-3">
                    <div class="flex items-center space-x-1.5 flex-wrap">
                      <span class="font-mono font-bold text-slate-900">{{ log.action }}</span>
                      @if (isLogCritical(log)) {
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-0.5">
                          <mat-icon class="text-[11px]">warning</mat-icon>
                          <span>CRÍTICO</span>
                        </span>
                      }
                    </div>
                  </td>

                  <!-- User & Role -->
                  <td class="py-3 px-3">
                    <p class="font-semibold text-slate-900">{{ log.userName }}</p>
                    <span class="text-[10px] text-slate-500 font-mono">{{ log.userRole }}</span>
                  </td>

                  <!-- Title & Description -->
                  <td class="py-3 px-3 max-w-sm">
                    <p class="font-semibold text-slate-800">{{ log.details.title }}</p>
                    <p class="text-[11px] text-slate-500 line-clamp-1">{{ log.details.description }}</p>
                  </td>

                  <!-- Diff Inspector Trigger -->
                  <td class="py-3 px-4 text-center">
                    @if (log.details.previousState || log.details.newState) {
                      <button 
                        (click)="inspectDiff(log)"
                        class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-medium inline-flex items-center space-x-1 transition-colors cursor-pointer">
                        <mat-icon class="text-xs">data_object</mat-icon>
                        <span>Ver Diff</span>
                      </button>
                    } @else {
                      <span class="text-[10px] text-slate-400 font-mono">Sin diff</span>
                    }
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center py-10 text-slate-400">
                    No se encontraron registros de auditoría que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Mostrando {{ filteredLogs().length }} eventos de auditoría ({{ criticalLogsCount() }} críticos)</span>
          <span class="font-mono text-[11px] text-slate-400">Garantía de No-Repudio (Inmutable PostgreSQL ACID)</span>
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MODAL: INSPECTOR DE DIFF ESTADO ANTERIOR VS NUEVO (JSON) -->
      <!-- ========================================================= -->
      @if (selectedLogForDiff(); as currentLog) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-indigo-400">compare_arrows</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Inspección de Estado JSON (Audit Trail)</h3>
                  <p class="text-[11px] text-slate-400 font-mono">{{ currentLog.action }} • ID: {{ currentLog.id }}</p>
                </div>
              </div>
              <button (click)="selectedLogForDiff.set(null)" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div class="flex items-center justify-between">
                  <p class="font-bold text-slate-900">{{ currentLog.details.title }}</p>
                  @if (isLogCritical(currentLog)) {
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      EVENTO CRÍTICO DE CONTROL
                    </span>
                  }
                </div>
                <p class="text-slate-600">{{ currentLog.details.description }}</p>
                <p class="text-[10px] text-slate-400">Ejecutado por: {{ currentLog.userName }} ({{ currentLog.userRole }}) desde IP {{ currentLog.ipAddress }}</p>
              </div>

              <!-- Side-by-Side Diff -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <!-- Previous State -->
                <div class="space-y-1">
                  <span class="font-bold text-rose-700 uppercase tracking-wider flex items-center space-x-1">
                    <mat-icon class="text-sm">remove_circle_outline</mat-icon>
                    <span>Estado Anterior (Snapshot)</span>
                  </span>
                  <pre class="bg-slate-950 text-rose-300 p-3 rounded-xl font-mono text-[11px] h-48 overflow-auto border border-rose-950/40">{{ currentLog.details.previousState ? formatJson(currentLog.details.previousState) : '{"info": "Sin estado previo / Inserción inicial"}' }}</pre>
                </div>

                <!-- New State -->
                <div class="space-y-1">
                  <span class="font-bold text-emerald-700 uppercase tracking-wider flex items-center space-x-1">
                    <mat-icon class="text-sm">add_circle_outline</mat-icon>
                    <span>Estado Nuevo (Resultante)</span>
                  </span>
                  <pre class="bg-slate-950 text-emerald-300 p-3 rounded-xl font-mono text-[11px] h-48 overflow-auto border border-emerald-950/40">{{ currentLog.details.newState ? formatJson(currentLog.details.newState) : '{"info": "Sin nuevo estado"}' }}</pre>
                </div>

              </div>

            </div>

            <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button (click)="selectedLogForDiff.set(null)" class="px-4 py-2 bg-slate-800 text-white rounded-xl font-medium text-xs cursor-pointer">
                Cerrar Inspector
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class AuditLogComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  searchTerm = signal<string>('');
  selectedModule = signal<string>('ALL');
  selectedRole = signal<string>('ALL');
  filterOnlyCritical = signal<boolean>(false);
  selectedLogForDiff = signal<AuditLog | null>(null);

  criticalLogsCount = computed(() => {
    return this.stateService.auditLogs().filter(log => this.isLogCritical(log)).length;
  });

  priceChangesCount = computed(() => {
    return this.stateService.auditLogs().filter(log => log.action === 'UPDATE_PRODUCT_PRICES').length;
  });

  manualStockAdjustmentsCount = computed(() => {
    return this.stateService.auditLogs().filter(log => log.action === 'ADJUST_STOCK').length;
  });

  filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const mod = this.selectedModule();
    const role = this.selectedRole();
    const onlyCrit = this.filterOnlyCritical();

    return this.stateService.auditLogs().filter(log => {
      const isCrit = this.isLogCritical(log);
      if (onlyCrit && !isCrit) return false;

      const matchSearch = !term ||
        log.action.toLowerCase().includes(term) ||
        log.details.title.toLowerCase().includes(term) ||
        log.details.description.toLowerCase().includes(term) ||
        log.userName.toLowerCase().includes(term);

      const matchModule = mod === 'ALL' || log.module === mod;
      const matchRole = role === 'ALL' || log.userRole === role;

      return matchSearch && matchModule && matchRole;
    });
  });

  isLogCritical(log: AuditLog): boolean {
    return !!log.isCritical || 
           log.action === 'UPDATE_PRODUCT_PRICES' || 
           log.action === 'ADJUST_STOCK' || 
           log.action === 'RESTORE_DATABASE';
  }

  toggleCriticalFilter() {
    this.filterOnlyCritical.set(!this.filterOnlyCritical());
  }

  setSearchFilter(term: string) {
    this.searchTerm.set(term);
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedModule.set('ALL');
    this.selectedRole.set('ALL');
    this.filterOnlyCritical.set(false);
  }

  inspectDiff(log: AuditLog) {
    this.selectedLogForDiff.set(log);
  }

  getModuleBadgeClass(module: AuditLog['module']): string {
    switch (module) {
      case 'AUTH':
        return 'bg-purple-100 text-purple-800';
      case 'INVENTORY':
        return 'bg-sky-100 text-sky-800';
      case 'PURCHASES':
        return 'bg-amber-100 text-amber-800';
      case 'POS':
        return 'bg-emerald-100 text-emerald-800';
      case 'SALES':
        return 'bg-violet-100 text-violet-800';
      case 'FINANCE':
        return 'bg-rose-100 text-rose-800';
      case 'BACKUP':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  formatJson(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
}
