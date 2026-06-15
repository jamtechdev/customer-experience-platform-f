import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';
import { AuthService } from './auth.service';

export interface AlertThresholds {
  sentimentDropThreshold: number;
  npsDeclineThreshold: number;
  complaintSpikeThreshold: number;
  competitorOutperformThreshold: number;
}

export interface SentimentParameters {
  positiveThreshold: number;
  negativeThreshold: number;
}

export interface AlertEmailSettings {
  enabled: boolean;
  recipients: string[];
}

export interface AlertPushSettings {
  enabled: boolean;
  tokens: string[];
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  dashboard: {
    defaultPeriod: 'today' | 'week' | 'month' | 'quarter' | 'year';
    refreshInterval: number;
    widgets: string[];
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      sentiment: number;
      nps: number;
      complaint: number;
    };
  };
  export: {
    defaultFormat: 'pdf' | 'excel';
    includeCharts: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/settings` : '/api/settings';
  private readonly localSettingsKey = 'sentimenter_app_settings';
  
  private settingsSubject = new BehaviorSubject<AppSettings>(this.getDefaultSettings());
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.loadSettings();
      } else {
        this.settingsSubject.next(this.readLocalSettings());
      }
    });
  }

  private getDefaultSettings(): AppSettings {
    return {
      theme: 'light',
      language: 'en',
      dateFormat: environment.dateFormat.short,
      timeFormat: '24h',
      notifications: {
        email: true,
        push: false,
        inApp: true,
      },
      dashboard: {
        defaultPeriod: 'month',
        refreshInterval: 300000, // 5 minutes
        widgets: ['sentiment', 'nps', 'alerts', 'recent-feedback'],
      },
      alerts: {
        enabled: true,
        thresholds: {
          sentiment: -0.7,
          nps: 30,
          complaint: 10,
        },
      },
      export: {
        defaultFormat: 'pdf',
        includeCharts: true,
      },
    };
  }

  getSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  loadSettings(): void {
    this.settingsSubject.next(this.readLocalSettings());
  }

  updateSettings(settings: Partial<AppSettings>): Observable<ApiResponse<AppSettings>> {
    const updated = this.mergeSettings(this.settingsSubject.value, settings);
    this.settingsSubject.next(updated);
    this.writeLocalSettings(updated);
    return of({
      success: true,
      message: 'Settings updated locally',
      version: 'v1',
      code: 200,
      data: updated,
    });
  }

  deleteSettings(): Observable<ApiResponse<void>> {
    const defaults = this.getDefaultSettings();
    this.settingsSubject.next(defaults);
    this.writeLocalSettings(defaults);
    return of({
      success: true,
      message: 'Settings reset locally',
      version: 'v1',
      code: 200,
      data: undefined,
    });
  }

  resetSettings(): void {
    this.deleteSettings().subscribe();
  }

  /** System-level alert thresholds (admin/CX Manager). */
  getAlertThresholds(): Observable<ApiResponse<AlertThresholds>> {
    return this.http.get<ApiResponse<AlertThresholds>>(`${this.baseUrl}/alert-thresholds`);
  }

  updateAlertThresholds(thresholds: AlertThresholds): Observable<ApiResponse<AlertThresholds>> {
    return this.http.put<ApiResponse<AlertThresholds>>(`${this.baseUrl}/alert-thresholds`, thresholds);
  }

  getAlertEmailSettings(): Observable<ApiResponse<AlertEmailSettings>> {
    return this.http.get<ApiResponse<AlertEmailSettings>>(`${this.baseUrl}/alert-email`);
  }

  updateAlertEmailSettings(settings: AlertEmailSettings): Observable<ApiResponse<AlertEmailSettings>> {
    return this.http.put<ApiResponse<AlertEmailSettings>>(`${this.baseUrl}/alert-email`, settings);
  }

  getAlertPushSettings(): Observable<ApiResponse<AlertPushSettings>> {
    return this.http.get<ApiResponse<AlertPushSettings>>(`${this.baseUrl}/alert-push`);
  }

  updateAlertPushSettings(settings: AlertPushSettings): Observable<ApiResponse<AlertPushSettings>> {
    return this.http.put<ApiResponse<AlertPushSettings>>(`${this.baseUrl}/alert-push`, settings);
  }

  registerAlertPushToken(token: string): Observable<ApiResponse<AlertPushSettings>> {
    return this.http.post<ApiResponse<AlertPushSettings>>(`${this.baseUrl}/alert-push/token`, { token });
  }

  unregisterAlertPushToken(token: string): Observable<ApiResponse<AlertPushSettings>> {
    return this.http.request<ApiResponse<AlertPushSettings>>('DELETE', `${this.baseUrl}/alert-push/token`, {
      body: { token },
    });
  }

  getSentimentParameters(): Observable<ApiResponse<SentimentParameters>> {
    return this.http.get<ApiResponse<SentimentParameters>>(`${this.baseUrl}/sentiment-parameters`);
  }

  updateSentimentParameters(params: SentimentParameters): Observable<ApiResponse<SentimentParameters>> {
    return this.http.put<ApiResponse<SentimentParameters>>(`${this.baseUrl}/sentiment-parameters`, params);
  }

  // Quick getters
  getTheme(): 'light' | 'dark' | 'auto' {
    return this.settingsSubject.value.theme;
  }

  getLanguage(): string {
    return this.settingsSubject.value.language;
  }

  getDateFormat(): string {
    return this.settingsSubject.value.dateFormat;
  }

  private readLocalSettings(): AppSettings {
    try {
      if (typeof localStorage === 'undefined') return this.getDefaultSettings();
      const raw = localStorage.getItem(this.localSettingsKey);
      if (!raw) return this.getDefaultSettings();
      const parsed = JSON.parse(raw);
      return this.mergeSettings(this.getDefaultSettings(), parsed);
    } catch {
      return this.getDefaultSettings();
    }
  }

  private writeLocalSettings(settings: AppSettings): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.localSettingsKey, JSON.stringify(settings));
      }
    } catch {
      // Ignore storage failures; in-memory settings still work for the session.
    }
  }

  private mergeSettings(base: AppSettings, updates: Partial<AppSettings>): AppSettings {
    return {
      ...base,
      ...updates,
      notifications: {
        ...base.notifications,
        ...(updates.notifications || {}),
      },
      dashboard: {
        ...base.dashboard,
        ...(updates.dashboard || {}),
      },
      alerts: {
        ...base.alerts,
        ...(updates.alerts || {}),
        thresholds: {
          ...base.alerts.thresholds,
          ...(updates.alerts?.thresholds || {}),
        },
      },
      export: {
        ...base.export,
        ...(updates.export || {}),
      },
    };
  }
}
