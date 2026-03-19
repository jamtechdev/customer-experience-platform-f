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

  loading = signal(false);
  stats = signal<SentimentStats | null>(null);
  feedbackList = signal<Array<{ id: number; content: string; source: string; date: string; author?: string; sentiment: string; score: number }>>([]);
  feedbackTotal = signal(0);

  /** Plain properties so ngModel two-way binding works (signals are not writable by ngModel). */
  selectedPeriod: 'day' | 'week' | 'month' = 'month';
  startDate: Date | null = null;
  endDate: Date | null = null;

  displayedColumns: string[] = ['sentiment', 'count', 'percentage', 'bar'];
  listColumns: string[] = ['content', 'source', 'date', 'sentiment', 'score'];

  ngOnInit(): void {
    this.applyDefaultDateRange();
    this.loadSentimentStats();
    this.loadFeedbackList();
  }

  private applyDefaultDateRange(): void {
    if (this.startDate == null || this.endDate == null) {
      const end = new Date();
      const start = new Date();
      if (this.selectedPeriod === 'day') {
        start.setDate(start.getDate() - 1);
      } else if (this.selectedPeriod === 'week') {
        start.setDate(start.getDate() - 7);
      } else {
        start.setMonth(start.getMonth() - 1);
      }
      this.startDate = start;
      this.endDate = end;
    }
  }

  getCompanyId(): number | undefined {
    const id = this.authService.currentUser()?.settings?.companyId;
    return id ?? 1;
  }

  getDateRange(): { start: Date; end: Date } {
    const defaultStart = new Date();
    defaultStart.setFullYear(defaultStart.getFullYear() - 1);
    return {
      start: this.startDate ?? defaultStart,
      end: this.endDate ?? new Date()
    };
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

  onPeriodChange(): void {
    const end = new Date();
    const start = new Date();
    if (this.selectedPeriod === 'day') {
      start.setDate(start.getDate() - 1);
    } else if (this.selectedPeriod === 'week') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
    this.startDate = start;
    this.endDate = end;
    this.loadSentimentStats();
    this.loadFeedbackList();
  }

  onDateChange(): void {
    if (this.startDate != null && this.endDate != null) {
      this.loadSentimentStats();
      this.loadFeedbackList();
    }
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
