import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { CompanyPlanTier, CompanyFiscalProfile } from '../../models/erp.models';

@Component({
  selector: 'app-company-profile-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        
        <!-- Header -->
        <div class="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              <mat-icon class="text-xl">business</mat-icon>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h2 class="font-bold text-base text-white">Perfil de la Empresa y Planes de Suscripción</h2>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide border"
                  [class]="stateService.isBasePlan() 
                    ? 'bg-blue-900/80 text-blue-300 border-blue-600' 
                    : 'bg-emerald-900/80 text-emerald-300 border-emerald-600'">
                  {{ stateService.isBasePlan() ? 'PLAN BASE (PyME)' : 'PLAN FULL (ENTERPRISE)' }}
                </span>
              </div>
              <p class="text-xs text-slate-300">Gestión de datos fiscales SENIAT y configuración de módulos habilitados</p>
            </div>
          </div>

          <button 
            (click)="closeModal.emit()" 
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Navigation Sub-Tabs -->
        <div class="px-6 bg-slate-100 border-b border-slate-200 flex space-x-4 shrink-0">
          <button 
            (click)="activeTab.set('PLANS')"
            class="py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer"
            [class]="activeTab() === 'PLANS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'">
            <mat-icon class="text-base">workspace_premium</mat-icon>
            <span>Planes de Suscripción (Base vs Full)</span>
          </button>

          <button 
            (click)="activeTab.set('FISCAL')"
            class="py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer"
            [class]="activeTab() === 'FISCAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'">
            <mat-icon class="text-base">receipt_long</mat-icon>
            <span>Datos Fiscales & Régimen SENIAT</span>
          </button>

          <button 
            (click)="activeTab.set('COMPARISON')"
            class="py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer"
            [class]="activeTab() === 'COMPARISON' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'">
            <mat-icon class="text-base">table_chart</mat-icon>
            <span>Matriz Comparativa de Módulos</span>
          </button>
        </div>

        <!-- Body Content -->
        <div class="p-6 overflow-y-auto flex-1 space-y-6">
          
          <!-- TAB 1: PLANS SELECTOR -->
          @if (activeTab() === 'PLANS') {
            <div class="space-y-6">
              
              <div class="text-center max-w-xl mx-auto space-y-1">
                <h3 class="text-base font-bold text-slate-900">Selecciona el Nivel de Operación de tu Empresa</h3>
                <p class="text-xs text-slate-500">
                  Puedes alternar instantáneamente entre la <strong>Versión Base</strong> para comercios/PyMEs y la <strong>Versión Full</strong> corporativa.
                </p>
              </div>

              <!-- Two Tier Cards Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <!-- PLAN BASE CARD -->
                <div 
                  class="rounded-2xl border-2 p-5 flex flex-col justify-between transition-all relative overflow-hidden"
                  [class]="stateService.isBasePlan() 
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-300'">
                  
                  @if (stateService.isBasePlan()) {
                    <div class="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center space-x-1">
                      <mat-icon class="text-xs">check_circle</mat-icon>
                      <span>Plan Actual Activo</span>
                    </div>
                  }

                  <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <mat-icon>storefront</mat-icon>
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-slate-900">Versión Base (Plan Comercial / PyME)</h4>
                        <p class="text-[11px] text-slate-500">Comercios, ferreterías, distribuidoras y puntos de venta</p>
                      </div>
                    </div>

                    <!-- Price Tag Reference -->
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-baseline justify-between">
                      <div>
                        <span class="text-2xl font-extrabold text-slate-900 font-mono">$35</span>
                        <span class="text-xs text-slate-500 font-medium"> USD / mes</span>
                      </div>
                      <span class="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        $350 USD / año (Ahorras 2 meses)
                      </span>
                    </div>

                    <div class="space-y-2 text-xs">
                      <p class="font-bold text-[11px] text-slate-700 uppercase tracking-wider">Módulos Incluidos:</p>
                      <ul class="space-y-1.5 text-slate-600">
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Punto de Venta POS con F10 y Cobro Rápido</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Multimoneda USD / VES con Tasa Oficial BCV</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Cálculo Automático IVA 16% e IGTF 3% (SENIAT)</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Inventario y Kardex Valorado por Costo CPP</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Compras a Proveedores y Cuentas por Pagar (CxP)</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Presupuestos y Cotizaciones a Clientes</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Logística Básica y Guías de Despacho SENIAT</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Tesorería Básica (CxC, CxP y Cuentas Bancarias)</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">check</mat-icon>
                          <span>Cierre de Caja Z con Arqueo de Medios de Pago</span>
                        </li>
                      </ul>

                      <div class="pt-2 border-t border-slate-200/80">
                        <p class="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">Módulos No Disponibles en Base:</p>
                        <p class="text-[10px] text-slate-500 leading-tight">
                          Manufactura MRP, CRM Pipeline, Contabilidad NIIF, RBAC multiusuario avanzado.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-5 pt-3 border-t border-slate-200">
                    <button 
                      (click)="changePlan('BASE')"
                      [disabled]="stateService.isBasePlan()"
                      class="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      [class]="stateService.isBasePlan() 
                        ? 'bg-blue-600 text-white cursor-default opacity-90' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'">
                      <mat-icon class="text-sm">{{ stateService.isBasePlan() ? 'check' : 'toggle_on' }}</mat-icon>
                      <span>{{ stateService.isBasePlan() ? 'Plan Base Activo' : 'Activar / Probar Versión Base (PyME)' }}</span>
                    </button>
                  </div>

                </div>

                <!-- PLAN FULL / ENTERPRISE CARD -->
                <div 
                  class="rounded-2xl border-2 p-5 flex flex-col justify-between transition-all relative overflow-hidden"
                  [class]="stateService.isFullPlan() 
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-slate-300'">
                  
                  @if (stateService.isFullPlan()) {
                    <div class="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center space-x-1">
                      <mat-icon class="text-xs">verified</mat-icon>
                      <span>Plan Actual Activo</span>
                    </div>
                  }

                  <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <mat-icon>corporate_fare</mat-icon>
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-slate-900">Versión Full / Pro (Enterprise / Corporativo)</h4>
                        <p class="text-[11px] text-slate-500">Plantas industriales, corporaciones, constructoras y manufactura</p>
                      </div>
                    </div>

                    <!-- Price Tag Reference -->
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-baseline justify-between">
                      <div>
                        <span class="text-2xl font-extrabold text-slate-900 font-mono">$95</span>
                        <span class="text-xs text-slate-500 font-medium"> USD / mes</span>
                      </div>
                      <span class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        $950 USD / año (Ahorras 2 meses)
                      </span>
                    </div>

                    <div class="space-y-2 text-xs">
                      <p class="font-bold text-[11px] text-slate-700 uppercase tracking-wider">Incluye Todo lo de Base + Módulos Enterprise:</p>
                      <ul class="space-y-1.5 text-slate-600">
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Todos los módulos comerciales</strong> (POS, Kardex, Tesorería, etc.)</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Manufactura & MRP:</strong> Fórmulas BOM y costeo de MOD + CIF</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>CRM B2B:</strong> Pipeline Kanban de Oportunidades y Win-Rate</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Contabilidad NIIF:</strong> Asientos automáticos en partida doble</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Usuarios y RBAC:</strong> Roles ilimitados y permisos granulares</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Auditoría Forense:</strong> Alertas críticas con SHA-256 inmutable</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Respaldos Nube:</strong> Sincronización Firebase Firestore y JSON</span>
                        </li>
                        <li class="flex items-center space-x-2">
                          <mat-icon class="text-emerald-500 text-sm">verified</mat-icon>
                          <span><strong>Soporte Prioritario 24/7</strong> y Asesoría Fiscal SENIAT</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div class="mt-5 pt-3 border-t border-slate-200">
                    <button 
                      (click)="changePlan('FULL')"
                      [disabled]="stateService.isFullPlan()"
                      class="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      [class]="stateService.isFullPlan() 
                        ? 'bg-emerald-600 text-white cursor-default opacity-90' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'">
                      <mat-icon class="text-sm">{{ stateService.isFullPlan() ? 'verified' : 'rocket_launch' }}</mat-icon>
                      <span>{{ stateService.isFullPlan() ? 'Plan Full Activo' : 'Activar Versión Full / Enterprise' }}</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          }

          <!-- TAB 2: FISCAL PROFILE & SENIAT -->
          @if (activeTab() === 'FISCAL') {
            <form [formGroup]="fiscalForm" (ngSubmit)="saveFiscalProfile()" class="space-y-5">
              
              <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-bold text-sm text-slate-900">Identificación Fiscal y Razón Social</h4>
                    <p class="text-xs text-slate-500">Datos que se imprimirán en las Facturas Electrónicas y Guías de Despacho</p>
                  </div>
                  <span class="text-[10px] font-mono font-bold px-2 py-1 bg-slate-200 text-slate-700 rounded-md">
                    SENIAT SNAT/2011/00071
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label for="company-legal-name" class="block font-semibold text-slate-700 mb-1">Razón Social Legal *</label>
                    <input 
                      id="company-legal-name"
                      type="text" 
                      formControlName="legalName"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label for="company-trade-name" class="block font-semibold text-slate-700 mb-1">Nombre Comercial *</label>
                    <input 
                      id="company-trade-name"
                      type="text" 
                      formControlName="tradeName"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label for="company-tax-id" class="block font-semibold text-slate-700 mb-1">RIF de la Empresa *</label>
                    <input 
                      id="company-tax-id"
                      type="text" 
                      formControlName="taxId"
                      placeholder="Ej: J-50493821-4"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div>
                    <label for="company-phone" class="block font-semibold text-slate-700 mb-1">Teléfono Principal</label>
                    <input 
                      id="company-phone"
                      type="text" 
                      formControlName="phone"
                      placeholder="+58 212 500-8800"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div class="sm:col-span-2">
                    <label for="company-email" class="block font-semibold text-slate-700 mb-1">Correo Electrónico de Facturación</label>
                    <input 
                      id="company-email"
                      type="email" 
                      formControlName="email"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <div class="sm:col-span-2">
                    <label for="company-address" class="block font-semibold text-slate-700 mb-1">Dirección Fiscal Completa *</label>
                    <textarea 
                      id="company-address"
                      rows="2" 
                      formControlName="address"
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                  </div>
                </div>
              </div>

              <!-- SENIAT Special Taxpayer Card -->
              <div class="p-4 rounded-2xl border transition-all"
                [class]="fiscalForm.get('isSpecialTaxpayer')?.value 
                  ? 'bg-amber-50/70 border-amber-300' 
                  : 'bg-slate-50 border-slate-200'">
                
                <div class="flex items-start justify-between">
                  <div class="space-y-1 max-w-xl">
                    <div class="flex items-center space-x-2">
                      <mat-icon class="text-amber-600 text-lg">verified_user</mat-icon>
                      <h4 class="font-bold text-sm text-slate-900">Contribuyente Especial / Sujeto Pasivo Especial (SENIAT)</h4>
                    </div>
                    <p class="text-xs text-slate-600 leading-relaxed">
                      Si la empresa ha sido notificada por el SENIAT como Sujeto Pasivo Especial, debe actuar obligatoriamente como <strong>Agente de Percepción del 3% IGTF</strong> en todos los cobros recibidos en divisas en efectivo o criptoactivos no soberanos.
                    </p>
                  </div>

                  <label for="company-special-taxpayer" class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input 
                      id="company-special-taxpayer"
                      type="checkbox" 
                      formControlName="isSpecialTaxpayer"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                @if (fiscalForm.get('isSpecialTaxpayer')?.value) {
                  <div class="mt-4 pt-3 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label for="company-special-taxpayer-num" class="block font-semibold text-amber-900 mb-1">Nro. de Providencia de Designación SENIAT</label>
                      <input 
                        id="company-special-taxpayer-num"
                        type="text" 
                        formControlName="specialTaxpayerDesignationNumber"
                        placeholder="Ej: SNAT/2022/000013"
                        class="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono" />
                    </div>
                    <div class="flex items-center text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-xl">
                      <mat-icon class="text-amber-700 text-sm mr-1.5 shrink-0">info</mat-icon>
                      <span>El sistema agregará automáticamente el renglón IGTF 3% en las facturas cuando se pague en USD/EUR en efectivo.</span>
                    </div>
                  </div>
                }
              </div>

              <!-- Rates default info -->
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span class="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Alícuota General IVA</span>
                  <span class="text-sm font-bold font-mono text-slate-800">16.00% (0.16)</span>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span class="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Alícuota IGTF Divisas</span>
                  <span class="text-sm font-bold font-mono text-slate-800">3.00% (0.03)</span>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button 
                  type="submit"
                  [disabled]="fiscalForm.invalid"
                  class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm flex items-center space-x-2 cursor-pointer">
                  <mat-icon class="text-sm">save</mat-icon>
                  <span>Guardar Cambios Fiscales</span>
                </button>
              </div>

            </form>
          }

          <!-- TAB 3: MATRIX COMPARISON -->
          @if (activeTab() === 'COMPARISON') {
            <div class="space-y-4 text-xs">
              <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                      <th class="p-3.5 font-bold">Módulo o Característica Funcional</th>
                      <th class="p-3.5 font-bold text-center bg-blue-900/60 border-l border-r border-slate-700">Versión Base (PyME)</th>
                      <th class="p-3.5 font-bold text-center bg-emerald-900/60">Versión Full (Enterprise)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200 text-slate-700">
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Punto de Venta POS & Facturación Fiscal</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Multimoneda USD / VES y Tasa Oficial BCV</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Inventario y Kardex Valorado CPP</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Compras a Proveedores & Cuentas por Pagar (CxP)</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Presupuestos y Cotizaciones con Conversión</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Logística & Guías de Despacho SENIAT</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Tesorería (Cuentas por Cobrar, Cuentas por Pagar y Bancos)</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Cierre de Caja Z & Arqueo de Medios de Pago</td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Manufactura MRP & Fórmulas BOM</td>
                      <td class="p-3 text-center text-rose-500 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-rose-400 align-middle">lock</mat-icon> Requiere Full
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">CRM Pipeline B2B & Actividades</td>
                      <td class="p-3 text-center text-rose-500 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-rose-400 align-middle">lock</mat-icon> Requiere Full
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Contabilidad Financiera Integral NIIF</td>
                      <td class="p-3 text-center text-rose-500 font-bold bg-blue-50/20 border-l border-r border-slate-200">
                        <mat-icon class="text-base text-rose-400 align-middle">lock</mat-icon> Requiere Full
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        <mat-icon class="text-base text-emerald-600 align-middle">check_circle</mat-icon> Incluido
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Gestión Multi-Usuario y Roles RBAC</td>
                      <td class="p-3 text-center text-slate-600 font-semibold bg-blue-50/20 border-l border-r border-slate-200">
                        Hasta 3 Usuarios
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        Ilimitados
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Bitácora de Auditoría Forense con SHA-256</td>
                      <td class="p-3 text-center text-slate-600 font-semibold bg-blue-50/20 border-l border-r border-slate-200">
                        Básica
                      </td>
                      <td class="p-3 text-center text-emerald-600 font-bold bg-emerald-50/20">
                        Avanzada / Inmutable
                      </td>
                    </tr>
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-900">Precio Comercial Sugerido</td>
                      <td class="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/20 border-l border-r border-slate-200">
                        $35 USD / mes
                      </td>
                      <td class="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                        $95 USD / mes
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          }

        </div>

        <!-- Footer -->
        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <div class="flex items-center space-x-2 text-xs text-slate-500">
            <mat-icon class="text-sm text-slate-400">verified</mat-icon>
            <span>Plan Activo: <strong class="text-slate-800">{{ stateService.currentPlanConfig().name }}</strong></span>
          </div>

          <button 
            (click)="closeModal.emit()" 
            class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs cursor-pointer">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `
})
export class CompanyProfileModalComponent {
  stateService = inject(ErpStateService);
  closeModal = output<void>();

  activeTab = signal<'PLANS' | 'FISCAL' | 'COMPARISON'>('PLANS');

  fiscalForm = new FormGroup({
    legalName: new FormControl(this.stateService.companyProfile().legalName, [Validators.required]),
    tradeName: new FormControl(this.stateService.companyProfile().tradeName, [Validators.required]),
    taxId: new FormControl(this.stateService.companyProfile().taxId, [Validators.required]),
    phone: new FormControl(this.stateService.companyProfile().phone || ''),
    email: new FormControl(this.stateService.companyProfile().email || '', [Validators.email]),
    address: new FormControl(this.stateService.companyProfile().address, [Validators.required]),
    isSpecialTaxpayer: new FormControl(this.stateService.companyProfile().isSpecialTaxpayer),
    specialTaxpayerDesignationNumber: new FormControl(this.stateService.companyProfile().specialTaxpayerDesignationNumber || '')
  });

  changePlan(tier: CompanyPlanTier) {
    this.stateService.setCompanyPlan(tier);
  }

  saveFiscalProfile() {
    if (this.fiscalForm.invalid) return;

    const val = this.fiscalForm.value;
    const updated: Partial<CompanyFiscalProfile> = {
      legalName: val.legalName || '',
      tradeName: val.tradeName || '',
      taxId: val.taxId || '',
      phone: val.phone || '',
      email: val.email || '',
      address: val.address || '',
      isSpecialTaxpayer: Boolean(val.isSpecialTaxpayer),
      specialTaxpayerDesignationNumber: val.specialTaxpayerDesignationNumber || ''
    };

    this.stateService.updateCompanyProfile(updated);
    this.stateService.notify(
      'success',
      'Perfil Fiscal Guardado',
      'Los datos fiscales de la empresa y la configuración SENIAT se actualizaron correctamente.'
    );
  }
}
