# 📘 Manual de Usuario - HABS ERP Core Enterprise Suite

Bienvenido al **Manual de Usuario Oficial de Habs ERP Core Enterprise Suite**, el sistema integral de planificación de recursos empresariales diseñado para la gestión operativa, comercial, administrativa y contable en entornos multimoneda de alta exigencia.

---

## 📋 Tabla de Contenido
1. [Introducción y Arquitectura General](#1-introducción-y-arquitectura-general)
2. [Gestión de Roles y Permisos de Acceso](#2-gestión-de-roles-y-permisos-de-acceso)
3. [Navegación e Interfaz Principal](#3-navegación-e-interfaz-principal)
4. [Módulo 1: Tablero Principal (Dashboard) & Tasas de Cambio BCV](#4-módulo-1-tablero-principal-dashboard--tasas-de-cambio-bcv)
5. [Módulo 2: Catálogo de Inventario & Niveles de Precio](#5-módulo-2-catálogo-de-inventario--niveles-de-precio)
6. [Módulo 3: Kardex Valorizado & Movimientos (CPP)](#6-módulo-3-kardex-valorizado--movimientos-cpp)
7. [Módulo 4: Gestión de Compras & Proveedores](#7-módulo-4-gestión-de-compras--proveedores)
8. [Módulo 5: Punto de Venta (POS) & Facturación Multimoneda](#8-módulo-5-punto-de-venta-pos--facturación-multimoneda)
9. [Módulo 6: Cotizaciones y Presupuestos](#9-módulo-6-cotizaciones-y-presupuestos)
10. [Módulo 7: MRP - Manufactura & Órdenes de Producción](#10-módulo-7-mrp---manufactura--órdenes-de-producción)
11. [Módulo 8: CRM & Pipeline Comercial (Kanban)](#11-módulo-8-crm--pipeline-comercial-kanban)
12. [Módulo 9: Contabilidad General NIIF](#12-módulo-9-contabilidad-general-niif)
13. [Módulo 10: Cierre & Arqueo de Caja](#13-módulo-10-cierre--arqueo-de-caja)
14. [Módulo 11: Auditoría, Seguridad & Trazabilidad](#14-módulo-11-auditoría-seguridad--trazabilidad)
15. [Preguntas Frecuentes y Solución de Problemas](#15-preguntas-frecuentes-y-solución-de-problemas)

---

## 1. Introducción y Arquitectura General

**ERP Core Enterprise Suite** integra de punta a punta todas las operaciones esenciales de la empresa bajo una arquitectura basada en eventos, reactiva y multimoneda (USD, VES, EUR).

### Características Clave:
- **Multimoneda Dinámica**: Moneda base en dólares (USD) con conversión en tiempo real a Bolívares (VES) y Euros (EUR) integrando la tasa oficial del **Banco Central de Venezuela (BCV)**.
- **Multinivel de Precios**: Hasta 5 niveles de precios configurables por producto (Detal, Mayor, Distribuidor, VIP, Especial).
- **Costo Promedio Ponderado (CPP)**: Recálculo automático de la valoración de inventario en cada recepción de compra y proceso de manufactura.
- **Cumplimiento Tributario**: Manejo de exenciones de IVA (0%), alícuotas generales (16% u 8%) e impuesto a las grandes transacciones financieras (**IGTF 3%** en pagos en divisa en efectivo).
- **Trazabilidad 100% Auditada**: Registro inmutable de cada acción con IP, timestamp, usuario y estado previo/posterior.

---

## 2. Gestión de Roles y Permisos de Acceso

ERP cuenta con una estructura de control de acceso basada en roles (RBAC). Puede cambiar de usuario activo desde el selector en la barra superior (Header).

| Rol | Denominación | Descripción y Alcance de Permisos |
| :--- | :--- | :--- |
| `ADMIN` | **Super Administrador** | Acceso total a configuración del sistema, auditoría global, contabilidad NIIF, ajuste de stock, seguridad y exportación de reportes. |
| `OPERATIONS_MANAGER` | **Gerente de Operaciones** | Gestión completa de compras, kardex, inventario, presupuestos, lotes de manufactura y reportes financieros. |
| `CASHIER_SELLER` | **Cajero / Vendedor** | Emisión de comprobantes POS, presupuestos rápidos, consulta de catálogo y apertura/cierre de turnos de caja. |
| `WAREHOUSE_KREEPER` | **Encargado de Almacén** | Recepción de órdenes de compra, control físico de depósitos, registro de mermas/ajustes justificados y consulta de Kardex. |
| `AUDITOR` | **Auditor de Cumplimiento** | Acceso en modo **Solo Lectura** a bitácoras de seguridad, trazabilidad de inventario Kardex y balances contables. |

---

## 3. Navegación e Interfaz Principal

La interfaz se compone de 3 áreas principales:
1. **Barra Superior (Header)**:
   - Estado de la Tasa BCV (USD/EUR) y botón de sincronización manual o API.
   - Perfil del usuario activo y menú desplegable para cambio simulado de rol/demostración.
   - Indicador de estado de conexión y notificaciones en tiempo real.
2. **Menú Lateral (Sidebar)**:
   - Acceso rápido por iconos y etiquetas a los 11 módulos del sistema.
   - Botón de consulta del diagrama de **Arquitectura del Sistema**.
3. **Área de Trabajo Central**:
   - Vistas dinámicas reactivas adaptadas al módulo seleccionado.

---

## 4. Módulo 1: Tablero Principal (Dashboard) & Tasas de Cambio BCV

El **Dashboard** es el centro de mando visual para la toma de decisiones ejecutivas en tiempo real.

### Componentes del Dashboard:
- **Tarjetas de KPI Métricos**: Total de ventas del día, nivel de stock valorizado, margen bruto y cotizaciones pendientes.
- **Monitor BCV**:
  - Muestra la tasa oficial vigente en USD/VES y EUR/VES.
  - Permite hacer clic en **"Sincronizar BCV"** para actualizar la tasa vía servicio web oficial o ingresar un ajuste manual de contingencia.
- **Gráficos Estadísticos**: Rendimiento comercial por categoría de producto y flujo de caja.
- **Alertas de Inventario Crítico**: Lista automática de ítems que han alcanzado su nivel mínimo de stock.

---

## 5. Módulo 2: Catálogo de Inventario & Niveles de Precio

Gestión centralizada del catálogo de productos y servicios con arquitectura multiamacén y listas de precios flexibles.

### Funcionalidades:
- **Creación y Edición de Productos**:
  - Código SKU y Código de Barras.
  - Categoría, Unidad de Medida (`UND`, `KG`, `LT`, `CJ`, `MT`, `PQ`).
  - Marca de exención de impuesto (IVA Exento vs. Gravado 16% / 8%).
- **Estructura de 5 Niveles de Precio**:
  - **Precio 1 (Detal / General)**: Precio base al consumidor final.
  - **Precio 2 (Mayor)**: Descuento configurado para ventas al mayor (ej. 15%).
  - **Precio 3 (Distribuidor)**: Precio corporativo para canales de distribución (ej. 25%).
  - **Precio 4 (VIP)**: Tarifa preferencial para clientes frecuentes (ej. 30%).
  - **Precio 5 (Especial)**: Tarifa de remate, empleados o convenios (ej. 35%).
- **Multi-Almacén**: Visualización del stock desglosado por depósito principal y secundario.

---

## 6. Módulo 3: Kardex Valorizado & Movimientos (CPP)

El módulo de **Kardex** garantiza la trazabilidad física y monetaria del inventario mediante el algoritmo de **Costo Promedio Ponderado (CPP)**.

### Tipos de Movimientos Registrados:
- `ENTRADA_COMPRA`: Incremento por recepción de Orden de Compra.
- `SALIDA_VENTA`: Descuento automático por emisión de factura POS.
- `ENTRADA_PRODUCCION` / `SALIDA_PRODUCCION`: Consumo de materia prima y entrada de producto terminado desde el módulo MRP.
- `AJUSTE_MERMA` / `AJUSTE_SOBRANTE`: Ajustes manuales de inventario.

### Pasos para realizar un Ajuste de Inventario:
1. Haga clic en **"Nuevo Ajuste de Inventario"**.
2. Seleccione el Producto y el Almacén de destino.
3. Elija el tipo de ajuste (`MERMA` o `SOBRANTE`) e ingrese la cantidad.
4. **Requisito Obligatorio**: Ingrese el **Documento de Soporte** (ej. `MEMO-AUDIT-2026-04`) y la **Justificación detallada**. Sin estos campos, el sistema no permitirá asentar el movimiento por norma de auditoría.

---

## 7. Módulo 4: Gestión de Compras & Proveedores

Control integral del abastecimiento y la relación con los proveedores.

### Proceso Operativo de Compra:
1. **Directorio de Proveedores**: Registro de RIF/NIT, razón social, contactos y condiciones de pago (Contado, 15, 30 o 60 días).
2. **Generación de Orden de Compra (OC)**: Selección de ítems, cantidades, costos pactados e impuestos.
3. **Recepción de Mercancía**:
   - Al marcar una OC como `RECIBIDA`, el sistema incrementa automáticamente el stock del almacén seleccionado.
   - Se recalcula el **Costo Promedio Ponderado** del producto en base al nuevo lote ingresado.
   - Se genera el correspondiente asiento en el Kardex y en Contabilidad.

---

## 8. Módulo 5: Punto de Venta (POS) & Facturación Multimoneda

El módulo de **POS** está optimizado para la atención rápida en caja con soporte multimoneda y cálculo automatizado de tributos.

### Pasos para Emitir una Factura:
1. **Seleccionar Cliente**: Búsqueda por RIF/DNI o selección de Consumidor Final.
2. **Seleccionar Nivel de Precio**: Elija la lista de precio aplicable (`Detal`, `Mayor`, `Distribuidor`, `VIP`, `Especial`). Los precios del carrito se reevaluarán automáticamente.
3. **Agregar Productos**: Búsqueda por SKU, código de barras o nombre.
4. **Procesar Pago**:
   - Ingrese los montos combinando múltiples formas de pago: Efectivo USD, Efectivo EUR, Efectivo VES, Pago Móvil, Punto de Venta (Débito/Crédito), Zelle o Crédito.
   - **Aplicación de IGTF (3%)**: Si el pago incluye divisas en efectivo (USD/EUR Cash), el sistema calculará automáticamente el 3% de IGTF sobre la base en divisa correspondiente.
5. **Finalizar y Generar Comprobante**: Se abre el modal con la vista de impresión oficial de la factura electrónica/boleta, mostrando el desglose en USD y el equivalente en VES a la tasa BCV del día.

---

## 9. Módulo 6: Cotizaciones y Presupuestos

Herramienta para la elaboración de propuestas comerciales formales sin afectar inventario ni generar obligaciones fiscales inmediatas.

### Flujo de Trabajo:
1. Crear Cotización especificando cliente, fecha de expiración y productos.
2. Estado inicial: `BORRADOR` -> `ENVIADO` -> `APROBADO`.
3. **Conversión a Factura en 1 Clic**: Una vez aprobada por el cliente, presione **"Convertir a Factura"**. El sistema generará automáticamente la venta en el módulo POS, actualizará el Kardex y reservará la mercancía.

---

## 10. Módulo 7: MRP - Manufactura & Órdenes de Producción

Diseñado para empresas ensambladoras o de transformación industrial.

### 1. Estructura de Materiales (BOM - Bill of Materials):
- Definición de recetas de producción para 1 producto terminado.
- Especificación de insumos/materias primas, cantidades requeridas, porcentaje de merma esperada y costos estimados de mano de obra y costos indirectos de fabricación (CIF).

### 2. Órdenes de Producción (OF):
- Creación de Orden de Producción planificada especificando cantidad a fabricar y fecha estimada.
- Al avanzar el estado a `COMPLETADA`:
  - Se descuenta automáticamente la materia prima consumida del almacén.
  - Se suma el producto terminado al inventario con su costo unitario real acumulado.

---

## 11. Módulo 8: CRM & Pipeline Comercial (Kanban)

Gestión de la fuerza de ventas y seguimiento de oportunidades comerciales mediante un tablero visual interactivo.

### Fases del Tablero Kanban:
1. `NUEVO_LEAD`: Cliente potencial detectado.
2. `CONTACTADO`: Primer contacto realizado.
3. `DIAGNOSTICO`: Evaluación de requerimientos del cliente.
4. `PROPUESTA`: Oferta comercial enviada.
5. `NEGOCIACION`: Ajustes de precios o condiciones de pago.
6. `GANADO` / `PERDIDO`: Cierre de la oportunidad.

### Funcionalidades:
- Arrastrar y soltar (Drag & Drop) tarjetas de negocios entre etapas.
- Registro de actividades vinculadas (Llamadas, Reuniones, WhatsApp, Correo, Notas).
- Vinculación directa con cotizaciones y facturas emitidas.

---

## 12. Módulo 9: Contabilidad General NIIF

Contabilidad de doble entrada adaptada a las Normas Internacionales de Información Financiera.

### Características:
- **Plan de Cuentas Jerárquico**: Estructura codificada por niveles (Clase, Grupo, Cuenta, Subcuenta) para Activos, Pasivos, Patrimonio, Ingresos, Costos y Gastos.
- **Asientos Contables Automáticos**: Generados en tiempo real tras operaciones de Ventas, Compras, Producción y Cierres de Caja.
- **Asientos Manuales**: Registro de comprobantes diarios con validación obligatoria de balance ($Debe = Haber$).

---

## 13. Módulo 10: Cierre & Arqueo de Caja

Control de seguridad financiera para cada turno de caja.

### Proceso de Cierre:
1. Apertura de caja con monto inicial en efectivo.
2. Operación de ventas durante la jornada.
3. **Proceso de Arqueo**:
   - El cajero ingresa el monto total en efectivo físico contado en bóveda/caja.
   - El sistema calcula la diferencia (`Conteo Físico - (Monto Inicial + Ventas en Efectivo)`).
   - Generación de informe de descuadre (sobrante o faltante) y registro de notas de cierre antes de bloquear el turno.

---

## 14. Módulo 11: Auditoría, Seguridad & Trazabilidad

Módulo exclusivo de supervisión y cumplimiento normativo.

### Bitácora de Auditoría (Audit Log):
- Cada transacción del sistema (creación de factura, ajuste de stock, login, sincronización BCV, asiento contable) queda registrada inmutablemente.
- **Campos registrados**: ID de Evento, Usuario, Rol, Módulo, Acción, Dirección IP, Timestamp y Estado Previas vs. Nuevo Estado (JSON diff).

---

## 15. Preguntas Frecuentes y Solución de Problemas

### ❓ ¿Qué ocurre si la API del BCV no responde al sincronizar?
> El sistema cambiará automáticamente al modo `FALLBACK_MANUAL`. El Administrador o Gerente de Operaciones puede ingresar la tasa del día manualmente manteniendo la operatividad continua de las cajas POS.

### ❓ ¿Cómo se calcula el IGTF del 3% en las ventas?
> Se aplica únicamente cuando la modalidad de pago seleccionada es **Efectivo USD** o **Efectivo EUR**. El sistema calcula el 3% sobre el monto abonado en esa moneda y añade el renglón correspondiente a la factura fiscal.

### ❓ ¿Por qué el sistema me rechaza un ajuste de inventario en el Kardex?
> Verifique que haya completado los campos **"Documento de Soporte"** y **"Justificación"**. Por política de trazabilidad, el módulo de inventario bloquea ajustes anónimos sin respaldo documental.

---
*Manual generado automáticamente por Antigravity AI Assistant para ERP Core Enterprise Suite.*
