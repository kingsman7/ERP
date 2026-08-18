import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';

export type NavTab = 
  | 'dashboard'
  | 'inventory'
  | 'kardex'
  | 'purchases'
  | 'sales-pos'
  | 'quotes'
  | 'mrp'
  | 'crm'
  | 'accounting'
  | 'cash-closing'
  | 'audit-log'
  | 'architecture';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <aside class="w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 border-r border-slate-800 select-none">
      
      <!-- Top Navigation Links (Bento Style) -->
      <div class="py-4 px-3 space-y-1 overflow-y-auto">
        
        <div class="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Operaciones Core
        </div>

        <button 
          (click)="selectTab('dashboard')"
          [class]="activeTab() === 'dashboard' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-blue-400 text-lg">dashboard</mat-icon>
            <span class="font-medium">Dashboard Ejecutivo</span>
          </div>
        </button>

        <button 
          (click)="selectTab('inventory')"
          [class]="activeTab() === 'inventory' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-sky-400 text-lg">inventory_2</mat-icon>
            <span class="font-medium">Inventario y Almacenes</span>
          </div>
          @if (stateService.lowStockProducts().length > 0) {
            <span class="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500 text-white">
              {{ stateService.lowStockProducts().length }}
            </span>
          }
        </button>

        <button 
          (click)="selectTab('kardex')"
          [class]="activeTab() === 'kardex' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-emerald-400 text-lg">query_stats</mat-icon>
            <span class="font-medium">Kardex Valorado (CPP)</span>
          </div>
        </button>

        <button 
          (click)="selectTab('purchases')"
          [class]="activeTab() === 'purchases' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-amber-400 text-lg">local_shipping</mat-icon>
            <span class="font-medium">Compras y Proveedores</span>
          </div>
        </button>

        <button 
          (click)="selectTab('sales-pos')"
          [class]="activeTab() === 'sales-pos' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-blue-500 text-lg">point_of_sale</mat-icon>
            <span class="font-medium">Punto de Venta (POS)</span>
          </div>
          <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-950 text-blue-300 border border-blue-800">
            F10
          </span>
        </button>

        <button 
          (click)="selectTab('quotes')"
          [class]="activeTab() === 'quotes' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-violet-400 text-lg">request_quote</mat-icon>
            <span class="font-medium">Presupuestos / Cotiz.</span>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">
            {{ stateService.quotes().length }}
          </span>
        </button>

        <!-- FASE 2 SECTION -->
        <div class="pt-3 px-3 pb-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center justify-between">
          <span>Avanzado (Fase 2)</span>
          <span class="px-1 py-0.2 bg-amber-500/20 text-amber-300 text-[8px] rounded">ACTIVO</span>
        </div>

        <button 
          (click)="selectTab('mrp')"
          [class]="activeTab() === 'mrp' ? 'bg-amber-600/10 text-amber-400 font-semibold border-l-4 border-amber-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-amber-500 text-lg">precision_manufacturing</mat-icon>
            <span class="font-medium">Manufactura y MRP</span>
          </div>
          <span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-amber-400">
            {{ stateService.productionOrders().length }}
          </span>
        </button>

        <button 
          (click)="selectTab('crm')"
          [class]="activeTab() === 'crm' ? 'bg-violet-600/10 text-violet-400 font-semibold border-l-4 border-violet-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-violet-400 text-lg">view_kanban</mat-icon>
            <span class="font-medium">CRM & Pipeline</span>
          </div>
          <span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-violet-400">
            {{ stateService.crmDeals().length }}
          </span>
        </button>

        <button 
          (click)="selectTab('accounting')"
          [class]="activeTab() === 'accounting' ? 'bg-emerald-600/10 text-emerald-400 font-semibold border-l-4 border-emerald-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-emerald-400 text-lg">account_balance</mat-icon>
            <span class="font-medium">Contabilidad NIIF</span>
          </div>
          <span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-emerald-400">
            {{ stateService.journalEntries().length }}
          </span>
        </button>

        <div class="pt-3 px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Finanzas & Seguridad
        </div>

        <button 
          (click)="selectTab('cash-closing')"
          [class]="activeTab() === 'cash-closing' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-rose-400 text-lg">payments</mat-icon>
            <span class="font-medium">Cierre de Caja (Z)</span>
          </div>
        </button>

        <button 
          (click)="selectTab('audit-log')"
          [class]="activeTab() === 'audit-log' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-blue-400 text-lg">shield</mat-icon>
            <span class="font-medium">Auditoría y Roles</span>
          </div>
          <span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-400">
            {{ stateService.auditLogs().length }}
          </span>
        </button>

        <button 
          (click)="selectTab('architecture')"
          [class]="activeTab() === 'architecture' ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-4 border-blue-500 rounded-r-lg' : 'hover:bg-slate-800/90 text-slate-300 rounded-lg'"
          class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all duration-150 text-left">
          <div class="flex items-center space-x-3">
            <mat-icon class="text-indigo-400 text-lg">account_tree</mat-icon>
            <span class="font-medium">Ficha Técnica & Roadmap</span>
          </div>
        </button>

      </div>

      <!-- Bottom User Profile Card (Bento Design Spec) -->
      <div class="p-4 border-t border-slate-800 bg-[#0b1120]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 text-xs font-bold text-white uppercase shrink-0">
            {{ authService.currentUser().name.substring(0, 2).toUpperCase() }}
          </div>
          <div class="overflow-hidden min-w-0">
            <p class="text-xs font-semibold text-white truncate">{{ authService.currentUser().name }}</p>
            <p class="text-[11px] text-slate-400 truncate">{{ authService.currentRoleConfig().name }}</p>
          </div>
        </div>
      </div>

    </aside>
  `
})
export class SidebarComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  activeTab = input.required<NavTab>();
  tabChange = output<NavTab>();

  selectTab(tab: NavTab) {
    this.tabChange.emit(tab);
  }
}
