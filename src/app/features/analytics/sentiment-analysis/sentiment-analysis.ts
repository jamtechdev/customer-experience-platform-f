import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';

interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  averageScore: number;
}

@Component({
  selector: 'app-sentiment-analysis',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './sentiment-analysis.html',
  styleUrl: './sentiment-analysis.css',
})
export class SentimentAnalysis implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private reportService = inject(ReportService);

  loading = signal(false);
  stats = signal<SentimentStats | null>(null);
  feedbackList = signal<Array<{ id: number; content: string; source: string; date: string; author?: string; sentiment: string; score: number }>>([]);
  feedbackTotal = signal(0);

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  displayedColumns: string[] = ['sentiment', 'count', 'percentage', 'bar'];
  listColumns: string[] = ['content', 'source', 'date', 'sentiment', 'score'];

  ngOnInit(): void {
    this.loadPresets();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const def = list.find((p) => p.id === 'last_30_days') ?? list[0];
        if (def) this.applyPreset(def);
        this.reloadAll();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const def = list.find((p) => p.id === 'last_30_days') ?? list[0];
        if (def) this.applyPreset(def);
        this.reloadAll();
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
      this.reloadAll();
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
    this.reloadAll();
  }

  private reloadAll(): void {
    this.loadSentimentStats();
    this.loadFeedbackList();
  }

  getCompanyId(): number | undefined {
    const id = this.authService.currentUser()?.settings?.companyId;
    return id ?? 1;
  }

  getDateRange(): { start: Date; end: Date } {
    if (!this.datesValid()) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return { start, end };
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    return { start: new Date(sd), end: new Date(ed) };
  }

  loadSentimentStats(): void {
    this.loading.set(true);
    const companyId = this.getCompanyId();
    const { start, end } = this.getDateRange();

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
        this.loading.set(false);
      },
      error: () => {
        this.stats.set({ positive: 0, negative: 0, neutral: 0, total: 0, averageScore: 0 });
        this.loading.set(false);
        this.snackBar.open('Failed to load sentiment data', 'Close', { duration: 3000 });
      }
    });
  }

  loadFeedbackList(): void {
    const companyId = this.getCompanyId();
    const { start, end } = this.getDateRange();

    this.analysisService.getFeedbackWithSentiment(companyId, start, end, 1, 100).subscribe({
      next: (response) => {
        if (response?.success && response?.data) {
          const list = (response.data.list || []).map((row: any) => ({
            ...row,
            date: typeof row.date === 'string' ? row.date : row.date?.toISOString?.() ?? ''
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
      { sentiment: 'Positive', count: stats.positive, percentage: pct(stats.positive) },
      { sentiment: 'Neutral', count: stats.neutral, percentage: pct(stats.neutral) },
      { sentiment: 'Negative', count: stats.negative, percentage: pct(stats.negative) }
    ];
  }

  getBarWidth(percentage: string): string {
    const n = parseFloat(percentage);
    if (Number.isNaN(n) || n < 0) return '0%';
    return `${Math.min(100, n)}%`;
  }

  formatDate(d: string): string {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString(undefined, { dateStyle: 'short' });
    } catch {
      return d;
    }
  }
}
