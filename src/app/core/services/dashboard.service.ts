import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export interface DashboardStats {
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
    total: number;
  };
  nps: {
    score: number;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    recent: Array<{
      id: number;
      title: string;
      message: string;
      priority: string;
      type: string;
      acknowledged: boolean;
      createdAt: Date;
    }>;
  };
  competitor?: {
    company: {
      id: number;
      name: string;
      sentimentScore: number;
      npsScore: number;
      feedbackCount: number;
    };
    competitorCount: number;
    avgCompetitorSentiment: number;
  };
  rootCauses?: {
    total: number;
    critical: number;
    high: number;
    topCauses: Array<{
      id: number;
      title: string;
      category: string;
      priority: string;
    }>;
  };
  journey?: Array<{
    stageId: number;
    stageName: string;
    satisfactionScore: number;
    dissatisfactionScore: number;
    feedbackCount: number;
    painPoints: string[];
    satisfactionPoints: string[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/dashboard';

  getStats(
    companyId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<DashboardStats>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<ApiResponse<DashboardStats>>(`${this.baseUrl}/stats`, { params });
  }

  getSentimentOverview(
    companyId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/sentiment`, { params });
  }

  getNPSDashboard(
    companyId: number,
    startDate?: Date,
    endDate?: Date,
    period: 'day' | 'week' | 'month' = 'month'
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('period', period);
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/nps`, { params });
  }

  getCompetitorComparison(
    companyId: number,
    period: 'day' | 'week' | 'month' = 'month',
    days: number = 30
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('period', period)
      .set('days', days.toString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params });
  }

  getRootCauseSummary(companyId?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/root-causes`, { params });
  }

  getJourneyHeatmap(companyId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/journey`, {
      params: { companyId: companyId.toString() }
    });
  }

  getAlertPanel(acknowledged?: boolean): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (acknowledged !== undefined) {
      params = params.set('acknowledged', acknowledged.toString());
    }
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/alerts`, { params });
  }
}
