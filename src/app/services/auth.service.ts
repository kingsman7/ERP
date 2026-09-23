import { Injectable, signal, computed, inject } from '@angular/core';
import { User, RoleConfig, UserRole, AuthUser } from '../models/erp.models';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AuditService } from './audit.servie';

export const SYSTEM_ROLES: RoleConfig[] = [
  {
    id: 'SUPERADMIN' as UserRole,
    name: 'Super Administrador',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Acceso total a configuración, auditoría, finanzas, tesorería, bancos, inventario y seguridad.',
    permissions: ['all', 'security:manage', 'audit:view', 'inventory:adjust', 'sales:manage', 'purchases:manage', 'reports:export', 'treasury:manage', 'treasury:view', 'accounting:manage']
  },
  {
    id: 'ADMIN',
    name: 'Administrador de Tenant',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Administración del tenant y sus operaciones autorizadas.',
    permissions: ['security:manage', 'audit:view', 'inventory:adjust', 'sales:manage', 'purchases:manage', 'reports:export', 'treasury:manage', 'treasury:view', 'accounting:manage']
  },
  {
    id: 'OPERATIONS_MANAGER',
    name: 'Gerente de Operaciones',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Gestión de compras, tesorería, cuentas por pagar/cobrar, kardex, inventario y presupuestos.',
    permissions: ['inventory:view', 'inventory:adjust', 'purchases:manage', 'sales:view', 'reports:view', 'quotes:manage', 'treasury:view', 'treasury:manage']
  },
  {
    id: 'CASHIER_SELLER',
    name: 'Cajero / Vendedor',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Emisión de facturas POS, presupuestos rápidos, búsqueda de productos y caja.',
    permissions: ['sales:pos', 'quotes:create', 'products:search', 'cash:shift']
  },
  {
    id: 'WAREHOUSE_KEEPER',
    name: 'Encargado de Almacén',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Recepción de compras, control de stock, mermas con soporte y consulta de Kardex.',
    permissions: ['inventory:view', 'inventory:adjust', 'purchases:receive', 'kardex:view']
  },
  {
    id: 'AUDITOR',
    name: 'Auditor de Cumplimiento',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Acceso de solo lectura a bitácora de auditoría, trazabilidad de Kardex y reportes fiscales.',
    permissions: ['audit:view', 'kardex:view', 'reports:view', 'inventory:view']
  }
];

const UNAUTHENTICATED_USER: User = {
  id: '',
  name: '',
  email: '',
  role: 'AUDITOR',
  status: 'INACTIVO'
};

export interface PublicTenantContext {
  slug: string;
  name: string;
  status: string;
}

export interface ImpersonationContext extends PublicTenantContext {
  id: string;
  expiresIn: string;
}

interface StoredSession {
  user: User;
  accessToken: string;
  impersonationContext?: ImpersonationContext;
}

interface ImpersonationResponse {
  impersonationToken: string;
  tenant: ImpersonationContext;
  targetUser: { id: string; email: string; name: string; role: string };
  expiresIn: string;
}

export type AuthFailure = 'tenant-unavailable' | 'credentials' | 'admin-domain' | 'tenant-required';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private static readonly SESSION_KEY = '4inline_erp_session_v1';
  private http = inject(HttpClient);
  private baseUrl = '/api';
  auditService = inject(AuditService);

  private usersSignal = signal<User[]>([]);
  private currentUserSignal = signal<User>(this.loadStoredSession()?.user ?? UNAUTHENTICATED_USER);
  private tokenSignal = signal<string>('');
  private isAuthenticatedSignal = signal<boolean>(false);
  private authInitializedSignal = signal<boolean>(false);
  private tenantContextSignal = signal<PublicTenantContext | null>(null);
  private impersonationContextSignal = signal<ImpersonationContext | null>(this.loadStoredSession()?.impersonationContext ?? null);
  private tenantResolutionPendingSignal = signal<boolean>(false);
  private tenantResolutionFailureSignal = signal<'tenant-unavailable' | 'admin-domain' | 'tenant-required' | null>(null);
  private lastAuthFailureSignal = signal<AuthFailure | null>(null);

  // Global Change Password Modal State
  readonly showChangePasswordModal = signal<boolean>(false);
  readonly targetUserForPasswordChange = signal<User | null>(null);

  readonly users = this.usersSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  readonly authInitialized = this.authInitializedSignal.asReadonly();
  readonly tenantContext = this.tenantContextSignal.asReadonly();
  readonly impersonationContext = this.impersonationContextSignal.asReadonly();
  readonly tenantResolutionPending = this.tenantResolutionPendingSignal.asReadonly();
  readonly tenantResolutionFailure = this.tenantResolutionFailureSignal.asReadonly();
  readonly lastAuthFailure = this.lastAuthFailureSignal.asReadonly();
  readonly isAdminDomain = computed(() => this.tenantResolutionFailureSignal() === 'admin-domain');

  readonly currentRoleConfig = computed(() => {
    const role = this.currentUserSignal().role;
    return SYSTEM_ROLES.find(r => r.id === role) || SYSTEM_ROLES[0];
  });

  readonly isSuperAdmin = computed(() => {
    const user = this.currentUserSignal();
    return (user.role as string) === 'SUPERADMIN';
  });

  loadUsersFromBackend(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`).pipe(
      tap(users => {
        if (Array.isArray(users)) this.usersSignal.set(users);
      }),
      catchError(() => of([]))
    );
  }

  readonly roles = SYSTEM_ROLES;

  constructor() {
    this.restoreSession();
  }

  private loadStoredSession(): StoredSession | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(AuthService.SESSION_KEY);
        if (stored) {
          const session = JSON.parse(stored);
          if (session?.user && typeof session.accessToken === 'string') {
            return { user: session.user, accessToken: session.accessToken, impersonationContext: session.impersonationContext };
          }
        }
      }
    } catch (e) {
      console.warn('Error loading auth session from localStorage:', e);
    }
    return null;
  }

  private persistSession(user: User, accessToken: string, impersonationContext = this.impersonationContextSignal()): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AuthService.SESSION_KEY, JSON.stringify({ user, accessToken, impersonationContext }));
      }
    } catch (e) {
      console.warn('Error persisting auth session:', e);
    }
  }

  private clearPersistedSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(AuthService.SESSION_KEY);
    }
  }

  private restoreSession(): void {
    const session = this.loadStoredSession();
    if (!session) {
      this.isAuthenticatedSignal.set(false);
      this.tokenSignal.set('');
      this.authInitializedSignal.set(true);
      return;
    }

    if (this.hasValidAccessToken(session.accessToken)) {
      this.currentUserSignal.set(session.user);
      this.isAuthenticatedSignal.set(true);
      this.tokenSignal.set(session.accessToken);
      this.impersonationContextSignal.set(session.impersonationContext ?? null);
      this.authInitializedSignal.set(true);
      return;
    }

    // The refresh token is an HttpOnly cookie, so it is intentionally not
    // stored in localStorage. Give it a chance to renew the access token
    // before the router evaluates the protected route.
    this.http.post<{ accessToken: string }>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe(result => {
      if (result?.accessToken && this.hasValidAccessToken(result.accessToken)) {
        this.currentUserSignal.set(session.user);
        this.tokenSignal.set(result.accessToken);
        this.isAuthenticatedSignal.set(true);
        this.persistSession(session.user, result.accessToken, session.impersonationContext);
      } else {
        this.handleExpiredSession();
      }
      this.authInitializedSignal.set(true);
    });
  }

  private hasValidAccessToken(token: string): boolean {
    try {
      const encodedPayload = token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  readonly sessionExpired = signal(false);

  handleExpiredSession(): void {
    this.clearPersistedSession();
    this.tokenSignal.set('');
    this.clearImpersonationContext();
    this.isAuthenticatedSignal.set(false);
    this.currentUserSignal.set(UNAUTHENTICATED_USER);
    this.sessionExpired.set(true);
  }

  acknowledgeSessionExpired(): void {
    this.sessionExpired.set(false);
  }

  openChangePasswordModal(user?: User): void {
    this.targetUserForPasswordChange.set(user || (this.isAuthenticatedSignal() ? this.currentUserSignal() : null));
    this.showChangePasswordModal.set(true);
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal.set(false);
    this.targetUserForPasswordChange.set(null);
  }

  resolveTenantFromHost(): Observable<PublicTenantContext | null> {
    const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const slug = this.slugFromHost(host);
    this.tenantResolutionPendingSignal.set(false);

    if (host === 'localhost' || this.isAdminHost(host)) {
      this.tenantContextSignal.set(null);
      this.tenantResolutionFailureSignal.set('admin-domain');
      return of(null);
    }
    if (!slug) {
      this.tenantResolutionFailureSignal.set('tenant-required');
      return of(null);
    }

    this.tenantResolutionPendingSignal.set(true);
    this.tenantResolutionFailureSignal.set(null);
    return this.http.get<{ tenantId?: string; slug: string; name: string; status: string }>(`${this.baseUrl}/auth/public/tenants/resolve/${encodeURIComponent(slug)}`).pipe(
      map(({ slug: resolvedSlug, name, status }) => ({ slug: resolvedSlug, name, status })),
      tap(context => {
        this.tenantContextSignal.set(context);
        this.tenantResolutionPendingSignal.set(false);
      }),
      catchError(() => {
        this.tenantContextSignal.set(null);
        this.tenantResolutionPendingSignal.set(false);
        this.tenantResolutionFailureSignal.set('tenant-unavailable');
        return of(null);
      })
    );
  }

  private slugFromHost(host: string): string | null {
    if (!host || host === 'localhost' || this.isAdminHost(host)) return null;
    if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length).split('.')[0] || null;
    const labels = host.split('.');
    return labels.length >= 3 ? labels[0] : null;
  }

  private isAdminHost(host: string): boolean {
    return host.split('.')[0] === 'admin';
  }

  login(email: string, password?: string): Observable<boolean> {
    this.lastAuthFailureSignal.set(null);
    const tenant = this.tenantContextSignal();
    const isMasterLogin = this.isAdminDomain();
    if (!tenant && !isMasterLogin) {
      this.lastAuthFailureSignal.set(this.tenantResolutionFailureSignal() === 'admin-domain' ? 'admin-domain' : 'tenant-required');
      return of(false);
    }

    const loginRequest = isMasterLogin
      ? this.http.post<AuthUser>(`${this.baseUrl}/v1/master/auth/login`, { email, password }, { withCredentials: true })
      : this.http.post<AuthUser>(`${this.baseUrl}/auth/login`, { email, password }, {
        withCredentials: true,
        headers: { 'x-tenant-slug': tenant!.slug }
      });

    return loginRequest
      .pipe(
      tap((user) => {
        if (user.user) {
          this.clearImpersonationContext();
          if (isMasterLogin) this.tenantContextSignal.set(null);
          this.currentUserSignal.set(user.user);
          this.tokenSignal.set(user.accessToken);
          this.persistSession(user.user, user.accessToken);
          this.isAuthenticatedSignal.set(true);
          this.auditService.createLog({
            userId: user.user.id,
            userName: user.user.name,
            userRole: user.user.role,
            action: 'LOGIN',
            module: 'AUTH',
            isCritical: false,
            details: { message: 'User logged in successfully' },
            ipAddress: '',
            createdAt: new Date()
          });
        }
      }),
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        this.lastAuthFailureSignal.set(error.status === 401 ? 'credentials' : 'tenant-unavailable');
        return of(false);
      })
    )
  }

  logout(): void {
    this.currentUserSignal.set(UNAUTHENTICATED_USER);
    this.tokenSignal.set('');
    this.clearImpersonationContext();
    this.tenantContextSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.clearPersistedSession();

    this.http.post(`${this.baseUrl}/auth/logout`, {}, {
      withCredentials: true
    }).subscribe({
      next: () => undefined,
      error: (err) => {
        console.error('Error during logout:', err);
      }
    });
  }

  setAuthenticated(authenticated: boolean): void {
    this.isAuthenticatedSignal.set(authenticated);
  }

  impersonateTenant(tenantId: string): Observable<ImpersonationResponse> {
    if (!this.isSuperAdmin() || !this.isUuid(tenantId)) {
      return new Observable(subscriber => subscriber.error(new Error('Solo un SUPERADMIN puede seleccionar un tenant válido')));
    }

    return this.http.post<ImpersonationResponse>(`${this.baseUrl}/v1/master/tenants/${encodeURIComponent(tenantId)}/impersonate`, {}).pipe(
      tap(response => {
        if (!response?.impersonationToken || response.tenant?.id !== tenantId || response.tenant.status !== 'ACTIVE') {
          throw new Error('Respuesta de impersonación inválida');
        }
        const context = { ...response.tenant, expiresIn: response.expiresIn };
        this.tokenSignal.set(response.impersonationToken);
        this.impersonationContextSignal.set(context);
        this.persistSession(this.currentUserSignal(), response.impersonationToken, context);
      })
    );
  }

  clearImpersonationContext(): void {
    this.impersonationContextSignal.set(null);
  }

  hasTenantContext(): boolean {
    const context = this.impersonationContextSignal();
    return Boolean(context && this.isUuid(context.id) && context.status === 'ACTIVE');
  }

  isTenantRequest(url: string): boolean {
    return url.includes('/api/')
      && !url.includes('/api/v1/master/')
      && !url.includes('/api/auth/public/')
      && !url.includes('/api/auth/login')
      && !url.includes('/api/auth/logout');
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  switchUser(user: User) {
    const updated = {
      ...user,
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    this.currentUserSignal.set(updated);
    
    // Update lastLogin in the users list too
    this.usersSignal.update(users => {
      const updatedList = users.map(u => u.id === user.id ? { ...u, lastLogin: updated.lastLogin } : u);
      return updatedList;
    });
  }

  addUser(
    newUser: Omit<User, 'id'>, 
    temporaryPassword?: string, 
    mustChangePassword: boolean = true
  ): User {
    const id = `usr-${Date.now().toString().slice(-6)}`;
    const user: User = {
      ...newUser,
      id,
      status: newUser.status || 'ACTIVO',
      createdAt: newUser.createdAt || new Date().toISOString().split('T')[0],
      avatarUrl: newUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      password: temporaryPassword || newUser.password || 'Temp2026*',
      mustChangePassword: mustChangePassword,
      temporaryPasswordSetAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    this.usersSignal.update(list => {
      const updatedList = [user, ...list];
      return updatedList;
    });
    return user;
  }

  updateUser(id: string, updates: Partial<User>): void {
    this.usersSignal.update(list => {
      const updatedList = list.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          if (this.currentUserSignal().id === id) {
            this.currentUserSignal.set(updated);
          }
          return updated;
        }
        return u;
      });
      return updatedList;
    });
  }

  updateCurrentUserAvatar(avatarUrl: string): Observable<void> {
    const user = this.currentUserSignal();
    if (!this.isAuthenticatedSignal() || !user.id) {
      return new Observable(subscriber => subscriber.error(new Error('No hay una sesión activa')));
    }

    return this.http.put<User>(`${this.baseUrl}/users/${user.id}`, { avatarUrl }).pipe(
      tap(updatedUser => {
        const updated = { ...user, ...updatedUser, avatarUrl };
        this.currentUserSignal.set(updated);
        this.persistSession(updated, this.tokenSignal());
        this.usersSignal.update(users => users.map(item => item.id === updated.id ? updated : item));
      }),
      map(() => undefined)
    );
  }

  adminSetUserPassword(
    userId: string, 
    temporaryPassword: string, 
    mustChangePassword: boolean = true
  ): { success: boolean; message?: string } {
    if (!temporaryPassword || temporaryPassword.trim().length < 6) {
      return { success: false, message: 'La contraseña temporal debe contener al menos 6 caracteres.' };
    }

    const trimmedPassword = temporaryPassword.trim();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.usersSignal.update(list => {
      const updatedList = list.map(u => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            password: trimmedPassword,
            mustChangePassword: mustChangePassword,
            temporaryPasswordSetAt: timestamp
          };
          if (this.currentUserSignal().id === userId) {
            this.currentUserSignal.set(updated);
          }
          return updated;
        }
        return u;
      });
      return updatedList;
    });

    return { success: true, message: 'Clave temporal establecida correctamente por el Administrador.' };
  }

  changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): { success: boolean; message?: string } {
    const user = this.usersSignal().find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    // Verify current password if user has one
    if (user.password && user.password !== currentPassword.trim()) {
      return { success: false, message: 'La contraseña actual ingresada es incorrecta.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    if (user.password && user.password === newPassword.trim()) {
      return { success: false, message: 'La nueva contraseña no puede ser idéntica a la anterior.' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.usersSignal.update(list => {
      const updatedList = list.map(u => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            password: newPassword.trim(),
            mustChangePassword: false,
            passwordChangedAt: timestamp
          };
          if (this.currentUserSignal().id === userId) {
            this.currentUserSignal.set(updated);
          }
          return updated;
        }
        return u;
      });
      return updatedList;
    });

    return { success: true, message: 'Contraseña actualizada con éxito.' };
  }

  toggleUserStatus(id: string): void {
    this.usersSignal.update(list =>
      list.map(u => {
        if (u.id === id) {
          const newStatus: 'ACTIVO' | 'INACTIVO' = u.status === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
          const updated = { ...u, status: newStatus };
          if (this.currentUserSignal().id === id) {
            this.currentUserSignal.set(updated);
          }
          return updated;
        }
        return u;
      })
    );
  }

  deleteUser(id: string): boolean {
    if (this.currentUserSignal().id === id) {
      return false; // Prevent deleting active logged-in user
    }
    this.usersSignal.update(list => list.filter(u => u.id !== id));
    return true;
  }

  getRoleConfig(role: UserRole): RoleConfig {
    return SYSTEM_ROLES.find(r => r.id === role) || SYSTEM_ROLES[0];
  }

  hasPermission(permission: string): boolean {
    const roleConfig = this.currentRoleConfig();
    if (roleConfig.permissions.includes('all')) {
      return true;
    }
    return roleConfig.permissions.includes(permission);
  }

  canAdjustInventory(): boolean {
    return this.hasPermission('inventory:adjust') || this.currentUserSignal().role === 'ADMIN';
  }

  canManagePurchases(): boolean {
    return this.hasPermission('purchases:manage') || this.hasPermission('purchases:receive') || this.currentUserSignal().role === 'ADMIN';
  }

  canAccessPOS(): boolean {
    return this.hasPermission('sales:pos') || this.hasPermission('sales:manage') || this.currentUserSignal().role === 'ADMIN';
  }

  canViewAudit(): boolean {
    return this.hasPermission('audit:view') || this.currentUserSignal().role === 'ADMIN';
  }
}
