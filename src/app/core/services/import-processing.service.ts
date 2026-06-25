import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { CSVService } from './csv.service';

/** Tracks active CSV import / AI analysis so CX pages stay quiet until processing finishes. */
@Injectable({ providedIn: 'root' })
export class ImportProcessingService {
  private readonly csv = inject(CSVService);
  private readonly active = signal(false);
  private readonly becameIdleSubject = new Subject<void>();
  private syncInFlight = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Ignore stale "processing" poll results briefly after import completes. */
  private idleSinceMs = 0;

  readonly isActive = this.active.asReadonly();
  /** Emits once when import / AI processing transitions from active to idle. */
  readonly becameIdle$ = this.becameIdleSubject.asObservable();

  markProcessing(): void {
    this.idleSinceMs = 0;
    this.active.set(true);
    this.startPolling();
  }

  markIdle(): void {
    const wasActive = this.active();
    this.active.set(false);
    this.idleSinceMs = Date.now();
    this.stopPolling();
    if (wasActive) {
      this.becameIdleSubject.next();
    }
  }

  /** HTTP fallback when websocket events were missed (e.g. page refresh). */
  syncFromApi(): void {
    if (this.syncInFlight) return;
    this.syncInFlight = true;
    this.csv.getImports().subscribe({
      next: (res) => {
        this.syncInFlight = false;
        const rows = Array.isArray(res.data) ? res.data : [];
        const busy = rows.some((row) => row.status === 'processing');
        if (busy) {
          if (this.idleSinceMs > 0 && Date.now() - this.idleSinceMs < 4000) {
            return;
          }
          this.markProcessing();
        } else if (this.active()) {
          this.markIdle();
        } else {
          this.idleSinceMs = Date.now();
          this.stopPolling();
        }
      },
      error: () => {
        this.syncInFlight = false;
      },
    });
  }

  private startPolling(): void {
    if (this.pollTimer != null) return;
    this.pollTimer = setInterval(() => this.syncFromApi(), 2500);
  }

  private stopPolling(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
