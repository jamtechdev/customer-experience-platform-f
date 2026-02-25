import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: string;
  nextRun: Date;
  lastRun?: Date;
  recipients: string[];
  format: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  createdBy: string;
}

@Component({
  selector: 'app-scheduled-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scheduled-reports">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Zamanlanmış Raporlar</h1>
          <p>Otomatik rapor oluşturma görevlerini yönetin</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal.set(true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Yeni Zamanlama
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ reports().length }}</span>
            <span class="stat-label">Toplam Zamanlama</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activeCount() }}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon paused">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="10" y1="15" x2="10" y2="9"/>
              <line x1="14" y1="15" x2="14" y2="9"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ pausedCount() }}</span>
            <span class="stat-label">Duraklatılmış</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ getNextRunTime() }}</span>
            <span class="stat-label">Sonraki Çalışma</span>
          </div>
        </div>
      </div>

      <!-- Reports List -->
      <div class="reports-table-container">
        <table class="reports-table">
          <thead>
            <tr>
              <th>Rapor</th>
              <th>Periyot</th>
              <th>Sonraki Çalışma</th>
              <th>Son Çalışma</th>
              <th>Alıcılar</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            @for (report of reports(); track report.id) {
              <tr>
                <td class="report-name-cell">
                  <div class="report-info">
                    <span class="report-name">{{ report.name }}</span>
                    <span class="report-type">{{ getTypeLabel(report.type) }} • {{ report.format }}</span>
                  </div>
                </td>
                <td>
                  <span class="frequency-badge">{{ getFrequencyLabel(report.frequency) }}</span>
                </td>
                <td>{{ formatDate(report.nextRun) }}</td>
                <td>{{ report.lastRun ? formatDate(report.lastRun) : '-' }}</td>
                <td>
                  <div class="recipients">
                    <span class="recipient-count">{{ report.recipients.length }} alıcı</span>
                    <span class="recipient-list">{{ report.recipients.join(', ') }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" [class]="report.status.toLowerCase()">
                    {{ getStatusLabel(report.status) }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    @if (report.status === 'ACTIVE') {
                      <button class="action-btn" (click)="pauseReport(report)" title="Duraklat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="10" y1="15" x2="10" y2="9"/>
                          <line x1="14" y1="15" x2="14" y2="9"/>
                        </svg>
                      </button>
                    } @else if (report.status === 'PAUSED') {
                      <button class="action-btn" (click)="resumeReport(report)" title="Devam Et">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </button>
                    }
                    <button class="action-btn" (click)="runNow(report)" title="Şimdi Çalıştır">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                    </button>
                    <button class="action-btn" (click)="editReport(report)" title="Düzenle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn danger" (click)="deleteReport(report)" title="Sil">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <h3>Zamanlanmış Rapor Yok</h3>
                  <p>Henüz zamanlanmış rapor bulunmuyor.</p>
                  <button class="btn btn-primary" (click)="showCreateModal.set(true)">
                    İlk Zamanlamayı Oluşturun
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingReport ? 'Zamanlamayı Düzenle' : 'Yeni Zamanlama' }}</h2>
              <button class="modal-close" (click)="showCreateModal.set(false)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Rapor Tipi</label>
                <select [(ngModel)]="newSchedule.type">
                  <option value="SENTIMENT">Duygu Analizi Raporu</option>
                  <option value="JOURNEY">CX Yolculuk Raporu</option>
                  <option value="FEEDBACK">Geri Bildirim Raporu</option>
                  <option value="KPI">KPI Raporu</option>
                  <option value="COMPETITOR">Rakip Analizi Raporu</option>
                </select>
              </div>

              <div class="form-group">
                <label>Rapor Adı</label>
                <input 
                  type="text" 
                  [(ngModel)]="newSchedule.name"
                  placeholder="Örn: Haftalık Duygu Analizi"
                />
              </div>

              <div class="form-group">
                <label>Periyot</label>
                <select [(ngModel)]="newSchedule.frequency">
                  <option value="DAILY">Günlük</option>
                  <option value="WEEKLY">Haftalık</option>
                  <option value="MONTHLY">Aylık</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Gönderim Saati</label>
                  <input type="time" [(ngModel)]="newSchedule.time" />
                </div>
                <div class="form-group">
                  <label>Format</label>
                  <select [(ngModel)]="newSchedule.format">
                    <option value="PDF">PDF</option>
                    <option value="EXCEL">Excel</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>E-posta Alıcıları</label>
                <input 
                  type="text" 
                  [(ngModel)]="newSchedule.recipients"
                  placeholder="ornek@email.com, ornek2@email.com"
                />
                <span class="form-hint">Birden fazla alıcı için virgülle ayırın</span>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showCreateModal.set(false)">İptal</button>
              <button class="btn btn-primary" (click)="saveSchedule()">
                {{ editingReport ? 'Güncelle' : 'Oluştur' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .scheduled-reports {
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

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.total { background: #e3f2fd; color: #1976d2; }
    .stat-icon.active { background: #e8f5e9; color: #388e3c; }
    .stat-icon.paused { background: #fff3e0; color: #f57c00; }
    .stat-icon.next { background: #f3e5f5; color: #7b1fa2; }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Table */
    .reports-table-container {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .reports-table {
      width: 100%;
      border-collapse: collapse;
    }

    .reports-table th,
    .reports-table td {
      padding: 16px 20px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .reports-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .reports-table tbody tr:hover {
      background: var(--bg-secondary);
    }

    .reports-table tbody tr:last-child td {
      border-bottom: none;
    }

    .report-name-cell {
      min-width: 200px;
    }

    .report-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .report-name {
      font-weight: 500;
    }

    .report-type {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .frequency-badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--bg-secondary);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .recipients {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .recipient-count {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .recipient-list {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.active { background: #e8f5e9; color: #388e3c; }
    .status-badge.paused { background: #fff3e0; color: #f57c00; }
    .status-badge.error { background: #ffebee; color: #c62828; }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      border-color: var(--primary-color);
    }

    .action-btn:hover svg {
      color: var(--primary-color);
    }

    .action-btn.danger:hover {
      border-color: var(--error-color);
    }

    .action-btn.danger:hover svg {
      color: var(--error-color);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px !important;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      color: var(--text-tertiary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
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
      max-width: 500px;
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

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .reports-table-container {
        overflow-x: auto;
      }
    }
  `]
})
export class ScheduledReportsComponent {
  reports = signal<ScheduledReport[]>([
    {
      id: '1',
      name: 'Haftalık Duygu Analizi',
      type: 'SENTIMENT',
      frequency: 'WEEKLY',
      nextRun: new Date('2024-02-05T09:00:00'),
      lastRun: new Date('2024-01-29T09:00:00'),
      recipients: ['ahmet@albarakaturk.com', 'zeynep@albarakaturk.com'],
      format: 'PDF',
      status: 'ACTIVE',
      createdBy: 'Admin'
    },
    {
      id: '2',
      name: 'Aylık KPI Raporu',
      type: 'KPI',
      frequency: 'MONTHLY',
      nextRun: new Date('2024-02-01T08:00:00'),
      lastRun: new Date('2024-01-01T08:00:00'),
      recipients: ['yonetim@albarakaturk.com'],
      format: 'EXCEL',
      status: 'ACTIVE',
      createdBy: 'Admin'
    },
    {
      id: '3',
      name: 'Günlük Geri Bildirim Özeti',
      type: 'FEEDBACK',
      frequency: 'DAILY',
      nextRun: new Date('2024-02-01T18:00:00'),
      lastRun: new Date('2024-01-31T18:00:00'),
      recipients: ['cx-team@albarakaturk.com'],
      format: 'PDF',
      status: 'PAUSED',
      createdBy: 'Admin'
    }
  ]);

  showCreateModal = signal(false);
  editingReport: ScheduledReport | null = null;

  newSchedule = {
    type: 'SENTIMENT',
    name: '',
    frequency: 'WEEKLY',
    time: '09:00',
    format: 'PDF',
    recipients: ''
  };

  activeCount = () => this.reports().filter(r => r.status === 'ACTIVE').length;
  pausedCount = () => this.reports().filter(r => r.status === 'PAUSED').length;

  getNextRunTime(): string {
    const activeReports = this.reports().filter(r => r.status === 'ACTIVE');
    if (activeReports.length === 0) return '-';
    
    const sorted = activeReports.sort((a, b) => 
      new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime()
    );
    
    const next = sorted[0].nextRun;
    const now = new Date();
    const diff = new Date(next).getTime() - now.getTime();
    
    if (diff < 0) return 'Bekliyor';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours} saat`;
    
    const days = Math.floor(hours / 24);
    return `${days} gün`;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'SENTIMENT': 'Duygu Analizi',
      'JOURNEY': 'CX Yolculuk',
      'FEEDBACK': 'Geri Bildirim',
      'KPI': 'KPI',
      'COMPETITOR': 'Rakip Analizi'
    };
    return labels[type] || type;
  }

  getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      'DAILY': 'Günlük',
      'WEEKLY': 'Haftalık',
      'MONTHLY': 'Aylık'
    };
    return labels[frequency] || frequency;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Aktif',
      'PAUSED': 'Duraklatıldı',
      'ERROR': 'Hata'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  pauseReport(report: ScheduledReport): void {
    this.reports.update(reports => 
      reports.map(r => r.id === report.id ? { ...r, status: 'PAUSED' as const } : r)
    );
  }

  resumeReport(report: ScheduledReport): void {
    this.reports.update(reports => 
      reports.map(r => r.id === report.id ? { ...r, status: 'ACTIVE' as const } : r)
    );
  }

  runNow(report: ScheduledReport): void {
    console.log('Run now:', report);
  }

  editReport(report: ScheduledReport): void {
    this.editingReport = report;
    this.newSchedule = {
      type: report.type,
      name: report.name,
      frequency: report.frequency,
      time: '09:00',
      format: report.format,
      recipients: report.recipients.join(', ')
    };
    this.showCreateModal.set(true);
  }

  deleteReport(report: ScheduledReport): void {
    if (confirm('Bu zamanlamayı silmek istediğinizden emin misiniz?')) {
      this.reports.update(reports => reports.filter(r => r.id !== report.id));
    }
  }

  saveSchedule(): void {
    console.log('Save schedule:', this.newSchedule);
    this.showCreateModal.set(false);
    this.editingReport = null;
    this.newSchedule = {
      type: 'SENTIMENT',
      name: '',
      frequency: 'WEEKLY',
      time: '09:00',
      format: 'PDF',
      recipients: ''
    };
  }
}
