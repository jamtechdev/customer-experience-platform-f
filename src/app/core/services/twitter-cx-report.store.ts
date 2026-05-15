import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { ApiResponse, TwitterCxReportDto } from '../models';

/** Coalesces concurrent Twitter CX report loads (same company + optional import). */
@Injectable({ providedIn: 'root' })
export class TwitterCxReportStore {
  private readonly analysis = inject(AnalysisService);
  private readonly inflight = new Map<string, Observable<ApiResponse<TwitterCxReportDto>>>();
  private readonly cache = new Map<string, ApiResponse<TwitterCxReportDto>>();

  getCachedReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): ApiResponse<TwitterCxReportDto> | undefined {
    return this.cache.get(this.cacheKey(companyId, csvImportId, startDate, endDate));
  }

  loadTwitterCxReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    const key = this.cacheKey(companyId, csvImportId, startDate, endDate);
    const cached = this.cache.get(key);
    if (cached?.success && cached.data) {
      return of(cached);
    }
    let obs = this.inflight.get(key);
    if (!obs) {
      obs = this.analysis.getTwitterCxReport(companyId, csvImportId, startDate, endDate).pipe(
        tap((res) => {
          if (res.success && res.data) {
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
    if (companyId == null && csvImportId == null) {
      this.cache.clear();
      this.inflight.clear();
      return;
    }
    const prefix = `${companyId ?? ''}|`;
    for (const k of [...this.cache.keys(), ...this.inflight.keys()]) {
      if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
        this.cache.delete(k);
        this.inflight.delete(k);
      }
    }
  }

  private cacheKey(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): string {
    return [companyId ?? '', csvImportId ?? '', startDate?.toISOString() ?? '', endDate?.toISOString() ?? ''].join('|');
  }
}
