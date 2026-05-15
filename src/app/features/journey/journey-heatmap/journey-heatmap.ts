import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

interface StageRow {
  stageName: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  painPoints: string[];
  satisfactionPoints: string[];
}

@Component({
  selector: 'app-journey-heatmap',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    OllamaLoader,
  ],
  templateUrl: './journey-heatmap.html',
  styleUrl: './journey-heatmap.css',
})
export class JourneyHeatmap implements OnInit {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  loading = signal(false);
  stages = signal<StageRow[]>([]);
  error = signal<string | null>(null);
  Math = Math;

  readonly pageSize = 20;
  page = signal(1);
  pagedStages = computed(() => {
    const all = this.stages();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.stages().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });

  ngOnInit(): void {
    this.loadHeatmap();
  }

  loadHeatmap(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.error.set(null);
    this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe({
      next: (res) => {
        if (!res.success) {
          this.stages.set([]);
          this.page.set(1);
          const hint = twitterCxReportFailureMessage(res.message);
          this.error.set(hint);
          this.snackBar.open(hint, 'Close', { duration: 7000 });
          this.loading.set(false);
          return;
        }
        this.error.set(null);
        if (res.success && Array.isArray(res.data?.heatmapPct)) {
          this.stages.set(
            res.data.heatmapPct.map((r: any) => ({
              stageName: r.stage ?? 'Unknown',
              satisfactionScore: Number(r.positive ?? 0) / 100,
              dissatisfactionScore: Number(r.negative ?? 0) / 100,
              feedbackCount: Number(r.total ?? 0),
              painPoints: [],
              satisfactionPoints: [],
            }))
          );
          this.page.set(1);
        } else {
          this.stages.set([]);
          this.page.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        const hint = twitterCxReportFailureMessage();
        this.error.set(hint);
        this.snackBar.open(hint, 'Close', { duration: 6000 });
        this.stages.set([]);
        this.page.set(1);
        this.loading.set(false);
      },
    });
  }

  getSatisfactionColor(score: number): string {
    if (score >= 0.5) return 'heat-high';
    if (score >= 0.2) return 'heat-mid';
    if (score > 0) return 'heat-low';
    return 'heat-none';
  }

  getDissatisfactionColor(score: number): string {
    if (score >= 0.6) return 'heat-pain-high';
    if (score >= 0.3) return 'heat-pain-mid';
    if (score > 0) return 'heat-pain-low';
    return 'heat-none';
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.stages().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }
}
