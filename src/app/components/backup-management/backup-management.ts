import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpBackupService } from '../../services/erp-backup.service';
import { FirebaseService } from '../../services/firebase.service';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { ErpBackupMetadata, BackupScheduleFrequency } from '../../models/erp.models';

@Component({
  selector: 'app-backup-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Title & Overview Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <mat-icon class="text-xl">cloud_sync</mat-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-slate-900 tracking-tight">Copias de Seguridad & Respaldos Firestore</h1>
              <p class="text-xs text-slate-500">Gestión de snapshots automáticos en la nube, descarga de archivos JSON y restauración del ERP.</p>
            </div>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <button 
            (click)="testFirestoreConnection()"
            [disabled]="firebaseService.isConnecting()"
            class="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-2xs">
            <mat-icon class="text-base" [class.animate-spin]="firebaseService.isConnecting()">
              {{ firebaseService.isConnecting() ? 'refresh' : 'wifi_tethering' }}
            </mat-icon>
            <span>Verificar Firestore</span>
          </button>

          <button 
            (click)="openCreateBackupModal()"
            [disabled]="backupService.isBackingUp()"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm">
            <mat-icon class="text-base" [class.animate-spin]="backupService.isBackingUp()">
              {{ backupService.isBackingUp() ? 'sync' : 'backup' }}
            </mat-icon>
            <span>Crear Respaldo Ahora</span>
          </button>

          <button 
            (click)="backupService.downloadCurrentSystemSnapshot()"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm">
            <mat-icon class="text-base">download</mat-icon>
            <span>Descargar JSON ERP</span>
          </button>

          <button 
            (click)="openUploadModal()"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5 shadow-2xs">
            <mat-icon class="text-base text-slate-600">upload_file</mat-icon>
            <span>Restaurar desde Archivo</span>
          </button>
        </div>
      </div>

      <!-- Cloud Infrastructure & Schedule Status Bento Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <!-- Firestore Status Card -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado Cloud Firestore</span>
            @if (firebaseService.isConnected()) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                CONECTADO
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                DESCONECTADO
              </span>
            }
          </div>
          <div class="mt-3">
            <div class="text-sm font-bold text-slate-900 truncate">
              {{ firebaseService.cloudProjectId() }}
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">Base: <span class="font-mono text-[10px]">{{ firebaseService.firestoreDatabaseId() || '(default)' }}</span></p>
            <p class="text-[10px] text-slate-400 mt-2">Colección: <span class="font-mono bg-slate-100 px-1 py-0.5 rounded">/erp_backups</span></p>
          </div>
        </div>

        <!-- Schedule Engine Card -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Copias Automáticas</span>
            @if (backupService.scheduleConfig().enabled) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ACTIVO
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                PAUSADO
              </span>
            }
          </div>
          <div class="mt-3">
            <div class="text-base font-bold text-slate-900">
              {{ getFrequencyLabel(backupService.scheduleConfig().frequency) }}
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Próxima: <span class="font-medium text-slate-700">{{ formatDisplayDate(backupService.scheduleConfig().nextRunAt) }}</span>
            </p>
            <p class="text-[10px] text-indigo-600 font-medium mt-2 flex items-center gap-1">
              <mat-icon class="text-xs">schedule</mat-icon>
              Auto-sync Firestore: Sí
            </p>
          </div>
        </div>

        <!-- Total Backups Stored -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Respaldos Almacenados</span>
            <mat-icon class="text-slate-400 text-base">storage</mat-icon>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-black text-slate-900">
              {{ backupService.cloudBackups().length }}
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Volumen total: <span class="font-semibold text-slate-800">{{ totalStorageFormatted() }}</span>
            </p>
            <p class="text-[10px] text-slate-400 mt-2">
              Retención máx: {{ backupService.scheduleConfig().maxBackupsToRetain }} snapshots
            </p>
          </div>
        </div>

        <!-- Current ERP Records Count -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Datos en Memoria</span>
            <mat-icon class="text-emerald-500 text-base">check_circle</mat-icon>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-black text-emerald-600">
              {{ currentTotalRecords() }}
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5">
              15 Colecciones / Módulos activos
            </p>
            <p class="text-[10px] text-slate-400 mt-2">
              Último respaldo: {{ formatDisplayDate(backupService.lastBackup()?.createdAt) }}
            </p>
          </div>
        </div>

      </div>

      <!-- Navigation Tabs for Backups & Scheduling -->
      <div class="flex items-center gap-2 border-b border-slate-200">
        <button 
          (click)="activeTab.set('history')"
          [class]="activeTab() === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 py-2.5 text-xs transition-colors flex items-center gap-2">
          <mat-icon class="text-base">cloud_queue</mat-icon>
          <span>Historial de Respaldos en Firestore ({{ backupService.cloudBackups().length }})</span>
        </button>

        <button 
          (click)="activeTab.set('schedule')"
          [class]="activeTab() === 'schedule' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 py-2.5 text-xs transition-colors flex items-center gap-2">
          <mat-icon class="text-base">alarm</mat-icon>
          <span>Configuración de Programación Automática</span>
        </button>

        <button 
          (click)="activeTab.set('schema')"
          [class]="activeTab() === 'schema' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'"
          class="px-4 py-2.5 text-xs transition-colors flex items-center gap-2">
          <mat-icon class="text-base">data_object</mat-icon>
          <span>Estructura del JSON & Colecciones</span>
        </button>
      </div>

      <!-- TAB 1: BACKUPS HISTORY IN FIRESTORE -->
      @if (activeTab() === 'history') {
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          <!-- Filters & Search Toolbar -->
          <div class="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div class="flex items-center gap-3">
              <div class="relative">
                <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-sm">search</mat-icon>
                <input 
                  type="text" 
                  [(ngModel)]="searchQuery" 
                  placeholder="Buscar por código (BKP-...) o nombre..."
                  class="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white w-64 md:w-80 shadow-2xs" />
              </div>

              <select 
                [(ngModel)]="selectedTypeFilter" 
                class="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs">
                <option value="ALL">Todos los Tipos</option>
                <option value="SCHEDULED">Automático / Programado</option>
                <option value="MANUAL">Manual</option>
                <option value="PRE_RESTORE">Pre-Restauración</option>
              </select>
            </div>

            <div class="flex items-center gap-2 text-xs text-slate-500">
              <button 
                (click)="refreshCloudBackups()"
                [disabled]="backupService.isLoadingCloudBackups()"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1">
                <mat-icon class="text-xs" [class.animate-spin]="backupService.isLoadingCloudBackups()">refresh</mat-icon>
                <span>Actualizar</span>
              </button>
              <span>Mostrando {{ filteredBackups().length }} respaldos</span>
            </div>
          </div>

          <!-- Table of Backups -->
          @if (filteredBackups().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th class="py-3 px-4">Código / Nombre</th>
                    <th class="py-3 px-4">Tipo</th>
                    <th class="py-3 px-4">Fecha & Hora</th>
                    <th class="py-3 px-4">Tamaño</th>
                    <th class="py-3 px-4">Registros</th>
                    <th class="py-3 px-4">Integridad Checksum</th>
                    <th class="py-3 px-4">Generado Por</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (bkp of filteredBackups(); track bkp.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-4">
                        <div class="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                          <mat-icon class="text-xs text-indigo-500">folder_zip</mat-icon>
                          {{ bkp.backupCode }}
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{{ bkp.name }}</div>
                      </td>
                      <td class="py-3 px-4">
                        @switch (bkp.type) {
                          @case ('SCHEDULED') {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <mat-icon class="text-[10px]">alarm</mat-icon>
                              PROGRAMADO
                            </span>
                          }
                          @case ('MANUAL') {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <mat-icon class="text-[10px]">person</mat-icon>
                              MANUAL
                            </span>
                          }
                          @case ('PRE_RESTORE') {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <mat-icon class="text-[10px]">security</mat-icon>
                              PRE-RESTORE
                            </span>
                          }
                          @default {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {{ bkp.type }}
                            </span>
                          }
                        }
                      </td>
                      <td class="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {{ formatDisplayDate(bkp.createdAt) }}
                      </td>
                      <td class="py-3 px-4 font-semibold text-slate-800">
                        {{ bkp.sizeFormatted }}
                      </td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium font-mono text-[11px]">
                          {{ bkp.totalRecords }} regs
                        </span>
                      </td>
                      <td class="py-3 px-4">
                        <span class="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate inline-block max-w-[120px]" [title]="bkp.checksumSha256">
                          {{ bkp.checksumSha256 || 'SHA256-OK' }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-slate-600 text-[11px]">
                        <div>{{ bkp.createdBy }}</div>
                        <div class="text-[10px] text-slate-400">{{ bkp.userEmail }}</div>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          
                          <!-- Download JSON Button -->
                          <button 
                            (click)="downloadBackup(bkp)"
                            title="Descargar archivo JSON completo"
                            class="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors">
                            <mat-icon class="text-sm">download</mat-icon>
                          </button>

                          <!-- Restore Button -->
                          <button 
                            (click)="confirmRestore(bkp)"
                            title="Restaurar base de datos a este punto"
                            class="p-1.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-700 transition-colors">
                            <mat-icon class="text-sm">restore</mat-icon>
                          </button>

                          <!-- Delete Button -->
                          <button 
                            (click)="deleteBackup(bkp)"
                            title="Eliminar de Firestore"
                            class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors">
                            <mat-icon class="text-sm">delete</mat-icon>
                          </button>

                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="py-16 text-center">
              <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-2xl">cloud_off</mat-icon>
              </div>
              <h3 class="text-sm font-semibold text-slate-800">No se encontraron respaldos</h3>
              <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay copias de seguridad que coincidan con los filtros o aún no se ha generado el primer snapshot en Firestore.
              </p>
              <button 
                (click)="openCreateBackupModal()"
                class="mt-4 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5">
                <mat-icon class="text-base">backup</mat-icon>
                <span>Crear Primer Respaldo Ahora</span>
              </button>
            </div>
          }

        </div>
      }

      <!-- TAB 2: AUTOMATIC SCHEDULE CONFIGURATION -->
      @if (activeTab() === 'schedule') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 class="text-base font-bold text-slate-900">Programación Automática de Copias de Seguridad</h2>
              <p class="text-xs text-slate-500">Configure la frecuencia periódica en que el sistema capturará snapshots del ERP y los guardará en Firestore.</p>
            </div>

            <form [formGroup]="scheduleForm" (ngSubmit)="saveScheduleSettings()" class="space-y-5">
              
              <!-- Master Toggle Switch -->
              <div class="flex items-center justify-between p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <mat-icon class="text-lg">alarm_on</mat-icon>
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900">Activar Ejecución Programada</div>
                    <div class="text-[11px] text-slate-500">El motor en segundo plano ejecutará respaldos en Firestore automáticamente.</div>
                  </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" formControlName="enabled" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <!-- Frequency Selection -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="freqSelect" class="block text-xs font-semibold text-slate-700 mb-1">Frecuencia de Respaldo</label>
                  <select 
                    id="freqSelect"
                    formControlName="frequency" 
                    class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="HOURLY">Cada 1 Hora</option>
                    <option value="EVERY_6_HOURS">Cada 6 Horas (Recomendado)</option>
                    <option value="EVERY_12_HOURS">Cada 12 Horas</option>
                    <option value="DAILY">Diario (A una hora fija)</option>
                    <option value="WEEKLY">Semanal (Cada 7 días)</option>
                    <option value="CUSTOM_MINUTES">Intervalo Personalizado en Minutos</option>
                  </select>
                </div>

                @if (scheduleForm.get('frequency')?.value === 'DAILY') {
                  <div>
                    <label for="timeOfDayInput" class="block text-xs font-semibold text-slate-700 mb-1">Hora del Día (HH:mm)</label>
                    <input 
                      id="timeOfDayInput"
                      type="time" 
                      formControlName="timeOfDay" 
                      class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                }

                @if (scheduleForm.get('frequency')?.value === 'CUSTOM_MINUTES') {
                  <div>
                    <label for="customMinInput" class="block text-xs font-semibold text-slate-700 mb-1">Intervalo en Minutos</label>
                    <input 
                      id="customMinInput"
                      type="number" 
                      min="5" 
                      max="1440" 
                      formControlName="customIntervalMinutes" 
                      class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                }

                <div>
                  <label for="maxRetainInput" class="block text-xs font-semibold text-slate-700 mb-1">Máximo de Respaldos a Retener</label>
                  <input 
                    id="maxRetainInput"
                    type="number" 
                    min="5" 
                    max="100" 
                    formControlName="maxBackupsToRetain" 
                    class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p class="text-[10px] text-slate-400 mt-1">Los snapshots más antiguos se depuran automáticamente al superar este límite.</p>
                </div>
              </div>

              <!-- Options & Switches -->
              <div class="space-y-3 pt-3 border-t border-slate-100">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-slate-800">Sincronizar Automáticamente en Firestore Cloud</div>
                    <div class="text-[11px] text-slate-500">Persiste el snapshot en la colección /erp_backups de Firebase.</div>
                  </div>
                  <input type="checkbox" formControlName="autoSyncToFirestore" class="rounded text-indigo-600 focus:ring-indigo-500">
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-slate-800">Descargar Archivo JSON en el Navegador</div>
                    <div class="text-[11px] text-slate-500">Dispara la descarga de un archivo .json al disco duro local en cada ciclo.</div>
                  </div>
                  <input type="checkbox" formControlName="autoDownloadJson" class="rounded text-indigo-600 focus:ring-indigo-500">
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-semibold text-slate-800">Notificar Confirmación por Correo</div>
                    <div class="text-[11px] text-slate-500">Envía un resumen de éxito y hash de verificación al correo configurado.</div>
                  </div>
                  <input type="checkbox" formControlName="notifyOnBackupComplete" class="rounded text-indigo-600 focus:ring-indigo-500">
                </div>

                <div>
                  <label for="targetEmailInput" class="block text-xs font-semibold text-slate-700 mb-1">Correo de Notificación</label>
                  <input 
                    id="targetEmailInput"
                    type="email" 
                    formControlName="targetEmail" 
                    class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div class="pt-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  (click)="executeScheduleImmediately()"
                  class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-sm">play_arrow</mat-icon>
                  <span>Probar Ejecución Programada Ahora</span>
                </button>

                <button 
                  type="submit" 
                  class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>Guardar Configuración en Firestore</span>
                </button>
              </div>

            </form>
          </div>

          <!-- Schedule Diagnostic Panel -->
          <div class="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div class="flex items-center gap-2 text-indigo-400">
              <mat-icon class="text-lg">terminal</mat-icon>
              <h3 class="text-xs font-bold uppercase tracking-wider text-white">Cron Engine Telemetry</h3>
            </div>

            <div class="space-y-3 text-xs font-mono">
              <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div class="text-slate-400 text-[10px]">CRON STATUS:</div>
                <div class="text-emerald-400 font-bold mt-0.5">
                  {{ backupService.scheduleConfig().enabled ? 'RUNNING (INTERVAL 60s)' : 'STOPPED' }}
                </div>
              </div>

              <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div class="text-slate-400 text-[10px]">ÚLTIMA EJECUCIÓN:</div>
                <div class="text-slate-200 mt-0.5">
                  {{ backupService.scheduleConfig().lastRunAt ? formatDisplayDate(backupService.scheduleConfig().lastRunAt) : 'Sin registro previo' }}
                </div>
              </div>

              <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div class="text-slate-400 text-[10px]">PRÓXIMA EJECUCIÓN PROGRAMADA:</div>
                <div class="text-indigo-300 font-bold mt-0.5">
                  {{ backupService.scheduleConfig().nextRunAt ? formatDisplayDate(backupService.scheduleConfig().nextRunAt) : 'Desactivado' }}
                </div>
              </div>

              <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div class="text-slate-400 text-[10px]">SEGURIDAD PRE-RESTORE:</div>
                <div class="text-amber-400 mt-0.5">
                  ACTIVA (Se genera snapshot BKP-PRE antes de cualquier sobreescritura)
                </div>
              </div>
            </div>

            <div class="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
              El motor verifica cada 60 segundos si el tiempo actual ha superado el umbral calculado de la próxima ejecución. Al cumplirse, emite un snapshot atómico en Firestore y registra el evento en la auditoría RBAC.
            </div>
          </div>

        </div>
      }

      <!-- TAB 3: JSON STRUCTURE & COLLECTIONS SCHEMA -->
      @if (activeTab() === 'schema') {
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900">Estructura del Payload JSON & Colecciones Respaldadas</h2>
              <p class="text-xs text-slate-500">Módulos serializados de NexusERP incluidos en cada archivo de exportación e importación.</p>
            </div>
            <button 
              (click)="copySampleJson()"
              class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5">
              <mat-icon class="text-xs">content_copy</mat-icon>
              <span>{{ hasCopiedJson() ? '¡Copiado!' : 'Copiar Estructura JSON' }}</span>
            </button>
          </div>

          <!-- Grid of Modules Covered in Backup -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (col of schemaCollections(); track col.name) {
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <div class="p-2 rounded-lg bg-white border border-slate-200 text-indigo-600 shrink-0">
                  <mat-icon class="text-lg">{{ col.icon }}</mat-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-900 truncate">{{ col.name }}</span>
                    <span class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {{ col.recordsCount }} regs
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-1 leading-snug">{{ col.description }}</p>
                  <p class="text-[10px] font-mono text-slate-400 mt-1.5">Clave: {{ col.key }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Code Preview Block -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-700">Formato Estándar de Exportación (RFC-4180 / JSON Strict):</div>
            <pre class="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">{{ sampleJsonPreview }}</pre>
          </div>
        </div>
      }

      <!-- MODAL: CREATE MANUAL BACKUP -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 text-indigo-600">
                <mat-icon class="text-xl">backup</mat-icon>
                <h3 class="text-sm font-bold text-slate-900">Generar Respaldo Inmediato</h3>
              </div>
              <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <label for="manualBackupNameInput" class="block text-xs font-semibold text-slate-700 mb-1">Nombre o Etiqueta del Respaldo</label>
                <input 
                  id="manualBackupNameInput"
                  type="text" 
                  [(ngModel)]="manualBackupName" 
                  placeholder="e.g. Respaldo previo a cierre mensual"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label for="manualBackupDescInput" class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Descripción</label>
                <textarea 
                  id="manualBackupDescInput"
                  [(ngModel)]="manualBackupDesc" 
                  rows="2"
                  placeholder="Notas adicionales..."
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"></textarea>
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div class="text-xs font-bold text-slate-800">Opciones de Guardado:</div>
                <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="saveToCloud" class="rounded text-indigo-600">
                  <span>Guardar snapshot en Google Cloud Firestore</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="autoDownloadOnCreate" class="rounded text-indigo-600">
                  <span>Descargar archivo JSON a mi equipo simultáneamente</span>
                </label>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                (click)="showCreateModal.set(false)" 
                class="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancelar
              </button>
              <button 
                (click)="submitManualBackup()"
                [disabled]="backupService.isBackingUp()"
                class="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5">
                <mat-icon class="text-sm" [class.animate-spin]="backupService.isBackingUp()">
                  {{ backupService.isBackingUp() ? 'sync' : 'check' }}
                </mat-icon>
                <span>Confirmar y Crear Respaldo</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MODAL: UPLOAD JSON RESTORE -->
      @if (showUploadModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 text-amber-600">
                <mat-icon class="text-xl">upload_file</mat-icon>
                <h3 class="text-sm font-bold text-slate-900">Restaurar Base de Datos desde Archivo JSON</h3>
              </div>
              <button (click)="showUploadModal.set(false)" class="text-slate-400 hover:text-slate-600">
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
              <mat-icon class="text-amber-600 text-lg shrink-0 mt-0.5">warning</mat-icon>
              <div>
                <span class="font-bold">Advertencia de Seguridad:</span> La restauración sobreescribirá el estado actual de la base de datos en memoria y localStorage con el contenido del archivo. Por seguridad, el sistema creará un snapshot previo de respaldo antes de aplicar los cambios.
              </div>
            </div>

            <!-- File Drop Area -->
            <div class="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
              <mat-icon class="text-4xl text-slate-400 mb-2">cloud_upload</mat-icon>
              <div class="text-xs font-bold text-slate-800">Arrastre su archivo .json aquí o haga clic para seleccionar</div>
              <p class="text-[11px] text-slate-500 mt-1">Formato admitido: NexusERP Full Backup JSON (*.json)</p>
              <input 
                type="file" 
                accept=".json" 
                (change)="onFileSelected($event)" 
                class="hidden" 
                #fileInput />
              <button 
                type="button" 
                (click)="fileInput.click()" 
                class="mt-3 px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                Examinar Archivos
              </button>
            </div>

            @if (selectedFile()) {
              <div class="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-indigo-600 text-base">description</mat-icon>
                  <div>
                    <span class="font-bold text-slate-900">{{ selectedFile()?.name }}</span>
                    <span class="text-slate-500 ml-2 font-mono text-[10px]">({{ formatFileSize(selectedFile()?.size || 0) }})</span>
                  </div>
                </div>
                <button (click)="selectedFile.set(null)" class="text-slate-400 hover:text-rose-600">
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
            }

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                (click)="showUploadModal.set(false)" 
                class="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancelar
              </button>
              <button 
                (click)="executeFileUploadRestore()"
                [disabled]="!selectedFile() || backupService.isRestoring()"
                class="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5">
                <mat-icon class="text-sm" [class.animate-spin]="backupService.isRestoring()">
                  {{ backupService.isRestoring() ? 'sync' : 'restore' }}
                </mat-icon>
                <span>Iniciar Restauración</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MODAL: CONFIRM CLOUD RESTORE -->
      @if (restoreTargetBackup()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div class="flex items-center gap-3 pb-3 border-b border-slate-100 text-amber-600">
              <div class="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <mat-icon class="text-xl">restore</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Confirmar Restauración de Snapshot</h3>
                <p class="text-[11px] text-slate-500 font-mono">{{ restoreTargetBackup()?.backupCode }}</p>
              </div>
            </div>

            <div class="space-y-3 text-xs text-slate-700">
              <p>Está a punto de restaurar la base de datos al estado capturado el:</p>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                <div><span class="text-slate-400">Fecha:</span> {{ formatDisplayDate(restoreTargetBackup()?.createdAt) }}</div>
                <div><span class="text-slate-400">Registros:</span> {{ restoreTargetBackup()?.totalRecords }} registros</div>
                <div><span class="text-slate-400">Hash SHA256:</span> {{ restoreTargetBackup()?.checksumSha256 }}</div>
              </div>
              <p class="text-[11px] text-slate-500 leading-relaxed">
                Antes de aplicar esta copia, el sistema guardará un respaldo de seguridad del estado actual por si necesita revertir.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                (click)="restoreTargetBackup.set(null)" 
                class="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancelar
              </button>
              <button 
                (click)="executeCloudRestore()"
                [disabled]="backupService.isRestoring()"
                class="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1.5">
                <mat-icon class="text-sm" [class.animate-spin]="backupService.isRestoring()">
                  {{ backupService.isRestoring() ? 'sync' : 'check' }}
                </mat-icon>
                <span>Restaurar Ahora</span>
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class BackupManagementComponent {
  backupService = inject(ErpBackupService);
  firebaseService = inject(FirebaseService);
  erpState = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);
  private fb = inject(FormBuilder);

  activeTab = signal<'history' | 'schedule' | 'schema'>('history');
  searchQuery = '';
  selectedTypeFilter = 'ALL';
  showCreateModal = signal<boolean>(false);
  showUploadModal = signal<boolean>(false);
  restoreTargetBackup = signal<ErpBackupMetadata | null>(null);
  selectedFile = signal<File | null>(null);
  hasCopiedJson = signal<boolean>(false);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_BACKUP') {
        this.openCreateBackupModal();
      }
    });
  }

  manualBackupName = '';
  manualBackupDesc = '';
  saveToCloud = true;
  autoDownloadOnCreate = false;

  // Form for Schedule
  scheduleForm = this.fb.group({
    enabled: [this.backupService.scheduleConfig().enabled],
    frequency: [this.backupService.scheduleConfig().frequency, Validators.required],
    customIntervalMinutes: [this.backupService.scheduleConfig().customIntervalMinutes],
    timeOfDay: [this.backupService.scheduleConfig().timeOfDay || '00:00'],
    autoSyncToFirestore: [this.backupService.scheduleConfig().autoSyncToFirestore],
    autoDownloadJson: [this.backupService.scheduleConfig().autoDownloadJson],
    maxBackupsToRetain: [this.backupService.scheduleConfig().maxBackupsToRetain, [Validators.required, Validators.min(1)]],
    notifyOnBackupComplete: [this.backupService.scheduleConfig().notifyOnBackupComplete],
    targetEmail: [this.backupService.scheduleConfig().targetEmail || 'ae.barrios@hotmail.com', [Validators.email]]
  });

  filteredBackups = computed(() => {
    let list = this.backupService.cloudBackups();
    const query = this.searchQuery.toLowerCase().trim();
    const filter = this.selectedTypeFilter;

    if (filter !== 'ALL') {
      list = list.filter(b => b.type === filter);
    }

    if (query) {
      list = list.filter(b => 
        b.backupCode.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query) ||
        b.createdBy.toLowerCase().includes(query) ||
        (b.description && b.description.toLowerCase().includes(query))
      );
    }

    return list;
  });

  totalStorageFormatted = computed(() => {
    const totalBytes = this.backupService.cloudBackups().reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
    if (totalBytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    return parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  });

  currentTotalRecords = computed(() => {
    const s = this.erpState.getErpFullSnapshotData();
    return s.products.length + 
           s.inventoryMovements.length + 
           s.warehouses.length + 
           s.boms.length + 
           s.productionOrders.length + 
           s.crmDeals.length + 
           s.accounts.length + 
           s.journalEntries.length + 
           s.invoices.length + 
           s.cashClosings.length + 
           s.quotes.length + 
           s.customers.length + 
           s.suppliers.length + 
           s.users.length + 
           s.auditLogs.length;
  });

  schemaCollections = computed(() => {
    const s = this.erpState.getErpFullSnapshotData();
    return [
      { name: 'Productos & Catálogo', key: 'data.products', icon: 'inventory_2', recordsCount: s.products.length, description: 'Catálogo con 5 niveles de precios, códigos de barra y SKU' },
      { name: 'Movimientos Kardex (CPP)', key: 'data.inventoryMovements', icon: 'swap_horiz', recordsCount: s.inventoryMovements.length, description: 'Trazabilidad de entradas, salidas y costo promedio' },
      { name: 'Almacenes & Sucursales', key: 'data.warehouses', icon: 'warehouse', recordsCount: s.warehouses.length, description: 'Ubicaciones físicas y centros de distribución' },
      { name: 'Estructuras BOM MRP', key: 'data.boms', icon: 'precision_manufacturing', recordsCount: s.boms.length, description: 'Fórmulas y recetas de fabricación con insumos requeridos' },
      { name: 'Órdenes de Producción', key: 'data.productionOrders', icon: 'build_circle', recordsCount: s.productionOrders.length, description: 'Órdenes MRP con cálculo de mermas y costos indirectos' },
      { name: 'Pipeline CRM', key: 'data.crmDeals', icon: 'view_kanban', recordsCount: s.crmDeals.length, description: 'Oportunidades de venta, etapas Kanban y actividades' },
      { name: 'Plan de Cuentas NIIF', key: 'data.accounts', icon: 'account_balance', recordsCount: s.accounts.length, description: 'Estructura contable codificada (Activo, Pasivo, Patrimonio)' },
      { name: 'Asientos de Diario', key: 'data.journalEntries', icon: 'menu_book', recordsCount: s.journalEntries.length, description: 'Libro diario con partida doble y cuadre de Debe y Haber' },
      { name: 'Facturación POS', key: 'data.invoices', icon: 'receipt_long', recordsCount: s.invoices.length, description: 'Comprobantes fiscales con tasas BCV, IVA e IGTF' },
      { name: 'Cotizaciones', key: 'data.quotes', icon: 'request_quote', recordsCount: s.quotes.length, description: 'Presupuestos aprobados y pendientes' },
      { name: 'Cierres de Caja (Z)', key: 'data.cashClosings', icon: 'payments', recordsCount: s.cashClosings.length, description: 'Arqueos de caja multimoneda y discrepancias' },
      { name: 'Clientes & Terceros', key: 'data.customers', icon: 'groups', recordsCount: s.customers.length, description: 'Directorio de clientes comerciales y RIF' },
      { name: 'Proveedores', key: 'data.suppliers', icon: 'local_shipping', recordsCount: s.suppliers.length, description: 'Proveedores calificados y condiciones de pago' },
      { name: 'Usuarios & RBAC', key: 'data.users', icon: 'badge', recordsCount: s.users.length, description: 'Cuentas de usuario con roles y permisos' },
      { name: 'Auditoría Forense', key: 'data.auditLogs', icon: 'shield', recordsCount: s.auditLogs.length, description: 'Registro inmutable de acciones en el sistema' }
    ];
  });

  sampleJsonPreview = `{
  "version": "2.5.0-Enterprise",
  "exportDate": "2026-08-19T15:45:00.000Z",
  "system": "NexusERP Enterprise Suite",
  "checksum": "SHA256-4A9B1C2D3E4F",
  "metadata": {
    "backupCode": "BKP-20260819-1545",
    "name": "Respaldo Programado Firestore",
    "type": "SCHEDULED",
    "totalRecords": 350,
    "sizeBytes": 128450
  },
  "data": {
    "products": [ /* ... */ ],
    "inventoryMovements": [ /* ... */ ],
    "boms": [ /* ... */ ],
    "productionOrders": [ /* ... */ ],
    "accounts": [ /* ... */ ],
    "journalEntries": [ /* ... */ ],
    "invoices": [ /* ... */ ],
    "cashClosings": [ /* ... */ ]
  }
}`;

  testFirestoreConnection() {
    this.firebaseService.testConnection().then(connected => {
      if (connected) {
        this.erpState.notify('success', 'Firestore Conectado', 'Conexión verificada exitosamente con Google Cloud.');
      } else {
        this.erpState.notify('error', 'Fallo de Conexión', 'No se pudo contactar con la base de datos Firestore.');
      }
    });
  }

  refreshCloudBackups() {
    this.backupService.fetchCloudBackups().then(() => {
      this.erpState.notify('info', 'Respaldos Actualizados', 'Lista de copias sincronizada con Firestore.');
    });
  }

  openCreateBackupModal() {
    const now = new Date();
    this.manualBackupName = `Respaldo Manual ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    this.manualBackupDesc = 'Copia manual generada por el usuario desde el panel de control.';
    this.saveToCloud = true;
    this.autoDownloadOnCreate = false;
    this.showCreateModal.set(true);
  }

  submitManualBackup() {
    this.backupService.createBackup('MANUAL', this.manualBackupDesc, {
      name: this.manualBackupName,
      downloadJson: this.autoDownloadOnCreate
    }).then(res => {
      if (res.success) {
        this.showCreateModal.set(false);
      }
    });
  }

  downloadBackup(bkp: ErpBackupMetadata) {
    this.backupService.downloadBackupById(bkp.id);
  }

  confirmRestore(bkp: ErpBackupMetadata) {
    this.restoreTargetBackup.set(bkp);
  }

  executeCloudRestore() {
    const target = this.restoreTargetBackup();
    if (!target) return;

    this.backupService.restoreFromCloudBackup(target.id).then(res => {
      if (res.success) {
        this.restoreTargetBackup.set(null);
      }
    });
  }

  deleteBackup(bkp: ErpBackupMetadata) {
    if (confirm(`¿Está seguro de que desea eliminar el respaldo ${bkp.backupCode} de Firestore? Esta acción no se puede deshacer.`)) {
      this.backupService.deleteBackup(bkp.id);
    }
  }

  saveScheduleSettings() {
    if (this.scheduleForm.invalid) return;

    const val = this.scheduleForm.value;
    this.backupService.updateScheduleConfig({
      enabled: Boolean(val.enabled),
      frequency: val.frequency as BackupScheduleFrequency,
      customIntervalMinutes: Number(val.customIntervalMinutes) || 60,
      timeOfDay: val.timeOfDay || '00:00',
      autoSyncToFirestore: Boolean(val.autoSyncToFirestore),
      autoDownloadJson: Boolean(val.autoDownloadJson),
      maxBackupsToRetain: Number(val.maxBackupsToRetain) || 20,
      notifyOnBackupComplete: Boolean(val.notifyOnBackupComplete),
      targetEmail: val.targetEmail || 'ae.barrios@hotmail.com'
    });
  }

  executeScheduleImmediately() {
    this.backupService.createBackup('SCHEDULED', 'Ejecución manual de prueba del motor de respaldos programados')
      .then(res => {
        if (res.success) {
          this.erpState.notify('success', 'Prueba Ejecutada', 'El respaldo programado se generó correctamente.');
        }
      });
  }

  openUploadModal() {
    this.selectedFile.set(null);
    this.showUploadModal.set(true);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  executeFileUploadRestore() {
    const file = this.selectedFile();
    if (!file) return;

    this.backupService.restoreFromJsonFile(file).then(res => {
      if (res.success) {
        this.showUploadModal.set(false);
        this.selectedFile.set(null);
      }
    });
  }

  copySampleJson() {
    navigator.clipboard.writeText(this.sampleJsonPreview).then(() => {
      this.hasCopiedJson.set(true);
      setTimeout(() => this.hasCopiedJson.set(false), 2000);
    });
  }

  getFrequencyLabel(freq: BackupScheduleFrequency): string {
    switch (freq) {
      case 'HOURLY': return 'Cada 1 Hora';
      case 'EVERY_6_HOURS': return 'Cada 6 Horas';
      case 'EVERY_12_HOURS': return 'Cada 12 Horas';
      case 'DAILY': return 'Diario (00:00)';
      case 'WEEKLY': return 'Semanal';
      case 'CUSTOM_MINUTES': return 'Personalizado';
      default: return 'Cada 6 Horas';
    }
  }

  formatDisplayDate(isoStr?: string): string {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('es-VE', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoStr;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
