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
    rootCauses?: Array<{ feedbackIds?: number[] }>;
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
    const items = data.processImprovementItems;
    if (items?.length) {
      this.processImprovements.set(
        items.map((p, index) => {
          const rcIds = this.rootCauseFeedbackByIndex[index] ?? [];
          const linkedFeedbackIds = Array.isArray(p.linkedFeedbackIds)
            ? p.linkedFeedbackIds
            : Array.isArray(p.referenceFeedbackIds)
              ? p.referenceFeedbackIds
              : [];
          const mergedIds = rcIds.length >= linkedFeedbackIds.length ? rcIds : linkedFeedbackIds;
          const linkedCount = typeof p.linkedCount === 'number' ? p.linkedCount : mergedIds.length;
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
    if (!ids.length) return;
    this.drilldownTitle.set(row.text);
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.drilldownTotal.set(effectiveLinkedCount(row.linkedCount, row.linkedFeedbackIds, row.referenceFeedbackIds));
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
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      drilldownTitle: this.drilldownTitle(),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        this.drilldownTotal.set(res?.data?.total ?? this.drilldownIds.length);
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

  private listCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    return user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
  }
}
