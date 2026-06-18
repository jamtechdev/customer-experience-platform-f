import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DashboardService, ExecutiveDashboardData } from '../../../core/services/dashboard.service';
import { ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { Subscription } from 'rxjs';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  datesValidYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

@Component({
  selector: 'app-executive-summary',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
    ReportDateRangeFilter,
  ],
  templateUrl: './executive-summary.html',
  styleUrl: './executive-summary.css',
})
export class ExecutiveSummary implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private reportRefreshSub?: Subscription;

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  loading = signal(true);
  exporting = signal(false);
  data = signal<ExecutiveDashboardData | null>(null);

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  filtersApplied = signal(false);
  private manualReloadTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadPresets();
    this.reportRefreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadSummary(this.filtersApplied()));
  }

  ngOnDestroy(): void {
    this.reportRefreshSub?.unsubscribe();
    if (this.manualReloadTimer) clearTimeout(this.manualReloadTimer);
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        this.loadSummary(false);
      },
      error: () => {
        this.presets.set(buildClientReportDatePresets());
        this.loadSummary(false);
      },
    });
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
  }

  canUseSelectedRange(): boolean {
    return this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID || this.datesValid();
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.loadSummary(false);
      return;
    }
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 5000 });
      return;
    }
    this.filtersApplied.set(true);
    this.loadSummary(true);
  }

  loadSummary(withFilters: boolean = this.filtersApplied()): void {
    this.loading.set(true);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
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
    this.dashboardService.getExecutiveDashboard(companyId, startDate, endDate).subscribe({
      next: (res) => {
        if (res.success && res.data) this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.t('reports.executiveSummaryLoadFailed'), this.t('app.close'), { duration: 3000 });
      },
    });
  }

  exportPdf(): void {
    if (!this.canUseSelectedRange()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 5000 });
      return;
    }
    this.exporting.set(true);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    const { startDate: sd, endDate: ed, displayRange } =
      this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID
        ? this.exportAllDataRange()
        : { ...toIsoRangeFromYmd(this.startDate()!, this.endDate()!), displayRange: undefined };
    this.reportService
      .exportDashboardToPdf({
        companyId,
        startDate: sd,
        endDate: ed,
        displayRange,
        reportType: 'executive',
      })
      .subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.snackBar.open(this.t('reports.downloaded'), this.t('app.close'), { duration: 2000 });
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open(this.t('reports.exportFailed'), this.t('app.close'), { duration: 4000 });
      },
    });
  }

  private exportAllDataRange(): { startDate: string; endDate: string; displayRange?: string } {
    const span = this.cohortDateSpan();
    const allTime = this.presets().find((p) => p.id === 'all_time');
    if (allTime && allTime.startDate && allTime.endDate) {
      return {
        startDate: allTime.startDate,
        endDate: allTime.endDate,
        displayRange: span || 'All imported data',
      };
    }
    if (span && span.includes(' to ')) {
      const [from, to] = span.split(' to ').map((s) => s.trim());
      if (from && to) {
        return {
          startDate: new Date(`${from}T00:00:00.000Z`).toISOString(),
          endDate: new Date(`${to}T23:59:59.999Z`).toISOString(),
          displayRange: span,
        };
      }
    }
    const fallbackEnd = new Date();
    fallbackEnd.setHours(23, 59, 59, 999);
    return {
      startDate: new Date('2020-01-01T00:00:00.000Z').toISOString(),
      endDate: fallbackEnd.toISOString(),
      displayRange: span || 'All imported data',
    };
  }

  importedRowCount(): number | null {
    const imported = this.data()?.cohort?.importedRows;
    return imported != null && imported > 0 ? imported : null;
  }

  countsAreConsistent(): boolean {
    const total = this.totalTweetVolume();
    const cx = this.cxRelatedVolume();
    const original = this.originalCustomerCxVolume();
    return cx <= total && original <= total && this.brandSupportVolume() <= total;
  }

  sentimentTotal(): number {
    return this.data()?.sentiment?.total ?? this.data()?.kpis.totalFeedback ?? 0;
  }

  sentimentBar(kind: 'positive' | 'neutral' | 'negative'): number {
    const s = this.data()?.sentiment;
    const total = this.sentimentTotal();
    if (!s || !total) return 0;
    return (s[kind] / total) * 100;
  }

  totalTweetVolume(): number {
    const cohort = this.data()?.cohort;
    if (cohort && cohort.total > 0) return cohort.total;
    return this.data()?.kpis.totalFeedback ?? 0;
  }

  originalCustomerCxVolume(): number {
    const cohort = this.data()?.cohort;
    if (cohort && cohort.originalCustomerCx > 0) return cohort.originalCustomerCx;
    if (cohort && cohort.primaryCohortSize > 0) return cohort.primaryCohortSize;
    return this.totalTweetVolume();
  }

  cxRelatedVolume(): number {
    const cohort = this.data()?.cohort;
    if (cohort && cohort.cxRelated > 0) return cohort.cxRelated;
    return this.totalTweetVolume();
  }

  brandSupportVolume(): number {
    const cohort = this.data()?.cohort;
    if (cohort) return Math.max(cohort.brandSupport, 0);
    return 0;
  }

  cohortDateSpan(): string | null {
    return this.data()?.cohort?.dateSpan ?? null;
  }

  narrativeBullets(): string[] {
    const bullets = this.data()?.cohort?.executiveSummaryBullets;
    if (bullets?.length) return bullets;
    return [];
  }

  displayNpsScore(): number {
    const cohortNps = this.data()?.cohort?.socialNpsProxy;
    if (cohortNps != null && Number.isFinite(cohortNps)) return cohortNps;
    return Number(this.data()?.nps.score ?? 0);
  }

  sentimentPct(kind: 'positive' | 'neutral' | 'negative'): number {
    const total = this.sentimentTotal();
    const s = this.data()?.sentiment;
    if (!total || !s) return 0;
    return (s[kind] / total) * 100;
  }

  executiveSentimentNarrative(): string {
    return this.t('reports.executiveNarrativeSentiment', {
      positive: this.sentimentPct('positive').toFixed(1),
      neutral: this.sentimentPct('neutral').toFixed(1),
      negative: this.sentimentPct('negative').toFixed(1),
      nps: this.displayNpsScore().toFixed(1),
    });
  }
}
