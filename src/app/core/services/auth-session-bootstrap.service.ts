import { Injectable, inject } from '@angular/core';
import { CXWebSocketService } from './cx-websocket.service';
import { ImportProcessingService } from './import-processing.service';
import { ImportLiveRefreshService } from './import-live-refresh.service';
import { CxAnalysisProgressService } from './cx-analysis-progress.service';

/**
 * Starts authenticated background services once per browser session
 * (after login or when a cookie session already exists at boot).
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionBootstrap {
  private readonly websocket = inject(CXWebSocketService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly liveRefresh = inject(ImportLiveRefreshService);
  private readonly cxProgress = inject(CxAnalysisProgressService);
  private started = false;

  startIfNeeded(): void {
    if (this.started) return;
    this.started = true;
    this.websocket.start();
    this.importProcessing.syncFromApi();
    this.liveRefresh.start();
    this.cxProgress.start();
  }
}
