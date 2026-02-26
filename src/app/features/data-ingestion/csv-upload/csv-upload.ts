import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { CSVService } from '../../../core/services/csv.service';
import { TranslationService } from '../../../core/services/translation.service';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

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
export class CsvUpload {
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

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
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
        this.selectedFile = file;
      } else {
        this.snackBar.open('Please select a CSV file', 'Close', { duration: 3000 });
      }
    }
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
          this.processingStatus.set('processing');
          this.processingMessage.set(this.t('dataSources.sync') || 'Processing data and running analysis...');
          
          // Simulate processing progress
          let progress = 50;
          const progressInterval = setInterval(() => {
            progress += 5;
            if (progress < 95) {
              this.uploadProgress.set(progress);
            } else {
              clearInterval(progressInterval);
            }
          }, 500);

          // Check import status periodically
          this.checkImportStatus(response.data.importId, progressInterval);
        }
      },
      error: (error) => {
        this.uploading.set(false);
        this.uploadProgress.set(0);
        this.processingStatus.set('error');
        const message = error.error?.message || this.t('errors.generic') || 'Upload failed. Please try again.';
        this.snackBar.open(message, this.t('app.close'), { duration: 5000 });
        setTimeout(() => {
          this.processingStatus.set('idle');
          this.processingMessage.set('');
        }, 3000);
      }
    });
  }

  private checkImportStatus(importId: number, progressInterval: any): void {
    const checkInterval = setInterval(() => {
      this.csvService.getImportStatus(importId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const status = response.data.status;
            
            if (status === 'completed') {
              clearInterval(checkInterval);
              clearInterval(progressInterval);
              this.uploadProgress.set(100);
              this.processingStatus.set('completed');
              this.processingMessage.set(this.t('app.success') || 'Processing completed successfully!');
              this.snackBar.open(
                this.t('app.success') || 'File uploaded and processed successfully!',
                this.t('app.close'),
                { duration: 5000 }
              );
              
              setTimeout(() => {
                this.resetUpload();
              }, 3000);
            } else if (status === 'failed') {
              clearInterval(checkInterval);
              clearInterval(progressInterval);
              this.processingStatus.set('error');
              this.processingMessage.set(response.data.errorMessage || this.t('errors.generic') || 'Processing failed');
              this.snackBar.open(
                response.data.errorMessage || this.t('errors.generic'),
                this.t('app.close'),
                { duration: 5000 }
              );
              
              setTimeout(() => {
                this.processingStatus.set('idle');
                this.processingMessage.set('');
              }, 3000);
            } else if (status === 'processing') {
              this.processingMessage.set(this.t('dataSources.sync') || 'Processing data...');
            }
          }
        },
        error: () => {
          // Continue checking even if status check fails
        }
      });
    }, 2000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      clearInterval(progressInterval);
      if (this.processingStatus() === 'processing') {
        this.processingStatus.set('error');
        this.processingMessage.set(this.t('errors.timeout') || 'Processing timed out');
      }
    }, 300000);
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
