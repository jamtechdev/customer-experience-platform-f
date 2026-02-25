import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Feedback, 
  FeedbackFilter, 
  FeedbackStats, 
  ApiResponse, 
  PaginationParams,
  ResponseMeta
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/feedback';

  getFeedback(
    filter?: FeedbackFilter, 
    pagination?: PaginationParams
  ): Observable<ApiResponse<Feedback[]>> {
    let params = new HttpParams();
    
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
      if (pagination.sortBy) {
        params = params.set('sortBy', pagination.sortBy);
        params = params.set('sortOrder', pagination.sortOrder || 'desc');
      }
    }

    if (filter) {
      if (filter.sources?.length) params = params.set('sources', filter.sources.join(','));
      if (filter.platforms?.length) params = params.set('platforms', filter.platforms.join(','));
      if (filter.sentiments?.length) params = params.set('sentiments', filter.sentiments.join(','));
      if (filter.categories?.length) params = params.set('categories', filter.categories.join(','));
      if (filter.priorities?.length) params = params.set('priorities', filter.priorities.join(','));
      if (filter.statuses?.length) params = params.set('statuses', filter.statuses.join(','));
      if (filter.dateFrom) params = params.set('dateFrom', filter.dateFrom.toISOString());
      if (filter.dateTo) params = params.set('dateTo', filter.dateTo.toISOString());
      if (filter.searchText) params = params.set('searchText', filter.searchText);
    }

    return this.http.get<ApiResponse<Feedback[]>>(this.baseUrl, { params });
  }

  getFeedbackById(id: string): Observable<ApiResponse<Feedback>> {
    return this.http.get<ApiResponse<Feedback>>(`${this.baseUrl}/${id}`);
  }

  createFeedback(feedback: Partial<Feedback>): Observable<ApiResponse<Feedback>> {
    return this.http.post<ApiResponse<Feedback>>(this.baseUrl, feedback);
  }

  updateFeedback(id: string, feedback: Partial<Feedback>): Observable<ApiResponse<Feedback>> {
    return this.http.put<ApiResponse<Feedback>>(`${this.baseUrl}/${id}`, feedback);
  }

  deleteFeedback(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  getFeedbackStats(filter?: FeedbackFilter): Observable<ApiResponse<FeedbackStats>> {
    let params = new HttpParams();
    if (filter?.dateFrom) params = params.set('dateFrom', filter.dateFrom.toISOString());
    if (filter?.dateTo) params = params.set('dateTo', filter.dateTo.toISOString());
    
    return this.http.get<ApiResponse<FeedbackStats>>(`${this.baseUrl}/stats`, { params });
  }

  assignFeedback(id: string, assignedTo: string, department: string): Observable<ApiResponse<Feedback>> {
    return this.http.post<ApiResponse<Feedback>>(`${this.baseUrl}/${id}/assign`, { assignedTo, department });
  }

  updateFeedbackStatus(id: string, status: string, notes?: string): Observable<ApiResponse<Feedback>> {
    return this.http.patch<ApiResponse<Feedback>>(`${this.baseUrl}/${id}/status`, { status, notes });
  }

  bulkUpdateStatus(ids: string[], status: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/bulk/status`, { ids, status });
  }

  exportFeedback(filter?: FeedbackFilter, format: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    
    if (filter?.dateFrom) params = params.set('dateFrom', filter.dateFrom.toISOString());
    if (filter?.dateTo) params = params.set('dateTo', filter.dateTo.toISOString());
    
    return this.http.get(`${this.baseUrl}/export`, { 
      params, 
      responseType: 'blob' 
    });
  }

  importFeedback(file: File): Observable<ApiResponse<{ processed: number; failed: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<ApiResponse<{ processed: number; failed: number }>>(
      `${this.baseUrl}/import`, 
      formData
    );
  }
}
