import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  SentimentAnalysisResult,
  RootCauseAnalysis,
  Recommendation,
  ApiResponse,
  PaginationParams
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/analysis` : '/api/analysis';

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

  getFeedbackWithSentiment(
    companyId?: number,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50
  ): Observable<ApiResponse<{ list: Array<{ id: number; content: string; source: string; date: string; author?: string; sentiment: string; score: number }>; total: number }>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<{ list: any[]; total: number }>>(`${this.baseUrl}/sentiment/list`, { params });
  }

  deleteFeedbackRecord(id: number, companyId?: number): Observable<ApiResponse<{ id: number }>> {
    let params = new HttpParams();
    if (companyId != null) params = params.set('companyId', String(companyId));
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.baseUrl}/sentiment/list/${id}`, { params });
  }

  deleteAllFeedbackRecords(companyId?: number): Observable<ApiResponse<{ deletedFeedback: number; deletedSentimentRows: number }>> {
    let params = new HttpParams();
    if (companyId != null) params = params.set('companyId', String(companyId));
    return this.http.delete<ApiResponse<{ deletedFeedback: number; deletedSentimentRows: number }>>(`${this.baseUrl}/sentiment/list`, { params });
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
  getCompetitorAnalysis(companyId: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params });
  }

  createCompetitor(name: string): Observable<ApiResponse<{ id: number; name: string; companyId: number }>> {
    return this.http.post<ApiResponse<{ id: number; name: string; companyId: number }>>(`${this.baseUrl}/competitor`, { name });
  }

  deleteCompetitor(competitorId: number): Observable<ApiResponse<{ deletedId: number }>> {
    return this.http.delete<ApiResponse<{ deletedId: number }>>(`${this.baseUrl}/competitor/${competitorId}`);
  }

  /** Remove competitor rows whose names look like dates/timestamps (mis-imports). */
  cleanupInvalidCompetitors(): Observable<ApiResponse<{ deleted: number }>> {
    return this.http.post<ApiResponse<{ deleted: number }>>(`${this.baseUrl}/competitor/cleanup-invalid`, {});
  }
}
