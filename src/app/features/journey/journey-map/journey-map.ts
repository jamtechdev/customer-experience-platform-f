import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';

interface JourneyStage {
  id: number;
  name: string;
  satisfactionScore: number;
  dissatisfactionScore: number;
  feedbackCount: number;
  painPoints: string[];
  satisfactionPoints: string[];
  satisfactionReferenceIds: number[];
  dissatisfactionReferenceIds: number[];
}

@Component({
  selector: 'app-journey-map',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    MatSnackBarModule,
    OllamaLoader
  ],
  templateUrl: './journey-map.html',
  styleUrl: './journey-map.css',
})
export class JourneyMap implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<Array<{ id: number; content: string; contentSummary?: string; relevanceReason?: string; author?: string; date: string }>>([]);
  private refreshSub?: Subscription;

  loading = signal(false);
  journeyStages = signal<JourneyStage[]>([]);
  readonly pageSize = 20;
  page = signal(1);
  pagedJourneyStages = computed(() => {
    const all = this.journeyStages();
    const total = all.length;
    if (total === 0) return [];
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    const p = Math.min(Math.max(1, this.page()), maxPage);
    const start = (p - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });
  totalPages = computed(() => {
    const total = this.journeyStages().length;
    return total === 0 ? 0 : Math.ceil(total / this.pageSize);
  });

  readonly flowStepTarget = 3;

  ngOnInit(): void {
    this.loadJourneyData();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadJourneyData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadJourneyData(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.twitterCxReportStore.loadTwitterCxReport(companyId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.journeyStages.set([]);
          this.page.set(1);
          this.snackBar.open(twitterCxReportFailureMessage(response.message), 'Close', { duration: 7000 });
          this.loading.set(false);
          return;
        }
        try {
          if (response.success && response.data?.journeyRows) {
            const rows = response.data.journeyRows;
            this.journeyStages.set(
              rows.map((r: any, idx: number) => ({
                id: idx + 1,
                name: r?.stage ?? '',
                satisfactionScore: 0,
                dissatisfactionScore: 0,
                feedbackCount: typeof r?.feedbackCount === 'number' ? r.feedbackCount : 0,
                painPoints: [
                  String(r?.dissatisfactionSummary ?? r?.dissatisfaction ?? ''),
                ].filter(Boolean),
                satisfactionPoints: [
                  String(r?.satisfactionSummary ?? r?.satisfaction ?? ''),
                ].filter(Boolean),
                satisfactionReferenceIds: Array.isArray(r?.satisfactionReferenceIds)
                  ? r.satisfactionReferenceIds
                  : [],
                dissatisfactionReferenceIds: Array.isArray(r?.dissatisfactionReferenceIds)
                  ? r.dissatisfactionReferenceIds
                  : [],
              }))
            );
            this.page.set(1);
          } else {
            this.journeyStages.set([]);
            this.page.set(1);
          }
        } finally {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
        this.journeyStages.set([]);
        this.page.set(1);
      }
    });
  }

  goPrevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  goNextPage(): void {
    const total = this.journeyStages().length;
    if (total === 0) return;
    const maxPage = Math.ceil(total / this.pageSize);
    this.page.update((p) => Math.min(maxPage, p + 1));
  }

  getSatisfactionColor(score: number): string {
    // Backend returns satisfactionScore in 0..1 range; UI shows it as percentage.
    const pct = score * 100;
    if (pct >= 70) return 'satisfaction-high';
    if (pct >= 50) return 'satisfaction-medium';
    return 'satisfaction-low';
  }

  thirdFlowMilestoneMet(): boolean {
    const stages = this.journeyStages();
    if (stages.length < this.flowStepTarget) return false;
    return stages.slice(0, this.flowStepTarget).every((s) => s.feedbackCount > 0);
  }

  flowStagesWithDataInFirstThree(): number {
    return this.journeyStages()
      .slice(0, this.flowStepTarget)
      .filter((s) => s.feedbackCount > 0).length;
  }

  openReferences(stageName: string, polarity: 'satisfaction' | 'dissatisfaction', ids: number[]): void {
    if (!ids.length) return;
    this.drilldownTitle.set(`${stageName} · ${polarity}`);
    this.drilldownOpen.set(true);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.authService.currentUser()?.settings?.companyId ?? 1;
    this.analysisService.getFeedbackByIds(companyId, ids).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
      },
      error: () => this.drilldownLoading.set(false),
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
  }

  flowMilestoneMessage(): string {
    const stages = this.journeyStages();
    if (stages.length === 0) return '';
    if (stages.length < this.flowStepTarget) {
      return `Add at least ${this.flowStepTarget} journey stages (touchpoints) so the flow can run through the third step.`;
    }
    if (this.thirdFlowMilestoneMet()) {
      return 'Third-flow milestone met: the first three stages all have feedback linked.';
    }
    const n = this.flowStagesWithDataInFirstThree();
    return `Flow progress: ${n}/3 of the first three stages have feedback. Map CSV touchpoints or categories to each stage so the journey completes through step three.`;
  }
}
