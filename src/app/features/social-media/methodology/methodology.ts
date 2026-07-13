import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { TranslationService } from '../../../core/services/translation.service';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { TwitterCxReportDto } from '../../../core/models';

@Component({
  selector: 'app-methodology',
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    OllamaLoader,
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
  reportSubtitle = signal('');
  scopeBullets = signal<string[]>([]);
  section4Intro = signal('');
  section4Bullets = signal<string[]>([]);
  executiveBullets = signal<string[]>([]);
  managementTakeaways = signal<string[]>([]);
  npsInterpretation = signal('');
  socialNpsProxy = signal(0);
  datasetTotal = signal(0);
  primaryCohort = signal(0);
  importedCsvRows = signal<number | null>(null);
  cohortTagsUsed = signal(false);

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  hasContent = computed(
    () =>
      this.scopeBullets().length > 0 ||
      this.section4Bullets().length > 0 ||
      this.executiveBullets().length > 0 ||
      this.managementTakeaways().length > 0 ||
      !!this.npsInterpretation()
  );

  scopeLine = computed(() => {
    const csv = this.importedCsvRows();
    const saved = this.datasetTotal();
    const cohort = this.primaryCohort();
    if (!saved && !cohort) return '';
    return this.t('datasetProfile.scopeLine', {
      csv: csv ? csv.toLocaleString() : '—',
      saved: saved ? saved.toLocaleString() : '—',
      cohort: cohort ? cohort.toLocaleString() : '—',
    });
  });

  ngOnInit(): void {
    this.loadMethodology(false);
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadMethodology(false));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadMethodology(refreshFromServer = false): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (refreshFromServer) {
      this.twitterCxReportStore.clearCachedReport(companyId);
    }
    this.loading.set(true);

    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, refreshFromServer).subscribe({
      next: (res) => {
        if (res.message === 'stale_response') {
          return;
        }
        if (!res.success) {
          this.clearReport();
          notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), this.t('app.close'));
        } else if (res.data) {
          this.applyReport(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.clearReport();
        this.loading.set(false);
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), this.t('app.close'));
      },
    });
  }

  private reportHasScope(data?: TwitterCxReportDto | null): boolean {
    if (!data) return false;
    return (
      (data.scopeAndMethodBullets?.length ?? 0) > 0 ||
      (data.section4Bullets?.length ?? 0) > 0 ||
      (data.executiveSummaryBullets?.length ?? 0) > 0
    );
  }

  private applyReport(data: TwitterCxReportDto): void {
    this.reportSubtitle.set(data.reportSubtitle || '');
    this.scopeBullets.set(data.scopeAndMethodBullets ?? []);
    this.section4Intro.set(data.section4Intro || '');
    this.section4Bullets.set(data.section4Bullets ?? []);
    this.executiveBullets.set(data.executiveSummaryBullets ?? []);
    this.managementTakeaways.set(data.managementTakeaways ?? []);
    this.npsInterpretation.set(data.npsInterpretation || '');
    this.socialNpsProxy.set(Number(data.socialNpsProxy ?? 0));
    this.datasetTotal.set(Number(data.dataset?.total ?? 0));
    this.primaryCohort.set(Number(data.dataset?.primaryCohortSize ?? data.sentiment?.total ?? 0));
    this.importedCsvRows.set(Number(data.dataset?.importedCsvRows ?? 0) || null);
    this.cohortTagsUsed.set(!!data.cohortTagsUsed);
  }

  private clearReport(): void {
    this.reportSubtitle.set('');
    this.scopeBullets.set([]);
    this.section4Intro.set('');
    this.section4Bullets.set([]);
    this.executiveBullets.set([]);
    this.managementTakeaways.set([]);
    this.npsInterpretation.set('');
    this.socialNpsProxy.set(0);
    this.datasetTotal.set(0);
    this.primaryCohort.set(0);
    this.importedCsvRows.set(null);
    this.cohortTagsUsed.set(false);
  }
}
