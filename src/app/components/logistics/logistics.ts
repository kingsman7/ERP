import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import {
  DispatchGuide,
  DeliveryOrder,
  TransportReason,
  CarrierType,
  DeliveryReceptionDetails,
  Product,
  Invoice
} from '../../models/erp.models';
import { InvoiceModal } from '../invoice-modal/invoice-modal';

@Component({
  selector: 'app-logistics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, InvoiceModal],
  template: `
    <div class="space-y-6 pb-16">
      
      <!-- Top Header & Action Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shadow-xs">
            <mat-icon class="text-2xl">local_shipping</mat-icon>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Logística, Despachos y Control de Entregas
              </h1>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                SENIAT SNAT/2011/00071
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Expedición de Guías de Despacho con número de control obligatorio, amparo legal en vía pública y registro de recepción conforme
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            id="btn-open-new-guide"
            (click)="openNewGuideModal()"
            class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer">
            <mat-icon class="text-base">add_road</mat-icon>
            <span>+ Nueva Guía de Despacho</span>
          </button>
        </div>
      </div>

      <!-- Stats Summary KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- KPI 1: Guías Emitidas -->
        <div class="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Despachos</span>
            <div class="flex items-baseline space-x-1.5 mt-1">
              <span class="text-2xl font-bold text-slate-900 font-mono">{{ stateService.totalDispatchesCount() }}</span>
              <span class="text-xs text-slate-500 font-medium">guías</span>
            </div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <mat-icon>receipt_long</mat-icon>
          </div>
        </div>

        <!-- KPI 2: En Tránsito (Amparo de Circulación) -->
        <div class="bg-white rounded-2xl border border-amber-200 p-4.5 shadow-xs flex items-center justify-between bg-amber-50/20">
          <div>
            <span class="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">En Tránsito / Circulación</span>
            <div class="flex items-baseline space-x-1.5 mt-1">
              <span class="text-2xl font-bold text-amber-900 font-mono">{{ stateService.inTransitDispatchesCount() }}</span>
              <span class="text-xs text-amber-700 font-medium">en vía pública</span>
            </div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <mat-icon>departure_board</mat-icon>
          </div>
        </div>

        <!-- KPI 3: Entregadas Conformes -->
        <div class="bg-white rounded-2xl border border-emerald-200 p-4.5 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <span class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Entregadas Conformes</span>
            <div class="flex items-baseline space-x-1.5 mt-1">
              <span class="text-2xl font-bold text-emerald-900 font-mono">{{ stateService.deliveredDispatchesCount() }}</span>
              <span class="text-xs text-emerald-700 font-medium">con comprobante</span>
            </div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <mat-icon>check_circle</mat-icon>
          </div>
        </div>

        <!-- KPI 4: Pendientes por Facturar Fiscalmente -->
        <div class="bg-white rounded-2xl border border-blue-200 p-4.5 shadow-xs flex items-center justify-between bg-blue-50/20">
          <div>
            <span class="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Pendientes por Facturar</span>
            <div class="flex items-baseline space-x-1.5 mt-1">
              <span class="text-2xl font-bold text-blue-900 font-mono">{{ stateService.pendingInvoiceDispatchesCount() }}</span>
              <span class="text-xs text-blue-700 font-medium">factura diferida</span>
            </div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <mat-icon>pending_actions</mat-icon>
          </div>
        </div>

      </div>

      <!-- Navigation Sub-Tabs -->
      <div class="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button 
          id="tab-guias-despacho"
          (click)="activeSubTab.set('guias')"
          [class]="activeSubTab() === 'guias' ? 'bg-amber-600 text-white font-semibold shadow-2xs' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'"
          class="px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer">
          <mat-icon class="text-sm">receipt_long</mat-icon>
          <span>Guías de Despacho (SENIAT)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px]" [class]="activeSubTab() === 'guias' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">
            {{ stateService.dispatchGuides().length }}
          </span>
        </button>

        <button 
          id="tab-ordenes-entrega"
          (click)="activeSubTab.set('entregas')"
          [class]="activeSubTab() === 'entregas' ? 'bg-amber-600 text-white font-semibold shadow-2xs' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'"
          class="px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer">
          <mat-icon class="text-sm">assignment_turned_in</mat-icon>
          <span>Control de Entregas y Recepción</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px]" [class]="activeSubTab() === 'entregas' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">
            {{ stateService.deliveryOrders().length }}
          </span>
        </button>

        <button 
          id="tab-facturacion-masiva"
          (click)="activeSubTab.set('facturacion')"
          [class]="activeSubTab() === 'facturacion' ? 'bg-amber-600 text-white font-semibold shadow-2xs' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'"
          class="px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer">
          <mat-icon class="text-sm">point_of_sale</mat-icon>
          <span>Facturación Consolidada de Despachos</span>
          @if (stateService.pendingInvoiceDispatchesCount() > 0) {
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
              {{ stateService.pendingInvoiceDispatchesCount() }}
            </span>
          }
        </button>
      </div>

      <!-- ========================================================= -->
      <!-- SUB-TAB 1: GUÍAS DE DESPACHO (SENIAT SNAT/2011/00071) -->
      <!-- ========================================================= -->
      @if (activeSubTab() === 'guias') {
        
        <!-- Search & Filters -->
        <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
            <input 
              type="text"
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
              placeholder="Buscar por N° Guía, N° Control, Cliente, Chofer o Placa..."
              class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50" />
          </div>

          <div class="flex items-center space-x-2 flex-wrap gap-y-2">
            <select 
              [value]="statusFilter()"
              (change)="onStatusFilterChange($event)"
              class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="ALL">Todos los Estados</option>
              <option value="EN_TRANSITO">En Tránsito</option>
              <option value="ENTREGADA">Entregada Conforme</option>
              <option value="ENTREGADA_CON_NOVEDAD">Entregada con Novedad</option>
              <option value="ANULADA">Anulada</option>
            </select>

            <select 
              [value]="warehouseFilter()"
              (change)="onWarehouseFilterChange($event)"
              class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="ALL">Todos los Almacenes</option>
              @for (wh of stateService.warehouses(); track wh.id) {
                <option [value]="wh.id">{{ wh.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Dispatch Guides Table / Cards -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3 px-4">N° Guía / Control SENIAT</th>
                  <th class="py-3 px-4">Fecha Emisión</th>
                  <th class="py-3 px-4">Destinatario / Dirección</th>
                  <th class="py-3 px-4">Motivo Traslado</th>
                  <th class="py-3 px-4">Transporte & Chofer</th>
                  <th class="py-3 px-4 text-center">Bultos / Peso</th>
                  <th class="py-3 px-4 text-center">Estado Logístico</th>
                  <th class="py-3 px-4 text-center">Facturación</th>
                  <th class="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (g of filteredGuides(); track g.id) {
                  <tr class="hover:bg-amber-50/30 transition-colors">
                    
                    <!-- N° Guía & Control SENIAT -->
                    <td class="py-3.5 px-4 font-mono">
                      <div class="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                        <mat-icon class="text-amber-600 text-base">local_shipping</mat-icon>
                        <span>{{ g.guideNumber }}</span>
                      </div>
                      <div class="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                        Control: {{ g.controlNumber }}
                      </div>
                      @if (g.originQuoteNumber) {
                        <div class="text-[10px] text-slate-400 mt-0.5">Cotiz: {{ g.originQuoteNumber }}</div>
                      }
                    </td>

                    <!-- Fecha -->
                    <td class="py-3.5 px-4 text-slate-600">
                      <span class="font-medium text-slate-900 block">{{ g.issueDate.substring(0, 10) }}</span>
                      <span class="text-[10px] text-slate-400">{{ g.issueDate.substring(11, 16) }}</span>
                    </td>

                    <!-- Destinatario -->
                    <td class="py-3.5 px-4 max-w-[200px]">
                      <span class="font-bold text-slate-900 block truncate">{{ g.customerName || 'Traslado Interno' }}</span>
                      <span class="text-[10px] text-slate-400 font-mono">{{ g.customerTaxId }}</span>
                      <p class="text-[10px] text-slate-500 truncate mt-0.5" title="{{ g.destinationAddress }}">
                        📍 {{ g.destinationAddress }}
                      </p>
                    </td>

                    <!-- Motivo Traslado -->
                    <td class="py-3.5 px-4">
                      <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {{ formatReason(g.transportReason) }}
                      </span>
                      <span class="block text-[10px] text-slate-400 mt-1 truncate max-w-[120px]">
                        {{ g.originWarehouseName }}
                      </span>
                    </td>

                    <!-- Transporte & Chofer -->
                    <td class="py-3.5 px-4">
                      <div class="font-medium text-slate-800 flex items-center space-x-1">
                        <mat-icon class="text-xs text-slate-400">person</mat-icon>
                        <span class="truncate max-w-[130px]">{{ g.driverName }}</span>
                      </div>
                      <div class="text-[10px] text-slate-500 font-mono mt-0.5">
                        C.I. {{ g.driverIdDoc }} • <span class="font-bold text-slate-700 bg-slate-100 px-1 rounded">{{ g.vehiclePlate }}</span>
                      </div>
                    </td>

                    <!-- Bultos & Peso -->
                    <td class="py-3.5 px-4 text-center font-mono">
                      <span class="font-bold text-slate-900">{{ g.totalPackages }} bultos</span>
                      <span class="block text-[10px] text-slate-500">{{ g.totalWeightKg }} kg</span>
                    </td>

                    <!-- Estado Logístico -->
                    <td class="py-3.5 px-4 text-center">
                      @switch (g.status) {
                        @case ('EN_TRANSITO') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center space-x-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>En Tránsito</span>
                          </span>
                        }
                        @case ('ENTREGADA') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
                            <mat-icon class="text-xs">check</mat-icon>
                            <span>Entregada</span>
                          </span>
                        }
                        @case ('ENTREGADA_CON_NOVEDAD') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center space-x-1">
                            <mat-icon class="text-xs">warning</mat-icon>
                            <span>Con Novedad</span>
                          </span>
                        }
                        @case ('ANULADA') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Anulada
                          </span>
                        }
                        @default {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                            {{ g.status }}
                          </span>
                        }
                      }
                    </td>

                    <!-- Estado Facturación -->
                    <td class="py-3.5 px-4 text-center">
                      @if (g.invoicedInvoiceNumber) {
                        <button 
                          (click)="viewInvoiceModal(g.invoicedInvoiceNumber)"
                          class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors inline-flex items-center space-x-1 cursor-pointer">
                          <mat-icon class="text-xs">receipt</mat-icon>
                          <span>{{ g.invoicedInvoiceNumber }}</span>
                        </button>
                      } @else if (g.status === 'ANULADA') {
                        <span class="text-[10px] text-slate-400">—</span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Pendiente Factura
                        </span>
                      }
                    </td>

                    <!-- Acciones -->
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end space-x-1.5">
                        
                        <!-- Ver / Imprimir Documento Oficial SENIAT -->
                        <button 
                          (click)="openPrintGuideModal(g)"
                          title="Imprimir Formato Oficial SENIAT SNAT/2011/00071"
                          class="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer">
                          <mat-icon class="text-base">print</mat-icon>
                        </button>

                        <!-- Registrar Entrega Conforme si no está entregada -->
                        @if (g.status === 'EN_TRANSITO') {
                          <button 
                            (click)="openDeliveryReceiptForGuide(g)"
                            title="Registrar Recepción Conforme del Cliente"
                            class="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
                            <mat-icon class="text-base">task_alt</mat-icon>
                          </button>
                        }

                        <!-- Facturar Guía si no está facturada -->
                        @if (!g.invoicedInvoiceNumber && g.status !== 'ANULADA') {
                          <button 
                            (click)="invoiceSingleGuide(g)"
                            title="Emitir Factura Fiscal amparando esta Guía"
                            class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer">
                            <mat-icon class="text-base">point_of_sale</mat-icon>
                          </button>
                        }

                        <!-- Anular Guía si no está facturada -->
                        @if (!g.invoicedInvoiceNumber && g.status !== 'ANULADA') {
                          <button 
                            (click)="confirmCancelGuide(g)"
                            title="Anular Guía de Despacho (Restituye Stock)"
                            class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer">
                            <mat-icon class="text-base">cancel</mat-icon>
                          </button>
                        }

                      </div>
                    </td>

                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-slate-400">
                      <mat-icon class="text-3xl text-slate-300 mb-1 block">local_shipping</mat-icon>
                      No se encontraron Guías de Despacho con los filtros aplicados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      }

      <!-- ========================================================= -->
      <!-- SUB-TAB 2: CONTROL DE ENTREGAS Y RECEPCIÓN CONFORME -->
      <!-- ========================================================= -->
      @if (activeSubTab() === 'entregas') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (ord of stateService.deliveryOrders(); track ord.id) {
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all">
              
              <div class="space-y-3">
                <!-- Top Row: Orden N° & Estado -->
                <div class="flex items-start justify-between">
                  <div>
                    <span class="font-mono font-bold text-base text-slate-900">{{ ord.orderNumber }}</span>
                    <p class="text-[11px] text-slate-400 font-mono mt-0.5">Control: {{ ord.controlNumber }}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Fecha: {{ ord.issueDate.substring(0, 10) }}</p>
                  </div>
                  
                  <div>
                    @if (ord.status === 'ENTREGADA') {
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                        <mat-icon class="text-xs">verified</mat-icon>
                        <span>Entregada Conforme</span>
                      </span>
                    } @else if (ord.status === 'ENTREGADA_PARCIAL') {
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                        <mat-icon class="text-xs">warning</mat-icon>
                        <span>Con Novedad</span>
                      </span>
                    } @else if (ord.status === 'EN_RUTA') {
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center space-x-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>En Ruta</span>
                      </span>
                    } @else {
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {{ ord.status }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Amparo Guía de Despacho -->
                <div class="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs flex items-center justify-between">
                  <div>
                    <span class="text-[10px] text-amber-800 font-bold block uppercase">Guía de Despacho SENIAT:</span>
                    <span class="font-mono font-bold text-amber-950">{{ ord.dispatchGuideNumber }}</span>
                  </div>
                  <span class="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Ctrl: {{ ord.dispatchControlNumber }}
                  </span>
                </div>

                <!-- Cliente & Dirección -->
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span class="text-slate-400 font-bold uppercase text-[10px]">Cliente & Destino:</span>
                  <p class="font-bold text-slate-900">{{ ord.customerName }}</p>
                  <p class="text-slate-500 font-mono text-[11px]">{{ ord.customerTaxId }}</p>
                  <p class="text-slate-600 text-[11px] truncate">📍 {{ ord.deliveryAddress }}</p>
                </div>

                <!-- Transportista / Chofer -->
                <div class="text-xs text-slate-600 flex items-center justify-between">
                  <div>
                    <span class="text-slate-400 text-[10px] block uppercase">Chofer Asignado:</span>
                    <span class="font-medium text-slate-800">{{ ord.driverName }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-slate-400 text-[10px] block uppercase">Vehículo:</span>
                    <span class="font-mono font-bold text-slate-800">{{ ord.vehiclePlate }}</span>
                  </div>
                </div>

                <!-- Recepción Details si ya fue entregado -->
                @if (ord.reception; as rec) {
                  <div class="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                    <div class="flex items-center justify-between text-emerald-900 font-bold">
                      <span class="flex items-center space-x-1">
                        <mat-icon class="text-sm text-emerald-600">verified_user</mat-icon>
                        <span>Comprobante Firmado</span>
                      </span>
                      <span class="text-[10px] font-normal text-emerald-700">{{ rec.receivedDate }}</span>
                    </div>
                    <p class="text-slate-700"><strong>Recibido por:</strong> {{ rec.receivedByName }} (C.I. {{ rec.receivedByIdDoc }})</p>
                    @if (rec.observations) {
                      <p class="text-slate-600 italic">"{{ rec.observations }}"</p>
                    }
                    @if (rec.signedProofUrl) {
                      <div class="mt-2 pt-2 border-t border-emerald-200 flex items-center space-x-2">
                        <div class="w-8 h-8 rounded bg-white border border-emerald-300 flex items-center justify-center text-emerald-700">
                          <mat-icon class="text-base">image</mat-icon>
                        </div>
                        <span class="text-[11px] text-emerald-800 font-medium">Sello / Firma Digital Adjunto</span>
                      </div>
                    }
                  </div>
                }

              </div>

              <!-- Bottom Actions -->
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span class="font-mono text-xs text-slate-500">{{ ord.totalPackages }} bultos ({{ ord.totalWeightKg }} kg)</span>

                <div class="flex items-center space-x-1.5">
                  @if (ord.status !== 'ENTREGADA' && ord.status !== 'CANCELADA') {
                    <button 
                      (click)="openDeliveryReceiptModal(ord)"
                      class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer">
                      <mat-icon class="text-sm">draw</mat-icon>
                      <span>Registrar Recepción</span>
                    </button>
                  } @else {
                    <button 
                      (click)="viewDeliveryDetails(ord)"
                      class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer">
                      <mat-icon class="text-sm">visibility</mat-icon>
                      <span>Ver Comprobante</span>
                    </button>
                  }
                </div>
              </div>

            </div>
          } @empty {
            <div class="col-span-3 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No hay órdenes de entrega registradas en este momento.
            </div>
          }
        </div>
      }

      <!-- ========================================================= -->
      <!-- SUB-TAB 3: FACTURACIÓN CONSOLIDADA DE DESPACHOS -->
      <!-- ========================================================= -->
      @if (activeSubTab() === 'facturacion') {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div class="max-w-3xl">
            <h2 class="text-base font-bold text-slate-900 flex items-center space-x-2">
              <mat-icon class="text-blue-600">point_of_sale</mat-icon>
              <span>Emisión de Factura Fiscal desde Guías de Despacho (SENIAT)</span>
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              Conforme a la normativa tributaria venezolana, cuando la mercancía ya ha sido entregada y descargada físicamente del inventario mediante Guía de Despacho, la factura fiscal subsiguiente debe amparar dichas guías <strong>sin duplicar el descuento de stock</strong>.
            </p>
          </div>

          <!-- Pending Guides grouped by customer -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Guías de Despacho Pendientes por Facturar:
            </h3>

            <div class="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              @for (g of unInvoicedGuides(); track g.id) {
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  
                  <div class="flex items-start space-x-3">
                    <input 
                      type="checkbox"
                      [checked]="selectedGuideIdsForInvoice().includes(g.id)"
                      (change)="toggleGuideSelection(g.id)"
                      class="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                    <div>
                      <div class="flex items-center space-x-2 font-mono">
                        <span class="font-bold text-slate-900 text-sm">{{ g.guideNumber }}</span>
                        <span class="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Control: {{ g.controlNumber }}
                        </span>
                        <span class="text-xs text-slate-500">({{ g.issueDate.substring(0, 10) }})</span>
                      </div>
                      <p class="text-xs text-slate-800 font-semibold mt-0.5">{{ g.customerName }} <span class="font-mono text-slate-400 font-normal">({{ g.customerTaxId }})</span></p>
                      <p class="text-[11px] text-slate-500">📍 {{ g.destinationAddress }} • {{ g.items.length }} productos ({{ g.totalPackages }} bultos)</p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-4 sm:self-center">
                    <div class="text-right font-mono">
                      <span class="text-sm font-bold text-slate-900 block">\${{ formatMoney(g.totalDeclaredValue) }}</span>
                      <span class="text-[10px] text-slate-400">Valor Declarado</span>
                    </div>

                    <button 
                      (click)="invoiceSingleGuide(g)"
                      class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer">
                      <mat-icon class="text-xs">receipt_long</mat-icon>
                      <span>Facturar Esta Guía</span>
                    </button>
                  </div>

                </div>
              } @empty {
                <div class="p-8 text-center text-slate-400 text-xs">
                  <mat-icon class="text-3xl text-emerald-500 mb-1 block">task_alt</mat-icon>
                  ¡Excelente! Todas las Guías de Despacho emitidas ya cuentan con su correspondiente Factura Fiscal o están al día.
                </div>
              }
            </div>

            @if (selectedGuideIdsForInvoice().length > 1) {
              <div class="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span class="font-bold text-blue-950 text-xs">Facturación Consolidada Seleccionada</span>
                  <p class="text-[11px] text-blue-700">{{ selectedGuideIdsForInvoice().length }} guías de despacho seleccionadas para unificar en una sola Factura Fiscal.</p>
                </div>
                <button 
                  (click)="invoiceSelectedMultipleGuides()"
                  class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer">
                  <mat-icon class="text-sm">receipt</mat-icon>
                  <span>Emitir Factura Unificada ({{ selectedGuideIdsForInvoice().length }})</span>
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL 1: NUEVA GUÍA DE DESPACHO (FORMULARIO SENIAT) -->
      <!-- ========================================================= -->
      @if (showNewGuideModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Modal Header -->
            <div class="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="p-2 rounded-xl bg-white/10 text-white flex items-center justify-center">
                  <mat-icon>local_shipping</mat-icon>
                </div>
                <div>
                  <h3 class="font-bold text-sm sm:text-base tracking-tight flex items-center space-x-2">
                    <span>Emisión de Guía de Despacho Oficial</span>
                    <span class="px-2 py-0.5 bg-amber-800 rounded font-mono text-xs border border-white/20">
                      {{ stateService.generateNextDispatchGuideNumber() }}
                    </span>
                  </h3>
                  <p class="text-[11px] text-amber-100">
                    Providencia Administrativa SENIAT/SNAT/2011/00071 • N° Control Sugerido: {{ stateService.generateNextDispatchControlNumber() }}
                  </p>
                </div>
              </div>
              <button 
                (click)="showNewGuideModal.set(false)" 
                class="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Modal Body (Scrollable Form) -->
            <div class="p-6 overflow-y-auto space-y-5 text-xs">
              
              <!-- Section 1: Almacén de Origen & Motivo de Traslado -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span class="block font-bold text-slate-700 text-[11px] mb-1">Almacén de Origen (Despacho) *</span>
                  <select 
                    [value]="newGuideOriginWarehouseId()"
                    (change)="newGuideOriginWarehouseId.set($any($event.target).value)"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                    @for (wh of stateService.warehouses(); track wh.id) {
                      <option [value]="wh.id">{{ wh.name }} ({{ wh.location }})</option>
                    }
                  </select>
                </div>

                <div>
                  <span class="block font-bold text-slate-700 text-[11px] mb-1">Motivo del Traslado (SENIAT) *</span>
                  <select 
                    [value]="newGuideTransportReason()"
                    (change)="newGuideTransportReason.set($any($event.target).value)"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="VENTA_MERCANCIA">Venta de Mercancía</option>
                    <option value="TRASLADO_ENTRE_ALMACENES">Traslado entre Almacenes / Sucursales</option>
                    <option value="CONSIGNACION">Mercancía en Consignación</option>
                    <option value="DEVOLUCION_PROVEEDOR">Devolución a Proveedor</option>
                    <option value="REPARACION_MANTENIMIENTO">Reparación / Mantenimiento</option>
                    <option value="DEMOSTRACION_EXHIBICION">Demostración / Exhibición</option>
                    <option value="OTRO">Otro Motivo Legal</option>
                  </select>
                </div>

                <div>
                  <span class="block font-bold text-slate-700 text-[11px] mb-1">N° de Control SENIAT *</span>
                  <input 
                    type="text"
                    [value]="newGuideControlNumber()"
                    (input)="newGuideControlNumber.set($any($event.target).value)"
                    placeholder="00-000101"
                    class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-rose-700 font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>

              <!-- Section 2: Destinatario / Cliente y Dirección de Entrega -->
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <mat-icon class="text-amber-600 text-base">location_on</mat-icon>
                    <span>Destinatario y Lugar de Entrega</span>
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Seleccionar Cliente Registrado</span>
                    <select 
                      [value]="newGuideCustomerId()"
                      (change)="onSelectCustomerForGuide($any($event.target).value)"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="">-- Cliente Manual / Traslado --</option>
                      @for (c of stateService.customers(); track c.id) {
                        <option [value]="c.id">{{ c.name }} ({{ c.taxId }})</option>
                      }
                    </select>
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Nombre / Razón Social Destinatario *</span>
                    <input 
                      type="text"
                      [value]="newGuideCustomerName()"
                      (input)="newGuideCustomerName.set($any($event.target).value)"
                      placeholder="Ej: Distribuidora Los Andes C.A."
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">RIF / Cédula Destinatario *</span>
                    <input 
                      type="text"
                      [value]="newGuideCustomerTaxId()"
                      (input)="newGuideCustomerTaxId.set($any($event.target).value)"
                      placeholder="J-12345678-9"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="md:col-span-2">
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Dirección Exacta de Destino (SENIAT Obligatorio) *</span>
                    <input 
                      type="text"
                      [value]="newGuideDestinationAddress()"
                      (input)="newGuideDestinationAddress.set($any($event.target).value)"
                      placeholder="Av. Principal, Galpón N° 4, Zona Industrial, Valencia"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Persona de Contacto / Teléfono</span>
                    <input 
                      type="text"
                      [value]="newGuideRecipientContact()"
                      (input)="newGuideRecipientContact.set($any($event.target).value)"
                      placeholder="Carlos Pérez (0414-1234567)"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>

              <!-- Section 3: Datos de Transporte, Conductor y Vehículo -->
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                  <mat-icon class="text-amber-600 text-base">directions_car</mat-icon>
                  <span>Identificación del Transporte, Conductor y Vehículo (SENIAT)</span>
                </span>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Tipo de Transporte *</span>
                    <select 
                      [value]="newGuideCarrierType()"
                      (change)="newGuideCarrierType.set($any($event.target).value)"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="PROPIO">Vehículo Propio de la Empresa</option>
                      <option value="TERCERO_EMPRESA">Empresa de Fletes / Encomiendas</option>
                      <option value="TERCERO_PARTICULAR">Transportista Particular</option>
                    </select>
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Nombre Conductor / Chofer *</span>
                    <input 
                      type="text"
                      [value]="newGuideDriverName()"
                      (input)="newGuideDriverName.set($any($event.target).value)"
                      placeholder="José Manuel Rivas"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Cédula de Identidad Chofer *</span>
                    <input 
                      type="text"
                      [value]="newGuideDriverIdDoc()"
                      (input)="newGuideDriverIdDoc.set($any($event.target).value)"
                      placeholder="V-14.890.321"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Placa del Vehículo *</span>
                    <input 
                      type="text"
                      [value]="newGuideVehiclePlate()"
                      (input)="newGuideVehiclePlate.set($any($event.target).value)"
                      placeholder="A89BC2D"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Modelo / Marca Vehículo</span>
                    <input 
                      type="text"
                      [value]="newGuideVehicleModel()"
                      (input)="newGuideVehicleModel.set($any($event.target).value)"
                      placeholder="Ford F-350 / Mack Granit"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Teléfono del Chofer</span>
                    <input 
                      type="text"
                      [value]="newGuideDriverPhone()"
                      (input)="newGuideDriverPhone.set($any($event.target).value)"
                      placeholder="0412-9876543"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>

                  <div>
                    <span class="block text-slate-600 text-[10px] font-bold uppercase mb-1">Fecha Estimada de Llegada</span>
                    <input 
                      type="date"
                      [value]="newGuideEstimatedDeliveryDate()"
                      (input)="newGuideEstimatedDeliveryDate.set($any($event.target).value)"
                      class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>

              <!-- Section 4: Artículos a Despachar (Deducción automática de stock) -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                    <mat-icon class="text-amber-600 text-base">inventory_2</mat-icon>
                    <span>Artículos a Despachar (Descuento inmediato del Kardex)</span>
                  </span>
                  
                  <button 
                    (click)="addEmptyItemRow()"
                    class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                    <mat-icon class="text-xs">add</mat-icon>
                    <span>+ Agregar Línea</span>
                  </button>
                </div>

                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="bg-slate-100/80 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                        <th class="p-2.5">Producto</th>
                        <th class="p-2.5 text-center w-24">Stock Disp.</th>
                        <th class="p-2.5 text-center w-24">Cant. Despacho</th>
                        <th class="p-2.5 text-center w-24">Bultos</th>
                        <th class="p-2.5 text-center w-24">Peso (kg)</th>
                        <th class="p-2.5 text-right w-28">Valor Total</th>
                        <th class="p-2.5 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (row of newGuideItems(); track $index; let i = $index) {
                        @let prod = getProductById(row.productId);
                        @let whStock = getProductStockInWarehouse(row.productId, newGuideOriginWarehouseId());
                        <tr class="hover:bg-slate-50/50">
                          
                          <!-- Selector de Producto -->
                          <td class="p-2">
                            <select 
                              [value]="row.productId"
                              (change)="updateItemProduct(i, $any($event.target).value)"
                              class="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs">
                              <option value="">-- Seleccione un Producto --</option>
                              @for (p of stateService.products(); track p.id) {
                                <option [value]="p.id">{{ p.sku }} - {{ p.name }} (Stock: {{ p.totalStock }})</option>
                              }
                            </select>
                          </td>

                          <!-- Stock Disponible en Almacén -->
                          <td class="p-2 text-center font-mono font-bold" [class]="whStock < row.quantity ? 'text-rose-600' : 'text-slate-700'">
                            {{ whStock }}
                          </td>

                          <!-- Cantidad a Despachar -->
                          <td class="p-2">
                            <input 
                              type="number"
                              min="1"
                              [value]="row.quantity"
                              (input)="updateItemQuantity(i, +$any($event.target).value)"
                              class="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-center text-xs font-bold" />
                          </td>

                          <!-- Bultos -->
                          <td class="p-2">
                            <input 
                              type="number"
                              min="1"
                              [value]="row.packagesCount"
                              (input)="updateItemPackages(i, +$any($event.target).value)"
                              class="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-center text-xs" />
                          </td>

                          <!-- Peso kg -->
                          <td class="p-2">
                            <input 
                              type="number"
                              step="0.1"
                              min="0"
                              [value]="row.weightKg"
                              (input)="updateItemWeight(i, +$any($event.target).value)"
                              class="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-mono text-center text-xs" />
                          </td>

                          <!-- Valor Total Estimado -->
                          <td class="p-2 text-right font-mono font-bold text-slate-800">
                            \${{ (prod ? (row.quantity * prod.salePrice) : 0).toFixed(2) }}
                          </td>

                          <!-- Eliminar fila -->
                          <td class="p-2 text-center">
                            <button 
                              (click)="removeItemRow(i)"
                              class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer">
                              <mat-icon class="text-base">delete</mat-icon>
                            </button>
                          </td>

                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="flex items-center justify-between text-xs font-mono pt-2 text-slate-600">
                  <span>Total Bultos: <strong>{{ calculatedNewGuideTotalPackages() }}</strong></span>
                  <span>Peso Total: <strong>{{ calculatedNewGuideTotalWeight() }} kg</strong></span>
                  <span class="text-sm font-bold text-slate-900">Valor Declarado: \${{ calculatedNewGuideTotalValue().toFixed(2) }}</span>
                </div>
              </div>

              <!-- Legal Disclaimer -->
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start space-x-2">
                <mat-icon class="text-amber-600 text-sm mt-0.5">verified_user</mat-icon>
                <div>
                  <strong>Aviso Legal SENIAT SNAT/2011/00071:</strong> La emisión de este documento descuenta de forma irreversible el inventario físico en el Kardex y genera la Orden de Entrega legal para amparar el transporte terrestre en todo el territorio nacional.
                </div>
              </div>

            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button 
                (click)="showNewGuideModal.set(false)"
                class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                Cancelar
              </button>

              <button 
                id="btn-emit-dispatch-guide"
                (click)="submitCreateDispatchGuide()"
                class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer">
                <mat-icon class="text-base">check_circle</mat-icon>
                <span>Emitir Guía y Descontar Stock</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL 2: FORMATO OFICIAL IMPRESO SENIAT SNAT/2011/00071 -->
      <!-- ========================================================= -->
      @if (activeGuideForPrint(); as g) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Header Toolbar -->
            <div class="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-amber-400">print</mat-icon>
                <span class="font-bold text-sm">Vista de Impresión Oficial SENIAT SNAT/2011/00071</span>
              </div>
              <div class="flex items-center space-x-2">
                <button 
                  (click)="printOfficialDocument()"
                  class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
                  <mat-icon class="text-sm">print</mat-icon>
                  <span>Imprimir / PDF</span>
                </button>
                <button 
                  (click)="activeGuideForPrint.set(null)"
                  class="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Official Document Container (SENIAT Standard) -->
            <div id="seniat-dispatch-guide-print-area" class="p-8 overflow-y-auto font-sans text-slate-900 text-xs bg-white space-y-6">
              
              <!-- Encabezado Fiscal Emisor -->
              <div class="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h2 class="text-lg font-black tracking-tight uppercase text-slate-900">{{ g.issuerName }}</h2>
                  <p class="font-mono font-bold text-slate-700">RIF: {{ g.issuerTaxId }}</p>
                  <p class="text-[11px] text-slate-600 max-w-md mt-0.5">{{ g.originAddress }}</p>
                  <p class="text-[10px] text-slate-500 font-mono mt-0.5">Almacén de Salida: {{ g.originWarehouseName }}</p>
                </div>

                <div class="border-2 border-slate-900 p-3 rounded-xl bg-slate-50 text-right min-w-[240px]">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">GUÍA DE DESPACHO</div>
                  <div class="text-base font-black font-mono text-slate-900">{{ g.guideNumber }}</div>
                  <div class="mt-1 pt-1 border-t border-slate-300">
                    <span class="text-[10px] font-bold text-rose-700 block uppercase">N° DE CONTROL OBLIGATORIO:</span>
                    <span class="text-sm font-black font-mono text-rose-700">{{ g.controlNumber }}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 mt-1 font-mono">Fecha: {{ g.issueDate }}</div>
                </div>
              </div>

              <!-- Datos del Destinatario & Motivo -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                <div class="space-y-1">
                  <span class="text-[10px] font-bold text-slate-500 uppercase block">1. DATOS DEL DESTINATARIO / RECEPTOR:</span>
                  <p class="font-bold text-slate-900 text-sm">{{ g.customerName }}</p>
                  <p class="font-mono text-slate-700"><strong>RIF / C.I.:</strong> {{ g.customerTaxId }}</p>
                  <p class="text-slate-600"><strong>Dirección de Destino:</strong> {{ g.destinationAddress }}</p>
                  @if (g.recipientContactName) {
                    <p class="text-slate-500"><strong>Contacto:</strong> {{ g.recipientContactName }} ({{ g.recipientPhone || 'N/A' }})</p>
                  }
                </div>

                <div class="space-y-1 border-t md:border-t-0 md:border-l md:pl-4 border-slate-200">
                  <span class="text-[10px] font-bold text-slate-500 uppercase block">2. MOTIVO DEL TRASLADO:</span>
                  <div class="font-bold text-amber-900 bg-amber-100/80 px-2 py-1 rounded inline-block uppercase text-[11px]">
                    {{ formatReason(g.transportReason) }}
                  </div>
                  <p class="text-slate-600 text-[11px] mt-1"><strong>Fecha Despacho:</strong> {{ g.dispatchDate }}</p>
                  @if (g.originQuoteNumber) {
                    <p class="text-slate-500 text-[11px]"><strong>Pedido / Presupuesto Ref:</strong> {{ g.originQuoteNumber }}</p>
                  }
                  @if (g.invoicedInvoiceNumber) {
                    <p class="text-indigo-700 text-[11px] font-bold"><strong>Factura Fiscal Asociada:</strong> {{ g.invoicedInvoiceNumber }}</p>
                  }
                </div>
              </div>

              <!-- Datos del Transporte y Chofer -->
              <div class="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <span class="text-[10px] font-bold text-slate-500 uppercase block">3. DATOS DEL TRANSPORTISTA Y VEHÍCULO:</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span class="text-slate-400 block text-[10px]">TIPO DE TRANSPORTE:</span>
                    <span class="font-bold text-slate-800">{{ formatCarrier(g.carrierType) }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">NOMBRE DEL CONDUCTOR:</span>
                    <span class="font-bold text-slate-800">{{ g.driverName }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">CÉDULA DE IDENTIDAD:</span>
                    <span class="font-mono font-bold text-slate-800">{{ g.driverIdDoc }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">PLACA DEL VEHÍCULO:</span>
                    <span class="font-mono font-black text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">{{ g.vehiclePlate }}</span>
                  </div>
                </div>
              </div>

              <!-- Tabla Detallada de Bienes y Mercancías -->
              <div>
                <span class="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">4. DESCRIPCIÓN DE LAS MERCANCÍAS TRASLADADAS:</span>
                <div class="border border-slate-300 rounded-xl overflow-hidden">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-slate-200/80 text-[10px] font-black text-slate-800 uppercase border-b border-slate-300">
                        <th class="p-2">N°</th>
                        <th class="p-2">Código / SKU</th>
                        <th class="p-2">Descripción del Producto</th>
                        <th class="p-2 text-center">Unidad</th>
                        <th class="p-2 text-center">Cant.</th>
                        <th class="p-2 text-center">Bultos</th>
                        <th class="p-2 text-center">Peso</th>
                        <th class="p-2 text-right">Valor Estimado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 font-mono">
                      @for (item of g.items; track item.productId; let idx = $index) {
                        <tr>
                          <td class="p-2 text-slate-500">{{ idx + 1 }}</td>
                          <td class="p-2 font-bold text-slate-800">{{ item.sku }}</td>
                          <td class="p-2 font-sans font-medium text-slate-900">{{ item.productName }}</td>
                          <td class="p-2 text-center text-slate-600">{{ item.unit }}</td>
                          <td class="p-2 text-center font-bold text-slate-900">{{ item.quantity }}</td>
                          <td class="p-2 text-center text-slate-700">{{ item.packagesCount }}</td>
                          <td class="p-2 text-center text-slate-700">{{ item.weightKg }} kg</td>
                          <td class="p-2 text-right font-bold text-slate-900">\${{ formatMoney(item.totalDeclaredValue) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Totales Resumen -->
                <div class="mt-2 p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-xs">
                  <span>TOTAL BULTOS: <strong>{{ g.totalPackages }}</strong></span>
                  <span>PESO BRUTO TOTAL: <strong>{{ g.totalWeightKg }} KG</strong></span>
                  <span>VOLUMEN ESTIMADO: <strong>{{ g.totalVolumeM3 }} M³</strong></span>
                  <span class="text-sm font-black text-slate-900">VALOR DECLARADO TOTAL: \${{ formatMoney(g.totalDeclaredValue) }}</span>
                </div>
              </div>

              <!-- Cláusula Legal Oficial SENIAT -->
              <div class="p-3 bg-slate-50 border border-slate-300 rounded-xl text-[10px] text-slate-600 leading-relaxed text-justify">
                <strong>CLÁUSULA DE AMPARO LEGAL SENIAT:</strong> {{ g.legalNotice }} Este documento ampara la circulación legal de la carga en territorio nacional. Cualquier alteración o raspadura invalida el presente documento.
              </div>

              <!-- Tres Firmas Legales Oficiales -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs">
                
                <!-- Firma 1: Almacén Emisor -->
                <div class="space-y-1">
                  <div class="h-14 border-b border-dashed border-slate-400 mx-4 flex items-end justify-center pb-1">
                    <span class="font-mono text-[10px] text-slate-400 font-semibold">[ Sello & Firma ]</span>
                  </div>
                  <p class="font-bold text-slate-900">DESPACHADO POR</p>
                  <p class="text-[10px] text-slate-500">Almacén Central / Expedición</p>
                </div>

                <!-- Firma 2: Transportista -->
                <div class="space-y-1">
                  <div class="h-14 border-b border-dashed border-slate-400 mx-4 flex items-end justify-center pb-1">
                    <span class="font-mono text-[10px] text-slate-400 font-semibold">[ Firma Conforme Traslado ]</span>
                  </div>
                  <p class="font-bold text-slate-900">TRANSPORTISTA</p>
                  <p class="text-[10px] text-slate-500 font-mono">{{ g.driverName }} (C.I. {{ g.driverIdDoc }})</p>
                </div>

                <!-- Firma 3: Receptor Final -->
                <div class="space-y-1">
                  <div class="h-14 border-b border-dashed border-slate-400 mx-4 flex items-end justify-center pb-1">
                    <span class="font-mono text-[10px] text-slate-400 font-semibold">[ Sello & Firma Cliente ]</span>
                  </div>
                  <p class="font-bold text-slate-900">RECIBIDO CONFORME</p>
                  <p class="text-[10px] text-slate-500">Receptor Final / Cliente</p>
                </div>

              </div>

            </div>

          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL 3: REGISTRO DE RECEPCIÓN CONFORME / ORDEN DE ENTREGA -->
      <!-- ========================================================= -->
      @if (activeOrderForReceipt(); as ord) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div class="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div class="flex items-center space-x-2.5">
                <mat-icon>task_alt</mat-icon>
                <div>
                  <h3 class="font-bold text-sm sm:text-base">Recepción Conforme de Mercancía</h3>
                  <p class="text-[11px] text-emerald-100">Orden {{ ord.orderNumber }} (Guía {{ ord.dispatchGuideNumber }})</p>
                </div>
              </div>
              <button 
                (click)="activeOrderForReceipt.set(null)"
                class="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-4 text-xs">
              
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-slate-400 font-bold uppercase text-[10px]">Cliente / Receptor:</span>
                <p class="font-bold text-slate-900">{{ ord.customerName }}</p>
                <p class="text-slate-500">📍 {{ ord.deliveryAddress }}</p>
              </div>

              <div>
                <span class="block font-bold text-slate-700 text-[11px] mb-1">Nombre Completo de la Persona que Recibe *</span>
                <input 
                  type="text"
                  [value]="receiptPersonName()"
                  (input)="receiptPersonName.set($any($event.target).value)"
                  placeholder="Ej: Lic. Mariana Morales"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <span class="block font-bold text-slate-700 text-[11px] mb-1">Cédula de Identidad / RIF Receptor *</span>
                <input 
                  type="text"
                  [value]="receiptPersonIdDoc()"
                  (input)="receiptPersonIdDoc.set($any($event.target).value)"
                  placeholder="V-19.456.789"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <span class="block font-bold text-slate-700 text-[11px] mb-1">Condición Física de la Entrega *</span>
                <select 
                  [value]="receiptCondition()"
                  (change)="receiptCondition.set($any($event.target).value)"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="CONFORME">100% Conforme (Sin novedad ni faltantes)</option>
                  <option value="CON_NOVEDAD">Con Novedad / Faltante / Daño Parcial</option>
                  <option value="RECHAZADO">Rechazado por el Cliente</option>
                </select>
              </div>

              <div>
                <span class="block font-bold text-slate-700 text-[11px] mb-1">Observaciones / Notas de Recepción</span>
                <textarea 
                  rows="2"
                  [value]="receiptObservations()"
                  (input)="receiptObservations.set($any($event.target).value)"
                  placeholder="Bultos sellados recibidos en buen estado..."
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"></textarea>
              </div>

              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center space-x-2">
                <mat-icon class="text-emerald-600 text-base">verified</mat-icon>
                <span>Se anexará constancia con sello digital de recepción conforme en el expediente.</span>
              </div>

            </div>

            <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button 
                (click)="activeOrderForReceipt.set(null)"
                class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer">
                Cancelar
              </button>

              <button 
                (click)="submitDeliveryReceipt()"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer">
                <mat-icon class="text-sm">task_alt</mat-icon>
                <span>Guardar Recepción Conforme</span>
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Modal de Factura para ver Comprobantes Fiscales Asociados -->
      @if (activeInvoiceForView(); as inv) {
        <app-invoice-modal 
          [invoice]="inv"
          (closeModal)="activeInvoiceForView.set(null)" />
      }

    </div>
  `
})
export class LogisticsComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  activeSubTab = signal<'guias' | 'entregas' | 'facturacion'>('guias');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
  warehouseFilter = signal<string>('ALL');

  // Modals state
  showNewGuideModal = signal<boolean>(false);
  activeGuideForPrint = signal<DispatchGuide | null>(null);
  activeOrderForReceipt = signal<DeliveryOrder | null>(null);
  activeInvoiceForView = signal<Invoice | null>(null);

  // New Guide Form State
  newGuideOriginWarehouseId = signal<string>('');
  newGuideTransportReason = signal<TransportReason>('VENTA_MERCANCIA');
  newGuideControlNumber = signal<string>('');
  newGuideCustomerId = signal<string>('');
  newGuideCustomerName = signal<string>('');
  newGuideCustomerTaxId = signal<string>('');
  newGuideDestinationAddress = signal<string>('');
  newGuideRecipientContact = signal<string>('');
  newGuideCarrierType = signal<CarrierType>('PROPIO');
  newGuideDriverName = signal<string>('');
  newGuideDriverIdDoc = signal<string>('');
  newGuideVehiclePlate = signal<string>('');
  newGuideVehicleModel = signal<string>('');
  newGuideDriverPhone = signal<string>('');
  newGuideEstimatedDeliveryDate = signal<string>('');
  newGuideItems = signal<{
    productId: string;
    quantity: number;
    packagesCount: number;
    weightKg: number;
  }[]>([]);

  // Receipt Modal State
  receiptPersonName = signal<string>('');
  receiptPersonIdDoc = signal<string>('');
  receiptCondition = signal<'CONFORME' | 'CON_NOVEDAD' | 'RECHAZADO'>('CONFORME');
  receiptObservations = signal<string>('');

  // Mass invoice selection
  selectedGuideIdsForInvoice = signal<string[]>([]);

  readonly filteredGuides = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const wh = this.warehouseFilter();

    return this.stateService.dispatchGuides().filter(g => {
      if (st !== 'ALL' && g.status !== st) return false;
      if (wh !== 'ALL' && g.originWarehouseId !== wh) return false;
      if (!q) return true;

      return (
        g.guideNumber.toLowerCase().includes(q) ||
        g.controlNumber.toLowerCase().includes(q) ||
        (g.customerName && g.customerName.toLowerCase().includes(q)) ||
        (g.driverName && g.driverName.toLowerCase().includes(q)) ||
        (g.vehiclePlate && g.vehiclePlate.toLowerCase().includes(q)) ||
        (g.destinationAddress && g.destinationAddress.toLowerCase().includes(q))
      );
    });
  });

  readonly unInvoicedGuides = computed(() => {
    return this.stateService.dispatchGuides().filter(g => !g.invoicedInvoiceNumber && g.status !== 'ANULADA');
  });

  readonly calculatedNewGuideTotalPackages = computed(() => {
    return this.newGuideItems().reduce((s, it) => s + (it.packagesCount || 0), 0);
  });

  readonly calculatedNewGuideTotalWeight = computed(() => {
    return Number(this.newGuideItems().reduce((s, it) => s + (it.weightKg || 0), 0).toFixed(2));
  });

  readonly calculatedNewGuideTotalValue = computed(() => {
    return this.newGuideItems().reduce((sum, row) => {
      const prod = this.stateService.products().find(p => p.id === row.productId);
      return sum + (prod ? (row.quantity * prod.salePrice) : 0);
    }, 0);
  });

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onStatusFilterChange(event: Event) {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  onWarehouseFilterChange(event: Event) {
    this.warehouseFilter.set((event.target as HTMLSelectElement).value);
  }

  openNewGuideModal() {
    const warehouses = this.stateService.warehouses();
    const firstWhId = warehouses[0]?.id || 'wh-01';
    this.newGuideOriginWarehouseId.set(firstWhId);
    this.newGuideTransportReason.set('VENTA_MERCANCIA');
    this.newGuideControlNumber.set(this.stateService.generateNextDispatchControlNumber());
    this.newGuideCustomerId.set('');
    this.newGuideCustomerName.set('');
    this.newGuideCustomerTaxId.set('');
    this.newGuideDestinationAddress.set('');
    this.newGuideRecipientContact.set('');
    this.newGuideCarrierType.set('PROPIO');
    this.newGuideDriverName.set('Carlos Méndez');
    this.newGuideDriverIdDoc.set('V-18.345.912');
    this.newGuideVehiclePlate.set('A98BC2D');
    this.newGuideVehicleModel.set('Camión F-350 Tritón');
    this.newGuideDriverPhone.set('0414-5551234');
    this.newGuideEstimatedDeliveryDate.set(new Date().toISOString().substring(0, 10));

    // Default item
    const prods = this.stateService.products();
    if (prods.length > 0) {
      this.newGuideItems.set([
        {
          productId: prods[0].id,
          quantity: 2,
          packagesCount: 2,
          weightKg: 5.0
        }
      ]);
    } else {
      this.newGuideItems.set([]);
    }

    this.showNewGuideModal.set(true);
  }

  onSelectCustomerForGuide(customerId: string) {
    this.newGuideCustomerId.set(customerId);
    const cust = this.stateService.customers().find(c => c.id === customerId);
    if (cust) {
      this.newGuideCustomerName.set(cust.name);
      this.newGuideCustomerTaxId.set(cust.taxId);
      this.newGuideDestinationAddress.set(cust.address || 'Caracas, Venezuela');
      this.newGuideRecipientContact.set(`${cust.name} (${cust.phone || ''})`);
    }
  }

  getProductById(productId: string): Product | undefined {
    return this.stateService.products().find(p => p.id === productId);
  }

  getProductStockInWarehouse(productId: string, warehouseId: string): number {
    const prod = this.getProductById(productId);
    if (!prod) return 0;
    return prod.stockByWarehouse.find(w => w.warehouseId === warehouseId)?.quantity || 0;
  }

  addEmptyItemRow() {
    const prods = this.stateService.products();
    const firstId = prods[0]?.id || '';
    this.newGuideItems.update(items => [
      ...items,
      {
        productId: firstId,
        quantity: 1,
        packagesCount: 1,
        weightKg: 2.5
      }
    ]);
  }

  removeItemRow(index: number) {
    this.newGuideItems.update(items => items.filter((_, i) => i !== index));
  }

  updateItemProduct(index: number, productId: string) {
    this.newGuideItems.update(items =>
      items.map((it, i) => i === index ? { ...it, productId } : it)
    );
  }

  updateItemQuantity(index: number, quantity: number) {
    this.newGuideItems.update(items =>
      items.map((it, i) => i === index ? { ...it, quantity: Math.max(1, quantity), packagesCount: Math.max(1, quantity) } : it)
    );
  }

  updateItemPackages(index: number, packagesCount: number) {
    this.newGuideItems.update(items =>
      items.map((it, i) => i === index ? { ...it, packagesCount: Math.max(1, packagesCount) } : it)
    );
  }

  updateItemWeight(index: number, weightKg: number) {
    this.newGuideItems.update(items =>
      items.map((it, i) => i === index ? { ...it, weightKg: Math.max(0, weightKg) } : it)
    );
  }

  submitCreateDispatchGuide() {
    const items = this.newGuideItems();
    if (items.length === 0) {
      this.stateService.notify('error', 'Error de Validación', 'Debe agregar al menos un artículo a la Guía de Despacho.');
      return;
    }

    const whId = this.newGuideOriginWarehouseId();
    if (!whId) {
      this.stateService.notify('error', 'Error de Validación', 'Seleccione el almacén de salida.');
      return;
    }

    if (!this.newGuideDestinationAddress() || this.newGuideDestinationAddress().trim().length < 5) {
      this.stateService.notify('error', 'Dirección Obligatoria', 'La dirección de destino es obligatoria según Providencia SNAT/2011/00071.');
      return;
    }

    if (!this.newGuideDriverName() || !this.newGuideDriverIdDoc() || !this.newGuideVehiclePlate()) {
      this.stateService.notify('error', 'Datos de Transporte Obligatorios', 'Nombre de chofer, C.I. y Placa del vehículo son requeridos por SENIAT.');
      return;
    }

    const res = this.stateService.createDispatchGuide({
      originWarehouseId: whId,
      customerId: this.newGuideCustomerId() || undefined,
      customerName: this.newGuideCustomerName() || 'Cliente Final',
      customerTaxId: this.newGuideCustomerTaxId() || 'V-00000000-0',
      destinationAddress: this.newGuideDestinationAddress(),
      recipientContactName: this.newGuideRecipientContact(),
      transportReason: this.newGuideTransportReason(),
      carrierType: this.newGuideCarrierType(),
      driverName: this.newGuideDriverName(),
      driverIdDoc: this.newGuideDriverIdDoc(),
      driverPhone: this.newGuideDriverPhone(),
      vehiclePlate: this.newGuideVehiclePlate(),
      vehicleModel: this.newGuideVehicleModel(),
      estimatedDeliveryDate: this.newGuideEstimatedDeliveryDate(),
      customControlNumber: this.newGuideControlNumber() || undefined,
      items: items.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        packagesCount: it.packagesCount,
        weightKg: it.weightKg
      }))
    });

    if (res.success && res.dispatchGuide) {
      this.showNewGuideModal.set(false);
      this.activeGuideForPrint.set(res.dispatchGuide);
    }
  }

  openPrintGuideModal(guide: DispatchGuide) {
    this.activeGuideForPrint.set(guide);
  }

  printOfficialDocument() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  openDeliveryReceiptForGuide(guide: DispatchGuide) {
    const order = this.stateService.deliveryOrders().find(o => o.dispatchGuideId === guide.id);
    if (order) {
      this.openDeliveryReceiptModal(order);
    } else {
      this.stateService.notify('info', 'Orden no encontrada', `No se localizó orden de entrega activa para la guía ${guide.guideNumber}.`);
    }
  }

  openDeliveryReceiptModal(order: DeliveryOrder) {
    this.activeOrderForReceipt.set(order);
    this.receiptPersonName.set(order.contactPerson || order.customerName || '');
    this.receiptPersonIdDoc.set(order.customerTaxId || '');
    this.receiptCondition.set('CONFORME');
    this.receiptObservations.set('Recibido conforme en almacén de destino sin novedad.');
  }

  submitDeliveryReceipt() {
    const ord = this.activeOrderForReceipt();
    if (!ord) return;

    if (!this.receiptPersonName() || !this.receiptPersonIdDoc()) {
      this.stateService.notify('error', 'Datos Requeridos', 'Ingrese el nombre y la cédula de la persona que recibe conforme.');
      return;
    }

    const now = new Date();
    const receptionDetails: DeliveryReceptionDetails = {
      receivedByFullName: this.receiptPersonName(),
      receivedByName: this.receiptPersonName(),
      receiverIdNumber: this.receiptPersonIdDoc(),
      receivedByIdDoc: this.receiptPersonIdDoc(),
      receivedDate: now.toISOString().substring(0, 10),
      receivedTime: now.toTimeString().substring(0, 5),
      hasSignature: true,
      hasStamp: true,
      receptionStatus: this.receiptCondition() === 'CONFORME' ? 'COMPLETO' : 'CON_NOVEDAD',
      physicalCondition: this.receiptCondition(),
      observations: this.receiptObservations(),
      signedProofUrl: 'digital-proof-stamp-verified.png',
      attachedProofUrl: 'digital-proof-stamp-verified.png'
    };

    const res = this.stateService.registerDeliveryReceipt(ord.id, receptionDetails);
    if (res.success) {
      this.activeOrderForReceipt.set(null);
    }
  }

  viewDeliveryDetails(order: DeliveryOrder) {
    if (order.dispatchGuideId) {
      const guide = this.stateService.dispatchGuides().find(g => g.id === order.dispatchGuideId);
      if (guide) {
        this.openPrintGuideModal(guide);
      }
    }
  }

  confirmCancelGuide(guide: DispatchGuide) {
    const reason = prompt(`¿Desea anular la Guía de Despacho ${guide.guideNumber}? Ingrese el motivo de anulación (se restituirá el stock al almacén):`, 'Despacho cancelado por el cliente antes de la salida física');
    if (reason && reason.trim().length >= 5) {
      this.stateService.cancelDispatchGuide(guide.id, reason.trim());
    }
  }

  invoiceSingleGuide(guide: DispatchGuide) {
    const res = this.stateService.invoiceFromDispatchGuides([guide.id]);
    if (res.success && res.invoice) {
      this.activeInvoiceForView.set(res.invoice);
    }
  }

  toggleGuideSelection(guideId: string) {
    this.selectedGuideIdsForInvoice.update(ids =>
      ids.includes(guideId) ? ids.filter(id => id !== guideId) : [...ids, guideId]
    );
  }

  invoiceSelectedMultipleGuides() {
    const ids = this.selectedGuideIdsForInvoice();
    if (ids.length === 0) return;

    const res = this.stateService.invoiceFromDispatchGuides(ids);
    if (res.success && res.invoice) {
      this.selectedGuideIdsForInvoice.set([]);
      this.activeInvoiceForView.set(res.invoice);
    }
  }

  viewInvoiceModal(invoiceNumber: string) {
    const inv = this.stateService.invoices().find(i => i.invoiceNumber === invoiceNumber);
    if (inv) {
      this.activeInvoiceForView.set(inv);
    } else {
      this.stateService.notify('info', 'Factura', `Factura ${invoiceNumber} no encontrada.`);
    }
  }

  formatReason(reason?: string): string {
    return reason ? reason.replace(/_/g, ' ') : '';
  }

  formatCarrier(type?: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }

  formatMoney(val?: number): string {
    return (val || 0).toFixed(2);
  }
}
