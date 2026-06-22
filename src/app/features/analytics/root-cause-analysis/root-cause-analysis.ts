import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslationService } from '../../../core/services/translation.service';
import { CXWebSocketService, type CSVImportStatusEvent } from '../../../core/services/cx-websocket.service';
import { Subscription } from 'rxjs';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { drilldownModalTotal } from '../../../core/utils/drilldown-display';

interface RootCauseStructuredInsights {
  painPointTitle?: string;
  summary: string;
  examples?: string[];
}

interface RootCause {
  id: number;
  title: string;
  category: string;
  priority: string;
  severity: number;
  frequency: number;
  description: string;
  feedbackIds: number[];
  structuredInsights?: RootCauseStructuredInsights | null;
}

interface RootCauseChartRow {
  id?: number;
  cause: string;
  count: number;
  interpretation: string;
  feedbackIds: number[];
  isUncategorized?: boolean;
}

@Component({
  selector: 'app-root-cause-analysis',
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './root-cause-analysis.html',
  styleUrl: './root-cause-analysis.css',
})
export class RootCauseAnalysis implements OnInit, OnDestroy {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private websocket = inject(CXWebSocketService);
  private importStatusSub?: Subscription;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private autoRefreshAttempts = 0;
  private readonly maxAutoRefreshAttempts = 20;

  loading = signal(false);
  reanalyzing = signal(false);
  rootCauses = signal<RootCause[]>([]);
  selectedCause = signal<RootCause | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownState: { row: RootCauseChartRow; allowRelink: boolean } | null = null;
  displayedColumns: string[] = ['title', 'category', 'priority', 'frequency', 'severity', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  emptyHint = signal<string | null>(null);
  coverage = signal<RootCauseCoverage | null>(null);

  ngOnInit(): void {
    this.loadRootCauses();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.startAutoRefreshRootCauses();
      } else if (payload?.status === 'processing') {
        this.startAutoRefreshRootCauses();
      }
    });
    this.importStatusSub.add(
      this.websocket.onAnalyticsLifecycle().subscribe((event) => {
        if (event.type === 'datasetDeleted') {
          this.stopAutoRefreshRootCauses();
          this.loadRootCauses();
        } else if (
          event.type === 'datasetUploaded' ||
          event.type === 'analysisStarted' ||
          event.type === 'analysisCompleted'
        ) {
          this.startAutoRefreshRootCauses();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
    this.stopAutoRefreshRootCauses();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.selectedCause() && !this.drilldownOpen()) return;
    event.preventDefault();
    if (this.drilldownOpen()) {
      this.closeDrilldown();
      return;
    }
    this.closeRootCauseModal();
  }

  /** Re-runs server-side extraction on negative feedback (creates additional rows; refreshes list). */
  runRootCauseAnalysis(): void {
    const companyId = this.currentCompanyId();
    const ok = window.confirm(
      'Run root cause analysis now? This analyzes negative/relevant feedback, may call OpenAI if enabled, and will replace saved root-cause rows.'
    );
    if (!ok) return;

    this.reanalyzing.set(true);
    this.emptyHint.set('Root cause analysis is running. This may take a few minutes.');
    this.analysisService.analyzeRootCauses(companyId, 50).subscribe({
      next: (res) => {
        this.reanalyzing.set(false);
        if (res.success) {
          const count = Array.isArray(res.data) ? res.data.length : 0;
          this.snackBar.open(
            count > 0 ? `Root cause analysis updated: ${count} cause(s) found.` : 'Analysis finished, but no root causes were generated.',
            'Close',
            { duration: 5000 }
          );
          this.loadRootCauses();
        } else {
          this.snackBar.open(res.message || 'Analysis failed', 'Close', { duration: 4000 });
        }
      },
      error: () => {
        this.reanalyzing.set(false);
        this.snackBar.open('Could not run root cause analysis', 'Close', { duration: 4000 });
      },
    });
  }

  loadRootCauses(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    const companyId = this.listCompanyId();
    this.analysisService.getRootCauses(companyId).subscribe({
      next: (response) => {
        const payload = response.data;
        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { list?: unknown[] })?.list)
            ? (payload as { list: unknown[] }).list
            : [];
        const nextCoverage =
          payload && !Array.isArray(payload) && (payload as { coverage?: RootCauseCoverage }).coverage
            ? (payload as { coverage: RootCauseCoverage }).coverage
            : null;

        if (response.success && rawList.length >= 0) {
          const mapped = rawList.map((item: any) => ({
            id: Number(item.id) || 0,
            title: typeof item.title === 'string' ? item.title : '',
            category: typeof item.category === 'string' ? item.category : '',
            priority: typeof item.priority === 'string' ? item.priority : '',
            severity: typeof item.severity === 'number' ? item.severity : 0,
            frequency: typeof item.frequency === 'number' ? item.frequency : 0,
            description: typeof item.description === 'string' ? item.description : '',
            feedbackIds: Array.isArray(item.feedbackIds)
              ? (item.feedbackIds as unknown[])
                  .map((x) => Number(x))
                  .filter((n) => Number.isFinite(n) && n > 0)
              : [],
            structuredInsights:
              item.structuredInsights && typeof item.structuredInsights === 'object'
                ? item.structuredInsights
                : null,
          }));
          this.rootCauses.set(mapped);
          this.totalItems = mapped.length;
          this.coverage.set(nextCoverage);
          this.emptyHint.set(
            mapped.length === 0
              ? 'No root causes yet. They are created after CSV import and will appear here automatically.'
              : null
          );
          if (mapped.length > 0) {
            this.stopAutoRefreshRootCauses();
          }
        } else {
          this.rootCauses.set([]);
          this.totalItems = 0;
          this.coverage.set(nextCoverage);
          this.emptyHint.set('No root causes yet. They will appear automatically after analysis finishes.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load root causes:', error);
        this.loading.set(false);
        this.rootCauses.set([]);
        this.totalItems = 0;
        if (error.status !== 500) {
          this.snackBar.open('Failed to load root causes', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private startAutoRefreshRootCauses(): void {
    this.loadRootCauses(false);
    if (this.autoRefreshTimer) return;
    this.autoRefreshAttempts = 0;
    this.emptyHint.set('Root causes are being prepared. This page will update automatically.');
    this.autoRefreshTimer = setInterval(() => {
      this.autoRefreshAttempts++;
      if (this.autoRefreshAttempts > this.maxAutoRefreshAttempts) {
        this.stopAutoRefreshRootCauses();
        return;
      }
      this.loadRootCauses(false);
    }, 3000);
  }

  private stopAutoRefreshRootCauses(): void {
    if (!this.autoRefreshTimer) return;
    clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
    this.autoRefreshAttempts = 0;
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }

  viewRootCause(cause: RootCause): void {
    this.selectedCause.set(cause);
  }

  viewCauseRecords(cause: RootCause): void {
    this.openRelatedRecords({
      id: cause.id,
      cause: this.painPointTitle(cause),
      count: cause.frequency || 0,
      interpretation: this.painPointSummary(cause),
      feedbackIds: cause.feedbackIds || [],
    });
  }

  closeRootCauseModal(): void {
    this.selectedCause.set(null);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedData(): RootCause[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.rootCauses().slice(start, end);
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  rootCauseRows(): RootCauseChartRow[] {
    const rows = this.rootCauses()
      .map((c) => ({
        id: c.id,
        cause: this.painPointTitle(c),
        count: c.frequency || 0,
        interpretation: this.painPointSummary(c),
        feedbackIds: c.feedbackIds?.length ? c.feedbackIds : [],
        isUncategorized: this.isUncategorizedCause(c),
      }))
      .sort((a, b) => b.count - a.count);

    const themed = rows.filter((row) => !row.isUncategorized).slice(0, 11);
    const uncategorized = rows.find((row) => row.isUncategorized);
    return uncategorized ? [...themed, uncategorized] : rows.slice(0, 12);
  }

  coverageSummary(): string | null {
    const stats = this.coverage();
    if (!stats || stats.totalNegative <= 0) return null;
    return this.t('rootCausePage.coverageSummary', {
      totalNegative: stats.totalNegative,
      categorized: stats.categorizedUnique,
      uncategorized: stats.uncategorized,
    });
  }

  private isUncategorizedCause(cause: RootCause): boolean {
    const title = this.painPointTitle(cause).toLocaleLowerCase('tr-TR');
    return title.includes('uncategorized') || title.includes('other negative feedback');
  }

  rootCauseMaxEffective(): number {
    const rows = this.rootCauseRows();
    return Math.max(1, ...rows.map((r) => r.count));
  }

  rootCauseBarFillPct(count: number): number {
    const max = this.rootCauseMaxEffective();
    return Math.min(100, max > 0 ? (count / max) * 100 : 0);
  }

  truncateChartLabel(text: string, maxLen = 28): string {
    const t = (text || '').trim();
    return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
  }

  painPointTitle(cause: RootCause): string {
    return cause.structuredInsights?.painPointTitle?.trim() || cause.title;
  }

  painPointSummary(cause: RootCause): string {
    return this.compactText(
      cause.structuredInsights?.summary?.trim() || cause.description || 'No summary available.',
      200
    );
  }

  painPointExamples(cause: RootCause): string[] {
    return (cause.structuredInsights?.examples || []).filter((x) => !!x?.trim()).slice(0, 3);
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownTitle.set('');
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownState = null;
  }

  relinkRecords(row: RootCauseChartRow, causeId?: number): void {
    const companyId = this.currentCompanyId();
    const id = causeId ?? row.id ?? this.rootCauses().find((c) => this.painPointTitle(c) === row.cause)?.id;
    if (!id) {
      this.snackBar.open('Cannot re-link: root cause id missing.', 'Close', { duration: 4000 });
      return;
    }
    this.analysisService.relinkRootCause(id, companyId).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Records re-linked. Opening list…', 'Close', { duration: 3000 });
          this.loadRootCauses();
          const data = res.data as unknown as { feedbackIds?: number[] };
          const ids = Array.isArray(data?.feedbackIds) ? data.feedbackIds : row.feedbackIds;
          this.openRelatedRecords({ ...row, feedbackIds: ids }, false);
        } else {
          this.snackBar.open(res.message || 'Re-link failed', 'Close', { duration: 4000 });
        }
      },
      error: () => this.snackBar.open('Re-link request failed', 'Close', { duration: 4000 }),
    });
  }

  openRelatedRecords(row: RootCauseChartRow, allowRelink = true): void {
    if (!row.feedbackIds?.length) {
      if (allowRelink && row.id) {
        this.relinkRecords(row);
      } else {
        this.snackBar.open('No linked records available for this cause.', 'Close', { duration: 3500 });
      }
      return;
    }
    this.drilldownTitle.set(row.cause);
    this.drilldownOpen.set(true);
    this.drilldownState = { row, allowRelink };
    this.drilldownTotal.set(drilldownModalTotal(row.feedbackIds));
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    const state = this.drilldownState;
    if (!state?.row.feedbackIds?.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
    this.analysisService.getFeedbackByIds(companyId, state.row.feedbackIds, {
      rootCauseId: state.row.id,
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: false,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res.success && Array.isArray(res.data?.list)) {
          if (!res.data.list.length && state.allowRelink && state.row.id && page === 1) {
            this.closeDrilldown();
            this.relinkRecords(state.row);
            return;
          }
          this.drilldownRows.set(res.data.list);
          this.drilldownTotal.set(drilldownModalTotal(state.row.feedbackIds));
        } else {
          this.snackBar.open(res.message || 'Could not load related records', 'Close', { duration: 5000 });
          this.closeDrilldown();
        }
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.snackBar.open('Could not load related records', 'Close', { duration: 4000 });
        this.drilldownTotal.set(0);
        this.closeDrilldown();
      },
    });
  }

  formatFeedbackDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  private compactText(text: string, max: number): string {
    const t = (text || '')
      .replace(/https?:\/\/[^\s]+/gi, ' ')
      .replace(/@\w+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length <= max) return t;
    return t.slice(0, max).replace(/\s+\S*$/, '') + '…';
  }

  private currentCompanyId(): number {
    return this.authService.currentUser()?.settings?.companyId || 1;
  }

  private listCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    return user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
  }
}
