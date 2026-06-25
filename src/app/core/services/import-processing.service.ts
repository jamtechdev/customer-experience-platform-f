import { Injectable, inject, signal } from '@angular/core';
import { CSVService } from './csv.service';

/** Tracks active CSV import / AI analysis so CX pages stay quiet until processing finishes. */
@Injectable({ providedIn: 'root' })
export class ImportProcessingService {
  private readonly csv = inject(CSVService);
  private readonly active = signal(false);
  private syncInFlight = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly isActive = this.active.asReadonly();

  markProcessing(): void {
    this.active.set(true);
    this.startPolling();
  }

  markIdle(): void {
    this.active.set(false);
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
          this.active.set(true);
          this.startPolling();
        } else {
          this.active.set(false);
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
