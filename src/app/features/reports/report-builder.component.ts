import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportType, ReportFormat, KPICategory } from '../../core/models/report.model';
import { FeedbackSource, FeedbackCategory, SentimentType } from '../../core/models/feedback.model';

interface ReportConfig {
  name: string;
  description: string;
  type: ReportType;
  dateRange: {
    start: string;
    end: string;
  };
  format: ReportFormat;
  filters: {
    sources: FeedbackSource[];
    categories: FeedbackCategory[];
    sentiments: SentimentType[];
    kpiCategories: KPICategory[];
  };
  recipients: string;
  schedule: {
    enabled: boolean;
    frequency: string;
    time: string;
  };
}

@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="report-builder">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Rapor Oluşturucu</h1>
          <p>Özelleştirilmiş raporlar oluşturun</p>
        </div>
      </div>

      <!-- Builder Steps -->
      <div class="builder-container">
        <div class="steps-sidebar">
          @for (step of steps; track step.id; let i = $index) {
            <button 
              class="step-btn"
              [class.active]="currentStep() === i"
              [class.completed]="i < currentStep()"
              (click)="goToStep(i)"
            >
              <span class="step-number">{{ i + 1 }}</span>
              <span class="step-label">{{ step.label }}</span>
              @if (i < currentStep()) {
                <svg class="step-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </button>
          }
        </div>

        <div class="step-content">
          <!-- Step 1: Basic Info -->
          @if (currentStep() === 0) {
            <div class="step-panel">
              <h2>Temel Bilgiler</h2>
              <p class="step-description">Rapor adını, açıklamasını ve tipini belirleyin</p>

              <div class="form-group">
                <label for="name">Rapor Adı *</label>
                <input 
                  type="text" 
                  id="name"
                  [(ngModel)]="config.name"
                  placeholder="Örn: Aylık Duygu Analizi Raporu"
                />
              </div>

              <div class="form-group">
                <label for="description">Açıklama</label>
                <textarea 
                  id="description"
                  [(ngModel)]="config.description"
                  rows="3"
                  placeholder="Rapor hakkında kısa açıklama..."
                ></textarea>
              </div>

              <div class="form-group">
                <label>Rapor Tipi *</label>
                <div class="type-grid">
                  @for (type of reportTypes; track type.value) {
                    <button 
                      class="type-card"
                      [class.selected]="config.type === type.value"
                      (click)="config.type = type.value"
                    >
                      <div class="type-icon" [innerHTML]="type.icon"></div>
                      <span class="type-name">{{ type.label }}</span>
                      <span class="type-desc">{{ type.description }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Step 2: Date Range -->
          @if (currentStep() === 1) {
            <div class="step-panel">
              <h2>Tarih Aralığı</h2>
              <p class="step-description">Rapor için analiz edilecek tarih aralığını seçin</p>

              <div class="quick-dates">
                <button 
                  class="quick-date-btn"
                  [class.active]="quickDateRange === '7'"
                  (click)="setQuickRange('7')"
                >Son 7 Gün</button>
                <button 
                  class="quick-date-btn"
                  [class.active]="quickDateRange === '30'"
                  (click)="setQuickRange('30')"
                >Son 30 Gün</button>
                <button 
                  class="quick-date-btn"
                  [class.active]="quickDateRange === '90'"
                  (click)="setQuickRange('90')"
                >Son 90 Gün</button>
                <button 
                  class="quick-date-btn"
                  [class.active]="quickDateRange === 'custom'"
                  (click)="quickDateRange = 'custom'"
                >Özel</button>
              </div>

              <div class="date-inputs">
                <div class="form-group">
                  <label for="startDate">Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    id="startDate"
                    [(ngModel)]="config.dateRange.start"
                  />
                </div>
                <div class="form-group">
                  <label for="endDate">Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    id="endDate"
                    [(ngModel)]="config.dateRange.end"
                  />
                </div>
              </div>

              <div class="date-preview">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{{ config.dateRange.start }} - {{ config.dateRange.end }}</span>
                <span class="date-days">({{ calculateDays() }} gün)</span>
              </div>
            </div>
          }

          <!-- Step 3: Filters -->
          @if (currentStep() === 2) {
            <div class="step-panel">
              <h2>Filtreler</h2>
              <p class="step-description">Rapora dahil edilecek verileri filtreleyin</p>

              <div class="filter-section">
                <h3>Veri Kaynakları</h3>
                <div class="checkbox-grid">
                  @for (source of sources; track source.value) {
                    <label class="checkbox-item">
                      <input 
                        type="checkbox"
                        [checked]="config.filters.sources.includes(source.value)"
                        (change)="toggleSource(source.value)"
                      />
                      <span class="checkbox-custom"></span>
                      <span>{{ source.label }}</span>
                    </label>
                  }
                </div>
              </div>

              <div class="filter-section">
                <h3>Kategoriler</h3>
                <div class="checkbox-grid">
                  @for (category of categories; track category.value) {
                    <label class="checkbox-item">
                      <input 
                        type="checkbox"
                        [checked]="config.filters.categories.includes(category.value)"
                        (change)="toggleCategory(category.value)"
                      />
                      <span class="checkbox-custom"></span>
                      <span>{{ category.label }}</span>
                    </label>
                  }
                </div>
              </div>

              <div class="filter-section">
                <h3>Duygu Durumu</h3>
                <div class="checkbox-grid">
                  @for (sentiment of sentiments; track sentiment.value) {
                    <label class="checkbox-item">
                      <input 
                        type="checkbox"
                        [checked]="config.filters.sentiments.includes(sentiment.value)"
                        (change)="toggleSentiment(sentiment.value)"
                      />
                      <span class="checkbox-custom"></span>
                      <span>{{ sentiment.label }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Step 4: Format & Export -->
          @if (currentStep() === 3) {
            <div class="step-panel">
              <h2>Format ve Dışa Aktarma</h2>
              <p class="step-description">Rapor formatını ve dışa aktarma ayarlarını belirleyin</p>

              <div class="form-group">
                <label>Rapor Formatı</label>
                <div class="format-options">
                  @for (format of formats; track format.value) {
                    <button 
                      class="format-card"
                      [class.selected]="config.format === format.value"
                      (click)="config.format = format.value"
                    >
                      <div class="format-icon" [innerHTML]="format.icon"></div>
                      <span class="format-name">{{ format.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label for="recipients">E-posta Alıcıları (opsiyonel)</label>
                <input 
                  type="text" 
                  id="recipients"
                  [(ngModel)]="config.recipients"
                  placeholder="ornek@email.com, ornek2@email.com"
                />
                <span class="form-hint">Rapor hazır olduğunda e-posta gönderilecek</span>
              </div>

              <div class="schedule-section">
                <label class="toggle-label">
                  <input 
                    type="checkbox"
                    [(ngModel)]="config.schedule.enabled"
                  />
                  <span class="toggle-switch"></span>
                  <span>Otomatik Zamanlama</span>
                </label>

                @if (config.schedule.enabled) {
                  <div class="schedule-options">
                    <div class="form-group">
                      <label>Periyot</label>
                      <select [(ngModel)]="config.schedule.frequency">
                        <option value="DAILY">Günlük</option>
                        <option value="WEEKLY">Haftalık</option>
                        <option value="MONTHLY">Aylık</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Gönderim Saati</label>
                      <input type="time" [(ngModel)]="config.schedule.time" />
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Step 5: Preview -->
          @if (currentStep() === 4) {
            <div class="step-panel">
              <h2>Önizleme ve Oluştur</h2>
              <p class="step-description">Rapor ayarlarını kontrol edin ve oluşturun</p>

              <div class="preview-card">
                <div class="preview-header">
                  <div class="preview-type" [innerHTML]="getSelectedTypeIcon()"></div>
                  <div class="preview-info">
                    <h3>{{ config.name || 'Adsız Rapor' }}</h3>
                    <p>{{ config.description || 'Açıklama yok' }}</p>
                  </div>
                </div>

                <div class="preview-details">
                  <div class="detail-row">
                    <span class="detail-label">Rapor Tipi:</span>
                    <span class="detail-value">{{ getTypeLabel(config.type) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Tarih Aralığı:</span>
                    <span class="detail-value">{{ config.dateRange.start }} - {{ config.dateRange.end }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Format:</span>
                    <span class="detail-value">{{ config.format }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Kaynaklar:</span>
                    <span class="detail-value">{{ config.filters.sources.length || 'Tümü' }} kaynak</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Kategoriler:</span>
                    <span class="detail-value">{{ config.filters.categories.length || 'Tümü' }} kategori</span>
                  </div>
                  @if (config.schedule.enabled) {
                    <div class="detail-row">
                      <span class="detail-label">Zamanlama:</span>
                      <span class="detail-value">{{ config.schedule.frequency }} - {{ config.schedule.time }}</span>
                    </div>
                  }
                  @if (config.recipients) {
                    <div class="detail-row">
                      <span class="detail-label">Alıcılar:</span>
                      <span class="detail-value">{{ config.recipients }}</span>
                    </div>
                  }
                </div>

                <div class="preview-estimate">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>Tahmini oluşturma süresi: ~2-5 dakika</span>
                </div>
              </div>
            </div>
          }

          <!-- Navigation -->
          <div class="step-navigation">
            @if (currentStep() > 0) {
              <button class="btn btn-outline" (click)="previousStep()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Geri
              </button>
            } @else {
              <div></div>
            }

            @if (currentStep() < steps.length - 1) {
              <button 
                class="btn btn-primary" 
                (click)="nextStep()"
                [disabled]="!canProceed()"
              >
                İleri
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            } @else {
              <button 
                class="btn btn-success" 
                (click)="createReport()"
                [disabled]="isCreating()"
              >
                @if (isCreating()) {
                  <span class="spinner"></span>
                  Oluşturuluyor...
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Raporu Oluştur
                }
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-builder {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .header-content p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .builder-container {
      display: flex;
      gap: 24px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
    }

    /* Steps Sidebar */
    .steps-sidebar {
      width: 240px;
      background: var(--bg-secondary);
      padding: 24px;
      border-right: 1px solid var(--border-color);
    }

    .step-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: none;
      border: none;
      border-radius: 10px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }

    .step-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .step-btn.active {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .step-btn.completed {
      color: var(--success-color);
    }

    .step-number {
      width: 28px;
      height: 28px;
      background: var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .step-btn.active .step-number {
      background: var(--primary-color);
      color: white;
    }

    .step-btn.completed .step-number {
      background: var(--success-color);
      color: white;
    }

    .step-label {
      flex: 1;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .step-check {
      width: 18px;
      height: 18px;
      color: var(--success-color);
    }

    /* Step Content */
    .step-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 500px;
    }

    .step-panel {
      flex: 1;
      padding: 32px;
    }

    .step-panel h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .step-description {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 6px;
    }

    /* Type Grid */
    .type-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .type-card {
      padding: 20px;
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .type-card:hover {
      border-color: var(--primary-color);
    }

    .type-card.selected {
      border-color: var(--primary-color);
      background: rgba(66, 153, 225, 0.05);
    }

    .type-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto 12px;
      color: var(--primary-color);
    }

    .type-icon svg {
      width: 100%;
      height: 100%;
    }

    .type-name {
      display: block;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .type-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Date Inputs */
    .quick-dates {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .quick-date-btn {
      padding: 10px 20px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-date-btn:hover {
      border-color: var(--primary-color);
    }

    .quick-date-btn.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: white;
    }

    .date-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .date-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--bg-secondary);
      border-radius: 10px;
      font-weight: 500;
    }

    .date-preview svg {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
    }

    .date-days {
      color: var(--text-tertiary);
      font-weight: normal;
    }

    /* Filter Section */
    .filter-section {
      margin-bottom: 32px;
    }

    .filter-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .checkbox-item input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .checkbox-item input:checked + .checkbox-custom {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .checkbox-item input:checked + .checkbox-custom::after {
      content: '';
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    /* Format Options */
    .format-options {
      display: flex;
      gap: 16px;
    }

    .format-card {
      flex: 1;
      padding: 24px;
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .format-card:hover {
      border-color: var(--primary-color);
    }

    .format-card.selected {
      border-color: var(--primary-color);
      background: rgba(66, 153, 225, 0.05);
    }

    .format-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      color: var(--primary-color);
    }

    .format-icon svg {
      width: 100%;
      height: 100%;
    }

    .format-name {
      font-weight: 600;
    }

    /* Schedule Section */
    .schedule-section {
      padding: 20px;
      background: var(--bg-secondary);
      border-radius: 12px;
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-weight: 500;
    }

    .toggle-label input {
      display: none;
    }

    .toggle-switch {
      width: 44px;
      height: 24px;
      background: var(--border-color);
      border-radius: 12px;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .toggle-label input:checked + .toggle-switch {
      background: var(--primary-color);
    }

    .toggle-label input:checked + .toggle-switch::after {
      transform: translateX(20px);
    }

    .schedule-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
    }

    /* Preview Card */
    .preview-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: white;
      border-bottom: 1px solid var(--border-color);
    }

    .preview-type {
      width: 48px;
      height: 48px;
      background: var(--primary-color);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .preview-type svg {
      width: 24px;
      height: 24px;
    }

    .preview-info h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .preview-info p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .preview-details {
      padding: 24px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .detail-value {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .preview-estimate {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      background: #e8f5e9;
      color: var(--success-color);
      font-size: 0.875rem;
    }

    .preview-estimate svg {
      width: 18px;
      height: 18px;
    }

    /* Navigation */
    .step-navigation {
      display: flex;
      justify-content: space-between;
      padding: 20px 32px;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-dark);
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-success {
      background: var(--success-color);
      color: white;
      border: none;
    }

    .btn-success:hover:not(:disabled) {
      background: #2e7d32;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1024px) {
      .builder-container {
        flex-direction: column;
      }

      .steps-sidebar {
        width: 100%;
        display: flex;
        overflow-x: auto;
        padding: 16px;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
      }

      .step-btn {
        flex-direction: column;
        min-width: 100px;
        text-align: center;
      }

      .type-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .checkbox-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .type-grid,
      .checkbox-grid,
      .date-inputs,
      .schedule-options {
        grid-template-columns: 1fr;
      }

      .format-options {
        flex-direction: column;
      }

      .quick-dates {
        flex-wrap: wrap;
      }
    }
  `]
})
export class ReportBuilderComponent {
  private router = inject(Router);

  currentStep = signal(0);
  isCreating = signal(false);
  quickDateRange = '30';

  steps = [
    { id: 'basic', label: 'Temel Bilgiler' },
    { id: 'date', label: 'Tarih Aralığı' },
    { id: 'filters', label: 'Filtreler' },
    { id: 'format', label: 'Format' },
    { id: 'preview', label: 'Önizleme' }
  ];

  config: ReportConfig = {
    name: '',
    description: '',
    type: ReportType.SENTIMENT,
    dateRange: {
      start: this.getDateString(-30),
      end: this.getDateString(0)
    },
    format: ReportFormat.PDF,
    filters: {
      sources: [],
      categories: [],
      sentiments: [],
      kpiCategories: []
    },
    recipients: '',
    schedule: {
      enabled: false,
      frequency: 'WEEKLY',
      time: '09:00'
    }
  };

  reportTypes = [
    { value: ReportType.SENTIMENT, label: 'Duygu Analizi', description: 'Müşteri duygu durumu analizi', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
    { value: ReportType.JOURNEY, label: 'CX Yolculuk', description: 'Müşteri deneyim yolculuğu', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { value: ReportType.FEEDBACK, label: 'Geri Bildirim', description: 'Kaynak bazlı analiz', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
    { value: ReportType.KPI, label: 'KPI Raporu', description: 'Performans metrikleri', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
    { value: ReportType.COMPETITOR, label: 'Rakip Analizi', description: 'Rekabet karşılaştırması', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { value: ReportType.CUSTOM, label: 'Özel Rapor', description: 'Tamamen özelleştirilmiş', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' }
  ];

  formats = [
    { value: ReportFormat.PDF, label: 'PDF', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
    { value: ReportFormat.EXCEL, label: 'Excel', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="16" y2="9"/></svg>' },
    { value: ReportFormat.WORD, label: 'Word', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' }
  ];

  sources = [
    { value: FeedbackSource.INSTAGRAM, label: 'Instagram' },
    { value: FeedbackSource.FACEBOOK, label: 'Facebook' },
    { value: FeedbackSource.TWITTER, label: 'Twitter/X' },
    { value: FeedbackSource.YOUTUBE, label: 'YouTube' },
    { value: FeedbackSource.GOOGLE_REVIEWS, label: 'Google Reviews' },
    { value: FeedbackSource.APP_STORE, label: 'App Store' },
    { value: FeedbackSource.PLAY_STORE, label: 'Play Store' },
    { value: FeedbackSource.CALL_CENTER, label: 'Çağrı Merkezi' },
    { value: FeedbackSource.SIKAYETVAR, label: 'Şikayetvar' }
  ];

  categories = [
    { value: FeedbackCategory.SERVICE, label: 'Hizmet' },
    { value: FeedbackCategory.PRODUCT, label: 'Ürün' },
    { value: FeedbackCategory.PRICE, label: 'Fiyat' },
    { value: FeedbackCategory.STAFF, label: 'Personel' },
    { value: FeedbackCategory.DIGITAL, label: 'Dijital Kanal' },
    { value: FeedbackCategory.BRANCH, label: 'Şube' },
    { value: FeedbackCategory.ATM, label: 'ATM' },
    { value: FeedbackCategory.GENERAL, label: 'Genel' }
  ];

  sentiments = [
    { value: SentimentType.POSITIVE, label: 'Pozitif' },
    { value: SentimentType.NEGATIVE, label: 'Negatif' },
    { value: SentimentType.NEUTRAL, label: 'Nötr' },
    { value: SentimentType.MIXED, label: 'Karışık' }
  ];

  goToStep(index: number): void {
    if (index <= this.currentStep()) {
      this.currentStep.set(index);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(v => v + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(v => v - 1);
    }
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 0:
        return !!this.config.name && !!this.config.type;
      case 1:
        return !!this.config.dateRange.start && !!this.config.dateRange.end;
      default:
        return true;
    }
  }

  setQuickRange(days: string): void {
    this.quickDateRange = days;
    const numDays = parseInt(days);
    this.config.dateRange.start = this.getDateString(-numDays);
    this.config.dateRange.end = this.getDateString(0);
  }

  calculateDays(): number {
    const start = new Date(this.config.dateRange.start);
    const end = new Date(this.config.dateRange.end);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  toggleSource(source: FeedbackSource): void {
    const index = this.config.filters.sources.indexOf(source);
    if (index > -1) {
      this.config.filters.sources.splice(index, 1);
    } else {
      this.config.filters.sources.push(source);
    }
  }

  toggleCategory(category: FeedbackCategory): void {
    const index = this.config.filters.categories.indexOf(category);
    if (index > -1) {
      this.config.filters.categories.splice(index, 1);
    } else {
      this.config.filters.categories.push(category);
    }
  }

  toggleSentiment(sentiment: SentimentType): void {
    const index = this.config.filters.sentiments.indexOf(sentiment);
    if (index > -1) {
      this.config.filters.sentiments.splice(index, 1);
    } else {
      this.config.filters.sentiments.push(sentiment);
    }
  }

  getTypeLabel(type: ReportType): string {
    const found = this.reportTypes.find(t => t.value === type);
    return found?.label || '';
  }

  getSelectedTypeIcon(): string {
    const found = this.reportTypes.find(t => t.value === this.config.type);
    return found?.icon || '';
  }

  async createReport(): Promise<void> {
    this.isCreating.set(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.router.navigate(['/reports']);
    } catch (error) {
      console.error('Report creation failed:', error);
    } finally {
      this.isCreating.set(false);
    }
  }
}
