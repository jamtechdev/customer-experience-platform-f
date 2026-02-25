import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Touchpoint {
  id: string;
  name: string;
  channel: string;
  category: 'digital' | 'physical' | 'human';
  stage: string;
  status: 'active' | 'inactive' | 'planned';
  satisfactionScore: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
  issues: number;
  lastUpdated: string;
}

@Component({
  selector: 'app-touchpoints',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="touchpoints-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Temas Noktaları</h1>
          <p>Müşteri temas noktalarının yönetimi ve performans analizi</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="showAnalytics = !showAnalytics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
            {{ showAnalytics ? 'Liste Görünümü' : 'Analitik' }}
          </button>
          <button class="btn btn-primary" (click)="showAddModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Temas Noktası
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalTouchpoints() }}</span>
            <span class="stat-label">Toplam Temas Noktası</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activeTouchpoints() }}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ plannedTouchpoints() }}</span>
            <span class="stat-label">Planlanan</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ avgSatisfaction().toFixed(1) }}</span>
            <span class="stat-label">Ort. Memnuniyet</span>
          </div>
        </div>
      </div>

      @if (showAnalytics) {
        <!-- Analytics View -->
        <div class="analytics-grid">
          <!-- By Category -->
          <div class="analytics-card">
            <h3>Kategori Dağılımı</h3>
            <div class="category-chart">
              @for (cat of categoryStats(); track cat.category) {
                <div class="category-row">
                  <div class="category-info">
                    <span class="category-icon" [class]="cat.category">
                      @switch (cat.category) {
                        @case ('digital') { 💻 }
                        @case ('physical') { 🏢 }
                        @case ('human') { 👤 }
                      }
                    </span>
                    <span class="category-name">{{ getCategoryName(cat.category) }}</span>
                  </div>
                  <div class="category-bar">
                    <div 
                      class="bar-fill"
                      [style.width.%]="(cat.count / totalTouchpoints()) * 100"
                      [class]="cat.category"
                    ></div>
                  </div>
                  <span class="category-count">{{ cat.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- By Stage -->
          <div class="analytics-card">
            <h3>Journey Aşaması</h3>
            <div class="stage-chart">
              @for (stage of stageStats(); track stage.name) {
                <div class="stage-item">
                  <div class="stage-header">
                    <span class="stage-name">{{ stage.name }}</span>
                    <span class="stage-score" [class]="getScoreClass(stage.avgScore)">
                      {{ stage.avgScore.toFixed(1) }}
                    </span>
                  </div>
                  <div class="stage-bar">
                    <div class="bar-fill" [style.width.%]="stage.avgScore * 20"></div>
                  </div>
                  <span class="stage-count">{{ stage.count }} temas noktası</span>
                </div>
              }
            </div>
          </div>

          <!-- Performance Overview -->
          <div class="analytics-card wide">
            <h3>Performans Haritası</h3>
            <div class="performance-map">
              @for (tp of touchpoints(); track tp.id) {
                <div 
                  class="perf-bubble"
                  [style.left.%]="(tp.volume / maxVolume()) * 90 + 5"
                  [style.bottom.%]="tp.satisfactionScore * 18 + 5"
                  [style.width.px]="Math.max(20, tp.issues * 3)"
                  [style.height.px]="Math.max(20, tp.issues * 3)"
                  [class]="tp.category"
                  [title]="tp.name + ': ' + tp.satisfactionScore.toFixed(1) + ' puan'"
                >
                  {{ tp.name.charAt(0) }}
                </div>
              }
              <div class="axis-x">
                <span>Düşük Hacim</span>
                <span>Yüksek Hacim</span>
              </div>
              <div class="axis-y">
                <span>Düşük Memnuniyet</span>
                <span>Yüksek Memnuniyet</span>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- List View -->
        <div class="filters-bar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Temas noktası ara..."
              [(ngModel)]="searchQuery"
            >
          </div>
          <div class="filter-group">
            <select [(ngModel)]="categoryFilter">
              <option value="all">Tüm Kategoriler</option>
              <option value="digital">Dijital</option>
              <option value="physical">Fiziksel</option>
              <option value="human">İnsan</option>
            </select>
            <select [(ngModel)]="stageFilter">
              <option value="all">Tüm Aşamalar</option>
              <option value="Farkındalık">Farkındalık</option>
              <option value="Araştırma">Araştırma</option>
              <option value="Satın Alma">Satın Alma</option>
              <option value="Kullanım">Kullanım</option>
              <option value="Sadakat">Sadakat</option>
            </select>
            <select [(ngModel)]="statusFilter">
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="planned">Planlanan</option>
            </select>
          </div>
        </div>

        <div class="touchpoints-grid">
          @for (tp of filteredTouchpoints(); track tp.id) {
            <div class="touchpoint-card" [class]="tp.status">
              <div class="card-header">
                <div class="tp-icon" [class]="tp.category">
                  @switch (tp.category) {
                    @case ('digital') { 💻 }
                    @case ('physical') { 🏢 }
                    @case ('human') { 👤 }
                  }
                </div>
                <div class="tp-info">
                  <h3>{{ tp.name }}</h3>
                  <span class="tp-channel">{{ tp.channel }}</span>
                </div>
                <div class="tp-status" [class]="tp.status">
                  {{ getStatusText(tp.status) }}
                </div>
              </div>

              <div class="card-body">
                <div class="tp-metrics">
                  <div class="metric">
                    <span class="metric-label">Memnuniyet</span>
                    <div class="metric-value-row">
                      <span class="metric-value" [class]="getScoreClass(tp.satisfactionScore)">
                        {{ tp.satisfactionScore.toFixed(1) }}
                      </span>
                      <span class="metric-trend" [class]="tp.trend">
                        @if (tp.trend === 'up') { ↑ }
                        @else if (tp.trend === 'down') { ↓ }
                        @else { → }
                      </span>
                    </div>
                    <div class="score-bar">
                      <div class="score-fill" [style.width.%]="tp.satisfactionScore * 20"></div>
                    </div>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Hacim</span>
                    <span class="metric-value">{{ tp.volume | number }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Sorunlar</span>
                    <span class="metric-value" [class.warning]="tp.issues > 5">{{ tp.issues }}</span>
                  </div>
                </div>

                <div class="tp-stage">
                  <span class="stage-label">{{ tp.stage }}</span>
                </div>
              </div>

              <div class="card-footer">
                <span class="updated">{{ tp.lastUpdated }}</span>
                <div class="actions">
                  <button class="action-btn" title="Düzenle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn" title="Analiz">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 3v18h18"/>
                      <path d="M18 17V9"/>
                      <path d="M13 17V5"/>
                      <path d="M8 17v-3"/>
                    </svg>
                  </button>
                  <button class="action-btn" title="Sil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Add Modal -->
      @if (showAddModal) {
        <div class="modal-overlay" (click)="showAddModal = false">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Yeni Temas Noktası</h2>
              <button class="close-btn" (click)="showAddModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Temas Noktası Adı</label>
                <input type="text" [(ngModel)]="newTouchpoint.name" placeholder="Örn: Mobil Uygulama">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Kanal</label>
                  <input type="text" [(ngModel)]="newTouchpoint.channel" placeholder="Örn: Mobil">
                </div>
                <div class="form-group">
                  <label>Kategori</label>
                  <select [(ngModel)]="newTouchpoint.category">
                    <option value="digital">Dijital</option>
                    <option value="physical">Fiziksel</option>
                    <option value="human">İnsan</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Journey Aşaması</label>
                  <select [(ngModel)]="newTouchpoint.stage">
                    <option value="Farkındalık">Farkındalık</option>
                    <option value="Araştırma">Araştırma</option>
                    <option value="Satın Alma">Satın Alma</option>
                    <option value="Kullanım">Kullanım</option>
                    <option value="Sadakat">Sadakat</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Durum</label>
                  <select [(ngModel)]="newTouchpoint.status">
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="planned">Planlanan</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea rows="3" placeholder="Temas noktası hakkında açıklama..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showAddModal = false">İptal</button>
              <button class="btn btn-primary" (click)="addTouchpoint()">Oluştur</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .touchpoints-page {
      padding: 24px;
      max-width: 1400px;
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
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
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

    .stat-icon.blue { background: #dbeafe; color: #2563eb; }
    .stat-icon.green { background: #dcfce7; color: #22c55e; }
    .stat-icon.yellow { background: #fef3c7; color: #f59e0b; }
    .stat-icon.purple { background: #f3e8ff; color: #9333ea; }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      flex: 1;
      min-width: 250px;
    }

    .search-box svg {
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
    }

    .search-box input {
      border: none;
      font-size: 0.875rem;
      width: 100%;
    }

    .filter-group {
      display: flex;
      gap: 12px;
    }

    .filter-group select {
      padding: 10px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    /* Touchpoints Grid */
    .touchpoints-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .touchpoint-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-left: 4px solid var(--primary-color);
    }

    .touchpoint-card.inactive {
      border-color: var(--border-color);
      opacity: 0.7;
    }

    .touchpoint-card.planned {
      border-color: var(--warning-color);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .tp-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .tp-icon.digital { background: #dbeafe; }
    .tp-icon.physical { background: #dcfce7; }
    .tp-icon.human { background: #fef3c7; }

    .tp-info {
      flex: 1;
    }

    .tp-info h3 {
      font-size: 0.9375rem;
      margin-bottom: 2px;
    }

    .tp-channel {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .tp-status {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .tp-status.active { background: #dcfce7; color: #22c55e; }
    .tp-status.inactive { background: #f3f4f6; color: #6b7280; }
    .tp-status.planned { background: #fef3c7; color: #f59e0b; }

    .card-body {
      padding: 16px;
    }

    .tp-metrics {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .metric-value-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .metric-value {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .metric-value.good { color: #22c55e; }
    .metric-value.average { color: #f59e0b; }
    .metric-value.poor { color: #ef4444; }
    .metric-value.warning { color: #ef4444; }

    .metric-trend {
      font-size: 0.875rem;
    }

    .metric-trend.up { color: #22c55e; }
    .metric-trend.down { color: #ef4444; }
    .metric-trend.stable { color: #6b7280; }

    .score-bar {
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
    }

    .score-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 2px;
    }

    .tp-stage {
      display: flex;
    }

    .stage-label {
      padding: 4px 12px;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-secondary);
    }

    .updated {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      background: var(--border-color);
    }

    /* Analytics View */
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .analytics-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .analytics-card.wide {
      grid-column: 1 / -1;
    }

    .analytics-card h3 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .category-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .category-info {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100px;
    }

    .category-icon {
      font-size: 1.25rem;
    }

    .category-name {
      font-size: 0.8125rem;
    }

    .category-bar {
      flex: 1;
      height: 24px;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 6px;
    }

    .bar-fill.digital { background: #3b82f6; }
    .bar-fill.physical { background: #22c55e; }
    .bar-fill.human { background: #f59e0b; }

    .category-count {
      width: 40px;
      text-align: right;
      font-weight: 600;
    }

    /* Stage Chart */
    .stage-item {
      margin-bottom: 16px;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .stage-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stage-score {
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .stage-score.good { color: #22c55e; }
    .stage-score.average { color: #f59e0b; }
    .stage-score.poor { color: #ef4444; }

    .stage-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      margin-bottom: 4px;
    }

    .stage-bar .bar-fill {
      background: var(--primary-color);
    }

    .stage-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Performance Map */
    .performance-map {
      position: relative;
      height: 400px;
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }

    .perf-bubble {
      position: absolute;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .perf-bubble:hover {
      transform: scale(1.2);
      z-index: 10;
    }

    .perf-bubble.digital { background: rgba(59, 130, 246, 0.8); }
    .perf-bubble.physical { background: rgba(34, 197, 94, 0.8); }
    .perf-bubble.human { background: rgba(245, 158, 11, 0.8); }

    .axis-x {
      position: absolute;
      bottom: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .axis-y {
      position: absolute;
      left: 10px;
      top: 10px;
      bottom: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      writing-mode: vertical-rl;
      text-orientation: mixed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 500px;
      max-width: 90vw;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      font-size: 1.125rem;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--bg-secondary);
      font-size: 1.25rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
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

    @media (max-width: 1200px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .touchpoints-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .stats-row,
      .touchpoints-grid {
        grid-template-columns: 1fr;
      }

      .filters-bar {
        flex-direction: column;
      }

      .filter-group {
        flex-wrap: wrap;
      }
    }
  `]
})
export class TouchpointsComponent {
  Math = Math;
  
  showAnalytics = false;
  showAddModal = false;
  searchQuery = '';
  categoryFilter = 'all';
  stageFilter = 'all';
  statusFilter = 'all';

  newTouchpoint = {
    name: '',
    channel: '',
    category: 'digital' as const,
    stage: 'Kullanım',
    status: 'active' as const
  };

  touchpoints = signal<Touchpoint[]>([
    {
      id: '1',
      name: 'Mobil Uygulama',
      channel: 'Mobil',
      category: 'digital',
      stage: 'Kullanım',
      status: 'active',
      satisfactionScore: 4.5,
      volume: 125000,
      trend: 'up',
      issues: 3,
      lastUpdated: '2 saat önce'
    },
    {
      id: '2',
      name: 'İnternet Bankacılığı',
      channel: 'Web',
      category: 'digital',
      stage: 'Kullanım',
      status: 'active',
      satisfactionScore: 4.2,
      volume: 89000,
      trend: 'stable',
      issues: 5,
      lastUpdated: '4 saat önce'
    },
    {
      id: '3',
      name: 'Şube Ziyareti',
      channel: 'Fiziksel',
      category: 'physical',
      stage: 'Satın Alma',
      status: 'active',
      satisfactionScore: 3.8,
      volume: 45000,
      trend: 'down',
      issues: 12,
      lastUpdated: '1 gün önce'
    },
    {
      id: '4',
      name: 'Çağrı Merkezi',
      channel: 'Telefon',
      category: 'human',
      stage: 'Kullanım',
      status: 'active',
      satisfactionScore: 3.5,
      volume: 67000,
      trend: 'up',
      issues: 8,
      lastUpdated: '3 saat önce'
    },
    {
      id: '5',
      name: 'ATM',
      channel: 'Fiziksel',
      category: 'physical',
      stage: 'Kullanım',
      status: 'active',
      satisfactionScore: 4.0,
      volume: 210000,
      trend: 'stable',
      issues: 4,
      lastUpdated: '6 saat önce'
    },
    {
      id: '6',
      name: 'Chatbot',
      channel: 'Dijital',
      category: 'digital',
      stage: 'Araştırma',
      status: 'active',
      satisfactionScore: 3.2,
      volume: 32000,
      trend: 'up',
      issues: 15,
      lastUpdated: '1 saat önce'
    },
    {
      id: '7',
      name: 'E-posta Desteği',
      channel: 'E-posta',
      category: 'human',
      stage: 'Kullanım',
      status: 'active',
      satisfactionScore: 3.9,
      volume: 18000,
      trend: 'stable',
      issues: 6,
      lastUpdated: '12 saat önce'
    },
    {
      id: '8',
      name: 'Sosyal Medya',
      channel: 'Sosyal',
      category: 'digital',
      stage: 'Farkındalık',
      status: 'active',
      satisfactionScore: 4.1,
      volume: 78000,
      trend: 'up',
      issues: 2,
      lastUpdated: '30 dakika önce'
    },
    {
      id: '9',
      name: 'Video Bankacılık',
      channel: 'Dijital',
      category: 'human',
      stage: 'Satın Alma',
      status: 'planned',
      satisfactionScore: 0,
      volume: 0,
      trend: 'stable',
      issues: 0,
      lastUpdated: 'Planlanan'
    }
  ]);

  totalTouchpoints = computed(() => this.touchpoints().length);
  activeTouchpoints = computed(() => this.touchpoints().filter(t => t.status === 'active').length);
  plannedTouchpoints = computed(() => this.touchpoints().filter(t => t.status === 'planned').length);
  
  avgSatisfaction = computed(() => {
    const active = this.touchpoints().filter(t => t.status === 'active' && t.satisfactionScore > 0);
    if (active.length === 0) return 0;
    return active.reduce((sum, t) => sum + t.satisfactionScore, 0) / active.length;
  });

  maxVolume = computed(() => Math.max(...this.touchpoints().map(t => t.volume)));

  categoryStats = computed(() => {
    const stats: { category: 'digital' | 'physical' | 'human'; count: number }[] = [
      { category: 'digital', count: this.touchpoints().filter(t => t.category === 'digital').length },
      { category: 'physical', count: this.touchpoints().filter(t => t.category === 'physical').length },
      { category: 'human', count: this.touchpoints().filter(t => t.category === 'human').length }
    ];
    return stats;
  });

  stageStats = computed(() => {
    const stages = ['Farkındalık', 'Araştırma', 'Satın Alma', 'Kullanım', 'Sadakat'];
    return stages.map(stage => {
      const items = this.touchpoints().filter(t => t.stage === stage && t.satisfactionScore > 0);
      return {
        name: stage,
        count: this.touchpoints().filter(t => t.stage === stage).length,
        avgScore: items.length > 0 ? items.reduce((sum, t) => sum + t.satisfactionScore, 0) / items.length : 0
      };
    });
  });

  filteredTouchpoints = computed(() => {
    return this.touchpoints().filter(tp => {
      const matchesSearch = !this.searchQuery || 
        tp.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        tp.channel.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.categoryFilter === 'all' || tp.category === this.categoryFilter;
      const matchesStage = this.stageFilter === 'all' || tp.stage === this.stageFilter;
      const matchesStatus = this.statusFilter === 'all' || tp.status === this.statusFilter;
      
      return matchesSearch && matchesCategory && matchesStage && matchesStatus;
    });
  });

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'digital': 'Dijital',
      'physical': 'Fiziksel',
      'human': 'İnsan'
    };
    return names[category] || category;
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'active': 'Aktif',
      'inactive': 'Pasif',
      'planned': 'Planlanan'
    };
    return texts[status] || status;
  }

  getScoreClass(score: number): string {
    if (score >= 4.0) return 'good';
    if (score >= 3.0) return 'average';
    return 'poor';
  }

  addTouchpoint(): void {
    const tp: Touchpoint = {
      id: Date.now().toString(),
      name: this.newTouchpoint.name,
      channel: this.newTouchpoint.channel,
      category: this.newTouchpoint.category,
      stage: this.newTouchpoint.stage,
      status: this.newTouchpoint.status,
      satisfactionScore: 0,
      volume: 0,
      trend: 'stable',
      issues: 0,
      lastUpdated: 'Az önce'
    };
    
    this.touchpoints.update(list => [...list, tp]);
    this.showAddModal = false;
    this.newTouchpoint = {
      name: '',
      channel: '',
      category: 'digital',
      stage: 'Kullanım',
      status: 'active'
    };
  }

  constructor(private router: Router) {}
}
