import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';
import { TranslationService } from '../../../core/services/translation.service';

interface StageRow {
  stageName: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  feedbackIds: number[];
  positiveFeedbackIds: number[];
  neutralFeedbackIds: number[];
  negativeFeedbackIds: number[];
  painPoints: string[];
  satisfactionPoints: string[];
}

type HeatmapSentiment = 'positive' | 'neutral' | 'negative';

@Component({
  selector: 'app-journey-heatmap',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
  ],
  templateUrl: './journey-heatmap.html',
  styleUrl: './journey-heatmap.css',
})
export class JourneyHeatmap implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);
  private refreshSub?: Subscription;
  loading = signal(false);
  stages = signal<StageRow[]>([]);
  error = signal<string | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<Array<{ id: number; content: string; contentSummary?: string; source: string; date: string; sentiment: string }>>([]);
  Math = Math;
  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  readonly pageSize = 20;
  page = signal(1);
  pagedStages = computed(() => {
    const all = this.stages();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.stages().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });

  ngOnInit(): void {
    this.loadHeatmap(false);
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadHeatmap(false));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadHeatmap(forceLive: boolean = false): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.error.set(null);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, forceLive).subscribe({
      next: (res) => {
        if (res.message === 'stale_response') {
          this.loading.set(false);
          return;
        }
        if (!res.success) {
          this.stages.set([]);
          this.page.set(1);
          const hint = twitterCxReportFailureMessage(res.message);
          this.error.set(hint);
          this.snackBar.open(hint, this.t('app.close'), { duration: 7000 });
          this.loading.set(false);
          return;
        }
        this.error.set(null);
        if (res.success && Array.isArray(res.data?.heatmapPct)) {
          this.stages.set(
            res.data.heatmapPct.map((r: any) => ({
              stageName: r.stage ?? 'Unknown',
              satisfactionScore: Number(r.positive ?? 0) / 100,
              dissatisfactionScore: Number(r.negative ?? 0) / 100,
              feedbackCount: Number(r.total ?? 0),
              feedbackIds: this.toFeedbackIds(r.feedbackIds),
              positiveFeedbackIds: this.toFeedbackIds(r.positiveFeedbackIds),
              neutralFeedbackIds: this.toFeedbackIds(r.neutralFeedbackIds),
              negativeFeedbackIds: this.toFeedbackIds(r.negativeFeedbackIds),
              painPoints: [],
              satisfactionPoints: [],
            }))
          );
          this.page.set(1);
        } else {
          this.stages.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        const hint = twitterCxReportFailureMessage();
        this.error.set(hint);
        this.snackBar.open(hint, this.t('app.close'), { duration: 6000 });
        this.stages.set([]);
        this.page.set(1);
        this.loading.set(false);
      },
    });
  }

  getSatisfactionColor(score: number): string {
    if (score >= 0.5) return 'heat-high';
    if (score >= 0.2) return 'heat-mid';
    if (score > 0) return 'heat-low';
    return 'heat-none';
  }

  getDissatisfactionColor(score: number): string {
    if (score >= 0.6) return 'heat-pain-high';
    if (score >= 0.3) return 'heat-pain-mid';
    if (score > 0) return 'heat-pain-low';
    return 'heat-none';
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.stages().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  openRelated(stage: StageRow, label: HeatmapSentiment, ids: number[]): void {
    const unique = [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    if (!unique.length && stage.feedbackCount <= 0) return;
    this.drilldownTitle.set(`${stage.stageName} · ${label}`);
    this.drilldownOpen.set(true);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.analysisService.getAnalyticsDrilldown({
      companyId,
      ids: unique,
      sentiment: label,
      journeyStage: stage.stageName,
      includeIrrelevant: true,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
      },
    });
  }

  private toFeedbackIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
  }
}
