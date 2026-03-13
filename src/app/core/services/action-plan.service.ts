import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

export interface ActionPlanItem {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  startDate?: string | Date;
  dueDate?: string | Date;
  completedDate?: string | Date;
  companyId?: number;
  departmentId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActionPlanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/action-plans` : '/api/action-plans';

  getActionPlans(filters?: { companyId?: number; departmentId?: number; status?: string }): Observable<ApiResponse<ActionPlanItem[]>> {
    let params = new HttpParams();
    if (filters?.companyId != null) params = params.set('companyId', filters.companyId.toString());
    if (filters?.departmentId != null) params = params.set('departmentId', filters.departmentId.toString());
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ApiResponse<ActionPlanItem[]>>(this.baseUrl, { params });
  }

  getActionPlan(id: number): Observable<ApiResponse<ActionPlanItem>> {
    return this.http.get<ApiResponse<ActionPlanItem>>(`${this.baseUrl}/${id}`);
  }

  createActionPlan(plan: Partial<ActionPlanItem>): Observable<ApiResponse<ActionPlanItem>> {
    return this.http.post<ApiResponse<ActionPlanItem>>(this.baseUrl, plan);
  }

  updateActionPlan(id: number, plan: Partial<ActionPlanItem>): Observable<ApiResponse<ActionPlanItem>> {
    return this.http.put<ApiResponse<ActionPlanItem>>(`${this.baseUrl}/${id}`, plan);
  }

  deleteActionPlan(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
