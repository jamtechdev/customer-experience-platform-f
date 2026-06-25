import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure, twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { TranslationService } from '../../../core/services/translation.service';
import { drilldownModalTotal } from '../../../core/utils/drilldown-display';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';

interface StageRow {
  stageName: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
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
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal,
  ],
  templateUrl: './journey-heatmap.html',
  styleUrl: './journey-heatmap.css',
})
export class JourneyHeatmap implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);
  private translationService = inject(TranslationService);
  private refreshSub?: Subscription;
  loading = signal(false);
  stages = signal<StageRow[]>([]);
  cohortTotal = signal<number | null>(null);
  importedCsvRows = signal<number | null>(null);
  rowsSaved = signal<number | null>(null);
  error = signal<string | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownState: { stage: StageRow; label: HeatmapSentiment; ids: number[] } | null = null;
  private drilldownIds: number[] = [];
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

  heatmapMappedTotal = computed(() => this.stages().reduce((sum, row) => sum + row.feedbackCount, 0));

  scopeStats = computed(() => {
    const csv = this.importedCsvRows();
    const saved = this.rowsSaved();
    const mapped = this.heatmapMappedTotal();
    if (csv != null && csv > 0 && saved === csv && mapped === csv) {
      return [{ icon: 'dataset', labelKey: 'heatmap.scopeUnified', value: csv }];
    }
    const items: Array<{ icon: string; labelKey: string; value: number | null }> = [
      { icon: 'upload_file', labelKey: 'heatmap.scopeCsv', value: csv },
      { icon: 'storage', labelKey: 'heatmap.scopeSaved', value: saved },
      { icon: 'grid_view', labelKey: 'heatmap.scopeMapped', value: mapped },
    ];
    return items.filter((item) => item.value != null && item.value > 0);
  });

  ngOnInit(): void {
    this.loadHeatmap(false);
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadHeatmap(false));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadHeatmap(forceLive: boolean = false, refreshFromServer: boolean = false): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (refreshFromServer && !forceLive) {
      this.twitterCxReportStore.clearCachedReport(companyId);
    }
    this.loading.set(true);
    this.error.set(null);
    const useLive = forceLive || this.importProcessing.isActive();
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, useLive).subscribe({
      next: (res) => {
        if (res.message === 'stale_response') {
          this.loading.set(false);
          return;
        }
        if (!res.success) {
          this.stages.set([]);
          this.page.set(1);
          this.error.set(this.importProcessing.isActive() ? null : twitterCxReportFailureMessage(res.message));
          notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), this.t('app.close'));
          this.loading.set(false);
          return;
        }
        this.error.set(null);
        this.cohortTotal.set(
          Number(res.data?.dataset?.total ?? res.data?.sentiment?.total ?? 0) || null
        );
        this.importedCsvRows.set(
          Number(res.data?.dataset?.importedCsvRows ?? 0) || null
        );
        this.rowsSaved.set(Number(res.data?.dataset?.total ?? 0) || null);
        if (res.success && Array.isArray(res.data?.heatmapPct)) {
          this.stages.set(
            res.data.heatmapPct.map((r: any) => this.mapHeatmapRow(r))
          );
          this.page.set(1);
        } else {
          this.stages.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.importProcessing.isActive() ? null : twitterCxReportFailureMessage());
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), this.t('app.close'));
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

  getPositiveHeatClass(score: number): string {
    if (score >= 70) return 'heat-pos-high';
    if (score >= 40) return 'heat-pos-mid';
    if (score > 0) return 'heat-pos-low';
    return 'heat-none';
  }

  positivePct(row: StageRow): number {
    if (!row.feedbackCount) return 0;
    return (row.positiveCount / row.feedbackCount) * 100;
  }

  negativePct(row: StageRow): number {
    if (!row.feedbackCount) return 0;
    return (row.negativeCount / row.feedbackCount) * 100;
  }

  neutralPct(row: StageRow): number {
    if (!row.feedbackCount) return 0;
    return (row.neutralCount / row.feedbackCount) * 100;
  }

  sentimentIds(row: StageRow, label: HeatmapSentiment): number[] {
    if (label === 'positive') return row.positiveFeedbackIds;
    if (label === 'negative') return row.negativeFeedbackIds;
    return row.neutralFeedbackIds;
  }

  sentimentCount(row: StageRow, label: HeatmapSentiment): number {
    if (label === 'positive') return row.positiveCount;
    if (label === 'negative') return row.negativeCount;
    return row.neutralCount;
  }

  getNeutralHeatClass(pct: number): string {
    if (pct >= 60) return 'heat-neu-high';
    if (pct >= 35) return 'heat-neu-mid';
    if (pct > 0) return 'heat-neu-low';
    return 'heat-none';
  }

  getNegativeHeatClass(pct: number): string {
    if (pct >= 60) return 'heat-neg-high';
    if (pct >= 30) return 'heat-neg-mid';
    if (pct > 0) return 'heat-neg-low';
    return 'heat-none';
  }

  openRelated(stage: StageRow, label: HeatmapSentiment): void {
    const ids = this.sentimentIds(stage, label);
    const unique = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    const displayCount = this.sentimentCount(stage, label);
    if (!unique.length && displayCount <= 0) return;
    this.drilldownState = { stage, label, ids: unique };
    this.drilldownIds = unique;
    this.drilldownTotal.set(unique.length || displayCount);
    this.drilldownTitle.set(`${stage.stageName} · ${label} (${this.drilldownTotal().toLocaleString()} messages)`);
    this.drilldownOpen.set(true);
    this.loadDrilldownPage(1);
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

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
        this.drilldownTotal.set(res?.data?.total ?? drilldownModalTotal(this.drilldownIds));
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
        this.drilldownTotal.set(0);
      },
    });
  }

  private mapHeatmapRow(r: Record<string, unknown>): StageRow {
    const total = Number(r['total'] ?? 0);
    const posIds = this.toFeedbackIds(r['positiveFeedbackIds']);
    const neuIds = this.toFeedbackIds(r['neutralFeedbackIds']);
    const negIds = this.toFeedbackIds(r['negativeFeedbackIds']);
    const posPct = Number(r['positive'] ?? 0);
    const neuPct = Number(r['neutral'] ?? 0);
    const negPct = Number(r['negative'] ?? 0);
    const positiveCount =
      Number(r['positiveCount'] ?? 0) || posIds.length || (total ? Math.round((posPct / 100) * total) : 0);
    const neutralCount =
      Number(r['neutralCount'] ?? 0) || neuIds.length || (total ? Math.round((neuPct / 100) * total) : 0);
    const negativeCount =
      Number(r['negativeCount'] ?? 0) || negIds.length || (total ? Math.round((negPct / 100) * total) : 0);
    return {
      stageName: String(r['stage'] ?? 'Unknown'),
      satisfactionScore: posPct / 100,
      dissatisfactionScore: negPct / 100,
      feedbackCount: total,
      positiveCount,
      neutralCount,
      negativeCount,
      feedbackIds: this.toFeedbackIds(r['feedbackIds']),
      positiveFeedbackIds: posIds,
      neutralFeedbackIds: neuIds,
      negativeFeedbackIds: negIds,
      painPoints: [],
      satisfactionPoints: [],
    };
  }

  private toFeedbackIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownTotal.set(0);
    this.drilldownPage.set(1);
    this.drilldownState = null;
    this.drilldownIds = [];
  }
}
