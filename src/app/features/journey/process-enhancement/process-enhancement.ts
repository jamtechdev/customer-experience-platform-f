import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TwitterCxReportStore } from '../../../core/services/twitter-cx-report.store';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { twitterCxReportFailureMessage } from '../../../core/utils/twitter-cx-report-load';
import { RelatedFeedbackModal, RelatedFeedbackRow } from '../../../core/components/related-feedback-modal/related-feedback-modal';

export interface ProcessImprovementRow {
  text: string;
  referenceFeedbackIds: number[];
}

@Component({
  selector: 'app-process-enhancement',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
    OllamaLoader,
    RelatedFeedbackModal
  ],
  templateUrl: './process-enhancement.html',
  styleUrl: './process-enhancement.css',
})
export class ProcessEnhancement implements OnInit, OnDestroy {
  private twitterCxReportStore = inject(TwitterCxReportStore);
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private refreshSub?: Subscription;

  loading = signal(false);
  processImprovements = signal<ProcessImprovementRow[]>([]);
  managementTakeaways = signal<string[]>([]);
  drilldownOpen = signal(false);
  drilldownLoading = signal(false);
  drilldownTitle = signal('');
  drilldownRows = signal<RelatedFeedbackRow[]>([]);
  drilldownPage = signal(1);
  drilldownTotal = signal(0);
  readonly drilldownPageSize = 10;
  private drilldownIds: number[] = [];

  ngOnInit(): void {
    this.loadProcessData();
    this.refreshSub = this.twitterCxReportStore.onRefresh$.subscribe(() => this.loadProcessData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadProcessData(): void {
    const user = this.authService.currentUser();
    const companyId = user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
    this.loading.set(true);
    this.twitterCxReportStore
      .loadTwitterCxReport(companyId)
      .subscribe({
        next: (res) => {
          if (res.message === 'stale_response') {
            this.loading.set(false);
            return;
          }
          if (!res.success) {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
            this.snackBar.open(twitterCxReportFailureMessage(res.message), 'Close', { duration: 8000 });
            this.loading.set(false);
            return;
          }
          if (res.success && res.data) {
            const items = res.data.processImprovementItems;
            if (items?.length) {
              this.processImprovements.set(
                items.map((p) => ({
                  text: p.text,
                  referenceFeedbackIds: Array.isArray(p.referenceFeedbackIds) ? p.referenceFeedbackIds : [],
                }))
              );
            } else {
              this.processImprovements.set(
                (res.data.processImprovements ?? []).map((text) => ({
                  text,
                  referenceFeedbackIds: [],
                }))
              );
            }
            this.managementTakeaways.set(res.data.managementTakeaways ?? []);
          } else {
            this.processImprovements.set([]);
            this.managementTakeaways.set([]);
          }
          this.loading.set(false);
        },
        error: () => {
          this.processImprovements.set([]);
          this.managementTakeaways.set([]);
          this.loading.set(false);
          this.snackBar.open(twitterCxReportFailureMessage(), 'Close', { duration: 6000 });
        },
      });
  }

  openReferences(row: ProcessImprovementRow): void {
    const ids = row.referenceFeedbackIds ?? [];
    if (!ids.length) return;
    this.drilldownTitle.set('Process improvement · reference tweets');
    this.drilldownOpen.set(true);
    this.drilldownIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    this.loadDrilldownPage(1);
  }

  loadDrilldownPage(page: number): void {
    if (!this.drilldownIds.length) return;
    this.drilldownPage.set(page);
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
    this.analysisService.getFeedbackByIds(companyId, this.drilldownIds, {
      page,
      limit: this.drilldownPageSize,
      includeIrrelevant: false,
    }).subscribe({
      next: (res) => {
        this.drilldownLoading.set(false);
        if (res?.data?.list) this.drilldownRows.set(res.data.list);
        this.drilldownTotal.set(Number(res?.data?.total ?? res?.data?.returned ?? 0));
      },
      error: () => {
        this.drilldownLoading.set(false);
        this.drilldownTotal.set(0);
      },
    });
  }

  closeDrilldown(): void {
    this.drilldownOpen.set(false);
    this.drilldownRows.set([]);
    this.drilldownPage.set(1);
    this.drilldownTotal.set(0);
    this.drilldownIds = [];
  }

  private listCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    return user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
  }
}
