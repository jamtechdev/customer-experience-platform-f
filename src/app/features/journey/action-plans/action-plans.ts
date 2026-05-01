import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { formatApiDate, toInputDateValue } from '../../../core/utils/api-date';
import { buildClientReportDatePresets } from '../../../core/utils/report-date-presets';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';

@Component({
  selector: 'app-action-plans',
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
    MatSelectModule,
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './action-plans.html',
  styleUrl: './action-plans.css',
})
export class ActionPlans implements OnInit {
  private actionPlanService = inject(ActionPlanService);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  generating = signal(false);
  actionPlans = signal<ActionPlanItem[]>([]);
  readonly pageSize = 20;
  page = signal(1);
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
    const total = this.actionPlans().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });
  displayedColumns: string[] = ['title', 'priority', 'status', 'dueDate', 'actions'];
  reportPlanRows = signal<Array<{ priority: string; action: string; owner: string; impact: string; horizon: string }>>([]);
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
  }

  loadActionPlans(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    const presets = buildClientReportDatePresets();
    const defaultId = user?.role === 'admin' ? 'all_time' : 'last_30_days';
    const preset = presets.find((p) => p.id === defaultId) ?? presets[0];
    const start = new Date(preset.startDate);
    const end = new Date(preset.endDate);
    this.analysisService.getTwitterCxReport(companyId, start, end).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data?.actionPlan)) {
          this.reportPlanRows.set(
            response.data.actionPlan.map((x: any) => ({
              priority: x.priority ?? '',
              action: x.action ?? '',
              owner: x.owner ?? '',
              impact: x.impact ?? '',
              horizon: x.horizon ?? '',
            }))
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
        } else {
          this.reportPlanRows.set([]);
          this.actionPlans.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.actionPlans.set([]);
        this.reportPlanRows.set([]);
        this.page.set(1);
        this.snackBar.open('Failed to load action plans', 'Close', { duration: 3000 });
      }
    });
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.actionPlans().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
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
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
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
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
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
    return r === UserRole.ADMIN || r === UserRole.ANALYST;
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
