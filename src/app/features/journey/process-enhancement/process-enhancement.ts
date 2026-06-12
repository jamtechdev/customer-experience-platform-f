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
    OllamaLoader
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
  drilldownRows = signal<Array<{ id: number; content: string; author?: string; date: string }>>([]);

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
    this.drilldownLoading.set(true);
    this.drilldownRows.set([]);
    const companyId = this.listCompanyId();
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

  private listCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    return user?.role === 'admin' ? undefined : (user?.settings?.companyId ?? 1);
  }
}
