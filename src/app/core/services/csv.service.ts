import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: any;
}

export interface CSVImport {
  id: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  rowCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: number;
  errorMessage?: string;
  errorDetails?: {
    totalIssues?: number;
    byField?: Record<string, number>;
    examples?: RowValidationError[];
    requiredMappings?: string[];
    guidance?: string[];
    /** Present when import completed but some rows were skipped */
    importOmissions?: boolean;
    omittedCount?: number;
    omittedExamplesTruncated?: boolean;
    omittedRowsFileName?: string;
    statusLabel?: 'processing' | 'completed_with_omissions' | 'completed' | 'failed';
    progress?: boolean;
    totalRows?: number;
    processedCount?: number;
    importedCount?: number;
    completionPct?: number;
    aiSummary?: {
      enabled: boolean;
      attempted: number;
      succeeded: number;
      failed: number;
      failedExamples: string[];
    };
  };
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
  detectedType?: 'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown';
  suggestedMappings?: Record<string, string>;
  systemFields?: SystemField[];
  /** Same as systemFields (backend alias). */
  schemaFields?: SystemField[];
}

export interface SystemField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
}

export interface ValidateMappingsResult {
  valid: boolean;
  detectedType: 'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown';
  requiredFields: string[];
  mappedFields: string[];
  errors: RowValidationError[];
}

export type DateFormatHint = 'auto' | 'excel_serial' | 'iso' | 'dmy_dot' | 'dmy_slash' | 'dmy_dash';

export interface ImportOmissionSummary {
  omittedCount: number;
  omittedExamples: RowValidationError[];
  omittedExamplesTruncated: boolean;
}

export interface CSVImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: string[];
  dataType: 'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown';
  omissionSummary?: ImportOmissionSummary;
  aiSummary?: {
    enabled: boolean;
    attempted: number;
    succeeded: number;
    failed: number;
    failedExamples: string[];
  };
}

export interface CSVFormat {
  /** Legacy / combined label from API (optional). */
  requiredColumns?: string[];
  requiredSystemFieldsFeedback?: string[];
  requiredSystemFieldsNps?: string[];
  optionalColumns: string[];
  maxFileSizeBytes: number;
  acceptedExtensions?: string[];
  firstRowHeaders?: boolean;
}

export interface CSVUploadResponse {
  importId: number;
  filename: string;
  rowCount: number;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CSVService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/csv` : '/api/csv';

  getFormat(): Observable<ApiResponse<CSVFormat>> {
    return this.http.get<ApiResponse<CSVFormat>>(`${this.baseUrl}/format`);
  }

  uploadCSV(file: File): Observable<ApiResponse<CSVUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<CSVUploadResponse>>(`${this.baseUrl}/upload`, formData);
  }

  getImports(): Observable<ApiResponse<CSVImport[]>> {
    const params = new HttpParams().set('_t', Date.now().toString());
    return this.http.get<ApiResponse<CSVImport[]>>(`${this.baseUrl}/imports`, { params });
  }

  previewCSV(importId: number, limit: number = 10): Observable<ApiResponse<CSVPreview>> {
    return this.http.get<ApiResponse<CSVPreview>>(`${this.baseUrl}/${importId}/preview`, {
      params: { limit: limit.toString() }
    });
  }

  validateImport(
    importId: number,
    payload: {
      mappings: Record<string, string>;
      dataType?: 'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown';
      sampleLimit?: number;
      dateFormat?: DateFormatHint;
    }
  ): Observable<ApiResponse<ValidateMappingsResult>> {
    return this.http.post<ApiResponse<ValidateMappingsResult>>(`${this.baseUrl}/${importId}/validate`, payload);
  }

  processImport(
    importId: number,
    mappings: Record<string, string>,
    companyId: number,
    dataType?: 'social_media' | 'app_review' | 'nps_survey' | 'complaint',
    dateFormat?: DateFormatHint
  ): Observable<ApiResponse<CSVImportResult>> {
    return this.http.post<ApiResponse<CSVImportResult>>(
      `${this.baseUrl}/${importId}/process`,
      { mappings, companyId, dataType, dateFormat }
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

  downloadOmittedRows(importId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/imports/${importId}/omitted-rows`, { responseType: 'blob' });
  }

  deleteImport(importId: number, deleteImportedFeedback: boolean = true): Observable<ApiResponse<{ deletedId: number }>> {
    let params = new HttpParams();
    params = params.set('deleteImportedFeedback', String(deleteImportedFeedback));
    return this.http.delete<ApiResponse<{ deletedId: number }>>(`${this.baseUrl}/imports/${importId}`, { params });
  }
}
