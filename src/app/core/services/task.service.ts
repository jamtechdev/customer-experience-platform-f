import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Task, 
  Alarm,
  TaskStatus,
  AlarmStatus,
  MakerCheckerRecord,
  MakerCheckerStatus,
  ApiResponse, 
  PaginationParams 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/tasks';

  // Tasks
  getTasks(
    filters?: {
      status?: TaskStatus[];
      assignedTo?: string;
      department?: string;
      priority?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: PaginationParams
  ): Observable<ApiResponse<Task[]>> {
    let params = new HttpParams();
    
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
      if (pagination.sortBy) {
        params = params.set('sortBy', pagination.sortBy);
        params = params.set('sortOrder', pagination.sortOrder || 'desc');
      }
    }

    if (filters) {
      if (filters.status?.length) params = params.set('status', filters.status.join(','));
      if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
      if (filters.department) params = params.set('department', filters.department);
      if (filters.priority?.length) params = params.set('priority', filters.priority.join(','));
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
    }

    return this.http.get<ApiResponse<Task[]>>(this.baseUrl, { params });
  }

  getTaskById(id: string): Observable<ApiResponse<Task>> {
    return this.http.get<ApiResponse<Task>>(`${this.baseUrl}/${id}`);
  }

  createTask(task: Partial<Task>): Observable<ApiResponse<Task>> {
    return this.http.post<ApiResponse<Task>>(this.baseUrl, task);
  }

  updateTask(id: string, task: Partial<Task>): Observable<ApiResponse<Task>> {
    return this.http.put<ApiResponse<Task>>(`${this.baseUrl}/${id}`, task);
  }

  deleteTask(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  updateTaskStatus(id: string, status: TaskStatus, notes?: string): Observable<ApiResponse<Task>> {
    return this.http.patch<ApiResponse<Task>>(`${this.baseUrl}/${id}/status`, { status, notes });
  }

  assignTask(id: string, assignedTo: string): Observable<ApiResponse<Task>> {
    return this.http.post<ApiResponse<Task>>(`${this.baseUrl}/${id}/assign`, { assignedTo });
  }

  addTaskNote(id: string, content: string): Observable<ApiResponse<Task>> {
    return this.http.post<ApiResponse<Task>>(`${this.baseUrl}/${id}/notes`, { content });
  }

  getMyTasks(pagination?: PaginationParams): Observable<ApiResponse<Task[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<Task[]>>(`${this.baseUrl}/my-tasks`, { params });
  }

  getTaskStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stats`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/alarms';

  getAlarms(
    filters?: {
      status?: AlarmStatus[];
      severity?: string[];
      type?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: PaginationParams
  ): Observable<ApiResponse<Alarm[]>> {
    let params = new HttpParams();
    
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }

    if (filters) {
      if (filters.status?.length) params = params.set('status', filters.status.join(','));
      if (filters.severity?.length) params = params.set('severity', filters.severity.join(','));
      if (filters.type?.length) params = params.set('type', filters.type.join(','));
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
    }

    return this.http.get<ApiResponse<Alarm[]>>(this.baseUrl, { params });
  }

  getAlarmById(id: string): Observable<ApiResponse<Alarm>> {
    return this.http.get<ApiResponse<Alarm>>(`${this.baseUrl}/${id}`);
  }

  acknowledgeAlarm(id: string): Observable<ApiResponse<Alarm>> {
    return this.http.post<ApiResponse<Alarm>>(`${this.baseUrl}/${id}/acknowledge`, {});
  }

  resolveAlarm(id: string, resolution?: string): Observable<ApiResponse<Alarm>> {
    return this.http.post<ApiResponse<Alarm>>(`${this.baseUrl}/${id}/resolve`, { resolution });
  }

  dismissAlarm(id: string, reason: string): Observable<ApiResponse<Alarm>> {
    return this.http.post<ApiResponse<Alarm>>(`${this.baseUrl}/${id}/dismiss`, { reason });
  }

  createTaskFromAlarm(alarmId: string, taskDetails: Partial<Task>): Observable<ApiResponse<Task>> {
    return this.http.post<ApiResponse<Task>>(`${this.baseUrl}/${alarmId}/create-task`, taskDetails);
  }

  getActiveAlarmsCount(): Observable<ApiResponse<{ count: number; bySeverity: Record<string, number> }>> {
    return this.http.get<ApiResponse<{ count: number; bySeverity: Record<string, number> }>>(`${this.baseUrl}/active/count`);
  }

  getAlarmStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stats`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class MakerCheckerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/maker-checker';

  getPendingApprovals(pagination?: PaginationParams): Observable<ApiResponse<MakerCheckerRecord[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<MakerCheckerRecord[]>>(`${this.baseUrl}/pending`, { params });
  }

  getRecordById(id: string): Observable<ApiResponse<MakerCheckerRecord>> {
    return this.http.get<ApiResponse<MakerCheckerRecord>>(`${this.baseUrl}/${id}`);
  }

  approve(id: string, comments?: string): Observable<ApiResponse<MakerCheckerRecord>> {
    return this.http.post<ApiResponse<MakerCheckerRecord>>(`${this.baseUrl}/${id}/approve`, { comments });
  }

  reject(id: string, reason: string): Observable<ApiResponse<MakerCheckerRecord>> {
    return this.http.post<ApiResponse<MakerCheckerRecord>>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  getHistory(
    filters?: {
      entityType?: string;
      status?: MakerCheckerStatus;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination?: PaginationParams
  ): Observable<ApiResponse<MakerCheckerRecord[]>> {
    let params = new HttpParams();
    
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }

    if (filters) {
      if (filters.entityType) params = params.set('entityType', filters.entityType);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
    }

    return this.http.get<ApiResponse<MakerCheckerRecord[]>>(`${this.baseUrl}/history`, { params });
  }

  getPendingCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/pending/count`);
  }
}
