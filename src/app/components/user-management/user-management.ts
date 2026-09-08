import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ErpStateService } from '../../services/erp-state.service';
import { User, UserRole } from '../../models/erp.models';

@Component({
  selector: 'app-user-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6 pb-12">
      
      <!-- Header & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <span class="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs">
            <mat-icon class="text-xl">manage_accounts</mat-icon>
          </span>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Gestión de Usuarios y Roles (RBAC)
            </h1>
            <p class="text-xs text-slate-500">
              Control de acceso basado en roles, administración de credenciales, estado de cuentas y auditoría de identidad
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            type="button"
            (click)="authService.openChangePasswordModal()"
            class="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer">
            <mat-icon class="text-base text-indigo-600">lock_reset</mat-icon>
            <span>Cambiar Mi Clave</span>
          </button>

          <button 
            type="button"
            id="btn-open-new-user-modal"
            (click)="openNewUserModal()"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer">
            <mat-icon class="text-base">person_add</mat-icon>
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Bento Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <!-- Total Users KPI -->
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
            <mat-icon class="text-lg">groups</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Usuarios</span>
            <p class="text-lg font-bold text-slate-900">{{ authService.users().length }}</p>
          </div>
        </div>

        <!-- Active Users KPI -->
        <button 
          type="button"
          (click)="setStatusFilter('ACTIVO')"
          class="p-4 bg-white hover:bg-emerald-50/50 rounded-2xl border transition-all text-left flex items-center space-x-3 cursor-pointer shadow-xs"
          [class.border-emerald-400]="statusFilter() === 'ACTIVO'"
          [class.ring-2]="statusFilter() === 'ACTIVO'"
          [class.ring-emerald-300]="statusFilter() === 'ACTIVO'">
          <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <mat-icon class="text-lg">check_circle</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-emerald-700 block">Usuarios Activos</span>
            <p class="text-lg font-bold text-emerald-950">{{ activeUsersCount() }}</p>
          </div>
        </button>

        <!-- Inactive Users KPI -->
        <button 
          type="button"
          (click)="setStatusFilter('INACTIVO')"
          class="p-4 bg-white hover:bg-rose-50/50 rounded-2xl border transition-all text-left flex items-center space-x-3 cursor-pointer shadow-xs"
          [class.border-rose-400]="statusFilter() === 'INACTIVO'"
          [class.ring-2]="statusFilter() === 'INACTIVO'"
          [class.ring-rose-300]="statusFilter() === 'INACTIVO'">
          <div class="p-2.5 rounded-xl bg-rose-50 text-rose-700">
            <mat-icon class="text-lg">block</mat-icon>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-rose-700 block">Cuentas Inactivas</span>
            <p class="text-lg font-bold text-rose-950">{{ inactiveUsersCount() }}</p>
          </div>
        </button>

        <!-- Active Session User -->
        <div class="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xs flex items-center space-x-3">
          <img 
            [src]="authService.currentUser().avatarUrl" 
            [alt]="authService.currentUser().name" 
            referrerpolicy="no-referrer"
            class="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-400 shrink-0" />
          <div class="overflow-hidden min-w-0">
            <span class="text-[9px] uppercase font-bold text-indigo-300 block truncate">Sesión Actual</span>
            <p class="text-xs font-bold text-white truncate">{{ authService.currentUser().name }}</p>
            <span class="text-[10px] text-slate-400 font-mono block">{{ authService.currentRoleConfig().name }}</span>
          </div>
        </div>

      </div>

      <!-- ========================================================= -->
      <!-- SEARCH & FILTER BAR (PRIMARY DIRECTIVE) -->
      <!-- ========================================================= -->
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
        
        <!-- Search & Dropdown Filters Row -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          <!-- Search by Name, Email, or Role -->
          <div class="sm:col-span-6">
            <label for="user-search-input" class="block font-semibold text-slate-700 mb-1">
              Buscar usuario por Nombre, Correo o Rol
            </label>
            <div class="relative">
              <input 
                id="user-search-input"
                type="text" 
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Buscar por 'Alejandro', 'admin@4-inLine.com', 'Cajero', 'Almacén'..." 
                class="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs" />
              <mat-icon class="absolute left-2.5 top-2.5 text-slate-400 text-base">search</mat-icon>
              
              @if (searchQuery()) {
                <button 
                  type="button"
                  (click)="searchQuery.set('')"
                  class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <mat-icon class="text-base">close</mat-icon>
                </button>
              }
            </div>
          </div>

          <!-- Role Filter Dropdown -->
          <div class="sm:col-span-3">
            <label for="user-role-filter" class="block font-semibold text-slate-700 mb-1">
              Filtrar por Rol del Sistema
            </label>
            <div class="relative">
              <select 
                id="user-role-filter"
                [value]="roleFilter()"
                (change)="onRoleFilterChange($event)"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer text-xs">
                <option value="ALL">Todos los Roles ({{ authService.users().length }})</option>
                @for (r of authService.roles; track r.id) {
                  <option [value]="r.id">{{ r.name }} ({{ countUsersByRole(r.id) }})</option>
                }
              </select>
            </div>
          </div>

          <!-- Status Filter Dropdown -->
          <div class="sm:col-span-3">
            <label for="user-status-filter" class="block font-semibold text-slate-700 mb-1">
              Estado de la Cuenta
            </label>
            <div class="relative">
              <select 
                id="user-status-filter"
                [value]="statusFilter()"
                (change)="onStatusFilterChange($event)"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer text-xs">
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVO">Solo Activos ({{ activeUsersCount() }})</option>
                <option value="INACTIVO">Solo Inactivos ({{ inactiveUsersCount() }})</option>
              </select>
            </div>
          </div>

        </div>

        <!-- Quick Filter Pills Bar -->
        <div class="flex items-center space-x-1.5 pt-2 border-t border-slate-100 flex-wrap gap-y-1.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <mat-icon class="text-sm">filter_list</mat-icon>
            <span>Filtros Rápidos:</span>
          </span>

          <!-- Pill: All -->
          <button 
            type="button"
            (click)="resetRoleAndStatus()"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            [class]="roleFilter() === 'ALL' && statusFilter() === 'ALL' 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'">
            Todos ({{ authService.users().length }})
          </button>

          <!-- Role Pills -->
          <button 
            type="button"
            (click)="setRoleFilter('ADMIN')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center space-x-1"
            [class]="roleFilter() === 'ADMIN' 
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-2xs' 
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'">
            <span>Super Admin</span>
            <span class="px-1 py-0.2 rounded-full text-[10px] font-mono" [class]="roleFilter() === 'ADMIN' ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-900'">
              {{ countUsersByRole('ADMIN') }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setRoleFilter('OPERATIONS_MANAGER')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center space-x-1"
            [class]="roleFilter() === 'OPERATIONS_MANAGER' 
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs' 
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'">
            <span>Operaciones</span>
            <span class="px-1 py-0.2 rounded-full text-[10px] font-mono" [class]="roleFilter() === 'OPERATIONS_MANAGER' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'">
              {{ countUsersByRole('OPERATIONS_MANAGER') }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setRoleFilter('CASHIER_SELLER')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center space-x-1"
            [class]="roleFilter() === 'CASHIER_SELLER' 
              ? 'bg-sky-700 text-white border-sky-700 shadow-2xs' 
              : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'">
            <span>Cajeros / POS</span>
            <span class="px-1 py-0.2 rounded-full text-[10px] font-mono" [class]="roleFilter() === 'CASHIER_SELLER' ? 'bg-sky-800 text-white' : 'bg-sky-200 text-sky-900'">
              {{ countUsersByRole('CASHIER_SELLER') }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setRoleFilter('WAREHOUSE_KEEPER')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center space-x-1"
            [class]="roleFilter() === 'WAREHOUSE_KEEPER' 
              ? 'bg-amber-700 text-white border-amber-700 shadow-2xs' 
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'">
            <span>Almacén</span>
            <span class="px-1 py-0.2 rounded-full text-[10px] font-mono" [class]="roleFilter() === 'WAREHOUSE_KEEPER' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'">
              {{ countUsersByRole('WAREHOUSE_KEEPER') }}
            </span>
          </button>

          <button 
            type="button"
            (click)="setRoleFilter('AUDITOR')"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center space-x-1"
            [class]="roleFilter() === 'AUDITOR' 
              ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'">
            <span>Auditoría</span>
            <span class="px-1 py-0.2 rounded-full text-[10px] font-mono" [class]="roleFilter() === 'AUDITOR' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'">
              {{ countUsersByRole('AUDITOR') }}
            </span>
          </button>

          <!-- Clear Filters Button -->
          @if (hasActiveFilters()) {
            <button 
              type="button"
              id="btn-clear-user-filters"
              (click)="clearAllFilters()"
              class="ml-auto px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer">
              <mat-icon class="text-xs">filter_alt_off</mat-icon>
              <span>Limpiar filtros</span>
            </button>
          }
        </div>

      </div>

      <!-- ========================================================= -->
      <!-- USER LIST TABLE VIEW -->
      <!-- ========================================================= -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th class="py-3.5 px-4">Usuario & Área</th>
                <th class="py-3.5 px-4">Correo Corporativo</th>
                <th class="py-3.5 px-3">Rol & Nivel</th>
                <th class="py-3.5 px-3">Seguridad / Clave</th>
                <th class="py-3.5 px-3">Permisos Asignados</th>
                <th class="py-3.5 px-3">Último Acceso</th>
                <th class="py-3.5 px-3 text-center">Estado</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              @for (user of filteredUsers(); track user.id) {
                <tr 
                  class="hover:bg-slate-50/80 transition-colors"
                  [class.bg-blue-50/20]="user.id === authService.currentUser().id">
                  
                  <!-- User Avatar, Name & Department -->
                  <td class="py-3.5 px-4 whitespace-nowrap">
                    <div class="flex items-center space-x-3">
                      <div class="relative">
                        <img 
                          [src]="user.avatarUrl" 
                          [alt]="user.name"
                          referrerpolicy="no-referrer"
                          class="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shadow-2xs" />
                        <span 
                          class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                          [class]="user.status === 'INACTIVO' ? 'bg-rose-500' : 'bg-emerald-500'"></span>
                      </div>
                      <div>
                        <div class="flex items-center space-x-1.5">
                          <p class="font-bold text-slate-900">{{ user.name }}</p>
                          @if (user.id === authService.currentUser().id) {
                            <span class="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-bold rounded">Tú</span>
                          }
                        </div>
                        <p class="text-[11px] text-slate-400">{{ user.department || 'Operaciones Generales' }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Email with Copy Button -->
                  <td class="py-3.5 px-4 font-mono text-slate-700">
                    <div class="flex items-center space-x-1.5">
                      <span class="text-xs">{{ user.email }}</span>
                      <button 
                        type="button"
                        (click)="copyEmailToClipboard(user.email, user.id)"
                        [title]="copiedUserId() === user.id ? '¡Copiado!' : 'Copiar correo'"
                        class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <mat-icon class="text-sm">
                          {{ copiedUserId() === user.id ? 'check' : 'content_copy' }}
                        </mat-icon>
                      </button>
                    </div>
                  </td>

                  <!-- Role Badge -->
                  <td class="py-3.5 px-3">
                    <span 
                      class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                      [class]="getRoleBadgeClass(user.role)">
                      <mat-icon class="text-xs">{{ getRoleIcon(user.role) }}</mat-icon>
                      <span>{{ getRoleName(user.role) }}</span>
                    </span>
                  </td>

                  <!-- Security & Password Status Badge -->
                  <td class="py-3.5 px-3 whitespace-nowrap">
                    @if (user.mustChangePassword) {
                      <div>
                        <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <mat-icon class="text-xs text-amber-600">vpn_key</mat-icon>
                          <span>Clave Temporal</span>
                        </span>
                        <p class="text-[10px] text-amber-700 font-medium mt-0.5">Cambio requerido</p>
                      </div>
                    } @else {
                      <div>
                        <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <mat-icon class="text-xs text-emerald-600">verified_user</mat-icon>
                          <span>Clave Activa</span>
                        </span>
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                          {{ user.passwordChangedAt ? 'Actualizada: ' + user.passwordChangedAt.substring(0, 10) : 'Definitiva' }}
                        </p>
                      </div>
                    }
                  </td>

                  <!-- Permissions Summary -->
                  <td class="py-3.5 px-3 max-w-[200px]">
                    <div class="flex flex-wrap gap-1">
                      @for (perm of getPermissionsPills(user.role); track perm) {
                        <span class="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                          {{ perm }}
                        </span>
                      }
                    </div>
                  </td>

                  <!-- Last Login -->
                  <td class="py-3.5 px-3 whitespace-nowrap">
                    @if (user.lastLogin) {
                      <p class="font-mono text-slate-800 text-[11px]">{{ user.lastLogin }}</p>
                      <p class="text-[10px] text-slate-400">Acceso verificado</p>
                    } @else {
                      <span class="text-slate-400 font-mono text-[11px]">Sin registros</span>
                    }
                  </td>

                  <!-- Status Switch Toggle -->
                  <td class="py-3.5 px-3 text-center whitespace-nowrap">
                    <button 
                      type="button"
                      (click)="toggleStatus(user)"
                      [title]="user.status === 'INACTIVO' ? 'Habilitar acceso' : 'Deshabilitar cuenta'"
                      class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border"
                      [class]="user.status === 'INACTIVO' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="user.status === 'INACTIVO' ? 'bg-rose-500' : 'bg-emerald-500'"></span>
                      <span>{{ user.status === 'INACTIVO' ? 'Inactivo' : 'Activo' }}</span>
                    </button>
                  </td>

                  <!-- Actions -->
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end space-x-1.5">
                      
                      <!-- Quick Reset Password Button -->
                      <button 
                        type="button"
                        (click)="openQuickResetPasswordModal(user)"
                        title="Asignar o restablecer clave temporal"
                        class="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer">
                        <mat-icon class="text-base">vpn_key</mat-icon>
                      </button>

                      <!-- Test Session Switcher -->
                      <button 
                        type="button"
                        (click)="simulateSession(user)"
                        [disabled]="user.status === 'INACTIVO'"
                        [title]="user.status === 'INACTIVO' ? 'Cuenta inactiva' : 'Iniciar sesión como ' + user.name"
                        class="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        <mat-icon class="text-xs text-indigo-600">login</mat-icon>
                        <span class="hidden md:inline">Simular</span>
                      </button>

                      <!-- Edit User Button -->
                      <button 
                        type="button"
                        (click)="openEditUserModal(user)"
                        title="Editar información de usuario"
                        class="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                        <mat-icon class="text-base">edit</mat-icon>
                      </button>

                      <!-- Delete User Button -->
                      @if (user.id !== authService.currentUser().id) {
                        <button 
                          type="button"
                          (click)="confirmDeleteUser(user)"
                          title="Eliminar usuario"
                          class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                          <mat-icon class="text-base">delete</mat-icon>
                        </button>
                      }

                    </div>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center py-12 text-slate-400">
                    <div class="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div class="p-3 bg-slate-100 rounded-full text-slate-400">
                        <mat-icon class="text-2xl">person_search</mat-icon>
                      </div>
                      <p class="font-bold text-slate-700 text-sm">No se encontraron usuarios</p>
                      <p class="text-xs text-slate-500 text-center">
                        Ningún usuario coincide con los criterios de búsqueda actuales ("{{ searchQuery() }}").
                      </p>
                      <button 
                        type="button"
                        (click)="clearAllFilters()"
                        class="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer">
                        Restablecer filtros
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Footer Stats Bar -->
        <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            Mostrando <strong>{{ filteredUsers().length }}</strong> de <strong>{{ authService.users().length }}</strong> usuarios en el sistema
          </span>
          <span class="font-mono text-[11px] text-slate-400">
            Control de Acceso RBAC Granular • JWT Token Auth Activo
          </span>
        </div>

      </div>

      <!-- ========================================================= -->
      <!-- RBAC CAPABILITIES & PERMISSIONS MATRIX REFERENCE -->
      <!-- ========================================================= -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <mat-icon class="text-indigo-600">verified_user</mat-icon>
            <div>
              <h3 class="font-bold text-sm text-slate-900">Matriz de Roles y Niveles de Autorización RBAC</h3>
              <p class="text-xs text-slate-500">Resumen de facultades operativas por perfil de usuario</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          @for (role of authService.roles; track role.id) {
            <div class="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2">
              <div class="flex items-center space-x-1.5">
                <span class="p-1 rounded bg-white border border-slate-200 text-slate-700">
                  <mat-icon class="text-sm">{{ getRoleIcon(role.id) }}</mat-icon>
                </span>
                <p class="font-bold text-slate-900 text-xs leading-tight">{{ role.name }}</p>
              </div>
              <p class="text-[11px] text-slate-500 leading-snug">{{ role.description }}</p>
              <div class="pt-1.5 border-t border-slate-200/60">
                <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Permisos clave:</span>
                <div class="flex flex-wrap gap-1">
                  @for (p of role.permissions; track p) {
                    <span class="px-1.5 py-0.2 bg-white text-slate-700 border border-slate-200 rounded text-[9px] font-mono">
                      {{ p }}
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MODAL: CREAR O EDITAR USUARIO -->
      <!-- ========================================================= -->
      @if (showUserModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-indigo-400">{{ isEditing() ? 'manage_accounts' : 'person_add' }}</mat-icon>
                <h3 class="font-semibold text-sm">
                  {{ isEditing() ? 'Editar Usuario del Sistema' : 'Registrar Nuevo Usuario' }}
                </h3>
              </div>
              <button (click)="closeUserModal()" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="p-6 overflow-y-auto space-y-4 text-xs">
              
              <!-- Name Field -->
              <div class="space-y-1">
                <label for="modal-user-name" class="font-semibold text-slate-700 block">
                  Nombre Completo <span class="text-rose-500">*</span>
                </label>
                <input 
                  id="modal-user-name"
                  type="text" 
                  formControlName="name"
                  placeholder="Ej: Sofía Velásquez (Supervisor)" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <!-- Email Field -->
              <div class="space-y-1">
                <label for="modal-user-email" class="font-semibold text-slate-700 block">
                  Correo Electrónico <span class="text-rose-500">*</span>
                </label>
                <input 
                  id="modal-user-email"
                  type="email" 
                  formControlName="email"
                  placeholder="Ej: sofia.v@4-inLine.com" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              </div>

              <!-- Role Selector -->
              <div class="space-y-1">
                <label for="modal-user-role" class="font-semibold text-slate-700 block">
                  Rol de Autorización RBAC <span class="text-rose-500">*</span>
                </label>
                <select 
                  id="modal-user-role"
                  formControlName="role"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  @for (r of authService.roles; track r.id) {
                    <option [value]="r.id">{{ r.name }}</option>
                  }
                </select>
              </div>

              <!-- Department & Phone -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label for="modal-user-dept" class="font-semibold text-slate-700 block">Departamento / Área</label>
                  <input 
                    id="modal-user-dept"
                    type="text" 
                    formControlName="department"
                    placeholder="Ej: Ventas / Mostrador" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>

                <div class="space-y-1">
                  <label for="modal-user-phone" class="font-semibold text-slate-700 block">Teléfono de Contacto</label>
                  <input 
                    id="modal-user-phone"
                    type="text" 
                    formControlName="phone"
                    placeholder="Ej: +58 414-1234567" 
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>

              <!-- Status Selector -->
              <div class="space-y-1">
                <label for="modal-user-status" class="font-semibold text-slate-700 block">Estado de Cuenta</label>
                <select 
                  id="modal-user-status"
                  formControlName="status"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="ACTIVO">Activo (Acceso Permitido)</option>
                  <option value="INACTIVO">Inactivo (Acceso Suspendido)</option>
                </select>
              </div>

              <!-- Security & Temporary Password Section -->
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <mat-icon class="text-indigo-600 text-base">lock</mat-icon>
                    <span class="font-bold text-slate-900 text-xs">
                      {{ isEditing() ? 'Gestión de Contraseña' : 'Clave Temporal Inicial (Creada por el Admin)' }}
                    </span>
                  </div>
                  @if (isEditing()) {
                    <label class="flex items-center space-x-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        formControlName="resetPassword" 
                        class="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0" />
                      <span class="text-indigo-700 font-semibold text-[11px]">Asignar nueva clave temporal</span>
                    </label>
                  }
                </div>

                @if (!isEditing() || userForm.get('resetPassword')?.value) {
                  <div class="space-y-2.5 pt-1">
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <label for="modal-user-pwd" class="font-semibold text-slate-700 block">
                          {{ isEditing() ? 'Nueva Clave Temporal Manual' : 'Clave Temporal Inicial' }} <span class="text-rose-500">*</span>
                        </label>
                        <span class="text-[10px] text-slate-400 font-mono">Mínimo 6 caracteres</span>
                      </div>
                      <div class="relative">
                        <input 
                          id="modal-user-pwd"
                          [type]="showTempPassword() ? 'text' : 'password'" 
                          formControlName="temporaryPassword"
                          placeholder="Ej: TempClave2026*" 
                          class="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono" />
                        <mat-icon class="absolute left-3 top-2 text-slate-400 text-base">vpn_key</mat-icon>
                        <button 
                          type="button"
                          (click)="showTempPassword.set(!showTempPassword())"
                          class="absolute right-3 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
                          <mat-icon class="text-base">{{ showTempPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                        </button>
                      </div>
                      <p class="text-[11px] text-slate-500 mt-1">
                        El administrador define manualmente esta clave provisional. Al iniciar sesión, el usuario podrá cambiar su clave.
                      </p>
                    </div>

                    <label class="flex items-center space-x-2 cursor-pointer select-none pt-1">
                      <input 
                        type="checkbox" 
                        formControlName="mustChangePassword" 
                        class="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0" />
                      <span class="text-slate-700 font-medium">
                        Exigir que el usuario cambie su clave al iniciar sesión
                      </span>
                    </label>
                  </div>
                } @else {
                  <div class="text-[11px] text-slate-500 flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <span class="flex items-center space-x-1.5">
                      <mat-icon class="text-sm text-emerald-600">verified_user</mat-icon>
                      <span>Contraseña configurada en el sistema.</span>
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">Activa la casilla para restablecerla</span>
                  </div>
                }
              </div>

              <div class="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start space-x-2 text-indigo-900">
                <mat-icon class="text-base text-indigo-600 shrink-0 mt-0.5">info</mat-icon>
                <p class="text-[11px] leading-relaxed">
                  Las credenciales y cambios de permisos se auditan automáticamente bajo el módulo <strong class="font-mono">AUTH</strong> para garantizar trazabilidad inmutable.
                </p>
              </div>

              <div class="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button 
                  type="button"
                  (click)="closeUserModal()"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="submit"
                  [disabled]="userForm.invalid"
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer flex items-center space-x-1">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>{{ isEditing() ? 'Guardar Cambios' : 'Registrar Usuario' }}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: ASIGNAR / RESETEAR CLAVE TEMPORAL RÁPIDO -->
      <!-- ========================================================= -->
      @if (showQuickResetModal() && quickResetUser(); as targetUser) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-400">vpn_key</mat-icon>
                <div>
                  <h3 class="font-semibold text-sm">Asignar Clave Temporal</h3>
                  <p class="text-[11px] text-slate-300 font-mono">{{ targetUser.email }}</p>
                </div>
              </div>
              <button (click)="closeQuickResetModal()" class="text-slate-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-4 text-xs">

              <!-- User Info Card -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                <img [src]="targetUser.avatarUrl" [alt]="targetUser.name" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200" />
                <div>
                  <p class="font-bold text-slate-900">{{ targetUser.name }}</p>
                  <p class="text-[11px] text-slate-500">{{ getRoleName(targetUser.role) }} • {{ targetUser.department || 'Operaciones' }}</p>
                </div>
              </div>

              @if (quickResetError()) {
                <div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
                  <mat-icon class="text-rose-500 text-base">error</mat-icon>
                  <span>{{ quickResetError() }}</span>
                </div>
              }

              <!-- Temporary Password Input -->
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <label for="quick-reset-pwd" class="font-semibold text-slate-700 block">
                    Nueva Clave Temporal Manual <span class="text-rose-500">*</span>
                  </label>
                  <span class="text-[10px] text-slate-400 font-mono">Mínimo 6 caracteres</span>
                </div>
                <div class="relative">
                  <input 
                    id="quick-reset-pwd"
                    [type]="showQuickResetPassword() ? 'text' : 'password'"
                    [value]="quickResetPassword()"
                    (input)="onQuickResetInput($event)"
                    placeholder="Ej: TempClave2026*"
                    class="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono" />
                  <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-base">key</mat-icon>
                  <button 
                    type="button"
                    (click)="showQuickResetPassword.set(!showQuickResetPassword())"
                    class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <mat-icon class="text-base">{{ showQuickResetPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
                <p class="text-[11px] text-slate-500">
                  El Administrador crea manualmente esta clave provisoria para comunicársela al usuario.
                </p>
              </div>

              <!-- Must Change Checkbox -->
              <label class="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900">
                <input 
                  type="checkbox" 
                  [checked]="quickResetMustChange()"
                  (change)="onQuickResetMustChangeChange($event)"
                  class="rounded bg-white border-amber-300 text-amber-600 focus:ring-0" />
                <span class="font-medium text-xs">Exigir cambio de clave al próximo inicio de sesión</span>
              </label>

              <!-- Modal Actions -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button 
                  type="button"
                  (click)="closeQuickResetModal()"
                  class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button 
                  type="button"
                  (click)="saveQuickResetPassword()"
                  class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer flex items-center space-x-1">
                  <mat-icon class="text-sm">check</mat-icon>
                  <span>Guardar Clave Temporal</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class UserManagementComponent {
  authService = inject(AuthService);
  stateService = inject(ErpStateService);

  // Search and Filter Signals
  searchQuery = signal<string>('');
  roleFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  // UI state
  showUserModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  selectedUserId = signal<string | null>(null);
  copiedUserId = signal<string | null>(null);

  // Temporary password and quick reset signals
  showTempPassword = signal<boolean>(false);
  showQuickResetModal = signal<boolean>(false);
  quickResetUser = signal<User | null>(null);
  quickResetPassword = signal<string>('');
  quickResetMustChange = signal<boolean>(true);
  showQuickResetPassword = signal<boolean>(false);
  quickResetError = signal<string | null>(null);

  // Reactive Form
  userForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    role: new FormControl<UserRole>('CASHIER_SELLER', [Validators.required]),
    department: new FormControl(''),
    phone: new FormControl(''),
    status: new FormControl<'ACTIVO' | 'INACTIVO'>('ACTIVO', [Validators.required]),
    temporaryPassword: new FormControl(''),
    mustChangePassword: new FormControl(true),
    resetPassword: new FormControl(false)
  });

  // KPI Computeds
  activeUsersCount = computed(() => {
    return this.authService.users().filter(u => u.status !== 'INACTIVO').length;
  });

  inactiveUsersCount = computed(() => {
    return this.authService.users().filter(u => u.status === 'INACTIVO').length;
  });

  // Filtered Users Computed
  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();
    const users = this.authService.users();

    return users.filter(user => {
      // 1. Role Filter
      if (role !== 'ALL' && user.role !== role) {
        return false;
      }

      // 2. Status Filter
      if (status !== 'ALL') {
        const userStatus = user.status || 'ACTIVO';
        if (userStatus !== status) {
          return false;
        }
      }

      // 3. Search Query (matches name, email, role key, or readable role name)
      if (!query) {
        return true;
      }

      const roleConfig = this.authService.getRoleConfig(user.role);
      const roleName = roleConfig ? roleConfig.name.toLowerCase() : '';
      const dept = (user.department || '').toLowerCase();

      return user.name.toLowerCase().includes(query) ||
             user.email.toLowerCase().includes(query) ||
             user.role.toLowerCase().includes(query) ||
             roleName.includes(query) ||
             dept.includes(query);
    });
  });

  hasActiveFilters = computed(() => {
    return !!this.searchQuery().trim() || this.roleFilter() !== 'ALL' || this.statusFilter() !== 'ALL';
  });

  countUsersByRole(roleId: UserRole): number {
    return this.authService.users().filter(u => u.role === roleId).length;
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onRoleFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.roleFilter.set(target.value);
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
  }

  setRoleFilter(role: string): void {
    this.roleFilter.set(role);
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  resetRoleAndStatus(): void {
    this.roleFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  getRoleName(role: UserRole): string {
    const r = this.authService.getRoleConfig(role);
    return r ? r.name : role;
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case 'ADMIN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'OPERATIONS_MANAGER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CASHIER_SELLER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'WAREHOUSE_KEEPER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'AUDITOR':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getRoleIcon(role: UserRole): string {
    switch (role) {
      case 'ADMIN':
        return 'shield_person';
      case 'OPERATIONS_MANAGER':
        return 'psychology';
      case 'CASHIER_SELLER':
        return 'point_of_sale';
      case 'WAREHOUSE_KEEPER':
        return 'warehouse';
      case 'AUDITOR':
        return 'fact_check';
      default:
        return 'person';
    }
  }

  getPermissionsPills(role: UserRole): string[] {
    const config = this.authService.getRoleConfig(role);
    return config ? config.permissions.slice(0, 3) : ['basic:access'];
  }

  copyEmailToClipboard(email: string, userId: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        this.copiedUserId.set(userId);
        setTimeout(() => this.copiedUserId.set(null), 2000);
      });
    }
  }

  simulateSession(user: User): void {
    this.authService.switchUser(user);
    this.stateService.logAudit(
      'USER_LOGIN',
      'AUTH',
      `Inicio de sesión simulado: ${user.name}`,
      `El usuario activo ahora es ${user.name} con rol ${user.role}.`,
      undefined,
      undefined,
      { userId: user.id, simulated: true }
    );
  }

  toggleStatus(user: User): void {
    this.authService.toggleUserStatus(user.id);
    const newStatus = user.status === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO';
    this.stateService.logAudit(
      'USER_LOGIN',
      'AUTH',
      `Cambio de estado de cuenta: ${user.name}`,
      `Se cambió el estado de la cuenta a ${newStatus}.`,
      { statusAnterior: user.status },
      { statusNuevo: newStatus, userId: user.id },
      { userId: user.id, newStatus },
      true,
      'SECURITY_ROLE'
    );
  }

  confirmDeleteUser(user: User): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user.name}? Esta acción no se puede deshacer.`)) {
      this.authService.deleteUser(user.id);
      this.stateService.logAudit(
        'USER_LOGIN',
        'AUTH',
        `Usuario eliminado: ${user.name}`,
        `Se eliminó el usuario ${user.name} (${user.email}) con rol ${user.role}.`,
        { userEliminado: user },
        undefined,
        undefined,
        true,
        'SECURITY_ROLE'
      );
    }
  }

  onQuickResetInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.quickResetPassword.set(target.value);
    this.quickResetError.set(null);
  }

  onQuickResetMustChangeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.quickResetMustChange.set(target.checked);
  }

  openQuickResetPasswordModal(user: User): void {
    this.quickResetUser.set(user);
    this.quickResetPassword.set('');
    this.quickResetMustChange.set(true);
    this.showQuickResetPassword.set(false);
    this.quickResetError.set(null);
    this.showQuickResetModal.set(true);
  }

  closeQuickResetModal(): void {
    this.showQuickResetModal.set(false);
    this.quickResetUser.set(null);
    this.quickResetError.set(null);
  }

  saveQuickResetPassword(): void {
    const user = this.quickResetUser();
    const pwd = this.quickResetPassword().trim();
    if (!user) return;

    if (!pwd || pwd.length < 6) {
      this.quickResetError.set('La clave temporal debe tener al menos 6 caracteres.');
      return;
    }

    const res = this.authService.adminSetUserPassword(user.id, pwd, this.quickResetMustChange());
    if (res.success) {
      this.stateService.logAudit(
        'USER_LOGIN',
        'AUTH',
        `Clave temporal asignada: ${user.name}`,
        `El Administrador asignó manualmente una nueva clave temporal al usuario ${user.email} con cambio obligatorio: ${this.quickResetMustChange() ? 'SÍ' : 'NO'}.`,
        undefined,
        { userId: user.id, email: user.email, mustChangePassword: this.quickResetMustChange() },
        undefined,
        true,
        'SECURITY_ROLE'
      );
      this.closeQuickResetModal();
    } else {
      this.quickResetError.set(res.message || 'Error al guardar la clave temporal.');
    }
  }

  openNewUserModal(): void {
    this.isEditing.set(false);
    this.selectedUserId.set(null);
    this.showTempPassword.set(false);
    this.userForm.reset({
      name: '',
      email: '',
      role: 'CASHIER_SELLER',
      department: '',
      phone: '',
      status: 'ACTIVO',
      temporaryPassword: '',
      mustChangePassword: true,
      resetPassword: false
    });
    this.showUserModal.set(true);
  }

  openEditUserModal(user: User): void {
    this.isEditing.set(true);
    this.selectedUserId.set(user.id);
    this.showTempPassword.set(false);
    this.userForm.setValue({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      phone: user.phone || '',
      status: user.status || 'ACTIVO',
      temporaryPassword: '',
      mustChangePassword: user.mustChangePassword ?? true,
      resetPassword: false
    });
    this.showUserModal.set(true);
  }

  closeUserModal(): void {
    this.showUserModal.set(false);
    this.showTempPassword.set(false);
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formVal = this.userForm.value;
    const isEdit = this.isEditing();
    const userId = this.selectedUserId();

    if (!isEdit) {
      const tempPass = formVal.temporaryPassword?.trim();
      if (!tempPass || tempPass.length < 6) {
        alert('Por favor ingrese una clave temporal de al menos 6 caracteres para el nuevo usuario.');
        return;
      }
    }

    if (isEdit && userId) {
      const updates: Partial<User> = {
        name: formVal.name!,
        email: formVal.email!,
        role: formVal.role as UserRole,
        department: formVal.department || undefined,
        phone: formVal.phone || undefined,
        status: formVal.status as 'ACTIVO' | 'INACTIVO'
      };

      if (formVal.resetPassword && formVal.temporaryPassword?.trim()) {
        const tempPass = formVal.temporaryPassword.trim();
        if (tempPass.length < 6) {
          alert('La nueva clave temporal debe tener al menos 6 caracteres.');
          return;
        }
        updates.password = tempPass;
        updates.mustChangePassword = !!formVal.mustChangePassword;
        updates.temporaryPasswordSetAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      }

      this.authService.updateUser(userId, updates);

      this.stateService.logAudit(
        'USER_LOGIN',
        'AUTH',
        `Actualización de usuario: ${formVal.name}`,
        `Se actualizaron los datos y rol (${formVal.role}) del usuario ${formVal.email}.${formVal.resetPassword ? ' Se configuró nueva clave temporal manual.' : ''}`,
        undefined,
        { name: formVal.name, email: formVal.email, role: formVal.role, status: formVal.status, passwordReset: !!formVal.resetPassword },
        undefined,
        true,
        'SECURITY_ROLE'
      );
    } else {
      const tempPass = formVal.temporaryPassword?.trim() || 'Temp2026*';
      const created = this.authService.addUser({
        name: formVal.name!,
        email: formVal.email!,
        role: formVal.role as UserRole,
        department: formVal.department || undefined,
        phone: formVal.phone || undefined,
        status: formVal.status as 'ACTIVO' | 'INACTIVO'
      }, tempPass, formVal.mustChangePassword ?? true);

      this.stateService.logAudit(
        'USER_LOGIN',
        'AUTH',
        `Nuevo usuario registrado: ${created.name}`,
        `Se creó la cuenta ${created.email} con rol asignado ${created.role} y clave temporal manual creada por el Administrador.`,
        undefined,
        { id: created.id, name: created.name, email: created.email, role: created.role, mustChangePassword: created.mustChangePassword },
        undefined,
        true,
        'SECURITY_ROLE'
      );
    }

    this.closeUserModal();
  }
}
