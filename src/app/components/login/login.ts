import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/erp.models';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white p-4 sm:p-6 lg:p-8">
      
      <!-- Top Navigation Header / Status Pill -->
      <header class="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
            4
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-extrabold text-white tracking-tight text-lg">Helameb <span class="text-blue-400">ERP</span></span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">v2.8 Enterprise</span>
            </div>
            <p class="text-[11px] text-slate-400">Sistema Integral de Gestión Comercial & Producción</p>
          </div>
        </div>

        <div class="hidden sm:flex items-center space-x-3 text-xs">
          <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-medium">Servidor Activo (PostgreSQL ACID)</span>
          </div>

          <div class="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
            <mat-icon class="text-emerald-400 text-sm">currency_exchange</mat-icon>
            <span class="text-[10px] text-slate-400 uppercase font-bold">Tasa BCV disponible al ingresar</span>
          </div>
        </div>
      </header>

      <!-- Main Login Section -->
      <main class="w-full max-w-6xl mx-auto my-auto py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        <!-- Left Column: Enterprise Value Proposition & System Highlights -->
        <div class="lg:col-span-5 space-y-6 text-slate-300">
          <div class="space-y-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center space-x-1.5">
              <mat-icon class="text-sm">verified_user</mat-icon>
              <span>Acceso Seguro con Control de Roles (RBAC)</span>
            </span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Control Total de su Operación Comercial
            </h1>
            <p class="text-sm text-slate-400 leading-relaxed">
              Facturación en tiempo real, inventario multimoneda con tasas BCV, Kardex automatizado, producción MRP y auditoría inmutable de transacciones.
            </p>
          </div>

          <!-- Feature Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 text-xs">
            <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 backdrop-blur-xs">
              <div class="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <mat-icon class="text-lg">point_of_sale</mat-icon>
              </div>
              <div>
                <h2 class="font-bold text-white text-xs">Punto de Venta & Facturación</h2>
                <p class="text-slate-400 text-[11px] mt-0.5">Emisión rápida en USD y Bolívares con soporte para múltiples métodos de pago.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 backdrop-blur-xs">
              <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <mat-icon class="text-lg">inventory_2</mat-icon>
              </div>
              <div>
                <h2 class="font-bold text-white text-xs">Kardex & Costo Promedio Ponderado</h2>
                <p class="text-slate-400 text-[11px] mt-0.5">Cálculo de CPP en tiempo real con auditoría de recepción y mermas.</p>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 backdrop-blur-xs">
              <div class="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <mat-icon class="text-lg">shield</mat-icon>
              </div>
              <div>
                <h2 class="font-bold text-white text-xs">Auditoría con Garantía de No-Repudio</h2>
                <p class="text-slate-400 text-[11px] mt-0.5">Registro estricto de cambios de precios, ajustes de stock y arqueos de caja.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Login & RBAC Demo Selector Card -->
        <div class="lg:col-span-7">
          <div class="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
            
            <!-- Glow Accent -->
            <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Mode Selector Tabs (Formulario vs Selector Rápido Demo) -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-white">Iniciar Sesión</h2>
                <p class="text-xs text-slate-400 mt-0.5">Ingrese sus credenciales corporativas</p>
              </div>
            </div>

            @if (authService.tenantResolutionPending()) {
              <p class="mb-5 text-xs text-slate-400">Verificando el espacio de trabajo...</p>
            } @else if (authService.tenantContext(); as tenant) {
              <p class="mb-5 text-xs text-slate-400">Espacio de trabajo: <span class="font-semibold text-slate-200">{{ tenant.name }}</span></p>
            } @else if (authService.isAdminDomain()) {
              <p class="mb-5 text-xs text-slate-400">Acceso administrativo seguro.</p>
            } @else if (authService.tenantResolutionFailure() === 'tenant-unavailable') {
              <p class="mb-5 text-xs text-rose-300">El espacio de trabajo no existe o está inactivo.</p>
            } @else {
              <p class="mb-5 text-xs text-amber-300">No se detectó un espacio de trabajo. En desarrollo usa <span class="font-mono">&lt;slug&gt;.localhost</span>.</p>
            }

            <!-- Alert / Error Message -->
            @if (errorMessage()) {
              <div class="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <mat-icon class="text-rose-400 shrink-0 text-base">error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            @if (successMessage()) {
              <div class="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <mat-icon class="text-emerald-400 shrink-0 text-base">check_circle</mat-icon>
                <span>{{ successMessage() }}</span>
              </div>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onSubmitCredentials()" class="space-y-4 text-xs">
                
                <div>
                  <label for="login-email" class="block font-semibold text-slate-300 mb-1.5">
                    Correo Corporativo / Usuario
                  </label>
                  <div class="relative">
                    <input 
                      id="login-email"
                      type="email" 
                      formControlName="email"
                      placeholder="admin.morales@Helameb.com" 
                      class="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                    <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">mail</mat-icon>
                  </div>
                  @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                    <p class="text-rose-400 text-[11px] mt-1">Ingrese un correo válido.</p>
                  }
                </div>

                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label for="login-password" class="font-semibold text-slate-300">
                      Contraseña de Acceso
                    </label>
                  </div>
                  <div class="relative">
                    <input 
                      id="login-password"
                      [type]="showPassword() ? 'text' : 'password'" 
                      formControlName="password"
                      placeholder="••••••••••••" 
                      class="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono" />
                    <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">lock</mat-icon>
                    
                    <button 
                      type="button"
                      (click)="showPassword.set(!showPassword())"
                      class="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer">
                      <mat-icon class="text-base">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <label class="flex items-center space-x-2 cursor-pointer select-none">
                    <input type="checkbox" formControlName="rememberMe" class="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0" />
                    <span>Recordar sesión en este equipo</span>
                  </label>
                </div>

                <button 
                  id="btn-login-submit"
                  type="submit"
                  [disabled]="isLoading() || authService.tenantResolutionPending() || (!authService.isAdminDomain() && !authService.tenantContext())"
                  class="w-full mt-2 py-3 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50">
                  @if (isLoading()) {
                    <mat-icon class="animate-spin text-base">refresh</mat-icon>
                    <span>Verificando Credenciales...</span>
                  } @else {
                    <mat-icon class="text-base">login</mat-icon>
                    <span>Ingresar al Sistema</span>
                  }
                </button>

            </form>

            <!-- Security Footnote -->
            <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-emerald-500 text-xs">lock</mat-icon>
                <span>Sesión cifrada con JWT HS256 & HTTPS</span>
              </div>
              <span class="font-mono">Helameb Security Gateway</span>
            </div>

          </div>
        </div>

      </main>

      <!-- Footer -->
      <footer class="w-full max-w-7xl mx-auto py-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>
          © 2026 Helameb ERP Enterprise. Todos los derechos reservados.
        </div>
        <div class="flex items-center space-x-4">
          <span>Trazabilidad PostgreSQL ACID</span>
          <span>•</span>
          <span>Interconectividad BCV Oficial</span>
          <span>•</span>
          <span>Soporte Facturación Fiscal</span>
        </div>
      </footer>

    </div>
  `
})
export default class LoginComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(true)
  });

  ngOnInit(): void {
    this.authService.resolveTenantFromHost().subscribe();
    if (this.authService.isAuthenticated()) {
      const destination = this.authService.isSuperAdmin()
        ? (this.authService.hasTenantContext() ? ['/app/dashboard'] : ['/master/super-admin'])
        : ['/app/dashboard'];
      void this.router.navigate(destination);
    }
  }

  onSubmitCredentials(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Por favor, complete todos los campos requeridos correctamente.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email || '', password || '')
      .subscribe({
        next: (result)=> {
          if (result) {
            this.successMessage.set('Autenticación exitosa. Redirigiendo al espacio de trabajo...');
            this.isLoading.set(false);
            const destination = this.authService.isSuperAdmin()
              ? (this.authService.hasTenantContext() ? ['/app/dashboard'] : ['/master/super-admin'])
              : ['/app/dashboard'];
            void this.router.navigate(destination);
          } else {
            this.isLoading.set(false);
            const failure = this.authService.lastAuthFailure();
            this.errorMessage.set(failure === 'credentials'
              ? 'Las credenciales no son válidas.'
              : failure === 'tenant-unavailable'
                ? 'No se pudo validar el acceso al espacio de trabajo.'
                : failure === 'admin-domain'
                  ? 'No se pudo validar el acceso administrativo.'
                  : 'No se pudo validar el acceso.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error during login:', err);
          this.errorMessage.set('Error al validar credenciales. Por favor, intente nuevamente.');
        },
      });

  }

  getRoleName(role: UserRole): string {
    const r = this.authService.roles.find(item => item.id === role);
    return r ? r.name : role;
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case 'ADMIN':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'OPERATIONS_MANAGER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CASHIER_SELLER':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'WAREHOUSE_KEEPER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'AUDITOR':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  }
}
