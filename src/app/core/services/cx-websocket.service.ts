import { Injectable, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export type CSVImportStatusEvent = {
  importId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  errorDetails?: any;
};

@Injectable({
  providedIn: 'root',
})
export class CXWebSocketService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);

  private started = signal(false);
  private socket: Socket | null = null;
  private latestCompanyId: number | null = null;

  private importStatusSubject = new Subject<CSVImportStatusEvent>();

  onCSVImportStatus(): Observable<CSVImportStatusEvent> {
    return this.importStatusSubject.asObservable();
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
      tryJoin();
    });

    this.socket.on('reconnect', () => {
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
      this.importStatusSubject.next(ev);
    });

    // Keep company room in sync with auth changes
    this.authService.currentUser$.subscribe((u) => {
      this.latestCompanyId = u?.settings?.companyId ?? 1;
      tryJoin();
    });
  }
}

