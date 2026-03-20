import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { CSVService, CSVFormat } from '../../../core/services/csv.service';
import { TranslationService } from '../../../core/services/translation.service';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const DEFAULT_FORMAT: CSVFormat = {
  requiredSystemFieldsFeedback: ['content', 'date', 'source'],
  requiredSystemFieldsNps: ['score', 'date'],
  optionalColumns: ['author', 'rating', 'company', 'competitor'],
  maxFileSizeBytes: environment.upload?.maxFileSize ?? 10485760,
  firstRowHeaders: true,
};

@Component({
  selector: 'app-csv-upload',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './csv-upload.html',
  styleUrl: './csv-upload.css',
})
export class CsvUpload implements OnInit {
  private csvService = inject(CSVService);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  document = document; // Expose document for template

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
      const isXlsx =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.toLowerCase().endsWith('.xlsx');
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') || isXlsx) {
        this.setFileIfValid(file);
      } else {
        this.snackBar.open(this.t('errors.csvOnly') || 'Please select a CSV file', this.t('app.close'), { duration: 3000 });
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
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.snackBar.open(this.t('errors.validation') || 'Please select a file first', this.t('app.close'), { duration: 3000 });
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.processingStatus.set('uploading');
    this.processingMessage.set(this.t('app.loading') || 'Uploading file...');

    this.csvService.uploadCSV(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success && response.data?.importId) {
          this.uploadProgress.set(100);
          this.importId.set(response.data.importId);
          this.processingStatus.set('completed');
          const rows = response.data.rowCount;
          const msg =
            (this.t('dataSources.importDone') as string) ||
            `Upload completed: ${rows} row(s) from ${response.data.filename}. Please map columns to continue.`;
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

  private resetUpload(): void {
    this.selectedFile = null;
    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.processingStatus.set('idle');
    this.processingMessage.set('');
    this.importId.set(null);
  }

  removeFile(): void {
    this.selectedFile = null;
  }
}
