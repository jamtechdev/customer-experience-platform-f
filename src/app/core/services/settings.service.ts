import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

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
  private readonly baseUrl = '/api/settings';
  
  private settingsSubject = new BehaviorSubject<AppSettings>(this.getDefaultSettings());
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  private getDefaultSettings(): AppSettings {
    return {
      theme: 'light',
      language: 'tr',
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
    // Try to load from localStorage first (only in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('app_settings');
        if (saved) {
          try {
            const settings = JSON.parse(saved);
            this.settingsSubject.next({ ...this.getDefaultSettings(), ...settings });
          } catch (e) {
            console.error('Failed to parse saved settings', e);
          }
        }
      } catch (e) {
        // localStorage not available, skip
      }
    }

    // Then try to load from server
    this.http.get<ApiResponse<AppSettings>>(this.baseUrl).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.settingsSubject.next({ ...this.getDefaultSettings(), ...response.data });
          this.saveToLocalStorage(response.data);
        }
      },
      error: () => {
        // Server settings not available, use defaults
      }
    });
  }

  updateSettings(settings: Partial<AppSettings>): Observable<ApiResponse<AppSettings>> {
    const updated = { ...this.settingsSubject.value, ...settings };
    
    return new Observable(observer => {
      this.http.put<ApiResponse<AppSettings>>(this.baseUrl, updated).subscribe({
        next: (response) => {
          if (response.success) {
            this.settingsSubject.next(response.data);
            this.saveToLocalStorage(response.data);
          }
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          // Save to localStorage even if server update fails
          this.settingsSubject.next(updated);
          this.saveToLocalStorage(updated);
          observer.error(error);
        }
      });
    });
  }

  private saveToLocalStorage(settings: AppSettings): void {
    // Only save in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('app_settings', JSON.stringify(settings));
      } catch (e) {
        // localStorage not available or quota exceeded
      }
    }
  }

  deleteSettings(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.baseUrl).pipe(
      tap(() => {
        const defaults = this.getDefaultSettings();
        this.settingsSubject.next(defaults);
        this.saveToLocalStorage(defaults);
      })
    );
  }

  resetSettings(): void {
    const defaults = this.getDefaultSettings();
    this.settingsSubject.next(defaults);
    this.saveToLocalStorage(defaults);
    this.deleteSettings().subscribe();
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
}
