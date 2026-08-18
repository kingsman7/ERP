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
              Trazabilidad inmutable de peticiones HTTP, estado anterior vs nuevo diff y control de roles RBAC
            </p>
          </div>
        </div>

        <div class="p-2.5 bg-slate-900 text-white rounded-xl text-xs flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Interceptors NestJS: <strong class="text-indigo-300 font-mono">&#64;AuditInterceptor() Activo</strong></span>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        <!-- Search Action/Title -->
        <div>
          <span class="block font-semibold text-slate-600 mb-1">Buscar por Acción o Detalle</span>
          <input 
            type="text" 
            [value]="searchTerm()"
            (input)="searchTerm.set($any($event.target).value)"
            placeholder="Ej: CREATE_INVOICE, FAC-2026..." 
            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
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
            <option value="INVENTORY">INVENTORY (Inventario & Ajustes)</option>
            <option value="PURCHASES">PURCHASES (Compras & CPP)</option>
            <option value="POS">POS (Facturación & Ventas)</option>
            <option value="SALES">SALES (Presupuestos)</option>
            <option value="FINANCE">FINANCE (Caja & Cierres)</option>
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

      <!-- Audit Logs Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th class="py-3 px-4">Timestamp & IP</th>
                <th class="py-3 px-3">Módulo</th>
                <th class="py-3 px-3">Acción Registrada</th>
                <th class="py-3 px-3">Usuario & Rol</th>
                <th class="py-3 px-3">Descripción de Operación</th>
                <th class="py-3 px-4 text-center">Estado / Diff</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (log of filteredLogs(); track log.id) {
                <tr class="hover:bg-slate-50/60 transition-colors">
                  
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

                  <!-- Action Name -->
                  <td class="py-3 px-3 font-mono font-bold text-slate-900">
                    {{ log.action }}
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
                        class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-medium inline-flex items-center space-x-1 transition-colors">
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
                    No se encontraron registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
          <span>Mostrando {{ filteredLogs().length }} eventos de auditoría</span>
          <span>Garantía de No-Repudio (Inmutable)</span>
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
              <button (click)="selectedLogForDiff.set(null)" class="text-slate-400 hover:text-white">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <p class="font-bold text-slate-900">{{ currentLog.details.title }}</p>
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
              <button (click)="selectedLogForDiff.set(null)" class="px-4 py-2 bg-slate-800 text-white rounded-xl font-medium text-xs">
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
  selectedLogForDiff = signal<AuditLog | null>(null);

  filteredLogs = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const mod = this.selectedModule();
    const role = this.selectedRole();

    return this.stateService.auditLogs().filter(log => {
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
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  formatJson(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
}
