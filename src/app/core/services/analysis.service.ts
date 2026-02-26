import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  SentimentAnalysisResult,
  RootCauseAnalysis,
  AIRecommendation,
  ApiResponse,
  PaginationParams
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/analysis';

  // Sentiment Analysis - matches backend /api/analysis/sentiment
  analyzeSentiment(feedbackId: number): Observable<ApiResponse<SentimentAnalysisResult>> {
    return this.http.post<ApiResponse<SentimentAnalysisResult>>(`${this.baseUrl}/sentiment`, { feedbackId });
  }

  getSentimentStats(companyId?: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/sentiment`, { params });
  }

  // Root Cause Analysis - matches backend /api/analysis/root-cause
  analyzeRootCauses(companyId: number, limit: number = 50): Observable<ApiResponse<RootCauseAnalysis[]>> {
    return this.http.post<ApiResponse<RootCauseAnalysis[]>>(`${this.baseUrl}/root-cause`, { companyId, limit });
  }

  getRootCauses(companyId?: number): Observable<ApiResponse<RootCauseAnalysis[]>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<ApiResponse<RootCauseAnalysis[]>>(`${this.baseUrl}/root-cause`, { params });
  }

  // NPS Analysis - matches backend /api/analysis/nps
  analyzeNPS(companyId: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    const body: any = { companyId };
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/nps`, body);
  }

  getNPSTrends(companyId: number, period: 'day' | 'week' | 'month' = 'month'): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('period', period);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/nps`, { params });
  }

  // Competitor Analysis - matches backend /api/analysis/competitor
  getCompetitorAnalysis(companyId: number): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('companyId', companyId.toString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params });
  }
}
