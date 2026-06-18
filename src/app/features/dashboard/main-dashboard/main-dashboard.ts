import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, DashboardStats, DashboardTrends } from '../../../core/services/dashboard.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';
import { applyDashboardDatePreset, toLocalYmd } from '../../../core/utils/report-date-presets';

interface KPICard {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
  badge?: string;
  severity?: 'normal' | 'warning' | 'critical';
}

interface TrendPoint {
  period: string;
  value: number;
}

interface TrendBarPoint {
  label: string;
  value: number;
  height: number;
  negative: boolean;
}

interface SentimentCategoryBar {
  label: string;
  value: number;
  height: number;
  cssClass: string;
}

@Component({
  selector: 'app-main-dashboard',
  imports: [
    PageHeaderCard,
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RelatedFeedbackModal,
    ReportDateRangeFilter,
  ],
  templateUrl: './main-dashboard.html',
  styleUrl: './main-dashboard.css',
})
export class MainDashboard implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private http = inject(HttpClient);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;

  loading = signal(true);
  kpiCards = signal<KPICard[]>([]);
  dashboardData = signal<DashboardStats | null>(null);
  dashboardTrends = signal<DashboardTrends | null>(null);
  backendUnavailable = signal(false);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownSentiment?: 'positive' | 'neutral' | 'negative';
  Math = Math; // Expose Math for template
  todayYmd = computed(() => toLocalYmd(new Date()));

  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  t = (key: string): string => this.translationService.translate(key);

  sentimentPositiveWidth = computed(() => {
    const d = this.dashboardData();
    const total = d?.sentiment?.total ?? 0;
    return total > 0 ? Math.min(100, (d!.sentiment.positive / total) * 100) : 0;
  });
  sentimentNeutralWidth = computed(() => {
    const d = this.dashboardData();
    const total = d?.sentiment?.total ?? 0;
    return total > 0 ? Math.min(100, (d!.sentiment.neutral / total) * 100) : 0;
  });
  sentimentNegativeWidth = computed(() => {
    const d = this.dashboardData();
    const total = d?.sentiment?.total ?? 0;
    return total > 0 ? Math.min(100, (d!.sentiment.negative / total) * 100) : 0;
  });
  npsSegmentPromoterWidth = computed(() => {
    const nps = this.dashboardData()?.nps;
    if (!nps || !nps.total) return 0;
    return (nps.promoters / nps.total) * 100;
  });
  npsSegmentPassiveWidth = computed(() => {
    const nps = this.dashboardData()?.nps;
    if (!nps || !nps.total) return 0;
    return (nps.passives / nps.total) * 100;
  });
  npsSegmentDetractorWidth = computed(() => {
    const nps = this.dashboardData()?.nps;
    if (!nps || !nps.total) return 0;
    return (nps.detractors / nps.total) * 100;
  });
  npsDisplayWidths = computed(() => {
    const nps = this.dashboardData()?.nps;
    if (!nps || !nps.total) return { positive: 33.34, neutral: 33.33, negative: 33.33 };
    const raw = [
      (nps.promoters / nps.total) * 100,
      (nps.passives / nps.total) * 100,
      (nps.detractors / nps.total) * 100,
    ];
    const minWidth = 6;
    const boosted = raw.map((w) => Math.max(minWidth, w));
    const sum = boosted[0] + boosted[1] + boosted[2];
    const norm = boosted.map((w) => (w / sum) * 100);
    return { positive: norm[0], neutral: norm[1], negative: norm[2] };
  });
  npsPercentages = computed(() => {
    const nps = this.dashboardData()?.nps;
    if (!nps || !nps.total) return { positive: 0, neutral: 0, negative: 0 };
    return {
      positive: (nps.promoters / nps.total) * 100,
      neutral: (nps.passives / nps.total) * 100,
      negative: (nps.detractors / nps.total) * 100,
    };
  });
  sentimentTrendPoints = computed<TrendPoint[]>(() =>
    (this.dashboardTrends()?.sentimentTrends || [])
      .map((x) => ({ period: x.period, value: x.averageScore }))
      .filter((x) => Number.isFinite(x.value))
  );
  npsTrendPoints = computed<TrendPoint[]>(() =>
    (this.dashboardTrends()?.npsTrends || [])
      .map((x) => ({ period: x.period, value: x.npsScore }))
      .filter((x) => Number.isFinite(x.value))
  );
  effectiveSentimentTrendPoints = computed<TrendPoint[]>(() => {
    const points = this.sentimentTrendPoints();
    if (points.length > 0) {
      if (points.length === 1 && points[0].value === 0) {
        const fallback = this.dashboardData()?.sentiment?.averageScore;
        if (Number.isFinite(fallback as number) && Number(fallback) !== 0) {
          return [{ period: points[0].period, value: Number(fallback) }];
        }
      }
      return points;
    }
    const score = this.dashboardData()?.sentiment?.averageScore;
    if (!Number.isFinite(score as number)) return [];
    return [{ period: new Date().toISOString(), value: Number(score) }];
  });
  effectiveNpsTrendPoints = computed<TrendPoint[]>(() => {
    const points = this.npsTrendPoints();
    if (points.length > 0) return points;
    const score = this.dashboardData()?.nps?.score;
    if (!Number.isFinite(score as number)) return [];
    return [{ period: new Date().toISOString(), value: Number(score) }];
  });
  sentimentTrendValues = computed(() => this.effectiveSentimentTrendPoints().map((x) => x.value));
  npsTrendValues = computed(() => this.effectiveNpsTrendPoints().map((x) => x.value));
  sentimentTrendPath = computed(() => this.buildTrendPath(this.sentimentTrendValues()));
  npsTrendPath = computed(() => this.buildTrendPath(this.npsTrendValues()));
  sentimentTrendXLabels = computed(() => {
    const labels = this.effectiveSentimentTrendPoints().map((x) => this.formatTrendPeriod(x.period));
    if (labels.length <= 2) return labels;
    return [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]];
  });
  npsTrendXLabels = computed(() => {
    const labels = this.effectiveNpsTrendPoints().map((x) => this.formatTrendPeriod(x.period));
    if (labels.length <= 2) return labels;
    return [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]];
  });
  sentimentTrendBars = computed<TrendBarPoint[]>(() => this.toTrendBars(this.effectiveSentimentTrendPoints()));
  npsTrendBars = computed<TrendBarPoint[]>(() => this.toTrendBars(this.effectiveNpsTrendPoints()));
  sentimentSinglePoint = computed(() => this.sentimentTrendBars().length <= 1);
  npsSinglePoint = computed(() => this.npsTrendBars().length <= 1);
  sentimentCategoryBars = computed<SentimentCategoryBar[]>(() => {
    const sentiment = this.dashboardData()?.sentiment;
    if (!sentiment) return [];
    const raw = [
      { label: this.t('dashboard.positive'), value: sentiment.positive, cssClass: 'positive' },
      { label: this.t('dashboard.neutral'), value: sentiment.neutral, cssClass: 'neutral' },
      { label: this.t('dashboard.negative'), value: sentiment.negative, cssClass: 'negative' },
    ];
    const maxValue = Math.max(...raw.map((x) => x.value), 1);
    return raw.map((x) => ({
      ...x,
      height: Math.max(12, (x.value / maxValue) * 100),
    }));
  });

  downloadSampleCsv(): void {
    const filename = 'sample-customer-feedback.csv';
    const url = '/assets/' + filename;
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (csv) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }

  ngOnInit(): void {
    const initial = applyDashboardDatePreset('last_30_days');
    this.startDate.set(initial.startDate);
    this.endDate.set(initial.endDate);
    this.selectedPresetId.set('last_30_days');
    this.loadDashboardData();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.loadDashboardData();
      }
    });
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
  }

  applyDateRange(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    // Clear old UI state before each fetch to avoid stale cards when API/data context changes.
    this.dashboardData.set(null);
    this.dashboardTrends.set(null);
    this.kpiCards.set([]);
    
    const user = this.authService.currentUser();
    // Admin should see aggregated dashboard across all companies.
    const companyId = user?.role === 'admin'
      ? undefined
      : (user?.settings?.companyId || 1);
    const startYmd = this.startDate();
    const endYmd = this.endDate();
    const start = startYmd ? new Date(`${startYmd}T00:00:00`) : undefined;
    const end = endYmd ? new Date(`${endYmd}T23:59:59.999`) : undefined;

    this.backendUnavailable.set(false);
    this.dashboardService.getStats(companyId, start, end).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          this.dashboardData.set(data);
          
          // Convert average sentiment score (-1..1) to a 0..100 percentage index.
          // Neutral sentiment (avg=0) becomes 50%.
          const sentimentPercentage = data.sentiment.total > 0
            ? Math.round(((data.sentiment.averageScore + 1) / 2) * 100)
            : 0;

          const sentimentTrend = this.dashboardTrends()?.sentimentTrends || [];
          const npsTrend = this.dashboardTrends()?.npsTrends || [];
          const sentimentChange = sentimentTrend.length >= 2
            ? Math.round((sentimentTrend[sentimentTrend.length - 1].averageScore - sentimentTrend[sentimentTrend.length - 2].averageScore) * 100)
            : 0;
          const npsChange = npsTrend.length >= 2
            ? Math.round(npsTrend[npsTrend.length - 1].npsScore - npsTrend[npsTrend.length - 2].npsScore)
            : 0;

          const npsScore = Number(data.nps.score || 0);
          const isNpsCritical = npsScore < 0;
          const negativeShare = data.sentiment.total > 0 ? (data.sentiment.negative / data.sentiment.total) * 100 : 0;
          const isNegativeCritical = negativeShare >= 25;
          const sentimentBenchmark = sentimentPercentage >= 55 ? 'Above industry avg (55%)' : 'Below industry avg (55%)';

          // Build KPI cards
          this.kpiCards.set([
            {
              title: this.t('dashboard.totalFeedback'),
              value: data.sentiment.total.toLocaleString(),
              change: 0, // TODO: Calculate trend from historical data
              icon: 'feedback',
              color: 'primary'
            },
            {
              title: this.t('dashboard.npsScore'),
              value: Number(data.nps.score || 0).toFixed(2),
              change: npsChange,
              icon: 'trending_up',
              color: 'accent',
              badge: isNpsCritical ? 'Below benchmark' : 'Healthy',
              severity: isNpsCritical ? 'critical' : 'normal'
            },
            {
              title: this.t('dashboard.averageSentimentScore'),
              value: `${sentimentPercentage}%`,
              change: sentimentChange,
              icon: 'sentiment_satisfied',
              color: 'primary',
              badge: sentimentBenchmark,
              severity: sentimentPercentage < 45 ? 'warning' : 'normal'
            },
            {
              title: this.t('dashboard.negative'),
              value: data.sentiment.negative.toLocaleString(),
              change: 0,
              icon: 'warning',
              color: 'warn',
              badge: isNegativeCritical ? 'High negative volume' : 'Within expected range',
              severity: isNegativeCritical ? 'critical' : 'normal'
            }
          ]);
        } else {
          this.dashboardData.set(null);
          this.kpiCards.set([]);
        }
        this.loadTrendData(companyId);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.backendUnavailable.set(err?.status === 0 || err?.status === undefined);
        this.dashboardData.set(null);
        this.kpiCards.set([]);
      }
    });
  }

  private loadTrendData(companyId?: number): void {
    this.dashboardService.getDashboardTrends(companyId, 'day', 90).subscribe({
      next: (res) => {
        if (res.success && res.data && this.hasUsableTrends(res.data)) {
          this.dashboardTrends.set(res.data);
        } else {
          this.loadFallbackTrendData(companyId);
        }
      },
      error: () => this.loadFallbackTrendData(companyId),
    });
  }

  private loadFallbackTrendData(companyId?: number): void {
    this.dashboardService.getDashboardTrends(companyId, 'week', 90).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.dashboardTrends.set(res.data);
        } else {
          this.dashboardTrends.set(null);
        }
      },
      error: () => this.dashboardTrends.set(null),
    });
  }

  private buildTrendPath(values: number[]): string {
    if (!values.length) return '';
    const width = 420;
    const height = 160;
    const pad = 12;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    if (values.length === 1) {
      const y = height - pad - ((values[0] - min) / range) * (height - pad * 2);
      return `${pad},${y} ${width - pad},${y}`;
    }
    return values
      .map((v, i) => {
        const x = pad + (i * (width - pad * 2)) / Math.max(1, values.length - 1);
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  private formatTrendPeriod(period: string): string {
    if (!period) return '-';
    const d = new Date(period);
    if (Number.isNaN(d.getTime())) return period;
    return d.toISOString().slice(0, 10);
  }

  private hasUsableTrends(data: DashboardTrends): boolean {
    const sentimentHasSignal = (data.sentimentTrends || []).some((x) => x.total > 0 || x.averageScore !== 0);
    const npsHasSignal = (data.npsTrends || []).some((x) => x.count > 0 || x.npsScore !== 0);
    return sentimentHasSignal || npsHasSignal;
  }

  private toTrendBars(points: TrendPoint[]): TrendBarPoint[] {
    const sliced = points.slice(-12);
    if (!sliced.length) return [];
    const values = sliced.map((p) => p.value);
    const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);
    const isSingle = sliced.length === 1;
    return sliced.map((p) => ({
      label: this.formatTrendPeriod(p.period).slice(5),
      value: p.value,
      height: isSingle ? 70 : Math.max(20, (Math.abs(p.value) / maxAbs) * 100),
      negative: p.value < 0,
    }));
  }

  formatExactValue(value: number): string {
    if (!Number.isFinite(value)) return '-';
    const rounded = Number(value.toFixed(2));
    if (Object.is(rounded, -0)) return '0.00';
    return rounded.toFixed(2);
  }

  openDashboardDrilldown(title: string, sentiment?: 'positive' | 'neutral' | 'negative'): void {
    this.drilldownTitle.set(title);
    this.drilldownSentiment = sentiment;
    this.drilldownOpen.set(true);
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
    this.analysisService
      .getAnalyticsDrilldown({
        companyId,
        sentiment: this.drilldownSentiment,
        startDate: this.startDate() ? new Date(`${this.startDate()}T00:00:00`) : undefined,
        endDate: this.endDate() ? new Date(`${this.endDate()}T23:59:59.999`) : undefined,
        page,
        limit: this.drilldownPageSize,
      })
      .subscribe({
        next: (res) => {
          this.drilldownLoading.set(false);
          this.drilldownRows.set(res?.data?.list || []);
          this.drilldownTotal.set(Number(res?.data?.total ?? res?.data?.returned ?? 0));
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
    this.drilldownSentiment = undefined;
  }
}
