import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardStats, DashboardTrends } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

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
    FormsModule,
  ],
  templateUrl: './dashboard-reports.html',
  styleUrl: './dashboard-reports.css',
})
export class DashboardReports implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);

  loading = signal(true);
  loadingTrends = signal(true);
  currentStats = signal<DashboardStats | null>(null);
  trends = signal<DashboardTrends | null>(null);
  period = signal<'day' | 'week' | 'month'>('week');
  days = signal(90);
  Math = Math;

  t = (key: string): string => this.translationService.translate(key);

  sentimentTrends = computed(() => this.trends()?.sentimentTrends ?? []);
  npsTrends = computed(() => this.trends()?.npsTrends ?? []);

  maxSentimentTotal = computed(() => {
    const list = this.sentimentTrends();
    if (list.length === 0) return 1;
    return Math.max(1, ...list.map((t) => t.total));
  });

  maxNps = computed(() => {
    const list = this.npsTrends();
    if (list.length === 0) return 100;
    const values = list.map((t) => t.npsScore);
    return Math.max(100, Math.ceil(Math.max(...values) / 10) * 10);
  });

  minNps = computed(() => {
    const list = this.npsTrends();
    if (list.length === 0) return -100;
    const values = list.map((t) => t.npsScore);
    return Math.min(-100, Math.floor(Math.min(...values) / 10) * 10);
  });

  ngOnInit(): void {
    this.loadCurrentStatus();
    this.loadTrends();
  }

  onPeriodChange(): void {
    this.loadTrends();
  }

  loadCurrentStatus(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId ?? 1;

    this.dashboardService.getStats(companyId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.currentStats.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.currentStats.set(null);
      },
    });
  }

  loadTrends(): void {
    this.loadingTrends.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId ?? 1;

    this.dashboardService.getDashboardTrends(companyId, this.period(), this.days()).subscribe({
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
        const d = new Date(period);
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
}
