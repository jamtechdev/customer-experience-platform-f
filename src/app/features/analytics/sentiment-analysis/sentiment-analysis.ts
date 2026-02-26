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
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  stats = signal<SentimentStats | null>(null);
  selectedPeriod = signal<'day' | 'week' | 'month'>('month');
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  displayedColumns: string[] = ['sentiment', 'count', 'percentage', 'bar'];

  ngOnInit(): void {
    this.loadSentimentStats();
  }

  loadSentimentStats(): void {
    this.loading.set(true);
    const start = this.startDate() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = this.endDate() || new Date();

    this.analysisService.getSentimentStats(undefined, start, end).subscribe({
      next: (response) => {
        if (response.success) {
          // Transform data for display
          const data = response.data;
          const total = (data.positive || 0) + (data.negative || 0) + (data.neutral || 0);
          this.stats.set({
            positive: data.positive || 0,
            negative: data.negative || 0,
            neutral: data.neutral || 0,
            total,
            averageScore: data.averageScore || 0
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Failed to load sentiment data', 'Close', { duration: 3000 });
      }
    });
  }

  getSentimentData() {
    const stats = this.stats();
    if (!stats) return [];
    return [
      { sentiment: 'Positive', count: stats.positive, percentage: (stats.positive / stats.total * 100).toFixed(1) },
      { sentiment: 'Neutral', count: stats.neutral, percentage: (stats.neutral / stats.total * 100).toFixed(1) },
      { sentiment: 'Negative', count: stats.negative, percentage: (stats.negative / stats.total * 100).toFixed(1) }
    ];
  }

  getBarWidth(percentage: string): string {
    return `${percentage}%`;
  }

  onPeriodChange(): void {
    this.loadSentimentStats();
  }

  onDateChange(): void {
    if (this.startDate() && this.endDate()) {
      this.loadSentimentStats();
    }
  }
}
