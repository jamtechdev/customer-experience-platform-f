import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './competitor-comparison.html',
  styleUrl: './competitor-comparison.css',
})
export class CompetitorComparison implements OnInit {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);

  loading = signal(false);
  addingCompetitor = signal(false);
  companyData = signal<CompetitorData | null>(null);
  competitors = signal<CompetitorData[]>([]);
  displayedColumns: string[] = ['name', 'sentimentScore', 'npsScore', 'feedbackCount', 'gap'];
  newCompetitorName = '';

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPresets();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const def = list.find((p) => p.id === 'last_30_days') ?? list[0];
        if (def) this.applyPreset(def);
        this.loadComparisonData();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const def = list.find((p) => p.id === 'last_30_days') ?? list[0];
        if (def) this.applyPreset(def);
        this.loadComparisonData();
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
      this.loadComparisonData();
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
    this.loadComparisonData();
  }

  addCompetitor(): void {
    const name = this.newCompetitorName.trim();
    if (!name) {
      this.snackBar.open('Enter a competitor name', 'Close', { duration: 3000 });
      return;
    }
    this.addingCompetitor.set(true);
    this.analysisService.createCompetitor(name).subscribe({
      next: (res) => {
        this.addingCompetitor.set(false);
        if (res.success) {
          this.newCompetitorName = '';
          this.snackBar.open('Competitor added', 'Close', { duration: 2000 });
          this.loadComparisonData();
        } else {
          this.snackBar.open(res.message || 'Failed to add competitor', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.addingCompetitor.set(false);
        this.snackBar.open(err.error?.message || 'Failed to add competitor', 'Close', { duration: 3000 });
      },
    });
  }

  loadComparisonData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    if (!this.datesValid()) {
      this.loading.set(false);
      return;
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);

    this.analysisService.getCompetitorAnalysis(companyId, new Date(sd), new Date(ed)).subscribe({
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
