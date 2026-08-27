import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/products`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /products no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getWarehouses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/warehouses`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /warehouses no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/customers`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /customers no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getSuppliers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/suppliers`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /suppliers no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getInvoices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/invoices`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /invoices no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getKardexMovements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/kardex`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /kardex no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  createProduct(product: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/products`, product);
  }

  createInvoice(invoice: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/invoices`, invoice);
  }

  getBoms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mrp/boms`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /mrp/boms no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getProductionOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mrp/orders`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /mrp/orders no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }

  getCrmDeals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/crm/deals`).pipe(
      catchError(err => {
        console.warn('Backend endpoint /crm/deals no disponible, usando fallback local:', err);
        return of([]);
      })
    );
  }
}
