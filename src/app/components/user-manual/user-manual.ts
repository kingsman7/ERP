import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-manual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Action Bar (Screen Only) -->
      <div class="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">menu_book</mat-icon>
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Manual de Usuario Oficial NexusERP</h1>
            <p class="text-xs text-slate-500">Guía integral paso a paso con ejemplos prácticos para cada módulo del sistema.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            (click)="printToPdf()"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-2 shadow-sm">
            <mat-icon class="text-base">picture_as_pdf</mat-icon>
            <span>Descargar / Imprimir en PDF</span>
          </button>

          <button 
            (click)="downloadMarkdownManual()"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs">
            <mat-icon class="text-base text-slate-600">file_download</mat-icon>
            <span>Descargar Markdown</span>
          </button>
        </div>
      </div>

      <!-- Chapter Quick Nav (Screen Only) -->
      <div class="print:hidden bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span class="font-bold text-slate-700 mr-2 flex items-center gap-1">
          <mat-icon class="text-xs text-indigo-600">navigation</mat-icon>
          Índice Rápido:
        </span>
        <a href="#cap-01" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">1. Login & RBAC</a>
        <a href="#cap-02" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">2. Dashboard</a>
        <a href="#cap-03" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">3. Inventario & CPP</a>
        <a href="#cap-04" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">4. Ventas POS & Tasas</a>
        <a href="#cap-05" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">5. Manufactura MRP</a>
        <a href="#cap-06" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">6. Pipeline CRM</a>
        <a href="#cap-07" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">7. Contabilidad NIIF</a>
        <a href="#cap-08" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors">8. Respaldos Firestore</a>
      </div>

      <!-- Printable Manual Document Body -->
      <div class="bg-white p-8 md:p-12 rounded-2xl border border-slate-200/80 shadow-xs space-y-12 text-slate-800 leading-relaxed font-sans max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none">
        
        <!-- COVER HEADER (PDF / Print Ready) -->
        <div class="border-b-2 border-slate-900 pb-8 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div class="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg mb-3 uppercase tracking-wider">
              Documentación Oficial v2.5
            </div>
            <h1 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              NexusERP Enterprise Suite
            </h1>
            <p class="text-sm text-slate-600 font-medium mt-1">
              Manual Operativo de Usuario, Flujos Transaccionales y Guía de Administración
            </p>
          </div>
          <div class="text-right text-xs text-slate-500 font-mono">
            <div>Edición: Agosto 2026</div>
            <div>Arquitectura: NestJS + Angular + Firestore</div>
            <div>Autor: Arquitectura ERP Core</div>
          </div>
        </div>

        <!-- CAPÍTULO 1: ACCESO Y ROLES RBAC -->
        <section id="cap-01" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">badge</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 1: Autenticación, Acceso y Roles de Seguridad (RBAC)</h2>
          </div>
          
          <p class="text-xs text-slate-600">
            NexusERP implementa un modelo de Control de Acceso Basado en Roles (RBAC) estricto con tokens stateless. Cada usuario cuenta con un perfil definido que determina los permisos de visualización, edición, anulación o aprobación.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div class="font-bold text-slate-900 flex items-center gap-1.5">
                <mat-icon class="text-sm text-indigo-500">manage_accounts</mat-icon>
                Roles Disponibles en el Sistema:
              </div>
              <ul class="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                <li><strong class="text-slate-800">Super Administrador:</strong> Acceso ilimitado, anulación de facturas, auditoría y configuración de respaldos.</li>
                <li><strong class="text-slate-800">Cajero / Facturación:</strong> Emisión de facturas POS, cobros multimoneda, apertura y cierre Z de caja.</li>
                <li><strong class="text-slate-800">Jefe de Almacén:</strong> Recepción de compras, traslados entre bodegas, control de mermas y Kardex.</li>
                <li><strong class="text-slate-800">Supervisor de Producción:</strong> Creación de BOMs, emisión de órdenes MRP y consumo de insumos.</li>
                <li><strong class="text-slate-800">Contador General:</strong> Creación de asientos NIIF, balance de comprobación y cierre fiscal.</li>
                <li><strong class="text-slate-800">Ejecutivo de Ventas:</strong> Pipeline CRM Kanban, registro de llamadas y cotizaciones.</li>
              </ul>
            </div>

            <div class="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <div class="font-bold text-indigo-900 flex items-center gap-1.5">
                <mat-icon class="text-sm text-indigo-600">login</mat-icon>
                Ejemplo Práctico de Inicio de Sesión:
              </div>
              <p class="text-[11px] text-slate-700">
                1. Ubique el selector de perfil en el encabezado superior derecho o barra lateral.<br>
                2. Seleccione el usuario deseado (ej. <em>Alejandro Barrios - Administrador General</em>).<br>
                3. Observe cómo las opciones del menú y botones de acción se adaptan dinámicamente según la matriz de privilegios.
              </p>
            </div>
          </div>
        </section>

        <!-- CAPÍTULO 2: FACTURACIÓN Y PUNTO DE VENTA (POS) -->
        <section id="cap-02" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">point_of_sale</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 2: Facturación Multimoneda, Tasas BCV y Precios Diferenciados</h2>
          </div>

          <p class="text-xs text-slate-600">
            El módulo de ventas y POS permite emitir comprobantes fiscales en USD, Bolívares (VES) y Euros (EUR) calculados a la tasa oficial del Banco Central de Venezuela (BCV), aplicando 5 niveles de precios automáticos e impuestos fiscales (IVA 16% e IGTF 3%).
          </p>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div class="font-bold text-slate-900">Flujo de Facturación Paso a Paso:</div>
            <ol class="list-decimal list-inside space-y-2 text-[11px] text-slate-700">
              <li><strong>Selección de Almacén y Cliente:</strong> Elija el almacén de despacho (ej. <em>Almacén Central</em>) y el cliente receptor (o <em>Cliente Mostrador</em>).</li>
              <li><strong>Nivel de Precio:</strong> Seleccione el nivel comercial aplicable (Precio 1 Detal, Precio 2 Mayor, Precio 3 Distribuidor, Precio 4 VIP o Precio 5 Especial).</li>
              <li><strong>Carga de Artículos al Carrito:</strong> Busque por SKU, código de barras o nombre. Ingrese la cantidad deseada.</li>
              <li><strong>Desglose Tributario:</strong> El sistema calculará automáticamente la base imponible, exenta, IVA (16%) y aplicará el IGTF (3%) si el pago es en divisas en efectivo.</li>
              <li><strong>Cobro y Emisión:</strong> Haga clic en <em>"Emitir Factura Fiscal"</em>. Se descontará el inventario del almacén seleccionado y se registrará el comprobante digital con sello QR.</li>
            </ol>
          </div>
        </section>

        <!-- CAPÍTULO 3: INVENTARIO Y KARDEX CPP -->
        <section id="cap-03" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">inventory_2</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 3: Inventario Multialmacén y Kardex Costo Promedio Ponderado (CPP)</h2>
          </div>

          <p class="text-xs text-slate-600">
            NexusERP mantiene la valorización continua del inventario mediante la fórmula estándar de Costo Promedio Ponderado:
          </p>

          <div class="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs text-center border border-slate-800">
            Nuevo Costo CPP = [ (Stock Anterior × Costo Anterior) + (Cantidad Entrada × Costo Entrada) ] / (Stock Anterior + Cantidad Entrada)
          </div>

          <p class="text-xs text-slate-600">
            Cada venta registra una salida al costo ponderado vigente en ese instante, garantizando la precisión del Margen Bruto de Utilidad y los balances contables.
          </p>
        </section>

        <!-- CAPÍTULO 4: MANUFACTURA MRP Y ALERTAS DE REORDEN -->
        <section id="cap-04" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">precision_manufacturing</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 4: Manufactura MRP, Estructuras BOM y Alertas por Correo</h2>
          </div>

          <p class="text-xs text-slate-600">
            El módulo de Planificación de Requerimientos de Materiales (MRP) gestiona recetas de producción, insumos, costos de mano de obra y notificaciones de compras.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div class="font-bold text-slate-900">1. Lista de Materiales (BOM):</div>
              <p class="text-[11px] text-slate-600">
                Define la relación exacta de insumos para fabricar una unidad de producto terminado (ej. Carcasa de aluminio + Lente + Driver + 1.5 horas hombre de ensamblaje).
              </p>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div class="font-bold text-slate-900">2. Órdenes de Fabricación (OF):</div>
              <p class="text-[11px] text-slate-600">
                Al iniciar una orden se reservan los insumos. Al completar la producción, se descuentan las materias primas del inventario y se ingresan las unidades terminadas al almacén.
              </p>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs space-y-2">
            <div class="font-bold text-indigo-900 flex items-center gap-1.5">
              <mat-icon class="text-sm text-indigo-600">mail</mat-icon>
              Alertas Automáticas por Correo Electrónico:
            </div>
            <p class="text-[11px] text-slate-700 leading-relaxed">
              Cuando el inventario de un insumo o producto terminado desciende por debajo de su <strong>Punto de Reorden (ROP)</strong> durante la producción o las ventas POS, el sistema genera automáticamente un correo electrónico transaccional enviado a compras y gerencia (ej. <code>ae.barrios@hotmail.com</code>) con la cantidad sugerida de compra (EOQ) y presupuesto estimado en USD y Bolívares.
            </p>
          </div>
        </section>

        <!-- CAPÍTULO 5: CONTABILIDAD NIIF CON PARTIDA DOBLE -->
        <section id="cap-05" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">account_balance</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 5: Contabilidad General NIIF con Partida Doble en Tiempo Real</h2>
          </div>

          <p class="text-xs text-slate-600">
            NexusERP genera asientos de diario automáticos para cada evento operativo:
          </p>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead class="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                <tr>
                  <th class="p-2.5 border-b border-slate-200">Evento del ERP</th>
                  <th class="p-2.5 border-b border-slate-200">Cuentas al Debe (Débito)</th>
                  <th class="p-2.5 border-b border-slate-200">Cuentas al Haber (Crédito)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-[11px]">
                <tr>
                  <td class="p-2.5 font-medium text-slate-800">Venta POS a Crédito/Contado</td>
                  <td class="p-2.5 text-slate-600">1.1.01 Caja y Bancos / 1.1.03 Cuentas por Cobrar</td>
                  <td class="p-2.5 text-slate-600">4.1.01 Ingresos por Ventas + 2.1.03 Débito Fiscal IVA</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-medium text-slate-800">Costo de Ventas (Automático)</td>
                  <td class="p-2.5 text-slate-600">5.1.01 Costo de Ventas (CPP)</td>
                  <td class="p-2.5 text-slate-600">1.1.04 Inventario de Mercancías</td>
                </tr>
                <tr>
                  <td class="p-2.5 font-medium text-slate-800">Recepción de Compra</td>
                  <td class="p-2.5 text-slate-600">1.1.04 Inventario + 1.1.05 Crédito Fiscal IVA</td>
                  <td class="p-2.5 text-slate-600">2.1.01 Cuentas por Pagar Comerciales</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- CAPÍTULO 6: RESPALDOS AUTOMÁTICOS EN FIRESTORE -->
        <section id="cap-06" class="space-y-4 pt-4">
          <div class="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
            <mat-icon class="text-xl">cloud_sync</mat-icon>
            <h2 class="text-lg font-bold text-slate-900">Capítulo 6: Copias de Seguridad Automáticas en Firestore & Exportación JSON</h2>
          </div>

          <p class="text-xs text-slate-600">
            Para garantizar la resiliencia y continuidad del negocio, NexusERP integra un subsistema de respaldos en la nube sobre Google Cloud Firestore:
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900 flex items-center gap-1">
                <mat-icon class="text-sm text-indigo-600">alarm</mat-icon>
                Programación en Segundo Plano
              </div>
              <p class="text-[11px] text-slate-600">
                Ejecución periódica (cada 1h, 6h, 12h o diaria) que extrae un snapshot íntegro de los 15 módulos del ERP.
              </p>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900 flex items-center gap-1">
                <mat-icon class="text-sm text-emerald-600">download</mat-icon>
                Descarga de Archivos JSON
              </div>
              <p class="text-[11px] text-slate-600">
                Permite exportar en cualquier momento el dataset completo en formato JSON estándar con hash SHA-256 de verificación.
              </p>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div class="font-bold text-slate-900 flex items-center gap-1">
                <mat-icon class="text-sm text-amber-600">restore</mat-icon>
                Restauración Segura
              </div>
              <p class="text-[11px] text-slate-600">
                Restaura el estado total del ERP con un solo clic desde Firestore o subiendo un archivo JSON local, con snapshot previo de resguardo.
              </p>
            </div>
          </div>
        </section>

        <!-- FOOTER SIGN OFF -->
        <div class="pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
          <p class="font-semibold text-slate-700">NexusERP Enterprise MVP Core Suite — Manual de Operaciones</p>
          <p class="text-[11px] text-slate-400 mt-1">Todos los derechos reservados. Diseñado para alta disponibilidad y auditoría empresarial.</p>
        </div>

      </div>

    </div>
  `
})
export class UserManualComponent {
  erpState = inject(ErpStateService);
  authService = inject(AuthService);

  printToPdf() {
    window.print();
  }

  downloadMarkdownManual() {
    const mdContent = `# MANUAL DE USUARIO OFICIAL - NEXUSERP ENTERPRISE SUITE
**Versión:** 2.5.0 Enterprise NIIF
**Fecha:** Agosto 2026

## 1. INTRODUCCIÓN Y ARQUITECTURA
NexusERP es una plataforma integral de gestión empresarial diseñada bajo arquitectura modular, reactiva (Angular Signals) y segura (RBAC + Stateless Tokens).

## 2. ROLES DE USUARIO Y PERMISOS
- **Super Administrador:** Acceso irrestricto, configuración contable y copias de seguridad en la nube.
- **Cajero / Facturación:** Emisión de comprobantes fiscales multimoneda (USD, VES, EUR) con tasas BCV.
- **Jefe de Almacén:** Gestión multialmacén, control de entradas, salidas y Kardex CPP.
- **Supervisor de Producción:** Control de estructuras BOM, órdenes de fabricación MRP y mermas.
- **Contador General:** Plan de cuentas NIIF y asientos automáticos de partida doble.
- **Ejecutivo de Ventas:** Pipeline CRM Kanban y cotizaciones.

## 3. FACTURACIÓN Y TASAS BCV
- Emisión con cálculo en tiempo real en USD y Bolívares según la tasa del BCV.
- 5 Niveles de precio automáticos por cliente.
- Desglose de IVA 16% e IGTF 3%.

## 4. INVENTARIO Y KARDEX CPP
- Valorización en tiempo real por Costo Promedio Ponderado.
- Trazabilidad por almacén y lote.

## 5. MANUFACTURA MRP & ALERTAS DE REORDEN
- Descuento de materias primas e ingreso de productos terminados.
- Notificaciones automáticas por correo electrónico al cruzar el punto de reorden.

## 6. COPIAS DE SEGURIDAD EN FIRESTORE
- Snapshots programados automáticos en Firestore.
- Descarga de archivos JSON completos del sistema.
- Restauración segura con hash SHA-256.
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Manual_de_Usuario_NexusERP.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
