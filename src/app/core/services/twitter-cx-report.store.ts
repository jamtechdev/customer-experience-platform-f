import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { finalize, map, shareReplay } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { ApiResponse, TwitterCxReportDto } from '../models';

/** Coalesces concurrent Twitter CX report loads (same company + optional import). */
@Injectable({ providedIn: 'root' })
export class TwitterCxReportStore {
  private readonly analysis = inject(AnalysisService);
  private readonly inflight = new Map<string, Observable<ApiResponse<TwitterCxReportDto>>>();
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
    return undefined;
  }

  loadTwitterCxReport(
    companyId: number | undefined,
    csvImportId?: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<TwitterCxReportDto>> {
    const key = this.cacheKey(companyId, csvImportId, startDate, endDate);
    let obs = this.inflight.get(key);
    if (!obs) {
      const generationAtStart = this.generation;
      obs = this.analysis.getTwitterCxReport(companyId, csvImportId, startDate, endDate).pipe(
        map((res) =>
          generationAtStart === this.generation
            ? res
            : ({
                success: false,
                message: 'stale_response',
                data: undefined as unknown as TwitterCxReportDto,
              } as ApiResponse<TwitterCxReportDto>)
        ),
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
      this.refreshSubject.next(undefined);
      return;
    }
    const prefix = `${companyId ?? ''}|`;
    for (const k of [...this.inflight.keys()]) {
      if (k.startsWith(prefix) || (csvImportId != null && k.includes(`|${csvImportId}|`))) {
        this.inflight.delete(k);
      }
    }
    this.refreshSubject.next(companyId);
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
