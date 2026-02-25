import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FeedbackService } from '../../core/services';
import { 
  Feedback, 
  FeedbackFilter, 
  FeedbackSource, 
  Platform, 
  SentimentType, 
  FeedbackCategory, 
  FeedbackStatus,
  Priority,
  PaginationParams 
} from '../../core/models';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { 
  SentimentBadgeComponent, 
  PriorityBadgeComponent, 
  StatusBadgeComponent,
  PlatformIconComponent 
} from '../../shared/components/badges/badges.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-feedback-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DataTableComponent,
    SentimentBadgeComponent,
    PriorityBadgeComponent,
    StatusBadgeComponent,
    PlatformIconComponent,
    ModalComponent
  ],
  template: `
    <div class="feedback-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Geri Bildirimler</h1>
          <p class="subtitle">Tüm kanallardan gelen müşteri geri bildirimleri</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="openImportModal()">
            <i class="icon icon-upload"></i>
            İçe Aktar
          </button>
          <button class="btn btn-secondary" (click)="exportFeedback()">
            <i class="icon icon-download"></i>
            Dışa Aktar
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-panel">
        <div class="filter-row">
          <div class="filter-group">
            <label>Kaynak</label>
            <select [(ngModel)]="filters.sources" multiple>
              @for (source of sourceOptions; track source.value) {
                <option [value]="source.value">{{source.label}}</option>
              }
            </select>
          </div>
          
          <div class="filter-group">
            <label>Platform</label>
            <select [(ngModel)]="filters.platforms" multiple>
              @for (platform of platformOptions; track platform.value) {
                <option [value]="platform.value">{{platform.label}}</option>
              }
            </select>
          </div>
          
          <div class="filter-group">
            <label>Duygu</label>
            <select [(ngModel)]="filters.sentiments" multiple>
              <option value="POSITIVE">Pozitif</option>
              <option value="NEUTRAL">Nötr</option>
              <option value="NEGATIVE">Negatif</option>
              <option value="MIXED">Karışık</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Kategori</label>
            <select [(ngModel)]="filters.categories" multiple>
              @for (category of categoryOptions; track category.value) {
                <option [value]="category.value">{{category.label}}</option>
              }
            </select>
          </div>
          
          <div class="filter-group">
            <label>Öncelik</label>
            <select [(ngModel)]="filters.priorities" multiple>
              <option value="CRITICAL">Kritik</option>
              <option value="HIGH">Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Durum</label>
            <select [(ngModel)]="filters.statuses" multiple>
              <option value="NEW">Yeni</option>
              <option value="IN_REVIEW">İncelemede</option>
              <option value="PENDING_APPROVAL">Onay Bekliyor</option>
              <option value="ASSIGNED">Atandı</option>
              <option value="IN_PROGRESS">İşlemde</option>
              <option value="RESOLVED">Çözüldü</option>
              <option value="CLOSED">Kapatıldı</option>
            </select>
          </div>
        </div>
        
        <div class="filter-row">
          <div class="filter-group date-range">
            <label>Tarih Aralığı</label>
            <div class="date-inputs">
              <input type="date" [(ngModel)]="filters.dateFrom">
              <span>-</span>
              <input type="date" [(ngModel)]="filters.dateTo">
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="btn btn-secondary" (click)="resetFilters()">
              <i class="icon icon-x"></i>
              Temizle
            </button>
            <button class="btn btn-primary" (click)="applyFilters()">
              <i class="icon icon-filter"></i>
              Filtrele
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Actions -->
      @if (selectedFeedback.length > 0) {
        <div class="bulk-actions">
          <span>{{selectedFeedback.length}} öğe seçildi</span>
          <div class="bulk-buttons">
            <button class="btn btn-sm" (click)="bulkAssign()">
              <i class="icon icon-user-plus"></i>
              Ata
            </button>
            <button class="btn btn-sm" (click)="bulkUpdateStatus('IN_REVIEW')">
              <i class="icon icon-eye"></i>
              İncele
            </button>
            <button class="btn btn-sm btn-danger" (click)="bulkUpdateStatus('CLOSED')">
              <i class="icon icon-x-circle"></i>
              Kapat
            </button>
          </div>
        </div>
      }

      <!-- Data Table -->
      <app-data-table
        [data]="feedbackList()"
        [columns]="columns"
        [loading]="loading()"
        [selectable]="true"
        [showActions]="true"
        [totalItems]="totalItems()"
        [currentPage]="pagination.page"
        [pageSize]="pagination.pageSize"
        [sortBy]="pagination.sortBy"
        [sortOrder]="pagination.sortOrder || 'desc'"
        (onSearch)="onSearch($event)"
        (onSort)="onSort($event)"
        (onPageChange)="onPageChange($event)"
        (onRowClick)="openDetailModal($event)"
        (onSelectionChange)="onSelectionChange($event)"
        [rowActionsTemplate]="rowActionsRef"
      />

      <ng-template #rowActionsRef let-row>
        <div class="row-actions">
          <button class="action-btn" title="Görüntüle" (click)="openDetailModal(row); $event.stopPropagation()">
            <i class="icon icon-eye"></i>
          </button>
          <button class="action-btn" title="Ata" (click)="assignFeedback(row); $event.stopPropagation()">
            <i class="icon icon-user-plus"></i>
          </button>
          <button class="action-btn" title="Analiz Et" (click)="analyzeFeedback(row); $event.stopPropagation()">
            <i class="icon icon-activity"></i>
          </button>
        </div>
      </ng-template>

      <!-- Detail Modal -->
      <app-modal 
        #detailModal 
        [title]="'Geri Bildirim Detayı'" 
        size="lg"
        [showFooter]="false"
      >
        @if (selectedDetail()) {
          <div class="feedback-detail">
            <div class="detail-header">
              <div class="detail-badges">
                <app-platform-icon [platform]="selectedDetail()!.platform" [showLabel]="true" />
                <app-sentiment-badge [sentiment]="selectedDetail()!.sentiment" [score]="selectedDetail()!.sentimentScore" [showScore]="true" />
                <app-priority-badge [priority]="selectedDetail()!.priority" />
                <app-status-badge [status]="selectedDetail()!.status" />
              </div>
              <span class="detail-date">{{selectedDetail()!.createdAt | date:'medium'}}</span>
            </div>

            <div class="detail-content">
              <h4>İçerik</h4>
              <p>{{selectedDetail()!.content}}</p>
              
              @if (selectedDetail()!.translatedContent) {
                <h4>Çeviri</h4>
                <p class="translated">{{selectedDetail()!.translatedContent}}</p>
              }
            </div>

            <div class="detail-meta">
              <div class="meta-item">
                <label>Kategori</label>
                <span>{{selectedDetail()!.category}}</span>
              </div>
              <div class="meta-item">
                <label>Kaynak</label>
                <span>{{selectedDetail()!.source}}</span>
              </div>
              <div class="meta-item">
                <label>Yazar</label>
                <span>{{selectedDetail()!.author || 'Anonim'}}</span>
              </div>
              @if (selectedDetail()!.assignedTo) {
                <div class="meta-item">
                  <label>Atanan</label>
                  <span>{{selectedDetail()!.assignedTo}}</span>
                </div>
              }
            </div>

            @if (selectedDetail()!.rootCauses && selectedDetail()!.rootCauses.length) {
              <div class="detail-root-causes">
                <h4>Kök Nedenler</h4>
                <div class="root-cause-list">
                  @for (cause of selectedDetail()!.rootCauses; track cause.id) {
                    <div class="root-cause-item">
                      <span class="cause-name">{{cause.name}}</span>
                      <span class="cause-confidence">%{{cause.confidence}} güven</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (selectedDetail()!.tags && selectedDetail()!.tags.length) {
              <div class="detail-tags">
                <h4>Etiketler</h4>
                <div class="tags-list">
                  @for (tag of selectedDetail()!.tags; track tag) {
                    <span class="tag">{{tag}}</span>
                  }
                </div>
              </div>
            }

            <div class="detail-actions">
              <button class="btn btn-secondary" (click)="createTaskFromFeedback(selectedDetail()!)">
                <i class="icon icon-clipboard"></i>
                Görev Oluştur
              </button>
              <button class="btn btn-secondary" (click)="analyzeRootCause(selectedDetail()!)">
                <i class="icon icon-search"></i>
                Kök Neden Analizi
              </button>
              <button class="btn btn-primary" (click)="updateStatus(selectedDetail()!, 'IN_REVIEW')">
                <i class="icon icon-check"></i>
                İncele
              </button>
            </div>
          </div>
        }
      </app-modal>
    </div>
  `,
  styles: [`
    .feedback-page {
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0.25rem 0 0;
        color: var(--text-secondary, #6b7280);
      }
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;

      &.btn-primary {
        background: var(--primary-color, #3b82f6);
        color: #fff;

        &:hover {
          background: var(--primary-dark, #2563eb);
        }
      }

      &.btn-secondary {
        background: #fff;
        border: 1px solid var(--border-color, #e5e7eb);
        color: var(--text-primary, #1f2937);

        &:hover {
          background: var(--hover-bg, #f3f4f6);
        }
      }

      &.btn-danger {
        background: #ef4444;
        color: #fff;

        &:hover {
          background: #dc2626;
        }
      }

      &.btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }
    }

    .filters-panel {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 150px;

      label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
      }

      select, input {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: #fff;

        &:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }
      }

      &.date-range {
        .date-inputs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      }
    }

    .filter-actions {
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
      margin-left: auto;
    }

    .bulk-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--primary-light, #eff6ff);
      border-radius: 0.5rem;
      margin-bottom: 1rem;

      span {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--primary-dark, #1e40af);
      }
    }

    .bulk-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .row-actions {
      display: flex;
      gap: 0.25rem;
      justify-content: center;
    }

    .action-btn {
      padding: 0.375rem;
      background: transparent;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      color: var(--text-secondary, #6b7280);
      transition: all 0.2s;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
        color: var(--primary-color, #3b82f6);
      }
    }

    /* Detail Modal Styles */
    .feedback-detail {
      .detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .detail-badges {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .detail-date {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
      }

      .detail-content {
        margin-bottom: 1.5rem;

        h4 {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary, #6b7280);
        }

        p {
          margin: 0;
          line-height: 1.6;
          background: var(--bg-secondary, #f9fafb);
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .translated {
          background: #fef3c7;
          margin-top: 1rem;
        }
      }

      .detail-meta {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: var(--bg-secondary, #f9fafb);
        border-radius: 0.5rem;

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          label {
            font-size: 0.75rem;
            color: var(--text-secondary, #6b7280);
          }

          span {
            font-weight: 500;
          }
        }
      }

      .detail-root-causes,
      .detail-tags {
        margin-bottom: 1.5rem;

        h4 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
        }
      }

      .root-cause-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .root-cause-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        background: var(--bg-secondary, #f9fafb);
        border-radius: 0.375rem;

        .cause-confidence {
          font-size: 0.75rem;
          color: var(--text-secondary, #6b7280);
        }
      }

      .tags-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .tag {
        padding: 0.25rem 0.75rem;
        background: var(--bg-secondary, #f3f4f6);
        border-radius: 9999px;
        font-size: 0.875rem;
      }

      .detail-actions {
        display: flex;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color, #e5e7eb);
      }
    }

    .icon {
      width: 18px;
      height: 18px;
    }
  `]
})
export class FeedbackListComponent implements OnInit {
  @ViewChild('detailModal') detailModal!: ModalComponent;

  private feedbackService = inject(FeedbackService);

  feedbackList = signal<Feedback[]>([]);
  loading = signal(false);
  totalItems = signal(0);
  selectedFeedback: Feedback[] = [];
  selectedDetail = signal<Feedback | null>(null);

  filters: FeedbackFilter = {};
  pagination: PaginationParams = {
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  columns: TableColumn<Feedback>[] = [
    {
      key: 'platform',
      header: 'Platform',
      width: '100px'
    },
    {
      key: 'content',
      header: 'İçerik',
      format: (value) => value.length > 100 ? value.substring(0, 100) + '...' : value
    },
    {
      key: 'sentiment',
      header: 'Duygu',
      width: '120px'
    },
    {
      key: 'category',
      header: 'Kategori',
      width: '140px'
    },
    {
      key: 'priority',
      header: 'Öncelik',
      width: '100px'
    },
    {
      key: 'status',
      header: 'Durum',
      width: '130px'
    },
    {
      key: 'createdAt',
      header: 'Tarih',
      width: '120px',
      sortable: true,
      format: (value) => new Date(value).toLocaleDateString('tr-TR')
    }
  ];

  sourceOptions = [
    { value: 'SOCIAL_MEDIA', label: 'Sosyal Medya' },
    { value: 'APP_STORE', label: 'Uygulama Marketleri' },
    { value: 'GOOGLE_REVIEWS', label: 'Google Yorumları' },
    { value: 'COMPLAINT_SITE', label: 'Şikayet Siteleri' },
    { value: 'CALL_CENTER', label: 'Çağrı Merkezi' },
    { value: 'SURVEY', label: 'Anketler' },
    { value: 'API', label: 'API Entegrasyonu' }
  ];

  platformOptions = [
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TWITTER', label: 'Twitter/X' },
    { value: 'YOUTUBE', label: 'YouTube' },
    { value: 'GOOGLE', label: 'Google' },
    { value: 'APP_STORE_IOS', label: 'App Store' },
    { value: 'PLAY_STORE', label: 'Play Store' },
    { value: 'SIKAYETVAR', label: 'Şikayetvar' }
  ];

  categoryOptions = [
    { value: 'MOBILE_APP', label: 'Mobil Uygulama' },
    { value: 'INTERNET_BANKING', label: 'İnternet Bankacılığı' },
    { value: 'CUSTOMER_SERVICE', label: 'Müşteri Hizmetleri' },
    { value: 'CREDIT_CARD', label: 'Kredi Kartı' },
    { value: 'LOAN', label: 'Kredi' },
    { value: 'ATM', label: 'ATM' },
    { value: 'BRANCH', label: 'Şube' },
    { value: 'SECURITY', label: 'Güvenlik' },
    { value: 'OTHER', label: 'Diğer' }
  ];

  ngOnInit(): void {
    this.loadFeedback();
  }

  loadFeedback(): void {
    this.loading.set(true);
    this.feedbackService.getFeedback(this.filters, this.pagination).subscribe({
      next: (response) => {
        if (response.success) {
          this.feedbackList.set(response.data);
          this.totalItems.set((response.meta && response.meta.total) || 0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.pagination.page = 1;
    this.loadFeedback();
  }

  resetFilters(): void {
    this.filters = {};
    this.pagination.page = 1;
    this.loadFeedback();
  }

  onSearch(query: string): void {
    this.filters.searchText = query;
    this.applyFilters();
  }

  onSort(event: { sortBy: string; sortOrder: 'asc' | 'desc' }): void {
    this.pagination.sortBy = event.sortBy;
    this.pagination.sortOrder = event.sortOrder;
    this.loadFeedback();
  }

  onPageChange(params: PaginationParams): void {
    this.pagination = { ...this.pagination, ...params };
    this.loadFeedback();
  }

  onSelectionChange(items: Feedback[]): void {
    this.selectedFeedback = items;
  }

  openDetailModal(feedback: Feedback): void {
    this.selectedDetail.set(feedback);
    this.detailModal.open();
  }

  openImportModal(): void {
    // Open import modal
  }

  exportFeedback(): void {
    this.feedbackService.exportFeedback(this.filters).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    });
  }

  assignFeedback(feedback: Feedback): void {
    // Open assign modal
  }

  analyzeFeedback(feedback: Feedback): void {
    // Navigate to analysis
  }

  bulkAssign(): void {
    // Bulk assign selected items
  }

  bulkUpdateStatus(status: string): void {
    const ids = this.selectedFeedback.map(f => f.id);
    this.feedbackService.bulkUpdateStatus(ids, status).subscribe(() => {
      this.selectedFeedback = [];
      this.loadFeedback();
    });
  }

  updateStatus(feedback: Feedback, status: string): void {
    this.feedbackService.updateFeedbackStatus(feedback.id, status).subscribe(() => {
      this.loadFeedback();
      this.detailModal.close();
    });
  }

  createTaskFromFeedback(feedback: Feedback): void {
    // Navigate to task creation
  }

  analyzeRootCause(feedback: Feedback): void {
    // Navigate to root cause analysis
  }
}
