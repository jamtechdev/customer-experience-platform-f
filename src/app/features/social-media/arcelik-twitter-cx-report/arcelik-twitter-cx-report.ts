import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { ReportService } from '../../../core/services/report.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { heatmapCellIntensityPct, resolveHeatmapDisplayPct } from '../../../core/utils/drilldown-display';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  datesValidYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { drilldownModalTotal } from '../../../core/utils/drilldown-display';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';
import { notifyCxReportLoadFailure, twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { TwitterCxReportDto } from '../../../core/models';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';

type SortDir = 'asc' | 'desc';

interface SentimentRow {
  label: string;
  pct: number;
  count: number;
  cls: string;
}

interface RootCauseRow {
  cause: string;
  count: number;
  interpretation: string;
  feedbackIds: number[];
}

interface EmotionRow {
  emotion: string;
  label: string;
  count: number;
  pct: number;
  feedbackIds: number[];
}

interface JourneyRow {
  stage: string;
  satisfaction: string;
  dissatisfaction: string;
}

interface HeatmapPctRow {
  stage: string;
  positive: number;
  neutral: number;
  negative: number;
  total?: number;
  positiveCount?: number;
  neutralCount?: number;
  negativeCount?: number;
  positiveDisplayPct?: string;
  neutralDisplayPct?: string;
  negativeDisplayPct?: string;
}

interface TouchRow {
  name: string;
  volume: number;
  observation: string;
}

const SOURCE_CHANNEL_NAMES = new Set([
  'twitter',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'google_reviews',
  'sikayetvar',
  'sikayetvar_com',
  'app_store',
  'play_store',
  'csv_import',
  'social_media',
  'other',
]);

function isSourceChannelName(value: string): boolean {
  return SOURCE_CHANNEL_NAMES.has((value || '').trim().toLowerCase().replace(/\s+/g, '_'));
}

interface ActionPlanRow {
  priority: string;
  action: string;
  owner: string;
  impact: string;
  horizon: string;
}

@Component({
  selector: 'app-arcelik-twitter-cx-report',
  standalone: true,
  imports: [
    PageHeaderCard,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal,
    ReportDateRangeFilter,
  ],
  templateUrl: './arcelik-twitter-cx-report.html',
  styleUrl: './arcelik-twitter-cx-report.css',
})
export class ArcelikTwitterCxReport implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);
  private refreshSub?: Subscription;

  loading = signal(false);
  loadingMessage = signal<string>('Preparing the saved report.');
  loadError = signal<string | null>(null);
  reportBundle = signal<TwitterCxReportDto | null>(null);

  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private filtersApplied = signal(false);

  reportTitleDisplay = computed(() => this.reportBundle()?.reportTitle ?? 'Twitter CX Analysis Report');

  reportSubtitleDisplay = computed(() => {
    const b = this.reportBundle();
    if (b?.reportSubtitle) return b.reportSubtitle;
    const s = this.startDate();
    const e = this.endDate();
    if (s && e) return `Select Apply after choosing dates (${s} → ${e}).`;
    return 'Load a date range to generate this report from your uploaded data.';
  });

  hasData = computed(() => (this.reportBundle()?.sentiment?.total ?? 0) > 0);

  dataset = computed(
    () =>
      this.reportBundle()?.dataset ?? {
        total: 0,
        cxRelated: 0,
        brandSupport: 0,
        originalCustomerCx: 0,
        primaryCohortSize: 0,
      }
  );

  readonly patternCols = ['sentiment', 'patterns'];
  readonly emotionCols = ['emotion', 'count', 'pct'];

  executiveSummaryBullets = computed(() => this.reportBundle()?.executiveSummaryBullets ?? []);

  scopeAndMethodBullets = computed(() => this.reportBundle()?.scopeAndMethodBullets ?? []);

  section4Intro = computed(() => this.reportBundle()?.section4Intro ?? '');

  section4Bullets = computed(() => this.reportBundle()?.section4Bullets ?? []);

  sentimentPatternRows = computed(() => this.reportBundle()?.sentimentPatternRows ?? []);

  emotionRows = computed((): EmotionRow[] =>
    (this.reportBundle()?.emotionRows ?? []).map((r) => ({
      emotion: typeof r.emotion === 'string' ? r.emotion : '',
      label: typeof r.label === 'string' ? r.label : typeof r.emotion === 'string' ? r.emotion : '',
      count: typeof r.count === 'number' ? r.count : 0,
      pct: typeof r.pct === 'number' ? r.pct : 0,
      feedbackIds: Array.isArray(r.feedbackIds)
        ? (r.feedbackIds as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        : [],
    }))
  );

  npsInterpretation = computed(() => this.reportBundle()?.npsInterpretation ?? '');

  heatmapFigureCaption = computed(() => this.reportBundle()?.heatmapFigureCaption ?? '');

  effectiveSentimentRows = computed((): SentimentRow[] => {
    const st = this.reportBundle()?.sentiment;
    if (!st?.total) return [];
    const t = st.total;
    const pct = (x: number) => Math.round((x / t) * 1000) / 10;
    return [
      { label: 'Positive', pct: pct(st.positive), count: st.positive, cls: 'positive' },
      { label: 'Neutral', pct: pct(st.neutral), count: st.neutral, cls: 'neutral' },
      { label: 'Negative', pct: pct(st.negative), count: st.negative, cls: 'negative' },
    ];
  });

  socialNpsFromSentiment = computed(() => this.reportBundle()?.socialNpsProxy ?? 0);

  npsInferredDisplay = computed(() => {
    const st = this.reportBundle()?.sentiment;
    const t = st?.total ?? 0;
    if (!t || !st) return { promotersPct: 0, passivesPct: 0, detractorsPct: 0, baseN: 0 };
    return {
      promotersPct: Math.round((st.positive / t) * 1000) / 10,
      passivesPct: Math.round((st.neutral / t) * 1000) / 10,
      detractorsPct: Math.round((st.negative / t) * 1000) / 10,
      baseN: t,
    };
  });

  datasetProfileRows = computed(() => this.reportBundle()?.datasetProfileRows ?? []);

  journeyRowsEffective = computed((): JourneyRow[] => this.reportBundle()?.journeyRows ?? []);

  heatmapPctMatrix = computed((): HeatmapPctRow[] => this.reportBundle()?.heatmapPct ?? []);

  touchpointsEffective = computed((): TouchRow[] =>
    (this.reportBundle()?.touchpoints ?? []).filter((row) => !isSourceChannelName(row.name))
  );

  rootCausesEffective = computed((): RootCauseRow[] =>
    (this.reportBundle()?.rootCauses ?? []).map((r) => ({
      cause: typeof r.cause === 'string' ? r.cause : '',
      count: typeof r.count === 'number' ? r.count : 0,
      interpretation: typeof r.interpretation === 'string' ? r.interpretation : '',
      feedbackIds: Array.isArray(r.feedbackIds)
        ? (r.feedbackIds as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
        : [],
    }))
  );

  actionPriorityFilter = signal<'all' | 'p1' | 'p2' | 'p3'>('all');
  actionPlanDisplay = computed((): ActionPlanRow[] => {
    const rows = this.reportBundle()?.actionPlan ?? [];
    const filter = this.actionPriorityFilter();
    if (filter === 'all') return rows;
    return rows.filter((row) => (row.priority || '').trim().toLowerCase() === filter);
  });

  processImprovementsDisplay = computed(() => this.reportBundle()?.processImprovements ?? []);

  managementTakeawaysDisplay = computed(() => this.reportBundle()?.managementTakeaways ?? []);

  journeyDisplayed = ['stage', 'satisfaction', 'dissatisfaction'];
  rootDisplayed = ['cause', 'count', 'interpretation'];
  touchDisplayed = ['name', 'volume', 'observation'];
  actionDisplayed = ['priority', 'action', 'owner', 'impact', 'horizon'];
  datasetCols = ['metric', 'value', 'comment'];

  rootSortField = signal<'count' | 'cause'>('count');
  rootSortDir = signal<SortDir>('desc');
  touchSortField = signal<'volume' | 'name'>('volume');
  touchSortDir = signal<SortDir>('desc');

  rootCauseMaxEffective = computed(() => {
    const rows = this.rootCausesEffective();
    return Math.max(1, ...rows.map((r) => r.count));
  });

  rootCausesSorted = computed(() => {
    const rows = [...this.rootCausesEffective()];
    const field = this.rootSortField();
    const dir = this.rootSortDir();
    const factor = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (field === 'count') return (a.count - b.count) * factor;
      return a.cause.localeCompare(b.cause) * factor;
    });
    return rows;
  });

  touchpointMaxEffective = computed(() => {
    const rows = this.touchpointsEffective();
    return Math.max(1, ...rows.map((r) => r.volume));
  });

  touchpointsSorted = computed(() => {
    const rows = [...this.touchpointsEffective()];
    const field = this.touchSortField();
    const dir = this.touchSortDir();
    const factor = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (field === 'volume') return (a.volume - b.volume) * factor;
      return a.name.localeCompare(b.name) * factor;
    });
    return rows;
  });

  sentimentBarChartMax = computed(() => {
    const rows = this.effectiveSentimentRows();
    const m = Math.max(1, ...rows.map((r) => r.count));
    return Math.max(50, Math.ceil(m / 25) * 25);
  });

  ngOnInit(): void {
    this.loadPresets();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.reload());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        this.reload(false);
      },
      error: () => {
        this.presets.set(buildClientReportDatePresets());
        this.reload(false);
      },
    });
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.reload(false);
      return;
    }
    if (!this.datesValid()) {
      this.snackBar.open('Select a valid date range', 'Close', { duration: 4000 });
      return;
    }
    this.filtersApplied.set(true);
    this.reload(true);
  }

  private sentimentCompanyId(): number | undefined {
    const id = resolveAppCompanyId(this.authService.currentUser());
    return id > 0 ? id : undefined;
  }

  reload(withFilters: boolean = this.filtersApplied()): void {
    this.loading.set(true);
    this.loadingMessage.set('Loading saved report from database…');
    this.loadError.set(null);
    const sentCo = this.sentimentCompanyId();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (withFilters && this.datesValid()) {
      const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
      startDate = new Date(sd);
      endDate = new Date(ed);
    }

    // After 3 s switch message to let user know the selected LLM may still be generating live analysis.
    const msgTimer = setTimeout(() => {
      if (this.loading()) {
        this.loadingMessage.set('Still loading from database…');
      }
    }, 3000);

    this.twitterCxReportStore
      .loadTwitterCxReport(sentCo, undefined, startDate, endDate)
      .pipe(
        finalize(() => {
          clearTimeout(msgTimer);
          this.loading.set(false);
          this.loadingMessage.set('Loading saved report from database…');
        })
      )
      .subscribe({
        next: (res) => {
          if (res.message === 'stale_response') {
            return;
          }
          if (res.success && res.data) {
            this.reportBundle.set(res.data);
            this.loadError.set(null);
          } else {
            this.reportBundle.set(null);
            const hint = this.importProcessing.isActive() ? null : twitterCxReportFailureMessage(res.message);
            this.loadError.set(hint);
            notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), 'Close');
          }
        },
      });
  }

  sentimentBarFillPct(count: number): number {
    const max = this.sentimentBarChartMax();
    return Math.min(100, max > 0 ? (count / max) * 100 : 0);
  }

  rootCauseBarFillPct(count: number): number {
    const max = this.rootCauseMaxEffective();
    return Math.min(100, max > 0 ? (count / max) * 100 : 0);
  }

  touchpointBarFillPct(volume: number): number {
    const max = this.touchpointMaxEffective();
    return Math.min(100, max > 0 ? (volume / max) * 100 : 0);
  }

  heatmapCellBg(pct: number): string {
    const t = Math.min(100, Math.max(0, pct)) / 100;
    const h = 285 - t * 125;
    const s = 55 + t * 35;
    const l = 22 + t * 48;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  heatmapTextColor(pct: number): string {
    return pct >= 42 ? '#0f172a' : '#f8fafc';
  }

  heatmapCellLabel(row: HeatmapPctRow, key: 'positive' | 'neutral' | 'negative'): string {
    const count =
      key === 'positive'
        ? row.positiveCount ?? 0
        : key === 'neutral'
          ? row.neutralCount ?? 0
          : row.negativeCount ?? 0;
    const total = row.total && row.total > 0 ? row.total : count;
    const display =
      key === 'positive'
        ? row.positiveDisplayPct
        : key === 'neutral'
          ? row.neutralDisplayPct
          : row.negativeDisplayPct;
    return resolveHeatmapDisplayPct(count, total, display);
  }

  heatmapCellIntensity(row: HeatmapPctRow, key: 'positive' | 'neutral' | 'negative'): number {
    const count =
      key === 'positive'
        ? row.positiveCount ?? 0
        : key === 'neutral'
          ? row.neutralCount ?? 0
          : row.negativeCount ?? 0;
    const total = row.total && row.total > 0 ? row.total : count;
    return heatmapCellIntensityPct(count, total, row[key]);
  }

  truncateChartLabel(text: string, maxLen = 26): string {
    const t = text.trim();
    return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
  }

  setRootSort(field: 'count' | 'cause'): void {
    if (this.rootSortField() === field) {
      this.rootSortDir.set(this.rootSortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.rootSortField.set(field);
    this.rootSortDir.set(field === 'count' ? 'desc' : 'asc');
  }

  setTouchSort(field: 'volume' | 'name'): void {
    if (this.touchSortField() === field) {
      this.touchSortDir.set(this.touchSortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.touchSortField.set(field);
    this.touchSortDir.set(field === 'volume' ? 'desc' : 'asc');
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownTitle.set('');
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
  }

  openRelatedRecords(row: RootCauseRow): void {
    this.openRelated(row.cause, row.feedbackIds);
  }

  openRelated(title: string, feedbackIds: number[]): void {
    if (!feedbackIds?.length) {
      this.snackBar.open('No linked feedback records for this selection.', 'Close', { duration: 3500 });
      return;
    }
    this.drilldownTitle.set(title);
    this.drilldownOpen.set(true);
    this.drilldownIds = feedbackIds;
    this.drilldownTotal.set(drilldownModalTotal(this.drilldownIds));
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownLoading.set(true);
    this.drilldownPage.set(page);
    this.drilldownRows.set([]);
    const id = resolveAppCompanyId(this.authService.currentUser());
    const companyId = id > 0 ? id : undefined;
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: true,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res.success && Array.isArray(res.data?.list)) {
          this.drilldownRows.set(res.data.list);
          this.drilldownTotal.set(res.data?.total ?? drilldownModalTotal(this.drilldownIds));
        } else {
          this.snackBar.open(res.message || 'Could not load related records', 'Close', { duration: 5000 });
          this.closeDrilldown();
        }
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownTotal.set(0);
        this.snackBar.open('Could not load related records', 'Close', { duration: 4000 });
        this.closeDrilldown();
      },
    });
  }

  formatFeedbackDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }
}
