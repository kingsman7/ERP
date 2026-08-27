import { Injectable, signal, computed } from '@angular/core';
import { User, RoleConfig, UserRole } from '../models/erp.models';

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
    email: 'admin.morales@4-inLine.com',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-26 21:10:15',
    status: 'ACTIVO',
    department: 'Dirección General & TI',
    phone: '+58 414-1234567',
    createdAt: '2026-01-10'
  },
  {
    id: 'usr-ops-02',
    name: 'Beatriz Herrera (Operaciones)',
    email: 'b.herrera@4-inLine.com',
    role: 'OPERATIONS_MANAGER',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-26 19:45:00',
    status: 'ACTIVO',
    department: 'Gerencia de Operaciones',
    phone: '+58 412-9876543',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr-cash-03',
    name: 'Carlos Mendoza (Caja/POS)',
    email: 'carlos.m@4-inLine.com',
    role: 'CASHIER_SELLER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-26 20:00:10',
    status: 'ACTIVO',
    department: 'Caja & Ventas Mostrador',
    phone: '+58 424-5551234',
    createdAt: '2026-02-01'
  },
  {
    id: 'usr-wh-04',
    name: 'David Silva (Almacén)',
    email: 'david.silva@4-inLine.com',
    role: 'WAREHOUSE_KEEPER',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-26 16:50:22',
    status: 'ACTIVO',
    department: 'Almacén Principal & Despacho',
    phone: '+58 416-3338899',
    createdAt: '2026-02-10'
  },
  {
    id: 'usr-aud-05',
    name: 'Elena Ramos (Auditoría)',
    email: 'elena.auditor@4-inLine.com',
    role: 'AUDITOR',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-26 18:12:04',
    status: 'ACTIVO',
    department: 'Auditoría Interna & Cumplimiento',
    phone: '+58 412-4447788',
    createdAt: '2026-01-20'
  },
  {
    id: 'usr-cash-06',
    name: 'Gabriel Fuentes (Ventas 2)',
    email: 'gabriel.fuentes@4-inLine.com',
    role: 'CASHIER_SELLER',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-25 14:20:00',
    status: 'ACTIVO',
    department: 'Fuerza de Ventas / Preventa',
    phone: '+58 414-7772211',
    createdAt: '2026-03-05'
  },
  {
    id: 'usr-wh-07',
    name: 'Lucía Benítez (Almacén 2)',
    email: 'lucia.benitez@4-inLine.com',
    role: 'WAREHOUSE_KEEPER',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-08-24 11:30:45',
    status: 'ACTIVO',
    department: 'Almacén Secundario / Materia Prima',
    phone: '+58 424-6663344',
    createdAt: '2026-03-12'
  },
  {
    id: 'usr-inact-08',
    name: 'Marcos Rivas (Ex-Cajero)',
    email: 'marcos.rivas@4-inLine.com',
    role: 'CASHIER_SELLER',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
    lastLogin: '2026-07-15 17:00:00',
    status: 'INACTIVO',
    department: 'Caja & Ventas Mostrador',
    phone: '+58 416-8889900',
    createdAt: '2026-02-15'
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usersSignal = signal<User[]>(DEMO_USERS);
  private currentUserSignal = signal<User>(DEMO_USERS[0]);
  private tokenSignal = signal<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nexus_erp_mock_token_2026');

  readonly users = this.usersSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly token = this.tokenSignal.asReadonly();

  readonly currentRoleConfig = computed(() => {
    const role = this.currentUserSignal().role;
    return SYSTEM_ROLES.find(r => r.id === role) || SYSTEM_ROLES[0];
  });

  // Backward-compatible getter for availableDemoUsers
  get availableDemoUsers(): User[] {
    return this.usersSignal();
  }

  readonly roles = SYSTEM_ROLES;

  switchUser(user: User) {
    const updated = {
      ...user,
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    this.currentUserSignal.set(updated);
    
    // Update lastLogin in the users list too
    this.usersSignal.update(users => 
      users.map(u => u.id === user.id ? { ...u, lastLogin: updated.lastLogin } : u)
    );
  }

  addUser(newUser: Omit<User, 'id'>): User {
    const id = `usr-${Date.now().toString().slice(-6)}`;
    const user: User = {
      ...newUser,
      id,
      status: newUser.status || 'ACTIVO',
      createdAt: newUser.createdAt || new Date().toISOString().split('T')[0],
      avatarUrl: newUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
    };

    this.usersSignal.update(list => [user, ...list]);
    return user;
  }

  updateUser(id: string, updates: Partial<User>): void {
    this.usersSignal.update(list =>
      list.map(u => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          if (this.currentUserSignal().id === id) {
            this.currentUserSignal.set(updated);
          }
          return updated;
        }
        return u;
      })
    );
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
