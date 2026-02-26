import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertService } from '../../../core/services/alert.service';

interface Alert {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  acknowledged: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-alert-dashboard',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './alert-dashboard.html',
  styleUrl: './alert-dashboard.css',
})
export class AlertDashboard implements OnInit {
  private alertService = inject(AlertService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  alerts = signal<Alert[]>([]);
  displayedColumns: string[] = ['title', 'type', 'priority', 'createdAt', 'status', 'actions'];

  activeAlertsCount = computed(() => this.alerts().filter(a => !a.acknowledged).length);
  acknowledgedAlertsCount = computed(() => this.alerts().filter(a => a.acknowledged).length);

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading.set(true);
    this.alertService.getAlerts().subscribe({
      next: (response) => {
        if (response.success) {
          this.alerts.set(response.data || []);
        } else {
          this.alerts.set([]);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load alerts:', error);
        this.loading.set(false);
        this.alerts.set([]);
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load alerts', 'Close', { duration: 3000 });
        }
      }
    });
  }

  acknowledgeAlert(alert: Alert): void {
    this.alertService.acknowledgeAlert(alert.id).subscribe({
      next: (response) => {
        if (response.success) {
          alert.acknowledged = true;
          this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
        }
      },
      error: (error) => {
        this.snackBar.open('Failed to acknowledge alert', 'Close', { duration: 3000 });
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      default: return 'primary';
    }
  }
}
