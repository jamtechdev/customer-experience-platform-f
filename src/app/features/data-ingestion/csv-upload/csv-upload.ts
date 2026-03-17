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

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const DEFAULT_FORMAT: CSVFormat = {
  requiredColumns: ['content', 'date', 'source'],
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
  document = document; // Expose document for template

  selectedFile: File | null = null;
  uploading = signal(false);
  uploadProgress = signal(0);
  dragOver = signal(false);
  processingStatus = signal<ProcessingStatus>('idle');
  processingMessage = signal('');
  importId = signal<number | null>(null);

  format = signal<CSVFormat>(DEFAULT_FORMAT);

  readonly t = (key: string): string => this.translationService.translate(key);

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
    return this.format().requiredColumns.join(', ');
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
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
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
        if (response.success && response.data) {
          this.uploadProgress.set(50);
          this.importId.set(response.data.importId);
          this.processingStatus.set('completed');
          this.processingMessage.set(this.t('app.success') || 'File uploaded. Processing will complete shortly on the server.');
          this.snackBar.open(
            this.t('app.success') || 'File uploaded successfully!',
            this.t('app.close'),
            { duration: 5000 }
          );
          this.uploading.set(false);
          this.uploadProgress.set(100);
        }
      },
      error: (error) => {
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.processingStatus.set('error');
        this.processingMessage.set(error.error?.message || this.t('errors.generic') || 'Upload failed. Please try again.');
        this.snackBar.open(this.processingMessage(), this.t('app.close'), { duration: 5000 });
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
