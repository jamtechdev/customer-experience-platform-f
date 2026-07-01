import { PageHeaderCard } from '../../../core/components/page-header-card/page-header-card';
import { Component, ElementRef, ViewChild, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { CSVService, CSVFormat } from '../../../core/services/csv.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../../environments/environment';
import { ImportHistory } from '../import-history/import-history';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const DEFAULT_FORMAT: CSVFormat = {
  requiredSystemFieldsFeedback: ['content', 'date', 'source'],
  requiredSystemFieldsNps: ['score', 'date'],
  optionalColumns: ['author', 'rating', 'company', 'competitor'],
  maxFileSizeBytes: environment.upload?.maxFileSize ?? 52428800,
  firstRowHeaders: true,
};

@Component({
  selector: 'app-csv-upload',
  imports: [
    PageHeaderCard,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    ImportHistory
  ],
  templateUrl: './csv-upload.html',
  styleUrl: './csv-upload.css',
})
export class CsvUpload implements OnInit, OnDestroy {
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  private csvService = inject(CSVService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private statusPollTimer: ReturnType<typeof setTimeout> | null = null;

  selectedFile: File | null = null;
  uploading = signal(false);
  uploadProgress = signal(0);
  dragOver = signal(false);
  processingStatus = signal<ProcessingStatus>('idle');
  processingMessage = signal('');
  importId = signal<number | null>(null);

  format = signal<CSVFormat>(DEFAULT_FORMAT);

  /** URL for the sample CSV asset (download example). */
  readonly sampleCsvUrl = '/assets/sample-customer-feedback.csv';

  readonly t = (key: string, params?: Record<string, string>): string => this.translationService.translate(key, params);

  ngOnInit(): void {
    this.csvService.getFormat().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.format.set(res.data);
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  requiredColumnsText(): string {
    const f = this.format();
    const fb = f.requiredSystemFieldsFeedback ?? f.requiredColumns ?? ['content', 'date', 'source'];
    const nps = f.requiredSystemFieldsNps ?? ['score', 'date'];
    return `${fb.join(', ')} (${this.t('csv.forFeedback')}) / ${nps.join(', ')} (${this.t('csv.forNps')})`;
  }

  optionalColumnsText(): string {
    return this.format().optionalColumns.join(', ');
  }

  maxFileSizeMB(): number {
    return Math.round(this.format().maxFileSizeBytes / 1024 / 1024);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFileIfValid(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const isTsv = file.type === 'text/tab-separated-values' || file.name.toLowerCase().endsWith('.tsv');
      const isXlsx =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.toLowerCase().endsWith('.xlsx');
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') || isTsv || isXlsx) {
        this.setFileIfValid(file);
      } else {
        this.snackBar.open(this.t('errors.csvOnly') || 'Please select a CSV/TSV file', this.t('app.close'), { duration: 3000 });
      }
    }
  }

  private setFileIfValid(file: File): void {
    const maxBytes = this.format().maxFileSizeBytes;
    if (file.size > maxBytes) {
      this.snackBar.open(
        (this.t('dataSources.maxSize') || 'Maximum file size') + `: ${this.maxFileSizeMB()}MB`,
        this.t('app.close'),
        { duration: 4000 }
      );
      return;
    }
    this.selectedFile = file;
    this.processingStatus.set('idle');
    this.processingMessage.set('');
    this.uploadProgress.set(0);
    this.importId.set(null);
  }

  canCancelSelection(): boolean {
    return !!this.selectedFile && !this.uploading() && this.processingStatus() !== 'processing';
  }

  canUploadSelectedFile(): boolean {
    const status = this.processingStatus();
    return !!this.selectedFile && !this.uploading() && (status === 'idle' || status === 'error');
  }

  uploadFile(): void {
    if (!this.canUploadSelectedFile()) {
      this.snackBar.open(this.t('errors.validation') || 'Please select a file first', this.t('app.close'), { duration: 3000 });
      return;
    }
    const file = this.selectedFile;
    if (!file) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.processingStatus.set('uploading');
    this.processingMessage.set(this.t('app.loading') || 'Uploading file...');

    this.csvService.uploadCSV(file, false).subscribe({
      next: (response) => {
        if (response.success && response.data?.importId) {
          this.uploadProgress.set(100);
          this.importId.set(response.data.importId);
          this.processingStatus.set('completed');
          const rows = response.data.rowCount;
          const msg = `Upload completed: ${rows} row(s) from ${response.data.filename}. Please map the CSV columns before import.`;
          this.processingMessage.set(msg);
          this.snackBar.open(msg, this.t('app.close'), { duration: 6000 });
          this.uploading.set(false);
          this.router.navigate(['/app/data-sources/csv-mapping', response.data.importId]);
        }
      },
      error: (error) => {
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.processingStatus.set('error');
        const body = error.error;
        const msg =
          (typeof body?.message === 'string' && body.message) ||
          (typeof body === 'string' ? body : null) ||
          error.message ||
          this.t('errors.generic') ||
          'Upload or import failed.';
        this.processingMessage.set(msg);
        this.snackBar.open(msg, this.t('app.close'), { duration: 10000 });
      }
    });
  }

  private pollImportStatus(importId: number): void {
    this.stopStatusPolling();
    this.statusPollTimer = setTimeout(() => {
      this.csvService.getImportStatus(importId).subscribe({
        next: (res) => {
          const row = res.data;
          if (!res.success || !row) {
            this.pollImportStatus(importId);
            return;
          }
          const details = row.errorDetails;
          const pct = Number(details?.completionPct ?? 0);
          this.uploadProgress.set(Math.max(5, Math.min(100, pct || this.uploadProgress())));

          if (row.status === 'completed') {
            this.processingStatus.set('completed');
            this.uploadProgress.set(100);
            const ai = details?.aiSummary;
            const nps = details?.npsAiSummary;
            this.processingMessage.set(
              `Analysis completed. Imported ${details?.importedCount ?? row.rowCount ?? 0} row(s). ` +
                `Sentiment ${ai?.succeeded ?? 0}/${ai?.attempted ?? 0}, NPS ${nps?.succeeded ?? 0}/${nps?.attempted ?? 0}.`
            );
            this.stopStatusPolling();
            return;
          }

          if (row.status === 'failed') {
            this.processingStatus.set('error');
            this.processingMessage.set(row.errorMessage || 'Import failed. Check reason/details below.');
            this.stopStatusPolling();
            return;
          }

          const processed = details?.processedCount ?? 0;
          const total = details?.totalRows ?? row.rowCount ?? 0;
          const ai = details?.aiSummary;
          const phase =
            details?.statusLabel === 'processing_nps'
              ? 'OpenAI is generating NPS scores.'
              : details?.statusLabel === 'processing_post_analysis'
                ? 'Root cause, journey mapping, and dashboard summaries are finalizing.'
                : ai?.attempted
                  ? `Sentiment ${ai.succeeded + ai.failed}/${ai.attempted}.`
                  : 'Preparing sentiment, NPS and root cause.';
          this.processingStatus.set('processing');
          this.processingMessage.set(
            `OpenAI is parsing and saving analysis. Processed ${processed}/${total}. ${phase}`
          );
          this.pollImportStatus(importId);
        },
        error: () => this.pollImportStatus(importId),
      });
    }, 2500);
  }

  private stopStatusPolling(): void {
    if (!this.statusPollTimer) return;
    clearTimeout(this.statusPollTimer);
    this.statusPollTimer = null;
  }

  private resetUpload(): void {
    this.selectedFile = null;
    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.processingStatus.set('idle');
    this.processingMessage.set('');
    this.importId.set(null);
    this.stopStatusPolling();
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  removeFile(): void {
    if (!this.canCancelSelection()) return;
    this.resetUpload();
  }
}
