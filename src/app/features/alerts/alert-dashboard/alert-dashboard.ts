import { Component, inject, OnInit, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertService, normalizeAlertsPayload } from '../../../core/services/alert.service';
import { formatApiDate, parseApiDate } from '../../../core/utils/api-date';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';

interface Alert {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  acknowledged: boolean;
  createdAt: Date | null;
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
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './alert-dashboard.html',
  styleUrl: './alert-dashboard.css',
})
export class AlertDashboard implements OnInit, AfterViewInit, OnDestroy {
  private alertService = inject(AlertService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  alerts = signal<Alert[]>([]);
  aiNarrative = signal<string | null>(null);
  
  isMobile = signal(false);
  displayedColumns = computed(() => this.isMobile() 
    ? ['title', 'type', 'priority', 'status']
    : ['title', 'type', 'priority', 'createdAt', 'status', 'actions']
  );

  activeAlertsCount = computed(() => this.alerts().filter(a => !a.acknowledged).length);
  acknowledgedAlertsCount = computed(() => this.alerts().filter(a => a.acknowledged).length);

  ngOnInit(): void {
    this.loadAlerts();
  }

  ngAfterViewInit(): void {
    this.updateMobileStatus();
    window.addEventListener('resize', () => this.updateMobileStatus());
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', () => this.updateMobileStatus());
  }

  private updateMobileStatus(): void {
    this.isMobile.set(window.innerWidth <= 480);
  }

  loadAlerts(): void {
    this.loading.set(true);
    this.alertService.getAlerts().subscribe({
      next: (response) => {
        if (response.success) {
          const { alerts: raw, aiNarrative } = normalizeAlertsPayload(response.data as any);
          this.aiNarrative.set(aiNarrative?.trim() ? aiNarrative : null);
          this.alerts.set(
            raw.map((a: any) => ({
              ...a,
              createdAt: parseApiDate(a.createdAt),
            }))
          );
        } else {
          this.alerts.set([]);
          this.aiNarrative.set(null);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load alerts:', error);
        this.loading.set(false);
        this.alerts.set([]);
        this.aiNarrative.set(null);
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

  formatCreatedAt(value: Date | null): string {
    return formatApiDate(value, { mode: 'datetime' });
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      default: return 'primary';
    }
  }
}
