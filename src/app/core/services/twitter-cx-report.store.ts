import { Injectable, inject } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { ImportProcessingService } from './import-processing.service';
import { ApiResponse, TwitterCxReportDto } from '../models';
import { emptyTwitterCxReportDto } from '../utils/twitter-cx-report-load';

/** Coalesces concurrent Twitter CX report loads (same company + optional import). */
@Injectable({ providedIn: 'root' })
export class TwitterCxReportStore {
  private readonly analysis = inject(AnalysisService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly inflight = new Map<string, Observable<ApiResponse<TwitterCxReportDto>>>();
  private readonly cache = new Map<string, ApiResponse<TwitterCxReportDto>>();
  /** Survives cache clears while import is running so other menus keep working. */
  private readonly lastGoodByCompany = new Map<string, ApiResponse<TwitterCxReportDto>>();
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

    const importBusy = this.importProcessing.isActive();
    const lastGood = importBusy && !forceLive ? this.findLastGood(companyId, key) : undefined;

    let obs = this.inflight.get(key);
    if (!obs) {
      const generationAtStart = this.generation;
      obs = this.analysis.getTwitterCxReport(companyId, csvImportId, startDate, endDate, forceLive).pipe(
        map((res) => {
          if (generationAtStart !== this.generation) {
            return {
              success: false,
              message: 'stale_response',
              data: undefined as unknown as TwitterCxReportDto,
            } as ApiResponse<TwitterCxReportDto>;
          }
          if (res.success) return res;
          return this.coerceImportProcessingResponse(res, companyId, key);
        }),
        tap((res) => {
          if (!forceLive && res.success && res.data) {
            this.cache.set(key, res);
            this.rememberLastGood(companyId, res);
            if (importBusy && res.message !== 'import_processing') {
              this.refreshSubject.next(companyId);
            }
          }
        }),
        finalize(() => this.inflight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.inflight.set(key, obs);
    }

    if (lastGood) {
      return new Observable((subscriber) => {
        subscriber.next(lastGood);
        const sub = obs.subscribe({
          next: (fresh) => {
            if (fresh.success && fresh.data && fresh.message !== 'stale_response') {
              subscriber.next(fresh);
            }
          },
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      });
    }

    return obs;
  }

  invalidate(companyId?: number, csvImportId?: number): void {
    this.generation++;
    const importBusy = this.importProcessing.isActive();

    if (companyId == null && csvImportId == null) {
      for (const k of [...this.inflight.keys()]) this.inflight.delete(k);
      if (!importBusy) {
        this.cache.clear();
        this.lastGoodByCompany.clear();
      }
      if (!importBusy) this.refreshSubject.next(undefined);
      return;
    }

    const prefix = `${companyId ?? ''}|`;
    for (const k of [...this.inflight.keys()]) {
      if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
        this.inflight.delete(k);
      }
    }

    if (!importBusy) {
      for (const k of [...this.cache.keys()]) {
        if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
          this.cache.delete(k);
        }
      }
      if (companyId != null) this.lastGoodByCompany.delete(String(companyId));
      this.refreshSubject.next(companyId);
    }
  }

  private findLastGood(
    companyId: number | undefined,
    key: string
  ): ApiResponse<TwitterCxReportDto> | undefined {
    const cached = this.cache.get(key);
    if (cached?.success && cached.data) return cached;

    const stored = this.lastGoodByCompany.get(String(companyId ?? ''));
    if (stored?.success && stored.data) return stored;

    for (const [k, v] of this.cache.entries()) {
      if (k.startsWith(`${companyId ?? ''}|`) && v.success && v.data) return v;
    }
    return undefined;
  }

  private coerceImportProcessingResponse(
    res: ApiResponse<TwitterCxReportDto>,
    companyId: number | undefined,
    key: string
  ): ApiResponse<TwitterCxReportDto> {
    if (!this.importProcessing.isActive()) return res;

    const fallback = this.findLastGood(companyId, key);
    if (fallback) return fallback;

    return {
      success: true,
      message: 'import_processing',
      data: emptyTwitterCxReportDto(),
    };
  }

  private rememberLastGood(companyId: number | undefined, res: ApiResponse<TwitterCxReportDto>): void {
    if (!res.success || !res.data) return;
    if ((res.data.actionPlan?.length ?? 0) > 0 || (res.data.rootCauses?.length ?? 0) > 0) {
      this.lastGoodByCompany.set(String(companyId ?? ''), res);
    }
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
