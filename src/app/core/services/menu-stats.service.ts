import { Injectable, inject, signal, computed } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TaskService, AlarmService, FeedbackService } from './index';
import { AlarmStatus } from '../models';

export interface MenuStats {
  tasks?: {
    pending: number;
    inProgress: number;
    pendingApproval: number;
  };
  alarms?: {
    critical: number;
    high: number;
    total: number;
  };
  feedback?: {
    unread: number;
    urgent: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MenuStatsService {
  private taskService = inject(TaskService);
  private alarmService = inject(AlarmService);
  private feedbackService = inject(FeedbackService);

  readonly stats = signal<MenuStats>({});

  loadStats(): void {
    // Load task stats
    this.taskService.getTaskStats().pipe(
      map(response => response.success ? response.data : null),
      catchError(() => of(null))
    ).subscribe(data => {
      if (data) {
        this.stats.update(s => ({
          ...s,
          tasks: {
            pending: data.pending || 0,
            inProgress: data.inProgress || 0,
            pendingApproval: data.pendingApproval || 0
          }
        }));
      }
    });

    // Load alarm stats
    this.alarmService.getAlarms({ status: [AlarmStatus.ACTIVE] }).pipe(
      map(response => {
        if (response?.success && response.data) {
          const alarms = Array.isArray(response.data) ? response.data : [];
          return {
            critical: alarms.filter((a: any) => a.severity === 'CRITICAL' || a.priority === 'critical').length,
            high: alarms.filter((a: any) => a.severity === 'HIGH' || a.priority === 'high').length,
            total: alarms.length
          };
        }
        return null;
      }),
      catchError((error) => {
        // Silently handle errors - API might not be available yet
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.stats.update(s => ({
          ...s,
          alarms: data
        }));
      }
    });
  }

  getTaskBadge(): number {
    const tasks = this.stats().tasks;
    if (!tasks) return 0;
    return (tasks.pending || 0) + (tasks.pendingApproval || 0);
  }

  getAlarmBadge(): number {
    const alarms = this.stats().alarms;
    if (!alarms) return 0;
    return alarms.critical || 0;
  }
}
