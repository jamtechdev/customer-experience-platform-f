import { Injectable, inject, signal } from '@angular/core';
import { CSVService } from './csv.service';

/** Tracks active CSV import / AI analysis so CX pages stay quiet until processing finishes. */
@Injectable({ providedIn: 'root' })
export class ImportProcessingService {
  private readonly csv = inject(CSVService);
  private readonly active = signal(false);
  private syncInFlight = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Ignore stale "processing" poll results briefly after import completes. */
  private idleSinceMs = 0;

  readonly isActive = this.active.asReadonly();

  markProcessing(): void {
    this.idleSinceMs = 0;
    this.active.set(true);
    this.startPolling();
  }

  markIdle(): void {
    this.active.set(false);
    this.idleSinceMs = Date.now();
    this.stopPolling();
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
          this.active.set(true);
          this.startPolling();
        } else {
          this.active.set(false);
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
