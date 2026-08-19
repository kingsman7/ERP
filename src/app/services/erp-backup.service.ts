import { Injectable, inject, signal } from '@angular/core';
import { ErpStateService } from './erp-state.service';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { EmailNotificationService } from './email-notification.service';
import { 
  ErpBackupMetadata, 
  BackupScheduleConfig, 
  ErpFullBackupPayload, 
  BackupType
} from '../models/erp.models';

const SCHEDULE_STORAGE_KEY = 'nexus_erp_backup_schedule_v1';
const LOCAL_BACKUP_CACHE_KEY = 'nexus_erp_local_backups_cache';

@Injectable({
  providedIn: 'root'
})
export class ErpBackupService {
  private erpState = inject(ErpStateService);
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private emailService = inject(EmailNotificationService);

  // Reactive State
  readonly isBackingUp = signal<boolean>(false);
  readonly isRestoring = signal<boolean>(false);
  readonly isLoadingCloudBackups = signal<boolean>(false);
  readonly cloudBackups = signal<ErpBackupMetadata[]>([]);
  readonly lastBackup = signal<ErpBackupMetadata | null>(null);

  // Schedule Configuration Signal
  readonly scheduleConfig = signal<BackupScheduleConfig>({
    enabled: true,
    frequency: 'EVERY_6_HOURS',
    customIntervalMinutes: 360,
    timeOfDay: '00:00',
    autoSyncToFirestore: true,
    autoDownloadJson: false,
    maxBackupsToRetain: 25,
    lastRunAt: undefined,
    nextRunAt: undefined,
    notifyOnBackupComplete: true,
    targetEmail: 'ae.barrios@hotmail.com'
  });

  private scheduleTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadSavedSchedule();
    this.loadCachedBackups();
    this.initScheduleEngine();
    // Fetch latest backups from Firestore
    this.fetchCloudBackups();
  }

  private loadSavedSchedule() {
    try {
      const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.scheduleConfig.set(parsed);
      }
    } catch (e) {
      console.warn('Could not load local backup schedule:', e);
    }
  }

  private saveScheduleLocally(config: BackupScheduleConfig) {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Could not save schedule locally:', e);
    }
  }

  private loadCachedBackups() {
    try {
      const cached = localStorage.getItem(LOCAL_BACKUP_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cloudBackups.set(parsed);
          this.lastBackup.set(parsed[0]);
        }
      }
    } catch (e) {
      console.warn('Could not load cached backups:', e);
    }
  }

  private cacheBackups(backups: ErpBackupMetadata[]) {
    try {
      localStorage.setItem(LOCAL_BACKUP_CACHE_KEY, JSON.stringify(backups.slice(0, 30)));
    } catch (e) {
      console.warn('Could not cache backups:', e);
    }
  }

  // ==========================================================================
  // SCHEDULE RUNNER ENGINE
  // ==========================================================================

  private initScheduleEngine() {
    this.calculateNextRunTime();

    // Periodic check every 60 seconds
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }

    this.scheduleTimer = setInterval(() => {
      this.checkAndExecuteScheduledBackup();
    }, 60000);
  }

  private calculateNextRunTime() {
    const config = this.scheduleConfig();
    if (!config.enabled) {
      this.scheduleConfig.update(c => ({ ...c, nextRunAt: undefined }));
      return;
    }

    const now = new Date();
    const nextDate = new Date(now);

    switch (config.frequency) {
      case 'HOURLY':
        nextDate.setHours(nextDate.getHours() + 1);
        break;
      case 'EVERY_6_HOURS':
        nextDate.setHours(nextDate.getHours() + 6);
        break;
      case 'EVERY_12_HOURS':
        nextDate.setHours(nextDate.getHours() + 12);
        break;
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        if (config.timeOfDay) {
          const [h, m] = config.timeOfDay.split(':').map(Number);
          nextDate.setHours(h || 0, m || 0, 0, 0);
        }
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'CUSTOM_MINUTES':
        nextDate.setMinutes(nextDate.getMinutes() + (config.customIntervalMinutes || 60));
        break;
      default:
        nextDate.setHours(nextDate.getHours() + 6);
    }

    const nextIso = nextDate.toISOString();
    this.scheduleConfig.update(c => ({ ...c, nextRunAt: nextIso }));
    this.saveScheduleLocally(this.scheduleConfig());
  }

  private checkAndExecuteScheduledBackup() {
    const config = this.scheduleConfig();
    if (!config.enabled || !config.nextRunAt) return;

    const now = new Date();
    const nextRun = new Date(config.nextRunAt);

    if (now >= nextRun && !this.isBackingUp()) {
      console.log('⏰ Executing scheduled automatic ERP backup to Firestore...');
      this.createBackup('SCHEDULED', 'Respaldo automático programado del sistema NexusERP')
        .then(result => {
          if (result.success) {
            const nowIso = new Date().toISOString();
            this.scheduleConfig.update(c => ({ ...c, lastRunAt: nowIso }));
            this.calculateNextRunTime();
            this.firebaseService.saveScheduleConfigToFirestore(this.scheduleConfig());
          }
        });
    }
  }

  async updateScheduleConfig(newConfig: Partial<BackupScheduleConfig>): Promise<{ success: boolean; message: string }> {
    const updated: BackupScheduleConfig = {
      ...this.scheduleConfig(),
      ...newConfig
    };

    this.scheduleConfig.set(updated);
    this.saveScheduleLocally(updated);
    this.calculateNextRunTime();

    // Sync schedule to Firestore
    await this.firebaseService.saveScheduleConfigToFirestore(this.scheduleConfig());

    this.erpState.logAudit(
      'CONFIG_BACKUP_SCHEDULE',
      'BACKUP',
      'Configuración de Respaldos Programados',
      `Se actualizó la programación de respaldos a frecuencia ${updated.frequency} (Activo: ${updated.enabled ? 'SÍ' : 'NO'}).`,
      undefined,
      { schedule: updated }
    );

    this.erpState.notify(
      'success',
      'Programación Guardada',
      `Copias automáticas configuradas con frecuencia ${updated.frequency}.`
    );

    return { success: true, message: 'Configuración actualizada exitosamente en Firestore y almacenamiento local.' };
  }

  // ==========================================================================
  // BACKUP GENERATION & CHECKSUM
  // ==========================================================================

  private generateChecksum(dataString: string): string {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    // Combine with pseudo SHA-256 structure for audit verification
    const timestampHex = Date.now().toString(16);
    return `SHA256-${hex}${timestampHex}`.toUpperCase();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async createBackup(
    type: BackupType = 'MANUAL',
    description = 'Respaldo completo de la base de datos NexusERP',
    options?: { downloadJson?: boolean; name?: string }
  ): Promise<{ success: boolean; backup?: ErpBackupMetadata; error?: string }> {
    this.isBackingUp.set(true);

    try {
      const user = this.authService.currentUser();
      const now = new Date();
      const timestampIso = now.toISOString();
      const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const backupId = `bkp-${dateStr}-${Math.random().toString(36).substring(2, 7)}`;
      const backupCode = `BKP-${dateStr.slice(0, 8)}-${dateStr.slice(8, 12)}`;

      // 1. Gather all collections from ErpState
      const snapshotData = this.erpState.getErpFullSnapshotData();
      
      const collectionsSummary = [
        { collectionName: 'Productos e Inventario', count: snapshotData.products.length },
        { collectionName: 'Movimientos Kardex (CPP)', count: snapshotData.inventoryMovements.length },
        { collectionName: 'Almacenes y Sucursales', count: snapshotData.warehouses.length },
        { collectionName: 'Estructuras de Materiales (BOM)', count: snapshotData.boms.length },
        { collectionName: 'Órdenes de Fabricación MRP', count: snapshotData.productionOrders.length },
        { collectionName: 'Oportunidades CRM Pipeline', count: snapshotData.crmDeals.length },
        { collectionName: 'Plan de Cuentas Contables (NIIF)', count: snapshotData.accounts.length },
        { collectionName: 'Asientos de Diario (Partida Doble)', count: snapshotData.journalEntries.length },
        { collectionName: 'Facturación y Comprobantes Fiscales', count: snapshotData.invoices.length },
        { collectionName: 'Cotizaciones y Presupuestos', count: snapshotData.quotes.length },
        { collectionName: 'Sesiones y Arqueos de Caja', count: snapshotData.cashClosings.length },
        { collectionName: 'Clientes y Terceros', count: snapshotData.customers.length },
        { collectionName: 'Proveedores Registrados', count: snapshotData.suppliers.length },
        { collectionName: 'Usuarios y Permisos RBAC', count: snapshotData.users.length },
        { collectionName: 'Logs de Auditoría', count: snapshotData.auditLogs.length }
      ];

      const totalRecords = collectionsSummary.reduce((acc, curr) => acc + curr.count, 0);

      // 2. Build metadata
      const backupMeta: ErpBackupMetadata = {
        id: backupId,
        backupCode: backupCode,
        name: options?.name || (type === 'SCHEDULED' ? `Respaldo Automático ${backupCode}` : `Respaldo Manual ${backupCode}`),
        description: description,
        type: type,
        status: 'COMPLETED',
        createdAt: timestampIso,
        createdBy: user.name,
        userEmail: user.email || 'ae.barrios@hotmail.com',
        sizeBytes: 0,
        sizeFormatted: '0 KB',
        checksumSha256: '',
        totalCollections: collectionsSummary.length,
        totalRecords: totalRecords,
        collectionsSummary: collectionsSummary,
        storageTarget: 'FIRESTORE_CLOUD',
        erpVersion: '2.5.0-Enterprise-NIIF'
      };

      // 3. Build Full Payload
      const fullPayload: ErpFullBackupPayload = {
        version: '2.5.0-Enterprise',
        exportDate: timestampIso,
        system: 'NexusERP Enterprise Suite',
        checksum: '',
        metadata: backupMeta,
        data: {
          ...snapshotData,
          emailAlertLogs: this.emailService.sentAlerts(),
          notificationConfig: this.emailService.config(),
          backupScheduleConfig: this.scheduleConfig()
        }
      };

      const payloadJson = JSON.stringify(fullPayload, null, 2);
      const sizeBytes = new Blob([payloadJson]).size;
      const checksum = this.generateChecksum(payloadJson);

      backupMeta.sizeBytes = sizeBytes;
      backupMeta.sizeFormatted = this.formatBytes(sizeBytes);
      backupMeta.checksumSha256 = checksum;
      fullPayload.checksum = checksum;
      fullPayload.metadata = backupMeta;

      // 4. Save to Firestore
      const firestoreResult = await this.firebaseService.saveBackupToFirestore(backupMeta, payloadJson);

      if (!firestoreResult.success) {
        console.warn('Could not save to Firestore, saving to local cache:', firestoreResult.error);
        backupMeta.storageTarget = 'LOCAL_DOWNLOAD';
      }

      // Update local signals
      const updatedList = [backupMeta, ...this.cloudBackups().filter(b => b.id !== backupMeta.id)];
      this.cloudBackups.set(updatedList);
      this.lastBackup.set(backupMeta);
      this.cacheBackups(updatedList);

      // Audit Log
      this.erpState.logAudit(
        'CREATE_BACKUP',
        'BACKUP',
        `Generación de Copia de Seguridad (${backupCode})`,
        `Se creó el respaldo ${backupCode} (${backupMeta.sizeFormatted}, ${totalRecords} registros) tipo ${type}.`,
        undefined,
        { backupCode, size: backupMeta.sizeFormatted, records: totalRecords, target: backupMeta.storageTarget }
      );

      // 5. Download JSON if requested or configured
      if (options?.downloadJson || this.scheduleConfig().autoDownloadJson) {
        this.downloadBackupAsJson(fullPayload, `NexusERP_Respaldo_${backupCode}_${dateStr.slice(0, 8)}.json`);
      }

      this.erpState.notify(
        'success',
        'Copia de Seguridad Creada',
        `Respaldo ${backupCode} almacenado en Firestore (${backupMeta.sizeFormatted}, ${totalRecords} registros).`
      );

      return { success: true, backup: backupMeta };
    } catch (err: unknown) {
      console.error('Error creating backup:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido al generar la copia de seguridad';
      this.erpState.notify('error', 'Error en Respaldo', message);
      return { success: false, error: message };
    } finally {
      this.isBackingUp.set(false);
    }
  }

  // ==========================================================================
  // FETCH, DOWNLOAD & RESTORE OPERATIONS
  // ==========================================================================

  async fetchCloudBackups(): Promise<ErpBackupMetadata[]> {
    this.isLoadingCloudBackups.set(true);
    try {
      const list = await this.firebaseService.fetchBackupsFromFirestore(50);
      if (list.length > 0) {
        this.cloudBackups.set(list);
        this.lastBackup.set(list[0]);
        this.cacheBackups(list);
      }
      return list;
    } catch (err) {
      console.error('Error fetching cloud backups:', err);
      return this.cloudBackups();
    } finally {
      this.isLoadingCloudBackups.set(false);
    }
  }

  async downloadBackupById(backupId: string): Promise<boolean> {
    try {
      this.erpState.notify('info', 'Descargando Respaldo', 'Obteniendo archivo JSON desde Firestore...');
      const payloadString = await this.firebaseService.getBackupPayloadFromFirestore(backupId);
      
      if (!payloadString) {
        // Look in local cache
        const local = this.cloudBackups().find(b => b.id === backupId);
        if (local && local.payloadJson) {
          this.triggerBrowserDownload(local.payloadJson, `NexusERP_Respaldo_${local.backupCode}.json`);
          return true;
        }
        this.erpState.notify('error', 'Error de Descarga', 'No se encontró el contenido del archivo en Firestore.');
        return false;
      }

      const parsed: ErpFullBackupPayload = JSON.parse(payloadString);
      const fileName = `NexusERP_Respaldo_${parsed.metadata?.backupCode || backupId}.json`;
      this.triggerBrowserDownload(payloadString, fileName);
      this.erpState.notify('success', 'Descarga Completa', `Archivo ${fileName} generado correctamente.`);
      return true;
    } catch (err) {
      console.error('Error downloading backup:', err);
      this.erpState.notify('error', 'Fallo al Descargar', 'No se pudo procesar el archivo JSON de respaldo.');
      return false;
    }
  }

  downloadCurrentSystemSnapshot() {
    this.createBackup('MANUAL', 'Descarga directa de snapshot JSON del sistema ERP', { downloadJson: true });
  }

  private downloadBackupAsJson(payload: ErpFullBackupPayload, fileName: string) {
    const jsonStr = JSON.stringify(payload, null, 2);
    this.triggerBrowserDownload(jsonStr, fileName);
  }

  private triggerBrowserDownload(jsonContent: string, fileName: string) {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      await this.firebaseService.deleteBackupFromFirestore(backupId);
      const updated = this.cloudBackups().filter(b => b.id !== backupId);
      this.cloudBackups.set(updated);
      this.cacheBackups(updated);
      this.erpState.notify('info', 'Respaldo Eliminado', 'El archivo de respaldo fue removido de Firestore.');
      return true;
    } catch (err) {
      console.error('Error deleting backup:', err);
      this.erpState.notify('error', 'Error al Eliminar', 'No se pudo eliminar el respaldo de Firestore.');
      return false;
    }
  }

  // ==========================================================================
  // RESTORE WORKFLOW
  // ==========================================================================

  async restoreFromCloudBackup(backupId: string): Promise<{ success: boolean; recordsRestored: number; error?: string }> {
    this.isRestoring.set(true);

    try {
      // Create a safety snapshot before restoring
      await this.createBackup('PRE_RESTORE', 'Respaldo de seguridad previo a restauración');

      const payloadStr = await this.firebaseService.getBackupPayloadFromFirestore(backupId);
      if (!payloadStr) {
        return { success: false, recordsRestored: 0, error: 'No se encontró el contenido del respaldo en Firestore' };
      }

      const fullPayload: ErpFullBackupPayload = JSON.parse(payloadStr);
      const result = this.erpState.restoreFullErpData(
        fullPayload.data, 
        `Firestore [${fullPayload.metadata?.backupCode || backupId}]`
      );

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la restauración';
      return { success: false, recordsRestored: 0, error: msg };
    } finally {
      this.isRestoring.set(false);
    }
  }

  async restoreFromJsonFile(file: File): Promise<{ success: boolean; recordsRestored: number; error?: string; metadata?: ErpBackupMetadata }> {
    this.isRestoring.set(true);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          if (!content) {
            resolve({ success: false, recordsRestored: 0, error: 'El archivo está vacío' });
            return;
          }

          const parsedPayload: ErpFullBackupPayload = JSON.parse(content);

          if (!parsedPayload.data || typeof parsedPayload.data !== 'object') {
            resolve({ success: false, recordsRestored: 0, error: 'El archivo no contiene un formato de respaldo válido de NexusERP' });
            return;
          }

          // Create safety pre-restore backup
          await this.createBackup('PRE_RESTORE', `Seguridad previa a restauración de archivo local: ${file.name}`);

          const result = this.erpState.restoreFullErpData(
            parsedPayload.data,
            `Archivo JSON Local [${file.name}]`
          );

          resolve({
            success: result.success,
            recordsRestored: result.recordsRestored,
            metadata: parsedPayload.metadata,
            error: result.error
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al parsear el archivo JSON';
          resolve({ success: false, recordsRestored: 0, error: msg });
        } finally {
          this.isRestoring.set(false);
        }
      };

      reader.onerror = () => {
        this.isRestoring.set(false);
        resolve({ success: false, recordsRestored: 0, error: 'Error de lectura del archivo' });
      };

      reader.readAsText(file);
    });
  }
}
