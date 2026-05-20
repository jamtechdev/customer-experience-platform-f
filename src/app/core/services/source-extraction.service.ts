import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

export interface SourceExtractionRecord {
  id: string;
  source: string;
  company: string;
  competitor: string;
  content: string;
  date: string;
  rating?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SourceExtractionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl
    ? `${environment.apiUrl.replace(/\/$/, '')}/source-extraction`
    : '/api/source-extraction';

  getRecords(source?: string): Observable<ApiResponse<SourceExtractionRecord[]>> {
    const suffix = source ? `?source=${encodeURIComponent(source)}` : '';
    return this.http.get<ApiResponse<SourceExtractionRecord[]>>(`${this.baseUrl}${suffix}`);
  }

  createRecord(record: Omit<SourceExtractionRecord, 'id'>): Observable<ApiResponse<SourceExtractionRecord>> {
    return this.http.post<ApiResponse<SourceExtractionRecord>>(this.baseUrl, record);
  }

  createRecords(records: Array<Omit<SourceExtractionRecord, 'id'>>): Observable<ApiResponse<SourceExtractionRecord[]>> {
    return this.http.post<ApiResponse<SourceExtractionRecord[]>>(`${this.baseUrl}/bulk`, { records });
  }

  deleteRecord(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.delete<ApiResponse<{ id: string }>>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  clearRecords(): Observable<ApiResponse<{ deleted: number }>> {
    return this.http.delete<ApiResponse<{ deleted: number }>>(this.baseUrl);
  }
}
