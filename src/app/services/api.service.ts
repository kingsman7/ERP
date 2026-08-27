import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getProducts(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/products`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /products no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getWarehouses(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/warehouses`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /warehouses no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getCustomers(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/customers`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /customers no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getSuppliers(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/suppliers`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /suppliers no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getInvoices(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/invoices`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /invoices no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getKardexMovements(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/kardex`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /kardex no disponible, usando fallback local:', err);
        return of([]);
      })
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
      catchError(err => {
        console.warn('Backend endpoint /mrp/boms no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getProductionOrders(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/mrp/orders`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /mrp/orders no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getCrmDeals(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/crm/deals`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /crm/deals no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }
}
