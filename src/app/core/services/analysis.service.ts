import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of, timer, defer, EMPTY, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, timeout, expand, mergeMap, delay, retry } from 'rxjs/operators';
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
  /** Client wait for bundled Twitter CX report (align above typical gateway limits where possible). */
  private readonly twitterCxReportTimeoutMs = 300_000;

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

  getTwitterCxCompanySnapshotStatus(companyId: number): Observable<
    ApiResponse<{
      status: 'none' | 'pending' | 'ready' | 'failed';
      snapshotId?: number;
      errorMessage?: string | null;
    }>
  > {
    const params = new HttpParams().set('companyId', String(companyId));
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
    const params = new HttpParams().set('snapshotId', String(snapshotId));
    return this.http.get<
      ApiResponse<{
        status: 'pending' | 'ready' | 'failed';
        errorMessage?: string | null;
        report?: TwitterCxReportDto;
      }>
    >(`${this.baseUrl}/twitter-cx-report/snapshot-status`, { params });
  }

  getFeedbackByIds(
    companyId: number | undefined,
    ids: number[]
  ): Observable<ApiResponse<{ list: any[]; requested: number; returned: number }>> {
    const capped = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))].slice(0, 200);
    let params = new HttpParams().set('ids', capped.join(','));
    if (companyId != null) params = params.set('companyId', String(companyId));
    return this.http.get<ApiResponse<{ list: any[]; requested: number; returned: number }>>(
      `${this.baseUrl}/feedback-by-ids`,
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
    endDate?: Date
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    let params = new HttpParams();
    if (companyId != null) params = params.set('companyId', String(companyId));
    if (csvImportId != null) params = params.set('csvImportId', String(csvImportId));
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
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
            const sid = Number(body.data.snapshotId);
            // Exponential back-off: 2s → 4s → 6s → 8s → capped at 10s per poll.
            // This avoids hammering the server while a long Ollama build runs.
            const INTERVALS = [2000, 4000, 6000, 8000];
            const getDelay = (attempt: number) => INTERVALS[Math.min(attempt, INTERVALS.length - 1)];
            let attempt = 0;

            const poll$ = defer(() => this.getTwitterCxReportSnapshotStatus(sid)).pipe(
              expand((st) => {
                if (st?.data?.status === 'ready' || st?.data?.status === 'failed') {
                  return EMPTY;
                }
                const wait = getDelay(attempt++);
                return timer(wait).pipe(mergeMap(() => this.getTwitterCxReportSnapshotStatus(sid)));
              }),
              filter((st) => !!st?.data && (st.data.status === 'ready' || st.data.status === 'failed')),
              take(1)
            );

            return timer(2000).pipe(
              switchMap(() => poll$),
              switchMap((st) => {
                if (!st.success || st.data?.status !== 'ready' || !st.data?.report) {
                  const errMsg = st.data?.errorMessage || 'snapshot_failed';
                  return of({
                    success: false,
                    message: errMsg,
                    data: undefined as unknown as TwitterCxReportDto,
                  } as ApiResponse<TwitterCxReportDto>);
                }
                return of({
                  success: true,
                  code: 200,
                  message: 'Twitter CX report (snapshot)',
                  data: st.data.report as TwitterCxReportDto,
                } as ApiResponse<TwitterCxReportDto>);
              }),
              timeout(this.twitterCxReportTimeoutMs),
              catchError((err: unknown) => {
                const isTimeout =
                  err &&
                  typeof err === 'object' &&
                  'name' in err &&
                  (err as { name?: string }).name === 'TimeoutError';
                return of({
                  success: false,
                  message: isTimeout ? 'timeout' : 'snapshot_poll_failed',
                  data: undefined as unknown as TwitterCxReportDto,
                } as ApiResponse<TwitterCxReportDto>);
              })
            );
          }
          return of(body as ApiResponse<TwitterCxReportDto>);
        }),
        timeout(this.twitterCxReportTimeoutMs + 5000),
        catchError((err: unknown) => {
          let message = 'network';
          if (err instanceof HttpErrorResponse) {
            message = `http_${err.status}`;
          } else if (
            err &&
            typeof err === 'object' &&
            'name' in err &&
            (err as { name?: string }).name === 'TimeoutError'
          ) {
            message = 'timeout';
          }
          return of({
            success: false,
            data: undefined as unknown as TwitterCxReportDto,
            message,
          } as ApiResponse<TwitterCxReportDto>);
        })
      );
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
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/nps`, { params });
  }

  // Competitor Analysis - matches backend /api/analysis/competitor
  getCompetitorAnalysis(companyId: number, startDate?: Date, endDate?: Date): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/competitor`, { params }).pipe(
      timeout(120_000),
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
      `${this.baseUrl}/ollama-status`
    );
  }
}
