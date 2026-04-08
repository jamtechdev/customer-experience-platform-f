import { Component, inject, OnInit, signal } from '@angular/core';
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
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

interface CompetitorData {
  id: number;
  name: string;
  sentimentScore: number;
  npsScore: number;
  feedbackCount: number;
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
  ],
  templateUrl: './competitor-comparison.html',
  styleUrl: './competitor-comparison.css',
})
export class CompetitorComparison implements OnInit {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private translationService = inject(TranslationService);

  loading = signal(false);
  addingCompetitor = signal(false);
  cleaningCompetitors = signal(false);
  companyData = signal<CompetitorData | null>(null);
  competitors = signal<CompetitorData[]>([]);
  noDataInSelectedRange = signal(false);
  displayedColumns: string[] = ['name', 'sentimentScore', 'npsScore', 'feedbackCount', 'gap', 'actions'];
  newCompetitorName = '';

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('ytd');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPresets();
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
        const def =
          list.find((p) => p.id === 'ytd') ??
          list.find((p) => p.id === 'last_30_days') ??
          list[0];
        if (def) this.applyPreset(def);
        this.loadComparisonData();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const def =
          list.find((p) => p.id === 'ytd') ??
          list.find((p) => p.id === 'last_30_days') ??
          list[0];
        if (def) this.applyPreset(def);
        this.loadComparisonData();
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
      this.loadComparisonData();
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
    this.loadComparisonData();
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

  loadComparisonData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    if (!this.datesValid()) {
      this.loading.set(false);
      return;
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);

    this.analysisService.getCompetitorAnalysis(companyId, new Date(sd), new Date(ed)).subscribe({
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
              feedbackCount: companyFeedbackCount
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
              feedbackCount: c.feedbackCount || 0
            })));
          } else {
            this.competitors.set([]);
          }
        } else {
          this.companyData.set(null);
          this.competitors.set([]);
          this.noDataInSelectedRange.set(false);
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load comparison data:', error);
        this.loading.set(false);
        this.companyData.set(null);
        this.competitors.set([]);
        this.noDataInSelectedRange.set(false);
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
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
