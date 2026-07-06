import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, interval, switchMap, take, takeUntil } from 'rxjs';
import { AnalysisService } from './analysis.service';
import { AuthService } from './auth.service';
import { TwitterCxReportStore } from './twitter-cx-report.store';
import { TranslationService } from './translation.service';
import { CSVService } from './csv.service';
import { ImportProcessingService } from './import-processing.service';
import { CxAnalysisProgressService } from './cx-analysis-progress.service';
import { resolveAppCompanyId } from '../utils/company-scope';

type SnapshotStatus = 'none' | 'pending' | 'ready' | 'failed';

@Injectable({ providedIn: 'root' })
export class CxReportRebuildService {
  private readonly analysis = inject(AnalysisService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(TwitterCxReportStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translationService = inject(TranslationService);
  private readonly csvService = inject(CSVService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly cxProgress = inject(CxAnalysisProgressService);

  private pollStop$ = new Subject<void>();

  private t(key: string): string {
    return this.translationService.translate(key);
  }

  private companyId(): number {
    return resolveAppCompanyId(this.auth.currentUser());
  }

  /** Rebuild CX report snapshot only (fast DB refresh). */
  rebuildWithPolling(): Observable<SnapshotStatus> {
    const companyId = this.companyId();
    const done$ = new Subject<SnapshotStatus>();
    this.pollStop$.next();

    this.analysis.rebuildTwitterCxReport(companyId).subscribe({
      next: () => {
        this.cxProgress.notifyReportLoadPending(true);
        this.snackBar.open(this.t('csv.rebuildReportStarted'), this.t('app.close'), { duration: 6000 });
        this.pollUntilReady(companyId, done$, 'csv.rebuildReportDone', 'csv.rebuildReportFailed');
      },
      error: () => {
        this.snackBar.open(this.t('csv.rebuildReportStartFailed'), this.t('app.close'), { duration: 6000 });
        done$.next('failed');
        done$.complete();
      },
    });

    return done$.asObservable();
  }

  /**
   * Full pipeline: re-run AI enrichment + root causes + CX snapshot for every analytics tab.
   */
  rebuildAllAnalyticsWithPolling(): Observable<SnapshotStatus> {
    const companyId = this.companyId();
    const done$ = new Subject<SnapshotStatus>();
    this.pollStop$.next();

    this.analysis.rebuildAllAnalytics(companyId).subscribe({
      next: () => {
        this.importProcessing.markProcessing();
        this.cxProgress.notifyReportLoadPending(true);
        this.snackBar.open(this.t('csv.rebuildAllStarted'), this.t('app.close'), { duration: 8000 });
        this.pollUntilReady(companyId, done$, 'csv.rebuildAllDone', 'csv.rebuildAllFailed', 180);
      },
      error: () => {
        this.snackBar.open(this.t('csv.rebuildAllStartFailed'), this.t('app.close'), { duration: 6000 });
        done$.next('failed');
        done$.complete();
      },
    });

    return done$.asObservable();
  }

  /** Re-import latest completed CSV from saved file using current validation rules. */
  reprocessLatestImport(importId: number): Observable<boolean> {
    const done$ = new Subject<boolean>();
    this.importProcessing.markProcessing();
    this.csvService.reprocessImport(importId).subscribe({
      next: () => {
        this.snackBar.open(this.t('csv.reprocessStarted'), this.t('app.close'), { duration: 8000 });
        done$.next(true);
        done$.complete();
      },
      error: () => {
        this.importProcessing.markIdle();
        this.snackBar.open(this.t('csv.reprocessStartFailed'), this.t('app.close'), { duration: 6000 });
        done$.next(false);
        done$.complete();
      },
    });
    return done$.asObservable();
  }

  private pollUntilReady(
    companyId: number,
    done$: Subject<SnapshotStatus>,
    doneKey: string,
    failedKey: string,
    maxPolls = 120
  ): void {
    interval(3000)
      .pipe(
        take(maxPolls),
        takeUntil(this.pollStop$),
        switchMap(() => this.analysis.getTwitterCxCompanySnapshotStatus(companyId))
      )
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) return;
          const status = res.data.status;
          if (status === 'ready') {
            this.store.invalidate(companyId);
            this.cxProgress.notifyReportLoadPending(false);
            this.snackBar.open(this.t(doneKey), this.t('app.close'), { duration: 7000 });
            this.pollStop$.next();
            done$.next('ready');
            done$.complete();
          } else if (status === 'failed') {
            this.snackBar.open(res.data.errorMessage || this.t(failedKey), this.t('app.close'), { duration: 7000 });
            this.pollStop$.next();
            done$.next('failed');
            done$.complete();
          }
        },
        error: () => {
          this.pollStop$.next();
          done$.next('failed');
          done$.complete();
        },
        complete: () => {
          if (!done$.closed) {
            this.snackBar.open(this.t('csv.rebuildReportTimeout'), this.t('app.close'), { duration: 7000 });
            done$.next('failed');
            done$.complete();
          }
        },
      });
  }

  stopPolling(): void {
    this.pollStop$.next();
  }
}
