import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
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
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReportService } from '../../../core/services/report.service';
import type { TwitterCxReportDto } from '../../../core/models/analysis.model';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

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
}

interface TouchRow {
  name: string;
  volume: number;
  observation: string;
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
  ],
  templateUrl: './arcelik-twitter-cx-report.html',
  styleUrl: './arcelik-twitter-cx-report.css',
})
export class ArcelikTwitterCxReport implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  loadError = signal<string | null>(null);
  reportBundle = signal<TwitterCxReportDto | null>(null);

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

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

  executiveSummaryBullets = computed(() => this.reportBundle()?.executiveSummaryBullets ?? []);

  scopeAndMethodBullets = computed(() => this.reportBundle()?.scopeAndMethodBullets ?? []);

  section4Intro = computed(() => this.reportBundle()?.section4Intro ?? '');

  section4Bullets = computed(() => this.reportBundle()?.section4Bullets ?? []);

  sentimentPatternRows = computed(() => this.reportBundle()?.sentimentPatternRows ?? []);

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

  touchpointsEffective = computed((): TouchRow[] => this.reportBundle()?.touchpoints ?? []);

  rootCausesEffective = computed((): RootCauseRow[] => this.reportBundle()?.rootCauses ?? []);

  actionPlanDisplay = computed((): ActionPlanRow[] => this.reportBundle()?.actionPlan ?? []);

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
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const role = this.authService.currentUser()?.role;
        const defId = role === 'admin' ? 'all_time' : 'last_30_days';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.reload();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const role = this.authService.currentUser()?.role;
        const defId = role === 'admin' ? 'all_time' : 'last_30_days';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.reload();
      },
    });
  }

  applyPreset(p: ReportDatePreset): void {
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
  }

  onPresetChange(id: string): void {
    if (id === 'custom') {
      this.selectedPresetId.set('custom');
      return;
    }
    const p = this.presets().find((x) => x.id === id);
    if (p) {
      this.applyPreset(p);
      this.reload();
    }
  }

  onManualDate(): void {
    this.selectedPresetId.set('custom');
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
  }

  applyRangeAndReload(): void {
    if (!this.datesValid()) {
      this.snackBar.open('Select a valid date range', 'Close', { duration: 4000 });
      return;
    }
    this.reload();
  }

  private sentimentCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    if (user?.role === 'admin') return undefined;
    return user?.settings?.companyId ?? 1;
  }

  reload(): void {
    if (!this.datesValid()) {
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    const start = new Date(sd);
    const end = new Date(ed);
    const sentCo = this.sentimentCompanyId();

    this.analysisService
      .getTwitterCxReport(sentCo, start, end)
      .pipe(
        catchError(() => of({ success: false, data: null as TwitterCxReportDto | null, message: 'Network error' })),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.reportBundle.set(res.data);
            this.loadError.set(null);
          } else {
            this.reportBundle.set(null);
            this.loadError.set(res.message || 'Could not load Twitter CX report.');
            this.snackBar.open(this.loadError() ?? 'Report failed', 'Close', { duration: 4000 });
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
}
