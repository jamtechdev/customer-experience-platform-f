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
import { TouchpointService, Touchpoint } from '../../../core/services/touchpoint.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatSnackBarModule
  ],
  templateUrl: './touchpoint-manager.html',
  styleUrl: './touchpoint-manager.css',
})
export class TouchpointManager implements OnInit {
  private touchpointService = inject(TouchpointService);
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
  }

  loadTouchpoints(): void {
    this.loading.set(true);
    this.touchpointService.getTouchpoints().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          const mapped = (response.data as any[]).map((t: any) => ({
            id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
            name: t.name ?? '',
            description: t.description ?? '',
            category: t.category ?? '',
            order: typeof t.order === 'number' ? t.order : 0,
            type: t.category ?? '',
            stage: '-',
            feedbackCount: t.feedbackCount ?? 0,
            satisfactionScore: t.satisfactionScore ?? 0
          }));
          this.touchpoints.set(mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
          this.page.set(1);
        } else {
          this.touchpoints.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.touchpoints.set([]);
        this.page.set(1);
        this.snackBar.open('Failed to load touchpoints', 'Close', { duration: 3000 });
      }
    });
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
