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
import { notifyCxReportLoadFailure, twitterCxReportFailureMessage, hasCxReportPayload, isCxReportResponsePending } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  drilldownModalTotal,
  heatmapCellIntensityPct,
  reconcileHeatmapStageCounts,
  resolveHeatmapDisplayPct,
} from '../../../core/utils/drilldown-display';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { environment } from '../../../../environments/environment';
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
  positiveDisplayPct?: string;
  neutralDisplayPct?: string;
  negativeDisplayPct?: string;
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
  heatmapFigureCaption = signal('');
  heatmapExcludedCount = signal<number | null>(null);
  heatmapExclusionBreakdown = signal<{
    charity_or_fundraising: number;
    insufficient_context: number;
  } | null>(null);
  heatmapMappingBasisBreakdown = signal<{
    persisted_stage: number;
    inferred_stage: number;
    default_awareness: number;
  } | null>(null);
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
  private drilldownOpenedCount = 0;
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
    const excluded = this.heatmapExcludedCount();
    const unmapped =
      excluded != null && excluded > 0
        ? excluded
        : saved != null && mapped > 0 && saved > mapped
          ? saved - mapped
          : null;
    if (csv != null && csv > 0 && saved === csv && mapped === csv) {
      return [{ icon: 'dataset', labelKey: 'heatmap.scopeUnified', value: csv }];
    }
    const items: Array<{ icon: string; labelKey: string; value: number | null }> = [
      { icon: 'upload_file', labelKey: 'heatmap.scopeCsv', value: csv },
      { icon: 'storage', labelKey: 'heatmap.scopeSaved', value: saved },
      { icon: 'grid_view', labelKey: 'heatmap.scopeMapped', value: mapped },
    ];
    if (unmapped != null && unmapped > 0) {
      items.push({ icon: 'block', labelKey: 'heatmap.scopeUnmapped', value: unmapped });
    }
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
    if (refreshFromServer) {
      this.twitterCxReportStore.clearCachedReport(companyId);
    }
    if (refreshFromServer || !this.stages().length) {
      this.loading.set(true);
    }
    this.error.set(null);
    const watchdog = setTimeout(() => this.loading.set(false), environment.cxReportTimeout || 120000);
    const useForceLive = forceLive || refreshFromServer;
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, useForceLive).subscribe({
      next: (res) => {
        const hasData = res.success && hasCxReportPayload(res.data);
        if ((res.message === 'stale_response' || res.message === 'snapshot_still_building') && !hasData) {
          clearTimeout(watchdog);
          // Keep existing heatmap if any; hide loader so refresh does not stick forever.
          this.loading.set(false);
          return;
        }
        clearTimeout(watchdog);
        if (!res.success) {
          if (isCxReportResponsePending(res, this.importProcessing.isActive())) {
            // Pending snapshot — show empty loader only when there is nothing to display yet.
            if (!this.stages().length) this.loading.set(true);
            else this.loading.set(false);
            return;
          }
          if (!this.stages().length) {
            this.stages.set([]);
            this.page.set(1);
            this.error.set(this.importProcessing.isActive() ? null : twitterCxReportFailureMessage(res.message));
          }
          notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), this.t('app.close'));
          this.loading.set(false);
          return;
        }
        this.applyHeatmapReport(res);
        this.loading.set(false);
      },
      error: () => {
        clearTimeout(watchdog);
        this.error.set(this.importProcessing.isActive() ? null : twitterCxReportFailureMessage());
        if (!this.stages().length) {
          notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), this.t('app.close'));
          this.stages.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
    });
  }

  private applyHeatmapReport(res: {
    success?: boolean;
    data?: {
      heatmapPct?: unknown[];
      heatmapFigureCaption?: string;
      dataset?: {
        total?: number;
        importedCsvRows?: number;
        heatmapMappedCount?: number;
        heatmapExcludedCount?: number;
        heatmapExclusionBreakdown?: {
          charity_or_fundraising: number;
          insufficient_context: number;
        };
        heatmapMappingBasisBreakdown?: {
          persisted_stage: number;
          inferred_stage: number;
          default_awareness: number;
        };
      };
      sentiment?: { total?: number };
    };
  }): void {
    if (!res.success || !res.data) return;
    this.error.set(null);
    this.cohortTotal.set(Number(res.data?.dataset?.total ?? res.data?.sentiment?.total ?? 0) || null);
    this.importedCsvRows.set(Number(res.data?.dataset?.importedCsvRows ?? 0) || null);
    this.rowsSaved.set(Number(res.data?.dataset?.total ?? 0) || null);
    this.heatmapFigureCaption.set(String(res.data?.heatmapFigureCaption || '').trim());
    const excluded = Number(res.data?.dataset?.heatmapExcludedCount);
    this.heatmapExcludedCount.set(Number.isFinite(excluded) && excluded > 0 ? excluded : null);
    this.heatmapExclusionBreakdown.set(res.data?.dataset?.heatmapExclusionBreakdown ?? null);
    this.heatmapMappingBasisBreakdown.set(res.data?.dataset?.heatmapMappingBasisBreakdown ?? null);
    if (Array.isArray(res.data?.heatmapPct)) {
      this.stages.set(res.data.heatmapPct.map((r: any) => this.mapHeatmapRow(r)));
      this.page.set(1);
    } else {
      this.stages.set([]);
      this.page.set(1);
    }
  }

  coveragePctLabel(): string {
    const saved = this.rowsSaved();
    const mapped = this.heatmapMappedTotal();
    if (saved == null || saved <= 0 || mapped <= 0) return '';
    const pct = Math.round((mapped / saved) * 1000) / 10;
    return `${mapped} mapped of ${saved} (${pct}%)`;
  }

  exclusionBreakdownNote(): string {
    const b = this.heatmapExclusionBreakdown();
    if (!b) return '';
    const parts: string[] = [];
    if (b.charity_or_fundraising > 0) {
      parts.push(`${b.charity_or_fundraising} charity/fundraising`);
    }
    if (b.insufficient_context > 0) {
      parts.push(`${b.insufficient_context} empty/insufficient content`);
    }
    return parts.length ? `Unmapped: ${parts.join('; ')}.` : '';
  }

  mappingBasisNote(): string {
    const b = this.heatmapMappingBasisBreakdown();
    if (!b) return '';
    const parts: string[] = [];
    if (b.persisted_stage > 0) parts.push(`${b.persisted_stage} saved stage`);
    if (b.inferred_stage > 0) parts.push(`${b.inferred_stage} inferred from text`);
    if (b.default_awareness > 0) parts.push(`${b.default_awareness} defaulted to Awareness`);
    return parts.length ? `Mapping basis: ${parts.join('; ')}.` : '';
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
    return heatmapCellIntensityPct(row.positiveCount, this.stageTotal(row));
  }

  negativePct(row: StageRow): number {
    return heatmapCellIntensityPct(row.negativeCount, this.stageTotal(row));
  }

  neutralPct(row: StageRow): number {
    return heatmapCellIntensityPct(row.neutralCount, this.stageTotal(row));
  }

  private stageTotal(row: StageRow): number {
    const sum = row.positiveCount + row.neutralCount + row.negativeCount;
    return sum > 0 ? sum : row.feedbackCount;
  }

  // Display labels that never round a small non-zero share down to "0%" (Finding 3).
  positivePctLabel(row: StageRow): string {
    return resolveHeatmapDisplayPct(row.positiveCount, this.stageTotal(row), row.positiveDisplayPct);
  }

  neutralPctLabel(row: StageRow): string {
    return resolveHeatmapDisplayPct(row.neutralCount, this.stageTotal(row), row.neutralDisplayPct);
  }

  negativePctLabel(row: StageRow): string {
    return resolveHeatmapDisplayPct(row.negativeCount, this.stageTotal(row), row.negativeDisplayPct);
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
    this.drilldownIds = unique.length ? unique : stage.feedbackIds.slice(0, displayCount);
    const opened = unique.length || displayCount;
    this.drilldownOpenedCount = opened;
    this.drilldownTotal.set(opened);
    this.drilldownTitle.set(`${stage.stageName} · ${label} (${opened.toLocaleString()} messages)`);
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
    const stage = this.drilldownState?.stage.stageName;
    const label = this.drilldownState?.label;
    if (!this.drilldownIds.length && !stage) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    const sentiment =
      label === 'positive' ? 'positive' : label === 'negative' ? 'negative' : label === 'neutral' ? 'neutral' : undefined;
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: true,
      journeyStage: stage,
      ...(sentiment ? { sentiment } : {}),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
        // Keep heatmap cell counts stable when modal opens.
        const opened = this.drilldownOpenedCount > 0 ? this.drilldownOpenedCount : drilldownModalTotal(this.drilldownIds);
        this.drilldownTotal.set(opened);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
        this.drilldownTotal.set(this.drilldownOpenedCount || 0);
      },
    });
  }

  private mapHeatmapRow(r: Record<string, unknown>): StageRow {
    const posIds = this.toFeedbackIds(r['positiveFeedbackIds']);
    const neuIds = this.toFeedbackIds(r['neutralFeedbackIds']);
    const negIds = this.toFeedbackIds(r['negativeFeedbackIds']);
    const feedbackIds = this.toFeedbackIds(r['feedbackIds']);
    const counts = reconcileHeatmapStageCounts({
      total: Number(r['total'] ?? 0),
      positiveCount: Number(r['positiveCount'] ?? 0),
      neutralCount: Number(r['neutralCount'] ?? 0),
      negativeCount: Number(r['negativeCount'] ?? 0),
      positiveFeedbackIds: posIds,
      neutralFeedbackIds: neuIds,
      negativeFeedbackIds: negIds,
      feedbackIds,
      positive: Number(r['positive'] ?? 0),
      neutral: Number(r['neutral'] ?? 0),
      negative: Number(r['negative'] ?? 0),
    });
    const { total: stageTotal, positiveCount, neutralCount, negativeCount } = counts;
    const positiveFeedbackIds = this.resolveSentimentIds(posIds, positiveCount, feedbackIds, negIds, neuIds);
    const neutralFeedbackIds = this.resolveSentimentIds(neuIds, neutralCount, feedbackIds, posIds, negIds);
    const negativeFeedbackIds = this.resolveSentimentIds(negIds, negativeCount, feedbackIds, posIds, neuIds);
    const posPct = Number(r['positive'] ?? 0);
    const negPct = Number(r['negative'] ?? 0);
    return {
      stageName: String(r['stage'] ?? 'Unknown'),
      satisfactionScore: posPct / 100,
      dissatisfactionScore: negPct / 100,
      feedbackCount: stageTotal,
      positiveCount,
      neutralCount,
      negativeCount,
      feedbackIds,
      positiveFeedbackIds,
      neutralFeedbackIds,
      negativeFeedbackIds,
      painPoints: [],
      satisfactionPoints: [],
      positiveDisplayPct: typeof r['positiveDisplayPct'] === 'string' ? r['positiveDisplayPct'] : undefined,
      neutralDisplayPct: typeof r['neutralDisplayPct'] === 'string' ? r['neutralDisplayPct'] : undefined,
      negativeDisplayPct: typeof r['negativeDisplayPct'] === 'string' ? r['negativeDisplayPct'] : undefined,
    };
  }

  private resolveSentimentIds(
    ids: number[],
    count: number,
    allIds: number[],
    otherA: number[],
    otherB: number[]
  ): number[] {
    if (ids.length > 0) return ids;
    if (count <= 0 || allIds.length === 0) return ids;
    const used = new Set([...otherA, ...otherB]);
    const available = allIds.filter((id) => !used.has(id));
    if (available.length >= count) return available.slice(0, count);
    if (count > 0 && otherA.length === 0 && otherB.length === 0) return allIds.slice(0, count);
    return available;
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
    this.drilldownOpenedCount = 0;
  }
}
