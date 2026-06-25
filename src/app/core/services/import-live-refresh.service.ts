import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, Subscription, throttleTime } from 'rxjs';
import { CXWebSocketService, type CSVImportStatusEvent } from './cx-websocket.service';
import { ImportProcessingService } from './import-processing.service';

export interface ImportLiveProgress {
  importId?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  statusLabel?: string;
  totalRows?: number;
  importedCount?: number;
  processedCount?: number;
  completionPct?: number;
  aiSucceeded?: number;
  aiTotal?: number;
  aiFailed?: number;
}

/** Drives real-time UI refresh while CSV import + AI analysis runs in the background. */
@Injectable({ providedIn: 'root' })
export class ImportLiveRefreshService {
  private readonly websocket = inject(CXWebSocketService);
  private readonly importProcessing = inject(ImportProcessingService);

  private readonly progressSignal = signal<ImportLiveProgress | null>(null);
  private readonly liveTickSubject = new Subject<ImportLiveProgress>();
  private lastAiSucceeded = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private subs: Subscription | null = null;
  private started = false;

  readonly progress = this.progressSignal.asReadonly();
  readonly liveTick$ = this.liveTickSubject.pipe(throttleTime(1800, undefined, { leading: true, trailing: true }));

  readonly isLive = computed(() => this.importProcessing.isActive() && this.progressSignal() != null);

  readonly progressPercent = computed(() => {
    const p = this.progressSignal();
    if (!p) return 0;
    if (p.statusLabel === 'processing_ai' && p.aiTotal && p.aiTotal > 0) {
      return Math.min(100, Math.round(((p.aiSucceeded ?? 0) / p.aiTotal) * 100));
    }
    if (typeof p.completionPct === 'number') return Math.min(100, Math.max(0, p.completionPct));
    if (p.totalRows && p.processedCount != null) {
      return Math.min(100, Math.round((p.processedCount / p.totalRows) * 100));
    }
    return 8;
  });

  start(): void {
    if (this.started) return;
    this.started = true;

    this.subs = this.websocket.onCSVImportStatus().subscribe((ev) => this.handleImportEvent(ev));
    this.subs.add(
      this.importProcessing.becameIdle$.subscribe(() => {
        this.emitTick(this.progressSignal() ?? { status: 'completed' });
        this.clear();
      })
    );
  }

  private handleImportEvent(ev: CSVImportStatusEvent): void {
    const details = ev.errorDetails ?? {};
    const next: ImportLiveProgress = {
      importId: ev.importId,
      status: ev.status,
      statusLabel: details.statusLabel,
      totalRows: details.totalRows,
      importedCount: details.importedCount,
      processedCount: details.processedCount,
      completionPct: details.completionPct,
      aiSucceeded: details.aiSummary?.succeeded,
      aiTotal: details.aiSummary?.attempted,
      aiFailed: details.aiSummary?.failed,
    };

    if (ev.status === 'processing') {
      this.progressSignal.set(next);
      const aiSucceeded = next.aiSucceeded ?? 0;
      const aiAdvanced = aiSucceeded > this.lastAiSucceeded;
      if (aiAdvanced) this.lastAiSucceeded = aiSucceeded;
      const phaseAdvanced =
        next.statusLabel === 'processing_nps' ||
        next.statusLabel === 'processing_post_analysis' ||
        next.statusLabel === 'processing';
      if (aiAdvanced || phaseAdvanced || aiSucceeded === 0) {
        this.emitTick(next);
      }
      this.ensurePoll();
      return;
    }

    if (ev.status === 'completed') {
      this.progressSignal.set(next);
      this.emitTick(next);
      this.clear();
      return;
    }

    if (ev.status === 'failed') {
      this.clear();
    }
  }

  private ensurePoll(): void {
    if (this.pollTimer != null) return;
    this.pollTimer = setInterval(() => {
      if (!this.importProcessing.isActive()) {
        this.clear();
        return;
      }
      const p = this.progressSignal();
      if (p) this.emitTick(p);
    }, 3200);
  }

  private emitTick(progress: ImportLiveProgress): void {
    this.liveTickSubject.next(progress);
  }

  private clear(): void {
    this.lastAiSucceeded = 0;
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.progressSignal.set(null);
  }
}
