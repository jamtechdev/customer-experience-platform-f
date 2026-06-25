import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-methodology',
  imports: [
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './methodology.html',
  styleUrl: './methodology.css',
})
export class Methodology implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);
  private translationService = inject(TranslationService);
  private refreshSub?: Subscription;

  loading = signal(false);
  bullets = signal<string[]>([]);
  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  ngOnInit(): void {
    this.loadMethodology();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadMethodology());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadMethodology(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    const forceLive = this.importProcessing.isActive();
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, forceLive).subscribe({
      next: (res) => {
        if (res.message === 'stale_response') {
          this.loading.set(false);
          return;
        }
        if (!res.success) {
          this.bullets.set([]);
          notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), this.t('app.close'));
        } else {
          this.bullets.set(res.data?.scopeAndMethodBullets ? res.data.scopeAndMethodBullets : []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.bullets.set([]);
        this.loading.set(false);
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), this.t('app.close'));
      },
    });
  }
}
