import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PaginationParams } from '../models';

export interface Recommendation {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  effort: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/recommendations';

  getRecommendations(pagination?: PaginationParams): Observable<ApiResponse<Recommendation[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<Recommendation[]>>(this.baseUrl, { params });
  }

  generateRecommendations(
    companyId?: number,
    category?: string,
    limit?: number
  ): Observable<ApiResponse<Recommendation[]>> {
    const body: any = {};
    if (companyId) body.companyId = companyId;
    if (category) body.category = category;
    if (limit) body.limit = limit;
    
    return this.http.post<ApiResponse<Recommendation[]>>(`${this.baseUrl}/generate`, body);
  }
}
