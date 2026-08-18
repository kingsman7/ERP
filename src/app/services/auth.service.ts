import { Injectable, signal, computed } from '@angular/core';
import { User, RoleConfig } from '../models/erp.models';

export const SYSTEM_ROLES: RoleConfig[] = [
  {
    id: 'ADMIN',
    name: 'Super Administrador',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Acceso total a configuración, auditoría, finanzas, inventario y seguridad.',
    permissions: ['all', 'security:manage', 'audit:view', 'inventory:adjust', 'sales:manage', 'purchases:manage', 'reports:export']
  },
  {
    id: 'OPERATIONS_MANAGER',
    name: 'Gerente de Operaciones',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Gestión de compras, kardex, inventario, reportes de cierre y presupuestos.',
    permissions: ['inventory:view', 'inventory:adjust', 'purchases:manage', 'sales:view', 'reports:view', 'quotes:manage']
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

export const DEMO_USERS: User[] = [
  {
    id: 'usr-admin-01',
    name: 'Alejandro Morales (Admin)',
    email: 'admin.morales@nexuserp.com',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-18 08:30:15'
  },
  {
    id: 'usr-ops-02',
    name: 'Beatriz Herrera (Operaciones)',
    email: 'b.herrera@nexuserp.com',
    role: 'OPERATIONS_MANAGER',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-18 07:45:00'
  },
  {
    id: 'usr-cash-03',
    name: 'Carlos Mendoza (Caja/POS)',
    email: 'carlos.m@nexuserp.com',
    role: 'CASHIER_SELLER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-18 08:00:10'
  },
  {
    id: 'usr-wh-04',
    name: 'David Silva (Almacén)',
    email: 'david.silva@nexuserp.com',
    role: 'WAREHOUSE_KEEPER',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-18 06:50:22'
  },
  {
    id: 'usr-aud-05',
    name: 'Elena Ramos (Auditoría)',
    email: 'elena.auditor@nexuserp.com',
    role: 'AUDITOR',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-18 09:12:04'
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<User>(DEMO_USERS[0]);
  private tokenSignal = signal<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nexus_erp_mock_token_2026');

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();

  readonly currentRoleConfig = computed(() => {
    const role = this.currentUserSignal().role;
    return SYSTEM_ROLES.find(r => r.id === role) || SYSTEM_ROLES[0];
  });

  readonly availableDemoUsers = DEMO_USERS;
  readonly roles = SYSTEM_ROLES;

  switchUser(user: User) {
    this.currentUserSignal.set({
      ...user,
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
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
