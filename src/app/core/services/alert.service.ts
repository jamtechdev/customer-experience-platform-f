import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationParams } from '../models';
import { environment } from '../../../environments/environment';

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

/** Backend wraps list alerts with optional AI narrative (supports legacy array-only payloads). */
export interface AlertsPayload {
  alerts: Alert[];
  aiNarrative?: string;
}

export function normalizeAlertsPayload(data: Alert[] | AlertsPayload | null | undefined): AlertsPayload {
  if (data == null) return { alerts: [] };
  if (Array.isArray(data)) return { alerts: data };
  return {
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
    aiNarrative: typeof data.aiNarrative === 'string' ? data.aiNarrative : undefined,
  };
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/alerts` : '/api/alerts';

  getAlerts(acknowledged?: boolean): Observable<ApiResponse<AlertsPayload>> {
    let params = new HttpParams();
    if (acknowledged !== undefined) {
      params = params.set('acknowledged', acknowledged.toString());
    }
    return this.http.get<ApiResponse<AlertsPayload>>(this.baseUrl, { params });
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
