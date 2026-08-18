import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';
import { User } from '../../models/erp.models';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <header class="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      
      <!-- Brand & Title -->
      <div class="flex items-center space-x-3">
        <button (click)="toggleSidebar.emit()" class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <mat-icon>menu</mat-icon>
        </button>

        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-sm">
            N
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-slate-800 tracking-tight text-base leading-none">NexoCore <span class="text-blue-500">ERP</span></span>
              <span class="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-600 border border-blue-200/60 uppercase tracking-wider">
                MVP Fase 1
              </span>
            </div>
            <p class="text-[10px] text-slate-400 font-medium leading-none mt-1 hidden sm:block">NestJS • PostgreSQL ACID • Prisma ORM • Angular</p>
          </div>
        </div>
      </div>

      <!-- Quick Metrics, BCV Ticker, Cash Status & Role Switcher -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        
        <!-- BCV Ticker & Control Modal Button -->
        <button 
          (click)="showBcvModal.set(true)"
          class="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 transition-all cursor-pointer">
          <mat-icon class="text-base text-emerald-600">currency_exchange</mat-icon>
          <div class="text-left leading-tight hidden xs:block">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Tasa Oficial</span>
            <span class="text-xs font-mono font-bold text-slate-900">
              Bs. {{ stateService.bcvState().usdRate.toFixed(2) }}
            </span>
          </div>
          <span class="text-[9px] px-1 py-0.2 rounded font-mono font-semibold"
            [class]="stateService.bcvState().origin === 'API_BCV' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
            {{ stateService.bcvState().origin === 'API_BCV' ? 'BCV' : 'MAN' }}
          </span>
        </button>

        <!-- Architecture Ficha Técnica Shortcut -->
        <button 
          (click)="openArchitecture.emit()"
          class="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer">
          <mat-icon class="text-blue-600 text-base">architecture</mat-icon>
          <span>Ficha Técnica</span>
        </button>

        <!-- Cash Register Status Button -->
        <button 
          (click)="openCash.emit()"
          class="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
          [class]="stateService.activeCashSession().status === 'ABIERTA' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'">
          <span class="w-2 h-2 rounded-full" [class]="stateService.activeCashSession().status === 'ABIERTA' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
          <span class="hidden sm:inline font-semibold">Caja:</span>
          <span class="font-bold">{{ stateService.activeCashSession().status }}</span>
        </button>

        <!-- User Role Switcher Dropdown -->
        <div class="relative">
          <button 
            (click)="showUserDropdown.set(!showUserDropdown())"
            class="flex items-center space-x-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer">
            <img 
              [src]="authService.currentUser().avatarUrl" 
              [alt]="authService.currentUser().name"
              referrerpolicy="no-referrer"
              class="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300" />
            <div class="text-left hidden sm:block">
              <p class="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{{ authService.currentUser().name }}</p>
              <p class="text-[10px] text-slate-400 leading-none mt-0.5">{{ authService.currentRoleConfig().name }}</p>
            </div>
            <mat-icon class="text-slate-400 text-base">expand_more</mat-icon>
          </button>

          @if (showUserDropdown()) {
            <div 
              class="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div class="px-4 py-2 border-b border-slate-100">
                <p class="text-xs font-bold uppercase text-slate-400 tracking-wider">Simulador de Roles (RBAC)</p>
                <p class="text-xs text-slate-600 mt-0.5">Cambia de usuario para probar permisos:</p>
              </div>

              <div class="max-h-60 overflow-y-auto py-1">
                @for (user of authService.availableDemoUsers; track user.id) {
                  <button 
                    (click)="selectUser(user)"
                    class="w-full px-4 py-2.5 flex items-center space-x-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    [class.bg-blue-50]="user.id === authService.currentUser().id">
                    <img [src]="user.avatarUrl" [alt]="user.name" referrerpolicy="no-referrer" class="w-8 h-8 rounded-full object-cover" />
                    <div class="overflow-hidden flex-1">
                      <p class="text-xs font-semibold text-slate-900 truncate">{{ user.name }}</p>
                      <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border"
                        [class]="getRoleBadgeClass(user.role)">
                        {{ getRoleName(user.role) }}
                      </span>
                    </div>
                    @if (user.id === authService.currentUser().id) {
                      <mat-icon class="text-blue-600 text-sm">check</mat-icon>
                    }
                  </button>
                }
              </div>

              <div class="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
                <span class="font-bold">Token JWT:</span> Sin estado con firma HS256
              </div>
            </div>
          }
        </div>

      </div>

    </header>

    <!-- ========================================================= -->
    <!-- MODAL: GESTIÓN DE TASAS DE CAMBIO (BCV / MANUAL) -->
    <!-- ========================================================= -->
    @if (showBcvModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <mat-icon class="text-emerald-400">currency_exchange</mat-icon>
              <div>
                <h3 class="font-semibold text-sm">Control de Tasas de Cambio</h3>
                <p class="text-[11px] text-slate-300">Banco Central de Venezuela (BCV) & Ajuste Manual</p>
              </div>
            </div>
            <button (click)="showBcvModal.set(false)" class="text-slate-400 hover:text-white cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-6 space-y-4 text-xs">
            
            <!-- Current Rates Display -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span class="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Dólar Oficial (USD)</span>
                <p class="text-lg font-mono font-bold text-emerald-950">Bs. {{ stateService.bcvState().usdRate.toFixed(2) }}</p>
                <span class="text-[10px] text-emerald-700">Origen: {{ stateService.bcvState().origin }}</span>
              </div>

              <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <span class="text-[10px] uppercase font-bold text-indigo-800 block mb-0.5">Euro Oficial (EUR)</span>
                <p class="text-lg font-mono font-bold text-indigo-950">Bs. {{ stateService.bcvState().eurRate.toFixed(2) }}</p>
                <span class="text-[10px] text-indigo-700">Tasa Cruzada EUR/USD</span>
              </div>
            </div>

            <!-- Auto Sync Button -->
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p class="font-bold text-slate-800">Sincronización Automática API BCV</p>
                <p class="text-[10px] text-slate-500">Última actualización: {{ stateService.bcvState().lastSync }}</p>
              </div>
              <button 
                (click)="syncBcv()" 
                [disabled]="isSyncing()"
                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center space-x-1 cursor-pointer">
                <mat-icon class="text-sm" [class.animate-spin]="isSyncing()">sync</mat-icon>
                <span>{{ isSyncing() ? 'Sincronizando...' : 'Consultar API' }}</span>
              </button>
            </div>

            <!-- Manual Override -->
            <div class="space-y-2 pt-2 border-t border-slate-100">
              <span class="font-bold text-slate-800 block">Ajuste Manual de Tasa (Bs. / USD)</span>
              <div class="flex items-center space-x-2">
                <input 
                  type="number" 
                  step="0.01" 
                  [formControl]="manualRateCtrl"
                  placeholder="Ej: 36.80" 
                  class="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold" />
                <button 
                  (click)="applyManualRate()" 
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold cursor-pointer">
                  Fijar Tasa
                </button>
              </div>
              <p class="text-[10px] text-slate-400">
                Al fijar manualmente, todas las operaciones de Punto de Venta, facturación y presupuestos usarán este valor como referencia legal.
              </p>
            </div>

          </div>

          <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              (click)="showBcvModal.set(false)" 
              class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold cursor-pointer">
              Cerrar
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class HeaderComponent {
  authService = inject(AuthService);
  stateService = inject(ErpStateService);

  showUserDropdown = signal<boolean>(false);
  showBcvModal = signal<boolean>(false);
  isSyncing = signal<boolean>(false);

  manualRateCtrl = new FormControl(36.54, [Validators.required, Validators.min(0.01)]);

  toggleSidebar = output<void>();
  openArchitecture = output<void>();
  openCash = output<void>();

  selectUser(user: User) {
    this.authService.switchUser(user);
    this.showUserDropdown.set(false);
  }

  syncBcv() {
    this.isSyncing.set(true);
    this.stateService.syncBcvRates();
    setTimeout(() => {
      this.isSyncing.set(false);
      this.manualRateCtrl.setValue(this.stateService.bcvState().usdRate);
    }, 400);
  }

  applyManualRate() {
    const val = Number(this.manualRateCtrl.value);
    if (val && val > 0) {
      this.stateService.setManualExchangeRate(val);
      this.showBcvModal.set(false);
    }
  }

  getRoleName(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Super Administrador';
      case 'OPERATIONS_MANAGER': return 'Gerente de Operaciones';
      case 'CASHIER_SELLER': return 'Cajero / Vendedor';
      case 'WAREHOUSE_KEEPER': return 'Jefe de Almacén';
      case 'AUDITOR': return 'Auditor Contable';
      default: return role;
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OPERATIONS_MANAGER': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CASHIER_SELLER': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WAREHOUSE_KEEPER': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AUDITOR': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }
}
