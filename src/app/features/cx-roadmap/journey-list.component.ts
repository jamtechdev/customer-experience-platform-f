import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomerJourneyService } from '../../core/services';
import { CustomerJourney, JourneyStatus } from '../../core/models';

@Component({
  selector: 'app-journey-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="journey-list-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>CX Müşteri Yolculuğu Haritaları</h1>
          <p class="subtitle">Müşteri deneyimi yolculuk haritalarını yönetin ve analiz edin</p>
        </div>
        <button class="btn btn-primary" (click)="createNewJourney()">
          <i class="icon icon-plus"></i>
          Yeni Yolculuk
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <i class="icon icon-map"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{journeys().length}}</span>
            <span class="stat-label">Toplam Yolculuk</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <i class="icon icon-check-circle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{activeJourneys()}}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <i class="icon icon-alert-triangle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{totalWeakLinks()}}</span>
            <span class="stat-label">Zayıf Nokta</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <i class="icon icon-alert-circle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{totalPainPoints()}}</span>
            <span class="stat-label">Sorun Alanı</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="icon icon-search"></i>
          <input 
            type="text" 
            placeholder="Yolculuk ara..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()"
          >
        </div>
        <div class="filter-group">
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <option value="">Tüm Durumlar</option>
            <option value="DRAFT">Taslak</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ARCHIVED">Arşiv</option>
          </select>
          <select [(ngModel)]="productFilter" (ngModelChange)="applyFilters()">
            <option value="">Tüm Ürünler</option>
            @for (product of uniqueProducts(); track product) {
              <option [value]="product">{{product}}</option>
            }
          </select>
          <select [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
            <option value="updatedAt">Son Güncelleme</option>
            <option value="name">İsim</option>
            <option value="nps">NPS Skoru</option>
          </select>
        </div>
      </div>

      <!-- Journey Cards Grid -->
      <div class="journey-grid">
        @for (journey of filteredJourneys(); track journey.id) {
          <div class="journey-card" (click)="viewJourney(journey)">
            <div class="card-header">
              <div class="journey-icon" [class]="'status-' + journey.status.toLowerCase()">
                <i class="icon icon-map"></i>
              </div>
              <span class="journey-status" [class]="'status-' + journey.status.toLowerCase()">
                {{getStatusLabel(journey.status)}}
              </span>
            </div>
            
            <h3>{{journey.name}}</h3>
            <p class="journey-product">{{journey.productService}}</p>
            <p class="journey-description">{{journey.description}}</p>

            <div class="journey-metrics">
              <div class="metric">
                <span class="metric-label">NPS</span>
                <span class="metric-value" [class]="getNpsClass(journey.metrics.overallNps)">
                  {{journey.metrics.overallNps}}
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">CSAT</span>
                <span class="metric-value">{{journey.metrics.overallCsat}}%</span>
              </div>
              <div class="metric">
                <span class="metric-label">Aşama</span>
                <span class="metric-value">{{journey.stages.length || 0}}</span>
              </div>
            </div>

            <div class="journey-insights">
              <div class="insight warning" [title]="'Zayıf Noktalar'">
                <i class="icon icon-alert-triangle"></i>
                <span>{{journey.metrics.weakLinksCount}}</span>
              </div>
              <div class="insight danger" [title]="'Sorun Alanları'">
                <i class="icon icon-alert-circle"></i>
                <span>{{journey.metrics.painPointsCount}}</span>
              </div>
              <div class="insight success" [title]="'Fırsatlar'">
                <i class="icon icon-lightbulb"></i>
                <span>{{journey.metrics.opportunitiesCount}}</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="last-update">
                <i class="icon icon-clock"></i>
                {{journey.updatedAt | date:'shortDate'}}
              </span>
              <div class="card-actions">
                <button class="btn-icon" (click)="editJourney(journey, $event)" title="Düzenle">
                  <i class="icon icon-edit-2"></i>
                </button>
                <button class="btn-icon" (click)="duplicateJourney(journey, $event)" title="Kopyala">
                  <i class="icon icon-copy"></i>
                </button>
                <button class="btn-icon" (click)="exportJourney(journey, $event)" title="PDF İndir">
                  <i class="icon icon-download"></i>
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <i class="icon icon-map"></i>
            <h3>Yolculuk haritası bulunamadı</h3>
            <p>Henüz müşteri yolculuğu oluşturulmamış veya filtrelerinize uygun sonuç yok</p>
            <button class="btn btn-primary" (click)="createNewJourney()">
              <i class="icon icon-plus"></i>
              İlk Yolculuğu Oluştur
            </button>
          </div>
        }
      </div>

      <!-- Create Journey Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{editingJourney() ? 'Yolculuğu Düzenle' : 'Yeni Yolculuk Oluştur'}}</h2>
              <button class="close-btn" (click)="showCreateModal.set(false)">
                <i class="icon icon-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Yolculuk Adı *</label>
                <input 
                  type="text" 
                  [(ngModel)]="journeyForm.name"
                  placeholder="Örn: Kredi Kartı Başvuru Yolculuğu"
                >
              </div>
              <div class="form-group">
                <label>Ürün/Hizmet *</label>
                <input 
                  type="text" 
                  [(ngModel)]="journeyForm.productService"
                  placeholder="Örn: Bireysel Kredi Kartı"
                >
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea 
                  [(ngModel)]="journeyForm.description"
                  placeholder="Yolculuk hakkında kısa açıklama..."
                  rows="3"
                ></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Müşteri Segmenti</label>
                  <select [(ngModel)]="journeyForm.customerSegment">
                    <option value="">Seçiniz</option>
                    <option value="BIREYSEL">Bireysel</option>
                    <option value="KOBI">KOBİ</option>
                    <option value="KURUMSAL">Kurumsal</option>
                    <option value="OZEL_BANKACILIK">Özel Bankacılık</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Durum</label>
                  <select [(ngModel)]="journeyForm.status">
                    <option value="DRAFT">Taslak</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="ARCHIVED">Arşiv</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showCreateModal.set(false)">İptal</button>
              <button class="btn btn-primary" (click)="saveJourney()">
                {{editingJourney() ? 'Güncelle' : 'Oluştur'}}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .journey-list-page {
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0.25rem 0 0;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
      }
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

        &:hover { background: #2563eb; }
      }

      &.btn-secondary {
        background: #fff;
        border: 1px solid var(--border-color, #e5e7eb);
        color: var(--text-primary, #1f2937);

        &:hover { background: var(--hover-bg, #f3f4f6); }
      }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: #fff;
      padding: 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &.blue {
        background: #dbeafe;
        color: #2563eb;
      }
      &.green {
        background: #d1fae5;
        color: #059669;
      }
      &.orange {
        background: #fef3c7;
        color: #d97706;
      }
      &.red {
        background: #fee2e2;
        color: #dc2626;
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
    }

    /* Filters */
    .filters-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: #fff;
      padding: 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 320px;

      .icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary, #9ca3af);
      }

      input {
        width: 100%;
        padding: 0.5rem 0.75rem 0.5rem 2.25rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.5rem;
        font-size: 0.875rem;

        &:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }
      }
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;

      select {
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.5rem;
        font-size: 0.875rem;
        background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") right 0.5rem center no-repeat;
        background-size: 16px;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }
      }
    }

    /* Journey Grid */
    .journey-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .journey-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .journey-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &.status-draft {
        background: #f3f4f6;
        color: #6b7280;
      }
      &.status-active {
        background: #d1fae5;
        color: #059669;
      }
      &.status-archived {
        background: #e5e7eb;
        color: #6b7280;
      }
    }

    .journey-status {
      font-size: 0.6875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      text-transform: uppercase;

      &.status-draft {
        background: #f3f4f6;
        color: #6b7280;
      }
      &.status-active {
        background: #d1fae5;
        color: #059669;
      }
      &.status-archived {
        background: #e5e7eb;
        color: #6b7280;
      }
    }

    .journey-card h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .journey-product {
      margin: 0 0 0.5rem;
      font-size: 0.8125rem;
      color: var(--primary-color, #3b82f6);
      font-weight: 500;
    }

    .journey-description {
      margin: 0 0 1rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .journey-metrics {
      display: flex;
      gap: 1rem;
      padding: 0.75rem 0;
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      margin-bottom: 0.75rem;
    }

    .metric {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;

      .metric-label {
        font-size: 0.6875rem;
        color: var(--text-secondary, #6b7280);
        text-transform: uppercase;
      }

      .metric-value {
        font-size: 1.125rem;
        font-weight: 700;

        &.nps-good { color: #059669; }
        &.nps-warning { color: #d97706; }
        &.nps-bad { color: #dc2626; }
      }
    }

    .journey-insights {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .insight {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.375rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 500;

      &.warning {
        background: #fef3c7;
        color: #b45309;
      }
      &.danger {
        background: #fee2e2;
        color: #b91c1c;
      }
      &.success {
        background: #d1fae5;
        color: #047857;
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .last-update {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);
    }

    .card-actions {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      padding: 0.375rem;
      background: none;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      color: var(--text-secondary, #6b7280);

      &:hover {
        background: var(--hover-bg, #f3f4f6);
        color: var(--text-primary, #1f2937);
      }
    }

    /* Empty State */
    .empty-state {
      grid-column: span 3;
      text-align: center;
      padding: 4rem 2rem;
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      .icon {
        width: 64px;
        height: 64px;
        color: var(--text-secondary, #9ca3af);
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
      }

      p {
        margin: 0 0 1.5rem;
        color: var(--text-secondary, #6b7280);
      }
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
    }

    .modal {
      background: #fff;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h2 {
        margin: 0;
        font-size: 1.125rem;
      }
    }

    .close-btn {
      padding: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0.375rem;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      input, select, textarea {
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.5rem;
        font-size: 0.875rem;

        &:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
        }
      }

      textarea {
        resize: vertical;
      }
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    @media (max-width: 1280px) {
      .journey-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .empty-state {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .journey-grid {
        grid-template-columns: 1fr;
      }

      .empty-state {
        grid-column: span 1;
      }

      .filters-section {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box {
        max-width: none;
      }

      .filter-group {
        flex-wrap: wrap;

        select {
          flex: 1;
          min-width: calc(50% - 0.375rem);
        }
      }
    }
  `]
})
export class JourneyListComponent implements OnInit {
  private journeyService = inject(CustomerJourneyService);

  journeys = signal<CustomerJourney[]>([]);
  filteredJourneys = signal<CustomerJourney[]>([]);
  showCreateModal = signal(false);
  editingJourney = signal<CustomerJourney | null>(null);

  searchTerm = '';
  statusFilter = '';
  productFilter = '';
  sortBy = 'updatedAt';

  journeyForm = {
    name: '',
    productService: '',
    description: '',
    customerSegment: '',
    status: 'DRAFT'
  };

  activeJourneys = computed(() => 
    this.journeys().filter(j => j.status === JourneyStatus.PUBLISHED).length
  );

  totalWeakLinks = computed(() => 
    this.journeys().reduce((sum, j) => sum + (j.metrics.weakLinksCount || 0), 0)
  );

  totalPainPoints = computed(() => 
    this.journeys().reduce((sum, j) => sum + (j.metrics.painPointsCount || 0), 0)
  );

  uniqueProducts = computed(() => 
    [...new Set(this.journeys().map(j => j.productService))]
  );

  ngOnInit(): void {
    this.loadJourneys();
  }

  loadJourneys(): void {
    this.journeyService.getJourneys({ page: 1, pageSize: 100 }).subscribe((response: any) => {
      if (response.success) {
        this.journeys.set(response.data);
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    let result = [...this.journeys()];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(j => 
        j.name.toLowerCase().includes(term) ||
        j.productService.toLowerCase().includes(term) ||
        (j.description || '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      result = result.filter(j => j.status === this.statusFilter);
    }

    if (this.productFilter) {
      result = result.filter(j => j.productService === this.productFilter);
    }

    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'nps':
          return (b.metrics.overallNps || 0) - (a.metrics.overallNps || 0);
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    this.filteredJourneys.set(result);
  }

  getStatusLabel(status: JourneyStatus): string {
    const labels: Record<JourneyStatus, string> = {
      [JourneyStatus.DRAFT]: 'Taslak',
      [JourneyStatus.IN_REVIEW]: 'İncelemede',
      [JourneyStatus.PUBLISHED]: 'Yayında',
      [JourneyStatus.ARCHIVED]: 'Arşiv'
    };
    return labels[status] || status;
  }

  getNpsClass(nps: number): string {
    if (nps >= 50) return 'nps-good';
    if (nps >= 0) return 'nps-warning';
    return 'nps-bad';
  }

  createNewJourney(): void {
    this.editingJourney.set(null);
    this.journeyForm = {
      name: '',
      productService: '',
      description: '',
      customerSegment: '',
      status: 'DRAFT'
    };
    this.showCreateModal.set(true);
  }

  viewJourney(journey: CustomerJourney): void {
    // Navigate to journey map
  }

  editJourney(journey: CustomerJourney, event: Event): void {
    event.stopPropagation();
    this.editingJourney.set(journey);
    this.journeyForm = {
      name: journey.name,
      productService: journey.productService,
      description: journey.description || '',
      customerSegment: '',
      status: journey.status
    };
    this.showCreateModal.set(true);
  }

  duplicateJourney(journey: CustomerJourney, event: Event): void {
    event.stopPropagation();
    // Create a copy with a new name
    const newJourney = { ...journey, name: journey.name + ' (Kopya)' };
    this.journeyService.createJourney(newJourney as any).subscribe((response: any) => {
      if (response.success) {
        this.loadJourneys();
      }
    });
  }

  exportJourney(journey: CustomerJourney, event: Event): void {
    event.stopPropagation();
    this.journeyService.exportJourneyMap(journey.id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journey-${journey.name}.pdf`;
      a.click();
    });
  }

  saveJourney(): void {
    const journeyData = {
      ...this.journeyForm,
      status: this.journeyForm.status as JourneyStatus
    };
    if (this.editingJourney()) {
      this.journeyService.updateJourney(this.editingJourney()!.id, journeyData).subscribe((response: any) => {
        if (response.success) {
          this.showCreateModal.set(false);
          this.loadJourneys();
        }
      });
    } else {
      this.journeyService.createJourney(journeyData as any).subscribe((response: any) => {
        if (response.success) {
          this.showCreateModal.set(false);
          this.loadJourneys();
        }
      });
    }
  }
}
