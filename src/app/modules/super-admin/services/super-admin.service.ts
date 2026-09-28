import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import {
  BillingSubscription,
  MasterCompany,
  PendingBillingCheckout,
  SubscriptionPlan
} from '../models/super-admin.models';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly http = inject(HttpClient);
  private readonly masterApi = '/api/v1/master';

  readonly company = signal<MasterCompany | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly subscription = signal<BillingSubscription | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  fetchMasterData(): Observable<boolean> {
    this.isLoading.set(true);
    this.error.set(null);

    return forkJoin({
      company: this.http.get<MasterCompany>(`${this.masterApi}/company`),
      plans: this.http.get<SubscriptionPlan[]>(`${this.masterApi}/billing/plans`),
      subscription: this.http.get<BillingSubscription>(`${this.masterApi}/billing/subscription`)
    }).pipe(
      tap(({ company, plans, subscription }) => {
        this.company.set(company);
        this.plans.set(plans);
        this.subscription.set(subscription);
        this.isLoading.set(false);
      }),
      map(() => true),
      catchError(error => {
        this.error.set(error?.error?.message || 'No fue posible cargar la configuración de la empresa.');
        this.isLoading.set(false);
        return of(false);
      })
    );
  }

  requestBillingPlanChange(plan: SubscriptionPlan): Observable<PendingBillingCheckout> {
    if (!plan.id || !plan.code) {
      return throwError(() => new Error('El plan seleccionado no tiene identificadores de facturación válidos.'));
    }

    const idempotencyKey = this.createBillingIdempotencyKey(plan.id);
    return this.http.post<PendingBillingCheckout>(`${this.masterApi}/billing/subscription/plan-change`, {
      planId: plan.id,
      planCode: plan.code,
      currency: plan.currency || 'USD',
      idempotencyKey
    });
  }

  refreshSubscription(): Observable<BillingSubscription> {
    return this.http.get<BillingSubscription>(`${this.masterApi}/billing/subscription`).pipe(
      tap(subscription => this.subscription.set(subscription))
    );
  }

  private createBillingIdempotencyKey(planId: string): string {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    return `plan-change:${planId}:${randomPart}`;
  }
}
