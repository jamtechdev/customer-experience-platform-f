import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  resolveOptionalApiDateRange,
  datesValidYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { formatApiDate, normalizeApiDateToIso } from '../../../core/utils/api-date';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { ImportLiveRefreshService } from '../../../core/services/import-live-refresh.service';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { forkJoin, Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { TranslationService } from '../../../core/services/translation.service';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';

interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  averageScore: number;
}

interface SentimentChartBar {
  key: 'positive' | 'neutral' | 'negative';
  label: string;
  count: number;
  percentage: number;
  height: number;
}

interface SentimentReferenceRow {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  patterns: string;
}

@Component({
  selector: 'app-sentiment-analysis',
  imports: [
    PageHeaderCard,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    OllamaLoader,
    RelatedFeedbackModal,
    ReportDateRangeFilter,
  ],
  templateUrl: './sentiment-analysis.html',
  styleUrl: './sentiment-analysis.css',
})
export class SentimentAnalysis implements OnInit, OnDestroy {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private reportService = inject(ReportService);
  private websocket = inject(CXWebSocketService);
  private importProcessing = inject(ImportProcessingService);
  private liveRefresh = inject(ImportLiveRefreshService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private translationService = inject(TranslationService);
  private importStatusSub?: Subscription;
  /** After first successful stats load, never show the full-page loader again this session. */
  private hasCompletedInitialLoad = false;

  /** Full-page loader — shown at most once per session when no cached stats exist. */
  initialLoading = signal(false);
  refreshing = signal(false);
  exportLoading = signal(false);
  tableExportLoading = signal(false);
  reanalyzing = signal(false);
  stats = signal<SentimentStats | null>(null);
  importedCsvRows = signal<number | null>(null);
  savedRows = signal<number | null>(null);
  countMismatch = signal(false);
  sentimentInterpretation = signal<string>('');
  feedbackList = signal<
    Array<{
      id: number;
      content: string;
      referenceContent?: string;
      translatedContent?: string;
      source: string;
      date: string;
      author?: string;
      sentiment: string;
      score: number;
      journeyStage?: string;
      isRelevant?: boolean;
      relevanceReason?: string;
      contentSummary?: string;
    }>
  >([]);
  feedbackTotal = signal(0);
  serverPatterns = signal<SentimentReferenceRow[]>([]);
  filterJourneyStage = signal<string>('');
  filterSentiment = signal<string>('');
  filterIsRelevant = signal<string>('all');
  filterSearch = signal<string>('');
  referenceOpen = signal(false);
  referenceRow = signal<{
    id?: number;
    content: string;
    referenceContent?: string;
    translatedContent?: string;
    contentSummary?: string;
    journeyStage?: string;
    relevanceReason?: string;
    isRelevant?: boolean;
    source?: string;
    date?: string;
    sentiment?: string;
    score?: number;
  } | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownBar: SentimentChartBar | null = null;

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private filtersApplied = signal(false);
  page = signal(1);
  pageSize = signal(20);
  totalPages = computed(() => Math.max(1, Math.ceil(this.feedbackTotal() / this.pageSize())));
  hoveredBar = signal<SentimentChartBar | null>(null);
  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  /** True while CSV/AI sentiment processing or manual re-analysis is running. */
  analyzingFeedback = computed(() => this.reanalyzing() || this.importProcessing.isActive());

  analyzingFeedbackSubtitle = computed(() => {
    if (this.reanalyzing()) {
      return this.t('sentiment.enrichmentInProgress');
    }
    const progress = this.liveRefresh.progress();
    if (progress?.aiTotal && progress.aiTotal > 0) {
      return this.t('sentiment.analyzingFeedbackProgress', {
        done: progress.aiSucceeded ?? 0,
        total: progress.aiTotal,
      });
    }
    return this.t('sentiment.analyzingFeedbackSubtitle');
  });

  displayedColumns: string[] = ['sentiment', 'count', 'percentage', 'bar'];
  patternCols: string[] = ['sentiment', 'patterns'];
  feedbackColumns: string[] = [
    'content',
    'journeyStage',
    'relevant',
    'source',
    'date',
    'sentiment',
    'score',
    'reference',
  ];
  readonly journeyStageOptions = [
    '',
    'Awareness',
    'Consideration',
    'Purchase',
    'Delivery',
    'Usage',
    'Support',
    'Retention',
  ];
  readonly sentimentFilterOptions: Array<{ value: string; labelKey: string }> = [
    { value: '', labelKey: 'sentiment.allSentiments' },
    { value: 'positive', labelKey: 'dashboard.positive' },
    { value: 'neutral', labelKey: 'dashboard.neutral' },
    { value: 'negative', labelKey: 'dashboard.negative' },
  ];

  ngOnInit(): void {
    this.loadPresets();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'processing') {
        this.reloadAll(this.filtersApplied(), false, { live: true });
      }
      if (payload?.status === 'completed') {
        this.reloadAll();
      }
    });
    this.importStatusSub.add(
      this.websocket.onAnalyticsLifecycle().subscribe((event) => {
        if (event.type === 'analysisStarted' || event.type === 'datasetUploaded') {
          this.reloadAll(this.filtersApplied(), false, { live: true });
        }
        if (event.type === 'datasetDeleted' || event.type === 'analysisCompleted') {
          this.reloadAll();
        }
      })
    );
    this.importStatusSub.add(
      this.importProcessing.becameIdle$.subscribe(() => this.reloadAll())
    );
    this.importStatusSub.add(
      this.twitterCxReportStore.onRefresh$.subscribe(() => this.reloadAll(false, false, { live: true }))
    );
    this.importStatusSub.add(
      this.liveRefresh.liveTick$.subscribe(() => this.reloadAll(this.filtersApplied(), false, { live: true }))
    );

    if (this.importProcessing.isActive()) {
      this.reloadAll(this.filtersApplied(), false, { live: true });
    }
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
  }

  private setTodayRange(): void {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    this.selectedPresetId.set('custom');
    this.startDate.set(ymd);
    this.endDate.set(ymd);
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        this.reloadAll(false);
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        this.reloadAll(false);
      },
    });
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.page.set(1);
      this.reloadAll(false);
      return;
    }
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 4000 });
      return;
    }
    this.filtersApplied.set(true);
    this.page.set(1);
    this.reloadAll(true);
  }

  refreshData(): void {
    this.refreshing.set(true);
    this.reloadAll(this.filtersApplied(), true);
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
  }

  reRunAiEnrichment(): void {
    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(this.filtersApplied(), this.startDate(), this.endDate());
    const ok = window.confirm(
      this.t('sentiment.reRunConfirm')
    );
    if (!ok) return;

    this.reanalyzing.set(true);
    this.snackBar.open(this.t('sentiment.enrichmentStarted'), this.t('app.close'), { duration: 4000 });
    this.analysisService.reanalyzeEnrichment(companyId, start, end).subscribe({
      next: (res) => {
        this.reanalyzing.set(false);
        const d = res?.data;
        const msg = d
          ? this.t('sentiment.enrichmentComplete', {
              succeeded: d.succeeded ?? 0,
              failed: d.failed ?? 0,
              total: d.total ?? 0,
            })
          : this.t('sentiment.enrichmentFinished');
        this.snackBar.open(msg, this.t('app.close'), { duration: 8000 });
        this.reloadAll();
      },
      error: () => {
        this.reanalyzing.set(false);
        this.snackBar.open(this.t('sentiment.enrichmentFailed'), this.t('app.close'), { duration: 6000 });
      },
    });
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadFeedbackList();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.loadFeedbackList();
  }

  exportSentimentRecords(): void {
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 4000 });
      return;
    }
    const { start, end } = resolveOptionalApiDateRange(true, this.startDate(), this.endDate());
    if (!start || !end) {
      this.snackBar.open(this.t('sentiment.selectRangeForExport'), this.t('app.close'), { duration: 4000 });
      return;
    }
    const companyId = this.getCompanyId();
    this.exportLoading.set(true);
    this.reportService
      .exportSentimentRecordsToExcel({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...(companyId != null ? { companyId } : {}),
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sentiment-records-${this.startDate()}-${this.endDate()}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.exportLoading.set(false);
          this.snackBar.open(this.t('sentiment.exportDownloaded'), this.t('app.close'), { duration: 3000 });
        },
        error: () => {
          this.exportLoading.set(false);
          this.snackBar.open(this.t('reports.exportFailed'), this.t('app.close'), { duration: 3000 });
        },
      });
  }

  downloadFeedbackTable(): void {
    const total = this.feedbackTotal();
    if (!total) {
      this.snackBar.open(this.t('sentiment.noRowsToDownload'), this.t('app.close'), { duration: 3000 });
      return;
    }

    const exportLimit = 100;
    const maxExportRows = 50000;
    const rowsToFetch = Math.min(total, maxExportRows);
    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(this.filtersApplied(), this.startDate(), this.endDate());
    const queryFilters = this.listQueryFilters();

    this.tableExportLoading.set(true);
    this.analysisService
      .getFeedbackWithSentiment(companyId, start, end, 1, exportLimit, queryFilters)
      .subscribe({
        next: (response) => {
          const firstRows = response?.data?.list || [];
          const apiTotal = Number(response?.data?.total ?? 0);
          const actualTotal = Math.min(Math.max(rowsToFetch, apiTotal), maxExportRows);
          const totalPages = Math.max(1, Math.ceil(actualTotal / exportLimit));

          if (totalPages <= 1) {
            this.finishFeedbackTableDownload(firstRows, total, maxExportRows);
            return;
          }

          const pageRequests = Array.from({ length: totalPages - 1 }, (_, idx) =>
            this.analysisService.getFeedbackWithSentiment(companyId, start, end, idx + 2, exportLimit, queryFilters)
          );

          forkJoin(pageRequests).subscribe({
            next: (responses) => {
              const rows = [
                ...firstRows,
                ...responses.flatMap((pageResponse) => pageResponse?.data?.list || []),
              ].slice(0, actualTotal);
              this.finishFeedbackTableDownload(rows, total, maxExportRows);
            },
            error: () => {
              this.tableExportLoading.set(false);
              this.snackBar.open(this.t('sentiment.tableDownloadFailedPages'), this.t('app.close'), { duration: 4000 });
            },
          });
        },
        error: () => {
          this.tableExportLoading.set(false);
          this.snackBar.open(this.t('sentiment.tableDownloadFailed'), this.t('app.close'), { duration: 3000 });
        },
      });
  }

  private finishFeedbackTableDownload(rows: any[], total: number, maxExportRows: number): void {
    const csv = this.buildFeedbackTableCsv(rows);
    this.downloadTextFile(csv, this.feedbackTableFileName());
    this.tableExportLoading.set(false);
    const capped = total > maxExportRows;
    this.snackBar.open(
      this.t(capped ? 'sentiment.downloadedRowsLimited' : 'sentiment.downloadedRows', {
        count: rows.length,
        max: maxExportRows,
      }),
      this.t('app.close'),
      { duration: 3000 }
    );
  }

  private reloadAll(
    withFilters: boolean = this.filtersApplied(),
    showRefreshToast = false,
    options?: { live?: boolean }
  ): void {
    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(withFilters, this.startDate(), this.endDate());
    const queryFilters = this.listQueryFilters();
    const hasPartial = (this.stats()?.total ?? 0) > 0 || this.feedbackList().length > 0;
    const live = options?.live === true || this.importProcessing.isActive();
    const analyzing = this.analyzingFeedback();
    const importWait =
      !live && (this.importProcessing.isActive() || this.twitterCxReportStore.snapshotPending());
    const showInitialLoader = !analyzing && !live && (importWait || (!this.hasCompletedInitialLoad && !this.stats()));

    if (!analyzing) {
      if (live && hasPartial) {
        this.refreshing.set(true);
      } else if (showInitialLoader) {
        this.initialLoading.set(true);
      }
    }

    forkJoin({
      stats: this.analysisService.getSentimentStats(companyId, start, end),
      patterns: this.analysisService.getSentimentPatterns(companyId, start, end),
      feedback: this.analysisService.getFeedbackWithSentiment(
        companyId,
        start,
        end,
        this.page(),
        this.pageSize(),
        queryFilters
      ),
    }).subscribe({
      next: ({ stats: statsRes, patterns: patternsRes, feedback: feedbackRes }) => {
        const data = statsRes?.data ?? {};
        const total = data.total ?? (data.positive || 0) + (data.negative || 0) + (data.neutral || 0);
        this.stats.set({
          positive: data.positive ?? 0,
          negative: data.negative ?? 0,
          neutral: data.neutral ?? 0,
          total,
          averageScore: data.averageScore ?? 0,
        });
        this.importedCsvRows.set(
          typeof data.importedCsvRows === 'number' && data.importedCsvRows > 0 ? data.importedCsvRows : null
        );
        this.savedRows.set(typeof data.savedRows === 'number' && data.savedRows > 0 ? data.savedRows : null);
        this.countMismatch.set(Boolean(data.countMismatch));
        this.sentimentInterpretation.set(
          typeof data.interpretation === 'string' ? data.interpretation.trim() : ''
        );

        const patterns = patternsRes?.data?.patterns ?? [];
        this.serverPatterns.set(
          patterns.map((p) => ({
            sentiment: (p.sentiment || '') as SentimentReferenceRow['sentiment'],
            patterns: p.patterns || '—',
          }))
        );

        if (feedbackRes?.success && feedbackRes?.data) {
          const list = (feedbackRes.data.list || []).map((row: any) => ({
            ...row,
            content: this.humanizeFeedbackText(row.content),
            date: normalizeApiDateToIso(row.date),
            sentiment: row.sentiment,
          }));
          this.feedbackList.set(list);
          this.feedbackTotal.set(feedbackRes.data.total ?? list.length);
        } else {
          this.feedbackList.set([]);
          this.feedbackTotal.set(0);
        }

        this.hasCompletedInitialLoad = true;
        this.initialLoading.set(false);
        this.refreshing.set(false);
        if (showRefreshToast) {
          this.snackBar.open(this.t('app.refreshed'), this.t('app.close'), { duration: 2500 });
        }
      },
      error: () => {
        this.stats.set({ positive: 0, negative: 0, neutral: 0, total: 0, averageScore: 0 });
        this.sentimentInterpretation.set('');
        this.serverPatterns.set([]);
        this.feedbackList.set([]);
        this.feedbackTotal.set(0);
        this.hasCompletedInitialLoad = true;
        this.initialLoading.set(false);
        this.refreshing.set(false);
        if (showRefreshToast) {
          this.snackBar.open(this.t('app.refreshFailed'), this.t('app.close'), { duration: 4000 });
        }
      },
    });
  }

  loadSentimentPatterns(withFilters: boolean = this.filtersApplied()): void {
    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(withFilters, this.startDate(), this.endDate());
    this.analysisService.getSentimentPatterns(companyId, start, end).subscribe({
      next: (res) => {
        const patterns = res?.data?.patterns ?? [];
        this.serverPatterns.set(
          patterns.map((p) => ({
            sentiment: (p.sentiment || '') as SentimentReferenceRow['sentiment'],
            patterns: p.patterns || '—',
          }))
        );
      },
      error: () => this.serverPatterns.set([]),
    });
  }

  applyListFilters(): void {
    const search = this.filterSearch().trim();
    if (search.length === 1) {
      this.snackBar.open(this.t('sentiment.searchMinLength'), this.t('app.close'), { duration: 3500 });
      return;
    }
    this.page.set(1);
    this.loadFeedbackList(this.filtersApplied());
  }

  private listQueryFilters(overrides?: { sentiment?: string }): {
    journeyStage?: string;
    sentiment?: string;
    isRelevant?: boolean;
    includeIrrelevant?: boolean;
    search?: string;
  } {
    const rel = this.filterIsRelevant();
    const sentiment = overrides?.sentiment ?? (this.filterSentiment().trim() || undefined);
    const isRelevant = rel === 'true' ? true : rel === 'false' ? false : undefined;
    const includeIrrelevant = rel === 'all';
    // Positive/negative/neutral filters should show brand-relevant CX rows only unless user chose otherwise.
    const autoRelevantOnly = !!sentiment && rel === 'all';
    return {
      journeyStage: this.filterJourneyStage() || undefined,
      sentiment,
      isRelevant: autoRelevantOnly ? true : isRelevant,
      includeIrrelevant: autoRelevantOnly ? false : includeIrrelevant,
      search: this.filterSearch().trim() || undefined,
    };
  }

  openReference(row: {
    id?: number;
    content: string;
    referenceContent?: string;
    journeyStage?: string;
    relevanceReason?: string;
    isRelevant?: boolean;
    source?: string;
    date?: string;
    sentiment?: string;
    score?: number;
  }): void {
    this.referenceRow.set(row);
    this.referenceOpen.set(true);
  }

  closeReference(): void {
    this.referenceOpen.set(false);
    this.referenceRow.set(null);
  }

  referenceModalRows(): RelatedFeedbackRow[] {
    const row = this.referenceRow();
    if (!row) return [];
    return [this.mapRowForRelatedModal(row)];
  }

  private mapRowForRelatedModal(row: {
    id?: number;
    content: string;
    referenceContent?: string;
    translatedContent?: string;
    contentSummary?: string;
    journeyStage?: string;
    relevanceReason?: string;
    isRelevant?: boolean;
    source?: string;
    date?: string;
    sentiment?: string;
    score?: number;
  }): RelatedFeedbackRow {
    const original = row.referenceContent || row.content || '';
    return {
      id: Number(row.id) || 0,
      content: original,
      referenceContent: original,
      translatedContent: row.contentSummary || row.translatedContent,
      contentSummary: row.contentSummary || row.translatedContent,
      journeyStage: row.journeyStage,
      relevanceReason: row.relevanceReason,
      isRelevant: row.isRelevant,
      source: row.source,
      date: normalizeApiDateToIso(row.date),
      sentiment: row.sentiment,
      score: row.score,
    };
  }

  openSentimentDrilldown(bar: SentimentChartBar): void {
    if (!bar.count) return;
    this.drilldownTitle.set(`${bar.label} feedback (${bar.count})`);
    this.drilldownBar = bar;
    this.drilldownTotal.set(bar.count);
    this.drilldownOpen.set(true);
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    const bar = this.drilldownBar;
    if (!bar) return;
    this.drilldownLoading.set(true);
    this.drilldownPage.set(page);
    this.drilldownRows.set([]);

    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(this.filtersApplied(), this.startDate(), this.endDate());
    this.analysisService
      .getFeedbackWithSentiment(companyId, start, end, page, this.drilldownPageSize, {
        ...this.listQueryFilters({ sentiment: bar.key }),
      })
      .subscribe({
        next: (response) => {
          this.drilldownLoading.set(false);
          const list = response?.data?.list || [];
          this.drilldownRows.set(
            list.map((row: any) => this.mapRowForRelatedModal({
              ...row,
              content: row.referenceContent || row.content || '',
              date: normalizeApiDateToIso(row.date),
            }))
          );
          this.drilldownTotal.set(bar.count);
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
    this.drilldownLoading.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownBar = null;
  }

  getCompanyId(): number | undefined {
    const id = resolveAppCompanyId(this.authService.currentUser());
    return id > 0 ? id : undefined;
  }

  /** Omit company when missing so API can use optional/global scope. */
  private effectiveCompanyIdForMutations(): number | undefined {
    const id = resolveAppCompanyId(this.authService.currentUser());
    return id > 0 ? id : undefined;
  }

  loadSentimentStats(withFilters: boolean = this.filtersApplied()): void {
    const showInitialLoader = !this.hasCompletedInitialLoad && !this.stats();
    if (showInitialLoader) {
      this.initialLoading.set(true);
    }

    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(withFilters, this.startDate(), this.endDate());

    this.analysisService.getSentimentStats(companyId, start, end).subscribe({
      next: (response) => {
        const data = response?.data ?? {};
        const total = data.total ?? (data.positive || 0) + (data.negative || 0) + (data.neutral || 0);
        this.stats.set({
          positive: data.positive ?? 0,
          negative: data.negative ?? 0,
          neutral: data.neutral ?? 0,
          total,
          averageScore: data.averageScore ?? 0
        });
        this.importedCsvRows.set(
          typeof data.importedCsvRows === 'number' && data.importedCsvRows > 0 ? data.importedCsvRows : null
        );
        this.savedRows.set(typeof data.savedRows === 'number' && data.savedRows > 0 ? data.savedRows : null);
        this.countMismatch.set(Boolean(data.countMismatch));
        this.sentimentInterpretation.set(
          typeof data.interpretation === 'string' ? data.interpretation.trim() : ''
        );
        this.hasCompletedInitialLoad = true;
        this.initialLoading.set(false);
      },
      error: () => {
        this.stats.set({ positive: 0, negative: 0, neutral: 0, total: 0, averageScore: 0 });
        this.sentimentInterpretation.set('');
        this.hasCompletedInitialLoad = true;
        this.initialLoading.set(false);
      }
    });
  }

  loadFeedbackList(withFilters: boolean = this.filtersApplied()): void {
    const companyId = this.getCompanyId();
    const { start, end } = resolveOptionalApiDateRange(withFilters, this.startDate(), this.endDate());

    this.analysisService
      .getFeedbackWithSentiment(companyId, start, end, this.page(), this.pageSize(), this.listQueryFilters())
      .subscribe({
      next: (response) => {
        if (response?.success && response?.data) {
          const list = (response.data.list || []).map((row: any) => ({
            ...row,
            content: this.humanizeFeedbackText(row.content),
            date: normalizeApiDateToIso(row.date),
            sentiment: row.sentiment,
          }));
          this.feedbackList.set(list);
          this.feedbackTotal.set(response.data.total ?? list.length);
        } else {
          this.feedbackList.set([]);
          this.feedbackTotal.set(0);
        }
      },
      error: () => {
        this.feedbackList.set([]);
        this.feedbackTotal.set(0);
      }
    });
  }

  getSentimentData() {
    const stats = this.stats();
    if (!stats) return [];
    const total = stats.total || 0;
    const pct = (n: number) => (total === 0 ? '0.0' : ((n / total) * 100).toFixed(1));
    return [
      { sentiment: this.t('dashboard.positive'), count: stats.positive, percentage: pct(stats.positive) },
      { sentiment: this.t('dashboard.neutral'), count: stats.neutral, percentage: pct(stats.neutral) },
      { sentiment: this.t('dashboard.negative'), count: stats.negative, percentage: pct(stats.negative) }
    ];
  }

  sentimentRows(): Array<{ sentiment: string; count: number; percentage: string; css: string }> {
    const rows = this.getSentimentData();
    return rows.map((r) => ({ ...r, css: r.sentiment.toLowerCase() }));
  }

  sentimentLabel(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'positive') return this.t('dashboard.positive');
    if (normalized === 'neutral') return this.t('dashboard.neutral');
    if (normalized === 'negative') return this.t('dashboard.negative');
    return value || '—';
  }

  chartBars = computed<SentimentChartBar[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const total = Math.max(1, s.total || 0);
    const maxCount = Math.max(1, s.positive, s.neutral, s.negative);
    const mk = (key: 'positive' | 'neutral' | 'negative', label: string, count: number): SentimentChartBar => ({
      key,
      label,
      count,
      percentage: (count / total) * 100,
      height: Math.max(8, (count / maxCount) * 100),
    });
    return [
      mk('positive', this.t('dashboard.positive'), s.positive),
      mk('neutral', this.t('dashboard.neutral'), s.neutral),
      mk('negative', this.t('dashboard.negative'), s.negative),
    ];
  });

  sentimentBarChartMax(): number {
    const s = this.stats();
    if (!s) return 100;
    const m = Math.max(s.positive, s.neutral, s.negative, 1);
    return Math.max(50, Math.ceil(m / 25) * 25);
  }

  sentimentBarFillPct(count: number): number {
    const max = this.sentimentBarChartMax();
    return Math.min(100, max > 0 ? (count / max) * 100 : 0);
  }

  onBarHover(bar: SentimentChartBar): void {
    this.hoveredBar.set(bar);
  }

  onBarLeave(): void {
    this.hoveredBar.set(null);
  }

  private readonly stopWords = new Set([
    've', 'ile', 'bir', 'bu', 'şu', 'çok', 'daha', 'için', 'gibi', 'kadar', 'ama', 'veya',
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'was', 'are',
  ]);

  private extractTopPhrases(
    items: Array<{ content: string }>,
    maxPhrases: number = 5
  ): string[] {
    const text = items.map((x) => x.content || '').join(' ').toLocaleLowerCase('tr-TR');
    const words = text
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[@#][^\s]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !this.stopWords.has(w));

    const unigram = new Map<string, number>();
    const bigram = new Map<string, number>();

    for (let i = 0; i < words.length; i++) {
      unigram.set(words[i], (unigram.get(words[i]) ?? 0) + 1);
      if (i < words.length - 1) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (words[i + 1].length >= 3) {
          bigram.set(phrase, (bigram.get(phrase) ?? 0) + 1);
        }
      }
    }

    const phraseCandidates = [...bigram.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    if (phraseCandidates.length >= maxPhrases) {
      return phraseCandidates.slice(0, maxPhrases);
    }

    const wordCandidates = [...unigram.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    return [...phraseCandidates, ...wordCandidates].slice(0, maxPhrases);
  }

  representativePatterns(sentiment: string): string {
    const norm = sentiment.toLowerCase();
    const target = this.feedbackList().filter((x) => (x.sentiment || '').toLowerCase() === norm);
    const phrases = this.extractTopPhrases(target);
    return phrases.join(', ');
  }

  sentimentReferenceRows(): SentimentReferenceRow[] {
    const server = this.serverPatterns();
    if (server.length) return server.filter((row) => row.patterns.trim().length > 0 && row.patterns !== '—');
    return [
      { sentiment: 'Positive' as const, patterns: this.representativePatterns('positive') },
      { sentiment: 'Neutral' as const, patterns: this.representativePatterns('neutral') },
      { sentiment: 'Negative' as const, patterns: this.representativePatterns('negative') },
    ].filter((row) => row.patterns.trim().length > 0);
  }

  getBarWidth(percentage: string): string {
    const n = parseFloat(percentage);
    if (Number.isNaN(n) || n < 0) return '0%';
    return `${Math.min(100, n)}%`;
  }

  formatDate(d: string): string {
    return formatApiDate(d, { mode: 'date', empty: '' });
  }

  private humanizeFeedbackText(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) return this.t('sentiment.noClearFeedback');

    const cleaned = raw
      .replace(/^RT\s+@\w+:\s*/i, '')
      .replace(/@\w+/g, ' ')
      .replace(/#(\p{L}[\p{L}\p{N}_]*)/gu, '$1')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return this.t('sentiment.noClearFeedback');
    if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(cleaned)) {
      return this.t('sentiment.timestampOnlyRow');
    }
    if (/^[^()]{1,120}\s+\(@[A-Za-z0-9_]{1,30}\)$/.test(cleaned)) {
      return this.t('sentiment.profileLabelRow');
    }

    return cleaned;
  }

  private buildFeedbackTableCsv(rows: any[]): string {
    const header = [
      'ID',
      'Summary',
      'Source tweet',
      'Journey stage',
      'Relevant',
      'Why',
      'Source',
      'Date',
      'Sentiment',
      'Score',
    ];
    const body = rows.map((row) => [
      row.id,
      this.humanizeFeedbackText(row.contentSummary || row.content || ''),
      row.referenceContent || row.content || '',
      row.journeyStage || '',
      row.isRelevant === false ? 'No' : 'Yes',
      row.relevanceReason || '',
      row.source || '',
      this.formatDate(normalizeApiDateToIso(row.date)),
      row.sentiment || '',
      typeof row.score === 'number' ? row.score.toFixed(2) : row.score ?? '',
    ]);

    return [header, ...body].map((line) => line.map((cell) => this.csvCell(cell)).join(',')).join('\r\n');
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '').replace(/\r?\n|\r/g, ' ');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private downloadTextFile(content: string, fileName: string): void {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private feedbackTableFileName(): string {
    const from = this.filtersApplied() && this.startDate() ? this.startDate() : 'all';
    const to = this.filtersApplied() && this.endDate() ? this.endDate() : 'data';
    return `sentiment-feedback-table-${from}-${to}.csv`;
  }

  deleteRecord(row: { id: number; content: string }): void {
    const ok = window.confirm(this.t('sentiment.deleteRecordConfirm'));
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteFeedbackRecord(row.id, companyId).subscribe({
      next: () => {
        this.snackBar.open(this.t('sentiment.recordDeleted'), this.t('app.close'), { duration: 3000 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open(this.t('sentiment.recordDeleteFailed'), this.t('app.close'), { duration: 3000 });
      }
    });
  }

  deleteAllRecords(): void {
    const total = this.feedbackTotal();
    const ok = window.confirm(
      this.t('sentiment.deleteAllConfirm', { total })
    );
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteAllFeedbackRecords(companyId).subscribe({
      next: (res) => {
        const n = res?.data?.deletedFeedback ?? 0;
        this.snackBar.open(this.t('sentiment.deletedRecords', { count: n }), this.t('app.close'), { duration: 3500 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open(this.t('sentiment.deleteAllFailed'), this.t('app.close'), { duration: 3000 });
      }
    });
  }

}
