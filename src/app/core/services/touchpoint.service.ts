import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

export interface Touchpoint {
  id: number;
  name: string;
  description?: string;
  category?: string;
  order?: number;
  stage?: string;
  type?: string;
  feedbackCount?: number;
  satisfactionScore?: number;
  dissatisfactionScore?: number;
  isPainPoint?: boolean;
  positiveCount?: number;
  negativeCount?: number;
}

export interface TouchpointPerformance {
  touchpointId: number;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  trend: Array<{ date: Date; score: number }>;
}

export interface TouchpointsPayload {
  touchpoints: Touchpoint[];
  aiNarrative?: string;
}

export function normalizeTouchpointsPayload(
  data: Touchpoint[] | TouchpointsPayload | null | undefined
): TouchpointsPayload {
  if (data == null) return { touchpoints: [] };
  if (Array.isArray(data)) return { touchpoints: data };
  return {
    touchpoints: Array.isArray(data.touchpoints) ? data.touchpoints : [],
    aiNarrative: typeof data.aiNarrative === 'string' ? data.aiNarrative : undefined,
  };
}

@Injectable({
  providedIn: 'root'
})
export class TouchpointService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/touchpoints` : '/api/touchpoints';

  getTouchpoints(): Observable<ApiResponse<TouchpointsPayload>> {
    return this.http.get<ApiResponse<TouchpointsPayload>>(this.baseUrl);
  }

  updateTouchpoint(id: number, touchpoint: Partial<Touchpoint>): Observable<ApiResponse<Touchpoint>> {
    return this.http.put<ApiResponse<Touchpoint>>(`${this.baseUrl}/${id}`, touchpoint);
  }

  deleteTouchpoint(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  getTouchpointPerformance(id: number): Observable<ApiResponse<TouchpointPerformance>> {
    return this.http.get<ApiResponse<TouchpointPerformance>>(`${this.baseUrl}/${id}/performance`);
  }

  createTouchpoint(touchpoint: Partial<Touchpoint>): Observable<ApiResponse<Touchpoint>> {
    return this.http.post<ApiResponse<Touchpoint>>(this.baseUrl, touchpoint);
  }
}
