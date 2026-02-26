import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { TouchpointService } from '../../../core/services/touchpoint.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Touchpoint {
  id: number;
  name: string;
  stage: string;
  type: string;
  feedbackCount: number;
  satisfactionScore: number;
}

@Component({
  selector: 'app-touchpoint-manager',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './touchpoint-manager.html',
  styleUrl: './touchpoint-manager.css',
})
export class TouchpointManager implements OnInit {
  private touchpointService = inject(TouchpointService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  touchpoints = signal<Touchpoint[]>([]);
  displayedColumns: string[] = ['name', 'stage', 'type', 'feedbackCount', 'satisfactionScore', 'actions'];

  ngOnInit(): void {
    this.loadTouchpoints();
  }

  loadTouchpoints(): void {
    this.loading.set(true);
    this.touchpointService.getTouchpoints().subscribe({
      next: (response) => {
        if (response.success) {
          this.touchpoints.set(response.data || []);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.snackBar.open('Failed to load touchpoints', 'Close', { duration: 3000 });
      }
    });
  }
}
