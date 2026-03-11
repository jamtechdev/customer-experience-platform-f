import { Component, inject, OnInit, signal } from '@angular/core';
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
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatSnackBarModule
  ],
  templateUrl: './action-plans.html',
  styleUrl: './action-plans.css',
})
export class ActionPlans implements OnInit {
  private actionPlanService = inject(ActionPlanService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  actionPlans = signal<ActionPlanItem[]>([]);
  displayedColumns: string[] = ['title', 'priority', 'status', 'dueDate', 'actions'];
  showForm = signal(false);
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
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.actionPlanService.getActionPlans({ companyId }).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          const mapped = (response.data as any[]).map((p: any) => ({
            id: typeof p.id === 'string' ? parseInt(p.id, 10) : p.id,
            title: p.title ?? '',
            description: p.description ?? '',
            priority: (p.priority ?? 'medium').toString(),
            status: (p.status ?? 'draft').toString(),
            dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
            startDate: p.startDate,
            completedDate: p.completedDate,
            companyId: p.companyId,
            departmentId: p.departmentId
          }));
          this.actionPlans.set(mapped);
        } else {
          this.actionPlans.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.actionPlans.set([]);
        this.snackBar.open('Failed to load action plans', 'Close', { duration: 3000 });
      }
    });
  }

  openCreate(): void {
    this.form.reset({ title: '', description: '', priority: 'medium', status: 'draft', dueDate: null });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
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
      dueDate: value.dueDate || undefined
    };
    this.loading.set(true);
    this.actionPlanService.createActionPlan(body).subscribe({
      next: (res) => {
        if (res.success) this.loadActionPlans();
        this.cancelForm();
        this.snackBar.open('Action plan created', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to create action plan', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
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

  getPriorityColor(priority: string): string {
    switch ((priority || '').toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'warn';
      case 'medium': return 'accent';
      default: return 'primary';
    }
  }

  formatDate(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString();
  }
}
