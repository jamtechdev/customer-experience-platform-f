import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export interface Touchpoint {
  id: number;
  name: string;
  stage: string;
  type: string;
  feedbackCount: number;
  satisfactionScore: number;
  dissatisfactionScore: number;
  isPainPoint: boolean;
  positiveCount: number;
  negativeCount: number;
}

export interface TouchpointPerformance {
  touchpointId: number;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  trend: Array<{ date: Date; score: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class TouchpointService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/touchpoints';

  getTouchpoints(): Observable<ApiResponse<Touchpoint[]>> {
    return this.http.get<ApiResponse<Touchpoint[]>>(this.baseUrl);
  }

  getTouchpointPerformance(id: number): Observable<ApiResponse<TouchpointPerformance>> {
    return this.http.get<ApiResponse<TouchpointPerformance>>(`${this.baseUrl}/${id}/performance`);
  }

  createTouchpoint(touchpoint: Partial<Touchpoint>): Observable<ApiResponse<Touchpoint>> {
    return this.http.post<ApiResponse<Touchpoint>>(this.baseUrl, touchpoint);
  }
}
