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
import { TouchpointService, Touchpoint } from '../../../core/services/touchpoint.service';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { notifyCxReportLoadFailure } from '../../../core/utils/twitter-cx-report-load';
import { ImportProcessingService } from '../../../core/services/import-processing.service';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';
import { drilldownModalTotal } from '../../../core/utils/drilldown-display';
import { resolveAppCompanyId } from '../../../core/utils/company-scope';
import { environment } from '../../../../environments/environment';

const SOURCE_CHANNEL_NAMES = new Set([
  'twitter',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'google_reviews',
  'sikayetvar',
  'sikayetvar_com',
  'app_store',
  'play_store',
  'csv_import',
  'social_media',
  'other',
]);

function isSourceChannelName(value: string): boolean {
  return SOURCE_CHANNEL_NAMES.has((value || '').trim().toLowerCase().replace(/\s+/g, '_'));
}

@Component({
  selector: 'app-touchpoint-manager',
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
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './touchpoint-manager.html',
  styleUrl: './touchpoint-manager.css',
})
export class TouchpointManager implements OnInit, OnDestroy {
  private touchpointService = inject(TouchpointService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private refreshSub?: Subscription;
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private importProcessing = inject(ImportProcessingService);

  /** Product expectation: journey is “complete” through the third touchpoint in order. */
  readonly flowStepTarget = 3;

  loading = signal(false);
  touchpoints = signal<Touchpoint[]>([]);
  readonly pageSize = 20;
  page = signal(1);
  pagedTouchpoints = computed(() => {
    const all = this.touchpoints();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.touchpoints().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });
  displayedColumns: string[] = ['order', 'name', 'description', 'category', 'actions'];
  reportTouchpoints = signal<Array<{ name: string; volume: number; observation: string; feedbackIds: number[] }>>([]);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];
  /** Snapshot rows use synthetic ids; CRUD applies to Admin touchpoint config only. */
  snapshotViewOnly = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      category: ['', [Validators.required, Validators.maxLength(50)]],
      order: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadTouchpoints();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadTouchpoints());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadTouchpoints(): void {
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    this.loading.set(true);
    const watchdog = setTimeout(() => this.loading.set(false), environment.cxReportTimeout || 120000);
    this.twitterCxReportStore.loadTwitterCxReport(companyId, undefined, undefined, undefined, false).subscribe({
      next: (response) => {
        if (
          (response.message === 'stale_response' || response.message === 'snapshot_still_building') &&
          !(response.success && response.data)
        ) {
          clearTimeout(watchdog);
          this.loading.set(false);
          return;
        }
        clearTimeout(watchdog);
        if (response.message === 'stale_response' || response.message === 'snapshot_still_building') {
          this.loading.set(false);
          return;
        }
        if (!response.success) {
          if (!this.touchpoints().length && !this.reportTouchpoints().length) {
            this.touchpoints.set([]);
            this.reportTouchpoints.set([]);
            this.page.set(1);
          }
          notifyCxReportLoadFailure(this.snackBar, response.message, this.importProcessing.isActive(), 'Close');
          this.loading.set(false);
          return;
        }
        this.applyTouchpointReport(response);
        this.loading.set(false);
      },
      error: () => {
        clearTimeout(watchdog);
        this.loading.set(false);
        this.touchpoints.set([]);
        this.reportTouchpoints.set([]);
        this.page.set(1);
        notifyCxReportLoadFailure(this.snackBar, undefined, this.importProcessing.isActive(), 'Close');
      },
    });
  }

  private applyTouchpointReport(response: { success?: boolean; data?: { touchpoints?: any[] } }): void {
    if (!response.success || !Array.isArray(response.data?.touchpoints)) {
      this.touchpoints.set([]);
      this.reportTouchpoints.set([]);
      this.page.set(1);
      return;
    }
    const touchpoints = response.data.touchpoints.filter((t: any) => !isSourceChannelName(t?.name ?? ''));
    const rows = touchpoints.map((t: any, idx: number) => ({
      id: idx + 1,
      name: t.name ?? '',
      description: t.observation ?? '',
      category: 'touchpoint',
      order: idx + 1,
      type: 'touchpoint',
      stage: '-',
      feedbackCount: Number(t.volume ?? 0),
      satisfactionScore: 0,
    }));
    this.touchpoints.set(rows);
    this.reportTouchpoints.set(
      touchpoints.map((t: any) => ({
        name: t.name ?? '',
        volume: Number(t.volume ?? 0),
        observation: t.observation ?? '',
        feedbackIds: Array.isArray(t.feedbackIds) ? t.feedbackIds : [],
      }))
    );
    this.page.set(1);
  }

  /** Volume shown on cards must match drilldown ID list length. */
  touchpointReferenceVolume(row: { volume: number; feedbackIds?: number[] }): number {
    const idCount = drilldownModalTotal(row.feedbackIds || []);
    return idCount > 0 ? idCount : Number(row.volume ?? 0);
  }

  touchpointMaxEffective(): number {
    const rows = this.reportTouchpoints();
    return Math.max(1, ...rows.map((r) => this.touchpointReferenceVolume(r)));
  }

  touchpointBarFillPct(row: { volume: number; feedbackIds?: number[] }): number {
    const max = this.touchpointMaxEffective();
    const volume = this.touchpointReferenceVolume(row);
    return Math.min(100, max > 0 ? (volume / max) * 100 : 0);
  }

  truncateChartLabel(text: string, maxLen = 24): string {
    const t = (text || '').trim();
    return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.touchpoints().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  openRelatedTouchpoint(row: { name: string; volume: number; feedbackIds: number[] }): void {
    const ids = [...new Set((row.feedbackIds || []).filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) return;
    const total = this.touchpointReferenceVolume(row);
    this.drilldownTitle.set(row.name);
    this.drilldownOpen.set(true);
    this.drilldownIds = ids;
    this.drilldownTotal.set(drilldownModalTotal(this.drilldownIds) || total);
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = resolveAppCompanyId(this.authService.currentUser());
    const touchpointName = this.drilldownTitle();
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: false,
      groupRetweets: true,
      drilldownTitle: touchpointName,
      touchpointName,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
        const resolvedTotal = Number(res?.data?.total ?? 0);
        const expected = drilldownModalTotal(this.drilldownIds);
        const nextTotal = resolvedTotal > 0 ? resolvedTotal : this.drilldownRows().length > 0 ? this.drilldownRows().length : expected;
        this.drilldownTotal.set(nextTotal);
        const matchedIds = Array.isArray(res?.data?.matchedIds)
          ? (res.data.matchedIds || []).map((id) => Number(id)).filter((id) => id > 0)
          : [];
        if (matchedIds.length && nextTotal > 0) {
          this.drilldownIds = matchedIds.slice(0, nextTotal);
          const title = this.drilldownTitle();
          this.reportTouchpoints.update((rows) =>
            rows.map((row) =>
              row.name === title
                ? { ...row, feedbackIds: this.drilldownIds, volume: nextTotal }
                : row
            )
          );
        }
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
        this.drilldownTotal.set(drilldownModalTotal(this.drilldownIds));
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

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', category: '', order: this.touchpoints().length });
    this.showForm.set(true);
  }

  openEdit(t: Touchpoint): void {
    this.editingId.set(t.id ?? null);
    this.form.patchValue({
      name: t.name ?? '',
      description: t.description ?? '',
      category: t.category ?? '',
      order: t.order ?? 0,
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  saveTouchpoint(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.loading.set(true);
    const payload = {
      name: value.name,
      description: value.description,
      category: value.category,
      order: value.order,
    };

    const editingId = this.editingId();
    const request$ =
      editingId != null
        ? this.touchpointService.updateTouchpoint(editingId, payload)
        : this.touchpointService.createTouchpoint(payload);

    request$.subscribe({
      next: (res) => {
        if (res.success) this.loadTouchpoints();
        this.cancelForm();
        this.snackBar.open(editingId != null ? 'Touchpoint updated' : 'Touchpoint created', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open(editingId != null ? 'Failed to update touchpoint' : 'Failed to create touchpoint', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  touchpointFlowConfigured(): boolean {
    return this.touchpoints().length >= this.flowStepTarget;
  }

  deleteTouchpoint(id: number | undefined): void {
    if (id == null) return;
    if (!confirm('Delete this touchpoint?')) return;
    this.loading.set(true);
    this.touchpointService.deleteTouchpoint(id).subscribe({
      next: (res) => {
        if (res.success) this.loadTouchpoints();
        this.snackBar.open('Touchpoint deleted', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to delete touchpoint', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }
}
