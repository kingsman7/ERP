import { Injectable, inject, signal, computed } from '@angular/core';
import { 
  Product, 
  EmailNotificationConfig, 
  EmailAlertLog, 
  ReorderAlertItem, 
  EmailAlertTriggerReason 
} from '../models/erp.models';
import { ErpStateService } from './erp-state.service';
import { exportToCsv } from '../utils/csv-exporter';

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  private stateService = inject(ErpStateService);

  private readonly CONFIG_KEY = 'nexuserp_email_config_v1';
  private readonly ALERTS_KEY = 'nexuserp_email_alerts_v1';

  // Config Signal
  readonly config = signal<EmailNotificationConfig>(this.loadInitialConfig());

  // Sent Emails Outbox
  readonly sentAlerts = signal<EmailAlertLog[]>(this.loadInitialAlerts());

  // In-flight status
  readonly isSending = signal<boolean>(false);

  // Computed: Reorder status of all inventory products in real time
  readonly reorderItems = computed<ReorderAlertItem[]>(() => {
    const products = this.stateService.products();
    const boms = this.stateService.boms();
    const bcvRate = this.stateService.bcvState().usdRate;

    const items: ReorderAlertItem[] = [];

    for (const prod of products) {
      if (prod.status !== 'ACTIVE') continue;

      const minStock = prod.minStock || 5;
      const reorderPoint = prod.reorderPoint ?? Math.max(Math.ceil(minStock * 1.5), minStock + 5);
      const safetyStock = prod.safetyStock ?? minStock;
      const currentStock = prod.totalStock;

      // Count BOM references as raw material
      const bomRefs = boms.filter(b => b.items.some(it => it.rawMaterialProductId === prod.id)).length;
      const isRawMaterial = bomRefs > 0 || prod.category === 'MATERIA_PRIMA' || prod.category === 'INSUMOS' || prod.category === 'LUBRICANTES';

      if (currentStock <= reorderPoint) {
        const deficit = Math.max(0, reorderPoint - currentStock);
        const suggestedOrderQty = prod.reorderQuantity || Math.max(deficit + safetyStock, 20);
        const estimatedCostUsd = Number((suggestedOrderQty * prod.costPrice).toFixed(2));
        const estimatedCostVes = Number((estimatedCostUsd * bcvRate).toFixed(2));

        let severity: 'CRITICAL' | 'REORDER_REQUIRED' | 'WARNING' = 'REORDER_REQUIRED';
        if (currentStock <= minStock) {
          severity = 'CRITICAL';
        } else if (currentStock <= reorderPoint * 0.75) {
          severity = 'WARNING';
        }

        items.push({
          product: prod,
          currentStock,
          reorderPoint,
          minStock,
          deficit,
          suggestedOrderQty,
          estimatedCostUsd,
          estimatedCostVes,
          severity,
          isRawMaterial,
          associatedBomsCount: bomRefs
        });
      }
    }

    // Sort by severity (CRITICAL first, then by deficit desc)
    return items.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return b.deficit - a.deficit;
    });
  });

  // Critical items count
  readonly criticalCount = computed(() => {
    return this.reorderItems().filter(i => i.severity === 'CRITICAL').length;
  });

  // Total reorder items count
  readonly reorderCount = computed(() => {
    return this.reorderItems().length;
  });

  constructor() {
    // Initial seed check if empty
    if (this.sentAlerts().length === 0) {
      this.seedInitialAlerts();
    }
  }

  private loadInitialConfig(): EmailNotificationConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }

    return {
      enabled: true,
      recipients: ['ae.barrios@hotmail.com', 'compras@empresa.com', 'gerencia.mrp@empresa.com'],
      senderName: 'NexusERP MRP Alert Center',
      senderEmail: 'mrp-alerts@nexuserp.io',
      smtpHost: 'smtp.sendgrid.net',
      smtpPort: 587,
      useTls: true,
      alertOnReorderPoint: true,
      alertOnCriticalStock: true,
      autoTriggerOnProduction: true,
      autoTriggerOnSales: true,
      includeCostValuation: true,
      includePreferredSupplier: true,
      dailyDigestOnly: false
    };
  }

  private loadInitialAlerts(): EmailAlertLog[] {
    try {
      const saved = localStorage.getItem(this.ALERTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private saveConfigToStorage() {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config()));
    } catch (e) {
      console.warn('Failed to persist email config', e);
    }
  }

  private saveAlertsToStorage() {
    try {
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(this.sentAlerts()));
    } catch (e) {
      console.warn('Failed to persist email alerts log', e);
    }
  }

  updateConfig(partial: Partial<EmailNotificationConfig>) {
    this.config.update(current => {
      const updated = { ...current, ...partial };
      return updated;
    });
    this.saveConfigToStorage();
    this.stateService.notify('success', 'Configuración de Email Guardada', 'Parámetros de notificación y destinatarios actualizados.');
  }

  addRecipient(email: string): boolean {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      this.stateService.notify('warning', 'Email Inválido', 'Ingrese una dirección de correo electrónico válida.');
      return false;
    }

    if (this.config().recipients.includes(trimmed)) {
      this.stateService.notify('info', 'Ya Registrado', 'El destinatario ya se encuentra en la lista.');
      return false;
    }

    this.config.update(c => ({
      ...c,
      recipients: [...c.recipients, trimmed]
    }));
    this.saveConfigToStorage();
    this.stateService.notify('success', 'Destinatario Añadido', `${trimmed} agregado a las alertas automáticas.`);
    return true;
  }

  removeRecipient(email: string) {
    this.config.update(c => ({
      ...c,
      recipients: c.recipients.filter(r => r !== email)
    }));
    this.saveConfigToStorage();
  }

  /**
   * Evaluates all products or a specific triggered product against reorder points
   * and dispatches email notifications automatically.
   */
  checkAndTriggerReorderAlerts(
    reason: EmailAlertTriggerReason = 'INVENTORY_SCAN', 
    docRef?: string
  ): number {
    const cfg = this.config();
    if (!cfg.enabled) {
      return 0;
    }

    if (reason === 'MRP_CONSUMPTION' && !cfg.autoTriggerOnProduction) return 0;
    if (reason === 'SALE_POS' && !cfg.autoTriggerOnSales) return 0;

    const itemsToAlert = this.reorderItems();
    if (itemsToAlert.length === 0) return 0;

    let sentCount = 0;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLogs: EmailAlertLog[] = [];

    for (const item of itemsToAlert) {
      // Avoid spamming if an alert for this product was already sent in the last 15 minutes with the same reason
      const alreadySentRecently = this.sentAlerts().some(log => 
        log.productSku === item.product.sku && 
        log.triggerReason === reason &&
        (Date.now() - new Date(log.timestamp).getTime()) < 15 * 60 * 1000
      );

      if (alreadySentRecently && reason !== 'MANUAL_TRIGGER') {
        continue;
      }

      const log = this.createAlertLog(item, reason, docRef, nowStr);
      newLogs.push(log);
      sentCount++;
    }

    if (newLogs.length > 0) {
      this.sentAlerts.update(current => [...newLogs, ...current].slice(0, 200));
      this.saveAlertsToStorage();

      const productNames = newLogs.map(l => l.productName).slice(0, 2).join(', ');
      const extraCount = newLogs.length > 2 ? ` (+${newLogs.length - 2} más)` : '';
      
      this.stateService.notify(
        'warning', 
        `Alerta Email MRP (${sentCount} enviadas)`, 
        `Se enviaron notificaciones a ${cfg.recipients.length} destinatarios para: ${productNames}${extraCount}.`
      );
    }

    return sentCount;
  }

  /**
   * Dispatches a manual or forced reorder alert for a specific product.
   */
  sendManualAlert(product: Product, reason: EmailAlertTriggerReason = 'MANUAL_TRIGGER'): boolean {
    const cfg = this.config();
    const bcvRate = this.stateService.bcvState().usdRate;
    const minStock = product.minStock || 5;
    const reorderPoint = product.reorderPoint ?? Math.max(Math.ceil(minStock * 1.5), minStock + 5);
    const safetyStock = product.safetyStock ?? minStock;
    const currentStock = product.totalStock;
    const deficit = Math.max(0, reorderPoint - currentStock);
    const suggestedOrderQty = product.reorderQuantity || Math.max(deficit + safetyStock, 20);
    const estimatedCostUsd = Number((suggestedOrderQty * product.costPrice).toFixed(2));
    const estimatedCostVes = Number((estimatedCostUsd * bcvRate).toFixed(2));

    const reorderItem: ReorderAlertItem = {
      product,
      currentStock,
      reorderPoint,
      minStock,
      deficit,
      suggestedOrderQty,
      estimatedCostUsd,
      estimatedCostVes,
      severity: currentStock <= minStock ? 'CRITICAL' : 'REORDER_REQUIRED',
      isRawMaterial: true,
      associatedBomsCount: 1
    };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const log = this.createAlertLog(reorderItem, reason, undefined, nowStr);

    this.sentAlerts.update(current => [log, ...current]);
    this.saveAlertsToStorage();

    this.stateService.notify(
      'success',
      'Email de Alerta Enviado',
      `Notificación de reorden para ${product.name} enviada exitosamente a ${cfg.recipients.join(', ')}.`
    );

    return true;
  }

  /**
   * Dispatches a live test email to verify SMTP configuration and HTML template rendering.
   */
  sendTestEmail(targetEmail?: string): boolean {
    const cfg = this.config();
    const recipient = targetEmail || cfg.recipients[0] || 'ae.barrios@hotmail.com';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const testItem: ReorderAlertItem = {
      product: {
        id: 'test-prod',
        sku: 'MP-TEST-001',
        barcode: '7591000999999',
        name: 'Aceite Base Lubricante Sintético ISO-68 (PRUEBA)',
        category: 'MATERIA_PRIMA',
        unit: 'LT',
        costPrice: 4.85,
        salePrice: 7.50,
        prices: { price1: 7.50, price2: 7.00, price3: 6.50, price4: 6.20, price5: 5.90 },
        isTaxExempt: false,
        taxRate: 0.16,
        minStock: 50,
        reorderPoint: 120,
        safetyStock: 30,
        leadTimeDays: 7,
        reorderQuantity: 200,
        totalStock: 35,
        stockByWarehouse: [{ warehouseId: 'wh-01', warehouseName: 'Almacén Principal', quantity: 35 }],
        status: 'ACTIVE',
        updatedAt: nowStr
      },
      currentStock: 35,
      reorderPoint: 120,
      minStock: 50,
      deficit: 85,
      suggestedOrderQty: 200,
      estimatedCostUsd: 970.00,
      estimatedCostVes: 970.00 * this.stateService.bcvState().usdRate,
      severity: 'CRITICAL',
      isRawMaterial: true,
      associatedBomsCount: 3
    };

    const log = this.createAlertLog(testItem, 'TEST_EMAIL', 'TEST-VERIFICATION-001', nowStr, [recipient]);

    this.sentAlerts.update(current => [log, ...current]);
    this.saveAlertsToStorage();

    this.stateService.notify(
      'success',
      'Email de Prueba Enviado',
      `Mensaje de prueba transmitido vía ${cfg.smtpHost}:${cfg.smtpPort} hacia ${recipient}.`
    );

    return true;
  }

  private createAlertLog(
    item: ReorderAlertItem, 
    reason: EmailAlertTriggerReason, 
    docRef?: string,
    timestamp?: string,
    customRecipients?: string[]
  ): EmailAlertLog {
    const cfg = this.config();
    const recipients = customRecipients || [...cfg.recipients];
    const time = timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    let reasonLabel = 'Inspección de Inventario';
    if (reason === 'MRP_CONSUMPTION') reasonLabel = `Consumo en Fabricación MRP (${docRef || 'Orden de Producción'})`;
    if (reason === 'SALE_POS') reasonLabel = `Despacho / Venta POS (${docRef || 'Factura Fiscal'})`;
    if (reason === 'TEST_EMAIL') reasonLabel = 'Prueba de Conectividad SMTP';
    if (reason === 'MANUAL_TRIGGER') reasonLabel = 'Alerta Manual Disparada por Usuario';

    const subject = `[ALERTA MRP] Stock por debajo de Punto de Reorden: ${item.product.sku} - ${item.product.name}`;
    const previewHtml = this.generateHtmlTemplate(item, reasonLabel, recipients, time, docRef);

    return {
      id: 'eml-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: time,
      recipients,
      subject,
      productSku: item.product.sku,
      productName: item.product.name,
      category: item.product.category,
      unit: item.product.unit,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      minStock: item.minStock,
      deficitQuantity: item.deficit,
      suggestedOrderQty: item.suggestedOrderQty,
      estimatedCostUsd: item.estimatedCostUsd,
      estimatedCostVes: item.estimatedCostVes,
      triggerReason: reason,
      orderOrDocRef: docRef,
      status: 'DELIVERED',
      previewHtml
    };
  }

  /**
   * Generates a professional, responsive HTML email template for reorder alerts.
   */
  private generateHtmlTemplate(
    item: ReorderAlertItem, 
    reasonLabel: string, 
    recipients: string[], 
    time: string,
    docRef?: string
  ): string {
    const bcvRate = this.stateService.bcvState().usdRate;
    const isCritical = item.severity === 'CRITICAL';
    const accentColor = isCritical ? '#e11d48' : '#d97706';
    const badgeBg = isCritical ? '#ffe4e6' : '#fef3c7';
    const badgeText = isCritical ? '#9f1239' : '#92400e';
    const severityLabel = isCritical ? 'NIVEL CRÍTICO (Bajo Stock Mínimo)' : 'PUNTO DE REORDEN ALCANZADO';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta de Reorden de Inventario MRP - NexusERP</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 12px; color: #94a3b8; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeText}; margin-top: 12px; }
    .content { padding: 28px; }
    .alert-box { background: ${isCritical ? '#fff1f2' : '#fffbeb'}; border-left: 4px solid ${accentColor}; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; }
    .alert-box p { margin: 0; font-size: 13px; color: #334155; line-height: 1.5; }
    .product-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .product-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .product-sku { font-family: monospace; font-size: 12px; color: #64748b; margin-bottom: 14px; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
    .metric-item { background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #edf2f7; text-align: center; }
    .metric-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .metric-value { font-size: 16px; font-weight: 700; font-family: monospace; }
    .metric-value.danger { color: ${accentColor}; }
    .metric-value.primary { color: #0f172a; }
    .metric-value.success { color: #059669; }
    .recommendation-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    .recommendation-table th { text-align: left; padding: 8px 12px; background: #f1f5f9; color: #475569; font-weight: 600; }
    .recommendation-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .cta-button { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #0f172a; color: #ffffff !important; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 24px; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 800; font-size: 14px; letter-spacing: 1px; color: #38bdf8;">NEXUS ERP • MRP SYSTEM</span>
        <span style="font-size: 11px; color: #94a3b8;">Ref: ${docRef || 'AUT-REORDER'}</span>
      </div>
      <h1 style="margin-top: 10px;">Notificación de Reabastecimiento Automático</h1>
      <p>Generado automáticamente por el motor de control de inventario y manufactura MRP.</p>
      <div class="badge">${severityLabel}</div>
    </div>

    <div class="content">
      <div class="alert-box">
        <p><strong>Estimado Equipo de Compras y Producción:</strong><br>
        El inventario del insumo <strong>${item.product.name}</strong> ha descendido a <strong>${item.currentStock} ${item.product.unit}</strong>, ubicándose por debajo de su Punto de Reorden (${item.reorderPoint} ${item.product.unit}). Se requiere gestionar orden de compra urgente para evitar paradas de producción.</p>
      </div>

      <div class="product-card">
        <div class="product-title">${item.product.name}</div>
        <div class="product-sku">SKU: ${item.product.sku} | Cód. Barras: ${item.product.barcode} | Categoría: ${item.product.category}</div>

        <div class="metric-grid">
          <div class="metric-item">
            <div class="metric-label">Stock Actual</div>
            <div class="metric-value danger">${item.currentStock} ${item.product.unit}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Pto. Reorden</div>
            <div class="metric-value primary">${item.reorderPoint} ${item.product.unit}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Stock Mínimo</div>
            <div class="metric-value primary">${item.minStock} ${item.product.unit}</div>
          </div>
        </div>
      </div>

      <h3 style="font-size: 13px; color: #0f172a; margin: 0 0 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Plan de Reposición Sugerido por MRP</h3>
      <table class="recommendation-table">
        <tr>
          <th>Parámetro</th>
          <th>Detalle Liquidado</th>
        </tr>
        <tr>
          <td><strong>Déficit de Inventario</strong></td>
          <td style="color: ${accentColor}; font-weight: 700;">${item.deficit} ${item.product.unit}</td>
        </tr>
        <tr>
          <td><strong>Lote de Compra Sugerido (EOQ)</strong></td>
          <td style="font-weight: 700; color: #059669;">${item.suggestedOrderQty} ${item.product.unit}</td>
        </tr>
        <tr>
          <td><strong>Costo Unitario Promedio</strong></td>
          <td style="font-family: monospace;">$${item.product.costPrice.toFixed(2)} USD (Bs. ${(item.product.costPrice * bcvRate).toFixed(2)})</td>
        </tr>
        <tr>
          <td><strong>Presupuesto Estimado de Compra</strong></td>
          <td style="font-weight: 700; font-family: monospace;">$${item.estimatedCostUsd.toFixed(2)} USD / Bs. ${item.estimatedCostVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td><strong>Motivo de Disparo</strong></td>
          <td>${reasonLabel}</td>
        </tr>
        ${item.associatedBomsCount > 0 ? `
        <tr>
          <td><strong>Impacto en Fórmulas BOM</strong></td>
          <td>Utilizado en ${item.associatedBomsCount} estructura(s) activa(s) de producción</td>
        </tr>` : ''}
      </table>

      <div style="margin-top: 24px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534;">
        <strong>Siguiente Paso Recomendado:</strong> Emitir Orden de Compra formal al proveedor preferencial o programar recepción en muelle para el almacén principal.
      </div>
    </div>

    <div class="footer">
      <p><strong>Destinatarios Notificados:</strong> ${recipients.join(', ')}</p>
      <p><strong>Fecha y Hora de Emisión:</strong> ${time} | Tasa Oficial BCV: Bs. ${bcvRate.toFixed(2)} / USD</p>
      <p style="margin-top: 8px; color: #94a3b8;">NexusERP Cloud v2.4 • Servidor SMTP Transaccional: ${this.config().smtpHost}:${this.config().smtpPort}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private seedInitialAlerts() {
    const products = this.stateService.products();
    const rawMaterials = products.filter(p => p.category === 'MATERIA_PRIMA' || p.category === 'INSUMOS');
    const targetProd = rawMaterials[0] || products[0];

    if (!targetProd) return;

    const bcvRate = this.stateService.bcvState().usdRate;
    const nowStr = new Date(Date.now() - 3600 * 1000 * 2).toISOString().replace('T', ' ').substring(0, 19);

    const initialItem: ReorderAlertItem = {
      product: targetProd,
      currentStock: targetProd.totalStock,
      reorderPoint: targetProd.minStock * 2,
      minStock: targetProd.minStock,
      deficit: Math.max(0, targetProd.minStock * 2 - targetProd.totalStock),
      suggestedOrderQty: 50,
      estimatedCostUsd: Number((50 * targetProd.costPrice).toFixed(2)),
      estimatedCostVes: Number((50 * targetProd.costPrice * bcvRate).toFixed(2)),
      severity: targetProd.totalStock <= targetProd.minStock ? 'CRITICAL' : 'REORDER_REQUIRED',
      isRawMaterial: true,
      associatedBomsCount: 2
    };

    const initialLog = this.createAlertLog(
      initialItem, 
      'MRP_CONSUMPTION', 
      'OF-2026-0001', 
      nowStr
    );

    this.sentAlerts.set([initialLog]);
    this.saveAlertsToStorage();
  }

  clearAlertLogs() {
    this.sentAlerts.set([]);
    this.saveAlertsToStorage();
    this.stateService.notify('info', 'Historial Limpiado', 'Se ha vaciado el registro de alertas enviadas.');
  }

  exportLogsToCsv(): boolean {
    const logs = this.sentAlerts();
    if (logs.length === 0) {
      this.stateService.notify('warning', 'Sin Registros', 'No existen registros de emails para exportar.');
      return false;
    }

    const headers = [
      'ID Registro',
      'Fecha y Hora',
      'Destinatarios',
      'Asunto',
      'SKU Producto',
      'Nombre Producto',
      'Categoría',
      'Stock Actual',
      'Punto Reorden',
      'Stock Mínimo',
      'Déficit',
      'Cantidad Sugerida Compra',
      'Costo Estimado ($ USD)',
      'Costo Estimado (Bs. BCV)',
      'Motivo Disparo',
      'Documento Ref',
      'Estado Envío'
    ];

    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      `"${l.recipients.join('; ')}"`,
      `"${l.subject}"`,
      l.productSku,
      `"${l.productName}"`,
      l.category,
      l.currentStock,
      l.reorderPoint,
      l.minStock,
      l.deficitQuantity,
      l.suggestedOrderQty,
      l.estimatedCostUsd.toFixed(2),
      l.estimatedCostVes.toFixed(2),
      l.triggerReason,
      l.orderOrDocRef || 'N/A',
      l.status
    ]);

    const dateStr = new Date().toISOString().split('T')[0];
    return exportToCsv(`Alertas_Email_Reorden_MRP_${dateStr}`, headers, rows);
  }
}
