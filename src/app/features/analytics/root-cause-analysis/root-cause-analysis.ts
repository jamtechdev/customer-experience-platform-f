import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslationService } from '../../../core/services/translation.service';

interface RootCauseStructuredInsights {
  painPointTitle?: string;
  summary: string;
  examples?: string[];
}

interface RootCause {
  id: number;
  title: string;
  category: string;
  priority: string;
  severity: number;
  frequency: number;
  description: string;
  structuredInsights?: RootCauseStructuredInsights | null;
}

@Component({
  selector: 'app-root-cause-analysis',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule
  ],
  templateUrl: './root-cause-analysis.html',
  styleUrl: './root-cause-analysis.css',
})
export class RootCauseAnalysis implements OnInit {
  private analysisService = inject(AnalysisService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);

  loading = signal(false);
  reanalyzing = signal(false);
  rootCauses = signal<RootCause[]>([]);
  selectedCause = signal<RootCause | null>(null);
  displayedColumns: string[] = ['title', 'category', 'priority', 'frequency', 'severity', 'actions'];
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  ngOnInit(): void {
    this.loadRootCauses();
  }

  /** Re-runs server-side extraction on negative feedback (creates additional rows; refreshes list). */
  runRootCauseAnalysis(): void {
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    this.reanalyzing.set(true);
    this.analysisService.analyzeRootCauses(companyId, 50).subscribe({
      next: (res) => {
        this.reanalyzing.set(false);
        if (res.success) {
          this.snackBar.open('Root cause analysis updated', 'Close', { duration: 3000 });
          this.loadRootCauses();
        } else {
          this.snackBar.open(res.message || 'Analysis failed', 'Close', { duration: 4000 });
        }
      },
      error: () => {
        this.reanalyzing.set(false);
        this.snackBar.open('Could not run root cause analysis', 'Close', { duration: 4000 });
      },
    });
  }

  loadRootCauses(): void {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1;
    
    this.analysisService.getRootCauses(companyId).subscribe({
      next: (response) => {
        if (response.success) {
          // Map API response to component interface
          const mapped = (response.data || []).map((item: any) => {
            const fb = Array.isArray(item.feedbackIds) ? item.feedbackIds.length : 0;
            const legacy = item.structuredInsights || {};
            const legacySummary =
              legacy.summary ||
              legacy.problem ||
              legacy.keyRootCause ||
              item.description ||
              '';
            const legacyExamples = Array.isArray(legacy.examples)
              ? legacy.examples
              : Array.isArray(legacy.rootCauseThemes)
                ? legacy.rootCauseThemes
                : [];
            return {
              id: item.id,
              title: item.title,
              category: item.category || 'Other',
              priority: item.priority || 'medium',
              severity: typeof item.severity === 'number' ? item.severity : 0,
              frequency: typeof item.frequency === 'number' ? item.frequency : fb,
              description: item.description || '',
              structuredInsights: {
                painPointTitle:
                  legacy.painPointTitle ||
                  legacy.problem ||
                  item.title,
                summary: this.compactText(String(legacySummary), 200),
                examples: legacyExamples
                  .map((x: any) => this.compactText(String(x || ''), 100))
                  .filter((x: string) => x.length > 0)
                  .slice(0, 3),
              },
            };
          });
          this.rootCauses.set(mapped);
          this.totalItems = this.rootCauses().length;
        } else {
          this.rootCauses.set([]);
          this.totalItems = 0;
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load root causes:', error);
        this.loading.set(false);
        this.rootCauses.set([]);
        this.totalItems = 0;
        // Only show error if it's not a 500 (server might not have data yet)
        if (error.status !== 500) {
          this.snackBar.open('Failed to load root causes', 'Close', { duration: 3000 });
        }
      }
    });
  }

  getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      default: return '';
    }
  }

  viewRootCause(cause: RootCause): void {
    this.selectedCause.set(cause);
  }

  closeRootCauseModal(): void {
    this.selectedCause.set(null);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  getPaginatedData(): RootCause[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.rootCauses().slice(start, end);
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }

  painPointTitle(cause: RootCause): string {
    return cause.structuredInsights?.painPointTitle?.trim() || cause.title;
  }

  painPointSummary(cause: RootCause): string {
    return this.compactText(
      cause.structuredInsights?.summary?.trim() || cause.description || 'No summary available.',
      200
    );
  }

  painPointExamples(cause: RootCause): string[] {
    return (cause.structuredInsights?.examples || []).filter((x) => !!x?.trim()).slice(0, 3);
  }

  private compactText(text: string, max: number): string {
    const t = (text || '')
      .replace(/https?:\/\/[^\s]+/gi, ' ')
      .replace(/@\w+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length <= max) return t;
    return t.slice(0, max).replace(/\s+\S*$/, '') + '…';
  }
}
