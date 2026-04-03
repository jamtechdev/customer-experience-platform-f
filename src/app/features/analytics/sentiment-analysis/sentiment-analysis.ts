import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
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
import { formatApiDate, normalizeApiDateToIso } from '../../../core/utils/api-date';

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
    MatInputModule,
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
    this.setListColumns();
    this.loadPresets();
  }

  isAdminUser(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  private setListColumns(): void {
    this.listColumns = this.isAdminUser()
      ? ['content', 'source', 'date', 'sentiment', 'score', 'actions']
      : ['content', 'source', 'date', 'sentiment', 'score'];
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
        this.reloadAll();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const role = this.authService.currentUser()?.role;
        const defId = role === 'admin' ? 'all_time' : 'last_30_days';
        const def = list.find((p) => p.id === defId) ?? list[0];
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
    const user = this.authService.currentUser();
    if (user?.role === 'admin') return undefined;
    const id = user?.settings?.companyId;
    return id ?? 1;
  }

  /** Admin can delete in global scope (undefined companyId). */
  private effectiveCompanyIdForMutations(): number | undefined {
    const user = this.authService.currentUser();
    if (user?.role === 'admin') return undefined;
    return user?.settings?.companyId ?? 1;
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
            date: normalizeApiDateToIso(row.date),
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
    return formatApiDate(d, { mode: 'date', empty: '' });
  }

  deleteRecord(row: { id: number; content: string }): void {
    const ok = window.confirm('Delete this feedback record? This action cannot be undone.');
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteFeedbackRecord(row.id, companyId).subscribe({
      next: () => {
        this.snackBar.open('Feedback record deleted', 'Close', { duration: 3000 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open('Failed to delete feedback record', 'Close', { duration: 3000 });
      }
    });
  }

  deleteAllRecords(): void {
    const total = this.feedbackTotal();
    const ok = window.confirm(
      `Delete all feedback records in current scope? (${total} items). This action cannot be undone.`
    );
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteAllFeedbackRecords(companyId).subscribe({
      next: (res) => {
        const n = res?.data?.deletedFeedback ?? 0;
        this.snackBar.open(`Deleted ${n} feedback records`, 'Close', { duration: 3500 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open('Failed to delete all feedback records', 'Close', { duration: 3000 });
      }
    });
  }
}
