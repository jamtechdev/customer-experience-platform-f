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
  drilldownModalTotal,
  formatProcessImprovementText,
  resolveDrilldownIds,
  extractQuotedTheme,
  finalizeProcessImprovementRows,
  resolveRootCauseIdsForProcessItem,
  priorityLabelFromClusterSize,
} from '../../../core/utils/drilldown-display';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';

export interface ProcessImprovementRow {
  text: string;
  cause?: string;
  causeTheme?: string;
  interpretation?: string;
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
  private drilldownThemeTitle = '';
  private drilldownRowIndex = -1;
  private rootCauses: Array<{ cause?: string; interpretation?: string; feedbackIds?: number[] }> = [];
  /** Prevents infinite retry loops when IDs are genuinely missing. */
  private drilldownThemeOnlyRetryDone = false;
  private drilldownRefreshTriggered = false;

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
    this.loading.set(true);
    this.twitterCxReportStore
      .loadTwitterCxReport(companyId, undefined, undefined, undefined, refreshFromServer)
      .subscribe({
        next: (res) => {
          if (res.message === 'stale_response' || res.message === 'snapshot_still_building') {
            // Keep existing rows visible while rebuild finishes — do not wipe the page.
            this.loading.set(false);
            return;
          }
          if (!res.success) {
            // Only clear when we got a definitive failure, not a transient rebuild race.
            if (!this.processImprovements().length) {
              this.processImprovements.set([]);
              this.managementTakeaways.set([]);
            }
            notifyCxReportLoadFailure(this.snackBar, res.message, this.importProcessing.isActive(), 'Close');
            this.loading.set(false);
            return;
          }
          if (res.data) {
            this.applyProcessReport(res.data);
          } else if (!this.processImprovements().length) {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
          }
          this.loading.set(false);
        },
        error: () => {
          this.processImprovements.set([]);
          this.managementTakeaways.set([]);
          this.loading.set(false);
          notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
        },
      });
  }

  private applyProcessReport(data: {
    rootCauses?: Array<{ cause?: string; interpretation?: string; feedbackIds?: number[] }>;
    processImprovementItems?: Array<{
      text: string;
      causeTheme?: string;
      referenceFeedbackIds?: number[];
      linkedFeedbackIds?: number[];
      linkedCount?: number;
    }>;
    processImprovements?: string[];
    managementTakeaways?: string[];
  }): void {
    const rootCauses = data.rootCauses ?? [];
    this.rootCauses = rootCauses;
    const items = data.processImprovementItems;
    if (items?.length) {
      const drafts = items.map((p, index) => {
        const itemIds = [
          ...(Array.isArray(p.linkedFeedbackIds) ? p.linkedFeedbackIds : []),
          ...(Array.isArray(p.referenceFeedbackIds) ? p.referenceFeedbackIds : []),
        ];
        const quotedTheme = extractQuotedTheme(p.text);
        const causeTheme = String(p.causeTheme || rootCauses[index]?.cause || quotedTheme || '').trim();
        const interpretation = String(rootCauses[index]?.interpretation || '').trim();
        const mergedIds = resolveRootCauseIdsForProcessItem(rootCauses, {
          causeTheme,
          quotedTheme,
          index,
          itemIds,
        });
        // Count must equal resolvable feedback IDs — never trust a phantom linkedCount alone.
        const linkedCount = mergedIds.length;
        return {
          priority: priorityLabelFromClusterSize(linkedCount),
          action: String(p.text ?? '')
            .replace(/\(\d+ negative-linked row\(s\)\)/i, '')
            .replace(/\(\d+ linked feedback row\(s\)\)/i, '')
            .trim(),
          owner: '',
          impact: '',
          horizon: '',
          causeTheme,
          cause: causeTheme,
          interpretation: interpretation || undefined,
          sampleText: interpretation || undefined,
          linkedFeedbackIds: mergedIds,
          referenceFeedbackIds: mergedIds,
          linkedCount,
        };
      });
      const finalized = finalizeProcessImprovementRows(drafts);
      this.processImprovements.set(
        finalized
          .map((row) => {
            const ids = resolveDrilldownIds(row.linkedFeedbackIds, row.referenceFeedbackIds);
            return {
              text: row.text,
              cause: row.causeTheme || row.cause,
              causeTheme: row.causeTheme || row.cause,
              interpretation: row.interpretation,
              referenceFeedbackIds: ids,
              linkedFeedbackIds: ids,
              linkedCount: ids.length,
            };
          })
          .filter((row) => row.text.trim().length > 0)
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
    let ids = resolveDrilldownIds(row.linkedFeedbackIds, row.referenceFeedbackIds);
    let themeTitle = String(row.causeTheme || row.cause || extractQuotedTheme(row.text) || '').trim();
    if (!themeTitle || themeTitle === 'this theme') {
      // Pricing / billing PE actions often have no quoted theme — derive from action text.
      const billingHint = String(row.text || '');
      if (/pricing|discount|indirim|charge|billing|ücret|ucret|promo|promotion|transparency/i.test(billingHint)) {
        themeTitle = 'Unfair Charges Complaints';
      }
    }
    // Recover IDs from root causes when the row still has a theme but empty/stale id lists.
    if (!ids.length && themeTitle && themeTitle !== 'this theme') {
      ids = resolveRootCauseIdsForProcessItem(this.rootCauses, {
        causeTheme: themeTitle,
        quotedTheme: extractQuotedTheme(row.text),
        index: 0,
        itemIds: [],
      });
    }
    if (!ids.length && this.rootCauses.length) {
      // Last resort: union billing / brand root-cause IDs so the modal can still open.
      ids = resolveRootCauseIdsForProcessItem(this.rootCauses, {
        causeTheme: themeTitle || 'Unfair Charges Complaints',
        quotedTheme: extractQuotedTheme(row.text),
        index: Math.max(0, this.processImprovements().indexOf(row)),
        itemIds: [],
      });
    }
    if (!ids.length) {
      this.snackBar.open(
        'No linked feedback IDs are available for this recommendation. Refresh the CX report to rebuild references.',
        'Close',
        { duration: 5000 }
      );
      return;
    }
    this.drilldownRowIndex = this.processImprovements().indexOf(row);
    this.drilldownThemeTitle = themeTitle && themeTitle !== 'this theme' ? themeTitle : '';
    this.drilldownTitle.set(this.displayText({ ...row, linkedFeedbackIds: ids, referenceFeedbackIds: ids, linkedCount: ids.length }));
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.drilldownTotal.set(ids.length);
    this.drilldownThemeOnlyRetryDone = false;
    this.drilldownRefreshTriggered = false;
    this.loadDrilldownPage(1);
  }

  referenceCount(row: ProcessImprovementRow): number {
    return drilldownModalTotal(resolveDrilldownIds(row.linkedFeedbackIds, row.referenceFeedbackIds));
  }

  displayText(row: ProcessImprovementRow): string {
    const count = this.referenceCount(row);
    return formatProcessImprovementText(row.text, count, row.causeTheme || row.cause, row.interpretation);
  }

  loadDrilldownPage(page: number, themeOnly = false): void {
    const requestIds = themeOnly ? [] : this.drilldownIds;
    const themeTitle =
      this.drilldownThemeTitle ||
      (/pricing|discount|indirim|charge|billing|ücret|ucret|promo|promotion|transparency/i.test(this.drilldownTitle())
        ? 'Unfair Charges Complaints'
        : '') ||
      undefined;
    if (!requestIds.length && !themeTitle) {
      this.drilldownRows.set([]);
      this.drilldownTotal.set(0);
      return;
    }
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    // Theme-only retry forces backend stale-ID recovery from the active import when snapshot IDs are gone.
    this.analysisService.getFeedbackByIds(companyId, requestIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: true,
      sentiment: 'negative',
      context: 'negative-linked process improvement',
      themeTitle: themeTitle || undefined,
      drilldownTitle: this.drilldownTitle(),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        const list = res?.data?.list || [];
        this.drilldownRows.set(list);
        const resolvedTotal = Number(res?.data?.total ?? 0);
        const expected = drilldownModalTotal(this.drilldownIds);
        const nextTotal = resolvedTotal > 0 ? resolvedTotal : list.length;
        this.drilldownTotal.set(nextTotal);
        const matchedIds = Array.isArray(res?.data?.matchedIds)
          ? (res.data.matchedIds || []).map((id) => Number(id)).filter((id) => id > 0)
          : [];
        if (nextTotal > 0) {
          this.syncProcessReferenceCount(nextTotal, matchedIds);
          return;
        }
        // Snapshot IDs empty → rebuild from theme against the active CSV import.
        if (!themeOnly && expected > 0 && !this.drilldownThemeOnlyRetryDone && themeTitle) {
          this.drilldownThemeOnlyRetryDone = true;
          this.loadDrilldownPage(page, true);
          return;
        }
        if (expected > 0 && !this.drilldownRefreshTriggered) {
          this.drilldownRefreshTriggered = true;
          this.snackBar.open(
            'Linked feedback references are out of date. Refreshing the CX report to rebuild them…',
            'Close',
            { duration: 6000 }
          );
          this.closeDrilldown();
          this.loadProcessData(true);
          return;
        }
        if (expected > 0) {
          this.snackBar.open(
            'Linked feedback IDs could not be loaded. Wait for the CX report refresh to finish, then open references again.',
            'Close',
            { duration: 7000 }
          );
        }
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
        this.drilldownTotal.set(0);
        if (!themeOnly && !this.drilldownThemeOnlyRetryDone && themeTitle) {
          this.drilldownThemeOnlyRetryDone = true;
          this.loadDrilldownPage(page, true);
          return;
        }
        this.snackBar.open(
          'Could not load related feedback. Try Refresh on Process Enhancement, then open references again.',
          'Close',
          { duration: 6000 }
        );
      },
    });
  }

  /** Keep "View references (N)" equal to modal "of N". */
  private syncProcessReferenceCount(total: number, matchedIds: number[]): void {
    if (total <= 0) return;
    const ids = resolveDrilldownIds(matchedIds.length ? matchedIds : this.drilldownIds).slice(0, total);
    if (!ids.length) return;
    this.drilldownIds = ids;
    const idx = this.drilldownRowIndex;
    if (idx < 0) return;
    this.processImprovements.update((rows) =>
      rows.map((row, i) =>
        i === idx
          ? {
              ...row,
              linkedFeedbackIds: ids,
              referenceFeedbackIds: ids,
              linkedCount: total,
            }
          : row
      )
    );
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
    this.drilldownThemeTitle = '';
    this.drilldownRowIndex = -1;
    this.drilldownThemeOnlyRetryDone = false;
  }
}
