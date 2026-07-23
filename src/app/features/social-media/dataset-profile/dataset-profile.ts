import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { drilldownModalTotal } from '../../../core/utils/drilldown-display';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { TranslationService } from '../../../core/services/translation.service';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';

interface DatasetProfileRow {
  metric: string;
  value: string;
  comment: string;
  feedbackIds?: number[];
}

const BANNER_METRICS = new Set([
  'CSV file rows (latest import)',
  'Rows saved in database',
]);

@Component({
  selector: 'app-dataset-profile',
  standalone: true,
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    OllamaLoader,
    RelatedFeedbackModal,
  ],
  templateUrl: './dataset-profile.html',
  styleUrl: './dataset-profile.css',
})
export class DatasetProfile implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);
  private translationService = inject(TranslationService);
  private refreshSub?: Subscription;

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);
  loading = signal(false);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];

  rows = signal<DatasetProfileRow[]>([]);
  importedCsvRows = signal<number | null>(null);
  rowsSaved = signal<number | null>(null);
  cohortTotal = signal<number | null>(null);

  displayRows = computed(() =>
    this.rows().filter((row) => !BANNER_METRICS.has(row.metric) && row.metric !== 'Date span')
  );

  dateSpanRow = computed(() => this.rows().find((r) => r.metric === 'Date span') ?? null);

  scopeBannerText = computed(() => {
    const csv = this.importedCsvRows();
    const saved = this.rowsSaved();
    const cohort = this.cohortTotal();
    if (!saved && !cohort) return '';
    return this.t('datasetProfile.scopeLine', {
      csv: csv ? csv.toLocaleString() : '—',
      saved: saved ? saved.toLocaleString() : '—',
      cohort: cohort ? cohort.toLocaleString() : '—',
    });
  });

  ngOnInit(): void {
    this.loadProfile();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadProfile());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadProfile(): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.loading.set(true);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, false).subscribe({
      next: (res) => {
        if (res.message === 'stale_response') {
          return;
        }
        if (!res.success) {
          this.rows.set([]);
          notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), this.t('app.close'));
        } else {
          this.applyProfile(res);
        }
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), this.t('app.close'));
      },
    });
  }

  private applyProfile(res: { success?: boolean; data?: any }): void {
    if (!res.success || !res.data) return;
    this.rows.set(Array.isArray(res.data.datasetProfileRows) ? res.data.datasetProfileRows : []);
    this.importedCsvRows.set(Number(res.data?.dataset?.importedCsvRows ?? 0) || null);
    this.rowsSaved.set(Number(res.data?.dataset?.total ?? 0) || null);
    this.cohortTotal.set(
      Number(res.data?.sentiment?.total ?? res.data?.dataset?.primaryCohortSize ?? 0) || null
    );
  }

  metricIcon(metric: string): string {
    const m = metric.toLowerCase();
    if (m.includes('total')) return 'dataset';
    if (m.includes('cx-related') || m.includes('original')) return 'forum';
    if (m.includes('brand')) return 'support_agent';
    return 'analytics';
  }

  isCountRow(row: DatasetProfileRow): boolean {
    return /^\d+$/.test(String(row.value || '').trim()) && Number(row.value) > 0;
  }

  openProfileDrilldown(row: DatasetProfileRow): void {
    if (!this.isCountRow(row)) return;
    const ids = row.feedbackIds?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    if (!ids.length) return;
    this.drilldownTitle.set(row.metric);
    this.drilldownOpen.set(true);
    this.drilldownIds = [...new Set(ids)];
    this.drilldownTotal.set(drilldownModalTotal(this.drilldownIds));
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    const user = this.authService.currentUser();
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: true,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
        this.drilldownTotal.set(res?.data?.total ?? drilldownModalTotal(this.drilldownIds));
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
        this.drilldownTotal.set(0);
      },
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
  }
}
