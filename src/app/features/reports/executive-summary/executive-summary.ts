import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, ExecutiveDashboardData } from '../../../core/services/dashboard.service';
import { ReportService } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-executive-summary',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './executive-summary.html',
  styleUrl: './executive-summary.css',
})
export class ExecutiveSummary implements OnInit {
  private dashboardService = inject(DashboardService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  exporting = signal(false);
  data = signal<ExecutiveDashboardData | null>(null);
  Math = Math;

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.dashboardService.getExecutiveDashboard(companyId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load executive summary', 'Close', { duration: 3000 });
      }
    });
  }

  exportPdf(): void {
    this.exporting.set(true);
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.reportService.exportDashboardToPdf({ companyId }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.snackBar.open('Report downloaded', 'Close', { duration: 2000 });
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open('Export failed', 'Close', { duration: 3000 });
      }
    });
  }
}
