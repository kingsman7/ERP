import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class AuditService {
  private http = inject(HttpClient);
  private baseUrl = "/api/audit";

  getLogs(params?: { limit?: number; module?: string; isCritical?: boolean }) {
    const queryParams: any = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.module) queryParams.module = params.module;
    if (params?.isCritical !== undefined) queryParams.isCritical = params.isCritical;
    return this.http.get(`${this.baseUrl}/logs`, 
      { params: queryParams }
    );
  }
  
  getLogById(id: string) {
    return this.http.get(`${this.baseUrl}/logs/${id}`);
  }

  createLog(data: any) {
    return this.http.post(`${this.baseUrl}/logs`, data);
  }

  getNotifications(isRead?: boolean) {
    const queryParams: any = {};
    if (isRead !== undefined) queryParams.isRead = isRead;
    return this.http.get(`${this.baseUrl}/notifications`, 
      { params: queryParams }
    );
  }

  markNotificationAsRead(id: string) {
    return this.http.put(`${this.baseUrl}/notifications/${id}/read`, {});
  }
  
  createNotification(data: any) {
    return this.http.post(`${this.baseUrl}/notifications`, data);
  }

}