import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { SuperAdminService } from '../../modules/super-admin/services/super-admin.service';
import { HeaderComponent } from '../../components/header/header';
import { SidebarComponent, NavTab } from '../../components/sidebar/sidebar';
import { ArchitectureModal } from '../../components/architecture-modal/architecture-modal';
import { KeyboardShortcutsModalComponent } from '../../components/keyboard-shortcuts-modal/keyboard-shortcuts-modal';
import { CompanyProfileModalComponent } from '../../components/company-profile-modal/company-profile-modal';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal';

@Component({
  selector: 'app-private-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    RouterOutlet,
    HeaderComponent,
    SidebarComponent,
    ArchitectureModal,
    KeyboardShortcutsModalComponent,
    CompanyProfileModalComponent,
    ChangePasswordModalComponent
  ],
  template: `
    <div class="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      @if (superAdminService.activeImpersonation(); as session) {
        <div class="bg-linear-to-r from-amber-600 via-amber-700 to-amber-600 text-white px-4 py-2.5 shadow-xl border-b border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-2 z-50 sticky top-0 text-xs">
          <div class="flex items-center space-x-2.5 min-w-0">
            <mat-icon class="text-base shrink-0">support_agent</mat-icon>
            <div class="truncate">
              <span class="font-black uppercase tracking-wider text-[10px] bg-black/30 px-2 py-0.5 rounded-full mr-2 font-mono">SESION DE SOPORTE ACTIVA</span>
              <span>Operando en el tenant: <strong class="underline">{{ session.tenantName }}</strong> ({{ session.tenantSlug }})</span>
            </div>
          </div>
          <button (click)="superAdminService.stopImpersonation()" class="px-3.5 py-1.5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-xl border border-white/30 text-xs flex items-center space-x-1.5 cursor-pointer">
            <mat-icon class="text-sm">logout</mat-icon>
            <span>Finalizar Soporte y Volver a SuperAdmin</span>
          </button>
        </div>
      }

      <app-header
        (openArchitecture)="showArchModal.set(true)"
        (openCash)="navigateTo('cash-closing')"
        (openAudit)="navigateTo('audit-log')"
        (openCompanyProfile)="showCompanyProfileModal.set(true)" />

      <div class="flex-1 flex overflow-hidden">
        <app-sidebar
          [activeTab]="activeNavId()"
          (tabChange)="navigateTo($event)" />

        <main class="flex-1 overflow-y-auto p-4 h-[calc(100vh-4rem)] sm:p-6 lg:p-7 max-w-7xl mx-auto w-full">
          <router-outlet />
        </main>
      </div>

      <div class="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        @if (shortcutService.activeShortcutToast(); as hud) {
          <div class="pointer-events-auto p-3 bg-slate-900/95 border border-blue-500/50 text-white rounded-2xl shadow-2xl flex items-center justify-between space-x-3 text-xs">
            <div class="flex items-center space-x-2">
              <mat-icon class="text-sm text-blue-400">bolt</mat-icon>
              <p class="font-bold text-white text-xs">{{ hud.title }}</p>
            </div>
            <kbd class="px-2 py-1 bg-slate-800 border border-slate-700 text-blue-400 font-mono font-bold rounded-lg text-xs">{{ hud.keyDisplay }}</kbd>
          </div>
        }
        @for (n of stateService.notifications(); track n.id) {
          <div class="pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start space-x-3 text-xs bg-slate-900/95 border-slate-700 text-white">
            <mat-icon class="text-base shrink-0 mt-0.5">{{ n.type === 'success' ? 'check_circle' : (n.type === 'error' ? 'error' : (n.type === 'warning' ? 'warning' : 'info')) }}</mat-icon>
            <div class="flex-1 min-w-0"><p class="font-bold text-xs">{{ n.title }}</p><p class="text-[11px] text-slate-300 mt-0.5">{{ n.message }}</p></div>
            <button (click)="dismissToast(n.id)" class="text-slate-400 hover:text-white shrink-0"><mat-icon class="text-sm">close</mat-icon></button>
          </div>
        }
      </div>

      @if (shortcutService.showPalette()) { <app-keyboard-shortcuts-modal /> }
      @if (showArchModal()) { <app-architecture-modal (closeModal)="showArchModal.set(false)" /> }
      @if (showCompanyProfileModal()) { <app-company-profile-modal (closeModal)="showCompanyProfileModal.set(false)" /> }
      @if (authService.showChangePasswordModal()) { <app-change-password-modal /> }
    </div>
  `
})
export class PrivateShellComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);
  superAdminService = inject(SuperAdminService);
  private router = inject(Router);

  activeNavId = signal<NavTab>('dashboard');
  showArchModal = signal(false);
  showCompanyProfileModal = signal(false);

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const route = (event as NavigationEnd).urlAfterRedirects.split('/')[2] as NavTab | undefined;
      if (route) this.activeNavId.set(route);
    });

    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NAV_ARCH') this.showArchModal.set(true);
      if (action?.targetNav) this.navigateTo(action.targetNav);
    });

    effect(() => {
      if (!this.authService.sessionExpired()) return;
      this.stateService.notify('warning', 'Sesion vencida', 'La sesion vencio y no pudo renovarse. Inicia sesion nuevamente para continuar.');
      this.authService.acknowledgeSessionExpired();
    });
  }

  navigateTo(navId: NavTab): void {
    if (navId === 'architecture') {
      this.showArchModal.set(true);
      return;
    }
    this.router.navigate(['/app', navId]);
  }

  dismissToast(id: string): void {
    this.stateService.dismissNotification(id);
  }
}
