import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalysisService } from '../../services/analysis.service';
import { AuthService } from '../../services/auth.service';
import { TwitterCxReportStore } from '../../services/twitter-cx-report.store';
import { TranslationService } from '../../services/translation.service';
import { resolveAppCompanyId } from '../../utils/company-scope';

type SnapshotStatus = 'none' | 'pending' | 'ready' | 'failed';

@Component({
  selector: 'app-cx-report-rebuild-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './cx-report-rebuild-panel.html',
  styleUrl: './cx-report-rebuild-panel.css',
})
export class CxReportRebuildPanel implements OnInit, OnDestroy {
  private readonly analysis = inject(AnalysisService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(TwitterCxReportStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translationService = inject(TranslationService);

  /** Smaller layout for toolbars. */
  @Input() compact = false;

  readonly t = (key: string): string => this.translationService.translate(key);

  status = signal<SnapshotStatus>('none');
  rebuilding = signal(false);
  errorMessage = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollAttempts = 0;
  private readonly maxPollAttempts = 120;

  ngOnInit(): void {
    this.refreshStatus();
  }

  ngOnDestroy(): void {
    this.stopPoll();
  }

  private companyId(): number {
    return resolveAppCompanyId(this.auth.currentUser());
  }

  statusLabel(): string {
    switch (this.status()) {
      case 'pending':
        return this.t('csv.rebuildReportRunning');
      case 'ready':
        return this.t('csv.rebuildReportReady');
      case 'failed':
        return this.t('csv.rebuildReportFailed');
      default:
        return this.t('csv.rebuildReportNone');
    }
  }

  statusChipColor(): 'primary' | 'accent' | 'warn' | undefined {
    switch (this.status()) {
      case 'ready':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'failed':
        return 'warn';
      default:
        return undefined;
    }
  }

  refreshStatus(): void {
    this.analysis.getTwitterCxCompanySnapshotStatus(this.companyId()).subscribe({
      next: (res) => {
        if (!res.success || !res.data) return;
        this.status.set(res.data.status);
        this.errorMessage.set(res.data.errorMessage ?? null);
        if (res.data.status === 'pending') {
          this.rebuilding.set(true);
          this.startPoll();
        }
      },
    });
  }

  rebuildReport(): void {
    if (this.rebuilding()) return;
    const companyId = this.companyId();
    this.rebuilding.set(true);
    this.status.set('pending');
    this.errorMessage.set(null);
    this.analysis.rebuildTwitterCxReport(companyId).subscribe({
      next: () => {
        this.snackBar.open(this.t('csv.rebuildReportStarted'), this.t('app.close'), { duration: 6000 });
        this.pollAttempts = 0;
        this.startPoll();
      },
      error: () => {
        this.rebuilding.set(false);
        this.status.set('failed');
        this.snackBar.open(this.t('csv.rebuildReportStartFailed'), this.t('app.close'), { duration: 6000 });
      },
    });
  }

  private startPoll(): void {
    this.stopPoll();
    this.pollTimer = setInterval(() => {
      this.pollAttempts += 1;
      if (this.pollAttempts > this.maxPollAttempts) {
        this.rebuilding.set(false);
        this.stopPoll();
        this.snackBar.open(this.t('csv.rebuildReportTimeout'), this.t('app.close'), { duration: 7000 });
        return;
      }
      this.analysis.getTwitterCxCompanySnapshotStatus(this.companyId()).subscribe({
        next: (res) => {
          if (!res.success || !res.data) return;
          this.status.set(res.data.status);
          this.errorMessage.set(res.data.errorMessage ?? null);
          if (res.data.status === 'ready') {
            this.rebuilding.set(false);
            this.stopPoll();
            this.store.invalidate(this.companyId());
            this.snackBar.open(this.t('csv.rebuildReportDone'), this.t('app.close'), { duration: 7000 });
          } else if (res.data.status === 'failed') {
            this.rebuilding.set(false);
            this.stopPoll();
            this.snackBar.open(
              res.data.errorMessage || this.t('csv.rebuildReportFailed'),
              this.t('app.close'),
              { duration: 7000 }
            );
          }
        },
      });
    }, 3000);
  }

  private stopPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
