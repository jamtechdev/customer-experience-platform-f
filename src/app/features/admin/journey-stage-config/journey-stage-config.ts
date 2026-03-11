import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerJourneyService } from '../../../core/services/customer-journey.service';

export interface JourneyStageItem {
  id: number;
  name: string;
  description: string;
  order: number;
}

@Component({
  selector: 'app-journey-stage-config',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './journey-stage-config.html',
  styleUrl: './journey-stage-config.css',
})
export class JourneyStageConfig implements OnInit {
  private journeyService = inject(CustomerJourneyService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  stages = signal<JourneyStageItem[]>([]);
  displayedColumns: string[] = ['order', 'name', 'description', 'actions'];
  showForm = signal(false);
  editingId = signal<number | null>(null);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      order: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadStages();
  }

  loadStages(): void {
    this.loading.set(true);
    this.journeyService.getStages().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          const mapped = (response.data as any[]).map((s: any) => ({
            id: typeof s.id === 'string' ? parseInt(s.id, 10) : s.id,
            name: s.name ?? '',
            description: s.description ?? '',
            order: typeof s.order === 'number' ? s.order : 0
          }));
          this.stages.set(mapped.sort((a, b) => a.order - b.order));
        } else {
          this.stages.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load journey stages', 'Close', { duration: 3000 });
      }
    });
  }

  openAdd(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', order: this.stages().length });
    this.showForm.set(true);
  }

  openEdit(stage: JourneyStageItem): void {
    this.editingId.set(stage.id);
    this.form.patchValue({
      name: stage.name,
      description: stage.description,
      order: stage.order
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  saveStage(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const id = this.editingId();
    this.loading.set(true);
    if (id != null) {
      this.journeyService.updateStage(id, value).subscribe({
        next: (res) => {
          if (res.success) this.loadStages();
          this.cancelForm();
          this.snackBar.open('Stage updated', 'Close', { duration: 2000 });
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to update stage', 'Close', { duration: 3000 });
          this.loading.set(false);
        }
      });
    } else {
      this.journeyService.createStage(value).subscribe({
        next: (res) => {
          if (res.success) this.loadStages();
          this.cancelForm();
          this.snackBar.open('Stage created', 'Close', { duration: 2000 });
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to create stage', 'Close', { duration: 3000 });
          this.loading.set(false);
        }
      });
    }
  }

  deleteStage(stage: JourneyStageItem): void {
    if (!confirm(`Delete stage "${stage.name}"?`)) return;
    this.loading.set(true);
    this.journeyService.deleteStage(stage.id).subscribe({
      next: (res) => {
        if (res.success) this.loadStages();
        this.snackBar.open('Stage deleted', 'Close', { duration: 2000 });
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to delete stage', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }
}
