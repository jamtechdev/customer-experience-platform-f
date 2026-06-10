import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { SocialMediaService } from '../../../core/services/social-media.service';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { CXWebSocketService } from '../../../core/services/cx-websocket.service';
import { TranslationService } from '../../../core/services/translation.service';

interface PlatformData {
  platform: string;
  volume: number;
  positive: number;
  negative: number;
  neutral: number;
  sentimentScore: number;
  feedbackIds: number[];
  positiveFeedbackIds: number[];
  negativeFeedbackIds: number[];
  neutralFeedbackIds: number[];
}

@Component({
  selector: 'app-social-analysis',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
    OllamaLoader,
  ],
  templateUrl: './social-analysis.html',
  styleUrl: './social-analysis.css',
})
export class SocialAnalysis implements OnInit, OnDestroy {
  private socialMediaService = inject(SocialMediaService);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private websocket = inject(CXWebSocketService);
  private translationService = inject(TranslationService);
  private lifecycleSub?: Subscription;

  loading = signal(false);
  error = signal<string | null>(null);
  platformData = signal<PlatformData[]>([]);
  volumeNarrative = signal<string | null>(null);
  sentimentNarrative = signal<string | null>(null);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<Array<{ id: number; content: string; contentSummary?: string; sentiment: string; date: string }>>([]);
  drilldownRequestedCount = signal(0);
  drilldownRequestedLimit = this.analysisService.drilldownIdLimit;
  displayedColumns: string[] = ['platform', 'volume', 'sentiment', 'positive', 'negative', 'neutral'];
  readonly t = (key: string, params?: Record<string, string | number>): string =>
    this.translationService.translate(key, params);

  totalVolume = computed(() => {
    return this.platformData().reduce((sum, p) => sum + p.volume, 0);
  });

  averageSentiment = computed(() => {
    const data = this.platformData();
    if (data.length === 0) return 0;
    const total = data.reduce((sum, p) => sum + p.sentimentScore, 0);
    return (total / data.length * 100);
  });

  ngOnInit(): void {
    this.loadSocialMediaData();
    this.lifecycleSub = this.websocket.onAnalyticsLifecycle().subscribe((event) => {
      if (event.type === 'datasetDeleted' || event.type === 'analysisCompleted') {
        this.loadSocialMediaData();
      }
    });
  }

  ngOnDestroy(): void {
    this.lifecycleSub?.unsubscribe();
  }

  loadSocialMediaData(): void {
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.loading.set(true);
    this.error.set(null);

    this.volumeNarrative.set(null);
    this.sentimentNarrative.set(null);
    this.socialMediaService.getVolume(companyId).subscribe({
      next: (volRes) => {
        this.socialMediaService.getSentimentDistribution(companyId).subscribe({
          next: (distRes) => {
            const volume = volRes.success ? volRes.data : null;
            const dist = distRes.success ? distRes.data : null;
            this.volumeNarrative.set(volume?.aiNarrative?.trim() ? volume.aiNarrative : null);
            this.sentimentNarrative.set(dist?.aiNarrative?.trim() ? dist.aiNarrative : null);
            const rows: PlatformData[] = [];
            const platforms = new Set<string>();
            if (volume?.mentionsPerPlatform) {
              Object.keys(volume.mentionsPerPlatform).forEach(p => platforms.add(p));
            }
            if (dist?.channelComparison) {
              Object.keys(dist.channelComparison).forEach(p => platforms.add(p));
            }
            platforms.forEach(platform => {
              const vol = volume?.mentionsPerPlatform?.[platform] ?? 0;
              const ch = dist?.channelComparison?.[platform] ?? { positive: 0, negative: 0, neutral: 0 };
              const ids = volume?.feedbackIdsPerPlatform?.[platform] ?? dist?.channelFeedbackIds?.[platform]?.all ?? [];
              const sentimentIds = dist?.channelFeedbackIds?.[platform] ?? {
                positive: [],
                negative: [],
                neutral: [],
                all: ids,
              };
              const total = ch.positive + ch.negative + ch.neutral || 1;
              const sentimentScore = total > 0 ? (ch.positive - ch.negative) / total : 0;
              const normalized = (sentimentScore + 1) / 2;
              rows.push({
                platform,
                volume: vol,
                positive: ch.positive,
                negative: ch.negative,
                neutral: ch.neutral,
                sentimentScore: normalized,
                feedbackIds: ids,
                positiveFeedbackIds: sentimentIds.positive || [],
                negativeFeedbackIds: sentimentIds.negative || [],
                neutralFeedbackIds: sentimentIds.neutral || [],
              });
            });
            rows.sort((a, b) => b.volume - a.volume);
            this.platformData.set(rows);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.volumeNarrative.set(null);
            this.sentimentNarrative.set(null);
            this.error.set(this.t('socialMediaPage.sentimentLoadFailed'));
            this.snackBar.open(this.t('socialMediaPage.sentimentLoadFailed'), this.t('app.close'), { duration: 3000 });
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.volumeNarrative.set(null);
        this.sentimentNarrative.set(null);
        this.error.set(this.t('socialMediaPage.volumeLoadFailed'));
        this.snackBar.open(this.t('socialMediaPage.volumeLoadFailed'), this.t('app.close'), { duration: 3000 });
      }
    });
  }

  totalFeedbackIds(): number[] {
    return [...new Set(this.platformData().flatMap((row) => row.feedbackIds || []))];
  }

  openRelated(title: string, ids: number[]): void {
    const unique = [...new Set((ids || []).filter((id) => Number.isFinite(id) && id > 0))];
    if (!unique.length) return;
    const safeIds = unique.slice(0, this.drilldownRequestedLimit);
    this.drilldownTitle.set(title);
    this.drilldownRequestedCount.set(unique.length);
    this.drilldownOpen.set(true);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.analysisService.getAnalyticsDrilldown({ companyId, ids: safeIds }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set(res?.data?.list || []);
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownRows.set([]);
      },
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownRequestedCount.set(0);
  }
}
