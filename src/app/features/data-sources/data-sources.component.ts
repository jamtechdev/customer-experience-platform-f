import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataSourceService } from '../../core/services';
import { DataSource, DataSourceType, DataSourceStatus, SyncFrequency } from '../../core/models';

@Component({
  selector: 'app-data-sources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-sources-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Veri Kaynakları</h1>
          <p class="subtitle">Sosyal medya, yorum platformları ve diğer veri kaynaklarını yönetin</p>
        </div>
        <button class="btn btn-primary" (click)="addDataSource()">
          <i class="icon icon-plus"></i>
          Kaynak Ekle
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <i class="icon icon-database"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{dataSources().length}}</span>
            <span class="stat-label">Toplam Kaynak</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <i class="icon icon-check-circle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{activeCount()}}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <i class="icon icon-refresh-cw"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{syncingCount()}}</span>
            <span class="stat-label">Senkronize Ediliyor</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <i class="icon icon-alert-circle"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{errorCount()}}</span>
            <span class="stat-label">Hatalı</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <i class="icon icon-search"></i>
          <input 
            type="text" 
            placeholder="Kaynak ara..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterSources()"
          >
        </div>
        <div class="filter-group">
          <select [(ngModel)]="typeFilter" (ngModelChange)="filterSources()">
            <option value="">Tüm Tipler</option>
            <option value="SOCIAL_MEDIA">Sosyal Medya</option>
            <option value="REVIEW_PLATFORM">Yorum Platformu</option>
            <option value="APP_STORE">Uygulama Mağazası</option>
            <option value="COMPLAINT_SITE">Şikayet Sitesi</option>
            <option value="CALL_CENTER">Çağrı Merkezi</option>
            <option value="SURVEY">Anket</option>
            <option value="API">API</option>
            <option value="FILE">Dosya</option>
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="filterSources()">
            <option value="">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
            <option value="SYNCING">Senkronize</option>
            <option value="ERROR">Hata</option>
          </select>
        </div>
      </div>

      <!-- Data Sources Grid -->
      <div class="sources-grid">
        <!-- Social Media Sources -->
        <div class="source-category">
          <h3 class="category-title">
            <i class="icon icon-share-2"></i>
            Sosyal Medya
          </h3>
          <div class="sources-row">
            @for (source of getSocialMediaSources(); track source.id) {
              <div class="source-card" [class]="'status-' + source.status.toLowerCase()">
                <div class="source-header">
                  <div class="source-icon" [class]="'icon-' + source.platform.toLowerCase()">
                    <i class="icon icon-{{getSourceIcon(source)}}"></i>
                  </div>
                  <div class="source-status" [class]="'status-' + source.status.toLowerCase()">
                    {{getStatusLabel(source.status)}}
                  </div>
                </div>
                <h4>{{source.name}}</h4>
                <p class="source-handle">{{(source.configuration.endpoint || source.platform)}}</p>
                
                <div class="source-stats">
                  <div class="stat">
                    <span class="stat-value">{{source.totalRecords | number}}</span>
                    <span class="stat-label">Kayıt</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{source.errorCount || 0}}</span>
                    <span class="stat-label">Hata</span>
                  </div>
                </div>

                <div class="source-meta">
                  <span class="sync-time">
                    <i class="icon icon-clock"></i>
                    {{source.lastSyncAt | date:'short'}}
                  </span>
                  <span class="sync-freq">{{getSyncFrequency(source.syncFrequency)}}</span>
                </div>

                <div class="source-actions">
                  <button class="btn-icon" (click)="syncSource(source)" [disabled]="source.status === 'SYNCING'" title="Şimdi Senkronize Et">
                    <i class="icon icon-refresh-cw" [class.spinning]="source.status === 'SYNCING'"></i>
                  </button>
                  <button class="btn-icon" (click)="editSource(source)" title="Düzenle">
                    <i class="icon icon-settings"></i>
                  </button>
                  <button class="btn-icon" (click)="toggleSource(source)" title="{{source.status === 'CONNECTED' ? 'Durdur' : 'Başlat'}}">
                    <i class="icon icon-{{source.status === 'CONNECTED' ? 'pause' : 'play'}}"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Review Platforms -->
        <div class="source-category">
          <h3 class="category-title">
            <i class="icon icon-star"></i>
            Yorum Platformları
          </h3>
          <div class="sources-row">
            @for (source of getReviewSources(); track source.id) {
              <div class="source-card" [class]="'status-' + source.status.toLowerCase()">
                <div class="source-header">
                  <div class="source-icon" [class]="'icon-' + source.platform.toLowerCase()">
                    <i class="icon icon-{{getSourceIcon(source)}}"></i>
                  </div>
                  <div class="source-status" [class]="'status-' + source.status.toLowerCase()">
                    {{getStatusLabel(source.status)}}
                  </div>
                </div>
                <h4>{{source.name}}</h4>
                
                <div class="source-stats">
                  <div class="stat">
                    <span class="stat-value">{{source.totalRecords | number}}</span>
                    <span class="stat-label">Kayıt</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{source.errorCount || 0}}</span>
                    <span class="stat-label">Hata</span>
                  </div>
                </div>

                <div class="source-meta">
                  <span class="sync-time">
                    <i class="icon icon-clock"></i>
                    {{source.lastSyncAt | date:'short'}}
                  </span>
                </div>

                <div class="source-actions">
                  <button class="btn-icon" (click)="syncSource(source)" [disabled]="source.status === 'SYNCING'">
                    <i class="icon icon-refresh-cw" [class.spinning]="source.status === 'SYNCING'"></i>
                  </button>
                  <button class="btn-icon" (click)="editSource(source)">
                    <i class="icon icon-settings"></i>
                  </button>
                  <button class="btn-icon" (click)="toggleSource(source)">
                    <i class="icon icon-{{source.status === 'CONNECTED' ? 'pause' : 'play'}}"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Internal Sources -->
        <div class="source-category">
          <h3 class="category-title">
            <i class="icon icon-home"></i>
            Dahili Kaynaklar
          </h3>
          <div class="sources-row">
            @for (source of getInternalSources(); track source.id) {
              <div class="source-card" [class]="'status-' + source.status.toLowerCase()">
                <div class="source-header">
                  <div class="source-icon internal">
                    <i class="icon icon-{{getSourceIcon(source)}}"></i>
                  </div>
                  <div class="source-status" [class]="'status-' + source.status.toLowerCase()">
                    {{getStatusLabel(source.status)}}
                  </div>
                </div>
                <h4>{{source.name}}</h4>
                
                <div class="source-stats">
                  <div class="stat">
                    <span class="stat-value">{{source.totalRecords | number}}</span>
                    <span class="stat-label">Kayıt</span>
                  </div>
                </div>

                <div class="source-meta">
                  <span class="sync-time">
                    <i class="icon icon-clock"></i>
                    {{source.lastSyncAt | date:'short'}}
                  </span>
                </div>

                <div class="source-actions">
                  <button class="btn-icon" (click)="syncSource(source)" [disabled]="source.status === 'SYNCING'">
                    <i class="icon icon-refresh-cw" [class.spinning]="source.status === 'SYNCING'"></i>
                  </button>
                  <button class="btn-icon" (click)="editSource(source)">
                    <i class="icon icon-settings"></i>
                  </button>
                  <button class="btn-icon" (click)="toggleSource(source)">
                    <i class="icon icon-{{source.status === 'CONNECTED' ? 'pause' : 'play'}}"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Add/Edit Source Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{editingSource() ? 'Kaynağı Düzenle' : 'Yeni Kaynak Ekle'}}</h2>
              <button class="close-btn" (click)="closeModal()">
                <i class="icon icon-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <!-- Step 1: Select Type -->
              @if (modalStep() === 1) {
                <div class="source-type-grid">
                  @for (type of sourceTypes; track type.value) {
                    <div 
                      class="type-card" 
                      [class.selected]="sourceForm.type === type.value"
                      (click)="selectSourceType(type.value)"
                    >
                      <div class="type-icon">
                        <i class="icon icon-{{type.icon}}"></i>
                      </div>
                      <h4>{{type.label}}</h4>
                      <p>{{type.description}}</p>
                    </div>
                  }
                </div>
              }

              <!-- Step 2: Configure -->
              @if (modalStep() === 2) {
                <div class="form-section">
                  <div class="form-group">
                    <label>Kaynak Adı *</label>
                    <input type="text" [(ngModel)]="sourceForm.name" placeholder="Örn: Twitter Ana Hesap">
                  </div>

                  @if (sourceForm.type === 'SOCIAL_MEDIA') {
                    <div class="form-group">
                      <label>Platform *</label>
                      <select [(ngModel)]="sourceForm.platform">
                        <option value="">Seçiniz</option>
                        <option value="TWITTER">Twitter/X</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="YOUTUBE">YouTube</option>
                        <option value="LINKEDIN">LinkedIn</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Hesap/Kullanıcı Adı</label>
                      <input type="text" [(ngModel)]="sourceForm.configuration.accountId" placeholder="@kullanici_adi">
                    </div>
                    <div class="form-group">
                      <label>API Key</label>
                      <input type="password" [(ngModel)]="sourceForm.credentials.apiKey" placeholder="API anahtarınız">
                    </div>
                    <div class="form-group">
                      <label>API Secret</label>
                      <input type="password" [(ngModel)]="sourceForm.credentials.apiSecret" placeholder="API gizli anahtarı">
                    </div>
                  }

                  @if (sourceForm.type === 'REVIEW_PLATFORM' || sourceForm.type === 'APP_STORE') {
                    <div class="form-group">
                      <label>Platform *</label>
                      <select [(ngModel)]="sourceForm.platform">
                        <option value="">Seçiniz</option>
                        <option value="GOOGLE_REVIEWS">Google Yorumları</option>
                        <option value="APP_STORE">App Store</option>
                        <option value="PLAY_STORE">Google Play Store</option>
                        <option value="SIKAYETVAR">Şikayetvar</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Uygulama/İşletme ID</label>
                      <input type="text" [(ngModel)]="sourceForm.configuration.appId" placeholder="Uygulama veya işletme kimliği">
                    </div>
                  }

                  @if (sourceForm.type === 'CALL_CENTER') {
                    <div class="form-group">
                      <label>Sistem Tipi</label>
                      <select [(ngModel)]="sourceForm.configuration.systemType">
                        <option value="GENESYS">Genesys</option>
                        <option value="AVAYA">Avaya</option>
                        <option value="CISCO">Cisco</option>
                        <option value="CUSTOM">Özel</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>API Endpoint</label>
                      <input type="url" [(ngModel)]="sourceForm.configuration.endpoint" placeholder="https://api.example.com">
                    </div>
                  }

                  @if (sourceForm.type === 'API') {
                    <div class="form-group">
                      <label>API URL *</label>
                      <input type="url" [(ngModel)]="sourceForm.configuration.endpoint" placeholder="https://api.example.com/feedback">
                    </div>
                    <div class="form-group">
                      <label>Kimlik Doğrulama Tipi</label>
                      <select [(ngModel)]="sourceForm.configuration.authType">
                        <option value="NONE">Yok</option>
                        <option value="API_KEY">API Key</option>
                        <option value="BEARER">Bearer Token</option>
                        <option value="BASIC">Basic Auth</option>
                        <option value="OAUTH2">OAuth 2.0</option>
                      </select>
                    </div>
                  }

                  @if (sourceForm.type === 'FILE') {
                    <div class="form-group">
                      <label>Dosya Formatı</label>
                      <select [(ngModel)]="sourceForm.configuration.fileFormat">
                        <option value="CSV">CSV</option>
                        <option value="EXCEL">Excel</option>
                        <option value="JSON">JSON</option>
                        <option value="XML">XML</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Dosya Yükle</label>
                      <div class="file-upload">
                        <input type="file" id="fileInput" (change)="onFileSelected($event)">
                        <label for="fileInput" class="file-label">
                          <i class="icon icon-upload"></i>
                          <span>Dosya seçin veya sürükleyin</span>
                        </label>
                      </div>
                    </div>
                  }

                  <div class="form-group">
                    <label>Senkronizasyon Sıklığı</label>
                    <select [(ngModel)]="sourceForm.syncFrequency">
                      <option value="REAL_TIME">Gerçek Zamanlı</option>
                      <option value="HOURLY">Saatlik</option>
                      <option value="DAILY">Günlük</option>
                      <option value="WEEKLY">Haftalık</option>
                      <option value="MONTHLY">Aylık</option>
                      <option value="MANUAL">Manuel</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Dil</label>
                    <select [(ngModel)]="sourceForm.language">
                      <option value="tr">Türkçe</option>
                      <option value="en">İngilizce</option>
                      <option value="ar">Arapça</option>
                    </select>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              @if (modalStep() === 1) {
                <button class="btn btn-secondary" (click)="closeModal()">İptal</button>
                <button class="btn btn-primary" (click)="nextStep()" [disabled]="!sourceForm.type">İleri</button>
              }
              @if (modalStep() === 2) {
                <button class="btn btn-secondary" (click)="prevStep()">Geri</button>
                <button class="btn btn-secondary" (click)="testConnection()">Bağlantıyı Test Et</button>
                <button class="btn btn-primary" (click)="saveSource()">Kaydet</button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-sources-page {
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
      .subtitle { margin: 0.25rem 0 0; color: var(--text-secondary, #6b7280); font-size: 0.875rem; }
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

      &.btn-primary { background: var(--primary-color, #3b82f6); color: #fff; &:hover { background: #2563eb; } }
      &.btn-secondary { background: #fff; border: 1px solid var(--border-color, #e5e7eb); color: var(--text-primary, #1f2937); &:hover { background: var(--hover-bg, #f3f4f6); } }
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

      &.blue { background: #dbeafe; color: #2563eb; }
      &.green { background: #d1fae5; color: #059669; }
      &.orange { background: #fef3c7; color: #d97706; }
      &.red { background: #fee2e2; color: #dc2626; }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
    .stat-label { font-size: 0.8125rem; color: var(--text-secondary, #6b7280); }

    /* Filters */
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 300px;

      .icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary, #9ca3af); }
      input { width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.375rem; font-size: 0.875rem; }
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;

      select {
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") right 0.5rem center no-repeat;
        background-size: 16px;
      }
    }

    /* Sources Grid */
    .sources-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .source-category {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .category-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .sources-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .source-card {
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      transition: all 0.2s;

      &:hover { border-color: var(--primary-color, #3b82f6); }
      &.status-error { border-color: #ef4444; background: #fef2f2; }
    }

    .source-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .source-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;

      &.icon-twitter { background: #1da1f2; }
      &.icon-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
      &.icon-facebook { background: #4267b2; }
      &.icon-youtube { background: #ff0000; }
      &.icon-linkedin { background: #0077b5; }
      &.icon-google_reviews { background: #4285f4; }
      &.icon-app_store { background: #000; }
      &.icon-play_store { background: #3ddc84; }
      &.icon-sikayetvar { background: #ff6600; }
      &.internal { background: var(--primary-color, #3b82f6); }
    }

    .source-status {
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.625rem;
      font-weight: 500;

      &.status-active { background: #d1fae5; color: #059669; }
      &.status-inactive { background: #f3f4f6; color: #6b7280; }
      &.status-syncing { background: #dbeafe; color: #2563eb; }
      &.status-error { background: #fee2e2; color: #dc2626; }
    }

    .source-card h4 {
      margin: 0 0 0.25rem;
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .source-handle {
      margin: 0 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
    }

    .source-stats {
      display: flex;
      gap: 1rem;
      padding: 0.75rem 0;
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      margin-bottom: 0.75rem;

      .stat {
        display: flex;
        flex-direction: column;
        .stat-value { font-size: 1rem; font-weight: 600; }
        .stat-label { font-size: 0.6875rem; color: var(--text-secondary, #9ca3af); }
      }
    }

    .source-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;

      .sync-time { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary, #9ca3af); }
      .sync-freq { font-size: 0.6875rem; padding: 0.125rem 0.375rem; background: var(--border-color, #e5e7eb); border-radius: 0.25rem; }
    }

    .source-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      flex: 1;
      padding: 0.5rem;
      background: #fff;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: var(--hover-bg, #f3f4f6); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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
      max-width: 720px;
      max-height: 90vh;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h2 { margin: 0; font-size: 1.125rem; }
    }

    .close-btn {
      padding: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0.375rem;
      &:hover { background: var(--hover-bg, #f3f4f6); }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: calc(90vh - 130px);
    }

    .source-type-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .type-card {
      padding: 1.25rem;
      border: 2px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;

      &:hover { border-color: var(--primary-color, #3b82f6); }
      &.selected { border-color: var(--primary-color, #3b82f6); background: #eff6ff; }
    }

    .type-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 0.75rem;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      .selected & { background: #dbeafe; color: #2563eb; }
    }

    .type-card h4 {
      margin: 0 0 0.25rem;
      font-size: 0.9375rem;
    }

    .type-card p {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 500; }
      input, select { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.5rem; font-size: 0.875rem; &:focus { outline: none; border-color: var(--primary-color, #3b82f6); } }
    }

    .file-upload {
      input[type="file"] { display: none; }
      .file-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 2rem;
        border: 2px dashed var(--border-color, #e5e7eb);
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;

        &:hover { border-color: var(--primary-color, #3b82f6); background: #f9fafb; }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .icon { width: 18px; height: 18px; }

    @media (max-width: 1280px) {
      .sources-row { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 1024px) {
      .sources-row { grid-template-columns: repeat(2, 1fr); }
      .source-type-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .sources-row { grid-template-columns: 1fr; }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
    }
  `]
})
export class DataSourcesComponent implements OnInit {
  private dataSourceService = inject(DataSourceService);

  dataSources = signal<DataSource[]>([]);
  filteredSources = signal<DataSource[]>([]);
  
  showModal = signal(false);
  modalStep = signal(1);
  editingSource = signal<DataSource | null>(null);

  searchTerm = '';
  typeFilter = '';
  statusFilter = '';

  activeCount = signal(0);
  syncingCount = signal(0);
  errorCount = signal(0);

  sourceForm: any = {
    type: '',
    name: '',
    platform: '',
    syncFrequency: 'DAILY',
    language: 'tr',
    configuration: {},
    credentials: {}
  };

  sourceTypes = [
    { value: 'SOCIAL_MEDIA', label: 'Sosyal Medya', icon: 'share-2', description: 'Twitter, Instagram, Facebook' },
    { value: 'REVIEW_PLATFORM', label: 'Yorum Platformu', icon: 'star', description: 'Google, Şikayetvar' },
    { value: 'APP_STORE', label: 'Uygulama Mağazası', icon: 'smartphone', description: 'App Store, Play Store' },
    { value: 'CALL_CENTER', label: 'Çağrı Merkezi', icon: 'phone', description: 'Transkript entegrasyonu' },
    { value: 'API', label: 'API', icon: 'code', description: 'REST/GraphQL API' },
    { value: 'FILE', label: 'Dosya', icon: 'upload', description: 'CSV, Excel, JSON' }
  ];

  ngOnInit(): void {
    this.loadSources();
  }

  loadSources(): void {
    this.dataSourceService.getDataSources({ page: 1, pageSize: 100 }).subscribe((response: any) => {
      if (response.success) {
        this.dataSources.set(response.data);
        this.filterSources();
        this.calculateStats();
      }
    });
  }

  filterSources(): void {
    let result = [...this.dataSources()];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(term));
    }

    if (this.typeFilter) {
      result = result.filter(s => s.type === this.typeFilter);
    }

    if (this.statusFilter) {
      result = result.filter(s => s.status === this.statusFilter);
    }

    this.filteredSources.set(result);
  }

  calculateStats(): void {
    const sources = this.dataSources();
    this.activeCount.set(sources.filter(s => s.status === DataSourceStatus.CONNECTED).length);
    this.syncingCount.set(sources.filter(s => s.status === DataSourceStatus.SYNCING).length);
    this.errorCount.set(sources.filter(s => s.status === DataSourceStatus.ERROR).length);
  }

  getSocialMediaSources(): DataSource[] {
    return this.filteredSources().filter(s => s.type === DataSourceType.SOCIAL_MEDIA_API);
  }

  getReviewSources(): DataSource[] {
    return this.filteredSources().filter(s => 
      s.type === DataSourceType.WEB_SCRAPER || 
      s.type === DataSourceType.API_INTEGRATION
    );
  }

  getInternalSources(): DataSource[] {
    return this.filteredSources().filter(s => 
      s.type === DataSourceType.CALL_CENTER || 
      s.type === DataSourceType.DATABASE ||
      s.type === DataSourceType.WEBHOOK ||
      s.type === DataSourceType.FILE_IMPORT
    );
  }

  getSourceIcon(source: DataSource): string {
    const icons: Record<string, string> = {
      'TWITTER': 'twitter',
      'INSTAGRAM': 'instagram',
      'FACEBOOK': 'facebook',
      'YOUTUBE': 'youtube',
      'LINKEDIN': 'linkedin',
      'GOOGLE_REVIEWS': 'map-pin',
      'APP_STORE': 'smartphone',
      'PLAY_STORE': 'play',
      'SIKAYETVAR': 'message-circle',
      'CALL_CENTER': 'phone',
      'SURVEY': 'clipboard',
      'API': 'code',
      'FILE': 'file'
    };
    return icons[source.platform || source.type] || 'database';
  }

  getStatusLabel(status: DataSourceStatus): string {
    const labels: Record<DataSourceStatus, string> = {
      [DataSourceStatus.CONNECTED]: 'Bağlı',
      [DataSourceStatus.DISCONNECTED]: 'Bağlantı Kesildi',
      [DataSourceStatus.SYNCING]: 'Senkronize',
      [DataSourceStatus.ERROR]: 'Hata',
      [DataSourceStatus.PENDING]: 'Bekliyor'
    };
    return labels[status] || status;
  }

  getSyncFrequency(freq?: SyncFrequency): string {
    const labels: Record<SyncFrequency, string> = {
      [SyncFrequency.REAL_TIME]: 'Gerçek Zamanlı',
      [SyncFrequency.HOURLY]: 'Saatlik',
      [SyncFrequency.DAILY]: 'Günlük',
      [SyncFrequency.WEEKLY]: 'Haftalık',
      [SyncFrequency.MONTHLY]: 'Aylık',
      [SyncFrequency.MANUAL]: 'Manuel'
    };
    return labels[freq || SyncFrequency.DAILY] || 'Günlük';
  }

  addDataSource(): void {
    this.editingSource.set(null);
    this.sourceForm = {
      type: '',
      name: '',
      platform: '',
      syncFrequency: 'DAILY',
      language: 'tr',
      configuration: {},
      credentials: {}
    };
    this.modalStep.set(1);
    this.showModal.set(true);
  }

  editSource(source: DataSource): void {
    this.editingSource.set(source);
    this.sourceForm = { ...source };
    this.modalStep.set(2);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingSource.set(null);
  }

  selectSourceType(type: string): void {
    this.sourceForm.type = type;
  }

  nextStep(): void {
    this.modalStep.set(2);
  }

  prevStep(): void {
    this.modalStep.set(1);
  }

  testConnection(): void {
    this.dataSourceService.testConnection(this.sourceForm).subscribe(response => {
      if (response.success) {
        alert('Bağlantı başarılı!');
      } else {
        alert('Bağlantı hatası: ' + response.message);
      }
    });
  }

  saveSource(): void {
    if (this.editingSource()) {
      this.dataSourceService.updateDataSource(this.editingSource()!.id, this.sourceForm).subscribe(response => {
        if (response.success) {
          this.closeModal();
          this.loadSources();
        }
      });
    } else {
      this.dataSourceService.createDataSource(this.sourceForm).subscribe(response => {
        if (response.success) {
          this.closeModal();
          this.loadSources();
        }
      });
    }
  }

  syncSource(source: DataSource): void {
    this.dataSourceService.syncNow(source.id).subscribe(() => {
      this.loadSources();
    });
  }

  toggleSource(source: DataSource): void {
    const newStatus = source.status === DataSourceStatus.CONNECTED ? DataSourceStatus.DISCONNECTED : DataSourceStatus.CONNECTED;
    this.dataSourceService.updateDataSource(source.id, { status: newStatus }).subscribe(() => {
      this.loadSources();
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.sourceForm.configuration.file = input.files[0];
    }
  }
}
