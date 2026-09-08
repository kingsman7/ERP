import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';

@Component({
  selector: 'app-change-password-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      
      <!-- Modal Card Container -->
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <mat-icon class="text-xl">lock_reset</mat-icon>
            </div>
            <div>
              <h3 class="font-bold text-sm tracking-tight">Cambiar Mi Contraseña</h3>
              <p class="text-xs text-slate-300 font-mono">{{ targetUser().email || authService.currentUser().email }}</p>
            </div>
          </div>

          <!-- Close Button -->
          @if (!targetUser().mustChangePassword) {
            <button 
              type="button"
              (click)="close()" 
              class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
              <mat-icon class="text-lg">close</mat-icon>
            </button>
          }
        </div>

        <!-- Notification Banner if Password is Temporary -->
        @if (targetUser().mustChangePassword) {
          <div class="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
            <mat-icon class="text-amber-600 shrink-0 text-base mt-0.5">warning</mat-icon>
            <div>
              <p class="font-bold">Clave Temporal Asignada</p>
              <p class="text-[11px] text-amber-800 mt-0.5">
                El Administrador estableció una clave provisional para esta cuenta. Por seguridad, debes establecer una contraseña definitiva personal.
              </p>
            </div>
          </div>
        }

        <!-- Form Body -->
        <div class="p-6 text-xs space-y-4">

          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
              <mat-icon class="text-rose-500 shrink-0 text-base">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
              <mat-icon class="text-emerald-600 shrink-0 text-base">check_circle</mat-icon>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="space-y-4">

            <!-- Field 1: Contraseña Actual / Temporal -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="current-pwd" class="font-semibold text-slate-700">
                  Contraseña Actual o Temporal <span class="text-rose-500">*</span>
                </label>
                @if (targetUser().mustChangePassword) {
                  <span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">Clave Provisoria</span>
                }
              </div>
              <div class="relative">
                <input 
                  id="current-pwd"
                  [type]="showCurrent() ? 'text' : 'password'"
                  formControlName="currentPassword"
                  placeholder="Ingresa tu clave actual o temporal"
                  class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono" />
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">vpn_key</mat-icon>
                <button 
                  type="button"
                  (click)="showCurrent.set(!showCurrent())"
                  class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <mat-icon class="text-base">{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (passwordForm.get('currentPassword')?.touched && passwordForm.get('currentPassword')?.invalid) {
                <p class="text-rose-500 text-[11px] mt-1">La contraseña actual es obligatoria.</p>
              }
            </div>

            <!-- Field 2: Nueva Contraseña -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="new-pwd" class="font-semibold text-slate-700">
                  Nueva Contraseña Personal <span class="text-rose-500">*</span>
                </label>
                <span class="text-[10px] text-slate-400 font-mono">Mínimo 6 caracteres</span>
              </div>
              <div class="relative">
                <input 
                  id="new-pwd"
                  [type]="showNew() ? 'text' : 'password'"
                  formControlName="newPassword"
                  placeholder="Define tu nueva clave segura"
                  class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono" />
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">lock</mat-icon>
                <button 
                  type="button"
                  (click)="showNew.set(!showNew())"
                  class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <mat-icon class="text-base">{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (passwordForm.get('newPassword')?.touched && passwordForm.get('newPassword')?.invalid) {
                <p class="text-rose-500 text-[11px] mt-1">La nueva clave debe contener al menos 6 caracteres.</p>
              }

              <!-- Strength Indicator -->
              <div class="mt-2 flex items-center space-x-1.5">
                <div class="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    class="h-full transition-all duration-300"
                    [class]="strengthClass()"></div>
                </div>
                <span class="text-[10px] font-mono text-slate-500">{{ strengthText() }}</span>
              </div>
            </div>

            <!-- Field 3: Confirmar Nueva Contraseña -->
            <div>
              <label for="confirm-pwd" class="block font-semibold text-slate-700 mb-1.5">
                Confirmar Nueva Contraseña <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input 
                  id="confirm-pwd"
                  [type]="showConfirm() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Repite la nueva clave"
                  class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono" />
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">verified</mat-icon>
                <button 
                  type="button"
                  (click)="showConfirm.set(!showConfirm())"
                  class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <mat-icon class="text-base">{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (passwordMismatch()) {
                <p class="text-rose-500 text-[11px] mt-1">Las contraseñas no coinciden.</p>
              }
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              @if (!targetUser().mustChangePassword) {
                <button 
                  type="button"
                  (click)="close()"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
              }

              <button 
                id="btn-save-new-password"
                type="submit"
                [disabled]="isSubmitting() || passwordForm.invalid || passwordMismatch()"
                class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isSubmitting()) {
                  <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                  <span>Guardando...</span>
                } @else {
                  <mat-icon class="text-sm">check</mat-icon>
                  <span>Actualizar Contraseña</span>
                }
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  `
})
export class ChangePasswordModalComponent {
  authService = inject(AuthService);
  stateService = inject(ErpStateService);

  showCurrent = signal<boolean>(false);
  showNew = signal<boolean>(false);
  showConfirm = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  targetUser = computed(() => {
    return this.authService.targetUserForPasswordChange() || this.authService.currentUser() ;
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  passwordMismatch = computed(() => {
    const newPwd = this.passwordForm.get('newPassword')?.value;
    const confirmPwd = this.passwordForm.get('confirmPassword')?.value;
    if (!newPwd || !confirmPwd) return false;
    return newPwd !== confirmPwd;
  });

  strengthClass = computed(() => {
    const pwd = this.passwordForm.get('newPassword')?.value || '';
    if (pwd.length === 0) return 'w-0 bg-transparent';
    if (pwd.length < 6) return 'w-1/4 bg-rose-500';
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
    if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 8) return 'w-full bg-emerald-500';
    if ((hasLetters && hasNumbers) || pwd.length >= 8) return 'w-2/3 bg-amber-500';
    return 'w-1/3 bg-rose-400';
  });

  strengthText = computed(() => {
    const pwd = this.passwordForm.get('newPassword')?.value || '';
    if (pwd.length === 0) return 'Vacía';
    if (pwd.length < 6) return 'Insegura (<6)';
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
    if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 8) return 'Fuerte';
    if ((hasLetters && hasNumbers) || pwd.length >= 8) return 'Media';
    return 'Básica';
  });

  close(): void {
    this.authService.closeChangePasswordModal();
  }

  onSubmit(): void {
    if (this.passwordForm.invalid || this.passwordMismatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const currentPwd = this.passwordForm.get('currentPassword')?.value || '';
    const newPwd = this.passwordForm.get('newPassword')?.value || '';
    const user = this.targetUser();

    if (!user) {
      this.errorMessage.set('Usuario no válido para el cambio de contraseña.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    setTimeout(() => {
      const res = this.authService.changePassword(user.id, currentPwd, newPwd);
      this.isSubmitting.set(false);

      if (res.success) {
        this.successMessage.set('Contraseña actualizada exitosamente. Tu nueva clave está activa.');
        
        this.stateService.logAudit(
          'USER_LOGIN',
          'AUTH',
          `Cambio de contraseña: ${user.name}`,
          `El usuario ${user.email} actualizó exitosamente su contraseña personal en el sistema ERP.`,
          undefined,
          { userId: user.id, email: user.email, mustChangePassword: false },
          undefined,
          true,
          'SECURITY_ROLE'
        );

        setTimeout(() => {
          this.close();
        }, 1200);
      } else {
        this.errorMessage.set(res.message || 'Error al cambiar la contraseña.');
      }
    }, 400);
  }
}
