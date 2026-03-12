import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { SocialMediaService } from '../../../core/services/social-media.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface PlatformData {
  platform: string;
  volume: number;
  positive: number;
  negative: number;
  neutral: number;
  sentimentScore: number;
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
    MatSnackBarModule
  ],
  templateUrl: './social-analysis.html',
  styleUrl: './social-analysis.css',
})
export class SocialAnalysis implements OnInit {
  private socialMediaService = inject(SocialMediaService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  error = signal<string | null>(null);
  platformData = signal<PlatformData[]>([]);
  displayedColumns: string[] = ['platform', 'volume', 'sentiment', 'positive', 'negative', 'neutral'];

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
  }

  loadSocialMediaData(): void {
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.loading.set(true);
    this.error.set(null);

    this.socialMediaService.getVolume(companyId).subscribe({
      next: (volRes) => {
        this.socialMediaService.getSentimentDistribution(companyId).subscribe({
          next: (distRes) => {
            const volume = volRes.success ? volRes.data : null;
            const dist = distRes.success ? distRes.data : null;
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
              const total = ch.positive + ch.negative + ch.neutral || 1;
              const sentimentScore = total > 0 ? (ch.positive - ch.negative) / total : 0;
              const normalized = (sentimentScore + 1) / 2;
              rows.push({
                platform,
                volume: vol,
                positive: ch.positive,
                negative: ch.negative,
                neutral: ch.neutral,
                sentimentScore: normalized
              });
            });
            rows.sort((a, b) => b.volume - a.volume);
            this.platformData.set(rows);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Failed to load sentiment distribution');
            this.snackBar.open('Failed to load sentiment distribution', 'Close', { duration: 3000 });
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load volume data');
        this.snackBar.open('Failed to load volume data', 'Close', { duration: 3000 });
      }
    });
  }
}
