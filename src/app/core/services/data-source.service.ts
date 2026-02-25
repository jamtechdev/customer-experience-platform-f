import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  DataSource, 
  SyncLog,
  DataSourceType,
  SyncFrequency,
  ApiResponse, 
  PaginationParams 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataSourceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/data-sources';

  getDataSources(pagination?: PaginationParams): Observable<ApiResponse<DataSource[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<DataSource[]>>(this.baseUrl, { params });
  }

  getDataSourceById(id: string): Observable<ApiResponse<DataSource>> {
    return this.http.get<ApiResponse<DataSource>>(`${this.baseUrl}/${id}`);
  }

  createDataSource(dataSource: Partial<DataSource>): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(this.baseUrl, dataSource);
  }

  updateDataSource(id: string, dataSource: Partial<DataSource>): Observable<ApiResponse<DataSource>> {
    return this.http.put<ApiResponse<DataSource>>(`${this.baseUrl}/${id}`, dataSource);
  }

  deleteDataSource(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  toggleDataSource(id: string, isActive: boolean): Observable<ApiResponse<DataSource>> {
    return this.http.patch<ApiResponse<DataSource>>(`${this.baseUrl}/${id}/toggle`, { isActive });
  }

  testConnection(id: string): Observable<ApiResponse<{ success: boolean; message: string }>> {
    return this.http.post<ApiResponse<{ success: boolean; message: string }>>(`${this.baseUrl}/${id}/test`, {});
  }

  syncNow(id: string): Observable<ApiResponse<SyncLog>> {
    return this.http.post<ApiResponse<SyncLog>>(`${this.baseUrl}/${id}/sync`, {});
  }

  getSyncLogs(id: string, pagination?: PaginationParams): Observable<ApiResponse<SyncLog[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<SyncLog[]>>(`${this.baseUrl}/${id}/sync-logs`, { params });
  }

  // Platform-specific connection methods
  connectInstagram(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/instagram`, credentials);
  }

  connectFacebook(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/facebook`, credentials);
  }

  connectTwitter(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/twitter`, credentials);
  }

  connectYouTube(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/youtube`, credentials);
  }

  connectGoogleReviews(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/google-reviews`, credentials);
  }

  connectAppStore(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/app-store`, credentials);
  }

  connectPlayStore(credentials: any): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/play-store`, credentials);
  }

  // File Import
  importFile(file: File, config: any): Observable<ApiResponse<{ jobId: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config', JSON.stringify(config));
    
    return this.http.post<ApiResponse<{ jobId: string }>>(`${this.baseUrl}/import/file`, formData);
  }

  getImportStatus(jobId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/import/status/${jobId}`);
  }

  // API Integration
  configureApiIntegration(config: {
    name: string;
    endpoint: string;
    method: string;
    headers?: Record<string, string>;
    authentication?: any;
    mappings?: any[];
    frequency: SyncFrequency;
  }): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/api`, config);
  }

  // Call Center Integration
  configureCallCenter(config: {
    name: string;
    transcriptionService: string;
    connectionConfig: any;
  }): Observable<ApiResponse<DataSource>> {
    return this.http.post<ApiResponse<DataSource>>(`${this.baseUrl}/connect/call-center`, config);
  }

  // Stats
  getDataSourceStats(): Observable<ApiResponse<{
    total: number;
    active: number;
    byType: Record<DataSourceType, number>;
    totalRecords: number;
    lastSyncTime: Date;
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stats`);
  }
}
