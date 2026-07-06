import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from './analysis.service';
import { AuthService } from './auth.service';
import { CXWebSocketService } from './cx-websocket.service';
import { ImportLiveRefreshService, type ImportLiveProgress } from './import-live-refresh.service';
import { ImportProcessingService } from './import-processing.service';
import { TwitterCxReportStore } from './twitter-cx-report.store';
import { resolveAppCompanyId } from '../utils/company-scope';

export type CxAnalysisPhase =
  | 'idle'
  | 'importing'
  | 'ai_processing'
  | 'snapshot_building'
  | 'failed';

type SnapshotStatus = 'none' | 'pending' | 'ready' | 'failed';

/**
 * Single source of truth for the global AI-analysis banner.
 * Stays active until CSV import, row-level AI enrichment, and CX snapshot are all complete.
 */
@Injectable({ providedIn: 'root' })
export class CxAnalysisProgressService {
  private readonly analysis = inject(AnalysisService);
  private readonly auth = inject(AuthService);
  private readonly websocket = inject(CXWebSocketService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly liveRefresh = inject(ImportLiveRefreshService);
  private readonly twitterCxReportStore = inject(TwitterCxReportStore);

  private readonly phaseSignal = signal<CxAnalysisPhase>('idle');
  private readonly snapshotStatusSignal = signal<SnapshotStatus>('none');
  private readonly syncInFlight = signal(false);

  private started = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private subs: Subscription | null = null;

  readonly phase = this.phaseSignal.asReadonly();
  readonly snapshotStatus = this.snapshotStatusSignal.asReadonly();
  readonly liveProgress = this.liveRefresh.progress;

  /** True while any AI / snapshot work is still running — drives the global banner. */
  readonly isActive = computed(() => {
    const phase = this.phaseSignal();
    return phase === 'importing' || phase === 'ai_processing' || phase === 'snapshot_building';
  });

  readonly progressPercent = computed(() => {
    const phase = this.phaseSignal();
    const p = this.liveRefresh.progress();
    if (phase === 'snapshot_building') {
      return Math.min(98, Math.max(88, this.liveRefresh.progressPercent() || 92));
    }
    if (!p) return phase === 'ai_processing' ? 45 : 12;
    if (p.statusLabel === 'processing_ai' && p.aiTotal && p.aiTotal > 0) {
      return Math.min(85, Math.round(((p.aiSucceeded ?? 0) / p.aiTotal) * 85));
    }
    if (p.statusLabel === 'processing_nps') return 88;
    if (p.statusLabel === 'processing_post_analysis') return 92;
    return this.liveRefresh.progressPercent();
  });

  start(): void {
    if (this.started) return;
    this.started = true;

    this.subs = this.importProcessing.becameIdle$.subscribe(() => {
      void this.syncSnapshotStatus(true);
    });

    this.subs.add(
      this.websocket.onCSVImportStatus().subscribe((ev) => {
        if (ev.status === 'processing') this.recomputePhase();
        if (ev.status === 'completed' || ev.status === 'failed') {
          void this.syncSnapshotStatus(ev.status === 'completed');
        }
      })
    );

    this.subs.add(
      this.websocket.onAnalyticsLifecycle().subscribe((ev) => {
        if (ev.type === 'analysisStarted' || ev.type === 'datasetUploaded') {
          this.recomputePhase();
          this.ensurePolling();
        }
        if (ev.type === 'analysisCompleted') {
          void this.syncSnapshotStatus(true);
        }
        if (ev.type === 'analysisFailed') {
          this.phaseSignal.set('failed');
          this.stopPolling();
        }
      })
    );

    this.subs.add(this.liveRefresh.liveTick$.subscribe(() => this.recomputePhase()));

    this.subs.add(this.auth.currentUser$.subscribe(() => void this.syncSnapshotStatus(false)));

    this.importProcessing.syncFromApi();
    void this.syncSnapshotStatus(false);
    this.ensurePolling();
  }

  /** HTTP + store hooks — optional hint that a page-level report load is still pending. */
  notifyReportLoadPending(pending: boolean): void {
    if (pending) {
      this.snapshotStatusSignal.set('pending');
      this.phaseSignal.set('snapshot_building');
      this.ensurePolling();
      return;
    }
    void this.syncSnapshotStatus(false);
  }

  private companyId(): number {
    return resolveAppCompanyId(this.auth.currentUser());
  }

  private syncSnapshotStatus(invalidateOnReady: boolean): void {
    if (this.syncInFlight()) return;
    this.syncInFlight.set(true);
    this.analysis.getTwitterCxCompanySnapshotStatus(this.companyId()).subscribe({
      next: (res) => {
        this.syncInFlight.set(false);
        const status: SnapshotStatus = res.data?.status ?? 'none';
        this.snapshotStatusSignal.set(status);

        if (status === 'ready') {
          this.twitterCxReportStore.markSnapshotReady();
          if (invalidateOnReady) {
            this.twitterCxReportStore.invalidate(this.companyId());
          }
          this.recomputePhase();
          this.stopPolling();
          return;
        }

        if (status === 'failed') {
          this.phaseSignal.set('failed');
          this.twitterCxReportStore.markSnapshotReady();
          this.stopPolling();
          return;
        }

        if (status === 'pending') {
          this.phaseSignal.set('snapshot_building');
          this.ensurePolling();
          return;
        }

        this.recomputePhase();
      },
      error: () => {
        this.syncInFlight.set(false);
        this.recomputePhase();
      },
    });
  }

  private recomputePhase(): void {
    if (this.importProcessing.isActive()) {
      const label = this.liveRefresh.progress()?.statusLabel;
      if (
        label === 'processing_ai' ||
        label === 'processing_nps' ||
        label === 'processing_post_analysis'
      ) {
        this.phaseSignal.set('ai_processing');
      } else {
        this.phaseSignal.set('importing');
      }
      this.ensurePolling();
      return;
    }

    if (this.snapshotStatusSignal() === 'pending') {
      this.phaseSignal.set('snapshot_building');
      this.ensurePolling();
      return;
    }

    if (this.snapshotStatusSignal() === 'failed') {
      this.phaseSignal.set('failed');
      this.stopPolling();
      return;
    }

    this.phaseSignal.set('idle');
    this.stopPolling();
  }

  private ensurePolling(): void {
    if (this.pollTimer != null) return;
    this.pollTimer = setInterval(() => {
      if (!this.isActive() && this.snapshotStatusSignal() !== 'pending') {
        this.stopPolling();
        return;
      }
      this.recomputePhase();
      if (this.snapshotStatusSignal() === 'pending' || this.importProcessing.isActive()) {
        void this.syncSnapshotStatus(false);
      }
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Banner subtitle from current phase + websocket progress. */
  messageForPhase(
    translate: (key: string, params?: Record<string, string | number>) => string
  ): string {
    const phase = this.phaseSignal();
    const p: ImportLiveProgress | null = this.liveRefresh.progress();

    if (phase === 'snapshot_building') {
      return translate('importAnalysis.liveReportBuilding');
    }

    if (!p || phase === 'idle') {
      return translate('importAnalysis.loaderSubtitle');
    }

    const label = p.statusLabel;
    if (label === 'processing_ai' && p.aiTotal && p.aiTotal > 0) {
      return translate('importAnalysis.liveAiProgress', {
        done: p.aiSucceeded ?? 0,
        total: p.aiTotal,
      });
    }
    if (label === 'processing_nps') {
      return translate('importAnalysis.liveNpsPhase');
    }
    if (label === 'processing_post_analysis') {
      return translate('importAnalysis.liveJourneyPhase');
    }
    if (p.importedCount && p.importedCount > 0) {
      return translate('importAnalysis.liveRowsSaved', { count: p.importedCount });
    }
    return translate('importAnalysis.liveImporting');
  }
}
