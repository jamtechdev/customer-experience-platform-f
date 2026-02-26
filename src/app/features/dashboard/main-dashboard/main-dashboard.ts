import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  loading = signal(true);
  kpiCards = signal<KPICard[]>([]);
  dashboardData = signal<DashboardStats | null>(null);
  Math = Math; // Expose Math for template

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1; // Default to 1 if not set

    this.dashboardService.getStats(companyId).subscribe({
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
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        this.loading.set(false);
        // Set default empty data on error
        this.dashboardData.set({
          sentiment: { positive: 0, negative: 0, neutral: 0, averageScore: 0, total: 0 },
          nps: { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 },
          alerts: { total: 0, critical: 0, high: 0, recent: [] }
        });
        this.kpiCards.set([
          {
            title: this.t('dashboard.totalFeedback'),
            value: '0',
            change: 0,
            icon: 'feedback',
            color: 'primary'
          },
          {
            title: this.t('dashboard.npsScore'),
            value: 0,
            change: 0,
            icon: 'trending_up',
            color: 'accent'
          },
          {
            title: this.t('dashboard.averageSentimentScore'),
            value: '0%',
            change: 0,
            icon: 'sentiment_satisfied',
            color: 'primary'
          },
          {
            title: this.t('dashboard.activeAlarms'),
            value: 0,
            change: 0,
            icon: 'notifications',
            color: 'warn'
          }
        ]);
      }
    });
  }
}
