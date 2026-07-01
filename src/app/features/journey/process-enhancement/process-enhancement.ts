import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import {
  formatProcessImprovementText,
  effectiveLinkedCount,
  resolveDrilldownIds,
  extractQuotedTheme,
  drilldownModalTotal,
} from '../../../core/utils/drilldown-display';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';

export interface ProcessImprovementRow {
  text: string;
  referenceFeedbackIds: number[];
  linkedFeedbackIds: number[];
  linkedCount: number;
}

@Component({
  selector: 'app-process-enhancement',
  standalone: true,
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './process-enhancement.html',
  styleUrl: './process-enhancement.css',
})
export class ProcessEnhancement implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);
  private refreshSub?: Subscription;

  loading = signal(false);
  processImprovements = signal<ProcessImprovementRow[]>([]);
  managementTakeaways = signal<string[]>([]);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];
  private rootCauseFeedbackByIndex: number[][] = [];

  ngOnInit(): void {
    this.loadProcessData();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadProcessData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadProcessData(refreshFromServer = false): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (refreshFromServer) {
      this.twitterCxReportStore.clearCachedReport(companyId);
    }
    const cached = !refreshFromServer ? this.twitterCxReportStore.getCachedReport(companyId) : undefined;
    if (cached?.success && cached.data) {
      this.applyProcessReport(cached.data);
      this.loading.set(false);
    } else if (!this.twitterCxReportStore.hasCachedReport(companyId)) {
      this.loading.set(true);
    }
    this.twitterCxReportStore
      .loadTwitterCxReport(companyId, undefined, undefined, undefined, false)
      .subscribe({
        next: (res) => {
          if (res.message === 'stale_response') {
            this.loading.set(false);
            return;
          }
          if (!res.success) {
            if (!cached?.success) {
              this.processImprovements.set([]);
              this.managementTakeaways.set([]);
            }
            notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), 'Close');
            this.loading.set(false);
            return;
          }
          if (res.data) {
            this.applyProcessReport(res.data);
          } else {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
          }
          this.loading.set(false);
        },
        error: () => {
          if (!cached?.success) {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
          }
          this.loading.set(false);
          notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
        },
      });
  }

  private applyProcessReport(data: {
    rootCauses?: Array<{ cause?: string; feedbackIds?: number[] }>;
    processImprovementItems?: Array<{
      text: string;
      referenceFeedbackIds?: number[];
      linkedFeedbackIds?: number[];
      linkedCount?: number;
    }>;
    processImprovements?: string[];
    managementTakeaways?: string[];
  }): void {
    const rootCauses = data.rootCauses ?? [];
    this.rootCauseFeedbackByIndex = rootCauses.map((rc) =>
      Array.isArray(rc.feedbackIds) ? rc.feedbackIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0) : []
    );
    const rootCauseIdsByTheme = new Map<string, number[]>();
    for (const rc of rootCauses) {
      const theme = String(rc.cause || '').trim().toLowerCase();
      const ids = Array.isArray(rc.feedbackIds)
        ? rc.feedbackIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
        : [];
      if (theme && ids.length) rootCauseIdsByTheme.set(theme, ids);
    }
    const items = data.processImprovementItems;
    if (items?.length) {
      this.processImprovements.set(
        items.map((p, index) => {
          const themeKey = extractQuotedTheme(p.text).toLowerCase();
          const themeMatch = rootCauses.find((rc) => String(rc.cause || '').trim().toLowerCase() === themeKey);
          const rcIds =
            (themeMatch?.feedbackIds?.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0) ??
              this.rootCauseFeedbackByIndex[index]) ||
            [];
          const linkedFeedbackIds = Array.isArray(p.linkedFeedbackIds)
            ? p.linkedFeedbackIds
            : Array.isArray(p.referenceFeedbackIds)
              ? p.referenceFeedbackIds
              : [];
          const mergedIds = rcIds.length >= linkedFeedbackIds.length ? rcIds : linkedFeedbackIds;
          const linkedCount = mergedIds.length;
          return {
            text: p.text,
            referenceFeedbackIds: mergedIds,
            linkedFeedbackIds: mergedIds,
            linkedCount,
          };
        })
      );
    } else {
      this.processImprovements.set(
        (data.processImprovements ?? []).map((text) => ({
          text,
          referenceFeedbackIds: [],
          linkedFeedbackIds: [],
          linkedCount: 0,
        }))
      );
    }
    this.managementTakeaways.set(data.managementTakeaways ?? []);
  }

  openReferences(row: ProcessImprovementRow): void {
    const ids = resolveDrilldownIds(row.linkedFeedbackIds, row.referenceFeedbackIds);
    const themeTitle = extractQuotedTheme(row.text);
    if (!ids.length && this.referenceCount(row) <= 0 && themeTitle === 'this theme') return;
    this.drilldownTitle.set(this.displayText(row));
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.drilldownTotal.set(ids.length ? this.referenceCount(row) : 0);
    this.loadDrilldownPage(1);
  }

  referenceCount(row: ProcessImprovementRow): number {
    return effectiveLinkedCount(row.linkedCount, row.linkedFeedbackIds, row.referenceFeedbackIds);
  }

  displayText(row: ProcessImprovementRow): string {
    const count = this.referenceCount(row);
    return formatProcessImprovementText(row.text, count);
  }

  loadDrilldownPage(page: number): void {
    const themeTitle = extractQuotedTheme(this.drilldownTitle());
    if (!this.drilldownIds.length && themeTitle === 'this theme') return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: false,
      themeTitle: themeTitle !== 'this theme' ? themeTitle : undefined,
      drilldownTitle: this.drilldownTitle(),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        const resolvedTotal = res?.data?.total ?? 0;
        this.drilldownTotal.set(resolvedTotal > 0 ? resolvedTotal : drilldownModalTotal(this.drilldownIds));
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
}
