import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationParams } from '../models';

export interface Alert {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/alerts';

  getAlerts(acknowledged?: boolean): Observable<ApiResponse<Alert[]>> {
    let params = new HttpParams();
    if (acknowledged !== undefined) {
      params = params.set('acknowledged', acknowledged.toString());
    }
    return this.http.get<ApiResponse<Alert[]>>(this.baseUrl, { params });
  }

  acknowledgeAlert(id: number): Observable<ApiResponse<Alert>> {
    return this.http.post<ApiResponse<Alert>>(`${this.baseUrl}/${id}/acknowledge`, {});
  }

  checkAlerts(companyId: number, thresholds?: Record<string, number>): Observable<ApiResponse<any[]>> {
    const body: { companyId: number; thresholds?: Record<string, number> } = { companyId };
    if (thresholds && Object.keys(thresholds).length > 0) body.thresholds = thresholds;
    return this.http.post<ApiResponse<any[]>>(`${this.baseUrl}/check`, body);
  }
}
