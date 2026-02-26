import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

export interface CSVImport {
  id: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  rowCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CSVMapping {
  id: number;
  csvImportId: number;
  name: string;
  mappings: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CSVPreview {
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export interface CSVImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: string[];
  dataType: 'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown';
}

@Injectable({
  providedIn: 'root'
})
export class CSVService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/csv';

  uploadCSV(file: File): Observable<ApiResponse<{ importId: number; filename: string; rowCount: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/upload`, formData);
  }

  getImports(): Observable<ApiResponse<CSVImport[]>> {
    return this.http.get<ApiResponse<CSVImport[]>>(`${this.baseUrl}/imports`);
  }

  previewCSV(importId: number, limit: number = 10): Observable<ApiResponse<CSVPreview>> {
    return this.http.get<ApiResponse<CSVPreview>>(`${this.baseUrl}/${importId}/preview`, {
      params: { limit: limit.toString() }
    });
  }

  processImport(
    importId: number,
    mappings: Record<string, string>,
    companyId: number,
    dataType?: 'social_media' | 'app_review' | 'nps_survey' | 'complaint'
  ): Observable<ApiResponse<CSVImportResult>> {
    return this.http.post<ApiResponse<CSVImportResult>>(
      `${this.baseUrl}/${importId}/process`,
      { mappings, companyId, dataType }
    );
  }

  createMapping(
    csvImportId: number,
    name: string,
    mappings: Record<string, string>
  ): Observable<ApiResponse<CSVMapping>> {
    return this.http.post<ApiResponse<CSVMapping>>(`${this.baseUrl}/mappings`, {
      csvImportId,
      name,
      mappings
    });
  }

  getMappings(csvImportId?: number): Observable<ApiResponse<CSVMapping[]>> {
    let params = new HttpParams();
    if (csvImportId) {
      params = params.set('csvImportId', csvImportId.toString());
    }
    return this.http.get<ApiResponse<CSVMapping[]>>(`${this.baseUrl}/mappings`, { params });
  }

  getImportStatus(importId: number): Observable<ApiResponse<CSVImport>> {
    return this.http.get<ApiResponse<CSVImport>>(`${this.baseUrl}/imports/${importId}`);
  }
}
