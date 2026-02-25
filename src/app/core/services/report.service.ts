import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Report,
  ReportType,
  ReportFormat,
  KPI,
  Survey,
  SurveyResponse,
  Competitor,
  CompetitorAnalysis,
  DateRange,
  ApiResponse, 
  PaginationParams 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/reports';

  // Reports
  getReports(pagination?: PaginationParams): Observable<ApiResponse<Report[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<Report[]>>(this.baseUrl, { params });
  }

  getReportById(id: string): Observable<ApiResponse<Report>> {
    return this.http.get<ApiResponse<Report>>(`${this.baseUrl}/${id}`);
  }

  createReport(report: Partial<Report>): Observable<ApiResponse<Report>> {
    return this.http.post<ApiResponse<Report>>(this.baseUrl, report);
  }

  updateReport(id: string, report: Partial<Report>): Observable<ApiResponse<Report>> {
    return this.http.put<ApiResponse<Report>>(`${this.baseUrl}/${id}`, report);
  }

  deleteReport(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  generateReport(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/generate`, { responseType: 'blob' });
  }

  scheduleReport(id: string, schedule: any): Observable<ApiResponse<Report>> {
    return this.http.post<ApiResponse<Report>>(`${this.baseUrl}/${id}/schedule`, schedule);
  }

  // Dashboard Data
  getDashboardData(dateRange?: DateRange): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/dashboard`, { params });
  }

  // KPIs
  getKPIs(): Observable<ApiResponse<KPI[]>> {
    return this.http.get<ApiResponse<KPI[]>>(`${this.baseUrl}/kpis`);
  }

  getKPITrends(kpiId: string, dateRange: DateRange): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/kpis/${kpiId}/trends`, { params });
  }

  compareKPIs(dateRange: DateRange, comparePrevious: boolean = true): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('startDate', dateRange.startDate.toISOString())
      .set('endDate', dateRange.endDate.toISOString())
      .set('comparePrevious', comparePrevious.toString());
    
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/kpis/compare`, { params });
  }

  // Real-time metrics
  getRealTimeMetrics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/real-time`);
  }

  // Export
  exportToPdf(reportId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${reportId}/export/pdf`, { responseType: 'blob' });
  }

  exportToExcel(reportId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${reportId}/export/excel`, { responseType: 'blob' });
  }

  exportDashboardToPdf(config: any): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/dashboard/export/pdf`, config, { responseType: 'blob' });
  }
}

@Injectable({
  providedIn: 'root'
})
export class SurveyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/surveys';

  getSurveys(pagination?: PaginationParams): Observable<ApiResponse<Survey[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<Survey[]>>(this.baseUrl, { params });
  }

  getSurveyById(id: string): Observable<ApiResponse<Survey>> {
    return this.http.get<ApiResponse<Survey>>(`${this.baseUrl}/${id}`);
  }

  getSurveyResponses(id: string, pagination?: PaginationParams): Observable<ApiResponse<SurveyResponse[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<SurveyResponse[]>>(`${this.baseUrl}/${id}/responses`, { params });
  }

  getSurveyAnalytics(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${id}/analytics`);
  }

  getNPSScore(dateRange?: DateRange): Observable<ApiResponse<{ score: number; promoters: number; passives: number; detractors: number }>> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/nps`, { params });
  }

  getCSATScore(dateRange?: DateRange): Observable<ApiResponse<{ score: number; satisfied: number; total: number }>> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/csat`, { params });
  }

  importSurveyData(file: File, surveyType: string): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', surveyType);
    
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/import`, formData);
  }
}

@Injectable({
  providedIn: 'root'
})
export class CompetitorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/competitors';

  getCompetitors(): Observable<ApiResponse<Competitor[]>> {
    return this.http.get<ApiResponse<Competitor[]>>(this.baseUrl);
  }

  getCompetitorById(id: string): Observable<ApiResponse<Competitor>> {
    return this.http.get<ApiResponse<Competitor>>(`${this.baseUrl}/${id}`);
  }

  createCompetitor(competitor: Partial<Competitor>): Observable<ApiResponse<Competitor>> {
    return this.http.post<ApiResponse<Competitor>>(this.baseUrl, competitor);
  }

  updateCompetitor(id: string, competitor: Partial<Competitor>): Observable<ApiResponse<Competitor>> {
    return this.http.put<ApiResponse<Competitor>>(`${this.baseUrl}/${id}`, competitor);
  }

  deleteCompetitor(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  getCompetitorAnalysis(id: string, dateRange?: DateRange): Observable<ApiResponse<CompetitorAnalysis>> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }
    return this.http.get<ApiResponse<CompetitorAnalysis>>(`${this.baseUrl}/${id}/analysis`, { params });
  }

  compareAll(dateRange?: DateRange): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('startDate', dateRange.startDate.toISOString());
      params = params.set('endDate', dateRange.endDate.toISOString());
    }
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/compare`, { params });
  }
}
