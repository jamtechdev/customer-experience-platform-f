import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, ExecutiveDashboardData } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ReportService } from '../../../core/services/report.service';

@Component({
  selector: 'app-executive-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './executive-dashboard.html',
  styleUrl: './executive-dashboard.css',
})
export class ExecutiveDashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private reportService = inject(ReportService);

  loading = signal(true);
  dashboardData = signal<ExecutiveDashboardData | null>(null);
  Math = Math;

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;

    this.dashboardService.getExecutiveDashboard(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.dashboardData.set(response.data);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load executive dashboard data:', error);
        this.loading.set(false);
      }
    });
  }

  downloadReport(): void {
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    this.reportService.exportDashboardToPdf({ companyId }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return '';
    }
  }
}
