import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-master-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <main class="min-h-screen bg-slate-100 text-slate-900">
      <router-outlet />
    </main>
  `
})
export class MasterShellComponent {}