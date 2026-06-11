import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of, timer, throwError } from 'rxjs';
import { catchError, switchMap, retry } from 'rxjs/operators';
import {
  SentimentAnalysisResult,
  RootCauseAnalysis,
  Recommendation,
  ApiResponse,
  TwitterCxReportDto,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/analysis` : '/api/analysis';
  readonly drilldownIdLimit = 200;
  private readonly cxReportPollMs = 5000;
  private readonly cxReportPollAttempts = 36;

  private realtimeParams(params: HttpParams = new HttpParams()): HttpParams {
    return params.set('_t', Date.now().toString());
  }

  // Sentiment Analysis - matches backend /api/analysis/sentiment
  analyzeSentiment(feedbackId: number): Observable<ApiResponse<SentimentAnalysisResult>> {
    return this.http.post<ApiResponse<SentimentAnalysisResult>>(`${this.baseUrl}/sentiment`, { feedbackId });
  }

  getSentimentStats(companyId?: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/sentiment`, { params });
  }

  getTwitterCxCompanySnapshotStatus(companyId: number): Observable<
    ApiResponse<{
      status: 'none' | 'pending' | 'ready' | 'failed';
      snapshotId?: number;
      errorMessage?: string | null;
    }>
  > {
    const params = this.realtimeParams(new HttpParams().set('companyId', String(companyId)));
    return this.http.get<
      ApiResponse<{
        status: 'none' | 'pending' | 'ready' | 'failed';
        snapshotId?: number;
        errorMessage?: string | null;
      }>
    >(`${this.baseUrl}/twitter-cx-report/company-snapshot-status`, { params });
  }

  rebuildTwitterCxReport(companyId: number): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/twitter-cx-report/rebuild`, { companyId });
  }

  getTwitterCxReportSnapshotStatus(snapshotId: number): Observable<
    ApiResponse<{
      status: 'pending' | 'ready' | 'failed';
      errorMessage?: string | null;
      report?: TwitterCxReportDto;
    }>
  > {
    const params = this.realtimeParams(new HttpParams().set('snapshotId', String(snapshotId)));
    return this.http.get<
      ApiResponse<{
        status: 'pending' | 'ready' | 'failed';
        errorMessage?: string | null;
        report?: TwitterCxReportDto;
      }>
    >(`${this.baseUrl}/twitter-cx-report/snapshot-status`, { params });
  }

  private waitForTwitterCxReportSnapshot(
    snapshotId: number,
    attempt: number = 0
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    return timer(attempt === 0 ? 2500 : this.cxReportPollMs).pipe(
      switchMap(() => this.getTwitterCxReportSnapshotStatus(snapshotId)),
      switchMap((statusResp) => {
        const status = statusResp.data?.status;
        if (!statusResp.success || status === 'failed') {
          return of({
            success: false,
            data: undefined as unknown as TwitterCxReportDto,
            message: 'snapshot_failed',
          } as ApiResponse<TwitterCxReportDto>);
        }
        if (status === 'ready' && statusResp.data?.report) {
          return of({
            ...statusResp,
            data: statusResp.data.report,
            message: 'Twitter CX report (cached)',
          } as ApiResponse<TwitterCxReportDto>);
        }
        if (attempt >= this.cxReportPollAttempts - 1) {
          return of({
            success: false,
            data: undefined as unknown as TwitterCxReportDto,
            message: 'snapshot_still_building',
          } as ApiResponse<TwitterCxReportDto>);
        }
        return this.waitForTwitterCxReportSnapshot(snapshotId, attempt + 1);
      }),
      catchError(() =>
        of({
          success: false,
          data: undefined as unknown as TwitterCxReportDto,
          message: 'snapshot_poll_failed',
        } as ApiResponse<TwitterCxReportDto>)
      )
    );
  }

  getFeedbackByIds(
    companyId: number | undefined,
    ids: number[],
    options?: { rootCauseId?: number }
  ): Observable<ApiResponse<{ list: any[]; requested: number; returned: number }>> {
    const capped = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))].slice(0, 200);
    let params = new HttpParams().set('ids', capped.join(','));
    if (companyId != null) params = params.set('companyId', String(companyId));
    if (options?.rootCauseId != null) params = params.set('rootCauseId', String(options.rootCauseId));
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<{ list: any[]; requested: number; returned: number }>>(
      `${this.baseUrl}/feedback-by-ids`,
      { params }
    );
  }

  getAnalyticsDrilldown(options: {
    companyId?: number;
    ids?: number[];
    rootCauseId?: number;
    sentiment?: string;
    source?: string;
    journeyStage?: string;
    startDate?: Date;
    endDate?: Date;
    includeIrrelevant?: boolean;
  }): Observable<ApiResponse<{ list: any[]; requested: number; returned: number }>> {
    let params = new HttpParams();
    if (options.companyId != null) params = params.set('companyId', String(options.companyId));
    if (options.ids?.length) {
      const ids = [...new Set(options.ids.filter((id) => Number.isFinite(id) && id > 0))]
        .slice(0, this.drilldownIdLimit);
      if (ids.length) params = params.set('ids', ids.join(','));
    }
    if (options.rootCauseId != null) params = params.set('rootCauseId', String(options.rootCauseId));
    if (options.sentiment) params = params.set('sentiment', options.sentiment);
    if (options.source) params = params.set('source', options.source);
    if (options.journeyStage) params = params.set('journeyStage', options.journeyStage);
    if (options.startDate) params = params.set('startDate', options.startDate.toISOString());
    if (options.endDate) params = params.set('endDate', options.endDate.toISOString());
    if (options.includeIrrelevant) params = params.set('includeIrrelevant', 'true');
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<{ list: any[]; requested: number; returned: number }>>(
      `${this.baseUrl}/drilldown`,
      { params }
    );
  }

  /**
   * Bundled Twitter CX report. Omit startDate/endDate to use the full imported DB span on the server.
   */
  getTwitterCxReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date,
    forceLive: boolean = false
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    let params = new HttpParams();
    if (companyId != null) params = params.set('companyId', String(companyId));
    if (csvImportId != null) params = params.set('csvImportId', String(csvImportId));
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    if (forceLive) params = params.set('forceLive', '1');
    params = this.realtimeParams(params);
    return this.http
      .get<ApiResponse<TwitterCxReportDto | { snapshotPending: boolean; snapshotId: number }>>(
        `${this.baseUrl}/twitter-cx-report`,
        { params, observe: 'response' }
      )
      .pipe(
        switchMap((httpResp: HttpResponse<ApiResponse<any>>) => {
          const body = httpResp.body;
          if (!body) {
            return of({
              success: false,
              message: 'empty_response',
              data: undefined as unknown as TwitterCxReportDto,
            } as ApiResponse<TwitterCxReportDto>);
          }
          if (httpResp.status === 202 && body.data?.snapshotPending && body.data?.snapshotId != null) {
            return this.waitForTwitterCxReportSnapshot(Number(body.data.snapshotId));
          }
          return of(body as ApiResponse<TwitterCxReportDto>);
        }),
        catchError((err: unknown) => {
          const message = err instanceof HttpErrorResponse ? `http_${err.status}` : 'network';
          return of({
            success: false,
            data: undefined as unknown as TwitterCxReportDto,
            message,
          } as ApiResponse<TwitterCxReportDto>);
        })
      );
  }

  getSentimentPatterns(
    companyId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<{ patterns: Array<{ sentiment: string; patterns: string }> }>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<{ patterns: Array<{ sentiment: string; patterns: string }> }>>(
      `${this.baseUrl}/sentiment/patterns`,
      { params }
    );
  }

  reanalyzeEnrichment(
    companyId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<{ scanned?: number; total: number; succeeded: number; failed: number }>> {
    const body: Record<string, unknown> = {};
    if (companyId != null) body['companyId'] = companyId;
    if (startDate) body['startDate'] = startDate.toISOString();
    if (endDate) body['endDate'] = endDate.toISOString();
    return this.http.post<ApiResponse<{ total: number; succeeded: number; failed: number }>>(
      `${this.baseUrl}/enrichment/reanalyze`,
      body
    );
  }

  getFeedbackWithSentiment(
    companyId?: number,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 50,
    filters?: {
      journeyStage?: string;
      sentiment?: string;
      isRelevant?: boolean;
      includeIrrelevant?: boolean;
      search?: string;
    }
  ): Observable<
    ApiResponse<{
      list: Array<{
        id: number;
        content: string;
        referenceContent?: string;
        source: string;
        date: string;
        author?: string;
        sentiment: string;
        score: number;
        journeyStage?: string;
        isRelevant?: boolean;
        relevanceReason?: string;
        contentSummary?: string;
      }>;
      total: number;
    }>
  > {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (companyId) params = params.set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    if (filters?.journeyStage) params = params.set('journeyStage', filters.journeyStage);
    if (filters?.sentiment) params = params.set('sentiment', filters.sentiment);
    if (filters?.isRelevant === true) params = params.set('isRelevant', 'true');
    if (filters?.isRelevant === false) params = params.set('isRelevant', 'false');
    if (filters?.includeIrrelevant) params = params.set('includeIrrelevant', 'true');
    if (filters?.search) params = params.set('search', filters.search);
    params = this.realtimeParams(params);
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
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<RootCauseAnalysis[]>>(`${this.baseUrl}/root-cause`, { params });
  }

  relinkRootCause(rootCauseId: number, companyId: number): Observable<ApiResponse<RootCauseAnalysis>> {
    return this.http.post<ApiResponse<RootCauseAnalysis>>(`${this.baseUrl}/root-cause/relink/${rootCauseId}`, {
      companyId,
    });
  }

  // NPS Analysis - matches backend /api/analysis/nps
  analyzeNPS(companyId?: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    const body: any = {};
    if (companyId != null) body.companyId = companyId;
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/nps`, body);
  }

  getNPSTrends(companyId: number, period: 'day' | 'week' | 'month' = 'month'): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('period', period);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/nps`, { params: this.realtimeParams(params) });
  }

  // Competitor Analysis - matches backend /api/analysis/competitor
  getCompetitorAnalysis(companyId: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    params = this.realtimeParams(params);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params }).pipe(
      retry({
        count: 1,
        delay: (err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 504 || status === 503) {
            return timer(2500);
          }
          return throwError(() => err);
        },
      })
    );
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

  getOllamaStatus(): Observable<ApiResponse<{ enabled: boolean; reachable: boolean; model: string }>> {
    return this.http.get<ApiResponse<{ enabled: boolean; reachable: boolean; model: string }>>(
      `${this.baseUrl}/ollama-status`,
      { params: this.realtimeParams() }
    );
  }
}
