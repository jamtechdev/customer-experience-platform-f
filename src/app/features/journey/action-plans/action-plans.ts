import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActionPlanService, ActionPlanItem } from '../../../core/services/action-plan.service';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { formatApiDate, toInputDateValue } from '../../../core/utils/api-date';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { effectiveLinkedCount, syncActionPlanRowCounts, resolveDrilldownIds, finalizeActionPlanRows, priorityLabelFromClusterSize, resolveActionPlanRootCauseMeta, mergeRootCausesForDisplay } from '../../../core/utils/drilldown-display';

@Component({
  selector: 'app-action-plans',
  imports: [
    PageHeaderCard,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './action-plans.html',
  styleUrl: './action-plans.css',
})
export class ActionPlans implements OnInit, OnDestroy {
  private actionPlanService = inject(ActionPlanService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private refreshSub?: Subscription;
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);

  loading = signal(false);
  generating = signal(false);
  actionPlans = signal<ActionPlanItem[]>([]);
  readonly pageSize = 20;
  page = signal(1);
  actionPriorityFilter = signal<'all' | 'p1' | 'p2' | 'p3'>('all');
  pagedActionPlans = computed(() => {
    const all = this.actionPlans();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.filteredReportPlanRows().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });
  displayedColumns: string[] = ['title', 'priority', 'status', 'dueDate', 'actions'];
  readonly displayedPlanColumns = ['priority', 'action', 'owner', 'impact', 'horizon', 'sources'];
  reportPlanRows = signal<
    Array<{
      priority: string;
      action: string;
      owner: string;
      impact: string;
      horizon: string;
      causeTheme?: string;
      interpretation?: string;
      referenceFeedbackIds?: number[];
      linkedFeedbackIds?: number[];
      linkedCount?: number;
    }>
  >([]);
  filteredReportPlanRows = computed(() => {
    const filter = this.actionPriorityFilter();
    const rows = this.reportPlanRows();
    if (filter === 'all') return rows;
    return rows.filter((row) => (row.priority || '').trim().toLowerCase() === filter);
  });
  pagedReportPlanRows = computed(() => {
    const rows = this.filteredReportPlanRows();
    if (rows.length === 0) return [];
    const maxPage = Math.max(1, Math.ceil(rows.length / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  });
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
  private drilldownThemeTitle = '';
  private drilldownRowIndex = -1;
  showForm = signal(false);
  editingId = signal<number | null>(null);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      priority: ['medium', Validators.required],
      status: ['draft', Validators.required],
      dueDate: [null as string | null]
    });
  }

  ngOnInit(): void {
    this.loadActionPlans();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadActionPlans());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadActionPlans(refreshFromServer = false): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (refreshFromServer) {
      this.twitterCxReportStore.clearCachedReport(companyId);
    }
    this.loading.set(true);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, refreshFromServer).subscribe({
      next: (response) => {
        if (response.message === 'stale_response') {
          return;
        }
        if (!response.success) {
          this.reportPlanRows.set([]);
          this.actionPlans.set([]);
          this.page.set(1);
          notifyCxReportLoadFailure(this.snackBar, response.message, this.importProcessing.isActive(), 'Close');
          this.loading.set(false);
          return;
        }
        this.applyActionPlanReport(response);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.actionPlans.set([]);
        this.reportPlanRows.set([]);
        this.page.set(1);
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
      }
    });
  }

  private applyActionPlanReport(response: { success?: boolean; data?: any }): void {
    if (!response.success || !Array.isArray(response.data?.actionPlan)) {
      this.reportPlanRows.set([]);
      this.actionPlans.set([]);
      this.page.set(1);
      return;
    }
    const rootCauses = mergeRootCausesForDisplay(
      Array.isArray(response.data.rootCauses) ? response.data.rootCauses : []
    );
    const rootCauseLikes = rootCauses.map((rc) => ({
      cause: String(rc['cause'] || '').trim(),
      interpretation: String(rc['interpretation'] || '').trim(),
      feedbackIds: Array.isArray(rc['feedbackIds'])
        ? (rc['feedbackIds'] as number[]).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
        : [],
    }));
    const drafts = response.data.actionPlan.map((x: any, index: number) => {
      const meta = resolveActionPlanRootCauseMeta(
        {
          action: String(x.action ?? ''),
          causeTheme: String(x.causeTheme || x.cause || '').trim() || undefined,
          linkedFeedbackIds: Array.isArray(x.linkedFeedbackIds) ? x.linkedFeedbackIds : undefined,
          referenceFeedbackIds: Array.isArray(x.referenceFeedbackIds) ? x.referenceFeedbackIds : undefined,
        },
        rootCauseLikes,
        index
      );
      const linkedCount = meta.feedbackIds.length;
      return {
        priority: priorityLabelFromClusterSize(linkedCount),
        action: String(x.action ?? '').replace(/\(\d+ linked feedback row\(s\)\)/i, '').trim(),
        owner: x.owner ?? '',
        impact: x.impact ?? '',
        horizon: x.horizon ?? '',
        causeTheme: meta.cause || undefined,
        cause: meta.cause || undefined,
        interpretation: meta.interpretation || undefined,
        sampleText: meta.interpretation || undefined,
        referenceFeedbackIds: meta.feedbackIds,
        linkedFeedbackIds: meta.feedbackIds,
        linkedCount,
      };
    });
    const collapsed = finalizeActionPlanRows(drafts);
    this.reportPlanRows.set(
      collapsed.map((row) => {
        const synced = syncActionPlanRowCounts(row);
        return {
          ...synced,
          owner: synced.owner ?? '',
          horizon: synced.horizon ?? '',
          priority: priorityLabelFromClusterSize(synced.linkedCount || 0),
        };
      })
    );
    const mapped = this.reportPlanRows().map((x, idx) => ({
      id: idx + 1,
      title: x.action,
      description: x.impact,
      priority: x.priority.toLowerCase(),
      status: 'draft',
      dueDate: undefined,
    })) as ActionPlanItem[];
    this.actionPlans.set(mapped);
    this.page.set(1);
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  setActionPriorityFilter(value: 'all' | 'p1' | 'p2' | 'p3'): void {
    this.actionPriorityFilter.set(value);
    this.page.set(1);
  }

  countByPriority(priority: 'p1' | 'p2' | 'p3'): number {
    const rows = this.reportPlanRows();
    if (priority === 'p3') {
      return rows.filter((row) => {
        const p = (row.priority || '').trim().toLowerCase();
        return p !== 'p1' && p !== 'p2';
      }).length;
    }
    return rows.filter((row) => (row.priority || '').trim().toLowerCase() === priority).length;
  }

  openReferences(row: {
    action: string;
    causeTheme?: string;
    cause?: string;
    referenceFeedbackIds?: number[];
    linkedFeedbackIds?: number[];
    linkedCount?: number;
  }): void {
    const ids = resolveDrilldownIds(row.linkedFeedbackIds, row.referenceFeedbackIds);
    if (!ids.length) return;
    this.drilldownRowIndex = this.reportPlanRows().findIndex((r) => r === row);
    this.drilldownThemeTitle = String(row.causeTheme || row.cause || '').trim();
    this.drilldownTitle.set(this.displayAction(row));
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    // Snapshot ID count (e.g. 314) is provisional — modal uses unique after RT group.
    this.drilldownTotal.set(this.referenceCount(row));
    this.drilldownOriginalCount.set(null);
    this.drilldownUniqueCount.set(null);
    this.loadDrilldownPage(1);
  }

  referenceCount(row: { linkedCount?: number; linkedFeedbackIds?: number[]; referenceFeedbackIds?: number[] }): number {
    return effectiveLinkedCount(row.linkedCount, row.linkedFeedbackIds, row.referenceFeedbackIds);
  }

  displayAction(row: {
    action: string;
    causeTheme?: string;
    interpretation?: string;
    linkedFeedbackIds?: number[];
    referenceFeedbackIds?: number[];
    linkedCount?: number;
  }): string {
    return syncActionPlanRowCounts(row).action;
  }

  displayImpact(row: {
    impact?: string;
    linkedFeedbackIds?: number[];
    referenceFeedbackIds?: number[];
    linkedCount?: number;
  }): string {
    return syncActionPlanRowCounts({
      action: '',
      impact: row.impact || '',
      linkedFeedbackIds: row.linkedFeedbackIds,
      referenceFeedbackIds: row.referenceFeedbackIds,
      linkedCount: row.linkedCount,
    }).impact;
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    // Action plans are negative-linked clusters — pass context so praise/ownership
    // (#3697/#3758/#3798/#3780) are dropped and RT duplicates collapse.
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: true,
      groupRetweets: true,
      sentiment: 'negative',
      context: 'action plan',
      themeTitle: this.drilldownThemeTitle || undefined,
      drilldownTitle: this.drilldownTitle(),
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        // Unique after negative-filter + retweet grouping (48), not raw snapshot IDs (314).
        const uniqueRaw = Number(res?.data?.uniqueCount ?? res?.data?.total);
        const unique =
          Number.isFinite(uniqueRaw) && uniqueRaw >= 0 ? uniqueRaw : this.drilldownIds.length;
        const originalRaw = Number(res?.data?.originalCount);
        const original =
          Number.isFinite(originalRaw) && originalRaw > 0 ? originalRaw : this.drilldownIds.length;
        this.drilldownTotal.set(unique);
        this.drilldownUniqueCount.set(unique);
        this.drilldownOriginalCount.set(original > unique ? original : null);
        const matchedIds = Array.isArray(res?.data?.matchedIds)
          ? (res.data.matchedIds || []).map((id) => Number(id)).filter((id) => id > 0)
          : [];
        this.syncActionPlanReferenceCount(unique, matchedIds, original);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownTotal.set(0);
        this.drilldownOriginalCount.set(null);
        this.drilldownUniqueCount.set(null);
      },
    });
  }

  /** Keep card "View references (N)" equal to modal unique total (not raw RT IDs). */
  private syncActionPlanReferenceCount(uniqueTotal: number, matchedIds: number[], originalTotal: number): void {
    const capped = Math.max(0, uniqueTotal);
    // Prefer API matchedIds (unique group reps). If missing, slice provisional IDs to unique total
    // so linkedCount is not overridden by a longer raw ID list (314 vs 48 bug).
    const ids = resolveDrilldownIds(matchedIds.length ? matchedIds : this.drilldownIds).slice(0, capped);
    if (!ids.length && capped > 0) return;
    this.drilldownIds = ids;
    this.drilldownTotal.set(capped);
    this.drilldownUniqueCount.set(capped);
    this.drilldownOriginalCount.set(originalTotal > capped ? originalTotal : null);

    let idx = this.drilldownRowIndex;
    if (idx < 0) {
      idx = this.reportPlanRows().findIndex((r) =>
        resolveDrilldownIds(r.linkedFeedbackIds, r.referenceFeedbackIds).some((id) =>
          this.drilldownIds.includes(id)
        )
      );
      this.drilldownRowIndex = idx;
    }
    if (idx < 0) return;

    this.reportPlanRows.update((rows) =>
      rows.map((row, i) => {
        if (i !== idx) return row;
        const synced = syncActionPlanRowCounts({
          ...row,
          linkedFeedbackIds: ids,
          referenceFeedbackIds: ids,
          linkedCount: capped,
        });
        return {
          ...synced,
          priority: priorityLabelFromClusterSize(capped),
        };
      })
    );
    const updated = this.reportPlanRows()[idx];
    if (updated) {
      this.drilldownTitle.set(this.displayAction(updated));
    }
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownOriginalCount.set(null);
    this.drilldownUniqueCount.set(null);
    this.drilldownIds = [];
    this.drilldownThemeTitle = '';
    this.drilldownRowIndex = -1;
  }

  goNextPage(): void {
    const maxPage = this.totalPages();
    if (maxPage === 0) return;
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  openCreate(): void {
    this.form.reset({ title: '', description: '', priority: 'medium', status: 'draft', dueDate: null });
    this.editingId.set(null);
    this.showForm.set(true);
  }

  private formatDateForInput(dueDate?: string | Date): string | null {
    return toInputDateValue(dueDate ?? null);
  }

  openEdit(plan: ActionPlanItem): void {
    this.editingId.set(plan.id);
    this.form.patchValue({
      title: plan.title,
      description: plan.description,
      priority: plan.priority,
      status: plan.status,
      dueDate: this.formatDateForInput(plan.dueDate),
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  saveActionPlan(): void {
    if (this.form.invalid) return;
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (!companyId) return;
    const value = this.form.getRawValue();
    const body = {
      title: value.title,
      description: value.description,
      companyId,
      priority: value.priority,
      status: value.status,
      dueDate: value.dueDate ? new Date(value.dueDate) : undefined
    };
    this.loading.set(true);
    const editingId = this.editingId();
    const request$ =
      editingId != null ? this.actionPlanService.updateActionPlan(editingId, body) : this.actionPlanService.createActionPlan(body);

    request$.subscribe({
      next: (res) => {
        if (res.success) this.loadActionPlans();
        this.cancelForm();
        this.snackBar.open(editingId != null ? 'Action plan updated' : 'Action plan created', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open(editingId != null ? 'Failed to update action plan' : 'Failed to create action plan', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  generateSuggestions(): void {
    if (!this.canGenerateSuggestions()) return;
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    if (!companyId) return;
    this.generating.set(true);
    this.actionPlanService.generateFromRecommendations(companyId).subscribe({
      next: (res) => {
        this.generating.set(false);
        const n = Array.isArray(res.data) ? res.data.length : 0;
        if (res.success) {
          this.loadActionPlans();
          this.snackBar.open(
            n > 0 ? `Added ${n} draft action plan(s) from recommendations and root causes.` : 'No new plans — existing drafts may already cover these items, or add more feedback/root causes.',
            'Close',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open('Could not generate suggestions.', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.generating.set(false);
        this.snackBar.open('Failed to generate suggestions. Check permissions or try again.', 'Close', { duration: 4000 });
      },
    });
  }

  deletePlan(plan: ActionPlanItem): void {
    if (!confirm(`Delete action plan "${plan.title}"?`)) return;
    this.loading.set(true);
    this.actionPlanService.deleteActionPlan(plan.id).subscribe({
      next: (res) => {
        if (res.success) this.loadActionPlans();
        this.snackBar.open('Action plan deleted', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to delete action plan', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  canGenerateSuggestions(): boolean {
    const r = this.authService.currentUser()?.role;
    return r === UserRole.ADMIN;
  }

  getPriorityColor(priority: string): string {
    switch ((priority || '').toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'warn';
      case 'medium': return 'accent';
      default: return 'primary';
    }
  }

  formatDate(d: Date | string | null | undefined): string {
    return formatApiDate(d, { mode: 'date' });
  }
}
