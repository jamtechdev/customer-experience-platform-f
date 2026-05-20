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
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

@Component({
  selector: 'app-touchpoint-manager',
  imports: [
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
    OllamaLoader
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
  drilldownRows = signal<Array<{ id: number; content: string; contentSummary?: string; sentiment: string; date: string }>>([]);
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
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.touchpoints.set([]);
          this.reportTouchpoints.set([]);
          this.page.set(1);
          this.snackBar.open(twitterCxReportFailureMessage(response.message), 'Close', { duration: 7000 });
          this.loading.set(false);
          return;
        }
        if (response.success && Array.isArray(response.data?.touchpoints)) {
          const rows = response.data.touchpoints.map((t: any, idx: number) => ({
            id: idx + 1,
            name: t.name ?? '',
            description: t.observation ?? '',
            category: 'touchpoint',
            order: idx + 1,
            type: 'touchpoint',
            stage: '-',
            feedbackCount: Number(t.volume ?? 0),
            satisfactionScore: 0
          }));
          this.touchpoints.set(rows);
          this.reportTouchpoints.set(
            response.data.touchpoints.map((t: any) => ({
              name: t.name ?? '',
              volume: Number(t.volume ?? 0),
              observation: t.observation ?? '',
              feedbackIds: Array.isArray(t.feedbackIds) ? t.feedbackIds : [],
            }))
          );
          this.page.set(1);
        } else {
          this.touchpoints.set([]);
          this.reportTouchpoints.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.touchpoints.set([]);
        this.reportTouchpoints.set([]);
        this.page.set(1);
        this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
      }
    });
  }

  touchpointMaxEffective(): number {
    const rows = this.reportTouchpoints();
    return Math.max(1, ...rows.map((r) => r.volume));
  }

  touchpointBarFillPct(volume: number): number {
    const max = this.touchpointMaxEffective();
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

  openRelatedTouchpoint(row: { name: string; feedbackIds: number[] }): void {
    const ids = [...new Set((row.feedbackIds || []).filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) return;
    this.drilldownTitle.set(row.name);
    this.drilldownOpen.set(true);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.analysisService.getAnalyticsDrilldown({ companyId, ids }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
      },
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
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
