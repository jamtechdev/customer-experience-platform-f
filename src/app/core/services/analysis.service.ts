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

  // Sentiment Analysis
  analyzeSentiment(text: string, language?: string): Observable<ApiResponse<SentimentAnalysisResult>> {
    return this.http.post<ApiResponse<SentimentAnalysisResult>>(`${this.baseUrl}/sentiment`, { text, language });
  }

  getSentimentResults(feedbackId: string): Observable<ApiResponse<SentimentAnalysisResult>> {
    return this.http.get<ApiResponse<SentimentAnalysisResult>>(`${this.baseUrl}/sentiment/${feedbackId}`);
  }

  batchAnalyzeSentiment(feedbackIds: string[]): Observable<ApiResponse<SentimentAnalysisResult[]>> {
    return this.http.post<ApiResponse<SentimentAnalysisResult[]>>(`${this.baseUrl}/sentiment/batch`, { feedbackIds });
  }

  getSentimentTrends(
    dateFrom: Date, 
    dateTo: Date, 
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('dateFrom', dateFrom.toISOString())
      .set('dateTo', dateTo.toISOString())
      .set('groupBy', groupBy);
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/sentiment/trends`, { params });
  }

  // Root Cause Analysis
  getRootCauseAnalyses(pagination?: PaginationParams): Observable<ApiResponse<RootCauseAnalysis[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<RootCauseAnalysis[]>>(`${this.baseUrl}/root-cause`, { params });
  }

  getRootCauseById(id: string): Observable<ApiResponse<RootCauseAnalysis>> {
    return this.http.get<ApiResponse<RootCauseAnalysis>>(`${this.baseUrl}/root-cause/${id}`);
  }

  createRootCauseAnalysis(feedbackIds: string[], title: string): Observable<ApiResponse<RootCauseAnalysis>> {
    return this.http.post<ApiResponse<RootCauseAnalysis>>(`${this.baseUrl}/root-cause`, { feedbackIds, title });
  }

  generateAIRootCause(feedbackIds: string[]): Observable<ApiResponse<RootCauseAnalysis>> {
    return this.http.post<ApiResponse<RootCauseAnalysis>>(`${this.baseUrl}/root-cause/ai-generate`, { feedbackIds });
  }

  updateRootCauseAnalysis(id: string, analysis: Partial<RootCauseAnalysis>): Observable<ApiResponse<RootCauseAnalysis>> {
    return this.http.put<ApiResponse<RootCauseAnalysis>>(`${this.baseUrl}/root-cause/${id}`, analysis);
  }

  getTopRootCauses(
    dateFrom?: Date, 
    dateTo?: Date, 
    limit: number = 10
  ): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (dateFrom) params = params.set('dateFrom', dateFrom.toISOString());
    if (dateTo) params = params.set('dateTo', dateTo.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/root-cause/top`, { params });
  }

  // AI Recommendations
  getRecommendations(pagination?: PaginationParams): Observable<ApiResponse<AIRecommendation[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<AIRecommendation[]>>(`${this.baseUrl}/recommendations`, { params });
  }

  getRecommendationById(id: string): Observable<ApiResponse<AIRecommendation>> {
    return this.http.get<ApiResponse<AIRecommendation>>(`${this.baseUrl}/recommendations/${id}`);
  }

  generateRecommendations(feedbackIds?: string[], category?: string): Observable<ApiResponse<AIRecommendation[]>> {
    return this.http.post<ApiResponse<AIRecommendation[]>>(`${this.baseUrl}/recommendations/generate`, { feedbackIds, category });
  }

  updateRecommendationStatus(id: string, status: string, comment?: string): Observable<ApiResponse<AIRecommendation>> {
    return this.http.patch<ApiResponse<AIRecommendation>>(`${this.baseUrl}/recommendations/${id}/status`, { status, comment });
  }

  submitRecommendationFeedback(id: string, isHelpful: boolean, rating: number, comment?: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/recommendations/${id}/feedback`, { isHelpful, rating, comment });
  }

  // Keyword Analysis
  getKeywordCloud(dateFrom?: Date, dateTo?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom.toISOString());
    if (dateTo) params = params.set('dateTo', dateTo.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/keywords`, { params });
  }

  // Topic Modeling
  getTopics(dateFrom?: Date, dateTo?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (dateFrom) params = params.set('dateFrom', dateFrom.toISOString());
    if (dateTo) params = params.set('dateTo', dateTo.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/topics`, { params });
  }

  // Competitor Analysis
  getCompetitorAnalysis(competitorId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (competitorId) params = params.set('competitorId', competitorId);
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params });
  }

  compareWithCompetitors(competitorIds: string[], metrics: string[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/competitor/compare`, { competitorIds, metrics });
  }
}
