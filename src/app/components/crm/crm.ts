import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from '../../services/erp-state.service';
import { AuthService } from '../../services/auth.service';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { CrmDeal, CrmStage, CrmActivityType } from '../../models/erp.models';

interface StageColumn {
  id: CrmStage;
  label: string;
  probability: number;
  colorClass: string;
  borderClass: string;
}

@Component({
  selector: 'app-crm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- TOP HEADER & METRICS -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-violet-500/10 text-violet-600 border border-violet-500/20">
              FASE 2 • VENTAS Y CRM
            </span>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Gestión de Relaciones con Clientes (CRM) & Pipeline
            </h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Tablero Kanban de oportunidades comerciales, seguimiento de prospectos, valor ponderado y registro de interacciones.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            (click)="openNewDealModal()" 
            class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md flex items-center space-x-1.5 transition-all">
            <mat-icon class="text-base">add_circle</mat-icon>
            <span>Nueva Oportunidad Comercial</span>
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Bento Grid) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valor Total del Pipeline</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.crmPipelineTotalValue().toFixed(2) }}</h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Bs. {{ (stateService.crmPipelineTotalValue() * stateService.bcvState().usdRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) }}</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <mat-icon class="text-xl">point_of_sale</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline Ponderado</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">\${{ stateService.crmWeightedPipelineValue().toFixed(2) }}</h3>
            <p class="text-[11px] text-violet-600 font-medium mt-0.5">Ponderación según probabilidad</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <mat-icon class="text-xl">trending_up</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tasa de Cierre (Win Rate)</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ stateService.crmWinRatePercent().toFixed(1) }}%</h3>
            <p class="text-[11px] text-emerald-600 font-medium mt-0.5">{{ stateService.crmDealsWonCount() }} oportunidades ganadas</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <mat-icon class="text-xl">verified</mat-icon>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Oportunidades Activas</p>
            <h3 class="text-2xl font-bold text-slate-800 mt-1">{{ activeDealsCount() }}</h3>
            <p class="text-[11px] text-slate-500 font-medium mt-0.5">En negociación o propuesta</p>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <mat-icon class="text-xl">contact_mail</mat-icon>
          </div>
        </div>

      </div>

      <!-- KANBAN BOARD CONTAINER -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
        
        <!-- Board Header & Quick Search -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div class="flex items-center space-x-2">
            <mat-icon class="text-slate-400 text-base">view_column</mat-icon>
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Embudo de Ventas Kanban</span>
          </div>

          <div class="flex items-center space-x-3">
            <div class="relative">
              <mat-icon class="text-slate-400 text-xs absolute left-2.5 top-2.5">search</mat-icon>
              <input 
                type="text" 
                placeholder="Buscar prospecto o empresa..." 
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 w-48 sm:w-64" />
            </div>
          </div>
        </div>

        <!-- Kanban Columns (Horizontal Scrollable) -->
        <div class="flex gap-4 overflow-x-auto pb-4 items-start min-h-[540px]">
          @for (stage of stages; track stage.id) {
            <div class="w-72 shrink-0 bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col max-h-[700px]">
              
              <!-- Stage Header -->
              <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200">
                <div class="flex items-center space-x-1.5">
                  <span class="w-2.5 h-2.5 rounded-full" [class]="stage.colorClass"></span>
                  <span class="text-xs font-bold text-slate-800">{{ stage.label }}</span>
                </div>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200">
                  {{ getDealsInStage(stage.id).length }}
                </span>
              </div>

              <!-- Stage Total -->
              <div class="text-[11px] text-slate-500 font-mono mb-2 flex justify-between">
                <span>Total Etapa:</span>
                <span class="font-bold text-slate-700">\${{ getStageSum(stage.id).toFixed(2) }}</span>
              </div>

              <!-- Deal Cards List -->
              <div class="space-y-2.5 overflow-y-auto pr-1 flex-1">
                @for (deal of getDealsInStage(stage.id); track deal.id) {
                  <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all text-xs group">
                    
                    <div class="flex items-start justify-between">
                      <span class="text-[10px] font-bold font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                        {{ deal.code }}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono">
                        {{ deal.expectedCloseDate }}
                      </span>
                    </div>

                    <h4 class="font-bold text-slate-900 mt-1.5 leading-snug">{{ deal.title }}</h4>
                    <p class="text-xs font-medium text-slate-600 mt-0.5 flex items-center space-x-1">
                      <mat-icon class="text-slate-400 text-xs">business</mat-icon>
                      <span class="truncate">{{ deal.customerName }}</span>
                    </p>

                    <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span class="text-[10px] text-slate-400 uppercase font-semibold">Valor Estimado</span>
                        <p class="font-bold text-slate-800 font-mono">\${{ deal.expectedValueUsd.toFixed(2) }}</p>
                      </div>
                      <div class="text-right">
                        <span class="text-[10px] text-slate-400 uppercase font-semibold">Prob.</span>
                        <p class="font-bold text-violet-700 font-mono">{{ deal.probability }}%</p>
                      </div>
                    </div>

                    <!-- Contact details & rep -->
                    <div class="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span class="truncate">👤 {{ deal.contactPerson }}</span>
                      <span class="text-[10px] text-slate-400 font-mono">{{ deal.assignedTo }}</span>
                    </div>

                    <!-- Activities count badge -->
                    @if (deal.activities.length > 0) {
                      <div class="mt-2 pt-1.5 border-t border-slate-50 text-[10px] text-slate-400 flex items-center space-x-1">
                        <mat-icon class="text-[11px]">chat</mat-icon>
                        <span class="truncate">{{ deal.activities[0].type }}: {{ deal.activities[0].description }}</span>
                      </div>
                    }

                    <!-- Quick Stage Transition Actions -->
                    <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between opacity-90 group-hover:opacity-100">
                      <button 
                        (click)="openActivityModal(deal)"
                        title="Registrar Actividad / Bitácora"
                        class="p-1 hover:bg-violet-50 text-violet-600 rounded flex items-center space-x-0.5 text-[10px] font-semibold">
                        <mat-icon class="text-xs">add_comment</mat-icon>
                        <span>Actividad</span>
                      </button>

                      <div class="flex items-center space-x-1">
                        <!-- Move Left -->
                        @if (canMoveLeft(stage.id)) {
                          <button 
                            (click)="moveDeal(deal.id, getPreviousStage(stage.id))" 
                            title="Regresar etapa"
                            class="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded">
                            <mat-icon class="text-xs">chevron_left</mat-icon>
                          </button>
                        }

                        <!-- Move Right -->
                        @if (canMoveRight(stage.id)) {
                          <button 
                            (click)="moveDeal(deal.id, getNextStage(stage.id))" 
                            title="Avanzar etapa"
                            class="p-1 hover:bg-violet-100 text-violet-700 rounded font-bold">
                            <mat-icon class="text-xs">chevron_right</mat-icon>
                          </button>
                        }
                      </div>
                    </div>

                  </div>
                } @empty {
                  <div class="text-center py-8 text-slate-400 text-[11px]">
                    <mat-icon class="text-xl text-slate-300">inbox</mat-icon>
                    <p class="mt-0.5">Sin prospectos</p>
                  </div>
                }
              </div>

            </div>
          }
        </div>

      </div>

      <!-- ========================================================= -->
      <!-- MODAL: NUEVA OPORTUNIDAD COMERCIAL -->
      <!-- ========================================================= -->
      @if (showDealModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-violet-600">contact_mail</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Registrar Oportunidad en Pipeline</h3>
              </div>
              <button (click)="closeDealModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="dealForm" (ngSubmit)="submitDealForm()" class="mt-4 space-y-3.5 text-xs">
              <div>
                <label for="deal-title" class="block font-semibold text-slate-700 mb-1">Título de la Oportunidad / Proyecto *</label>
                <input id="deal-title" type="text" formControlName="title" placeholder="Ej: Renovación de Equipamiento 2026" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="deal-cust" class="block font-semibold text-slate-700 mb-1">Empresa / Razón Social *</label>
                  <input id="deal-cust" type="text" formControlName="customerName" placeholder="Ej: Distribuidora Sol C.A." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label for="deal-contact" class="block font-semibold text-slate-700 mb-1">Persona de Contacto *</label>
                  <input id="deal-contact" type="text" formControlName="contactPerson" placeholder="Ej: Ing. Pedro Ramírez" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="deal-email" class="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input id="deal-email" type="email" formControlName="email" placeholder="correo@empresa.com" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label for="deal-phone" class="block font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input id="deal-phone" type="text" formControlName="phone" placeholder="+58 412 1234567" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label for="deal-val" class="block font-semibold text-slate-700 mb-1">Valor Estimado ($) *</label>
                  <input id="deal-val" type="number" step="0.01" min="1" formControlName="expectedValueUsd" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
                <div>
                  <label for="deal-stage" class="block font-semibold text-slate-700 mb-1">Etapa Inicial *</label>
                  <select id="deal-stage" formControlName="stage" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    @for (s of stages; track s.id) {
                      <option [value]="s.id">{{ s.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="deal-close-date" class="block font-semibold text-slate-700 mb-1">Fecha Cierre Est. *</label>
                  <input id="deal-close-date" type="date" formControlName="expectedCloseDate" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label for="deal-activity" class="block font-semibold text-slate-700 mb-1">Primera Actividad o Bitácora</label>
                <input id="deal-activity" type="text" formControlName="initialActivity" placeholder="Ej: Primer contacto telefónico realizado..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none" />
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeDealModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all">Cancelar</button>
                <button type="submit" [disabled]="dealForm.invalid" class="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all">Crear Oportunidad</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================================= -->
      <!-- MODAL: REGISTRAR ACTIVIDAD COMERCIAL -->
      <!-- ========================================================= -->
      @if (showActivityModal() && activeDealForActivity()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <mat-icon class="text-violet-600">forum</mat-icon>
                <h3 class="text-base font-bold text-slate-800">Bitácora: {{ activeDealForActivity()?.code }}</h3>
              </div>
              <button (click)="closeActivityModal()" class="text-slate-400 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="activityForm" (ngSubmit)="submitActivityForm()" class="mt-4 space-y-3.5 text-xs">
              <div>
                <label for="act-type" class="block font-semibold text-slate-700 mb-1">Tipo de Interacción *</label>
                <select id="act-type" formControlName="type" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                  <option value="LLAMADA">📞 Llamada Telefónica</option>
                  <option value="WHATSAPP">💬 Mensaje de WhatsApp</option>
                  <option value="REUNION">🤝 Reunión Presencial / Virtual</option>
                  <option value="CORREO">✉️ Correo Electrónico</option>
                  <option value="DEMO">💻 Demostración de Producto</option>
                  <option value="NOTA">📝 Nota Interna</option>
                </select>
              </div>

              <div>
                <label for="act-desc" class="block font-semibold text-slate-700 mb-1">Descripción / Resumen de la Conversación *</label>
                <textarea id="act-desc" formControlName="description" rows="3" placeholder="Detalles de lo conversado y próximos compromisos..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 focus:outline-none"></textarea>
              </div>

              <!-- Previous activities history -->
              <div class="pt-3 border-t border-slate-100">
                <p class="font-bold text-slate-700 text-xs mb-2">Historial de Interacciones:</p>
                <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  @for (act of activeDealForActivity()?.activities || []; track act.id) {
                    <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                      <div class="flex items-center justify-between text-slate-400 font-mono">
                        <span>{{ act.type }} • {{ act.user }}</span>
                        <span>{{ act.date.substring(0, 16) }}</span>
                      </div>
                      <p class="text-slate-700 mt-0.5">{{ act.description }}</p>
                    </div>
                  }
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button type="button" (click)="closeActivityModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Cerrar</button>
                <button type="submit" [disabled]="activityForm.invalid" class="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm">Guardar Bitácora</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `
})
export class CrmComponent {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);
  shortcutService = inject(KeyboardShortcutsService);
  fb = inject(FormBuilder);

  searchQuery = signal<string>('');
  showDealModal = signal<boolean>(false);
  showActivityModal = signal<boolean>(false);
  activeDealForActivity = signal<CrmDeal | null>(null);

  constructor() {
    effect(() => {
      const action = this.shortcutService.lastExecutedAction();
      if (action?.actionId === 'NEW_CRM_DEAL') {
        this.openNewDealModal();
      }
    });
  }

  stages: StageColumn[] = [
    { id: 'NUEVO_LEAD', label: 'Nuevo Lead', probability: 20, colorClass: 'bg-slate-400', borderClass: 'border-slate-300' },
    { id: 'CONTACTADO', label: 'Contactado', probability: 35, colorClass: 'bg-blue-400', borderClass: 'border-blue-300' },
    { id: 'DIAGNOSTICO', label: 'Diagnóstico', probability: 50, colorClass: 'bg-amber-400', borderClass: 'border-amber-300' },
    { id: 'PROPUESTA', label: 'Propuesta / Cotiz.', probability: 65, colorClass: 'bg-violet-400', borderClass: 'border-violet-300' },
    { id: 'NEGOCIACION', label: 'Negociación', probability: 80, colorClass: 'bg-purple-500', borderClass: 'border-purple-400' },
    { id: 'GANADO', label: 'Ganado / Cerrado', probability: 100, colorClass: 'bg-emerald-500', borderClass: 'border-emerald-400' },
    { id: 'PERDIDO', label: 'Perdido', probability: 0, colorClass: 'bg-rose-500', borderClass: 'border-rose-400' }
  ];

  dealForm = this.fb.group({
    title: ['', Validators.required],
    customerName: ['', Validators.required],
    contactPerson: ['', Validators.required],
    email: [''],
    phone: [''],
    expectedValueUsd: [1000, [Validators.required, Validators.min(1)]],
    stage: ['NUEVO_LEAD' as CrmStage, Validators.required],
    expectedCloseDate: [new Date(Date.now() + 86400000 * 15).toISOString().substring(0, 10), Validators.required],
    initialActivity: ['']
  });

  activityForm = this.fb.group({
    type: ['LLAMADA' as CrmActivityType, Validators.required],
    description: ['', [Validators.required, Validators.minLength(3)]]
  });

  activeDealsCount = computed(() => {
    return this.stateService.crmDeals().filter(d => d.stage !== 'GANADO' && d.stage !== 'PERDIDO').length;
  });

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  getDealsInStage(stageId: CrmStage): CrmDeal[] {
    const q = this.searchQuery().toLowerCase().trim();
    return this.stateService.crmDeals().filter(d => {
      if (d.stage !== stageId) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.contactPerson.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q)
      );
    });
  }

  getStageSum(stageId: CrmStage): number {
    return this.getDealsInStage(stageId).reduce((s, d) => s + d.expectedValueUsd, 0);
  }

  canMoveLeft(stageId: CrmStage): boolean {
    const idx = this.stages.findIndex(s => s.id === stageId);
    return idx > 0 && stageId !== 'PERDIDO';
  }

  canMoveRight(stageId: CrmStage): boolean {
    const idx = this.stages.findIndex(s => s.id === stageId);
    return idx < this.stages.length - 2; // don't move right into PERDIDO
  }

  getPreviousStage(stageId: CrmStage): CrmStage {
    const idx = this.stages.findIndex(s => s.id === stageId);
    return this.stages[Math.max(0, idx - 1)].id;
  }

  getNextStage(stageId: CrmStage): CrmStage {
    const idx = this.stages.findIndex(s => s.id === stageId);
    return this.stages[Math.min(this.stages.length - 2, idx + 1)].id;
  }

  moveDeal(dealId: string, newStage: CrmStage) {
    this.stateService.updateCrmDealStage(dealId, newStage);
  }

  openNewDealModal() {
    this.dealForm.reset({
      title: '',
      customerName: '',
      contactPerson: '',
      email: '',
      phone: '',
      expectedValueUsd: 1500,
      stage: 'NUEVO_LEAD',
      expectedCloseDate: new Date(Date.now() + 86400000 * 15).toISOString().substring(0, 10),
      initialActivity: ''
    });
    this.showDealModal.set(true);
  }

  closeDealModal() {
    this.showDealModal.set(false);
  }

  submitDealForm() {
    if (this.dealForm.invalid) return;
    const v = this.dealForm.value;
    const user = this.authService.currentUser();
    const stage = v.stage as CrmStage;
    const stageObj = this.stages.find(s => s.id === stage);

    const res = this.stateService.createCrmDeal({
      title: v.title!,
      customerName: v.customerName!,
      contactPerson: v.contactPerson!,
      email: v.email || '',
      phone: v.phone || '',
      stage,
      expectedValueUsd: Number(v.expectedValueUsd!),
      probability: stageObj?.probability || 20,
      expectedCloseDate: v.expectedCloseDate!,
      assignedTo: user.name,
      initialActivity: v.initialActivity || undefined
    });

    if (res.success) {
      this.closeDealModal();
    }
  }

  openActivityModal(deal: CrmDeal) {
    this.activeDealForActivity.set(deal);
    this.activityForm.reset({
      type: 'LLAMADA',
      description: ''
    });
    this.showActivityModal.set(true);
  }

  closeActivityModal() {
    this.showActivityModal.set(false);
    this.activeDealForActivity.set(null);
  }

  submitActivityForm() {
    const deal = this.activeDealForActivity();
    if (!deal || this.activityForm.invalid) return;
    const v = this.activityForm.value;

    const res = this.stateService.addCrmActivity(deal.id, {
      type: v.type as CrmActivityType,
      description: v.description!
    });

    if (res.success) {
      // update local signal for updated history
      const updatedDeal = this.stateService.crmDeals().find(d => d.id === deal.id);
      if (updatedDeal) this.activeDealForActivity.set(updatedDeal);
      this.activityForm.reset({ type: 'LLAMADA', description: '' });
    }
  }
}
