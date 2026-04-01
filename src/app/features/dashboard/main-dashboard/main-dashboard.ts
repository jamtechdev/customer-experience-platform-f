import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, DashboardStats, DashboardTrends } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

interface KPICard {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-main-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './main-dashboard.html',
  styleUrl: './main-dashboard.css',
})
export class MainDashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private http = inject(HttpClient);

  loading = signal(true);
  kpiCards = signal<KPICard[]>([]);
  dashboardData = signal<DashboardStats | null>(null);
  dashboardTrends = signal<DashboardTrends | null>(null);
  backendUnavailable = signal(false);
  Math = Math; // Expose Math for template

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
  sentimentTrendValues = computed(() =>
    this.toDailySeries(this.dashboardTrends()?.sentimentTrends || [], (x) => x.averageScore).values
  );
  npsTrendValues = computed(() =>
    this.toDailySeries(this.dashboardTrends()?.npsTrends || [], (x) => x.npsScore).values
  );
  sentimentTrendPath = computed(() => this.buildTrendPath(this.sentimentTrendValues()));
  npsTrendPath = computed(() => this.buildTrendPath(this.npsTrendValues()));
  trendXLabels = computed(() => {
    const labels = this.toDailySeries(this.dashboardTrends()?.sentimentTrends || [], (x) => x.averageScore).labels;
    if (labels.length <= 2) return labels;
    return [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]];
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
    this.loadDashboardData();
  }

  dateRangeStart = signal<Date | null>(null);
  dateRangeEnd = signal<Date | null>(null);

  dateRangeStartValue(): string {
    const d = this.dateRangeStart();
    return d ? d.toISOString().slice(0, 10) : '';
  }

  dateRangeEndValue(): string {
    const d = this.dateRangeEnd();
    return d ? d.toISOString().slice(0, 10) : '';
  }

  onDateStartChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input?.value;
    this.dateRangeStart.set(val ? new Date(val) : null);
    this.loadDashboardData();
  }

  onDateEndChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input?.value;
    this.dateRangeEnd.set(val ? new Date(val) : null);
    this.loadDashboardData();
  }

  clearDateRange(): void {
    this.dateRangeStart.set(null);
    this.dateRangeEnd.set(null);
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    const user = this.authService.currentUser();
    // Admin should see aggregated dashboard across all companies.
    const companyId = user?.role === 'admin'
      ? undefined
      : (user?.settings?.companyId || 1);
    const start = this.dateRangeStart();
    const end = this.dateRangeEnd();

    this.backendUnavailable.set(false);
    this.dashboardService.getStats(companyId, start ?? undefined, end ?? undefined).subscribe({
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
              color: 'accent'
            },
            {
              title: this.t('dashboard.averageSentimentScore'),
              value: `${sentimentPercentage}%`,
              change: sentimentChange,
              icon: 'sentiment_satisfied',
              color: 'primary'
            },
            {
              title: this.t('dashboard.negative'),
              value: data.sentiment.negative.toLocaleString(),
              change: 0,
              icon: 'warning',
              color: 'warn'
            }
          ]);
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

  private toDailySeries<T extends { period: string }>(
    items: T[],
    valueSelector: (item: T) => number,
    days: number = 90
  ): { labels: string[]; values: number[] } {
    const byDay = new Map<string, number>();
    for (const item of items) {
      const key = (item.period || '').slice(0, 10);
      if (!key) continue;
      byDay.set(key, valueSelector(item));
    }

    const labels: string[] = [];
    const values: number[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      values.push(byDay.get(key) ?? 0);
    }

    return { labels, values };
  }
}
