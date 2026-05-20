import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
}

@Component({
  selector: 'app-root-cause-analysis',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule,
    OllamaLoader
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

  loading = signal(false);
  reanalyzing = signal(false);
  rootCauses = signal<RootCause[]>([]);
  selectedCause = signal<RootCause | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<
    Array<{
      id: number;
      content: string;
      contentSummary?: string;
      relevanceReason?: string;
      source: string;
      date: string;
      author?: string;
      sentiment: string;
      score: number;
    }>
  >([]);
  displayedColumns: string[] = ['title', 'category', 'priority', 'frequency', 'severity', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  emptyHint = signal<string | null>(null);

  ngOnInit(): void {
    this.loadRootCauses();
    this.importStatusSub = this.websocket.onCSVImportStatus().subscribe((payload: CSVImportStatusEvent) => {
      if (payload?.status === 'completed') {
        this.loadRootCauses();
        this.snackBar.open(
          'Import finished. Root causes are updated in the background—click Re-run analysis if the list is still empty.',
          'Close',
          { duration: 6000 }
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.importStatusSub?.unsubscribe();
  }

  /** Re-runs server-side extraction on negative feedback (creates additional rows; refreshes list). */
  runRootCauseAnalysis(): void {
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    this.reanalyzing.set(true);
    this.analysisService.analyzeRootCauses(companyId, 50).subscribe({
      next: (res) => {
        this.reanalyzing.set(false);
        if (res.success) {
          this.snackBar.open('Root cause analysis updated', 'Close', { duration: 3000 });
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

  loadRootCauses(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
    this.analysisService.getRootCauses(companyId).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          const mapped = (response.data || []).map((item: any) => ({
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
          this.emptyHint.set(
            mapped.length === 0
              ? 'No root causes yet. They are created after CSV import (batch). Use Re-run analysis to refresh.'
              : null
          );
        } else {
          this.rootCauses.set([]);
          this.totalItems = 0;
          this.emptyHint.set('No root causes yet. Run analysis after importing feedback, or click Re-run analysis.');
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

  t(key: string): string {
    return this.translationService.translate(key);
  }

  rootCauseRows(): RootCauseChartRow[] {
    return this.rootCauses()
      .map((c) => ({
        id: c.id,
        cause: this.painPointTitle(c),
        count: c.frequency || 0,
        interpretation: this.painPointSummary(c),
        feedbackIds: c.feedbackIds?.length ? c.feedbackIds : [],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
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
  }

  relinkRecords(row: RootCauseChartRow, causeId?: number): void {
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
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
          this.openRelatedRecords({ ...row, feedbackIds: ids });
        } else {
          this.snackBar.open(res.message || 'Re-link failed', 'Close', { duration: 4000 });
        }
      },
      error: () => this.snackBar.open('Re-link request failed', 'Close', { duration: 4000 }),
    });
  }

  openRelatedRecords(row: RootCauseChartRow): void {
    if (!row.feedbackIds?.length) {
      this.snackBar.open('No linked records. Try Re-link records.', 'Close', { duration: 3500 });
      return;
    }
    this.drilldownTitle.set(row.cause);
    this.drilldownOpen.set(true);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId || 1);
    this.analysisService.getFeedbackByIds(companyId, row.feedbackIds).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res.success && Array.isArray(res.data?.list)) {
          this.drilldownRows.set(res.data.list);
        } else {
          this.snackBar.open(res.message || 'Could not load related records', 'Close', { duration: 5000 });
          this.closeDrilldown();
        }
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.snackBar.open('Could not load related records', 'Close', { duration: 4000 });
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
}
