import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ErpStateService } from './services/erp-state.service';
import { AuthService } from './services/auth.service';
import { Invoice } from './models/erp.models';
import { NavTab } from './components/sidebar/sidebar';

import { HeaderComponent } from './components/header/header';
import { SidebarComponent } from './components/sidebar/sidebar';
import { DashboardComponent } from './components/dashboard/dashboard';
import { InventoryComponent } from './components/inventory/inventory';
import { KardexComponent } from './components/kardex/kardex';
import { PurchasesComponent } from './components/purchases/purchases';
import { SalesPosComponent } from './components/sales-pos/sales-pos';
import { QuotesComponent } from './components/quotes/quotes';
import { MrpComponent } from './components/mrp/mrp';
import { CrmComponent } from './components/crm/crm';
import { AccountingComponent } from './components/accounting/accounting';
import { CashClosingComponent } from './components/cash-closing/cash-closing';
import { AuditLogComponent } from './components/audit-log/audit-log';
import { ArchitectureModal } from './components/architecture-modal/architecture-modal';
import { InvoiceModal } from './components/invoice-modal/invoice-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    MatIconModule,
    HeaderComponent,
    SidebarComponent,
    DashboardComponent,
    InventoryComponent,
    KardexComponent,
    PurchasesComponent,
    SalesPosComponent,
    QuotesComponent,
    MrpComponent,
    CrmComponent,
    AccountingComponent,
    CashClosingComponent,
    AuditLogComponent,
    ArchitectureModal,
    InvoiceModal
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  stateService = inject(ErpStateService);
  authService = inject(AuthService);

  activeNavId = signal<NavTab>('dashboard');
  showArchModal = signal<boolean>(false);
  activeInvoiceForModal = signal<Invoice | null>(null);

  onNavChange(navId: NavTab) {
    if (navId === 'architecture') {
      this.showArchModal.set(true);
      return;
    }
    this.activeNavId.set(navId);
  }

  showInvoice(invoice: Invoice) {
    this.activeInvoiceForModal.set(invoice);
  }

  closeInvoiceModal() {
    this.activeInvoiceForModal.set(null);
  }

  dismissToast(id: string) {
    this.stateService.dismissNotification(id);
  }
}
