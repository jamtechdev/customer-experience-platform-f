import { Injectable, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { TwitterCxReportStore } from './twitter-cx-report.store';
import { ImportProcessingService } from './import-processing.service';
import { environment } from '../../../environments/environment';

export type CSVImportStatusEvent = {
  importId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  errorDetails?: any;
};

export type AnalyticsLifecycleEvent = {
  type: 'datasetUploaded' | 'datasetDeleted' | 'analysisStarted' | 'analysisCompleted' | 'analysisFailed';
  importId?: number;
  companyId?: number;
  status?: string;
  message?: string;
  details?: any;
};

export type AlertCreatedEvent = {
  companyId?: number;
  alert: any;
  timestamp?: string | Date;
};

@Injectable({
  providedIn: 'root',
})
export class CXWebSocketService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private importProcessing = inject(ImportProcessingService);

  private started = signal(false);
  private socket: Socket | null = null;
  private latestCompanyId: number | null = null;

  private importStatusSubject = new Subject<CSVImportStatusEvent>();
  private analyticsLifecycleSubject = new Subject<AnalyticsLifecycleEvent>();
  private alertCreatedSubject = new Subject<AlertCreatedEvent>();

  onCSVImportStatus(): Observable<CSVImportStatusEvent> {
    return this.importStatusSubject.asObservable();
  }

  onAnalyticsLifecycle(): Observable<AnalyticsLifecycleEvent> {
    return this.analyticsLifecycleSubject.asObservable();
  }

  onAlertCreated(): Observable<AlertCreatedEvent> {
    return this.alertCreatedSubject.asObservable();
  }

  start(): void {
    if (this.started()) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const apiBase = (environment.apiUrl || '').replace(/\/api\/?$/, '');
    const socketUrl = apiBase || 'http://localhost:5000';

    this.socket = io(socketUrl, {
      path: '/socket.io',
      // Allow polling fallback in local/dev where websocket upgrades may be delayed.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.started.set(true);

    const tryJoin = () => {
      if (!this.socket || !this.socket.connected) return;
      if (this.latestCompanyId == null) return;
      this.socket.emit('join:company', String(this.latestCompanyId));
    };

    this.socket.on('connect', () => {
      this.importProcessing.syncFromApi();
      tryJoin();
    });

    this.socket.on('reconnect', () => {
      this.importProcessing.syncFromApi();
      tryJoin();
    });

    this.socket.on('csv:importStatus', (payload: any) => {
      const ev: CSVImportStatusEvent = {
        importId: payload?.importId,
        status: payload?.status,
        errorMessage: payload?.errorMessage,
        errorDetails: payload?.errorDetails,
      };
      if (ev.importId == null || !ev.status) return;

      if (ev.status === 'processing') {
        this.importProcessing.markProcessing();
      } else if (ev.status === 'completed' || ev.status === 'failed') {
        this.importProcessing.markIdle();
      }

      this.importStatusSubject.next(ev);

      if (ev.status === 'completed' && this.latestCompanyId != null) {
        this.twitterCxReportStore.invalidate(this.latestCompanyId);
      }
    });

    const handleLifecycle = (payload: any) => {
      const ev: AnalyticsLifecycleEvent = {
        type: payload?.type,
        importId: payload?.importId,
        companyId: payload?.companyId,
        status: payload?.status,
        message: payload?.message,
        details: payload?.details,
      };
      if (!ev.type) return;
      this.analyticsLifecycleSubject.next(ev);
      if (ev.type === 'analysisCompleted') {
        this.importProcessing.markIdle();
        this.importStatusSubject.next({
          importId: ev.importId ?? -1,
          status: 'completed',
          errorMessage: ev.message,
          errorDetails: ev.details,
        });
      } else if (ev.type === 'analysisStarted' || ev.type === 'datasetUploaded') {
        this.importProcessing.markProcessing();
        this.importStatusSubject.next({
          importId: ev.importId ?? -1,
          status: 'processing',
          errorMessage: ev.message,
          errorDetails: ev.details,
        });
      } else if (ev.type === 'analysisFailed') {
        this.importProcessing.markIdle();
      } else if (ev.type === 'datasetDeleted') {
        this.importProcessing.markIdle();
      }

      const companyId = ev.companyId ?? this.latestCompanyId ?? undefined;
      const shouldInvalidate =
        ev.type === 'analysisCompleted' ||
        ev.type === 'datasetDeleted' ||
        ev.type === 'analysisFailed';
      if (shouldInvalidate) {
        this.twitterCxReportStore.invalidate(companyId);
      }
    };

    this.socket.on('analytics:lifecycle', handleLifecycle);
    this.socket.on('dashboard:update', handleLifecycle);
    this.socket.on('alert:new', (payload: any) => {
      if (!payload?.alert) return;
      this.alertCreatedSubject.next({
        companyId: payload.companyId,
        alert: payload.alert,
        timestamp: payload.timestamp,
      });
    });

    // Keep company room in sync with auth changes
    this.authService.currentUser$.subscribe((u) => {
      this.latestCompanyId = u?.settings?.companyId ?? 1;
      tryJoin();
    });
  }
}

