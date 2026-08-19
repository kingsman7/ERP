import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  getDocFromServer,
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { ErpBackupMetadata, BackupScheduleConfig } from '../models/erp.models';
import firebaseConfig from '../../../firebase-applet-config.json';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;

  isConnected = signal<boolean>(false);
  isConnecting = signal<boolean>(false);
  lastConnectionCheck = signal<string | null>(null);
  connectionError = signal<string | null>(null);
  cloudProjectId = signal<string>(firebaseConfig.projectId || '');
  firestoreDatabaseId = signal<string>(firebaseConfig.firestoreDatabaseId || '');

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      this.isConnecting.set(true);
      const appConfig = {
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      };

      this.app = initializeApp(appConfig);
      
      // Initialize firestore with custom databaseId if defined
      if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
        this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      } else {
        this.db = getFirestore(this.app);
      }

      this.testConnection();
    } catch (err: unknown) {
      console.warn('Firebase init error:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido al inicializar Firebase';
      this.connectionError.set(message);
      this.isConnecting.set(false);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.db) {
      this.isConnected.set(false);
      this.isConnecting.set(false);
      return false;
    }

    try {
      this.isConnecting.set(true);
      // Validating connection via getDocFromServer as required by guidelines
      await getDocFromServer(doc(this.db, 'test', 'connection'));
      this.isConnected.set(true);
      this.connectionError.set(null);
      this.lastConnectionCheck.set(new Date().toISOString());
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al conectar con Firestore';
      // If error is simply "doc not found", connection is still working
      if (message.includes('the client is offline')) {
        this.isConnected.set(false);
        this.connectionError.set('Firestore offline: ' + message);
      } else {
        // Document missing is expected on clean database
        this.isConnected.set(true);
        this.connectionError.set(null);
      }
      this.lastConnectionCheck.set(new Date().toISOString());
      return this.isConnected();
    } finally {
      this.isConnecting.set(false);
    }
  }

  getDb(): Firestore | null {
    return this.db;
  }

  // ==========================================================================
  // FIRESTORE BACKUP OPERATIONS
  // ==========================================================================

  async saveBackupToFirestore(backup: ErpBackupMetadata, payloadJson: string): Promise<{ success: boolean; error?: string }> {
    if (!this.db) {
      return { success: false, error: 'Base de datos Firestore no inicializada' };
    }

    try {
      const backupRef = doc(this.db, 'erp_backups', backup.id);
      
      const firestoreBackupData: Record<string, unknown> = {
        id: backup.id,
        backupCode: backup.backupCode,
        name: backup.name,
        description: backup.description || '',
        type: backup.type,
        status: backup.status,
        createdAt: backup.createdAt,
        createdBy: backup.createdBy,
        userEmail: backup.userEmail,
        sizeBytes: backup.sizeBytes,
        sizeFormatted: backup.sizeFormatted,
        checksumSha256: backup.checksumSha256,
        totalCollections: backup.totalCollections,
        totalRecords: backup.totalRecords,
        storageTarget: backup.storageTarget,
        erpVersion: backup.erpVersion,
        payloadJson: payloadJson
      };

      await setDoc(backupRef, firestoreBackupData);
      return { success: true };
    } catch (err: unknown) {
      console.error('Error saving backup to Firestore:', err);
      const message = err instanceof Error ? err.message : 'Error al guardar el respaldo en Firestore';
      return { success: false, error: message };
    }
  }

  async fetchBackupsFromFirestore(maxResults = 30): Promise<ErpBackupMetadata[]> {
    if (!this.db) return [];

    try {
      const backupsCol = collection(this.db, 'erp_backups');
      const q = query(backupsCol, orderBy('createdAt', 'desc'), limit(maxResults));
      const snapshot = await getDocs(q);

      const list: ErpBackupMetadata[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: data['id'] || docSnap.id,
          backupCode: data['backupCode'] || 'BKP-N/A',
          name: data['name'] || 'Copia de Seguridad',
          description: data['description'] || '',
          type: data['type'] || 'AUTOMATIC',
          status: data['status'] || 'COMPLETED',
          createdAt: data['createdAt'] || new Date().toISOString(),
          createdBy: data['createdBy'] || 'Sistema',
          userEmail: data['userEmail'] || '',
          sizeBytes: Number(data['sizeBytes']) || 0,
          sizeFormatted: data['sizeFormatted'] || '0 KB',
          checksumSha256: data['checksumSha256'] || '',
          totalCollections: Number(data['totalCollections']) || 0,
          totalRecords: Number(data['totalRecords']) || 0,
          collectionsSummary: [],
          storageTarget: data['storageTarget'] || 'FIRESTORE_CLOUD',
          erpVersion: data['erpVersion'] || '2.5.0-Enterprise',
          payloadJson: data['payloadJson'] || ''
        });
      });

      return list;
    } catch (err: unknown) {
      console.warn('Error fetching backups from Firestore:', err);
      return [];
    }
  }

  async getBackupPayloadFromFirestore(backupId: string): Promise<string | null> {
    if (!this.db) return null;

    try {
      const docRef = doc(this.db, 'erp_backups', backupId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return data['payloadJson'] || null;
      }
      return null;
    } catch (err) {
      console.error('Error fetching backup payload:', err);
      return null;
    }
  }

  async deleteBackupFromFirestore(backupId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const docRef = doc(this.db, 'erp_backups', backupId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('Error deleting backup from Firestore:', err);
      return false;
    }
  }

  async saveScheduleConfigToFirestore(config: BackupScheduleConfig): Promise<boolean> {
    if (!this.db) return false;

    try {
      const scheduleRef = doc(this.db, 'erp_backup_schedules', 'main_schedule');
      await setDoc(scheduleRef, {
        id: 'main_schedule',
        enabled: config.enabled,
        frequency: config.frequency,
        customIntervalMinutes: config.customIntervalMinutes,
        timeOfDay: config.timeOfDay || '00:00',
        autoSyncToFirestore: config.autoSyncToFirestore,
        autoDownloadJson: config.autoDownloadJson,
        maxBackupsToRetain: config.maxBackupsToRetain,
        lastRunAt: config.lastRunAt || null,
        nextRunAt: config.nextRunAt || null,
        notifyOnBackupComplete: config.notifyOnBackupComplete,
        targetEmail: config.targetEmail || ''
      });
      return true;
    } catch (err) {
      console.error('Error saving schedule config to Firestore:', err);
      return false;
    }
  }

  async fetchScheduleConfigFromFirestore(): Promise<BackupScheduleConfig | null> {
    if (!this.db) return null;

    try {
      const scheduleRef = doc(this.db, 'erp_backup_schedules', 'main_schedule');
      const snap = await getDoc(scheduleRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          enabled: Boolean(data['enabled']),
          frequency: data['frequency'] || 'EVERY_6_HOURS',
          customIntervalMinutes: Number(data['customIntervalMinutes']) || 360,
          timeOfDay: data['timeOfDay'] || '00:00',
          autoSyncToFirestore: Boolean(data['autoSyncToFirestore']),
          autoDownloadJson: Boolean(data['autoDownloadJson']),
          maxBackupsToRetain: Number(data['maxBackupsToRetain']) || 20,
          lastRunAt: data['lastRunAt'] || undefined,
          nextRunAt: data['nextRunAt'] || undefined,
          notifyOnBackupComplete: Boolean(data['notifyOnBackupComplete']),
          targetEmail: data['targetEmail'] || ''
        };
      }
      return null;
    } catch (err) {
      console.warn('Could not fetch schedule from Firestore:', err);
      return null;
    }
  }
}
