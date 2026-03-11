import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, DashboardStats } from '../../../core/services/dashboard.service';
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
    const companyId = user?.settings?.companyId || 1;
    const start = this.dateRangeStart();
    const end = this.dateRangeEnd();

    this.backendUnavailable.set(false);
    this.dashboardService.getStats(companyId, start ?? undefined, end ?? undefined).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          this.dashboardData.set(data);
          
          // Calculate sentiment percentage
          const sentimentPercentage = data.sentiment.total > 0
            ? Math.round((data.sentiment.positive / data.sentiment.total) * 100)
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
              value: Math.round(data.nps.score),
              change: 0, // TODO: Calculate trend from historical data
              icon: 'trending_up',
              color: 'accent'
            },
            {
              title: this.t('dashboard.averageSentimentScore'),
              value: `${sentimentPercentage}%`,
              change: 0, // TODO: Calculate trend from historical data
              icon: 'sentiment_satisfied',
              color: 'primary'
            },
            {
              title: this.t('dashboard.activeAlarms'),
              value: data.alerts.total,
              change: 0,
              icon: 'notifications',
              color: 'warn'
            }
          ]);
        }
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
}
