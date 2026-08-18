import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-architecture-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <mat-icon>account_tree</mat-icon>
            </div>
            <div>
              <h2 class="text-lg font-semibold tracking-tight">Ficha Técnica de Arquitectura ERP (Fase 1 - MVP)</h2>
              <p class="text-xs text-slate-300">NestJS • PostgreSQL • Prisma ORM • Angular 21 (Signals) • JWT + RBAC</p>
            </div>
          </div>
          <button (click)="closeModal.emit()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="px-6 border-b border-slate-200 bg-slate-50 flex items-center space-x-2 text-xs font-medium text-slate-600">
          <button 
            (click)="activeTab.set('proposal')"
            [class]="activeTab() === 'proposal' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'hover:text-slate-900'"
            class="px-4 py-3 transition-colors flex items-center space-x-1.5">
            <mat-icon class="text-base">handshake</mat-icon>
            <span>Propuesta y Alcance MVP</span>
          </button>

          <button 
            (click)="activeTab.set('prisma')"
            [class]="activeTab() === 'prisma' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'hover:text-slate-900'"
            class="px-4 py-3 transition-colors flex items-center space-x-1.5">
            <mat-icon class="text-base">data_object</mat-icon>
            <span>Prisma Schema & Modelos</span>
          </button>

          <button 
            (click)="activeTab.set('stack')"
            [class]="activeTab() === 'stack' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'hover:text-slate-900'"
            class="px-4 py-3 transition-colors flex items-center space-x-1.5">
            <mat-icon class="text-base">layers</mat-icon>
            <span>Capas & Seguridad JWT/RBAC</span>
          </button>

          <button 
            (click)="activeTab.set('roadmap')"
            [class]="activeTab() === 'roadmap' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white' : 'hover:text-slate-900'"
            class="px-4 py-3 transition-colors flex items-center space-x-1.5">
            <mat-icon class="text-base">flag</mat-icon>
            <span>Fase 1 vs Fase 2 (Hitos)</span>
          </button>
        </div>

        <!-- Modal Content Scrollable -->
        <div class="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          
          @if (activeTab() === 'proposal') {
            <div class="space-y-4">
              <div class="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-950">
                <h3 class="font-semibold text-base mb-2 flex items-center space-x-2">
                  <mat-icon class="text-indigo-600">verified</mat-icon>
                  <span>Declaración Ejecutiva de la Solución</span>
                </h3>
                <blockquote class="italic text-slate-700 leading-relaxed text-xs sm:text-sm pl-3 border-l-2 border-indigo-400">
                  "El desarrollo se ejecuta utilizando NestJS y PostgreSQL con Prisma ORM en el backend para garantizar un sistema rápido, seguro y con transacciones contables/logísticas 100% confiables (ACID). La interfaz de usuario desarrollada en Angular con Signals proporciona una plataforma ultra reactiva, profesional y adaptable a cualquier pantalla."
                </blockquote>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 class="font-semibold text-slate-900 flex items-center space-x-2 mb-2">
                    <mat-icon class="text-emerald-600">shield</mat-icon>
                    <span>1. Core de Seguridad & Auditoría</span>
                  </h4>
                  <ul class="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Autenticación JWT con Passport y Guards de Roles.</li>
                    <li>Registro atómico en <code class="bg-slate-200 px-1 rounded">AuditLog</code> con estado anterior vs nuevo.</li>
                    <li>Captura de IP, User ID, Timestamp y módulo de impacto.</li>
                  </ul>
                </div>

                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 class="font-semibold text-slate-900 flex items-center space-x-2 mb-2">
                    <mat-icon class="text-indigo-600">inventory_2</mat-icon>
                    <span>2. Inventario, Almacenes y Kardex</span>
                  </h4>
                  <ul class="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Kardex Valorado por Promedio Ponderado en tiempo real.</li>
                    <li>Soporte multi-almacén (Central, Norte, Depósito).</li>
                    <li>Ajustes y mermas con campo obligatorio de Documento de Soporte.</li>
                  </ul>
                </div>

                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 class="font-semibold text-slate-900 flex items-center space-x-2 mb-2">
                    <mat-icon class="text-amber-600">shopping_cart</mat-icon>
                    <span>3. Compras y Proveedores</span>
                  </h4>
                  <ul class="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>Recepción de mercancía con recalculo automático de costo promedio.</li>
                    <li>Cálculo de impuestos e impacto contable automático.</li>
                    <li>Directorio de proveedores y términos de pago.</li>
                  </ul>
                </div>

                <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 class="font-semibold text-slate-900 flex items-center space-x-2 mb-2">
                    <mat-icon class="text-sky-600">point_of_sale</mat-icon>
                    <span>4. Ventas, Facturación POS y Presupuestos</span>
                  </h4>
                  <ul class="text-xs space-y-1.5 text-slate-600 list-disc list-inside">
                    <li>POS ágil optimizado para teclado y lector de código de barras.</li>
                    <li>Cálculo automático de IVA y división de pagos.</li>
                    <li>Botón de 1-clic para convertir presupuesto/cotización en venta.</li>
                    <li>Cierre de Caja con arqueo de dinero en efectivo y reportes Z.</li>
                  </ul>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'prisma') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">prisma/schema.prisma (Type-Safe Database Model)</span>
                <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">PostgreSQL ACID Ready</span>
              </div>

              <pre class="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
datasource db &#123;
  provider = "postgresql"
  url      = env("DATABASE_URL")
&#125;

generator client &#123;
  provider = "prisma-client-js"
&#125;

enum UserRole &#123;
  ADMIN
  OPERATIONS_MANAGER
  WAREHOUSE_KEEPER
  CASHIER_SELLER
  AUDITOR
&#125;

enum MovementType &#123;
  ENTRADA_COMPRA
  SALIDA_VENTA
  AJUSTE_MERMA
  AJUSTE_SOBRANTE
  AJUSTE_INVENTARIO
&#125;

model User &#123;
  id        String     &#64;id &#64;default(uuid())
  email     String     &#64;unique
  password  String
  name      String
  role      UserRole   &#64;default(CASHIER_SELLER)
  logs      AuditLog[]
  createdAt DateTime   &#64;default(now())
&#125;

model AuditLog &#123;
  id        String   &#64;id &#64;default(uuid())
  userId    String
  user      User     &#64;relation(fields: [userId], references: [id])
  action    String   // Ej: "CREATE_INVOICE", "ADJUST_STOCK", "PURCHASE_RECEIPT"
  module    String   // Ej: "INVENTORY", "AUTH", "POS", "PURCHASES"
  details   Json?    // Guarda estado anterior y nuevo diff
  ipAddress String?
  createdAt DateTime &#64;default(now())
&#125;

model Product &#123;
  id               String            &#64;id &#64;default(uuid())
  sku              String            &#64;unique
  barcode          String            &#64;unique
  name             String
  category         String
  unit             String            // UND, KG, LT, etc.
  costPrice        Decimal           &#64;db.Decimal(12, 2) // Costo Promedio Ponderado
  salePrice        Decimal           &#64;db.Decimal(12, 2)
  minStock         Int               &#64;default(5)
  stock            Stock[]
  kardexMovements  KardexMovement[]
&#125;

model Warehouse &#123;
  id        String   &#64;id &#64;default(uuid())
  code      String   &#64;unique
  name      String
  location  String
  stocks    Stock[]
&#125;

model Stock &#123;
  id          String    &#64;id &#64;default(uuid())
  productId   String
  product     Product   &#64;relation(fields: [productId], references: [id])
  warehouseId String
  warehouse   Warehouse &#64;relation(fields: [warehouseId], references: [id])
  quantity    Int       &#64;default(0)

  &#64;unique([productId, warehouseId])
&#125;

model KardexMovement &#123;
  id                    String       &#64;id &#64;default(uuid())
  productId             String
  product               Product      &#64;relation(fields: [productId], references: [id])
  warehouseId           String
  movementType          MovementType
  docReference          String       // Factura, OC, Vale Ajuste
  supportDocument       String?      // Requerido para Mermas/Ajustes
  entryQty              Int          &#64;default(0)
  entryUnitCost         Decimal      &#64;default(0) &#64;db.Decimal(12, 2)
  exitQty               Int          &#64;default(0)
  exitUnitCost          Decimal      &#64;default(0) &#64;db.Decimal(12, 2)
  balanceQty            Int
  balanceAverageCost    Decimal      &#64;db.Decimal(12, 2)
  createdAt             DateTime     &#64;default(now())
&#125;</pre>
            </div>
          }

          @if (activeTab() === 'stack') {
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span class="text-xs font-semibold text-slate-500 uppercase">Frontend</span>
                  <p class="font-bold text-slate-900 mt-1">Angular 21 + Signals</p>
                  <p class="text-xs text-slate-500 mt-1">RxJS, Zoneless, TailwindCSS, Material Icons</p>
                </div>
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span class="text-xs font-semibold text-slate-500 uppercase">Backend REST API</span>
                  <p class="font-bold text-slate-900 mt-1">NestJS + TypeScript</p>
                  <p class="text-xs text-slate-500 mt-1">Dependency Injection, Guards, Interceptors</p>
                </div>
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span class="text-xs font-semibold text-slate-500 uppercase">ORM & DB</span>
                  <p class="font-bold text-slate-900 mt-1">Prisma + PostgreSQL</p>
                  <p class="text-xs text-slate-500 mt-1">Transacciones Atómicas $transaction([])</p>
                </div>
              </div>

              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 class="text-xs font-semibold uppercase text-slate-500 tracking-wider">Flujo de Seguridad & Middleware</h4>
                <div class="flex items-center space-x-2 text-xs overflow-x-auto py-2">
                  <span class="px-2.5 py-1.5 bg-indigo-100 text-indigo-800 font-mono rounded-lg">Angular Client</span>
                  <mat-icon class="text-slate-400 text-sm">arrow_forward</mat-icon>
                  <span class="px-2.5 py-1.5 bg-purple-100 text-purple-800 font-mono rounded-lg">HttpInterceptor (Bearer Token)</span>
                  <mat-icon class="text-slate-400 text-sm">arrow_forward</mat-icon>
                  <span class="px-2.5 py-1.5 bg-blue-100 text-blue-800 font-mono rounded-lg">NestJS JwtAuthGuard</span>
                  <mat-icon class="text-slate-400 text-sm">arrow_forward</mat-icon>
                  <span class="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 font-mono rounded-lg">RolesGuard (RBAC)</span>
                  <mat-icon class="text-slate-400 text-sm">arrow_forward</mat-icon>
                  <span class="px-2.5 py-1.5 bg-amber-100 text-amber-800 font-mono rounded-lg">AuditInterceptor (Log DB)</span>
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'roadmap') {
            <div class="space-y-4">
              <div class="border-l-2 border-indigo-500 pl-4 space-y-6">
                
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                    <span class="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Fase 1 (Core Transaccional) - COMPLETADA</span>
                  </div>
                  <div class="mt-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                    <p class="font-medium text-slate-900">Núcleo Transaccional Completo:</p>
                    <p>✓ Seguridad JWT, Roles RBAC y Bitácora de Auditoría con Diffs.</p>
                    <p>✓ Inventario multi-almacén, Kardex Valorado con Costo Promedio Ponderado.</p>
                    <p>✓ Módulo de Compras a Proveedores con recepción automática.</p>
                    <p>✓ Ventas POS, Facturación multidivisa (VES/USD/EUR), Tasas BCV Oficiales, IVA e IGTF 3%.</p>
                    <p>✓ 5 Niveles de Precios, Presupuestos y Cierre de Caja Z diario.</p>
                  </div>
                </div>

                <div>
                  <div class="flex items-center space-x-2">
                    <span class="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100"></span>
                    <span class="text-xs font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Fase 2 (MRP, CRM, Contabilidad) - IMPLEMENTADA & ACTIVA</span>
                  </div>
                  <div class="mt-2 p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1.5 text-slate-800">
                    <p class="font-medium text-amber-900">Pilares Avanzados de Fase 2 Integrados:</p>
                    <p>✓ <strong>Manufactura (MRP)</strong>: Listas de Materiales (BOM), Órdenes de Fabricación (OP), explosión de insumos, costeo directo y descuento automático de materia prima en Kardex.</p>
                    <p>✓ <strong>CRM & Pipeline Comercial</strong>: Tablero Kanban interactivo, valor ponderado del pipeline por probabilidad, gestión de leads y bitácora de interacciones (llamadas, reuniones, WhatsApp).</p>
                    <p>✓ <strong>Contabilidad General NIIF</strong>: Catálogo de cuentas, Libro Diario con asientos de partida doble automáticos (Ventas, Compras, Producción) y Balance General / Estado de Resultados en tiempo real.</p>
                  </div>
                </div>

              </div>
            </div>
          }

        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span class="text-xs text-slate-500">NexusERP v1.0.0 • Stack NestJS + PostgreSQL + Prisma + Angular</span>
          <button (click)="closeModal.emit()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-colors shadow-xs">
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  `
})
export class ArchitectureModal {
  closeModal = output<void>();
  activeTab = signal<'proposal' | 'prisma' | 'stack' | 'roadmap'>('proposal');
}
