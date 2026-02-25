import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportService } from '../../core/services/report.service';
import { Report, ReportType, ReportStatus, ReportFormat, ReportFrequency, ReportFilter, ReportSection, ReportSchedule, KPI } from '../../core/models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="reports-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Raporlar</h1>
          <p>Analiz raporlarını görüntüleyin, oluşturun ve yönetin</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="showScheduleModal.set(true)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Zamanla
          </button>
          <button class="btn btn-primary" routerLink="/reports/builder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Yeni Rapor
          </button>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <div class="quick-action-card" (click)="generateQuickReport('sentiment')">
          <div class="action-icon sentiment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
          <div class="action-content">
            <h3>Duygu Analizi Raporu</h3>
            <p>Son 30 günlük duygu analizi</p>
          </div>
        </div>

        <div class="quick-action-card" (click)="generateQuickReport('journey')">
          <div class="action-icon journey">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="action-content">
            <h3>CX Yolculuk Raporu</h3>
            <p>Müşteri deneyimi özeti</p>
          </div>
        </div>

        <div class="quick-action-card" (click)="generateQuickReport('feedback')">
          <div class="action-icon feedback">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="action-content">
            <h3>Geri Bildirim Raporu</h3>
            <p>Kaynak bazlı analiz</p>
          </div>
        </div>

        <div class="quick-action-card" (click)="generateQuickReport('kpi')">
          <div class="action-icon kpi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div class="action-content">
            <h3>KPI Raporu</h3>
            <p>Performans metrikleri</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Rapor ara..."
            [(ngModel)]="searchQuery"
            (input)="filterReports()"
          />
        </div>

        <div class="filter-buttons">
          <select [(ngModel)]="selectedType" (change)="filterReports()">
            <option value="">Tüm Tipler</option>
            <option value="SENTIMENT">Duygu Analizi</option>
            <option value="JOURNEY">CX Yolculuk</option>
            <option value="FEEDBACK">Geri Bildirim</option>
            <option value="KPI">KPI</option>
            <option value="COMPETITOR">Rakip Analizi</option>
            <option value="CUSTOM">Özel</option>
          </select>

          <select [(ngModel)]="selectedStatus" (change)="filterReports()">
            <option value="">Tüm Durumlar</option>
            <option value="DRAFT">Taslak</option>
            <option value="GENERATING">Oluşturuluyor</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="FAILED">Başarısız</option>
            <option value="SCHEDULED">Zamanlandı</option>
          </select>

          <select [(ngModel)]="selectedPeriod" (change)="filterReports()">
            <option value="">Tüm Dönemler</option>
            <option value="7">Son 7 Gün</option>
            <option value="30">Son 30 Gün</option>
            <option value="90">Son 90 Gün</option>
          </select>
        </div>
      </div>

      <!-- Reports Grid -->
      <div class="reports-grid">
        @for (report of filteredReports(); track report.id) {
          <div class="report-card" [class.generating]="report.status === 'GENERATING'">
            <div class="report-header">
              <div class="report-icon" [class]="getReportTypeClass(report.type)">
                @switch (report.type) {
                  @case ('SENTIMENT') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  }
                  @case ('JOURNEY') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  }
                  @case ('KPI') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  }
                  @default {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  }
                }
              </div>
              <div class="report-status" [class]="getStatusClass(report.status || ReportStatus.DRAFT)">
                {{ getStatusLabel(report.status || ReportStatus.DRAFT) }}
              </div>
            </div>

            <div class="report-content">
              <h3>{{ report.name }}</h3>
              <p class="report-description">{{ report.description }}</p>
              
              <div class="report-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {{ formatDate(report.createdAt) }}
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {{ report.createdBy }}
                </span>
              </div>
            </div>

            <div class="report-actions">
              @if (report.status === 'COMPLETED') {
                <button class="btn-action" (click)="viewReport(report)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Görüntüle
                </button>
                <button class="btn-action" (click)="downloadReport(report, 'PDF')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  PDF
                </button>
                <button class="btn-action" (click)="downloadReport(report, 'EXCEL')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Excel
                </button>
              } @else if (report.status === 'GENERATING') {
                <div class="generating-indicator">
                  <span class="spinner"></span>
                  <span>Oluşturuluyor...</span>
                </div>
              } @else if (report.status === 'DRAFT') {
                <button class="btn-action" (click)="editReport(report)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Düzenle
                </button>
                <button class="btn-action" (click)="generateReport(report)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Oluştur
                </button>
              }
              <button class="btn-action btn-delete" (click)="deleteReport(report)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>

            @if (report.status === 'GENERATING') {
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="report.progress || 30"></div>
              </div>
            }
          </div>
        } @empty {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <h3>Rapor Bulunamadı</h3>
            <p>Henüz oluşturulmuş rapor bulunmuyor veya filtre kriterlerinize uygun rapor yok.</p>
            <button class="btn btn-primary" routerLink="/reports/builder">
              İlk Raporunuzu Oluşturun
            </button>
          </div>
        }
      </div>

      <!-- Schedule Modal -->
      @if (showScheduleModal()) {
        <div class="modal-overlay" (click)="showScheduleModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Rapor Zamanlama</h2>
              <button class="modal-close" (click)="showScheduleModal.set(false)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Rapor Tipi</label>
                <select [(ngModel)]="scheduleForm.reportType">
                  <option value="SENTIMENT">Duygu Analizi Raporu</option>
                  <option value="JOURNEY">CX Yolculuk Raporu</option>
                  <option value="FEEDBACK">Geri Bildirim Raporu</option>
                  <option value="KPI">KPI Raporu</option>
                </select>
              </div>
              <div class="form-group">
                <label>Periyot</label>
                <select [(ngModel)]="scheduleForm.frequency">
                  <option value="DAILY">Günlük</option>
                  <option value="WEEKLY">Haftalık</option>
                  <option value="MONTHLY">Aylık</option>
                </select>
              </div>
              <div class="form-group">
                <label>Gönderim Saati</label>
                <input type="time" [(ngModel)]="scheduleForm.time" />
              </div>
              <div class="form-group">
                <label>E-posta Alıcıları</label>
                <input 
                  type="text" 
                  [(ngModel)]="scheduleForm.recipients"
                  placeholder="ornek@email.com, ornek2@email.com"
                />
              </div>
              <div class="form-group">
                <label>Format</label>
                <div class="format-options">
                  <label class="format-option">
                    <input type="checkbox" [(ngModel)]="scheduleForm.pdfEnabled" />
                    <span>PDF</span>
                  </label>
                  <label class="format-option">
                    <input type="checkbox" [(ngModel)]="scheduleForm.excelEnabled" />
                    <span>Excel</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showScheduleModal.set(false)">İptal</button>
              <button class="btn btn-primary" (click)="saveSchedule()">Zamanla</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-page {
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
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

    .btn-primary:hover {
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

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .quick-action-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-action-card:hover {
      border-color: var(--primary-color);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .action-icon svg {
      width: 24px;
      height: 24px;
    }

    .action-icon.sentiment { background: #e3f2fd; color: #1976d2; }
    .action-icon.journey { background: #f3e5f5; color: #7b1fa2; }
    .action-icon.feedback { background: #e8f5e9; color: #388e3c; }
    .action-icon.kpi { background: #fff3e0; color: #f57c00; }

    .action-content h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .action-content p {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Filters */
    .filters-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 250px;
      position: relative;
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    .search-box input {
      width: 100%;
      padding: 12px 14px 12px 44px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .filter-buttons {
      display: flex;
      gap: 12px;
    }

    .filter-buttons select {
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
      cursor: pointer;
      min-width: 150px;
    }

    .filter-buttons select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Reports Grid */
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .report-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .report-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .report-card.generating {
      border-color: var(--primary-color);
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .report-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .report-icon svg {
      width: 20px;
      height: 20px;
    }

    .report-icon.sentiment { background: #e3f2fd; color: #1976d2; }
    .report-icon.journey { background: #f3e5f5; color: #7b1fa2; }
    .report-icon.kpi { background: #fff3e0; color: #f57c00; }
    .report-icon.feedback { background: #e8f5e9; color: #388e3c; }
    .report-icon.competitor { background: #fce4ec; color: #c2185b; }
    .report-icon.custom { background: #f5f5f5; color: #616161; }

    .report-status {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .report-status.draft { background: #f5f5f5; color: #616161; }
    .report-status.generating { background: #e3f2fd; color: #1976d2; }
    .report-status.completed { background: #e8f5e9; color: #388e3c; }
    .report-status.failed { background: #ffebee; color: #c62828; }
    .report-status.scheduled { background: #fff3e0; color: #f57c00; }

    .report-content {
      padding: 16px;
    }

    .report-content h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .report-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .report-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .meta-item svg {
      width: 14px;
      height: 14px;
    }

    .report-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-action:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-action svg {
      width: 14px;
      height: 14px;
    }

    .btn-action.btn-delete {
      margin-left: auto;
    }

    .btn-action.btn-delete:hover {
      border-color: var(--error-color);
      color: var(--error-color);
    }

    .generating-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--primary-color);
    }

    .progress-bar {
      height: 3px;
      background: var(--border-color);
    }

    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s ease;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      background: white;
      border: 1px dashed var(--border-color);
      border-radius: 12px;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      color: var(--text-tertiary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: var(--text-tertiary);
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .modal-close svg {
      width: 20px;
      height: 20px;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .format-options {
      display: flex;
      gap: 16px;
    }

    .format-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 1024px) {
      .quick-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .quick-actions {
        grid-template-columns: 1fr;
      }

      .filters-section {
        flex-direction: column;
      }

      .filter-buttons {
        flex-wrap: wrap;
      }

      .filter-buttons select {
        flex: 1;
        min-width: 120px;
      }

      .reports-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportService);

  // Expose enums to template
  ReportStatus = ReportStatus;

  reports = signal<Report[]>([]);
  filteredReports = signal<Report[]>([]);
  isLoading = signal(false);
  showScheduleModal = signal(false);

  searchQuery = '';
  selectedType = '';
  selectedStatus = '';
  selectedPeriod = '';

  scheduleForm = {
    reportType: 'SENTIMENT',
    frequency: 'WEEKLY',
    time: '09:00',
    recipients: '',
    pdfEnabled: true,
    excelEnabled: false
  };

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading.set(true);
    
    // Mock data for demonstration
    const mockReports: Report[] = [
      {
        id: '1',
        name: 'Aylık Duygu Analizi Raporu',
        description: 'Tüm kanallardan gelen geri bildirimlerin duygu analizi özeti',
        type: ReportType.SENTIMENT,
        status: ReportStatus.COMPLETED,
        format: ReportFormat.PDF,
        frequency: ReportFrequency.MONTHLY,
        filters: { dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') } },
        sections: [],
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        createdAt: new Date('2024-01-31'),
        updatedAt: new Date('2024-01-31'),
        createdBy: 'Ahmet Yılmaz',
        lastGeneratedAt: new Date('2024-01-31'),
        fileUrl: '/reports/sentiment-jan-2024.pdf'
      },
      {
        id: '2',
        name: 'CX Yolculuk Değerlendirmesi',
        description: 'Müşteri yolculuğu temas noktaları ve deneyim haritası',
        type: ReportType.JOURNEY,
        status: ReportStatus.GENERATING,
        format: ReportFormat.PDF,
        frequency: ReportFrequency.MONTHLY,
        filters: { dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') } },
        sections: [],
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
        createdBy: 'Zeynep Kaya',
        progress: 65
      },
      {
        id: '3',
        name: 'Haftalık KPI Raporu',
        description: 'Temel performans göstergelerinin haftalık özeti',
        type: ReportType.KPI,
        status: ReportStatus.COMPLETED,
        format: ReportFormat.EXCEL,
        frequency: ReportFrequency.WEEKLY,
        filters: { dateRange: { startDate: new Date('2024-01-22'), endDate: new Date('2024-01-28') } },
        sections: [],
        dateRange: { start: new Date('2024-01-22'), end: new Date('2024-01-28') },
        createdAt: new Date('2024-01-29'),
        updatedAt: new Date('2024-01-29'),
        createdBy: 'Mehmet Demir',
        lastGeneratedAt: new Date('2024-01-29'),
        fileUrl: '/reports/kpi-w4-2024.xlsx'
      },
      {
        id: '4',
        name: 'Geri Bildirim Kaynak Analizi',
        description: 'Sosyal medya ve diğer kaynaklardan gelen geri bildirim dağılımı',
        type: ReportType.FEEDBACK,
        status: ReportStatus.DRAFT,
        format: ReportFormat.PDF,
        frequency: ReportFrequency.MONTHLY,
        filters: { dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') } },
        sections: [],
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        createdAt: new Date('2024-02-02'),
        updatedAt: new Date('2024-02-02'),
        createdBy: 'Elif Şahin'
      },
      {
        id: '5',
        name: 'Rakip Analizi Q1',
        description: 'Rakip bankaların müşteri deneyimi karşılaştırması',
        type: ReportType.COMPETITOR,
        status: ReportStatus.SCHEDULED,
        format: ReportFormat.PDF,
        frequency: ReportFrequency.QUARTERLY,
        filters: { dateRange: { startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') } },
        sections: [],
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
        createdBy: 'Ali Öztürk',
        schedule: { isEnabled: true, frequency: ReportFrequency.QUARTERLY, time: '09:00', timezone: 'Europe/Istanbul' }
      }
    ];

    this.reports.set(mockReports);
    this.filteredReports.set(mockReports);
    this.isLoading.set(false);
  }

  filterReports(): void {
    let filtered = [...this.reports()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(r => r.type === this.selectedType);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(r => r.status === this.selectedStatus);
    }

    if (this.selectedPeriod) {
      const days = parseInt(this.selectedPeriod);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(r => new Date(r.createdAt) >= cutoff);
    }

    this.filteredReports.set(filtered);
  }

  getReportTypeClass(type: ReportType): string {
    return type.toLowerCase();
  }

  getStatusClass(status: ReportStatus): string {
    return status.toLowerCase();
  }

  getStatusLabel(status: ReportStatus): string {
    const labels: Record<ReportStatus, string> = {
      [ReportStatus.DRAFT]: 'Taslak',
      [ReportStatus.GENERATING]: 'Oluşturuluyor',
      [ReportStatus.COMPLETED]: 'Tamamlandı',
      [ReportStatus.FAILED]: 'Başarısız',
      [ReportStatus.SCHEDULED]: 'Zamanlandı'
    };
    return labels[status];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  generateQuickReport(type: string): void {
    console.log('Generating quick report:', type);
    // Navigate to report builder with pre-selected type
  }

  viewReport(report: Report): void {
    console.log('View report:', report);
  }

  downloadReport(report: Report, format: string): void {
    console.log('Download report:', report.id, format);
  }

  editReport(report: Report): void {
    console.log('Edit report:', report);
  }

  generateReport(report: Report): void {
    console.log('Generate report:', report);
  }

  deleteReport(report: Report): void {
    if (confirm('Bu raporu silmek istediğinizden emin misiniz?')) {
      this.reports.update(reports => reports.filter(r => r.id !== report.id));
      this.filterReports();
    }
  }

  saveSchedule(): void {
    console.log('Schedule saved:', this.scheduleForm);
    this.showScheduleModal.set(false);
  }
}
