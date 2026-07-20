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
import {
  alignLinkedCountInText,
  drilldownModalTotal,
  extractJourneyThemeFromSummary,
  extractQuotedTheme,
  journeyReferenceDrilldownIds,
  journeyReferenceTotal,
  repairJourneyThemeDisplay,
  resolveDrilldownIds,
} from '../../../core/utils/drilldown-display';
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
  stageFeedbackIds: number[];
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
  drilldownOriginalCount = signal<number | null>(null);
  drilldownUniqueCount = signal<number | null>(null);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];
  private drilldownStage = '';
  private drilldownPolarity: 'satisfaction' | 'dissatisfaction' | 'all' = 'satisfaction';
  private heatmapByStage = signal<Record<string, { positive: number[]; negative: number[]; neutral: number[]; all: number[]; total: number }>>({});
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
    this.loading.set(this.journeyStages().length === 0);

    const watchdog = setTimeout(() => this.loading.set(false), environment.cxReportTimeout || 120000);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, false).subscribe({
      next: (response) => {
        const hasData = response.success && hasCxReportPayload(response.data);
        if (
          (response.message === 'stale_response' || response.message === 'snapshot_still_building') &&
          !hasData
        ) {
          // Keep existing journey rows while rebuild is in flight.
          this.loading.set(false);
          return;
        }
        clearTimeout(watchdog);
        if (!response.success) {
          if (!this.journeyStages().length) {
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
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
        if (!this.journeyStages().length) {
          this.journeyStages.set([]);
          this.page.set(1);
        }
      },
    });
  }

  private applyCxReport(response: ApiResponse<TwitterCxReportDto>): void {
    if (!response.success || !response.data) return;

    const heatmap = Array.isArray(response.data.heatmapPct) ? response.data.heatmapPct : [];
    const heatmapMap: Record<string, { positive: number[]; negative: number[]; neutral: number[]; all: number[]; total: number }> = {};
    for (const h of heatmap) {
      const stage = String((h as { stage?: string }).stage ?? '');
      if (!stage) continue;
      heatmapMap[stage] = {
        positive: this.toIds((h as { positiveFeedbackIds?: number[] }).positiveFeedbackIds),
        negative: this.toIds((h as { negativeFeedbackIds?: number[] }).negativeFeedbackIds),
        neutral: this.toIds((h as { neutralFeedbackIds?: number[] }).neutralFeedbackIds),
        all: this.toIds((h as { feedbackIds?: number[] }).feedbackIds),
        total: Number((h as { total?: number }).total ?? 0),
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
        satisfactionCount: Number(h?.positiveCount ?? 0),
        dissatisfactionCount: Number(h?.negativeCount ?? 0),
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
        const satRefIds = this.toIds(r?.satisfactionReferenceIds);
        const disRefIds = this.toIds(r?.dissatisfactionReferenceIds);
        const satAllIds = this.mergeIds(this.toIds(r?.satisfactionFeedbackIds), heat?.positive);
        const disAllIds = this.mergeIds(this.toIds(r?.dissatisfactionFeedbackIds), heat?.negative);
        const satisfactionCount = journeyReferenceTotal({
          referenceIds: satRefIds,
          feedbackIds: satAllIds,
          linkedCount: r?.satisfactionCount,
        });
        const dissatisfactionCount = journeyReferenceTotal({
          referenceIds: disRefIds,
          feedbackIds: disAllIds,
          linkedCount: r?.dissatisfactionCount,
        });
        const feedbackCount =
          typeof r?.feedbackCount === 'number' && r.feedbackCount > 0
            ? r.feedbackCount
            : heat?.total && heat.total > 0
              ? heat.total
              : heat?.all.length || satisfactionCount + dissatisfactionCount;
        const stageFeedbackIds = this.mergeIds(satAllIds, disAllIds, heat?.all, heat?.neutral);
        const satSummary = this.cleanJourneySummary(String(r?.satisfactionSummary ?? r?.satisfaction ?? ''));
        const disSummary = this.cleanJourneySummary(String(r?.dissatisfactionSummary ?? r?.dissatisfaction ?? ''));
        return {
          id: idx + 1,
          name: stage,
          satisfactionScore: 0,
          dissatisfactionScore: 0,
          feedbackCount,
          painPoints: disSummary ? [disSummary] : [],
          satisfactionPoints: satSummary ? [satSummary] : [],
          satisfactionReferenceIds: satRefIds.length ? satRefIds : satAllIds,
          dissatisfactionReferenceIds: disRefIds.length ? disRefIds : disAllIds,
          satisfactionFeedbackIds: satAllIds,
          dissatisfactionFeedbackIds: disAllIds,
          satisfactionCount,
          dissatisfactionCount,
          stageFeedbackIds,
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

  openReferences(
    stageName: string,
    polarity: 'satisfaction' | 'dissatisfaction',
    ids: number[],
    displayTotal: number,
    summaryText?: string
  ): void {
    const unique = resolveDrilldownIds(ids);
    if (!unique.length && displayTotal <= 0) return;
    const theme = extractJourneyThemeFromSummary(summaryText || '');
    this.drilldownStage = stageName;
    this.drilldownPolarity = polarity;
    this.drilldownTitle.set(
      theme
        ? `${stageName} · ${polarity} · “${theme}”`
        : `${stageName} · ${polarity}`
    );
    this.drilldownOpen.set(true);
    this.drilldownIds = unique;
    // Button count and modal footer must start from the same number.
    this.drilldownTotal.set(unique.length > 0 ? unique.length : displayTotal);
    this.drilldownOriginalCount.set(null);
    this.drilldownUniqueCount.set(null);
    this.drilldownRows.set([]);
    this.drilldownLoading.set(true);
    this.loadDrilldownPage(1);
  }

  satisfactionDrilldownIds(row: JourneyStage): number[] {
    return journeyReferenceDrilldownIds({
      referenceIds: row.satisfactionReferenceIds,
      feedbackIds: row.satisfactionFeedbackIds,
    });
  }

  dissatisfactionDrilldownIds(row: JourneyStage): number[] {
    return journeyReferenceDrilldownIds({
      referenceIds: row.dissatisfactionReferenceIds,
      feedbackIds: row.dissatisfactionFeedbackIds,
    });
  }

  satisfactionReferenceTotal(row: JourneyStage): number {
    return journeyReferenceTotal({
      referenceIds: row.satisfactionReferenceIds,
      feedbackIds: row.satisfactionFeedbackIds,
      linkedCount: row.satisfactionCount,
    });
  }

  dissatisfactionReferenceTotal(row: JourneyStage): number {
    return journeyReferenceTotal({
      referenceIds: row.dissatisfactionReferenceIds,
      feedbackIds: row.dissatisfactionFeedbackIds,
      linkedCount: row.dissatisfactionCount,
    });
  }

  satisfactionDisplay(row: JourneyStage): string {
    const n = this.satisfactionReferenceTotal(row);
    const fromBackend = row.satisfactionPoints[0] || '';
    if (fromBackend && !this.isStaleJourneySummary(fromBackend, row.feedbackCount, n)) {
      const repaired = repairJourneyThemeDisplay(fromBackend, n, row.name, 'satisfaction', row.feedbackCount);
      return n > 0 ? alignLinkedCountInText(repaired, n) : repaired;
    }
    if (n > 0) {
      return n >= 3
        ? `Positive signals at ${row.name} — ${n} linked feedback row(s).`
        : `Early positive signals at ${row.name} — ${n} linked feedback row(s); more data needed for a confident theme.`;
    }
    const disN = this.dissatisfactionReferenceTotal(row);
    if (row.feedbackCount > 0 && disN === 0) {
      return `No strong positive themes among ${row.feedbackCount} mapped row(s) at ${row.name} — mostly neutral feedback.`;
    }
    return '—';
  }

  dissatisfactionDisplay(row: JourneyStage): string {
    const n = this.dissatisfactionReferenceTotal(row);
    const fromBackend = row.painPoints[0] || '';
    if (fromBackend && !this.isStaleJourneySummary(fromBackend, row.feedbackCount, n)) {
      const repaired = repairJourneyThemeDisplay(fromBackend, n, row.name, 'dissatisfaction', row.feedbackCount);
      return n > 0 ? alignLinkedCountInText(repaired, n) : repaired;
    }
    if (n > 0) {
      return n >= 3
        ? `Negative themes at ${row.name} — ${n} linked feedback row(s).`
        : `Early negative signals at ${row.name} — ${n} linked feedback row(s); more data needed for a confident theme.`;
    }
    const satN = this.satisfactionReferenceTotal(row);
    if (row.feedbackCount > 0 && satN === 0) {
      return `No negative themes among ${row.feedbackCount} mapped row(s) at ${row.name}.`;
    }
    return '—';
  }

  stageMappedTotal(row: JourneyStage): number {
    const idCount = row.stageFeedbackIds.length;
    return idCount > 0 ? idCount : row.feedbackCount;
  }

  isNeutralMappedStage(row: JourneyStage): boolean {
    return (
      row.feedbackCount > 0 &&
      this.satisfactionReferenceTotal(row) === 0 &&
      this.dissatisfactionReferenceTotal(row) === 0
    );
  }

  openStageMapped(row: JourneyStage): void {
    const ids = resolveDrilldownIds(row.stageFeedbackIds);
    const total = ids.length || row.feedbackCount;
    if (total <= 0) return;
    this.drilldownStage = row.name;
    this.drilldownPolarity = 'all';
    this.drilldownTitle.set(`${row.name} · all mapped feedback`);
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.drilldownTotal.set(ids.length > 0 ? drilldownModalTotal(ids) : total);
    this.drilldownOriginalCount.set(null);
    this.drilldownUniqueCount.set(null);
    this.drilldownRows.set([]);
    this.drilldownLoading.set(true);
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    const sentiment =
      this.drilldownPolarity === 'satisfaction'
        ? 'positive'
        : this.drilldownPolarity === 'dissatisfaction'
          ? 'negative'
          : undefined;
    const themeTitle = extractQuotedTheme(this.drilldownTitle());
    const hasTheme = themeTitle !== 'this theme';
    if (!this.drilldownIds.length && !hasTheme && !this.drilldownStage) return;

    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: false,
      // Always send themeTitle for journey map so oversized stage buckets can be narrowed.
      themeTitle: hasTheme ? themeTitle : undefined,
      drilldownTitle: this.drilldownTitle(),
      journeyStage: this.drilldownStage || undefined,
      ...(sentiment ? { sentiment } : {}),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        const resolvedTotal = Number(res?.data?.total ?? 0);
        const requested = drilldownModalTotal(this.drilldownIds);
        const nextTotal =
          resolvedTotal > 0 ? resolvedTotal : this.drilldownRows().length > 0 ? this.drilldownRows().length : requested;
        this.drilldownTotal.set(nextTotal);
        const matchedIds = Array.isArray((res?.data as { matchedIds?: number[] } | undefined)?.matchedIds)
          ? ((res.data as { matchedIds: number[] }).matchedIds || []).map((id) => Number(id)).filter((id) => id > 0)
          : [];
        this.syncJourneyReferenceCount(nextTotal, matchedIds);
        const original = Number((res?.data as { originalCount?: number } | undefined)?.originalCount);
        const unique = Number((res?.data as { uniqueCount?: number } | undefined)?.uniqueCount);
        this.drilldownOriginalCount.set(Number.isFinite(original) && original > 0 ? original : null);
        this.drilldownUniqueCount.set(Number.isFinite(unique) && unique > 0 ? unique : resolvedTotal || null);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownTotal.set(drilldownModalTotal(this.drilldownIds) || this.drilldownTotal());
        this.drilldownOriginalCount.set(null);
        this.drilldownUniqueCount.set(null);
      },
    });
  }

  /** Align card "View references (N)" with modal total after API filtering. */
  private syncJourneyReferenceCount(total: number, matchedIds: number[]): void {
    if (total <= 0 || !this.drilldownStage) return;
    const polarity = this.drilldownPolarity;
    if (polarity !== 'satisfaction' && polarity !== 'dissatisfaction') return;
    const ids = resolveDrilldownIds(matchedIds.length ? matchedIds : this.drilldownIds).slice(0, total);
    this.journeyStages.update((stages) =>
      stages.map((row) => {
        if (row.name !== this.drilldownStage) return row;
        if (polarity === 'satisfaction') {
          return {
            ...row,
            satisfactionCount: total,
            satisfactionReferenceIds: ids.length ? ids : row.satisfactionReferenceIds,
          };
        }
        return {
          ...row,
          dissatisfactionCount: total,
          dissatisfactionReferenceIds: ids.length ? ids : row.dissatisfactionReferenceIds,
        };
      })
    );
    // Keep subsequent page loads on the synced ID list so totals stay stable.
    if (ids.length) this.drilldownIds = ids;
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownOriginalCount.set(null);
    this.drilldownUniqueCount.set(null);
    this.drilldownIds = [];
    this.drilldownStage = '';
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

  private cleanJourneySummary(text: string): string {
    const t = text.trim();
    if (!t || t === '—' || t === '-' || t === '–') return '';
    return t;
  }

  /** Ignore backend copy that says 0 linked rows while the stage still has mapped volume. */
  private isStaleJourneySummary(text: string, feedbackCount: number, linkedN: number): boolean {
    if (feedbackCount <= 0) return false;
    if (/0 linked feedback row/i.test(text) && feedbackCount > linkedN) return true;
    if (linkedN <= 0 && /early (positive|negative) signals/i.test(text)) return true;
    return false;
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
