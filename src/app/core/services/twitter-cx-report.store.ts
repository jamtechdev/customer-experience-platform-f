import { Injectable, inject } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { ApiResponse, TwitterCxReportDto } from '../models';

/** Coalesces concurrent Twitter CX report loads (same company + optional import). */
@Injectable({ providedIn: 'root' })
export class TwitterCxReportStore {
  private readonly analysis = inject(AnalysisService);
  private readonly inflight = new Map<string, Observable<ApiResponse<TwitterCxReportDto>>>();
  private readonly cache = new Map<string, ApiResponse<TwitterCxReportDto>>();
  private readonly refreshSubject = new Subject<number | undefined>();
  private generation = 0;

  /** Emits companyId when snapshot cache was cleared (e.g. after CSV import). */
  readonly onRefresh$ = this.refreshSubject.asObservable();

  getCachedReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): ApiResponse<TwitterCxReportDto> | undefined {
    return this.cache.get(this.cacheKey(companyId, csvImportId, startDate, endDate, false));
  }

  clearCachedReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): void {
    const key = this.cacheKey(companyId, csvImportId, startDate, endDate, false);
    this.cache.delete(key);
    this.inflight.delete(key);
  }

  loadTwitterCxReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date,
    forceLive: boolean = false
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    const key = this.cacheKey(companyId, csvImportId, startDate, endDate, forceLive);
    const cached = !forceLive ? this.cache.get(key) : undefined;
    if (cached) return of(cached);

    let obs = this.inflight.get(key);
    if (!obs) {
      const generationAtStart = this.generation;
      obs = this.analysis.getTwitterCxReport(companyId, csvImportId, startDate, endDate, forceLive).pipe(
        map((res) =>
          generationAtStart === this.generation
            ? res
            : ({
                success: false,
                message: 'stale_response',
                data: undefined as unknown as TwitterCxReportDto,
              } as ApiResponse<TwitterCxReportDto>)
        ),
        tap((res) => {
          if (!forceLive && res.success && res.data) {
            this.cache.set(key, res);
          }
        }),
        finalize(() => this.inflight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.inflight.set(key, obs);
    }
    return obs;
  }

  invalidate(companyId?: number, csvImportId?: number): void {
    this.generation++;
    if (companyId == null && csvImportId == null) {
      this.inflight.clear();
      this.cache.clear();
      this.refreshSubject.next(undefined);
      return;
    }
    const prefix = `${companyId ?? ''}|`;
    for (const k of [...this.inflight.keys()]) {
      if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
        this.inflight.delete(k);
      }
    }
    for (const k of [...this.cache.keys()]) {
      if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
        this.cache.delete(k);
      }
    }
    this.refreshSubject.next(companyId);
  }

  private cacheKey(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date,
    forceLive: boolean = false
  ): string {
    return [
      companyId ?? '',
      csvImportId ?? '',
      startDate?.toISOString() ?? '',
      endDate?.toISOString() ?? '',
      forceLive ? 'live' : 'snapshot',
    ].join('|');
  }
}
