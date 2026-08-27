import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';
import { User } from '../../models/erp.models';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      
      <!-- Subtle Background Ambient Grid & Radial Glows -->
      <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        <!-- Logo & Brand Header -->
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 text-white font-black text-2xl mb-3 border border-blue-400/30">
            4
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            4-InLine <span class="text-blue-400 font-semibold">ERP</span>
          </h1>
          <p class="mt-1 text-xs text-slate-400 font-medium">
            Enterprise Suite v2.5 • Gestión Integral & Finanzas NIIF
          </p>

          <!-- BCV Ticker Pill -->
          <div class="inline-flex items-center gap-2 px-3 py-1 mt-3 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-mono shadow-inner">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-slate-400">Tasa Oficial BCV:</span>
            <span class="font-bold text-white">Bs. {{ stateService.bcvState().usdRate.toFixed(2) }} / USD</span>
          </div>
        </div>

      </div>

      <!-- Main Login & Fast-Access Container -->
      <div class="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div class="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          
          <!-- Mode Tabs (Credenciales vs Acceso Rápido Demo) -->
          <div class="flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-700/60 mb-6">
            <button 
              type="button"
              (click)="authMode.set('CREDENTIALS')"
              [class]="authMode() === 'CREDENTIALS' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'"
              class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <mat-icon class="text-base">lock</mat-icon>
              <span>Ingreso con Credenciales</span>
            </button>

            <button 
              type="button"
              (click)="authMode.set('DEMO_PROFILES')"
              [class]="authMode() === 'DEMO_PROFILES' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'"
              class="flex-1 py-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <mat-icon class="text-base">group</mat-icon>
              <span>Perfiles Demo (1 Clic)</span>
            </button>
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage()) {
            <div class="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <mat-icon class="text-rose-400 text-base shrink-0 mt-0.5">error</mat-icon>
              <div class="flex-1">
                <p class="font-bold">Error de Autenticación</p>
                <p class="text-[11px] text-rose-200/90 mt-0.5">{{ errorMessage() }}</p>
              </div>
              <button (click)="errorMessage.set('')" class="text-rose-400 hover:text-rose-200">
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            </div>
          }

          <!-- TAB 1: FORMULARIO DE CREDENCIALES -->
          @if (authMode() === 'CREDENTIALS') {
            <form [formGroup]="loginForm" (ngSubmit)="onLoginSubmit()" class="space-y-4">
              
              <div>
                <label for="emailInput" class="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario o Correo Electrónico
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <mat-icon class="text-base">person</mat-icon>
                  </div>
                  <input 
                    id="emailInput"
                    type="text" 
                    formControlName="email"
                    placeholder="ej. admin.morales@4-inLine.com"
                    class="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" />
                </div>
                @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
                  <p class="text-[10px] text-rose-400 mt-1">Ingrese su usuario o correo registrado.</p>
                }
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="passwordInput" class="block text-xs font-semibold text-slate-300">
                    Contraseña de Acceso
                  </label>
                  <button 
                    type="button"
                    (click)="fillDefaultPassword()" 
                    class="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer">
                    Usar demo: password123
                  </button>
                </div>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <mat-icon class="text-base">key</mat-icon>
                  </div>
                  <input 
                    id="passwordInput"
                    [type]="showPassword() ? 'text' : 'password'" 
                    formControlName="password"
                    placeholder="••••••••••••"
                    class="w-full pl-9 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" />
                  <button 
                    type="button" 
                    (click)="showPassword.set(!showPassword())"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer">
                    <mat-icon class="text-base">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <label class="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    formControlName="rememberMe"
                    class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20" />
                  <span>Recordar sesión en este equipo</span>
                </label>

                <button 
                  type="button"
                  (click)="authMode.set('DEMO_PROFILES')"
                  class="text-xs text-blue-400 hover:text-blue-300 font-medium">
                  ¿Olvidó contraseña?
                </button>
              </div>

              <button 
                type="submit" 
                [disabled]="isLoading() || loginForm.invalid"
                class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
                @if (isLoading()) {
                  <mat-icon class="animate-spin text-base">progress_activity</mat-icon>
                  <span>Verificando credenciales...</span>
                } @else {
                  <mat-icon class="text-base">login</mat-icon>
                  <span>Iniciar Sesión en 4-inLine</span>
                }
              </button>

            </form>
          }

          <!-- TAB 2: ACCESO RÁPIDO POR PERFILES DEMO -->
          @if (authMode() === 'DEMO_PROFILES') {
            <div class="space-y-3">
              <p class="text-xs text-slate-300 font-medium">
                Seleccione un perfil corporativo para ingresar de inmediato con los permisos asociados:
              </p>

              <div class="grid grid-cols-1 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                @for (user of authService.users(); track user.id) {
                  <button 
                    type="button"
                    (click)="quickLogin(user.id)"
                    class="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-700/70 hover:border-blue-500/60 transition-all flex items-center justify-between text-left group cursor-pointer">
                    
                    <div class="flex items-center space-x-3 min-w-0">
                      <img 
                        [src]="user.avatarUrl" 
                        [alt]="user.name"
                        class="w-10 h-10 rounded-xl object-cover border border-slate-700 group-hover:border-blue-400 shrink-0" />
                      
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <p class="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                            {{ user.name }}
                          </p>
                          @if (user.status === 'INACTIVO') {
                            <span class="px-1.5 py-0.2 bg-rose-900/60 text-rose-300 text-[9px] rounded font-bold">Inactivo</span>
                          }
                        </div>
                        <p class="text-[11px] text-slate-400 font-mono truncate">{{ user.email }}</p>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2 shrink-0">
                      <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold border"
                        [class]="getRoleBadgeClass(user.role)">
                        {{ getRoleLabel(user.role) }}
                      </span>
                      <mat-icon class="text-slate-500 group-hover:text-blue-400 text-base transition-transform group-hover:translate-x-0.5">
                        chevron_right
                      </mat-icon>
                    </div>

                  </button>
                }
              </div>
            </div>
          }

          <!-- Security Badge Footer -->
          <div class="mt-6 pt-5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-emerald-400 text-sm">lock</mat-icon>
              <span>Autenticación RBAC Segura</span>
            </div>
            <div class="flex items-center gap-1.5">
              <mat-icon class="text-blue-400 text-sm">cloud_done</mat-icon>
              <span>Google Cloud Firestore Ready</span>
            </div>
          </div>

        </div>
      </div>

      <!-- App Copyright -->
      <div class="text-center mt-6 text-[11px] text-slate-500 relative z-10">
        4-InLine Enterprise Core ERP Suite &copy; 2026 • Diseñado para alta disponibilidad y auditoría
      </div>

    </div>
  `
})
export class LoginComponent {
  authService = inject(AuthService);
  stateService = inject(ErpStateService);
  private fb = inject(FormBuilder);

  authMode = signal<'CREDENTIALS' | 'DEMO_PROFILES'>('CREDENTIALS');
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  loginForm = this.fb.group({
    email: ['admin.morales@4-inLine.com', [Validators.required]],
    password: ['password123', [Validators.required, Validators.minLength(4)]],
    rememberMe: [true]
  });

  fillDefaultPassword() {
    this.loginForm.patchValue({ password: 'password123' });
  }

  onLoginSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password, rememberMe } = this.loginForm.value;

    setTimeout(() => {
      const res = this.authService.login(email || '', password || '', !!rememberMe);
      this.isLoading.set(false);

      if (!res.success) {
        this.errorMessage.set(res.message);
      } else {
        this.stateService.notify('success', 'Sesión Iniciada', `Bienvenido al ERP, ${res.user?.name}`);
      }
    }, 300);
  }

  quickLogin(userId: string) {
    this.isLoading.set(true);
    setTimeout(() => {
      const res = this.authService.loginAsDemoUser(userId, true);
      this.isLoading.set(false);
      if (res.success) {
        this.stateService.notify('success', 'Sesión Iniciada', `Conectado como ${res.user?.name}`);
      }
    }, 200);
  }

  getRoleLabel(roleId: string): string {
    const role = this.authService.roles().find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  getRoleBadgeClass(roleId: string): string {
    const role = this.authService.roles().find(r => r.id === roleId);
    if (!role) return 'bg-slate-700 text-slate-300 border-slate-600';
    return role.badgeClass.replace('bg-', 'bg-').replace('text-', 'text-');
  }
}
