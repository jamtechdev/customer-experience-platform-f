import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CSVService, CSVImport, CSVPreview, CSVImportResult } from '../../core/services/csv.service';
import { suggestColumnMappings, detectCSVType } from '../../core/utils/csv-utils';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="csv-upload-page">
      <div class="page-header">
        <h1>CSV Veri Yükleme</h1>
        <p class="subtitle">Sosyal medya, uygulama mağazası yorumları ve NPS anket verilerini CSV formatında yükleyin</p>
      </div>

      <!-- Upload Section -->
      <div class="upload-section card">
        <h2>1. Dosya Yükle</h2>
        <div class="file-upload-area" 
             [class.dragover]="isDragging()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)">
          <input 
            type="file" 
            id="fileInput" 
            accept=".csv"
            (change)="onFileSelected($event)"
            style="display: none"
          >
          <label for="fileInput" class="upload-label">
            <i class="icon icon-upload"></i>
            <span>Dosyayı seçin veya buraya sürükleyin</span>
            <small>CSV formatında, maksimum 10MB</small>
          </label>
          @if (selectedFile()) {
            <div class="selected-file">
              <i class="icon icon-file"></i>
              <span>{{selectedFile()!.name}}</span>
              <span class="file-size">({{formatFileSize(selectedFile()!.size)}})</span>
              <button class="btn-remove" (click)="clearFile()">
                <i class="icon icon-x"></i>
              </button>
            </div>
          }
        </div>
        @if (selectedFile()) {
          <button class="btn btn-primary" (click)="uploadFile()" [disabled]="uploading()">
            @if (uploading()) {
              <i class="icon icon-loader spinning"></i>
              Yükleniyor...
            } @else {
              <i class="icon icon-upload"></i>
              Dosyayı Yükle
            }
          </button>
        }
      </div>

      <!-- Preview & Mapping Section -->
      @if (currentImport()) {
        <div class="preview-section card">
          <h2>2. Veri Önizleme ve Eşleştirme</h2>
          
          @if (previewLoading()) {
            <div class="loading">Yükleniyor...</div>
          } @else if (preview()) {
            <div class="preview-info">
              <div class="info-item">
                <span class="label">Dosya:</span>
                <span>{{currentImport()!.originalFilename}}</span>
              </div>
              <div class="info-item">
                <span class="label">Satır Sayısı:</span>
                <span>{{preview()!.rowCount}}</span>
              </div>
              <div class="info-item">
                <span class="label">Tespit Edilen Tip:</span>
                <span class="badge">{{detectedType() || 'Bilinmiyor'}}</span>
              </div>
            </div>

            <!-- Data Type Selection -->
            <div class="form-group">
              <label>Veri Tipi *</label>
              <select [(ngModel)]="selectedDataType" (ngModelChange)="onDataTypeChange()">
                <option value="">Otomatik Tespit</option>
                <option value="social_media">Sosyal Medya</option>
                <option value="app_review">Uygulama Mağazası Yorumu</option>
                <option value="nps_survey">NPS Anketi</option>
                <option value="complaint">Şikayet</option>
              </select>
            </div>

            <!-- Company Selection -->
            <div class="form-group">
              <label>Şirket *</label>
              <select [(ngModel)]="selectedCompanyId" required>
                <option value="">Seçiniz</option>
                <option [value]="1">Ana Şirket</option>
                <!-- Add more companies dynamically -->
              </select>
            </div>

            <!-- Preview Table -->
            <div class="preview-table-container">
              <table class="preview-table">
                <thead>
                  <tr>
                    @for (header of preview()!.headers; track header) {
                      <th>{{header}}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of preview()!.rows; track $index) {
                    <tr>
                      @for (header of preview()!.headers; track header) {
                        <td>{{row[header] || '-'}}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Column Mapping -->
            <div class="mapping-section">
              <h3>Kolon Eşleştirme</h3>
              <p class="help-text">CSV kolonlarını sistem alanlarına eşleştirin</p>
              
              <div class="mapping-grid">
                <div class="mapping-header">
                  <span>CSV Kolonu</span>
                  <span>→</span>
                  <span>Sistem Alanı</span>
                </div>
                @for (header of preview()!.headers; track header) {
                  <div class="mapping-row">
                    <span class="csv-column">{{header}}</span>
                    <span class="arrow">→</span>
                    <select [(ngModel)]="columnMappings[header]" class="target-field">
                      <option value="">Eşleştirme yapılmadı</option>
                      @for (field of getTargetFields(); track field.value) {
                        <option [value]="field.value">{{field.label}}</option>
                      }
                    </select>
                    @if (columnMappings[header]) {
                      <button class="btn-auto" (click)="autoMapAll()" title="Tümünü otomatik eşleştir">
                        <i class="icon icon-zap"></i>
                      </button>
                    }
                  </div>
                }
              </div>

              <button class="btn btn-secondary" (click)="autoMapAll()">
                <i class="icon icon-zap"></i>
                Otomatik Eşleştir
              </button>
            </div>

            <!-- Process Button -->
            <div class="actions">
              <button 
                class="btn btn-primary btn-large" 
                (click)="processImport()" 
                [disabled]="processing() || !isMappingValid()">
                @if (processing()) {
                  <i class="icon icon-loader spinning"></i>
                  İşleniyor...
                } @else {
                  <i class="icon icon-play"></i>
                  Verileri İçe Aktar
                }
              </button>
            </div>
          }
        </div>
      }

      <!-- Import History -->
      <div class="history-section card">
        <h2>Yükleme Geçmişi</h2>
        @if (importsLoading()) {
          <div class="loading">Yükleniyor...</div>
        } @else if (imports().length === 0) {
          <div class="empty-state">
            <i class="icon icon-inbox"></i>
            <p>Henüz dosya yüklenmedi</p>
          </div>
        } @else {
          <div class="imports-table">
            <table>
              <thead>
                <tr>
                  <th>Dosya Adı</th>
                  <th>Satır Sayısı</th>
                  <th>Durum</th>
                  <th>Yüklenme Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                @for (import of imports(); track import.id) {
                  <tr>
                    <td>{{import.originalFilename}}</td>
                    <td>{{import.rowCount}}</td>
                    <td>
                      <span class="status-badge" [class]="'status-' + import.status">
                        {{getStatusLabel(import.status)}}
                      </span>
                    </td>
                    <td>{{import.createdAt | date:'short'}}</td>
                    <td>
                      <button class="btn-icon" (click)="viewImport(import)" title="Görüntüle">
                        <i class="icon icon-eye"></i>
                      </button>
                      @if (import.status === 'completed') {
                        <button class="btn-icon" (click)="downloadResults(import)" title="Sonuçları İndir">
                          <i class="icon icon-download"></i>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .csv-upload-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
      h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
      .subtitle { margin: 0.5rem 0 0; color: var(--text-secondary, #6b7280); }
    }

    .card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      h2 { margin: 0 0 1rem; font-size: 1.25rem; font-weight: 600; }
    }

    .file-upload-area {
      border: 2px dashed var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
      padding: 3rem;
      text-align: center;
      transition: all 0.2s;
      margin-bottom: 1rem;

      &.dragover {
        border-color: var(--primary-color, #3b82f6);
        background: #eff6ff;
      }
    }

    .upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      i { font-size: 3rem; color: var(--text-secondary, #9ca3af); }
      span { font-size: 1rem; font-weight: 500; }
      small { font-size: 0.875rem; color: var(--text-secondary, #6b7280); }
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      margin-top: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;

      &.btn-primary {
        background: var(--primary-color, #3b82f6);
        color: #fff;
        &:hover:not(:disabled) { background: #2563eb; }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }

      &.btn-secondary {
        background: #fff;
        border: 1px solid var(--border-color, #e5e7eb);
        color: var(--text-primary, #1f2937);
        &:hover { background: var(--hover-bg, #f3f4f6); }
      }

      &.btn-large {
        padding: 0.875rem 2rem;
        font-size: 1rem;
      }
    }

    .preview-info {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      .label { font-size: 0.75rem; color: var(--text-secondary, #6b7280); }
    }

    .badge {
      padding: 0.25rem 0.75rem;
      background: #e0e7ff;
      color: #4f46e5;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .form-group {
      margin-bottom: 1.5rem;
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      select {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.5rem;
        font-size: 0.875rem;
      }
    }

    .preview-table-container {
      max-height: 400px;
      overflow: auto;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .preview-table {
      width: 100%;
      border-collapse: collapse;
      th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        font-size: 0.875rem;
      }
      th {
        background: var(--bg-secondary, #f9fafb);
        font-weight: 600;
        position: sticky;
        top: 0;
      }
      tbody tr:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .mapping-section {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .mapping-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .mapping-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .mapping-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
    }

    .csv-column {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .target-field {
      padding: 0.5rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .imports-table {
      overflow-x: auto;
      table {
        width: 100%;
        border-collapse: collapse;
        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        th {
          background: var(--bg-secondary, #f9fafb);
          font-weight: 600;
          font-size: 0.875rem;
        }
      }
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      &.status-pending { background: #fef3c7; color: #d97706; }
      &.status-processing { background: #dbeafe; color: #2563eb; }
      &.status-completed { background: #d1fae5; color: #059669; }
      &.status-failed { background: #fee2e2; color: #dc2626; }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .csv-upload-page { padding: 1rem; }
      .preview-info { flex-direction: column; gap: 1rem; }
      .mapping-header, .mapping-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      .arrow { display: none; }
    }
  `]
})
export class CSVUploadComponent implements OnInit {
  private csvService = inject(CSVService);

  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  uploading = signal(false);
  processing = signal(false);
  previewLoading = signal(false);
  importsLoading = signal(false);

  currentImport = signal<CSVImport | null>(null);
  preview = signal<CSVPreview | null>(null);
  imports = signal<CSVImport[]>([]);
  detectedType = signal<string>('');
  selectedDataType = '';
  selectedCompanyId = 1;
  columnMappings: Record<string, string> = {};

  ngOnInit(): void {
    this.loadImports();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files.length) {
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.currentImport.set(null);
    this.preview.set(null);
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.csvService.uploadCSV(file).subscribe({
      next: (response) => {
        if (response.success) {
          this.currentImport.set({ ...response.data, status: 'pending' } as any);
          this.loadPreview(response.data.importId);
        }
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
      }
    });
  }

  loadPreview(importId: number): void {
    this.previewLoading.set(true);
    this.csvService.previewCSV(importId).subscribe({
      next: (response) => {
        if (response.success) {
          this.preview.set(response.data);
          // Auto-detect type
          const detected = detectCSVType(response.data.headers);
          this.detectedType.set(detected);
          this.selectedDataType = detected || '';
          // Auto-suggest mappings
          this.autoMapAll();
        }
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewLoading.set(false);
      }
    });
  }

  onDataTypeChange(): void {
    if (this.selectedDataType) {
      this.autoMapAll();
    }
  }

  autoMapAll(): void {
    const preview = this.preview();
    if (!preview) return;

    const suggested = suggestColumnMappings(
      preview.headers,
      (this.selectedDataType || this.detectedType()) as any
    );
    this.columnMappings = { ...suggested };
  }

  getTargetFields(): Array<{ value: string; label: string }> {
    const type = this.selectedDataType || this.detectedType();
    const fields: Record<string, Array<{ value: string; label: string }>> = {
      social_media: [
        { value: 'content', label: 'İçerik' },
        { value: 'source', label: 'Kaynak' },
        { value: 'author', label: 'Yazar' },
        { value: 'date', label: 'Tarih' },
        { value: 'rating', label: 'Puan' }
      ],
      app_review: [
        { value: 'content', label: 'Yorum' },
        { value: 'source', label: 'Kaynak' },
        { value: 'author', label: 'Yazar' },
        { value: 'date', label: 'Tarih' },
        { value: 'rating', label: 'Puan' }
      ],
      nps_survey: [
        { value: 'score', label: 'NPS Skoru (0-10)' },
        { value: 'comment', label: 'Yorum' },
        { value: 'customerId', label: 'Müşteri ID' },
        { value: 'date', label: 'Tarih' }
      ],
      complaint: [
        { value: 'content', label: 'Şikayet İçeriği' },
        { value: 'source', label: 'Kaynak' },
        { value: 'date', label: 'Tarih' },
        { value: 'category', label: 'Kategori' }
      ]
    };

    return fields[type] || fields['social_media'];
  }

  isMappingValid(): boolean {
    if (!this.selectedCompanyId) return false;
    const type = this.selectedDataType || this.detectedType();
    if (!type) return false;

    // Check required fields are mapped
    const requiredFields = this.getTargetFields().filter(f => 
      ['content', 'score', 'date'].includes(f.value)
    );
    
    return requiredFields.every(field => 
      Object.values(this.columnMappings).includes(field.value)
    );
  }

  processImport(): void {
    const import_ = this.currentImport();
    if (!import_ || !this.isMappingValid()) return;

    this.processing.set(true);
    this.csvService.processImport(
      import_.id,
      this.columnMappings,
      this.selectedCompanyId,
      (this.selectedDataType || this.detectedType()) as any
    ).subscribe({
      next: (response) => {
        if (response.success) {
          alert(`İçe aktarma tamamlandı! ${response.data.importedCount} kayıt başarıyla yüklendi.`);
          this.loadImports();
          this.clearFile();
        } else {
          alert(`Hata: ${response.message || 'Bilinmeyen hata'}`);
        }
        this.processing.set(false);
      },
      error: (error) => {
        alert(`Hata: ${error.message || 'İçe aktarma başarısız'}`);
        this.processing.set(false);
      }
    });
  }

  loadImports(): void {
    this.importsLoading.set(true);
    this.csvService.getImports().subscribe({
      next: (response) => {
        if (response.success) {
          this.imports.set(response.data);
        }
        this.importsLoading.set(false);
      },
      error: () => {
        this.importsLoading.set(false);
      }
    });
  }

  viewImport(import_: CSVImport): void {
    this.currentImport.set(import_);
    this.loadPreview(import_.id);
  }

  downloadResults(import_: CSVImport): void {
    // Implement download functionality
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Bekliyor',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      failed: 'Başarısız'
    };
    return labels[status] || status;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
