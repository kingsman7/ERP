import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService, NAV_PERMISSIONS } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
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
    NgClass,
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
          <div class="pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start space-x-3 text-xs backdrop-blur-md transition-all duration-200"
            [ngClass]="getToastContainerClass(n.type)">
            <mat-icon class="text-base shrink-0 mt-0.5" [ngClass]="getToastIconClass(n.type)">
              {{ n.type === 'success' ? 'check_circle' : (n.type === 'error' ? 'error' : (n.type === 'warning' ? 'warning' : 'info')) }}
            </mat-icon>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-xs" [ngClass]="getToastTitleClass(n.type)">{{ n.title }}</p>
              <p class="text-[11px] mt-0.5 leading-relaxed break-words" [ngClass]="getToastMessageClass(n.type)">{{ n.message }}</p>
            </div>
            <button (click)="dismissToast(n.id)" class="text-slate-400 hover:text-white shrink-0 p-0.5 rounded-md hover:bg-white/10 transition-colors">
              <mat-icon class="text-sm">close</mat-icon>
            </button>
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

   /*  effect(() => {
      if (!this.authService.sessionExpired()) return;
      this.stateService.notify('warning', 'Sesion vencida', 'La sesion vencio y no pudo renovarse. Inicia sesion nuevamente para continuar.');
      this.authService.acknowledgeSessionExpired();
    }); */
  }

  navigateTo(navId: NavTab): void {
    if (navId === 'architecture') {
      this.showArchModal.set(true);
      return;
    }
    if (navId === 'company-admin') {
      if (!this.authService.isSuperAdmin()) {
        this.stateService.notify(
          'warning',
          'Acceso No Autorizado',
          'El módulo de Empresa y Suscripción está restringido exclusivamente a Super Administradores.'
        );
        return;
      }
      void this.router.navigate(['/app/company-admin']);
      return;
    }

    if (!this.authService.canAccessNav(navId)) {
      const rule = NAV_PERMISSIONS[navId];
      const title = rule?.title || navId;
      const roleName = this.authService.currentRoleConfig().name;
      this.stateService.notify(
        'warning',
        'Acceso No Autorizado',
        `No tienes permisos para acceder al módulo "${title}". Tu rol actual es ${roleName}.`
      );
      return;
    }

    this.router.navigate(['/app', navId]);
  }

  dismissToast(id: string): void {
    this.stateService.dismissNotification(id);
  }

  getToastContainerClass(type: string): string {
    switch (type) {
      case 'error':
        return 'bg-slate-900/98 border-rose-500/50 text-white shadow-rose-950/40 ring-1 ring-rose-500/20';
      case 'warning':
        return 'bg-slate-900/98 border-amber-500/50 text-white shadow-amber-950/40 ring-1 ring-amber-500/20';
      case 'success':
        return 'bg-slate-900/98 border-emerald-500/50 text-white shadow-emerald-950/40 ring-1 ring-emerald-500/20';
      default:
        return 'bg-slate-900/98 border-sky-500/50 text-white shadow-sky-950/40 ring-1 ring-sky-500/20';
    }
  }

  getToastIconClass(type: string): string {
    switch (type) {
      case 'error':
        return 'text-rose-400';
      case 'warning':
        return 'text-amber-400';
      case 'success':
        return 'text-emerald-400';
      default:
        return 'text-sky-400';
    }
  }

  getToastTitleClass(type: string): string {
    switch (type) {
      case 'error':
        return 'text-rose-200';
      case 'warning':
        return 'text-amber-200';
      case 'success':
        return 'text-emerald-200';
      default:
        return 'text-sky-200';
    }
  }

  getToastMessageClass(type: string): string {
    switch (type) {
      case 'error':
        return 'text-rose-100/90';
      case 'warning':
        return 'text-amber-100/90';
      case 'success':
        return 'text-emerald-100/90';
      default:
        return 'text-slate-300';
    }
  }
}
