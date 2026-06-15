import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService, normalizeAlertsPayload } from '../../../core/services/alert.service';
import { formatApiDate, parseApiDate } from '../../../core/utils/api-date';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  acknowledged: boolean;
  createdAt: Date | null;
}

@Component({
  selector: 'app-notifications-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.css',
})
export class NotificationsPage implements OnInit, OnDestroy {
  private readonly alertService = inject(AlertService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly resizeHandler = (): void => this.updateMobileStatus();

  loading = signal(false);
  clearingAll = signal(false);
  deletingId = signal<number | null>(null);
  isMobile = signal(false);
  notifications = signal<NotificationItem[]>([]);

  totalCount = computed(() => this.notifications().length);
  activeCount = computed(() => this.notifications().filter((item) => !item.acknowledged).length);
  acknowledgedCount = computed(() => this.notifications().filter((item) => item.acknowledged).length);

  ngOnInit(): void {
    this.updateMobileStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeHandler);
    }
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.alertService.getAlerts().subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.success) {
          this.notifications.set([]);
          this.notifyPageOpened([]);
          return;
        }

        const { alerts } = normalizeAlertsPayload(response.data as any);
        const items = alerts.map((alert: any) => ({
          ...alert,
          createdAt: parseApiDate(alert.createdAt),
        }));
        this.notifications.set(items);
        this.notifyPageOpened(items);
      },
      error: () => {
        this.loading.set(false);
        this.notifications.set([]);
        this.notifyPageOpened([]);
        this.snackBar.open('Failed to load notifications', 'Close', { duration: 3000 });
      },
    });
  }

  acknowledgeNotification(notification: NotificationItem): void {
    this.alertService.acknowledgeAlert(notification.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications.update((items) =>
            items.map((item) => item.id === notification.id ? { ...item, acknowledged: true } : item)
          );
          this.snackBar.open('Notification marked as read', 'Close', { duration: 2000 });
        }
      },
      error: () => {
        this.snackBar.open('Failed to mark notification as read', 'Close', { duration: 3000 });
      },
    });
  }

  deleteNotification(notification: NotificationItem): void {
    const ok = window.confirm('Delete this notification?');
    if (!ok) return;

    this.deletingId.set(notification.id);
    this.alertService.deleteAlert(notification.id).subscribe({
      next: (response) => {
        this.deletingId.set(null);
        if (response.success) {
          const next = this.notifications().filter((item) => item.id !== notification.id);
          this.notifications.set(next);
          this.notifyPageOpened(next);
          this.snackBar.open('Notification deleted', 'Close', { duration: 2000 });
        }
      },
      error: () => {
        this.deletingId.set(null);
        this.snackBar.open('Failed to delete notification', 'Close', { duration: 3000 });
      },
    });
  }

  deleteAllNotifications(): void {
    if (!this.notifications().length) return;
    const ok = window.confirm('Delete all notifications?');
    if (!ok) return;

    this.clearingAll.set(true);
    this.alertService.deleteAllAlerts().subscribe({
      next: (response) => {
        this.clearingAll.set(false);
        if (response.success) {
          this.notifications.set([]);
          this.notifyPageOpened([]);
          this.snackBar.open('All notifications deleted', 'Close', { duration: 2500 });
        }
      },
      error: () => {
        this.clearingAll.set(false);
        this.snackBar.open('Failed to delete notifications', 'Close', { duration: 3000 });
      },
    });
  }

  formatCreatedAt(value: Date | null): string {
    return formatApiDate(value, { mode: 'datetime' });
  }

  priorityClass(priority: string): string {
    return String(priority || 'low').toLowerCase();
  }

  private updateMobileStatus(): void {
    if (typeof window === 'undefined') return;
    this.isMobile.set(window.innerWidth <= 640);
  }

  private notifyPageOpened(notifications: NotificationItem[]): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('sentimenter-alerts-page-opened', { detail: notifications }));
  }
}
