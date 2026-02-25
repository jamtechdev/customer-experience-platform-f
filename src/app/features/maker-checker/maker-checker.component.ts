import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ApprovalItem {
  id: string;
  type: 'report' | 'action_plan' | 'survey' | 'data_source' | 'user' | 'setting';
  title: string;
  description: string;
  maker: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  priority: 'high' | 'medium' | 'low';
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  comments?: {
    user: string;
    text: string;
    timestamp: Date;
  }[];
}

@Component({
  selector: 'app-maker-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="maker-checker-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Onay Yönetimi</h1>
          <p>Maker-Checker onay süreçlerini yönetin</p>
        </div>
        <div class="header-stats">
          <div class="stat-item pending">
            <span class="stat-value">{{ pendingCount() }}</span>
            <span class="stat-label">Bekleyen</span>
          </div>
          <div class="stat-item approved">
            <span class="stat-value">{{ approvedCount() }}</span>
            <span class="stat-label">Onaylanan</span>
          </div>
          <div class="stat-item rejected">
            <span class="stat-value">{{ rejectedCount() }}</span>
            <span class="stat-label">Reddedilen</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-tabs">
          <button 
            class="filter-tab"
            [class.active]="activeTab() === 'pending'"
            (click)="setActiveTab('pending')"
          >
            Bekleyenler
            <span class="tab-badge">{{ pendingCount() }}</span>
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeTab() === 'my_requests'"
            (click)="setActiveTab('my_requests')"
          >
            Taleplerim
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeTab() === 'history'"
            (click)="setActiveTab('history')"
          >
            Geçmiş
          </button>
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="filterType" class="filter-select">
            <option value="">Tüm Türler</option>
            <option value="report">Raporlar</option>
            <option value="action_plan">Aksiyon Planları</option>
            <option value="survey">Anketler</option>
            <option value="data_source">Veri Kaynakları</option>
            <option value="user">Kullanıcılar</option>
            <option value="setting">Ayarlar</option>
          </select>
          <select [(ngModel)]="filterPriority" class="filter-select">
            <option value="">Tüm Öncelikler</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>
        </div>
      </div>

      <!-- Approval List -->
      <div class="approvals-list">
        @if (filteredItems().length === 0) {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3>Onay bekleyen kayıt yok</h3>
            <p>Tüm onay talepleri işlendi</p>
          </div>
        } @else {
          @for (item of filteredItems(); track item.id) {
            <div class="approval-card" [class.expanded]="expandedItem() === item.id">
              <div class="card-header" (click)="toggleExpand(item.id)">
                <div class="header-left">
                  <div class="type-icon" [class]="item.type">
                    @switch (item.type) {
                      @case ('report') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      }
                      @case ('action_plan') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      }
                      @case ('survey') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      }
                      @case ('data_source') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <ellipse cx="12" cy="5" rx="9" ry="3"/>
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                      }
                      @case ('user') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      }
                      @case ('setting') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                      }
                    }
                  </div>
                  <div class="item-info">
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description }}</p>
                  </div>
                </div>
                <div class="header-right">
                  <span class="priority-badge" [class]="item.priority">
                    {{ getPriorityLabel(item.priority) }}
                  </span>
                  <span class="status-badge" [class]="item.status">
                    @switch (item.status) {
                      @case ('pending') { Bekliyor }
                      @case ('approved') { Onaylandı }
                      @case ('rejected') { Reddedildi }
                      @case ('returned') { İade Edildi }
                    }
                  </span>
                  <span class="time-ago">{{ getTimeAgo(item.createdAt) }}</span>
                  <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              @if (expandedItem() === item.id) {
                <div class="card-body">
                  <div class="maker-info">
                    <div class="maker-avatar">
                      {{ getMakerInitials(item.maker.name) }}
                    </div>
                    <div class="maker-details">
                      <span class="maker-label">Oluşturan</span>
                      <span class="maker-name">{{ item.maker.name }}</span>
                      <span class="maker-date">{{ item.createdAt | date:'dd MMM yyyy HH:mm' }}</span>
                    </div>
                  </div>

                  @if (item.changes && item.changes.length > 0) {
                    <div class="changes-section">
                      <h4>Değişiklikler</h4>
                      <div class="changes-table">
                        <div class="change-row header">
                          <span>Alan</span>
                          <span>Eski Değer</span>
                          <span>Yeni Değer</span>
                        </div>
                        @for (change of item.changes; track change.field) {
                          <div class="change-row">
                            <span class="field-name">{{ change.field }}</span>
                            <span class="old-value">{{ change.oldValue }}</span>
                            <span class="new-value">{{ change.newValue }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (item.comments && item.comments.length > 0) {
                    <div class="comments-section">
                      <h4>Yorumlar</h4>
                      <div class="comments-list">
                        @for (comment of item.comments; track $index) {
                          <div class="comment-item">
                            <div class="comment-avatar">{{ comment.user.charAt(0) }}</div>
                            <div class="comment-content">
                              <span class="comment-user">{{ comment.user }}</span>
                              <p>{{ comment.text }}</p>
                              <span class="comment-time">{{ comment.timestamp | date:'dd MMM HH:mm' }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (item.status === 'pending') {
                    <div class="action-section">
                      <div class="comment-input">
                        <textarea 
                          [(ngModel)]="actionComment"
                          placeholder="Yorum ekleyin (opsiyonel)..."
                          rows="2"
                        ></textarea>
                      </div>
                      <div class="action-buttons">
                        <button class="btn btn-outline" (click)="returnItem(item)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                          </svg>
                          İade Et
                        </button>
                        <button class="btn btn-danger" (click)="rejectItem(item)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Reddet
                        </button>
                        <button class="btn btn-success" (click)="approveItem(item)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Onayla
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .maker-checker-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-left h1 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .header-left p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .stat-item {
      padding: 16px 24px;
      background: white;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .stat-item.pending .stat-value { color: #f59e0b; }
    .stat-item.approved .stat-value { color: #22c55e; }
    .stat-item.rejected .stat-value { color: #ef4444; }

    /* Filters */
    .filters-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
      background: var(--bg-secondary);
      padding: 4px;
      border-radius: 10px;
    }

    .filter-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-tab:hover {
      background: rgba(255,255,255,0.5);
    }

    .filter-tab.active {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .tab-badge {
      background: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
    }

    .filter-controls {
      display: flex;
      gap: 12px;
    }

    .filter-select {
      padding: 10px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    /* Approval List */
    .approvals-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
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
    }

    .empty-state p {
      color: var(--text-tertiary);
    }

    .approval-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .card-header:hover {
      background: var(--bg-secondary);
    }

    .header-left {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .type-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-icon svg {
      width: 24px;
      height: 24px;
    }

    .type-icon.report { background: #dbeafe; color: #2563eb; }
    .type-icon.action_plan { background: #d1fae5; color: #059669; }
    .type-icon.survey { background: #fce7f3; color: #db2777; }
    .type-icon.data_source { background: #ede9fe; color: #7c3aed; }
    .type-icon.user { background: #fef3c7; color: #d97706; }
    .type-icon.setting { background: #f3f4f6; color: #6b7280; }

    .item-info h3 {
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .item-info p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .priority-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-badge.high { background: #fee2e2; color: #dc2626; }
    .priority-badge.medium { background: #fef3c7; color: #d97706; }
    .priority-badge.low { background: #f3f4f6; color: #6b7280; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.pending { background: #fef3c7; color: #d97706; }
    .status-badge.approved { background: #d1fae5; color: #059669; }
    .status-badge.rejected { background: #fee2e2; color: #dc2626; }
    .status-badge.returned { background: #dbeafe; color: #2563eb; }

    .time-ago {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .expand-icon {
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
      transition: transform 0.2s ease;
    }

    .approval-card.expanded .expand-icon {
      transform: rotate(180deg);
    }

    /* Card Body */
    .card-body {
      padding: 0 24px 24px;
      border-top: 1px solid var(--border-color);
    }

    .maker-info {
      display: flex;
      gap: 12px;
      padding: 20px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .maker-avatar {
      width: 48px;
      height: 48px;
      background: var(--primary-light);
      color: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .maker-details {
      display: flex;
      flex-direction: column;
    }

    .maker-label {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .maker-name {
      font-weight: 500;
    }

    .maker-date {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Changes Section */
    .changes-section {
      padding: 20px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .changes-section h4 {
      font-size: 0.875rem;
      margin-bottom: 12px;
    }

    .changes-table {
      background: var(--bg-secondary);
      border-radius: 8px;
      overflow: hidden;
    }

    .change-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      padding: 12px 16px;
    }

    .change-row.header {
      background: var(--border-color);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .change-row:not(.header) {
      border-top: 1px solid var(--border-color);
    }

    .field-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .old-value {
      color: var(--error-color);
      text-decoration: line-through;
      font-size: 0.875rem;
    }

    .new-value {
      color: var(--success-color);
      font-size: 0.875rem;
    }

    /* Comments Section */
    .comments-section {
      padding: 20px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .comments-section h4 {
      font-size: 0.875rem;
      margin-bottom: 12px;
    }

    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comment-item {
      display: flex;
      gap: 12px;
    }

    .comment-avatar {
      width: 32px;
      height: 32px;
      background: var(--bg-secondary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .comment-content {
      flex: 1;
    }

    .comment-user {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .comment-content p {
      margin: 4px 0;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .comment-time {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    /* Action Section */
    .action-section {
      padding-top: 20px;
    }

    .comment-input {
      margin-bottom: 16px;
    }

    .comment-input textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      resize: none;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
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
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-success {
      background: #22c55e;
      color: white;
      border: none;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      border: none;
    }

    @media (max-width: 1024px) {
      .page-header {
        flex-direction: column;
        gap: 20px;
      }

      .header-stats {
        width: 100%;
        justify-content: flex-start;
      }
    }

    @media (max-width: 768px) {
      .filters-section {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .filter-tabs {
        overflow-x: auto;
      }

      .header-right {
        flex-wrap: wrap;
        gap: 8px;
      }

      .change-row {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      .change-row.header {
        display: none;
      }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class MakerCheckerComponent {
  private router = inject(Router);

  activeTab = signal<'pending' | 'my_requests' | 'history'>('pending');
  expandedItem = signal<string | null>(null);
  filterType = '';
  filterPriority = '';
  actionComment = '';

  items = signal<ApprovalItem[]>([
    {
      id: 'apr-001',
      type: 'report',
      title: 'Q4 2024 CX Performans Raporu',
      description: 'Çeyreklik müşteri deneyimi performans raporu yayınlanmak üzere onay bekliyor',
      maker: { id: 'u1', name: 'Ahmet Yılmaz' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'high',
      changes: [
        { field: 'NPS Skoru', oldValue: '42', newValue: '45' },
        { field: 'Dönem', oldValue: 'Q3 2024', newValue: 'Q4 2024' }
      ],
      comments: [
        { user: 'Ahmet Yılmaz', text: 'Güncel verilerle rapor hazırlandı, onayınıza sunarım.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      ]
    },
    {
      id: 'apr-002',
      type: 'action_plan',
      title: 'Mobil Uygulama İyileştirme Planı',
      description: 'Müşteri şikayetlerine yönelik mobil uygulama aksiyon planı',
      maker: { id: 'u2', name: 'Ayşe Demir' },
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'medium',
      changes: [
        { field: 'Hedef Tarih', oldValue: '15 Şubat 2024', newValue: '28 Şubat 2024' },
        { field: 'Sorumlu Departman', oldValue: 'IT', newValue: 'IT + Ürün' }
      ]
    },
    {
      id: 'apr-003',
      type: 'survey',
      title: 'Yeni Müşteri Memnuniyeti Anketi',
      description: 'Şube hizmetleri için yeni NPS anketi aktivasyonu',
      maker: { id: 'u3', name: 'Mehmet Kaya' },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'low'
    },
    {
      id: 'apr-004',
      type: 'data_source',
      title: 'Twitter API Entegrasyonu',
      description: 'Yeni Twitter/X API bağlantısı konfigürasyonu',
      maker: { id: 'u1', name: 'Ahmet Yılmaz' },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'approved',
      priority: 'high'
    },
    {
      id: 'apr-005',
      type: 'user',
      title: 'Yeni Kullanıcı: Zeynep Öztürk',
      description: 'CX Analisti rolüyle yeni kullanıcı tanımı',
      maker: { id: 'u2', name: 'Ayşe Demir' },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'rejected',
      priority: 'medium',
      comments: [
        { user: 'Admin', text: 'Departman bilgisi eksik, lütfen tamamlayınız.', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
      ]
    }
  ]);

  pendingCount = computed(() => 
    this.items().filter(i => i.status === 'pending').length
  );

  approvedCount = computed(() => 
    this.items().filter(i => i.status === 'approved').length
  );

  rejectedCount = computed(() => 
    this.items().filter(i => i.status === 'rejected').length
  );

  filteredItems = computed(() => {
    let result = [...this.items()];

    // Filter by tab
    if (this.activeTab() === 'pending') {
      result = result.filter(i => i.status === 'pending');
    } else if (this.activeTab() === 'my_requests') {
      result = result.filter(i => i.maker.id === 'u1'); // Mock current user
    } else if (this.activeTab() === 'history') {
      result = result.filter(i => i.status !== 'pending');
    }

    // Filter by type
    if (this.filterType) {
      result = result.filter(i => i.type === this.filterType);
    }

    // Filter by priority
    if (this.filterPriority) {
      result = result.filter(i => i.priority === this.filterPriority);
    }

    return result;
  });

  setActiveTab(tab: 'pending' | 'my_requests' | 'history'): void {
    this.activeTab.set(tab);
    this.expandedItem.set(null);
  }

  toggleExpand(itemId: string): void {
    if (this.expandedItem() === itemId) {
      this.expandedItem.set(null);
    } else {
      this.expandedItem.set(itemId);
    }
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük'
    };
    return labels[priority];
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
  }

  getMakerInitials(name: string): string {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  }

  approveItem(item: ApprovalItem): void {
    this.items.update(items => 
      items.map(i => i.id === item.id ? { ...i, status: 'approved' as const } : i)
    );
    this.expandedItem.set(null);
    this.actionComment = '';
  }

  rejectItem(item: ApprovalItem): void {
    this.items.update(items => 
      items.map(i => i.id === item.id ? { ...i, status: 'rejected' as const } : i)
    );
    this.expandedItem.set(null);
    this.actionComment = '';
  }

  returnItem(item: ApprovalItem): void {
    this.items.update(items => 
      items.map(i => i.id === item.id ? { ...i, status: 'returned' as const } : i)
    );
    this.expandedItem.set(null);
    this.actionComment = '';
  }
}
