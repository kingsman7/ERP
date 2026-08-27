import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  getProducts(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/products`).pipe(
      catchError(() => of([]))
    );
  }

  getWarehouses(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/warehouses`).pipe(
      catchError(() => of([]))
    );
  }

  getCustomers(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/customers`).pipe(
      catchError(() => of([]))
    );
  }

  getSuppliers(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/suppliers`).pipe(
      catchError(() => of([]))
    );
  }

  getInvoices(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/invoices`).pipe(
      catchError(() => of([]))
    );
  }

  getKardexMovements(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/kardex`).pipe(
      catchError(() => of([]))
    );
  }

  createProduct(product: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/products`, product);
  }

  createInvoice(invoice: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/invoices`, invoice);
  }

  getBoms(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/mrp/boms`).pipe(
      catchError(() => of([]))
    );
  }

  getProductionOrders(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/mrp/orders`).pipe(
      catchError(() => of([]))
    );
  }

  getCrmDeals(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/crm/deals`).pipe(
      catchError(() => of([]))
    );
  }
}
