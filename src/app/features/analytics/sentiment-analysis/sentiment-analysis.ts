import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReportService } from '../../../core/services/report.service';
import {
  buildClientReportDatePresets,
  toIsoRangeFromYmd,
  type ReportDatePreset,
} from '../../../core/utils/report-date-presets';
import { formatApiDate, normalizeApiDateToIso } from '../../../core/utils/api-date';

interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  averageScore: number;
}

interface SentimentChartBar {
  key: 'positive' | 'neutral' | 'negative';
  label: string;
  count: number;
  percentage: number;
  height: number;
}

interface SentimentReferenceRow {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  patterns: string;
}

@Component({
  selector: 'app-sentiment-analysis',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './sentiment-analysis.html',
  styleUrl: './sentiment-analysis.css',
})
export class SentimentAnalysis implements OnInit {
  private analysisService = inject(AnalysisService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private reportService = inject(ReportService);

  loading = signal(false);
  stats = signal<SentimentStats | null>(null);
  feedbackList = signal<Array<{ id: number; content: string; source: string; date: string; author?: string; sentiment: string; score: number }>>([]);
  feedbackTotal = signal(0);

  presets = signal<ReportDatePreset[]>([]);
  selectedPresetId = signal<string>('all_time');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  page = signal(1);
  pageSize = signal(25);
  totalPages = computed(() => Math.max(1, Math.ceil(this.feedbackTotal() / this.pageSize())));
  hoveredBar = signal<SentimentChartBar | null>(null);
  private readonly cacheKey = 'sentiment-analysis-cache-v1';
  private readonly fallbackPatterns: Record<string, string> = {
    positive: 'Long product lifetime, praise for durability, favorable campaign/discount mentions, occasional service appreciation',
    neutral: 'Support asks for DM/contact info, routing messages, informational mentions',
    negative: 'Complaint escalation, unresolved repair, service delay, unfair fee/change request, poor response ownership',
  };

  displayedColumns: string[] = ['sentiment', 'count', 'percentage', 'bar'];
  patternCols: string[] = ['sentiment', 'patterns'];
  feedbackColumns: string[] = ['content', 'source', 'date', 'sentiment', 'score'];

  ngOnInit(): void {
    this.restoreCache();
    this.loadPresets();
  }

  private loadPresets(): void {
    this.reportService.getDatePresets().subscribe({
      next: (res) => {
        const list =
          res.success && res.data?.presets?.length ? (res.data.presets as ReportDatePreset[]) : buildClientReportDatePresets();
        this.presets.set(list);
        const defId = 'all_time';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.reloadAll();
      },
      error: () => {
        const list = buildClientReportDatePresets();
        this.presets.set(list);
        const defId = 'all_time';
        const def = list.find((p) => p.id === defId) ?? list[0];
        if (def) this.applyPreset(def);
        this.reloadAll();
      },
    });
  }

  applyPreset(p: ReportDatePreset): void {
    this.selectedPresetId.set(p.id);
    this.startDate.set(p.startDate.slice(0, 10));
    this.endDate.set(p.endDate.slice(0, 10));
  }

  onPresetChange(id: string): void {
    if (id === 'custom') {
      this.selectedPresetId.set('custom');
      return;
    }
    const p = this.presets().find((x) => x.id === id);
    if (p) {
      this.applyPreset(p);
    }
  }

  onManualDate(): void {
    this.selectedPresetId.set('custom');
  }

  datesValid(): boolean {
    const s = this.startDate();
    const e = this.endDate();
    return !!(s && e && s <= e);
  }

  applyRangeAndReload(): void {
    if (!this.datesValid()) {
      this.snackBar.open('Select a valid date range', 'Close', { duration: 4000 });
      return;
    }
    this.page.set(1);
    this.reloadAll();
  }

  refreshData(): void {
    this.reloadAll();
  }

  prevPage(): void {
    if (this.page() <= 1 || this.loading()) return;
    this.page.update((p) => p - 1);
    this.loadFeedbackList();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages() || this.loading()) return;
    this.page.update((p) => p + 1);
    this.loadFeedbackList();
  }

  exportSentimentRecords(): void {
    if (!this.datesValid()) {
      this.snackBar.open('Select a valid date range', 'Close', { duration: 4000 });
      return;
    }
    const { start, end } = this.getDateRange();
    const companyId = this.getCompanyId();
    this.loading.set(true);
    this.reportService
      .exportSentimentRecordsToExcel({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...(companyId != null ? { companyId } : {}),
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sentiment-records-${this.startDate()}-${this.endDate()}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.loading.set(false);
          this.snackBar.open('Export downloaded', 'Close', { duration: 3000 });
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Export failed', 'Close', { duration: 3000 });
        },
      });
  }

  private reloadAll(): void {
    this.loadSentimentStats();
    this.loadFeedbackList();
  }

  getCompanyId(): number | undefined {
    const user = this.authService.currentUser();
    if (user?.role === 'admin') return undefined;
    const id = user?.settings?.companyId;
    return id ?? 1;
  }

  /** Admin can delete in global scope (undefined companyId). */
  private effectiveCompanyIdForMutations(): number | undefined {
    const user = this.authService.currentUser();
    if (user?.role === 'admin') return undefined;
    return user?.settings?.companyId ?? 1;
  }

  getDateRange(): { start: Date; end: Date } {
    if (!this.datesValid()) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return { start, end };
    }
    const { startDate: sd, endDate: ed } = toIsoRangeFromYmd(this.startDate()!, this.endDate()!);
    return { start: new Date(sd), end: new Date(ed) };
  }

  loadSentimentStats(): void {
    this.loading.set(true);
    const companyId = this.getCompanyId();
    const { start, end } = this.getDateRange();

    this.analysisService.getSentimentStats(companyId, start, end).subscribe({
      next: (response) => {
        const data = response?.data ?? {};
        const total = data.total ?? (data.positive || 0) + (data.negative || 0) + (data.neutral || 0);
        this.stats.set({
          positive: data.positive ?? 0,
          negative: data.negative ?? 0,
          neutral: data.neutral ?? 0,
          total,
          averageScore: data.averageScore ?? 0
        });
        this.persistCache();
        this.loading.set(false);
      },
      error: () => {
        this.stats.set({ positive: 0, negative: 0, neutral: 0, total: 0, averageScore: 0 });
        this.loading.set(false);
        this.snackBar.open('Failed to load sentiment data', 'Close', { duration: 3000 });
      }
    });
  }

  loadFeedbackList(): void {
    const companyId = this.getCompanyId();
    const { start, end } = this.getDateRange();

    this.analysisService.getFeedbackWithSentiment(companyId, start, end, this.page(), this.pageSize()).subscribe({
      next: (response) => {
        if (response?.success && response?.data) {
          const list = (response.data.list || []).map((row: any) => ({
            ...row,
            date: normalizeApiDateToIso(row.date),
          }));
          this.feedbackList.set(list);
          this.feedbackTotal.set(response.data.total ?? list.length);
          this.persistCache();
        } else {
          this.feedbackList.set([]);
          this.feedbackTotal.set(0);
        }
      },
      error: () => {
        this.feedbackList.set([]);
        this.feedbackTotal.set(0);
      }
    });
  }

  getSentimentData() {
    const stats = this.stats();
    if (!stats) return [];
    const total = stats.total || 0;
    const pct = (n: number) => (total === 0 ? '0.0' : ((n / total) * 100).toFixed(1));
    return [
      { sentiment: 'Positive', count: stats.positive, percentage: pct(stats.positive) },
      { sentiment: 'Neutral', count: stats.neutral, percentage: pct(stats.neutral) },
      { sentiment: 'Negative', count: stats.negative, percentage: pct(stats.negative) }
    ];
  }

  sentimentRows(): Array<{ sentiment: string; count: number; percentage: string; css: string }> {
    const rows = this.getSentimentData();
    return rows.map((r) => ({ ...r, css: r.sentiment.toLowerCase() }));
  }

  chartBars = computed<SentimentChartBar[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const total = Math.max(1, s.total || 0);
    const maxCount = Math.max(1, s.positive, s.neutral, s.negative);
    const mk = (key: 'positive' | 'neutral' | 'negative', label: string, count: number): SentimentChartBar => ({
      key,
      label,
      count,
      percentage: (count / total) * 100,
      height: Math.max(8, (count / maxCount) * 100),
    });
    return [
      mk('positive', 'Positive', s.positive),
      mk('neutral', 'Neutral', s.neutral),
      mk('negative', 'Negative', s.negative),
    ];
  });

  sentimentBarChartMax(): number {
    const s = this.stats();
    if (!s) return 100;
    const m = Math.max(s.positive, s.neutral, s.negative, 1);
    return Math.max(50, Math.ceil(m / 25) * 25);
  }

  sentimentBarFillPct(count: number): number {
    const max = this.sentimentBarChartMax();
    return Math.min(100, max > 0 ? (count / max) * 100 : 0);
  }

  onBarHover(bar: SentimentChartBar): void {
    this.hoveredBar.set(bar);
  }

  onBarLeave(): void {
    this.hoveredBar.set(null);
  }

  private readonly stopWords = new Set([
    've', 'ile', 'bir', 'bu', 'şu', 'çok', 'daha', 'için', 'gibi', 'kadar', 'ama', 'veya',
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'was', 'are',
  ]);

  private extractTopPhrases(
    items: Array<{ content: string }>,
    maxPhrases: number = 5
  ): string[] {
    const text = items.map((x) => x.content || '').join(' ').toLocaleLowerCase('tr-TR');
    const words = text
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[@#][^\s]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !this.stopWords.has(w));

    const unigram = new Map<string, number>();
    const bigram = new Map<string, number>();

    for (let i = 0; i < words.length; i++) {
      unigram.set(words[i], (unigram.get(words[i]) ?? 0) + 1);
      if (i < words.length - 1) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        if (words[i + 1].length >= 3) {
          bigram.set(phrase, (bigram.get(phrase) ?? 0) + 1);
        }
      }
    }

    const phraseCandidates = [...bigram.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    if (phraseCandidates.length >= maxPhrases) {
      return phraseCandidates.slice(0, maxPhrases);
    }

    const wordCandidates = [...unigram.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
    return [...phraseCandidates, ...wordCandidates].slice(0, maxPhrases);
  }

  representativePatterns(sentiment: string): string {
    const norm = sentiment.toLowerCase();
    const target = this.feedbackList().filter((x) => (x.sentiment || '').toLowerCase() === norm);
    const phrases = this.extractTopPhrases(target);
    if (phrases.length > 0) {
      return phrases.join(', ');
    }
    return this.fallbackPatterns[norm] ?? 'No representative phrases available in this date range.';
  }

  sentimentReferenceRows(): SentimentReferenceRow[] {
    return [
      {
        sentiment: 'Positive',
        patterns:
          'Long product lifetime, praise for durability, favorable campaign/discount mentions, occasional service appreciation',
      },
      {
        sentiment: 'Neutral',
        patterns: 'Support asks for DM/contact info, routing messages, informational mentions',
      },
      {
        sentiment: 'Negative',
        patterns:
          'Complaint escalation, unresolved repair, service delay, unfair fee/change request, poor response ownership',
      },
    ];
  }

  reportIntroText(): string {
    const total = this.stats()?.total ?? 0;
    const start = this.startDate() ?? '-';
    const end = this.endDate() ?? '-';
    return `Each row in the primary cohort (${total} with sentiment labels) was scored using the platform's offline text engine for this company. Date span in filter: ${start} to ${end}. Use Sentiment / export tools in the app if you need a downloadable labeled extract.`;
  }

  getBarWidth(percentage: string): string {
    const n = parseFloat(percentage);
    if (Number.isNaN(n) || n < 0) return '0%';
    return `${Math.min(100, n)}%`;
  }

  formatDate(d: string): string {
    return formatApiDate(d, { mode: 'date', empty: '' });
  }

  deleteRecord(row: { id: number; content: string }): void {
    const ok = window.confirm('Delete this feedback record? This action cannot be undone.');
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteFeedbackRecord(row.id, companyId).subscribe({
      next: () => {
        this.snackBar.open('Feedback record deleted', 'Close', { duration: 3000 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open('Failed to delete feedback record', 'Close', { duration: 3000 });
      }
    });
  }

  deleteAllRecords(): void {
    const total = this.feedbackTotal();
    const ok = window.confirm(
      `Delete all feedback records in current scope? (${total} items). This action cannot be undone.`
    );
    if (!ok) return;
    const companyId = this.effectiveCompanyIdForMutations();
    this.analysisService.deleteAllFeedbackRecords(companyId).subscribe({
      next: (res) => {
        const n = res?.data?.deletedFeedback ?? 0;
        this.snackBar.open(`Deleted ${n} feedback records`, 'Close', { duration: 3500 });
        this.reloadAll();
      },
      error: () => {
        this.snackBar.open('Failed to delete all feedback records', 'Close', { duration: 3000 });
      }
    });
  }

  private persistCache(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          stats: this.stats(),
          feedbackList: this.feedbackList(),
          feedbackTotal: this.feedbackTotal(),
          page: this.page(),
          pageSize: this.pageSize(),
        })
      );
    } catch {
      // Ignore cache failures.
    }
  }

  private restoreCache(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        stats?: SentimentStats | null;
        feedbackList?: Array<{ id: number; content: string; source: string; date: string; author?: string; sentiment: string; score: number }>;
        feedbackTotal?: number;
        page?: number;
        pageSize?: number;
      };
      if (parsed.stats) this.stats.set(parsed.stats);
      if (Array.isArray(parsed.feedbackList)) this.feedbackList.set(parsed.feedbackList);
      if (typeof parsed.feedbackTotal === 'number') this.feedbackTotal.set(parsed.feedbackTotal);
      if (typeof parsed.page === 'number' && parsed.page > 0) this.page.set(parsed.page);
      if (typeof parsed.pageSize === 'number' && parsed.pageSize > 0) this.pageSize.set(parsed.pageSize);
    } catch {
      // Ignore invalid cache.
    }
  }
}
