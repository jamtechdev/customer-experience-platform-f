import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface CompetitorData {
  name: string;
  sentimentScore: number;
  npsScore: number;
  feedbackCount: number;
}

@Component({
  selector: 'app-competitor-comparison',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './competitor-comparison.html',
  styleUrl: './competitor-comparison.css',
})
export class CompetitorComparison implements OnInit {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  loading = signal(false);
  companyData = signal<CompetitorData | null>(null);
  competitors = signal<CompetitorData[]>([]);
  displayedColumns: string[] = ['name', 'sentimentScore', 'npsScore', 'feedbackCount', 'gap'];

  ngOnInit(): void {
    this.loadComparisonData();
  }

  loadComparisonData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    
    this.analysisService.getCompetitorAnalysis(companyId).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const data = response.data;
          if (data.company) {
            this.companyData.set({
              name: data.company.name,
              sentimentScore: data.company.sentimentScore || 0,
              npsScore: data.company.npsScore || 0,
              feedbackCount: data.company.feedbackCount || 0
            });
          } else {
            this.companyData.set(null);
          }
          if (data.competitors && Array.isArray(data.competitors)) {
            this.competitors.set(data.competitors.map((c: any) => ({
              name: c.name || 'Unknown',
              sentimentScore: c.sentimentScore || 0,
              npsScore: c.npsScore || 0,
              feedbackCount: c.feedbackCount || 0
            })));
          } else {
            this.competitors.set([]);
          }
        } else {
          this.companyData.set(null);
          this.competitors.set([]);
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load comparison data:', error);
        this.loading.set(false);
        this.companyData.set(null);
        this.competitors.set([]);
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load comparison data', 'Close', { duration: 3000 });
        }
      }
    });
  }

  getAllData(): CompetitorData[] {
    const company = this.companyData();
    if (!company) return this.competitors();
    return [company, ...this.competitors()];
  }

  calculateGap(row: CompetitorData): number {
    const company = this.companyData();
    if (!company) return 0;
    return row.sentimentScore - company.sentimentScore;
  }
}
