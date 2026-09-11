import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Bom, CrmDeal, Customer, Invoice, KardexMovement, Product, ProductCategory, ProductionOrder, Supplier, Warehouse } from '../models/erp.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`).pipe(
      catchError(() => of([]))
    );
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.baseUrl}/categories`).pipe(
      catchError(() => of([]))
    );
  }

  createCategory(category: ProductCategory): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(`${this.baseUrl}/categories`, category);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.http.get<Warehouse[]>(`${this.baseUrl}/warehouses`).pipe(
      catchError(() => of([]))
    );
  }

  createWarehouse(warehouse: Warehouse): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.baseUrl}/warehouses`, warehouse);
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`).pipe(
      catchError(() => of([]))
    );
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.baseUrl}/suppliers`).pipe(
      catchError(() => of([]))
    );
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.baseUrl}/invoices`).pipe(
      catchError(() => of([]))
    );
  }

  getKardexMovements(): Observable<KardexMovement[]> {
    return this.http.get<KardexMovement[]>(`${this.baseUrl}/kardex`).pipe(
      catchError(() => of([]))
    );
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, product);
  }

  createInvoice(invoice: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}/invoices`, invoice);
  }

  getBoms(): Observable<Bom[]> {
    return this.http.get<Bom[]>(`${this.baseUrl}/mrp/boms`).pipe(
      catchError(() => of([]))
    );
  }

  getProductionOrders(): Observable<ProductionOrder[]> {
    return this.http.get<ProductionOrder[]>(`${this.baseUrl}/mrp/orders`).pipe(
      catchError(() => of([]))
    );
  }

  getCrmDeals(): Observable<CrmDeal[]> {
    return this.http.get<CrmDeal[]>(`${this.baseUrl}/crm/deals`).pipe(
      catchError(() => of([]))
    );
  }
}
