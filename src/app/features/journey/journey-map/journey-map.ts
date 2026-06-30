import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { alignLinkedCountInText, drilldownModalTotal, effectiveLinkedCount, resolveDrilldownIds } from '../../../core/utils/drilldown-display';
import { TranslationService } from '../../../core/services/translation.service';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { environment } from '../../../../environments/environment';
import { ApiResponse, TwitterCxReportDto } from '../../../core/models';
import { hasCxReportPayload } from '../../../core/utils/twitter-cx-report-load';

interface JourneyStage {
  id: number;
  name: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  painPoints: string[];
  satisfactionPoints: string[];
  satisfactionReferenceIds: number[];
  dissatisfactionReferenceIds: number[];
  satisfactionFeedbackIds: number[];
  dissatisfactionFeedbackIds: number[];
  satisfactionCount: number;
  dissatisfactionCount: number;
}

@Component({
  selector: 'app-journey-map',
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './journey-map.html',
  styleUrl: './journey-map.css',
})
export class JourneyMap implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  protected readonly importProcessing = inject(ImportProcessingService);
  private translationService = inject(TranslationService);
  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];
  private heatmapByStage = signal<Record<string, { positive: number[]; negative: number[] }>>({});
  private refreshSub?: Subscription;

  loading = signal(false);
  journeyStages = signal<JourneyStage[]>([]);
  readonly pageSize = 20;
  page = signal(1);
  pagedJourneyStages = computed(() => {
    const all = this.journeyStages();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.journeyStages().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });

  readonly flowStepTarget = 3;

  ngOnInit(): void {
    this.loadJourneyData();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadJourneyData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadJourneyData(): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    const cached = this.twitterCxReportStore.getCachedReport(companyId);
    if (cached?.success && cached.data) {
      this.applyCxReport(cached);
      this.loading.set(false);
    } else if (!this.twitterCxReportStore.hasCachedReport(companyId)) {
      this.loading.set(true);
    }

    const watchdog = setTimeout(() => this.loading.set(false), environment.cxReportTimeout || 120000);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, false).subscribe({
      next: (response) => {
        const hasData = response.success && hasCxReportPayload(response.data);
        if (
          (response.message === 'stale_response' || response.message === 'snapshot_still_building') &&
          !hasData
        ) {
          return;
        }
        clearTimeout(watchdog);
        if (!response.success) {
          if (!cached?.success) {
            this.journeyStages.set([]);
            this.page.set(1);
          }
          notifyCxReportLoadFailure(this.snackBar, response.message, this.importProcessing.isActive(), 'Close');
          this.loading.set(false);
          return;
        }
        this.applyCxReport(response);
        this.loading.set(false);
      },
      error: () => {
        clearTimeout(watchdog);
        this.loading.set(false);
        if (!cached?.success) {
          notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
          this.journeyStages.set([]);
          this.page.set(1);
        }
      },
    });
  }

  private applyCxReport(response: ApiResponse<TwitterCxReportDto>): void {
    if (!response.success || !response.data) return;

    const heatmap = Array.isArray(response.data.heatmapPct) ? response.data.heatmapPct : [];
    const heatmapMap: Record<string, { positive: number[]; negative: number[] }> = {};
    for (const h of heatmap) {
      const stage = String((h as { stage?: string }).stage ?? '');
      if (!stage) continue;
      heatmapMap[stage] = {
        positive: this.toIds((h as { positiveFeedbackIds?: number[] }).positiveFeedbackIds),
        negative: this.toIds((h as { negativeFeedbackIds?: number[] }).negativeFeedbackIds),
      };
    }
    this.heatmapByStage.set(heatmapMap);

    let rows = Array.isArray(response.data.journeyRows) ? response.data.journeyRows : [];
    if (rows.length === 0 && heatmap.length > 0) {
      rows = heatmap.map((h: any) => ({
        stage: String(h?.stage ?? ''),
        satisfaction: '—',
        dissatisfaction: '—',
        satisfactionSummary: '',
        dissatisfactionSummary: '',
        feedbackCount: Number(h?.total ?? 0),
        satisfactionFeedbackIds: this.toIds(h?.positiveFeedbackIds),
        dissatisfactionFeedbackIds: this.toIds(h?.negativeFeedbackIds),
        satisfactionCount: Number(h?.positiveCount ?? h?.positive ?? 0),
        dissatisfactionCount: Number(h?.negativeCount ?? h?.negative ?? 0),
      }));
    }

    if (rows.length === 0) {
      this.journeyStages.set([]);
      this.page.set(1);
      return;
    }

    rows = rows.filter(
      (r: any) =>
        Number(r?.feedbackCount ?? 0) > 0 ||
        Number(r?.satisfactionCount ?? 0) > 0 ||
        Number(r?.dissatisfactionCount ?? 0) > 0 ||
        Number(r?.total ?? 0) > 0 ||
        Number(r?.positiveCount ?? r?.positive ?? 0) > 0 ||
        Number(r?.negativeCount ?? r?.negative ?? 0) > 0
    );

    if (rows.length === 0) {
      this.journeyStages.set([]);
      this.page.set(1);
      return;
    }

    this.journeyStages.set(
      rows.map((r: any, idx: number) => {
        const stage = String(r?.stage ?? '');
        const heat = heatmapMap[stage];
        const satIds = this.mergeIds(
          this.toIds(r?.satisfactionFeedbackIds),
          this.toIds(r?.satisfactionReferenceIds),
          heat?.positive
        );
        const disIds = this.mergeIds(
          this.toIds(r?.dissatisfactionFeedbackIds),
          this.toIds(r?.dissatisfactionReferenceIds),
          heat?.negative
        );
        const satisfactionCount = satIds.length;
        const dissatisfactionCount = disIds.length;
        return {
          id: idx + 1,
          name: stage,
          satisfactionScore: 0,
          dissatisfactionScore: 0,
          feedbackCount: typeof r?.feedbackCount === 'number' ? r.feedbackCount : 0,
          painPoints: [String(r?.dissatisfactionSummary ?? r?.dissatisfaction ?? '')].filter(Boolean),
          satisfactionPoints: [String(r?.satisfactionSummary ?? r?.satisfaction ?? '')].filter(Boolean),
          satisfactionReferenceIds: satIds,
          dissatisfactionReferenceIds: disIds,
          satisfactionFeedbackIds: satIds,
          dissatisfactionFeedbackIds: disIds,
          satisfactionCount,
          dissatisfactionCount,
        };
      })
    );
    this.page.set(1);
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.journeyStages().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  getSatisfactionColor(score: number): string {
    // Backend returns satisfactionScore in 0..1 range; UI shows it as percentage.
    const pct = score * 100;
    if (pct >= 70) return 'satisfaction-high';
    if (pct >= 50) return 'satisfaction-medium';
    return 'satisfaction-low';
  }

  thirdFlowMilestoneMet(): boolean {
    const stages = this.journeyStages();
    if (stages.length < this.flowStepTarget) return false;
    return stages.slice(0, this.flowStepTarget).every((s) => s.feedbackCount > 0);
  }

  flowStagesWithDataInFirstThree(): number {
    return this.journeyStages()
      .slice(0, this.flowStepTarget)
      .filter((s) => s.feedbackCount > 0).length;
  }

  openReferences(stageName: string, polarity: 'satisfaction' | 'dissatisfaction', ids: number[], displayTotal: number): void {
    const unique = resolveDrilldownIds(ids);
    if (!unique.length && displayTotal <= 0) return;
    this.drilldownTitle.set(`${stageName} · ${polarity}`);
    this.drilldownOpen.set(true);
    this.drilldownIds = unique;
    this.drilldownTotal.set(drilldownModalTotal(unique));
    this.loadDrilldownPage(1);
  }

  satisfactionDrilldownIds(row: JourneyStage): number[] {
    return resolveDrilldownIds(row.satisfactionFeedbackIds, row.satisfactionReferenceIds);
  }

  dissatisfactionDrilldownIds(row: JourneyStage): number[] {
    return resolveDrilldownIds(row.dissatisfactionFeedbackIds, row.dissatisfactionReferenceIds);
  }

  satisfactionReferenceTotal(row: JourneyStage): number {
    return effectiveLinkedCount(row.satisfactionCount, row.satisfactionFeedbackIds, row.satisfactionReferenceIds);
  }

  dissatisfactionReferenceTotal(row: JourneyStage): number {
    return effectiveLinkedCount(row.dissatisfactionCount, row.dissatisfactionFeedbackIds, row.dissatisfactionReferenceIds);
  }

  satisfactionDisplay(row: JourneyStage): string {
    const n = this.satisfactionReferenceTotal(row);
    if (!n) return '-';
    const raw = row.satisfactionPoints[0] || '';
    return alignLinkedCountInText(raw, n) || `Positive signals at ${row.name} — ${n} linked feedback row(s).`;
  }

  dissatisfactionDisplay(row: JourneyStage): string {
    const n = this.dissatisfactionReferenceTotal(row);
    if (!n) return '-';
    const raw = row.painPoints[0] || '';
    return alignLinkedCountInText(raw, n) || `Negative themes at ${row.name} — ${n} linked feedback row(s).`;
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: false,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        this.drilldownTotal.set(res?.data?.total ?? drilldownModalTotal(this.drilldownIds));
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownTotal.set(0);
      },
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
  }

  flowMilestoneMessage(): string {
    const stages = this.journeyStages();
    if (stages.length === 0) return '';
    if (stages.length < this.flowStepTarget) {
      return `Add at least ${this.flowStepTarget} journey stages (touchpoints) so the flow can run through the third step.`;
    }
    if (this.thirdFlowMilestoneMet()) {
      return 'Third-flow milestone met: the first three stages all have feedback linked.';
    }
    const n = this.flowStagesWithDataInFirstThree();
    return `Flow progress: ${n}/3 of the first three stages have feedback. Map CSV touchpoints or categories to each stage so the journey completes through step three.`;
  }

  private listCompanyId(): number {
    return resolveAppCompanyId(this.authService.currentUser());
  }

  private toIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  }

  private mergeIds(...lists: Array<number[] | undefined>): number[] {
    const merged: number[] = [];
    for (const list of lists) {
      if (!list?.length) continue;
      merged.push(...list);
    }
    return [...new Set(merged)];
  }
}
