import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  datesValidYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { ReportDateRangeFilter } from '../../../core/components/report-date-range-filter/report-date-range-filter';

interface NPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  promoterPercentage: number;
  detractorPercentage: number;
}

@Component({
  selector: 'app-nps-analysis',
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal,
    ReportDateRangeFilter,
  ],
  templateUrl: './nps-analysis.html',
  styleUrl: './nps-analysis.css',
})
export class NpsAnalysis implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private translationService = inject(TranslationService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  loading = signal(false);
  npsData = signal<NPSData | null>(null);
  npsInterpretation = signal<string>('');
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownSentiment?: 'positive' | 'negative' | 'neutral';
  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private filtersApplied = signal(false);

  ngOnInit(): void {
    this.loadPresets();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.loadNPSData();
      }
    });
    this.importStatusSub.add(
      this.websocket.onAnalyticsLifecycle().subscribe((event) => {
        if (event.type === 'datasetDeleted' || event.type === 'analysisCompleted') {
          this.loadNPSData();
        }
      })
    );
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
        this.loadNPSData(false);
      },
      error: () => {
        this.presets.set(buildClientReportDatePresets());
        this.loadNPSData(false);
      },
    });
  }

  datesValid(): boolean {
    return datesValidYmd(this.startDate(), this.endDate());
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.loadNPSData(false);
      return;
    }
    if (!this.datesValid()) {
      this.snackBar.open(this.t('reports.selectValidRange'), this.t('app.close'), { duration: 4000 });
      return;
    }
    this.filtersApplied.set(true);
    this.loadNPSData(true);
  }

  loadNPSData(withFilters: boolean = this.filtersApplied()): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    // Admin should aggregate across all companies
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);

    let start: Date | undefined;
    let end: Date | undefined;
    if (withFilters) {
      if (!this.datesValid()) {
        this.loading.set(false);
        return;
      }
      const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
      start = new Date(sd);
      end = new Date(ed);
    }

    this.analysisService.analyzeNPS(companyId, start, end).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const nps = res.data;
          const total = Number(nps.total || 0);
          const promoters = Number(nps.promoters || 0);
          const passives = Number(nps.passives || 0);
          const detractors = Number(nps.detractors || 0);
          const promoterPercentage = total > 0 ? (promoters / total) * 100 : 0;
          const detractorPercentage = total > 0 ? (detractors / total) * 100 : 0;
          const score = Number.isFinite(Number(nps.npsScore))
            ? Number(nps.npsScore)
            : promoterPercentage - detractorPercentage;
          this.npsData.set({
            score,
            promoters,
            passives,
            detractors,
            total,
            promoterPercentage,
            detractorPercentage
          });
          this.npsInterpretation.set(this.localNpsInterpretation({
            score,
            promoters,
            passives,
            detractors,
            total,
            promoterPercentage,
            detractorPercentage,
          }));
          this.loading.set(false);
          return;
        }

        // Fallback to dashboard endpoint if NPS payload is unavailable.
        this.loadFromDashboardFallback(companyId, start, end);
      },
      error: () => {
        this.loadFromDashboardFallback(companyId, start, end);
      }
    });
  }

  private loadFromDashboardFallback(companyId: number | undefined, start?: Date, end?: Date): void {
    this.dashboardService.getStats(companyId, start, end).subscribe({
      next: (response) => {
        if (response.success && response.data?.nps) {
          const nps = response.data.nps;
          const total = nps.total || 1;
          const data = {
            score: nps.score || 0,
            promoters: nps.promoters || 0,
            passives: nps.passives || 0,
            detractors: nps.detractors || 0,
            total,
            promoterPercentage: ((nps.promoters || 0) / total * 100),
            detractorPercentage: ((nps.detractors || 0) / total * 100)
          };
          this.npsData.set(data);
          this.npsInterpretation.set(this.localNpsInterpretation(data));
        } else {
          const empty = {
            score: 0,
            promoters: 0,
            passives: 0,
            detractors: 0,
            total: 0,
            promoterPercentage: 0,
            detractorPercentage: 0
          };
          this.npsData.set(empty);
          this.npsInterpretation.set(
            this.t('npsPage.proxyUnavailable')
          );
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load NPS data:', error);
        this.loading.set(false);
        this.npsData.set({
          score: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          total: 0,
          promoterPercentage: 0,
          detractorPercentage: 0
        });
        this.npsInterpretation.set(
          this.t('npsPage.temporarilyUnavailable')
        );
        if (error.status !== 500) {
          this.snackBar.open(this.t('npsPage.loadFailed'), this.t('app.close'), { duration: 3000 });
        }
      }
    });
  }

  private localNpsInterpretation(data: NPSData): string {
    if (!data.total) {
      return this.t('npsPage.noUsableResponses');
    }
    const score = Number(data.score.toFixed(1));
    if (score >= 30) {
      return this.t('npsPage.healthyAdvocacy', {
        promoters: this.formatPct(data.promoterPercentage),
        detractors: this.formatPct(data.detractorPercentage),
      });
    }
    if (score >= 0) {
      return this.t('npsPage.fragileAdvocacy', {
        promoters: this.formatPct(data.promoterPercentage),
        detractors: this.formatPct(data.detractorPercentage),
      });
    }
    return this.t('npsPage.negativeAdvocacy', {
      promoters: this.formatPct(data.promoterPercentage),
      detractors: this.formatPct(data.detractorPercentage),
    });
  }

  getNPSCategory(score: number): string {
    if (score >= 50) return this.t('npsPage.excellent');
    if (score >= 0) return this.t('npsPage.good');
    if (score >= -50) return this.t('npsPage.needsImprovement');
    return this.t('npsPage.poor');
  }

  getNPSColor(score: number): string {
    if (score >= 50) return 'excellent';
    if (score >= 0) return 'good';
    if (score >= -50) return 'needs-improvement';
    return 'poor';
  }

  passivesPercentage(): number {
    const d = this.npsData();
    if (!d || !d.total) return 0;
    return (d.passives / d.total) * 100;
  }

  formatPct(value: number): string {
    const rounded = Number(value.toFixed(1));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  openNpsBucket(bucket: 'promoters' | 'passives' | 'detractors'): void {
    const data = this.npsData();
    if (!data) return;
    const sentiment = bucket === 'promoters' ? 'positive' : bucket === 'detractors' ? 'negative' : 'neutral';
    const count = bucket === 'promoters' ? data.promoters : bucket === 'detractors' ? data.detractors : data.passives;
    if (!count) return;

    this.drilldownTitle.set(`${bucket} (${count})`);
    this.drilldownSentiment = sentiment;
    this.drilldownOpen.set(true);
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownSentiment) return;
    let start: Date | undefined;
    let end: Date | undefined;
    if (this.filtersApplied() && this.datesValid()) {
      const range = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
      start = new Date(range.startDate);
      end = new Date(range.endDate);
    }

    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);

    this.analysisService
      .getFeedbackWithSentiment(companyId, start, end, page, this.drilldownPageSize, {
        sentiment: this.drilldownSentiment,
        includeIrrelevant: false,
      })
      .subscribe({
        next: (res) => {
          this.drilldownLoading.set(false);
          this.drilldownRows.set(
            (res?.data?.list || []).map((row: any) => ({
              ...row,
              content: String(row.contentSummary || row.content || ''),
            }))
          );
          this.drilldownTotal.set(Number(res?.data?.total ?? 0));
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

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
