import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface NPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  promoterPercentage: number;
  detractorPercentage: number;
}

@Component({
  selector: 'app-nps-analysis',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './nps-analysis.html',
  styleUrl: './nps-analysis.css',
})
export class NpsAnalysis implements OnInit {
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  loading = signal(false);
  npsData = signal<NPSData | null>(null);
  selectedPeriod: 'day' | 'week' | 'month' = 'month';

  ngOnInit(): void {
    this.loadNPSData();
  }

  loadNPSData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    
    this.dashboardService.getStats(companyId).subscribe({
      next: (response) => {
        if (response.success && response.data?.nps) {
          const nps = response.data.nps;
          const total = nps.total || 1;
          this.npsData.set({
            score: nps.score || 0,
            promoters: nps.promoters || 0,
            passives: nps.passives || 0,
            detractors: nps.detractors || 0,
            total,
            promoterPercentage: ((nps.promoters || 0) / total * 100),
            detractorPercentage: ((nps.detractors || 0) / total * 100)
          });
        } else {
          // Set default empty data
          this.npsData.set({
            score: 0,
            promoters: 0,
            passives: 0,
            detractors: 0,
            total: 0,
            promoterPercentage: 0,
            detractorPercentage: 0
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load NPS data:', error);
        this.loading.set(false);
        // Set default empty data on error
        this.npsData.set({
          score: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          total: 0,
          promoterPercentage: 0,
          detractorPercentage: 0
        });
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load NPS data', 'Close', { duration: 3000 });
        }
      }
    });
  }

  getNPSCategory(score: number): string {
    if (score >= 50) return 'Excellent';
    if (score >= 0) return 'Good';
    if (score >= -50) return 'Needs Improvement';
    return 'Poor';
  }

  getNPSColor(score: number): string {
    if (score >= 50) return 'excellent';
    if (score >= 0) return 'good';
    if (score >= -50) return 'needs-improvement';
    return 'poor';
  }
}
