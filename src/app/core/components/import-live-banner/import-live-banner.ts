import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CxAnalysisProgressService } from '../../services/cx-analysis-progress.service';
import { TranslationService } from '../../services/translation.service';

/** Global banner — visible on every /app page until CSV import, AI enrichment, and CX snapshot all finish. */
@Component({
  selector: 'app-import-live-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './import-live-banner.html',
  styleUrl: './import-live-banner.css',
})
export class ImportLiveBanner {
  private readonly cxProgress = inject(CxAnalysisProgressService);
  private readonly translationService = inject(TranslationService);

  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  readonly visible = this.cxProgress.isActive;
  readonly progressPct = this.cxProgress.progressPercent;

  readonly message = computed(() => this.cxProgress.messageForPhase((key, params) => this.t(key, params)));
}
