import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  NO_DATE_FILTER_PRESET_ID,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';

interface CompetitorData {
  id: number;
  name: string;
  sentimentScore: number;
  npsScore: number;
  feedbackCount: number;
  feedbackIds?: number[];
}

@Component({
  selector: 'app-competitor-comparison',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    OllamaLoader,
    RelatedFeedbackModal,
  ],
  templateUrl: './competitor-comparison.html',
  styleUrl: './competitor-comparison.css',
})
export class CompetitorComparison implements OnInit, OnDestroy {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private translationService = inject(TranslationService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;

  loading = signal(false);
  addingCompetitor = signal(false);
  cleaningCompetitors = signal(false);
  companyData = signal<CompetitorData | null>(null);
  competitors = signal<CompetitorData[]>([]);
  insightSummary = signal<string>('');
  noDataInSelectedRange = signal(false);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];
  displayedColumns: string[] = ['name', 'sentimentScore', 'npsScore', 'feedbackCount', 'gap', 'actions'];
  newCompetitorName = '';

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>(NO_DATE_FILTER_PRESET_ID);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  private filtersApplied = signal(false);

  ngOnInit(): void {
    this.loadPresets();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.loadComparisonData();
      }
    });
    this.importStatusSub.add(
      this.websocket.onAnalyticsLifecycle().subscribe((event) => {
        if (event.type === 'datasetDeleted' || event.type === 'analysisCompleted') {
          this.loadComparisonData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
  }

  isAdminUser(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        this.loadComparisonData(false);
      },
      error: () => {
        this.presets.set(buildClientReportDatePresets());
        this.loadComparisonData(false);
      },
    });
  }

  applyPreset(p: ReportDatePreset): void {
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
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

  onManualDate(): void {
    this.selectedPresetId.set('custom');
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
  }

  applyRangeAndReload(): void {
    if (this.selectedPresetId() === NO_DATE_FILTER_PRESET_ID) {
      this.filtersApplied.set(false);
      this.loadComparisonData(false);
      return;
    }
    if (!this.datesValid()) {
      this.snackBar.open('Select a valid date range', 'Close', { duration: 4000 });
      return;
    }
    this.filtersApplied.set(true);
    this.loadComparisonData(true);
  }

  cleanupInvalidCompetitorNames(): void {
    this.cleaningCompetitors.set(true);
    this.analysisService.cleanupInvalidCompetitors().subscribe({
      next: (res) => {
        this.cleaningCompetitors.set(false);
        const n = res.data?.deleted ?? 0;
        this.snackBar.open(`Removed ${n} invalid competitor row(s)`, 'Close', { duration: 3500 });
        this.loadComparisonData();
      },
      error: () => {
        this.cleaningCompetitors.set(false);
        this.snackBar.open('Cleanup failed', 'Close', { duration: 3000 });
      },
    });
  }

  addCompetitor(): void {
    const name = this.newCompetitorName.trim();
    if (!name) {
      this.snackBar.open('Enter a competitor name', 'Close', { duration: 3000 });
      return;
    }
    this.addingCompetitor.set(true);
    this.analysisService.createCompetitor(name).subscribe({
      next: (res) => {
        this.addingCompetitor.set(false);
        if (res.success) {
          this.newCompetitorName = '';
          this.snackBar.open('Competitor added', 'Close', { duration: 2000 });
          this.loadComparisonData();
        } else {
          this.snackBar.open(res.message || 'Failed to add competitor', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.addingCompetitor.set(false);
        this.snackBar.open(err.error?.message || 'Failed to add competitor', 'Close', { duration: 3000 });
      },
    });
  }

  loadComparisonData(withFilters: boolean = this.filtersApplied()): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
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

    this.analysisService.getCompetitorAnalysis(companyId, startDate, endDate).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const data = response.data;

          const companyFeedbackCount = data.company?.feedbackCount ?? 0;
          const competitorFeedbackCounts: number[] = Array.isArray(data.competitors)
            ? data.competitors.map((c: any) => c?.feedbackCount ?? 0)
            : [];
          const competitorsAllZero = competitorFeedbackCounts.length > 0 && competitorFeedbackCounts.every((x) => x === 0);
          this.noDataInSelectedRange.set(companyFeedbackCount === 0 && competitorsAllZero);

          if (data.company) {
            this.companyData.set({
              id: data.company.id,
              name: data.company.name,
              sentimentScore: data.company.sentimentScore || 0,
              npsScore: data.company.npsScore || 0,
              feedbackCount: companyFeedbackCount,
              feedbackIds: Array.isArray(data.company.feedbackIds) ? data.company.feedbackIds : [],
            });
          } else {
            this.companyData.set(null);
          }
          if (data.competitors && Array.isArray(data.competitors)) {
            this.competitors.set(data.competitors.map((c: any) => ({
              id: c.id,
              name: c.name || 'Unknown',
              sentimentScore: c.sentimentScore || 0,
              npsScore: c.npsScore || 0,
              feedbackCount: c.feedbackCount || 0,
              feedbackIds: Array.isArray(c.feedbackIds) ? c.feedbackIds : [],
            })));
          } else {
            this.competitors.set([]);
          }
          this.insightSummary.set(typeof data.insightSummary === 'string' ? data.insightSummary : '');
        } else {
          this.companyData.set(null);
          this.competitors.set([]);
          this.insightSummary.set('');
          this.noDataInSelectedRange.set(false);
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load comparison data:', error);
        this.loading.set(false);
        this.companyData.set(null);
        this.competitors.set([]);
        this.insightSummary.set('');
        this.noDataInSelectedRange.set(false);
        const status = error?.status ?? 0;
        if (status === 504 || status === 503) {
          this.snackBar.open(
            'Competitor analysis timed out. Try a shorter date range with Apply, or retry in a moment.',
            'Close',
            { duration: 6000 }
          );
        } else if (status !== 500) {
          this.snackBar.open('Failed to load comparison data', 'Close', { duration: 3000 });
        }
      }
    });
  }

  getAllData(): CompetitorData[] {
    const company = this.companyData();
    if (!company) return this.competitors();
    return [company, ...this.competitors()];
  }

  calculateGap(row: CompetitorData): number {
    const company = this.companyData();
    if (!company) return 0;
    return row.sentimentScore - company.sentimentScore;
  }

  openRelated(row: CompetitorData): void {
    const ids = [...new Set((row.feedbackIds || []).filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) return;
    this.drilldownTitle.set(row.name);
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: false,
    }).subscribe({
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
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
  }

  hasValidCompetitors(): boolean {
    return this.competitors().length > 0;
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  removeCompetitor(competitorId: number): void {
    if (!this.isAdminUser()) return;
    const ok = window.confirm('Remove this competitor? Related feedback will remain but will no longer count for that competitor.');
    if (!ok) return;
    this.analysisService.deleteCompetitor(competitorId).subscribe({
      next: (res) => {
        if (res.success) this.loadComparisonData();
      },
      error: () => {
        this.snackBar.open('Failed to remove competitor', 'Close', { duration: 3500 });
      },
    });
  }
}
