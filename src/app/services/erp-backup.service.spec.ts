import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { EmailNotificationService } from './email-notification.service';
import { ErpBackupService } from './erp-backup.service';
import { ErpStateService } from './erp-state.service';
import { FirebaseService } from './firebase.service';

describe('ErpBackupService', () => {
  let service: ErpBackupService;
  let state: { getErpFullSnapshotData: ReturnType<typeof vi.fn>; logAudit: ReturnType<typeof vi.fn>; notify: ReturnType<typeof vi.fn> };
  let firebase: { fetchBackupsFromFirestore: ReturnType<typeof vi.fn>; saveBackupToFirestore: ReturnType<typeof vi.fn>; saveScheduleConfigToFirestore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    state = {
      getErpFullSnapshotData: vi.fn(() => ({
        products: [{ id: 'product-1' }],
        inventoryMovements: [{ id: 'movement-1' }],
        warehouses: [{ id: 'warehouse-1' }],
        boms: [],
        productionOrders: [],
        crmDeals: [],
        accounts: [],
        journalEntries: [],
        invoices: [{ id: 'invoice-1' }],
        quotes: [],
        cashClosings: [{ id: 'cash-1' }],
        customers: [{ id: 'customer-1' }],
        suppliers: [{ id: 'supplier-1' }],
        users: [{ id: 'user-1' }],
        auditLogs: [{ id: 'audit-1' }],
      })),
      logAudit: vi.fn(),
      notify: vi.fn(),
    };
    firebase = {
      fetchBackupsFromFirestore: vi.fn().mockResolvedValue([]),
      saveBackupToFirestore: vi.fn().mockResolvedValue({ success: true }),
      saveScheduleConfigToFirestore: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        ErpBackupService,
        { provide: ErpStateService, useValue: state },
        { provide: FirebaseService, useValue: firebase },
        { provide: AuthService, useValue: { currentUser: signal({ name: 'Admin de prueba', email: 'admin@example.com' }) } },
        { provide: EmailNotificationService, useValue: { sentAlerts: signal([]), config: signal({}) } },
      ],
    });
    service = TestBed.inject(ErpBackupService);
  });

  afterEach(() => {
    clearInterval((service as unknown as { scheduleTimer: ReturnType<typeof setInterval> }).scheduleTimer);
    localStorage.clear();
  });

  it('serializes an ERP snapshot, saves it to Firestore and updates the local backup index', async () => {
    const result = await service.createBackup('MANUAL', 'Respaldo de prueba');

    expect(result.success).toBe(true);
    expect(result.backup).toMatchObject({
      type: 'MANUAL',
      storageTarget: 'FIRESTORE_CLOUD',
      totalCollections: 15,
      totalRecords: 9,
    });
    expect(firebase.saveBackupToFirestore).toHaveBeenCalledWith(
      expect.objectContaining({ checksumSha256: expect.stringMatching(/^SHA256-/) }),
      expect.stringContaining('"system": "Helameb Enterprise Suite"'),
    );
    expect(service.cloudBackups()).toHaveLength(1);
    expect(service.lastBackup()).toEqual(result.backup);
    expect(service.isBackingUp()).toBe(false);
    expect(state.logAudit).toHaveBeenCalledWith(
      'CREATE_BACKUP',
      'BACKUP',
      expect.any(String),
      expect.any(String),
      undefined,
      expect.any(Object),
    );
  });

  it('keeps a successful local backup when Firestore storage is unavailable', async () => {
    firebase.saveBackupToFirestore.mockResolvedValue({ success: false, error: 'Firestore offline' });

    const result = await service.createBackup();

    expect(result.success).toBe(true);
    expect(result.backup?.storageTarget).toBe('LOCAL_DOWNLOAD');
    expect(service.cloudBackups()).toContainEqual(result.backup);
    expect(state.notify).toHaveBeenCalledWith('success', 'Copia de Seguridad Creada', expect.any(String));
  });
});
