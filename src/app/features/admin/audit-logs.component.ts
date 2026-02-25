import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

interface AuditLog {
  id: string;
  action: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'APPROVE' | 'REJECT';
  module: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-logs">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Denetim Kayıtları</h1>
          <p>Sistem aktivitelerini ve kullanıcı işlemlerini izleyin</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="exportLogs()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Dışa Aktar
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ logs().length }}</span>
            <span class="stat-label">Toplam Kayıt</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ successCount() }}</span>
            <span class="stat-label">Başarılı</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon failed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ failedCount() }}</span>
            <span class="stat-label">Başarısız</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ loginCount() }}</span>
            <span class="stat-label">Giriş İşlemi</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-row">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Kullanıcı veya işlem ara..."
              [(ngModel)]="searchQuery"
              (input)="filterLogs()"
            />
          </div>

          <select [(ngModel)]="filterActionType" (change)="filterLogs()">
            <option value="">Tüm İşlemler</option>
            <option value="LOGIN">Giriş</option>
            <option value="LOGOUT">Çıkış</option>
            <option value="CREATE">Oluşturma</option>
            <option value="UPDATE">Güncelleme</option>
            <option value="DELETE">Silme</option>
            <option value="EXPORT">Dışa Aktarma</option>
            <option value="APPROVE">Onaylama</option>
            <option value="REJECT">Reddetme</option>
          </select>

          <select [(ngModel)]="filterModule" (change)="filterLogs()">
            <option value="">Tüm Modüller</option>
            <option value="auth">Kimlik Doğrulama</option>
            <option value="users">Kullanıcı Yönetimi</option>
            <option value="feedback">Geri Bildirimler</option>
            <option value="reports">Raporlar</option>
            <option value="tasks">Görevler</option>
            <option value="settings">Ayarlar</option>
          </select>

          <select [(ngModel)]="filterStatus" (change)="filterLogs()">
            <option value="">Tüm Durumlar</option>
            <option value="SUCCESS">Başarılı</option>
            <option value="FAILED">Başarısız</option>
            <option value="WARNING">Uyarı</option>
          </select>
        </div>

        <div class="filters-row">
          <div class="date-range">
            <label>Tarih Aralığı:</label>
            <input type="date" [(ngModel)]="startDate" (change)="filterLogs()" />
            <span>-</span>
            <input type="date" [(ngModel)]="endDate" (change)="filterLogs()" />
          </div>
          <button class="btn btn-link" (click)="clearFilters()">Filtreleri Temizle</button>
        </div>
      </div>

      <!-- Logs List -->
      <div class="logs-container">
        @for (log of filteredLogs(); track log.id) {
          <div class="log-item" [class]="log.status.toLowerCase()">
            <div class="log-icon" [class]="log.actionType.toLowerCase()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                @switch (log.actionType) {
                  @case ('LOGIN') {
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  }
                  @case ('LOGOUT') {
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  }
                  @case ('CREATE') {
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  }
                  @case ('UPDATE') {
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  }
                  @case ('DELETE') {
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  }
                  @case ('EXPORT') {
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  }
                  @case ('APPROVE') {
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  }
                  @case ('REJECT') {
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  }
                  @default {
                    <circle cx="12" cy="12" r="10"/>
                  }
                }
              </svg>
            </div>

            <div class="log-content">
              <div class="log-header">
                <span class="log-action">{{ log.action }}</span>
                <span class="log-status" [class]="log.status.toLowerCase()">
                  {{ getStatusLabel(log.status) }}
                </span>
              </div>
              
              <div class="log-user">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{{ log.userName }}</span>
                <span class="log-email">({{ log.userEmail }})</span>
              </div>

              <div class="log-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {{ formatTimestamp(log.timestamp) }}
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  {{ log.ipAddress }}
                </span>
                <span class="meta-item module">
                  {{ getModuleLabel(log.module) }}
                </span>
              </div>

              @if (log.oldValue || log.newValue) {
                <div class="log-changes">
                  @if (log.oldValue) {
                    <div class="change old">
                      <span class="change-label">Eski:</span>
                      <code>{{ log.oldValue }}</code>
                    </div>
                  }
                  @if (log.newValue) {
                    <div class="change new">
                      <span class="change-label">Yeni:</span>
                      <code>{{ log.newValue }}</code>
                    </div>
                  }
                </div>
              }
            </div>

            <button class="details-btn" (click)="viewDetails(log)" title="Detaylar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="19" cy="12" r="1"/>
                <circle cx="5" cy="12" r="1"/>
              </svg>
            </button>
          </div>
        } @empty {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <h3>Kayıt Bulunamadı</h3>
            <p>Seçilen filtrelere uygun denetim kaydı bulunamadı.</p>
          </div>
        }

        @if (filteredLogs().length > 0) {
          <div class="load-more">
            <button class="btn btn-outline" (click)="loadMore()">
              Daha Fazla Yükle
            </button>
          </div>
        }
      </div>

      <!-- Details Modal -->
      @if (showDetailsModal()) {
        <div class="modal-overlay" (click)="closeDetails()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Kayıt Detayları</h2>
              <button class="modal-close" (click)="closeDetails()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              @if (selectedLog) {
                <div class="detail-section">
                  <h4>Genel Bilgiler</h4>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <label>Kayıt ID</label>
                      <span>{{ selectedLog.id }}</span>
                    </div>
                    <div class="detail-item">
                      <label>İşlem</label>
                      <span>{{ selectedLog.action }}</span>
                    </div>
                    <div class="detail-item">
                      <label>İşlem Tipi</label>
                      <span>{{ selectedLog.actionType }}</span>
                    </div>
                    <div class="detail-item">
                      <label>Modül</label>
                      <span>{{ getModuleLabel(selectedLog.module) }}</span>
                    </div>
                    <div class="detail-item">
                      <label>Durum</label>
                      <span class="status-badge" [class]="selectedLog.status.toLowerCase()">
                        {{ getStatusLabel(selectedLog.status) }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <label>Zaman</label>
                      <span>{{ formatTimestamp(selectedLog.timestamp) }}</span>
                    </div>
                  </div>
                </div>

                <div class="detail-section">
                  <h4>Kullanıcı Bilgileri</h4>
                  <div class="detail-grid">
                    <div class="detail-item">
                      <label>Kullanıcı</label>
                      <span>{{ selectedLog.userName }}</span>
                    </div>
                    <div class="detail-item">
                      <label>E-posta</label>
                      <span>{{ selectedLog.userEmail }}</span>
                    </div>
                    <div class="detail-item">
                      <label>IP Adresi</label>
                      <span>{{ selectedLog.ipAddress }}</span>
                    </div>
                    <div class="detail-item full">
                      <label>Tarayıcı</label>
                      <span>{{ selectedLog.userAgent }}</span>
                    </div>
                  </div>
                </div>

                @if (selectedLog.details && getObjectKeys(selectedLog.details).length > 0) {
                  <div class="detail-section">
                    <h4>Ek Detaylar</h4>
                    <pre class="json-view">{{ selectedLog.details | json }}</pre>
                  </div>
                }
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeDetails()">Kapat</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-logs {
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

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 8px 12px;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    /* Stats */
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
    .stat-icon.success { background: #e8f5e9; color: #388e3c; }
    .stat-icon.failed { background: #ffebee; color: #c62828; }
    .stat-icon.login { background: #f3e5f5; color: #7b1fa2; }

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

    /* Filters */
    .filters-section {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filters-row + .filters-row {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
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

    .filters-section select,
    .filters-section input[type="date"] {
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .date-range label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    /* Logs List */
    .logs-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .log-item {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
      transition: all 0.2s ease;
    }

    .log-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .log-item.failed {
      border-left: 4px solid var(--error-color);
    }

    .log-item.warning {
      border-left: 4px solid var(--warning-color);
    }

    .log-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .log-icon svg {
      width: 20px;
      height: 20px;
    }

    .log-icon.login { background: #e3f2fd; color: #1976d2; }
    .log-icon.logout { background: #f5f5f5; color: #616161; }
    .log-icon.create { background: #e8f5e9; color: #388e3c; }
    .log-icon.update { background: #fff3e0; color: #f57c00; }
    .log-icon.delete { background: #ffebee; color: #c62828; }
    .log-icon.export { background: #e3f2fd; color: #1976d2; }
    .log-icon.approve { background: #e8f5e9; color: #388e3c; }
    .log-icon.reject { background: #ffebee; color: #c62828; }

    .log-content {
      flex: 1;
      min-width: 0;
    }

    .log-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .log-action {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .log-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .log-status.success { background: #e8f5e9; color: #388e3c; }
    .log-status.failed { background: #ffebee; color: #c62828; }
    .log-status.warning { background: #fff3e0; color: #f57c00; }

    .log-user {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .log-user svg {
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);
    }

    .log-email {
      color: var(--text-tertiary);
    }

    .log-meta {
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

    .meta-item.module {
      background: var(--bg-secondary);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .log-changes {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .change {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
    }

    .change-label {
      font-weight: 500;
      width: 40px;
    }

    .change code {
      flex: 1;
      padding: 6px 10px;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .change.old code {
      background: #ffebee;
      color: #c62828;
    }

    .change.new code {
      background: #e8f5e9;
      color: #388e3c;
    }

    .details-btn {
      width: 36px;
      height: 36px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      align-self: flex-start;
    }

    .details-btn svg {
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
    }

    .details-btn:hover {
      background: var(--primary-light);
    }

    .details-btn:hover svg {
      color: var(--primary-color);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      color: var(--text-tertiary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin-bottom: 8px;
      color: var(--text-secondary);
    }

    .empty-state p {
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    .load-more {
      text-align: center;
      padding: 20px;
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
      max-width: 600px;
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
    }

    .modal-close svg {
      width: 20px;
      height: 20px;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section h4 {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item.full {
      grid-column: span 2;
    }

    .detail-item label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .detail-item span {
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-block;
      width: fit-content;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.success { background: #e8f5e9; color: #388e3c; }
    .status-badge.failed { background: #ffebee; color: #c62828; }
    .status-badge.warning { background: #fff3e0; color: #f57c00; }

    .json-view {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
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

      .filters-row {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        min-width: unset;
      }

      .date-range {
        flex-wrap: wrap;
      }

      .log-item {
        flex-direction: column;
      }

      .details-btn {
        align-self: flex-end;
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .detail-item.full {
        grid-column: span 1;
      }
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  private adminService = inject(AdminService);

  logs = signal<AuditLog[]>([]);
  filteredLogs = signal<AuditLog[]>([]);
  showDetailsModal = signal(false);
  selectedLog: AuditLog | null = null;

  searchQuery = '';
  filterActionType = '';
  filterModule = '';
  filterStatus = '';
  startDate = '';
  endDate = '';

  successCount = computed(() => this.logs().filter(l => l.status === 'SUCCESS').length);
  failedCount = computed(() => this.logs().filter(l => l.status === 'FAILED').length);
  loginCount = computed(() => this.logs().filter(l => l.actionType === 'LOGIN').length);

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    const mockLogs: AuditLog[] = [
      {
        id: 'log-001',
        action: 'Kullanıcı Girişi',
        actionType: 'LOGIN',
        module: 'auth',
        userId: 'user-001',
        userName: 'Ahmet Yılmaz',
        userEmail: 'ahmet.yilmaz@albarakaturk.com.tr',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { method: 'password', twoFactor: true },
        timestamp: new Date('2024-01-31T09:30:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-002',
        action: 'Rapor Oluşturuldu',
        actionType: 'CREATE',
        module: 'reports',
        userId: 'user-002',
        userName: 'Zeynep Kaya',
        userEmail: 'zeynep.kaya@albarakaturk.com.tr',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { reportId: 'rpt-123', reportType: 'sentiment_analysis' },
        timestamp: new Date('2024-01-31T10:15:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-003',
        action: 'Kullanıcı Güncellendi',
        actionType: 'UPDATE',
        module: 'users',
        userId: 'user-001',
        userName: 'Ahmet Yılmaz',
        userEmail: 'ahmet.yilmaz@albarakaturk.com.tr',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { targetUserId: 'user-005', field: 'role' },
        oldValue: 'VIEWER',
        newValue: 'ANALYST',
        timestamp: new Date('2024-01-31T11:00:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-004',
        action: 'Geri Bildirim Silindi',
        actionType: 'DELETE',
        module: 'feedback',
        userId: 'user-003',
        userName: 'Mehmet Demir',
        userEmail: 'mehmet.demir@albarakaturk.com.tr',
        ipAddress: '192.168.1.110',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        details: { feedbackId: 'fb-456', reason: 'duplicate' },
        timestamp: new Date('2024-01-31T11:30:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-005',
        action: 'Veri Dışa Aktarıldı',
        actionType: 'EXPORT',
        module: 'reports',
        userId: 'user-002',
        userName: 'Zeynep Kaya',
        userEmail: 'zeynep.kaya@albarakaturk.com.tr',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { format: 'XLSX', recordCount: 1500 },
        timestamp: new Date('2024-01-31T12:00:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-006',
        action: 'Oturum Açma Başarısız',
        actionType: 'LOGIN',
        module: 'auth',
        userId: 'unknown',
        userName: 'Bilinmeyen',
        userEmail: 'test@test.com',
        ipAddress: '203.0.113.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { reason: 'invalid_credentials', attemptCount: 3 },
        timestamp: new Date('2024-01-31T12:30:00'),
        status: 'FAILED'
      },
      {
        id: 'log-007',
        action: 'Görev Onaylandı',
        actionType: 'APPROVE',
        module: 'tasks',
        userId: 'user-004',
        userName: 'Elif Şahin',
        userEmail: 'elif.sahin@albarakaturk.com.tr',
        ipAddress: '192.168.1.115',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0',
        details: { taskId: 'task-789', taskType: 'feedback_categorization' },
        timestamp: new Date('2024-01-31T14:00:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-008',
        action: 'Kullanıcı Çıkışı',
        actionType: 'LOGOUT',
        module: 'auth',
        userId: 'user-001',
        userName: 'Ahmet Yılmaz',
        userEmail: 'ahmet.yilmaz@albarakaturk.com.tr',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { sessionDuration: '4h 30m' },
        timestamp: new Date('2024-01-31T14:00:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-009',
        action: 'Görev Reddedildi',
        actionType: 'REJECT',
        module: 'tasks',
        userId: 'user-005',
        userName: 'Ali Öztürk',
        userEmail: 'ali.ozturk@albarakaturk.com.tr',
        ipAddress: '192.168.1.120',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
        details: { taskId: 'task-790', rejectReason: 'Eksik bilgi' },
        timestamp: new Date('2024-01-31T15:00:00'),
        status: 'SUCCESS'
      },
      {
        id: 'log-010',
        action: 'Sistem Ayarları Güncellendi',
        actionType: 'UPDATE',
        module: 'settings',
        userId: 'user-001',
        userName: 'Ahmet Yılmaz',
        userEmail: 'ahmet.yilmaz@albarakaturk.com.tr',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        details: { setting: 'alarm_threshold' },
        oldValue: '80',
        newValue: '75',
        timestamp: new Date('2024-01-31T16:00:00'),
        status: 'SUCCESS'
      }
    ];

    this.logs.set(mockLogs);
    this.filteredLogs.set(mockLogs);
  }

  filterLogs(): void {
    let filtered = [...this.logs()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.userName.toLowerCase().includes(query) ||
        l.userEmail.toLowerCase().includes(query) ||
        l.action.toLowerCase().includes(query)
      );
    }

    if (this.filterActionType) {
      filtered = filtered.filter(l => l.actionType === this.filterActionType);
    }

    if (this.filterModule) {
      filtered = filtered.filter(l => l.module === this.filterModule);
    }

    if (this.filterStatus) {
      filtered = filtered.filter(l => l.status === this.filterStatus);
    }

    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter(l => new Date(l.timestamp) >= start);
    }

    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => new Date(l.timestamp) <= end);
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    this.filteredLogs.set(filtered);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterActionType = '';
    this.filterModule = '';
    this.filterStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.filterLogs();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'SUCCESS': 'Başarılı',
      'FAILED': 'Başarısız',
      'WARNING': 'Uyarı'
    };
    return labels[status] || status;
  }

  getModuleLabel(module: string): string {
    const labels: Record<string, string> = {
      'auth': 'Kimlik Doğrulama',
      'users': 'Kullanıcı Yönetimi',
      'feedback': 'Geri Bildirimler',
      'reports': 'Raporlar',
      'tasks': 'Görevler',
      'settings': 'Ayarlar'
    };
    return labels[module] || module;
  }

  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  viewDetails(log: AuditLog): void {
    this.selectedLog = log;
    this.showDetailsModal.set(true);
  }

  closeDetails(): void {
    this.showDetailsModal.set(false);
    this.selectedLog = null;
  }

  loadMore(): void {
    console.log('Load more logs...');
  }

  exportLogs(): void {
    const data = this.filteredLogs();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
