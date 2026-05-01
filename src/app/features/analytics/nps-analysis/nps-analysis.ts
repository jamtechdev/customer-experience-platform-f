import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';

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
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './nps-analysis.html',
  styleUrl: './nps-analysis.css',
})
export class NpsAnalysis implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private translationService = inject(TranslationService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;

  readonly t = (key: string): string => this.translationService.translate(key);

  loading = signal(false);
  npsData = signal<NPSData | null>(null);
  npsInterpretation = signal<string>('');
  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('last_30_days');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPresets();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.loadNPSData();
      }
    });
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const user = this.authService.currentUser();
        const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
        const def =
          list.find((p) => p.id === defaultId) ??
          list.find((p) => p.id === 'last_30_days') ??
          list[0];
        if (def) this.applyPreset(def);
        this.loadNPSData();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const user = this.authService.currentUser();
        const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
        const def =
          list.find((p) => p.id === defaultId) ??
          list.find((p) => p.id === 'last_30_days') ??
          list[0];
        if (def) this.applyPreset(def);
        this.loadNPSData();
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
      this.loadNPSData();
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
    this.loadNPSData();
  }

  loadNPSData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    // Admin should aggregate across all companies
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
    if (!this.datesValid()) {
      this.loading.set(false);
      return;
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);

    const start = new Date(sd);
    const end = new Date(ed);
    this.analysisService.getTwitterCxReport(companyId, start, end).subscribe({
      next: (res) => {
        if (res.success && res.data?.sentiment) {
          const sentiment = res.data.sentiment;
          const total =
            sentiment.total && sentiment.total > 0
              ? sentiment.total
              : (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0);
          const promoters = sentiment.positive || 0;
          const passives = sentiment.neutral || 0;
          const detractors = sentiment.negative || 0;
          const promoterPercentage = total > 0 ? (promoters / total) * 100 : 0;
          const detractorPercentage = total > 0 ? (detractors / total) * 100 : 0;
          const score =
            typeof res.data.socialNpsProxy === 'number'
              ? res.data.socialNpsProxy
              : promoterPercentage - detractorPercentage;
          this.npsData.set({
            score,
            promoters,
            passives,
            detractors,
            total,
            promoterPercentage,
            detractorPercentage
          });
          const serverInterpretation =
            typeof res.data.npsInterpretation === 'string' && res.data.npsInterpretation.trim().length
              ? res.data.npsInterpretation.trim()
              : '';
          this.npsInterpretation.set(serverInterpretation || this.localNpsInterpretation({
            score,
            promoters,
            passives,
            detractors,
            total,
            promoterPercentage,
            detractorPercentage,
          }));
          this.loading.set(false);
          return;
        }

        // Fallback to dashboard endpoint if report payload is unavailable.
        this.loadFromDashboardFallback(companyId, start, end);
      },
      error: () => {
        this.loadFromDashboardFallback(companyId, start, end);
      }
    });
  }

  private loadFromDashboardFallback(companyId: number | undefined, start: Date, end: Date): void {
    this.dashboardService.getStats(companyId, start, end).subscribe({
      next: (response) => {
        if (response.success && response.data?.nps) {
          const nps = response.data.nps;
          const total = nps.total || 1;
          const data = {
            score: nps.score || 0,
            promoters: nps.promoters || 0,
            passives: nps.passives || 0,
            detractors: nps.detractors || 0,
            total,
            promoterPercentage: ((nps.promoters || 0) / total * 100),
            detractorPercentage: ((nps.detractors || 0) / total * 100)
          };
          this.npsData.set(data);
          this.npsInterpretation.set(this.localNpsInterpretation(data));
        } else {
          const empty = {
            score: 0,
            promoters: 0,
            passives: 0,
            detractors: 0,
            total: 0,
            promoterPercentage: 0,
            detractorPercentage: 0
          };
          this.npsData.set(empty);
          this.npsInterpretation.set(
            'NPS proxy could not be computed for this range yet. Upload more CSV feedback or widen the date range so Ollama can infer promoter, passive, and detractor mix.'
          );
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load NPS data:', error);
        this.loading.set(false);
        this.npsData.set({
          score: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          total: 0,
          promoterPercentage: 0,
          detractorPercentage: 0
        });
        this.npsInterpretation.set(
          'NPS analysis is temporarily unavailable. Please retry after a moment; Ollama-based inference will populate this section once data is reachable.'
        );
        if (error.status !== 500) {
          this.snackBar.open('Failed to load NPS data', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private localNpsInterpretation(data: NPSData): string {
    if (!data.total) {
      return 'No usable responses were found in this date range. Add or reprocess CSV feedback so Ollama can infer an NPS-style distribution.';
    }
    const score = Number(data.score.toFixed(1));
    if (score >= 30) {
      return `Customer advocacy is healthy in this window: promoters (${this.formatPct(data.promoterPercentage)}%) clearly outnumber detractors (${this.formatPct(data.detractorPercentage)}%). Focus on scaling what customers already appreciate.`;
    }
    if (score >= 0) {
      return `Sentiment is slightly positive but fragile. Promoters (${this.formatPct(data.promoterPercentage)}%) are only marginally ahead of detractors (${this.formatPct(data.detractorPercentage)}%), so targeted fixes in recurring complaint themes can lift loyalty quickly.`;
    }
    return `Advocacy is currently negative: detractors (${this.formatPct(data.detractorPercentage)}%) are outweighing promoters (${this.formatPct(data.promoterPercentage)}%). Prioritize top pain points and service recovery actions to reverse the trend.`;
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

  passivesPercentage(): number {
    const d = this.npsData();
    if (!d || !d.total) return 0;
    return (d.passives / d.total) * 100;
  }

  formatPct(value: number): string {
    const rounded = Number(value.toFixed(1));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
}
