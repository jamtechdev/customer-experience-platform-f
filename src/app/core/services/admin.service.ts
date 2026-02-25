import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserRole, DataDictionary, ApiResponse, PaginationParams } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  getUsers(pagination?: PaginationParams): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<User[]>>(this.baseUrl, { params });
  }

  getUserById(id: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/${id}`);
  }

  createUser(user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.baseUrl, user);
  }

  updateUser(id: string, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  toggleUserStatus(id: string, isActive: boolean): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.baseUrl}/${id}/status`, { isActive });
  }

  updateUserRole(id: string, role: UserRole): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.baseUrl}/${id}/role`, { role });
  }

  updateUserPermissions(id: string, permissions: string[]): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.baseUrl}/${id}/permissions`, { permissions });
  }

  resetPassword(id: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/reset-password`, {});
  }

  getUsersByDepartment(department: string): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.baseUrl}/department/${department}`);
  }

  getRoles(): Observable<ApiResponse<{ role: UserRole; permissions: string[] }[]>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/roles`);
  }

  getAllPermissions(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/permissions`);
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminSettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/settings';

  getSettings(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(this.baseUrl);
  }

  updateSettings(settings: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(this.baseUrl, settings);
  }

  getNotificationSettings(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/notifications`);
  }

  updateNotificationSettings(settings: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/notifications`, settings);
  }

  getAlarmRules(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/alarm-rules`);
  }

  createAlarmRule(rule: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/alarm-rules`, rule);
  }

  updateAlarmRule(id: string, rule: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/alarm-rules/${id}`, rule);
  }

  deleteAlarmRule(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/alarm-rules/${id}`);
  }

  getCategories(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/categories`);
  }

  updateCategories(categories: any[]): Observable<ApiResponse<any[]>> {
    return this.http.put<ApiResponse<any[]>>(`${this.baseUrl}/categories`, categories);
  }

  getDepartments(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/departments`);
  }

  updateDepartments(departments: string[]): Observable<ApiResponse<string[]>> {
    return this.http.put<ApiResponse<string[]>>(`${this.baseUrl}/departments`, departments);
  }

  // Data Dictionary (Veri Sözlüğü)
  getDataDictionary(): Observable<ApiResponse<DataDictionary>> {
    return this.http.get<ApiResponse<DataDictionary>>(`${this.baseUrl}/data-dictionary`);
  }

  updateDataDictionary(dictionary: DataDictionary): Observable<ApiResponse<DataDictionary>> {
    return this.http.put<ApiResponse<DataDictionary>>(`${this.baseUrl}/data-dictionary`, dictionary);
  }

  exportDataDictionary(format: 'pdf' | 'excel' = 'excel'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/data-dictionary/export`, { 
      params: { format },
      responseType: 'blob' 
    });
  }

  // Audit Logs
  getAuditLogs(
    filters?: { userId?: string; action?: string; dateFrom?: Date; dateTo?: Date },
    pagination?: PaginationParams
  ): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    if (filters) {
      if (filters.userId) params = params.set('userId', filters.userId);
      if (filters.action) params = params.set('action', filters.action);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
    }
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/audit-logs`, { params });
  }
}

// Convenience alias for AdminService
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly userService = inject(UserService);
  private readonly adminSettingsService = inject(AdminSettingsService);
  
  // User management
  getUsers = this.userService.getUsers.bind(this.userService);
  getUserById = this.userService.getUserById.bind(this.userService);
  createUser = this.userService.createUser.bind(this.userService);
  updateUser = this.userService.updateUser.bind(this.userService);
  deleteUser = this.userService.deleteUser.bind(this.userService);
  toggleUserStatus = this.userService.toggleUserStatus.bind(this.userService);
  updateUserRole = this.userService.updateUserRole.bind(this.userService);
  updateUserPermissions = this.userService.updateUserPermissions.bind(this.userService);
  resetPassword = this.userService.resetPassword.bind(this.userService);
  getRoles = this.userService.getRoles.bind(this.userService);
  getAllPermissions = this.userService.getAllPermissions.bind(this.userService);
  
  // Settings
  getSettings = this.adminSettingsService.getSettings.bind(this.adminSettingsService);
  updateSettings = this.adminSettingsService.updateSettings.bind(this.adminSettingsService);
  getNotificationSettings = this.adminSettingsService.getNotificationSettings.bind(this.adminSettingsService);
  updateNotificationSettings = this.adminSettingsService.updateNotificationSettings.bind(this.adminSettingsService);
  getAlarmRules = this.adminSettingsService.getAlarmRules.bind(this.adminSettingsService);
  createAlarmRule = this.adminSettingsService.createAlarmRule.bind(this.adminSettingsService);
  updateAlarmRule = this.adminSettingsService.updateAlarmRule.bind(this.adminSettingsService);
  deleteAlarmRule = this.adminSettingsService.deleteAlarmRule.bind(this.adminSettingsService);
  getCategories = this.adminSettingsService.getCategories.bind(this.adminSettingsService);
  updateCategories = this.adminSettingsService.updateCategories.bind(this.adminSettingsService);
  getDepartments = this.adminSettingsService.getDepartments.bind(this.adminSettingsService);
  updateDepartments = this.adminSettingsService.updateDepartments.bind(this.adminSettingsService);
  
  // Data Dictionary
  getDataDictionary = this.adminSettingsService.getDataDictionary.bind(this.adminSettingsService);
  updateDataDictionary = this.adminSettingsService.updateDataDictionary.bind(this.adminSettingsService);
  exportDataDictionary = this.adminSettingsService.exportDataDictionary.bind(this.adminSettingsService);
  
  // Audit Logs
  getAuditLogs = this.adminSettingsService.getAuditLogs.bind(this.adminSettingsService);
}
