import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ImportLiveRefreshService } from '../../services/import-live-refresh.service';
import { ImportProcessingService } from '../../services/import-processing.service';
import { TwitterCxReportStore } from '../../services/twitter-cx-report.store';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-import-live-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './import-live-banner.html',
  styleUrl: './import-live-banner.css',
})
export class ImportLiveBanner {
  private readonly liveRefresh = inject(ImportLiveRefreshService);
  private readonly importProcessing = inject(ImportProcessingService);
  private readonly twitterCxReportStore = inject(TwitterCxReportStore);
  private readonly translationService = inject(TranslationService);

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  readonly visible = computed(
    () =>
      this.importProcessing.isActive() ||
      this.twitterCxReportStore.snapshotPending() ||
      this.liveRefresh.progress() != null
  );

  readonly progressPct = computed(() => {
    if (this.twitterCxReportStore.snapshotPending() && !this.importProcessing.isActive()) {
      return Math.min(95, this.liveRefresh.progressPercent() || 88);
    }
    return this.liveRefresh.progressPercent();
  });

  readonly message = computed(() => {
    const p = this.liveRefresh.progress();
    if (this.twitterCxReportStore.snapshotPending() && !this.importProcessing.isActive()) {
      return this.t('importAnalysis.liveReportBuilding');
    }
    if (!p) {
      return this.t('importAnalysis.loaderSubtitle');
    }
    const label = p.statusLabel;
    if (label === 'processing_ai' && p.aiTotal && p.aiTotal > 0) {
      return this.t('importAnalysis.liveAiProgress', {
        done: p.aiSucceeded ?? 0,
        total: p.aiTotal,
      });
    }
    if (label === 'processing_nps') {
      return this.t('importAnalysis.liveNpsPhase');
    }
    if (label === 'processing_post_analysis') {
      return this.t('importAnalysis.liveJourneyPhase');
    }
    if (p.importedCount && p.importedCount > 0) {
      return this.t('importAnalysis.liveRowsSaved', { count: p.importedCount });
    }
    return this.t('importAnalysis.liveImporting');
  });
}
