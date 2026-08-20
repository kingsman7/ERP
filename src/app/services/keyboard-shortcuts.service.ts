import { Injectable, signal, computed, inject } from '@angular/core';
import { NavTab } from '../components/sidebar/sidebar';

export type ShortcutCategory = 'CREATION' | 'NAVIGATION' | 'POS' | 'SYSTEM';

export interface ShortcutDefinition {
  id: string;
  keys: string[]; // e.g. ['Alt', 'N']
  keyDisplay: string; // e.g. 'Alt + N'
  title: string;
  description: string;
  category: ShortcutCategory;
  icon: string;
  targetNav?: NavTab;
  badgeColor?: string;
  requiresModal?: boolean;
}

export interface ShortcutEvent {
  actionId: string;
  targetNav?: NavTab;
  timestamp: number;
  payload?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  // Master shortcuts catalog
  readonly shortcuts: ShortcutDefinition[] = [
    // ---------------------------------------------------------
    // 1. CREACIÓN RÁPIDA DE REGISTROS (Alt + Letra o Alt + Shift + Letra)
    // ---------------------------------------------------------
    {
      id: 'NEW_SALE',
      keys: ['Alt', 'N'],
      keyDisplay: 'Alt + N',
      title: 'Nueva Venta / Factura POS',
      description: 'Inicia una nueva transacción en el terminal POS y enfoca el escáner de productos',
      category: 'CREATION',
      icon: 'point_of_sale',
      targetNav: 'sales-pos',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      requiresModal: false
    },
    {
      id: 'NEW_PRODUCT',
      keys: ['Alt', 'Shift', 'P'],
      keyDisplay: 'Alt + Shift + P',
      title: 'Nuevo Producto en Catálogo',
      description: 'Abre el modal para registrar un nuevo producto con 5 niveles de precios e IVA',
      category: 'CREATION',
      icon: 'add_box',
      targetNav: 'inventory',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      requiresModal: true
    },
    {
      id: 'NEW_STOCK_ADJUST',
      keys: ['Alt', 'Shift', 'A'],
      keyDisplay: 'Alt + Shift + A',
      title: 'Ajuste de Stock / Registro de Merma',
      description: 'Abre el formulario de ajuste físico con soporte de documento y justificación auditada',
      category: 'CREATION',
      icon: 'tune',
      targetNav: 'inventory',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      requiresModal: true
    },
    {
      id: 'NEW_PURCHASE',
      keys: ['Alt', 'Shift', 'C'],
      keyDisplay: 'Alt + Shift + C',
      title: 'Nueva Entrada de Mercancía / Compra',
      description: 'Registra una orden de entrada a proveedor con recálculo automático de Costo Promedio (CPP)',
      category: 'CREATION',
      icon: 'local_shipping',
      targetNav: 'purchases',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      requiresModal: true
    },
    {
      id: 'NEW_QUOTE',
      keys: ['Alt', 'Shift', 'Q'],
      keyDisplay: 'Alt + Shift + Q',
      title: 'Nuevo Presupuesto / Cotización',
      description: 'Genera una propuesta comercial multimoneda con conversión rápida a factura fiscal',
      category: 'CREATION',
      icon: 'request_quote',
      targetNav: 'quotes',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      requiresModal: true
    },
    {
      id: 'NEW_PRODUCTION_ORDER',
      keys: ['Alt', 'Shift', 'M'],
      keyDisplay: 'Alt + Shift + M',
      title: 'Nueva Orden de Fabricación (MRP)',
      description: 'Planifica una corrida de producción basada en recetas BOM y explosión de insumos',
      category: 'CREATION',
      icon: 'precision_manufacturing',
      targetNav: 'mrp',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      requiresModal: true
    },
    {
      id: 'NEW_BOM',
      keys: ['Alt', 'Shift', 'B'],
      keyDisplay: 'Alt + Shift + B',
      title: 'Nueva Fórmula BOM / Receta',
      description: 'Diseña la estructura de materiales, mano de obra directa y costos indirectos CIF',
      category: 'CREATION',
      icon: 'format_list_bulleted',
      targetNav: 'mrp',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      requiresModal: true
    },
    {
      id: 'NEW_JOURNAL_ENTRY',
      keys: ['Alt', 'Shift', 'J'],
      keyDisplay: 'Alt + Shift + J',
      title: 'Nuevo Asiento Contable Manual (NIIF)',
      description: 'Crea un asiento de partida doble en el Libro Diario con validación Debe = Haber',
      category: 'CREATION',
      icon: 'post_add',
      targetNav: 'accounting',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      requiresModal: true
    },
    {
      id: 'NEW_CRM_DEAL',
      keys: ['Alt', 'Shift', 'D'],
      keyDisplay: 'Alt + Shift + D',
      title: 'Nueva Oportunidad CRM',
      description: 'Registra un nuevo prospecto comercial en el tablero Kanban',
      category: 'CREATION',
      icon: 'group_add',
      targetNav: 'crm',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      requiresModal: true
    },
    {
      id: 'NEW_BACKUP',
      keys: ['Alt', 'Shift', 'S'],
      keyDisplay: 'Alt + Shift + S',
      title: 'Crear Respaldo Inmediato Firestore',
      description: 'Genera un snapshot completo e inmutable de la base de datos en la nube',
      category: 'CREATION',
      icon: 'cloud_upload',
      targetNav: 'backups',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      requiresModal: true
    },

    // ---------------------------------------------------------
    // 2. NAVEGACIÓN RÁPIDA ENTRE MÓDULOS (Alt + 1 al Alt + 0 y letras directas)
    // ---------------------------------------------------------
    {
      id: 'NAV_DASHBOARD',
      keys: ['Alt', '1'],
      keyDisplay: 'Alt + 1',
      title: 'Dashboard Ejecutivo',
      description: 'Métricas clave de ventas, finanzas, inventario y gráficos de rendimiento',
      category: 'NAVIGATION',
      icon: 'dashboard',
      targetNav: 'dashboard'
    },
    {
      id: 'NAV_INVENTORY',
      keys: ['Alt', '2'],
      keyDisplay: 'Alt + 2',
      title: 'Inventario y Almacenes',
      description: 'Control de existencias multialmacén, 5 niveles de precios y alertas de stock',
      category: 'NAVIGATION',
      icon: 'inventory_2',
      targetNav: 'inventory'
    },
    {
      id: 'NAV_KARDEX',
      keys: ['Alt', '3'],
      keyDisplay: 'Alt + 3',
      title: 'Kardex Valorado (CPP)',
      description: 'Trazabilidad de entradas y salidas bajo método Costo Promedio Ponderado',
      category: 'NAVIGATION',
      icon: 'query_stats',
      targetNav: 'kardex'
    },
    {
      id: 'NAV_PURCHASES',
      keys: ['Alt', '4'],
      keyDisplay: 'Alt + 4',
      title: 'Compras y Proveedores',
      description: 'Gestión de órdenes de compra, directorio de proveedores y recepciones',
      category: 'NAVIGATION',
      icon: 'local_shipping',
      targetNav: 'purchases'
    },
    {
      id: 'NAV_POS',
      keys: ['Alt', '5'],
      keyDisplay: 'Alt + 5',
      title: 'Punto de Venta (POS)',
      description: 'Terminal de cobro rápido multimoneda, cálculo de IVA e IGTF 3%',
      category: 'NAVIGATION',
      icon: 'point_of_sale',
      targetNav: 'sales-pos'
    },
    {
      id: 'NAV_QUOTES',
      keys: ['Alt', '6'],
      keyDisplay: 'Alt + 6',
      title: 'Presupuestos y Cotizaciones',
      description: 'Emisión de cotizaciones a clientes y conversión instantánea a factura',
      category: 'NAVIGATION',
      icon: 'request_quote',
      targetNav: 'quotes'
    },
    {
      id: 'NAV_MRP',
      keys: ['Alt', '7'],
      keyDisplay: 'Alt + 7',
      title: 'Manufactura y MRP',
      description: 'Órdenes de producción, recetas BOM y alertas de reorden por correo',
      category: 'NAVIGATION',
      icon: 'precision_manufacturing',
      targetNav: 'mrp'
    },
    {
      id: 'NAV_CRM',
      keys: ['Alt', '8'],
      keyDisplay: 'Alt + 8',
      title: 'CRM & Pipeline Comercial',
      description: 'Gestión Kanban de oportunidades y seguimiento de clientes',
      category: 'NAVIGATION',
      icon: 'view_kanban',
      targetNav: 'crm'
    },
    {
      id: 'NAV_ACCOUNTING',
      keys: ['Alt', '9'],
      keyDisplay: 'Alt + 9',
      title: 'Contabilidad General NIIF',
      description: 'Libro Diario, Balance de Comprobación y catálogo de cuentas contables',
      category: 'NAVIGATION',
      icon: 'account_balance',
      targetNav: 'accounting'
    },
    {
      id: 'NAV_CASH',
      keys: ['Alt', '0'],
      keyDisplay: 'Alt + 0',
      title: 'Cierre de Caja (Z)',
      description: 'Arqueo diario, control de efectivo USD/Bs y balance de sesión',
      category: 'NAVIGATION',
      icon: 'payments',
      targetNav: 'cash-closing'
    },
    {
      id: 'NAV_AUDIT',
      keys: ['Alt', 'B'],
      keyDisplay: 'Alt + B',
      title: 'Bitácora de Auditoría & Seguridad',
      description: 'Trazabilidad inmutable de eventos críticos, cambios de precio y roles RBAC',
      category: 'NAVIGATION',
      icon: 'shield',
      targetNav: 'audit-log'
    },
    {
      id: 'NAV_BACKUPS',
      keys: ['Alt', 'S'],
      keyDisplay: 'Alt + S',
      title: 'Respaldos Firestore',
      description: 'Gestor de copias automáticas, exportación JSON y recuperación de desastres',
      category: 'NAVIGATION',
      icon: 'cloud_sync',
      targetNav: 'backups'
    },
    {
      id: 'NAV_MANUAL',
      keys: ['Alt', 'H'],
      keyDisplay: 'Alt + H / F1',
      title: 'Manual de Usuario Interactivo',
      description: 'Guía completa de arquitectura, flujos operativos y manual imprimible',
      category: 'NAVIGATION',
      icon: 'menu_book',
      targetNav: 'manual'
    },
    {
      id: 'NAV_ARCH',
      keys: ['Alt', 'T'],
      keyDisplay: 'Alt + T',
      title: 'Ficha Técnica de Arquitectura',
      description: 'Especificación de tecnologías NestJS, Prisma, PostgreSQL y Angular',
      category: 'NAVIGATION',
      icon: 'account_tree',
      targetNav: 'architecture'
    },

    // ---------------------------------------------------------
    // 3. TERMINAL POS & ACCIONES RÁPIDAS
    // ---------------------------------------------------------
    {
      id: 'POS_PAY',
      keys: ['F10'],
      keyDisplay: 'F10',
      title: 'Cobrar / Facturar en POS',
      description: 'Abre la ventana de cobro y selección de formas de pago en el Punto de Venta',
      category: 'POS',
      icon: 'credit_card',
      targetNav: 'sales-pos'
    },

    // ---------------------------------------------------------
    // 4. UTILIDADES DEL SISTEMA Y PALETA DE COMANDOS
    // ---------------------------------------------------------
    {
      id: 'TOGGLE_PALETTE',
      keys: ['Ctrl', 'K'],
      keyDisplay: 'Ctrl + K / Alt + K',
      title: 'Paleta de Comandos & Atajos',
      description: 'Buscador centralizado con acceso a todas las acciones y navegación rápida',
      category: 'SYSTEM',
      icon: 'keyboard',
      badgeColor: 'bg-slate-100 text-slate-800'
    },
    {
      id: 'OPEN_BCV_MODAL',
      keys: ['Alt', 'Shift', 'T'],
      keyDisplay: 'Alt + Shift + T',
      title: 'Control de Tasas BCV',
      description: 'Abre el panel de consulta oficial y fijación de tasas de cambio (USD / EUR / Bs.)',
      category: 'SYSTEM',
      icon: 'currency_exchange'
    }
  ];

  // State Signals
  showPalette = signal<boolean>(false);
  lastExecutedAction = signal<ShortcutEvent | null>(null);
  activeShortcutToast = signal<{ title: string; keyDisplay: string } | null>(null);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.initGlobalListener();
  }

  private initGlobalListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // 1. ESCAPE: Always closes Command Palette or active dialogs
    if (event.key === 'Escape') {
      if (this.showPalette()) {
        event.preventDefault();
        this.showPalette.set(false);
        return;
      }
    }

    // 2. Command Palette triggers: Ctrl+K, Cmd+K, Alt+K, Alt+/, or F1
    const isCmdOrCtrl = event.ctrlKey || event.metaKey;
    const isAlt = event.altKey;
    const isShift = event.shiftKey;
    const key = event.key;

    // Open Command Palette: Ctrl+K / Cmd+K or Alt+K or Alt+/
    if ((isCmdOrCtrl && (key === 'k' || key === 'K')) || (isAlt && (key === 'k' || key === 'K' || key === '/'))) {
      event.preventDefault();
      event.stopPropagation();
      this.showPalette.update(v => !v);
      return;
    }

    // F1 Help -> Open Manual or Command Palette
    if (key === 'F1') {
      event.preventDefault();
      event.stopPropagation();
      this.triggerAction('NAV_MANUAL');
      return;
    }

    // F10 POS Payment
    if (key === 'F10') {
      event.preventDefault();
      event.stopPropagation();
      this.triggerAction('POS_PAY');
      return;
    }

    // If typing in standard text input and NO Alt/Ctrl modifier is pressed, don't intercept normal typing
    const target = event.target as HTMLElement | null;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    
    // We only process Alt combinations if Alt is pressed
    if (!isAlt && !isCmdOrCtrl) {
      return;
    }

    // If user is inside an input, we still allow Alt+ shortcuts for global navigation and creation!
    // Match against our catalog
    const matched = this.matchShortcut(event);
    if (matched) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerAction(matched.id);
    }
  }

  private matchShortcut(event: KeyboardEvent): ShortcutDefinition | null {
    const isAlt = event.altKey;
    const isShift = event.shiftKey;
    const isCtrl = event.ctrlKey || event.metaKey;
    const key = event.key ? event.key.toUpperCase() : '';
    const code = event.code || '';

    // -------------------------------------------------------------
    // CREATION SHORTCUTS (Alt + N, Alt + Shift + P, etc.)
    // -------------------------------------------------------------
    if (isAlt && !isShift && !isCtrl && (key === 'N' || code === 'KeyN')) {
      return this.getShortcutById('NEW_SALE');
    }
    if (isAlt && isShift && (key === 'P' || code === 'KeyP')) {
      return this.getShortcutById('NEW_PRODUCT');
    }
    if (isAlt && isShift && (key === 'A' || code === 'KeyA')) {
      return this.getShortcutById('NEW_STOCK_ADJUST');
    }
    if (isAlt && isShift && (key === 'C' || code === 'KeyC')) {
      return this.getShortcutById('NEW_PURCHASE');
    }
    if (isAlt && isShift && (key === 'Q' || code === 'KeyQ')) {
      return this.getShortcutById('NEW_QUOTE');
    }
    if (isAlt && isShift && (key === 'M' || code === 'KeyM')) {
      return this.getShortcutById('NEW_PRODUCTION_ORDER');
    }
    if (isAlt && isShift && (key === 'B' || code === 'KeyB')) {
      return this.getShortcutById('NEW_BOM');
    }
    if (isAlt && isShift && (key === 'J' || code === 'KeyJ')) {
      return this.getShortcutById('NEW_JOURNAL_ENTRY');
    }
    if (isAlt && isShift && (key === 'D' || code === 'KeyD')) {
      return this.getShortcutById('NEW_CRM_DEAL');
    }
    if (isAlt && isShift && (key === 'S' || code === 'KeyS')) {
      return this.getShortcutById('NEW_BACKUP');
    }
    if (isAlt && isShift && (key === 'T' || code === 'KeyT')) {
      return this.getShortcutById('OPEN_BCV_MODAL');
    }

    // -------------------------------------------------------------
    // NAVIGATION SHORTCUTS (Alt + 1..0, Alt + B, Alt + S, Alt + H, Alt + T)
    // -------------------------------------------------------------
    if (isAlt && !isShift && !isCtrl) {
      if (key === '1' || code === 'Digit1' || code === 'Numpad1') return this.getShortcutById('NAV_DASHBOARD');
      if (key === '2' || code === 'Digit2' || code === 'Numpad2') return this.getShortcutById('NAV_INVENTORY');
      if (key === '3' || code === 'Digit3' || code === 'Numpad3') return this.getShortcutById('NAV_KARDEX');
      if (key === '4' || code === 'Digit4' || code === 'Numpad4') return this.getShortcutById('NAV_PURCHASES');
      if (key === '5' || code === 'Digit5' || code === 'Numpad5') return this.getShortcutById('NAV_POS');
      if (key === '6' || code === 'Digit6' || code === 'Numpad6') return this.getShortcutById('NAV_QUOTES');
      if (key === '7' || code === 'Digit7' || code === 'Numpad7') return this.getShortcutById('NAV_MRP');
      if (key === '8' || code === 'Digit8' || code === 'Numpad8') return this.getShortcutById('NAV_CRM');
      if (key === '9' || code === 'Digit9' || code === 'Numpad9') return this.getShortcutById('NAV_ACCOUNTING');
      if (key === '0' || code === 'Digit0' || code === 'Numpad0') return this.getShortcutById('NAV_CASH');
      if (key === 'B' || code === 'KeyB') return this.getShortcutById('NAV_AUDIT');
      if (key === 'S' || code === 'KeyS') return this.getShortcutById('NAV_BACKUPS');
      if (key === 'H' || code === 'KeyH') return this.getShortcutById('NAV_MANUAL');
      if (key === 'T' || code === 'KeyT') return this.getShortcutById('NAV_ARCH');
    }

    return null;
  }

  getShortcutById(id: string): ShortcutDefinition | null {
    return this.shortcuts.find(s => s.id === id) || null;
  }

  triggerAction(actionId: string, payload?: unknown): void {
    const shortcut = this.getShortcutById(actionId);
    if (!shortcut) return;

    // Close palette if open
    this.showPalette.set(false);

    // Emit event
    this.lastExecutedAction.set({
      actionId: shortcut.id,
      targetNav: shortcut.targetNav,
      timestamp: Date.now(),
      payload
    });

    // Show temporary floating shortcut badge feedback
    this.showShortcutFeedback(shortcut);
  }

  private showShortcutFeedback(shortcut: ShortcutDefinition): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.activeShortcutToast.set({
      title: shortcut.title,
      keyDisplay: shortcut.keyDisplay
    });
    this.toastTimeout = setTimeout(() => {
      this.activeShortcutToast.set(null);
    }, 2400);
  }
}
