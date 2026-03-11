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

  loading = signal(false);
  touchpoints = signal<Touchpoint[]>([]);
  displayedColumns: string[] = ['order', 'name', 'description', 'category', 'actions'];
  showForm = signal(false);
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
        } else {
          this.touchpoints.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.touchpoints.set([]);
        this.snackBar.open('Failed to load touchpoints', 'Close', { duration: 3000 });
      }
    });
  }

  openCreate(): void {
    this.form.reset({ name: '', description: '', category: '', order: this.touchpoints().length });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  saveTouchpoint(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.touchpointService.createTouchpoint({
      name: value.name,
      description: value.description,
      category: value.category,
      order: value.order
    }).subscribe({
      next: (res) => {
        if (res.success) this.loadTouchpoints();
        this.cancelForm();
        this.snackBar.open('Touchpoint created', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to create touchpoint', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }
}
