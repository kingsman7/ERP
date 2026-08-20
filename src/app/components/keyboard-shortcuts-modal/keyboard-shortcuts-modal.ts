import { Component, ChangeDetectionStrategy, inject, signal, computed, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { KeyboardShortcutsService, ShortcutDefinition, ShortcutCategory } from '../../services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      (click)="closeOnBackdrop($event)">
      
      <div 
        class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        (click)="$event.stopPropagation()">
        
        <!-- Search & Header Bar (Bento Dark/Light Header) -->
        <div class="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center space-x-2.5">
            <div class="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <mat-icon class="text-xl">keyboard</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-bold tracking-tight">Atajos de Teclado & Paleta de Navegación Rápida</h2>
              <p class="text-[11px] text-slate-300">Navegue entre módulos y cree nuevos registros sin tocar el ratón</p>
            </div>
          </div>
          
          <button 
            type="button"
            (click)="closeModal()" 
            class="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Cerrar [ESC]">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Filter Input & Categories -->
        <div class="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          
          <!-- Live Search Bar -->
          <div class="relative">
            <mat-icon class="absolute left-3.5 top-2.5 text-slate-400 text-base">search</mat-icon>
            <input 
              #searchInput
              type="text" 
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              placeholder="Escribe para buscar comandos (ej. 'Factura', 'Alt+N', 'Inventario', 'Proveedor')..." 
              class="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-2xs" />
            
            <div class="absolute right-3 top-2.5 flex items-center space-x-1">
              <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                ESC para salir
              </span>
            </div>
          </div>

          <!-- Category Pills -->
          <div class="flex items-center space-x-1.5 overflow-x-auto text-xs pb-0.5">
            <button 
              type="button"
              (click)="selectedCategory.set('ALL')"
              [class]="selectedCategory() === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs">
              Todos ({{ shortcutService.shortcuts.length }})
            </button>

            <button 
              type="button"
              (click)="selectedCategory.set('CREATION')"
              [class]="selectedCategory() === 'CREATION' ? 'bg-amber-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs flex items-center space-x-1">
              <span>✨ Creación de Registros</span>
              <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
                {{ getCountByCategory('CREATION') }}
              </span>
            </button>

            <button 
              type="button"
              (click)="selectedCategory.set('NAVIGATION')"
              [class]="selectedCategory() === 'NAVIGATION' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs flex items-center space-x-1">
              <span>🚀 Navegación de Módulos</span>
              <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-mono font-bold">
                {{ getCountByCategory('NAVIGATION') }}
              </span>
            </button>

            <button 
              type="button"
              (click)="selectedCategory.set('POS')"
              [class]="selectedCategory() === 'POS' ? 'bg-emerald-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs flex items-center space-x-1">
              <span>🛒 Terminal POS</span>
              <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-mono font-bold">
                {{ getCountByCategory('POS') }}
              </span>
            </button>

            <button 
              type="button"
              (click)="selectedCategory.set('SYSTEM')"
              [class]="selectedCategory() === 'SYSTEM' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
              class="px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs flex items-center space-x-1">
              <span>⚙️ Sistema & Utilidades</span>
              <span class="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-900 font-mono font-bold">
                {{ getCountByCategory('SYSTEM') }}
              </span>
            </button>
          </div>

        </div>

        <!-- Shortcuts List Section -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          
          @if (filteredShortcuts().length === 0) {
            <div class="py-12 text-center text-slate-400 space-y-2">
              <mat-icon class="text-4xl text-slate-300">search_off</mat-icon>
              <p class="text-sm font-semibold">No se encontraron atajos para "{{ searchQuery() }}"</p>
              <p class="text-xs">Prueba buscando por nombre del módulo, tecla o tipo de acción.</p>
            </div>
          } @else {
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              @for (item of filteredShortcuts(); track item.id) {
                <div 
                  (click)="executeShortcut(item)"
                  class="p-3.5 bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                  
                  <div class="flex items-center space-x-3 min-w-0">
                    <div 
                      class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                      [class]="item.category === 'CREATION' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                               (item.category === 'NAVIGATION' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                               (item.category === 'POS' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'))">
                      <mat-icon class="text-base">{{ item.icon }}</mat-icon>
                    </div>

                    <div class="min-w-0">
                      <div class="flex items-center space-x-1.5">
                        <p class="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {{ item.title }}
                        </p>
                        @if (item.category === 'CREATION') {
                          <span class="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">Crear</span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 truncate mt-0.5">{{ item.description }}</p>
                    </div>
                  </div>

                  <!-- Keycap Badge -->
                  <div class="flex items-center space-x-1 shrink-0 ml-3">
                    <kbd class="px-2 py-1 bg-slate-100 group-hover:bg-blue-50 text-slate-800 group-hover:text-blue-700 font-mono text-[11px] font-bold rounded-lg border border-slate-300 shadow-2xs">
                      {{ item.keyDisplay }}
                    </kbd>
                    <mat-icon class="text-slate-300 group-hover:text-blue-500 text-sm group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </mat-icon>
                  </div>

                </div>
              }
            </div>

          }

        </div>

        <!-- Footer / Pro-tips -->
        <div class="p-3.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <mat-icon class="text-blue-600 text-sm">lightbulb</mat-icon>
            <span>Consejo: Presione <kbd class="px-1.5 py-0.5 bg-white border rounded font-mono font-bold text-[10px]">Alt + N</kbd> en cualquier momento para iniciar una factura inmediata.</span>
          </div>

          <div class="flex items-center space-x-2 font-medium">
            <span>Presione <kbd class="px-1.5 py-0.5 bg-white border rounded font-mono font-bold text-[10px]">Ctrl + K</kbd> para abrir esta paleta</span>
          </div>
        </div>

      </div>

    </div>
  `
})
export class KeyboardShortcutsModalComponent implements AfterViewInit {
  shortcutService = inject(KeyboardShortcutsService);
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  searchQuery = signal<string>('');
  selectedCategory = signal<ShortcutCategory | 'ALL'>('ALL');

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 50);
  }

  filteredShortcuts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.shortcutService.shortcuts.filter(s => {
      // Category filter
      if (cat !== 'ALL' && s.category !== cat) {
        return false;
      }
      // Search query filter
      if (!q) return true;

      return s.title.toLowerCase().includes(q) ||
             s.description.toLowerCase().includes(q) ||
             s.keyDisplay.toLowerCase().includes(q) ||
             s.id.toLowerCase().includes(q);
    });
  });

  getCountByCategory(cat: ShortcutCategory): number {
    return this.shortcutService.shortcuts.filter(s => s.category === cat).length;
  }

  executeShortcut(shortcut: ShortcutDefinition): void {
    this.shortcutService.triggerAction(shortcut.id);
  }

  closeModal(): void {
    this.shortcutService.showPalette.set(false);
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
