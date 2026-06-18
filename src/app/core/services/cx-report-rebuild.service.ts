import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, interval, switchMap, take, takeUntil } from 'rxjs';
import { AnalysisService } from './analysis.service';
import { AuthService } from './auth.service';
import { TwitterCxReportStore } from './twitter-cx-report.store';
import { TranslationService } from './translation.service';

type SnapshotStatus = 'none' | 'pending' | 'ready' | 'failed';

@Injectable({ providedIn: 'root' })
export class CxReportRebuildService {
  private readonly analysis = inject(AnalysisService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(TwitterCxReportStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translationService = inject(TranslationService);

  private pollStop$ = new Subject<void>();

  private t(key: string): string {
    return this.translationService.translate(key);
  }

  private companyId(): number {
    const user = this.auth.currentUser();
    return user?.role === 'admin' ? 1 : (user?.settings?.companyId ?? 1);
  }

  rebuildWithPolling(): Observable<SnapshotStatus> {
    const companyId = this.companyId();
    const done$ = new Subject<SnapshotStatus>();
    this.pollStop$.next();

    this.analysis.rebuildTwitterCxReport(companyId).subscribe({
      next: () => {
        this.snackBar.open(this.t('csv.rebuildReportStarted'), this.t('app.close'), { duration: 6000 });
        interval(3000)
          .pipe(
            take(120),
            takeUntil(this.pollStop$),
            switchMap(() => this.analysis.getTwitterCxCompanySnapshotStatus(companyId))
          )
          .subscribe({
            next: (res) => {
              if (!res.success || !res.data) return;
              const status = res.data.status;
              if (status === 'ready') {
                this.store.invalidate(companyId);
                this.snackBar.open(this.t('csv.rebuildReportDone'), this.t('app.close'), { duration: 7000 });
                this.pollStop$.next();
                done$.next('ready');
                done$.complete();
              } else if (status === 'failed') {
                this.snackBar.open(
                  res.data.errorMessage || this.t('csv.rebuildReportFailed'),
                  this.t('app.close'),
                  { duration: 7000 }
                );
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
      },
      error: () => {
        this.snackBar.open(this.t('csv.rebuildReportStartFailed'), this.t('app.close'), { duration: 6000 });
        done$.next('failed');
        done$.complete();
      },
    });

    return done$.asObservable();
  }

  stopPolling(): void {
    this.pollStop$.next();
  }
}
