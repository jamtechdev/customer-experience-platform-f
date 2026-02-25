import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisService } from '../../core/services';
import { RootCauseAnalysis, RootCauseCategory, FeedbackCategory, RCAStatus } from '../../core/models';

// Local type for severity
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

@Component({
  selector: 'app-root-cause',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="root-cause-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Kök Neden Analizi</h1>
          <p class="subtitle">Yapay zeka destekli sorun kaynaklarının otomatik tespiti</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportReport()">
            <i class="icon icon-download"></i>
            Rapor İndir
          </button>
          <button class="btn btn-primary" (click)="runAnalysis()">
            <i class="icon icon-cpu"></i>
            Analiz Başlat
          </button>
        </div>
      </div>

      <!-- Analysis Status -->
      @if (isAnalyzing()) {
        <div class="analysis-status">
          <div class="status-animation">
            <div class="pulse-ring"></div>
            <i class="icon icon-cpu"></i>
          </div>
          <div class="status-text">
            <h3>Analiz yapılıyor...</h3>
            <p>AI modeli geri bildirimleri inceliyor ve kök nedenleri tespit ediyor</p>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="analysisProgress()"></div>
          </div>
        </div>
      }

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon red">
            <i class="icon icon-alert-octagon"></i>
          </div>
          <div class="card-content">
            <span class="card-value">{{criticalIssues()}}</span>
            <span class="card-label">Kritik Sorun</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon orange">
            <i class="icon icon-alert-triangle"></i>
          </div>
          <div class="card-content">
            <span class="card-value">{{highIssues()}}</span>
            <span class="card-label">Yüksek Öncelik</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon blue">
            <i class="icon icon-layers"></i>
          </div>
          <div class="card-content">
            <span class="card-value">{{rootCauses().length}}</span>
            <span class="card-label">Tespit Edilen Kök Neden</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon green">
            <i class="icon icon-check-circle"></i>
          </div>
          <div class="card-content">
            <span class="card-value">{{resolvedCount()}}</span>
            <span class="card-label">Çözümlenen</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <select [(ngModel)]="filters.category" (ngModelChange)="applyFilters()">
            <option value="">Tüm Kategoriler</option>
            <option value="PROCESS">Süreç</option>
            <option value="SYSTEM">Sistem</option>
            <option value="HUMAN">İnsan</option>
            <option value="EXTERNAL">Dış Etken</option>
            <option value="POLICY">Politika</option>
          </select>
          <select [(ngModel)]="filters.severity" (ngModelChange)="applyFilters()">
            <option value="">Tüm Öncelikler</option>
            <option value="CRITICAL">Kritik</option>
            <option value="HIGH">Yüksek</option>
            <option value="MEDIUM">Orta</option>
            <option value="LOW">Düşük</option>
          </select>
          <select [(ngModel)]="filters.status" (ngModelChange)="applyFilters()">
            <option value="">Tüm Durumlar</option>
            <option value="new">Yeni</option>
            <option value="investigating">İnceleniyor</option>
            <option value="resolved">Çözüldü</option>
          </select>
        </div>
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            [class.active]="viewMode() === 'tree'"
            (click)="viewMode.set('tree')"
          >
            <i class="icon icon-git-branch"></i>
          </button>
          <button 
            class="toggle-btn" 
            [class.active]="viewMode() === 'list'"
            (click)="viewMode.set('list')"
          >
            <i class="icon icon-list"></i>
          </button>
        </div>
      </div>

      <!-- Tree View -->
      @if (viewMode() === 'tree') {
        <div class="tree-view">
          @for (category of groupedCauses(); track category.name) {
            <div class="tree-category">
              <div class="category-header" (click)="toggleCategory(category.name)">
                <i class="icon icon-chevron-down" [class.collapsed]="!expandedCategories().includes(category.name)"></i>
                <span class="category-icon" [class]="'cat-' + category.name.toLowerCase()">
                  <i class="icon icon-{{getCategoryIcon(category.name)}}"></i>
                </span>
                <span class="category-name">{{getCategoryLabel(category.name)}}</span>
                <span class="category-count">{{category.items.length}}</span>
              </div>
              @if (expandedCategories().includes(category.name)) {
                <div class="tree-items">
                  @for (cause of category.items; track cause.id) {
                    <div class="tree-item" [class.selected]="selectedCause()?.id === cause.id" (click)="selectCause(cause)">
                      <div class="item-connector"></div>
                      <div class="item-content">
                        <div class="item-header">
                          <span class="severity-badge" [class]="'severity-' + cause.severity.toLowerCase()">
                            {{cause.severity}}
                          </span>
                          <span class="item-title">{{cause.title}}</span>
                        </div>
                        <p class="item-description">{{cause.description}}</p>
                        <div class="item-meta">
                          <span class="impact">
                            <i class="icon icon-users"></i>
                            {{cause.impactedFeedbackCount}} etkilenen
                          </span>
                          <span class="confidence">
                            <i class="icon icon-target"></i>
                            %{{cause.confidence}} güven
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- List View -->
      @if (viewMode() === 'list') {
        <div class="list-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Öncelik</th>
                <th>Kök Neden</th>
                <th>Kategori</th>
                <th>Etkilenen</th>
                <th>Güven</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              @for (cause of filteredCauses(); track cause.id) {
                <tr [class.selected]="selectedCause()?.id === cause.id" (click)="selectCause(cause)">
                  <td>
                    <span class="severity-badge" [class]="'severity-' + cause.severity.toLowerCase()">
                      {{cause.severity}}
                    </span>
                  </td>
                  <td>
                    <div class="cause-info">
                      <span class="cause-title">{{cause.title}}</span>
                      <span class="cause-desc">{{cause.description}}</span>
                    </div>
                  </td>
                  <td>
                    <span class="category-tag" [class]="'cat-' + cause.category.toLowerCase()">
                      {{getCategoryLabel(cause.category)}}
                    </span>
                  </td>
                  <td>{{cause.impactedFeedbackCount}}</td>
                  <td>
                    <div class="confidence-bar">
                      <div class="bar-fill" [style.width.%]="cause.confidence"></div>
                      <span>%{{cause.confidence}}</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-badge" [class]="'status-' + (cause.resolutionStatus || 'new')">
                      {{getStatusLabel(cause.resolutionStatus)}}
                    </span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="btn-icon" title="Detay" (click)="viewDetails(cause, $event)">
                        <i class="icon icon-eye"></i>
                      </button>
                      <button class="btn-icon" title="Görev Oluştur" (click)="createTask(cause, $event)">
                        <i class="icon icon-plus-circle"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Detail Panel -->
      @if (selectedCause()) {
        <div class="detail-panel">
          <div class="panel-header">
            <h3>Kök Neden Detayı</h3>
            <button class="close-btn" (click)="selectedCause.set(null)">
              <i class="icon icon-x"></i>
            </button>
          </div>
          <div class="panel-body">
            <!-- Severity & Title -->
            <div class="detail-top">
              <span class="severity-badge large" [class]="'severity-' + selectedCause()!.severity.toLowerCase()">
                {{selectedCause()!.severity}}
              </span>
              <h4>{{selectedCause()!.title}}</h4>
            </div>

            <p class="detail-description">{{selectedCause()!.description}}</p>

            <!-- Stats -->
            <div class="detail-stats">
              <div class="stat-item">
                <span class="stat-value">{{selectedCause()!.impactedFeedbackCount}}</span>
                <span class="stat-label">Etkilenen Geri Bildirim</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">%{{selectedCause()!.confidence}}</span>
                <span class="stat-label">AI Güven Skoru</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{selectedCause()!.occurrenceCount}}</span>
                <span class="stat-label">Tekrarlama Sayısı</span>
              </div>
            </div>

            <!-- Affected Areas -->
            <div class="detail-section">
              <h5>Etkilenen Alanlar</h5>
              <div class="affected-tags">
                @for (area of selectedCause()!.affectedAreas; track area) {
                  <span class="affected-tag">{{area}}</span>
                }
              </div>
            </div>

            <!-- Related Keywords -->
            <div class="detail-section">
              <h5>İlişkili Anahtar Kelimeler</h5>
              <div class="keyword-cloud">
                @for (kw of selectedCause()!.keywords; track kw) {
                  <span class="keyword-tag">{{kw}}</span>
                }
              </div>
            </div>

            <!-- Evidence / Sample Feedbacks -->
            <div class="detail-section">
              <h5>Örnek Geri Bildirimler</h5>
              <div class="evidence-list">
                @for (feedback of selectedCause()!.sampleFeedbacks?.slice(0, 3) || []; track feedback) {
                  <div class="evidence-item">
                    <i class="icon icon-message-square"></i>
                    <p>"{{feedback}}"</p>
                  </div>
                }
              </div>
            </div>

            <!-- Suggested Solutions -->
            <div class="detail-section">
              <h5>AI Önerilen Çözümler</h5>
              <div class="solution-list">
                @for (solution of selectedCause()!.suggestedSolutions || []; track solution; let i = $index) {
                  <div class="solution-item">
                    <span class="solution-number">{{i + 1}}</span>
                    <p>{{solution}}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Actions -->
            <div class="panel-actions">
              <button class="btn btn-secondary" (click)="viewRelatedFeedbacks(selectedCause()!)">
                <i class="icon icon-list"></i>
                İlgili Geri Bildirimleri Gör
              </button>
              <button class="btn btn-primary" (click)="createTaskForCause(selectedCause()!)">
                <i class="icon icon-plus-circle"></i>
                Görev Oluştur
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Fishbone Diagram (Ishikawa) -->
      <div class="fishbone-section">
        <div class="section-header">
          <h3>Ishikawa (Balık Kılçığı) Diyagramı</h3>
          <button class="btn btn-secondary" (click)="exportDiagram()">
            <i class="icon icon-image"></i>
            Dışa Aktar
          </button>
        </div>
        <div class="fishbone-diagram">
          <div class="fishbone-spine"></div>
          <div class="fishbone-head">
            <span>Müşteri Şikayetleri</span>
          </div>
          <div class="fishbone-branches">
            @for (branch of fishboneBranches(); track branch.category) {
              <div class="branch" [class]="branch.position">
                <div class="branch-line"></div>
                <div class="branch-label">{{branch.category}}</div>
                <div class="branch-causes">
                  @for (cause of branch.causes; track cause) {
                    <div class="branch-cause">
                      <span>{{cause}}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .root-cause-page {
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
        &:hover { background: #2563eb; }
      }

      &.btn-secondary {
        background: #fff;
        border: 1px solid var(--border-color, #e5e7eb);
        color: var(--text-primary, #1f2937);
        &:hover { background: var(--hover-bg, #f3f4f6); }
      }
    }

    /* Analysis Status */
    .analysis-status {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: #fff;
      padding: 2rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .status-animation {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;

      .icon {
        width: 32px;
        height: 32px;
        z-index: 1;
      }
    }

    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      animation: pulse 1.5s ease-out infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .status-text {
      h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
      p { margin: 0; opacity: 0.9; font-size: 0.875rem; }
    }

    .progress-bar {
      width: 100%;
      max-width: 400px;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      margin-top: 1.5rem;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: #fff;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      background: #fff;
      padding: 1.25rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &.red { background: #fee2e2; color: #dc2626; }
      &.orange { background: #fef3c7; color: #d97706; }
      &.blue { background: #dbeafe; color: #2563eb; }
      &.green { background: #d1fae5; color: #059669; }
    }

    .card-content {
      display: flex;
      flex-direction: column;
    }

    .card-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
    .card-label { font-size: 0.8125rem; color: var(--text-secondary, #6b7280); }

    /* Filters */
    .filters-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      padding: 1rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
        cursor: pointer;
      }
    }

    .view-toggle {
      display: flex;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.375rem;
      overflow: hidden;
    }

    .toggle-btn {
      padding: 0.5rem 0.75rem;
      background: #fff;
      border: none;
      cursor: pointer;

      &:not(:last-child) { border-right: 1px solid var(--border-color, #e5e7eb); }
      &.active { background: var(--primary-color, #3b82f6); color: #fff; }
    }

    /* Tree View */
    .tree-view {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tree-category {
      margin-bottom: 0.5rem;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;

      &:hover { background: var(--hover-bg, #f3f4f6); }

      .icon-chevron-down {
        transition: transform 0.2s;
        &.collapsed { transform: rotate(-90deg); }
      }
    }

    .category-icon {
      width: 32px;
      height: 32px;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;

      &.cat-process { background: #dbeafe; color: #2563eb; }
      &.cat-system { background: #fef3c7; color: #d97706; }
      &.cat-human { background: #d1fae5; color: #059669; }
      &.cat-external { background: #e0e7ff; color: #4f46e5; }
      &.cat-policy { background: #fce7f3; color: #db2777; }
    }

    .category-name { flex: 1; font-weight: 500; }
    .category-count {
      background: var(--border-color, #e5e7eb);
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .tree-items {
      padding-left: 2.5rem;
    }

    .tree-item {
      display: flex;
      padding: 1rem;
      margin: 0.5rem 0;
      border-left: 2px solid var(--border-color, #e5e7eb);
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: var(--hover-bg, #f9fafb); }
      &.selected { border-left-color: var(--primary-color, #3b82f6); background: #eff6ff; }
    }

    .item-connector {
      width: 20px;
      height: 2px;
      background: var(--border-color, #e5e7eb);
      margin-right: 0.75rem;
      margin-top: 0.75rem;
    }

    .item-content { flex: 1; }

    .item-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .severity-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;

      &.severity-critical { background: #fee2e2; color: #b91c1c; }
      &.severity-high { background: #fef3c7; color: #b45309; }
      &.severity-medium { background: #fef9c3; color: #a16207; }
      &.severity-low { background: #d1fae5; color: #047857; }

      &.large { padding: 0.25rem 0.75rem; font-size: 0.75rem; }
    }

    .item-title { font-weight: 500; font-size: 0.9375rem; }

    .item-description {
      margin: 0 0 0.5rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
    }

    .item-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);

      span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }

    /* List View */
    .list-view {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 0.875rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }

      th {
        background: var(--bg-secondary, #f9fafb);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-secondary, #6b7280);
      }

      tr {
        cursor: pointer;
        transition: background 0.2s;

        &:hover { background: var(--hover-bg, #f9fafb); }
        &.selected { background: #eff6ff; }
      }
    }

    .cause-info {
      display: flex;
      flex-direction: column;

      .cause-title { font-weight: 500; }
      .cause-desc { font-size: 0.8125rem; color: var(--text-secondary, #6b7280); }
    }

    .category-tag {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;

      &.cat-process { background: #dbeafe; color: #2563eb; }
      &.cat-system { background: #fef3c7; color: #d97706; }
      &.cat-human { background: #d1fae5; color: #059669; }
      &.cat-external { background: #e0e7ff; color: #4f46e5; }
      &.cat-policy { background: #fce7f3; color: #db2777; }
    }

    .confidence-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .bar-fill {
        width: 60px;
        height: 6px;
        background: var(--border-color, #e5e7eb);
        border-radius: 3px;
        position: relative;
        overflow: hidden;

        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: var(--width, 0);
          background: var(--primary-color, #3b82f6);
          border-radius: 3px;
        }
      }

      span { font-size: 0.75rem; color: var(--text-secondary, #6b7280); }
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 500;

      &.status-new { background: #dbeafe; color: #2563eb; }
      &.status-investigating { background: #fef3c7; color: #d97706; }
      &.status-resolved { background: #d1fae5; color: #059669; }
    }

    .row-actions {
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

      &:hover { background: var(--hover-bg, #f3f4f6); color: var(--text-primary, #1f2937); }
    }

    /* Detail Panel */
    .detail-panel {
      position: fixed;
      right: 0;
      top: 64px;
      width: 420px;
      height: calc(100vh - 64px);
      background: #fff;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      z-index: 100;
      overflow-y: auto;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h3 { margin: 0; font-size: 1.125rem; }
    }

    .close-btn {
      padding: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0.375rem;

      &:hover { background: var(--hover-bg, #f3f4f6); }
    }

    .panel-body { padding: 1.5rem; }

    .detail-top {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1rem;

      h4 { margin: 0; font-size: 1.125rem; }
    }

    .detail-description {
      margin: 0 0 1.5rem;
      color: var(--text-secondary, #6b7280);
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .detail-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      text-align: center;

      .stat-value { display: block; font-size: 1.25rem; font-weight: 700; }
      .stat-label { font-size: 0.6875rem; color: var(--text-secondary, #6b7280); }
    }

    .detail-section {
      margin-bottom: 1.5rem;

      h5 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
      }
    }

    .affected-tags, .keyword-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .affected-tag, .keyword-tag {
      padding: 0.25rem 0.5rem;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .evidence-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .evidence-item {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.375rem;
      border-left: 3px solid var(--border-color, #e5e7eb);

      .icon { color: var(--text-secondary, #9ca3af); flex-shrink: 0; }
      p { margin: 0; font-size: 0.8125rem; font-style: italic; }
    }

    .solution-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .solution-item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;

      .solution-number {
        width: 24px;
        height: 24px;
        background: var(--primary-color, #3b82f6);
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 500;
        flex-shrink: 0;
      }

      p { margin: 0; font-size: 0.875rem; }
    }

    .panel-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    /* Fishbone Diagram */
    .fishbone-section {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h3 { margin: 0; font-size: 1.125rem; }
    }

    .fishbone-diagram {
      position: relative;
      height: 300px;
      overflow: hidden;
    }

    .fishbone-spine {
      position: absolute;
      left: 10%;
      right: 10%;
      top: 50%;
      height: 4px;
      background: var(--text-primary, #1f2937);
      transform: translateY(-50%);
    }

    .fishbone-head {
      position: absolute;
      right: 5%;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 30px solid transparent;
      border-bottom: 30px solid transparent;
      border-left: 40px solid var(--text-primary, #1f2937);

      span {
        position: absolute;
        right: -140px;
        top: 50%;
        transform: translateY(-50%);
        white-space: nowrap;
        font-weight: 600;
      }
    }

    .fishbone-branches {
      position: absolute;
      left: 15%;
      right: 20%;
      top: 0;
      bottom: 0;
    }

    .branch {
      position: absolute;
      width: 25%;

      &.top-left { left: 0; top: 10%; }
      &.top-center { left: 37%; top: 10%; }
      &.top-right { right: 0; top: 10%; }
      &.bottom-left { left: 0; bottom: 10%; }
      &.bottom-center { left: 37%; bottom: 10%; }
      &.bottom-right { right: 0; bottom: 10%; }
    }

    .branch-line {
      position: absolute;
      width: 2px;
      height: 80px;
      background: var(--text-secondary, #6b7280);
    }

    .branch-label {
      font-weight: 600;
      font-size: 0.8125rem;
      padding: 0.25rem 0.5rem;
      background: var(--primary-light, #eff6ff);
      border-radius: 0.25rem;
      display: inline-block;
    }

    .branch-causes {
      margin-top: 0.5rem;
    }

    .branch-cause {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      padding: 0.25rem 0;
      border-left: 2px solid var(--border-color, #e5e7eb);
      padding-left: 0.5rem;
      margin: 0.25rem 0;
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    @media (max-width: 1280px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }

      .filters-section {
        flex-direction: column;
        gap: 1rem;
      }

      .filter-group {
        flex-wrap: wrap;
        width: 100%;

        select { flex: 1; min-width: calc(50% - 0.375rem); }
      }

      .detail-panel {
        width: 100%;
        left: 0;
      }
    }
  `]
})
export class RootCauseComponent implements OnInit {
  private analysisService = inject(AnalysisService);

  rootCauses = signal<RootCauseAnalysis[]>([]);
  filteredCauses = signal<RootCauseAnalysis[]>([]);
  selectedCause = signal<RootCauseAnalysis | null>(null);
  
  isAnalyzing = signal(false);
  analysisProgress = signal(0);
  viewMode = signal<'tree' | 'list'>('tree');
  expandedCategories = signal<string[]>(['PROCESS', 'SYSTEM']);

  filters = {
    category: '',
    severity: '',
    status: ''
  };

  criticalIssues = signal(3);
  highIssues = signal(8);
  resolvedCount = signal(12);

  groupedCauses = signal<{ name: string; items: RootCauseAnalysis[] }[]>([]);
  fishboneBranches = signal<any[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.analysisService.getRootCauseAnalyses({ page: 1, pageSize: 100 }).subscribe((response: any) => {
      if (response.success) {
        this.rootCauses.set(response.data);
        this.applyFilters();
        this.groupByCategory();
        this.buildFishbone();
      }
    });
  }

  applyFilters(): void {
    let result = [...this.rootCauses()];

    if (this.filters.category) {
      result = result.filter(c => c.category === this.filters.category);
    }
    if (this.filters.severity) {
      // Filter by root causes with matching severity
      result = result.filter(c => 
        (c.rootCauses && c.rootCauses.some((rc: any) => rc.category === this.filters.severity))
      );
    }
    if (this.filters.status) {
      result = result.filter(c => c.status === this.filters.status);
    }

    this.filteredCauses.set(result);
    this.groupByCategory();
  }

  groupByCategory(): void {
    const groups: Record<string, RootCauseAnalysis[]> = {};
    
    this.filteredCauses().forEach(cause => {
      if (!groups[cause.category]) {
        groups[cause.category] = [];
      }
      groups[cause.category].push(cause);
    });

    this.groupedCauses.set(
      Object.entries(groups).map(([name, items]) => ({ name, items }))
    );
  }

  buildFishbone(): void {
    this.fishboneBranches.set([
      { 
        category: 'Süreç', 
        position: 'top-left',
        causes: ['Uzun bekleme', 'Karmaşık adımlar', 'Eksik bilgilendirme']
      },
      { 
        category: 'Sistem', 
        position: 'top-center',
        causes: ['Yavaş performans', 'Hata mesajları', 'Entegrasyon sorunları']
      },
      { 
        category: 'İnsan', 
        position: 'top-right',
        causes: ['Yetersiz eğitim', 'İletişim eksikliği']
      },
      { 
        category: 'Politika', 
        position: 'bottom-left',
        causes: ['Katı kurallar', 'Esneklik eksikliği']
      },
      { 
        category: 'Dış Etken', 
        position: 'bottom-center',
        causes: ['Regülasyon', 'Piyasa koşulları']
      }
    ]);
  }

  toggleCategory(name: string): void {
    const current = this.expandedCategories();
    if (current.includes(name)) {
      this.expandedCategories.set(current.filter(c => c !== name));
    } else {
      this.expandedCategories.set([...current, name]);
    }
  }

  selectCause(cause: RootCauseAnalysis): void {
    this.selectedCause.set(cause);
  }

  runAnalysis(): void {
    this.isAnalyzing.set(true);
    this.analysisProgress.set(0);

    const interval = setInterval(() => {
      const progress = this.analysisProgress();
      if (progress >= 100) {
        clearInterval(interval);
        this.isAnalyzing.set(false);
        this.loadData();
      } else {
        this.analysisProgress.set(progress + 10);
      }
    }, 500);
  }

  exportReport(): void {
    // Export report functionality
    const reportData = {
      rootCauses: this.rootCauses(),
      criticalIssues: this.criticalIssues(),
      highIssues: this.highIssues(),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'root-cause-analysis-report.json';
    a.click();
  }

  exportDiagram(): void {
    // Export fishbone diagram as image
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'PROCESS': 'git-branch',
      'SYSTEM': 'server',
      'HUMAN': 'users',
      'EXTERNAL': 'globe',
      'POLICY': 'file-text'
    };
    return icons[category] || 'circle';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'PROCESS': 'Süreç',
      'SYSTEM': 'Sistem',
      'HUMAN': 'İnsan',
      'EXTERNAL': 'Dış Etken',
      'POLICY': 'Politika'
    };
    return labels[category] || category;
  }

  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      'new': 'Yeni',
      'investigating': 'İnceleniyor',
      'resolved': 'Çözüldü'
    };
    return labels[status || 'new'] || 'Yeni';
  }

  viewDetails(cause: RootCauseAnalysis, event: Event): void {
    event.stopPropagation();
    this.selectCause(cause);
  }

  createTask(cause: RootCauseAnalysis, event: Event): void {
    event.stopPropagation();
    // Open task creation modal
  }

  viewRelatedFeedbacks(cause: RootCauseAnalysis): void {
    // Navigate to feedback list with filter
  }

  createTaskForCause(cause: RootCauseAnalysis): void {
    // Open task creation modal
  }
}
