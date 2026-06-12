import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardStats, DashboardTrends } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ReportService } from '../../../core/services/report.service';
import {
  buildClientReportDatePresets,
  inclusiveDaysBetweenYmd,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { parseIsoDateOnlyLocal } from '../../../core/utils/api-date';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';

interface TrendHistoryRow {
  period: string;
  total: number;
  positivePct: number | null;
  neutralPct: number | null;
  negativePct: number | null;
  averageScore: number | null;
  npsScore: number | null;
  npsCount: number;
}

@Component({
  selector: 'app-dashboard-reports',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    RouterModule,
    OllamaLoader,
  ],
  templateUrl: './dashboard-reports.html',
  styleUrl: './dashboard-reports.css',
})
export class DashboardReports implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private reportService = inject(ReportService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;

  loading = signal(true);
  loadingTrends = signal(true);
  currentStats = signal<DashboardStats | null>(null);
  trends = signal<DashboardTrends | null>(null);
  period = signal<'day' | 'week' | 'month'>('week');
  days = signal(90);
  Math = Math;

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private filtersApplied = signal(false);
  private manualReloadTimer: ReturnType<typeof setTimeout> | null = null;

  t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  sentimentTrends = computed(() => this.trends()?.sentimentTrends ?? []);
  npsTrends = computed(() => this.trends()?.npsTrends ?? []);
  visibleNpsTrends = computed(() => {
    if (!this.hasNpsBaseData()) return [];
    return this.npsTrends().filter((p) => (p?.count ?? 0) > 0);
  });
  historyRows = computed<TrendHistoryRow[]>(() => {
    const sentimentByPeriod = new Map(this.sentimentTrends().map((point) => [point.period, point]));
    const npsByPeriod = new Map(this.npsTrends().map((point) => [point.period, point]));
    const periods = Array.from(new Set([...sentimentByPeriod.keys(), ...npsByPeriod.keys()]));

    return periods.map((period) => {
      const sentiment = sentimentByPeriod.get(period);
      const nps = npsByPeriod.get(period);
      const total = sentiment?.total ?? 0;
      return {
        period,
        total,
        positivePct: total > 0 && sentiment ? (sentiment.positive / total) * 100 : null,
        neutralPct: total > 0 && sentiment ? (sentiment.neutral / total) * 100 : null,
        negativePct: total > 0 && sentiment ? (sentiment.negative / total) * 100 : null,
        averageScore: sentiment?.averageScore ?? null,
        npsScore: nps && nps.count > 0 ? nps.npsScore : null,
        npsCount: nps?.count ?? 0,
      };
    });
  });

  maxSentimentTotal = computed(() => {
    const list = this.sentimentTrends();
    if (list.length === 0) return 1;
    return Math.max(1, ...list.map((t) => t.total));
  });

  maxNps = computed(() => {
    const list = this.visibleNpsTrends();
    if (list.length === 0) return 100;
    const values = list.map((t) => t.npsScore);
    return Math.max(100, Math.ceil(Math.max(...values) / 10) * 10);
  });

  minNps = computed(() => {
    const list = this.visibleNpsTrends();
    if (list.length === 0) return -100;
    const values = list.map((t) => t.npsScore);
    return Math.min(-100, Math.floor(Math.min(...values) / 10) * 10);
  });

  ngOnInit(): void {
    this.loadPresets();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.reloadAll();
      }
    });
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
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
        this.presets.set(buildClientReportDatePresets());
        this.reloadAll(false);
      },
    });
  }

  applyPreset(p: ReportDatePreset): void {
    if (this.manualReloadTimer) {
      clearTimeout(this.manualReloadTimer);
      this.manualReloadTimer = null;
    }
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
    const days = inclusiveDaysBetweenYmd(this.startDate()!, this.endDate()!);
    this.days.set(Math.max(7, days));
  }

  onPresetChange(id: string): void {
    if (id === NO_DATE_FILTER_PRESET_ID) {
      this.selectedPresetId.set(NO_DATE_FILTER_PRESET_ID);
      this.startDate.set(null);
      this.endDate.set(null);
      return;
    }
    if (id === 'custom') {
      this.selectedPresetId.set('custom');
      return;
    }
    const p = this.presets().find((x) => x.id === id);
    if (p) {
      this.applyPreset(p);
    }
  }

  presetLabel(p: ReportDatePreset): string {
    const labels: Record<string, string> = {
      all_time: 'reports.allTime',
      last_7_days: 'reports.last7Days',
      last_30_days: 'reports.last30Days',
      last_calendar_month: 'reports.lastCalendarMonth',
      ytd: 'reports.yearToDate',
    };
    return labels[p.id] ? this.t(labels[p.id]) : p.label;
  }

  onManualDate(): void {
    this.selectedPresetId.set('custom');
  }

  openNativeDatePicker(input: HTMLInputElement): void {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function' && !input.disabled) {
      picker.showPicker();
    } else {
      input.focus();
    }
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.reloadAll(false);
      return;
    }
    if (!this.datesValid()) return;
    this.filtersApplied.set(true);
    const days = inclusiveDaysBetweenYmd(this.startDate()!, this.endDate()!);
    this.days.set(Math.max(7, days));
    this.reloadAll(true);
  }

  private reloadAll(withFilters: boolean = this.filtersApplied()): void {
    this.loadCurrentStatus(withFilters);
    this.loadTrends(withFilters);
  }

  onPeriodChange(): void {
    this.loadTrends(this.filtersApplied());
  }

  loadCurrentStatus(withFilters: boolean = this.filtersApplied()): void {
    this.loading.set(true);
    this.currentStats.set(null);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (withFilters) {
      if (!this.datesValid()) {
        this.loading.set(false);
        return;
      }
      const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
      startDate = new Date(sd);
      endDate = new Date(ed);
    }

    this.dashboardService.getStats(companyId, startDate, endDate).subscribe({
      next: (res) => {
        if (res.success && res.data) this.currentStats.set(res.data);
        else this.currentStats.set(null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.currentStats.set(null);
      },
    });
  }

  loadTrends(withFilters: boolean = this.filtersApplied()): void {
    this.loadingTrends.set(true);
    this.trends.set(null);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    const days = withFilters && this.datesValid()
      ? inclusiveDaysBetweenYmd(this.startDate()!, this.endDate()!)
      : this.days();

    this.dashboardService.getDashboardTrends(companyId, this.period(), Math.max(7, days)).subscribe({
      next: (res) => {
        if (res.success && res.data) this.trends.set(res.data);
        else this.trends.set(null);
        this.loadingTrends.set(false);
      },
      error: () => {
        this.trends.set(null);
        this.loadingTrends.set(false);
      },
    });
  }

  formatPeriodLabel(period: string): string {
    if (!period) return period;
    try {
      if (period.length === 10 && period.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const d = parseIsoDateOnlyLocal(period);
        if (!d) return period;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (period.match(/^\d{4}-\d{2}$/)) {
        const [y, m] = period.split('-');
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
        return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
    } catch {
      // ignore
    }
    return period;
  }

  npsBarWidth(score: number): number {
    const min = this.minNps();
    const max = this.maxNps();
    const range = max - min;
    if (range <= 0) return 50;
    return ((score - min) / range) * 100;
  }

  hasNpsBaseData(): boolean {
    const stats = this.currentStats();
    return !!stats && stats.sentiment.total > 0 && stats.nps.total > 0;
  }
}
