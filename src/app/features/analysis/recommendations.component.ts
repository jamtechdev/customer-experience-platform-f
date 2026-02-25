import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'process' | 'product' | 'service' | 'digital' | 'training' | 'communication';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'under_review' | 'accepted' | 'rejected' | 'implemented';
  source: 'ai' | 'insight' | 'feedback' | 'survey' | 'manual';
  confidence: number;
  impact: {
    nps: number;
    satisfaction: number;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  };
  relatedFeedback: number;
  relatedInsights: string[];
  createdAt: string;
  implementedAt?: string;
}

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="recommendations-page">
      <div class="page-header">
        <div class="header-left">
          <h1>AI Önerileri</h1>
          <p>Yapay zeka destekli CX iyileştirme önerileri</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="refreshRecommendations()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Yenile
          </button>
          <button class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Rapor İndir
          </button>
        </div>
      </div>

      <!-- AI Summary -->
      <div class="ai-summary">
        <div class="ai-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="ai-content">
          <h3>AI Analiz Özeti</h3>
          <p>
            Son 30 günlük veriler analiz edildi. <strong>{{ newRecommendations() }} yeni öneri</strong> oluşturuldu.
            En yüksek öncelikli konular: <strong>Mobil uygulama performansı</strong>, 
            <strong>Müşteri hizmetleri yanıt süreleri</strong> ve <strong>Şube deneyimi</strong>.
            Önerilerin uygulanması durumunda tahmini <strong>+12 NPS</strong> artışı beklenmektedir.
          </p>
        </div>
        <div class="ai-stats">
          <div class="ai-stat">
            <span class="stat-value">{{ totalRecommendations() }}</span>
            <span class="stat-label">Toplam Öneri</span>
          </div>
          <div class="ai-stat">
            <span class="stat-value positive">{{ implementedCount() }}</span>
            <span class="stat-label">Uygulanan</span>
          </div>
          <div class="ai-stat">
            <span class="stat-value">%{{ avgConfidence() }}</span>
            <span class="stat-label">Ort. Güven</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button 
            [class.active]="statusFilter === 'all'"
            (click)="statusFilter = 'all'"
          >
            Tümü ({{ totalRecommendations() }})
          </button>
          <button 
            [class.active]="statusFilter === 'new'"
            (click)="statusFilter = 'new'"
          >
            Yeni ({{ getStatusCount('new') }})
          </button>
          <button 
            [class.active]="statusFilter === 'under_review'"
            (click)="statusFilter = 'under_review'"
          >
            İnceleniyor ({{ getStatusCount('under_review') }})
          </button>
          <button 
            [class.active]="statusFilter === 'accepted'"
            (click)="statusFilter = 'accepted'"
          >
            Kabul Edildi ({{ getStatusCount('accepted') }})
          </button>
          <button 
            [class.active]="statusFilter === 'implemented'"
            (click)="statusFilter = 'implemented'"
          >
            Uygulandı ({{ getStatusCount('implemented') }})
          </button>
        </div>
        <div class="filter-selects">
          <select [(ngModel)]="categoryFilter">
            <option value="all">Tüm Kategoriler</option>
            <option value="process">Süreç</option>
            <option value="product">Ürün</option>
            <option value="service">Hizmet</option>
            <option value="digital">Dijital</option>
            <option value="training">Eğitim</option>
            <option value="communication">İletişim</option>
          </select>
          <select [(ngModel)]="priorityFilter">
            <option value="all">Tüm Öncelikler</option>
            <option value="critical">Kritik</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>
          <select [(ngModel)]="sortBy">
            <option value="priority">Öncelik</option>
            <option value="confidence">Güven Skoru</option>
            <option value="impact">Etki</option>
            <option value="date">Tarih</option>
          </select>
        </div>
      </div>

      <!-- Impact/Effort Matrix -->
      @if (showMatrix) {
        <div class="matrix-section">
          <div class="matrix-header">
            <h2>Etki/Efor Matrisi</h2>
            <button class="btn-icon" (click)="showMatrix = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="matrix-grid">
            <div class="matrix-quadrant quick-wins">
              <h4>🚀 Hızlı Kazanımlar</h4>
              <p>Yüksek Etki / Düşük Efor</p>
              <div class="quadrant-items">
                @for (rec of getMatrixQuadrant('quick'); track rec.id) {
                  <div class="matrix-item" (click)="selectRecommendation(rec)">
                    {{ rec.title }}
                  </div>
                }
              </div>
            </div>
            <div class="matrix-quadrant strategic">
              <h4>🎯 Stratejik</h4>
              <p>Yüksek Etki / Yüksek Efor</p>
              <div class="quadrant-items">
                @for (rec of getMatrixQuadrant('strategic'); track rec.id) {
                  <div class="matrix-item" (click)="selectRecommendation(rec)">
                    {{ rec.title }}
                  </div>
                }
              </div>
            </div>
            <div class="matrix-quadrant fill-ins">
              <h4>✅ Tamamlayıcı</h4>
              <p>Düşük Etki / Düşük Efor</p>
              <div class="quadrant-items">
                @for (rec of getMatrixQuadrant('fill'); track rec.id) {
                  <div class="matrix-item" (click)="selectRecommendation(rec)">
                    {{ rec.title }}
                  </div>
                }
              </div>
            </div>
            <div class="matrix-quadrant avoid">
              <h4>⚠️ Dikkatli Değerlendir</h4>
              <p>Düşük Etki / Yüksek Efor</p>
              <div class="quadrant-items">
                @for (rec of getMatrixQuadrant('avoid'); track rec.id) {
                  <div class="matrix-item" (click)="selectRecommendation(rec)">
                    {{ rec.title }}
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      } @else {
        <button class="show-matrix-btn" (click)="showMatrix = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Etki/Efor Matrisini Göster
        </button>
      }

      <!-- Recommendations List -->
      <div class="recommendations-list">
        @for (rec of filteredRecommendations(); track rec.id) {
          <div class="recommendation-card" [class]="rec.priority" [class.expanded]="expandedId === rec.id">
            <div class="card-main" (click)="toggleExpand(rec.id)">
              <div class="rec-header">
                <div class="rec-badges">
                  <span class="source-badge" [class]="rec.source">
                    @switch (rec.source) {
                      @case ('ai') { 🤖 AI }
                      @case ('insight') { 💡 Insight }
                      @case ('feedback') { 💬 Geri Bildirim }
                      @case ('survey') { 📊 Anket }
                      @case ('manual') { ✏️ Manuel }
                    }
                  </span>
                  <span class="priority-badge" [class]="rec.priority">
                    {{ getPriorityText(rec.priority) }}
                  </span>
                  <span class="category-badge" [class]="rec.category">
                    {{ getCategoryText(rec.category) }}
                  </span>
                </div>
                <span class="status-badge" [class]="rec.status">
                  {{ getStatusText(rec.status) }}
                </span>
              </div>
              
              <h3>{{ rec.title }}</h3>
              <p>{{ rec.description }}</p>
              
              <div class="rec-metrics">
                <div class="metric">
                  <span class="metric-label">Güven</span>
                  <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="rec.confidence"></div>
                  </div>
                  <span class="metric-value">%{{ rec.confidence }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Beklenen NPS</span>
                  <span class="metric-value positive">+{{ rec.impact.nps }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Efor</span>
                  <span class="metric-value effort" [class]="rec.impact.effort">
                    {{ getEffortText(rec.impact.effort) }}
                  </span>
                </div>
                <div class="metric">
                  <span class="metric-label">Süre</span>
                  <span class="metric-value">{{ rec.impact.timeline }}</span>
                </div>
              </div>

              <div class="expand-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (expandedId === rec.id) {
                    <polyline points="18 15 12 9 6 15"/>
                  } @else {
                    <polyline points="6 9 12 15 18 9"/>
                  }
                </svg>
              </div>
            </div>

            @if (expandedId === rec.id) {
              <div class="card-details">
                <div class="detail-grid">
                  <div class="detail-section">
                    <h4>Detaylı Analiz</h4>
                    <ul class="analysis-points">
                      <li>Bu öneri {{ rec.relatedFeedback }} müşteri geri bildirimi analiz edilerek oluşturuldu</li>
                      <li>Benzer iyileştirmeler yapan rakipler %{{ rec.impact.satisfaction }} memnuniyet artışı elde etti</li>
                      <li>Uygulama süresi tahmini: {{ rec.impact.timeline }}</li>
                    </ul>
                  </div>
                  <div class="detail-section">
                    <h4>Beklenen Sonuçlar</h4>
                    <div class="impact-preview">
                      <div class="impact-item">
                        <span class="impact-icon positive">📈</span>
                        <span>NPS: +{{ rec.impact.nps }} puan</span>
                      </div>
                      <div class="impact-item">
                        <span class="impact-icon positive">😊</span>
                        <span>Memnuniyet: +{{ rec.impact.satisfaction }}%</span>
                      </div>
                      <div class="impact-item">
                        <span class="impact-icon">⏱️</span>
                        <span>Uygulama: {{ rec.impact.timeline }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="detail-actions">
                  @if (rec.status === 'new' || rec.status === 'under_review') {
                    <button class="btn btn-success" (click)="acceptRecommendation(rec); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Kabul Et
                    </button>
                    <button class="btn btn-outline" (click)="rejectRecommendation(rec); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Reddet
                    </button>
                  }
                  @if (rec.status === 'accepted') {
                    <button class="btn btn-primary" (click)="createActionPlan(rec); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                      Aksiyon Planı Oluştur
                    </button>
                  }
                  <button class="btn btn-ghost" (click)="$event.stopPropagation()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                    Daha Fazla
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Detail Modal -->
      @if (selectedRecommendation()) {
        <div class="modal-overlay" (click)="selectedRecommendation.set(null)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-badges">
                <span class="source-badge" [class]="selectedRecommendation()!.source">
                  @switch (selectedRecommendation()!.source) {
                    @case ('ai') { 🤖 AI }
                    @case ('insight') { 💡 Insight }
                    @case ('feedback') { 💬 Geri Bildirim }
                    @default { 📊 Diğer }
                  }
                </span>
                <span class="priority-badge" [class]="selectedRecommendation()!.priority">
                  {{ getPriorityText(selectedRecommendation()!.priority) }}
                </span>
              </div>
              <button class="close-btn" (click)="selectedRecommendation.set(null)">×</button>
            </div>
            <div class="modal-body">
              <h2>{{ selectedRecommendation()!.title }}</h2>
              <p>{{ selectedRecommendation()!.description }}</p>
              
              <div class="modal-impact">
                <h4>Beklenen Etki</h4>
                <div class="impact-cards">
                  <div class="impact-card">
                    <span class="value positive">+{{ selectedRecommendation()!.impact.nps }}</span>
                    <span class="label">NPS</span>
                  </div>
                  <div class="impact-card">
                    <span class="value positive">+{{ selectedRecommendation()!.impact.satisfaction }}%</span>
                    <span class="label">Memnuniyet</span>
                  </div>
                  <div class="impact-card">
                    <span class="value">{{ selectedRecommendation()!.impact.timeline }}</span>
                    <span class="label">Süre</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="selectedRecommendation.set(null)">Kapat</button>
              <button class="btn btn-primary">Aksiyon Planı Oluştur</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .recommendations-page {
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

    .btn-success {
      background: #22c55e;
      color: white;
      border: none;
    }

    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--text-secondary);
    }

    /* AI Summary */
    .ai-summary {
      display: flex;
      gap: 20px;
      padding: 24px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 16px;
      margin-bottom: 24px;
      align-items: center;
    }

    .ai-icon {
      width: 56px;
      height: 56px;
      background: #3b82f6;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ai-icon svg {
      width: 28px;
      height: 28px;
      color: white;
    }

    .ai-content {
      flex: 1;
    }

    .ai-content h3 {
      font-size: 1rem;
      margin-bottom: 8px;
      color: #1e40af;
    }

    .ai-content p {
      font-size: 0.875rem;
      color: #3b82f6;
      line-height: 1.6;
      margin: 0;
    }

    .ai-stats {
      display: flex;
      gap: 24px;
    }

    .ai-stat {
      text-align: center;
      padding: 12px 20px;
      background: white;
      border-radius: 10px;
    }

    .ai-stat .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e40af;
    }

    .ai-stat .stat-value.positive {
      color: #22c55e;
    }

    .ai-stat .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .filter-tabs button {
      padding: 8px 16px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .filter-tabs button.active {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .filter-selects {
      display: flex;
      gap: 12px;
    }

    .filter-selects select {
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.8125rem;
      background: white;
    }

    /* Matrix Section */
    .show-matrix-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      background: white;
      border: 1px dashed var(--border-color);
      border-radius: 12px;
      width: 100%;
      justify-content: center;
      cursor: pointer;
      margin-bottom: 24px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .show-matrix-btn svg {
      width: 20px;
      height: 20px;
    }

    .show-matrix-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .matrix-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .matrix-header h2 {
      font-size: 1rem;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-icon svg {
      width: 18px;
      height: 18px;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .matrix-quadrant {
      padding: 16px;
      border-radius: 10px;
      min-height: 150px;
    }

    .matrix-quadrant h4 {
      font-size: 0.875rem;
      margin-bottom: 4px;
    }

    .matrix-quadrant > p {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 12px;
    }

    .matrix-quadrant.quick-wins { background: #dcfce7; }
    .matrix-quadrant.strategic { background: #dbeafe; }
    .matrix-quadrant.fill-ins { background: #f3f4f6; }
    .matrix-quadrant.avoid { background: #fef3c7; }

    .quadrant-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .matrix-item {
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .matrix-item:hover {
      transform: translateX(4px);
    }

    /* Recommendations List */
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .recommendation-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-left: 4px solid;
    }

    .recommendation-card.critical { border-color: #ef4444; }
    .recommendation-card.high { border-color: #f59e0b; }
    .recommendation-card.medium { border-color: #3b82f6; }
    .recommendation-card.low { border-color: #22c55e; }

    .card-main {
      padding: 20px;
      cursor: pointer;
      position: relative;
    }

    .rec-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rec-badges {
      display: flex;
      gap: 8px;
    }

    .source-badge,
    .priority-badge,
    .category-badge,
    .status-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .source-badge.ai { background: #eff6ff; color: #2563eb; }
    .source-badge.insight { background: #fef3c7; color: #f59e0b; }
    .source-badge.feedback { background: #dcfce7; color: #22c55e; }
    .source-badge.survey { background: #f3e8ff; color: #9333ea; }
    .source-badge.manual { background: #f3f4f6; color: #6b7280; }

    .priority-badge.critical { background: #fee2e2; color: #ef4444; }
    .priority-badge.high { background: #fef3c7; color: #f59e0b; }
    .priority-badge.medium { background: #dbeafe; color: #3b82f6; }
    .priority-badge.low { background: #dcfce7; color: #22c55e; }

    .category-badge.process { background: #dbeafe; color: #2563eb; }
    .category-badge.product { background: #f3e8ff; color: #9333ea; }
    .category-badge.service { background: #fef3c7; color: #f59e0b; }
    .category-badge.digital { background: #dcfce7; color: #22c55e; }
    .category-badge.training { background: #fee2e2; color: #ef4444; }
    .category-badge.communication { background: #fce7f3; color: #db2777; }

    .status-badge.new { background: #dbeafe; color: #2563eb; }
    .status-badge.under_review { background: #fef3c7; color: #f59e0b; }
    .status-badge.accepted { background: #dcfce7; color: #22c55e; }
    .status-badge.rejected { background: #fee2e2; color: #ef4444; }
    .status-badge.implemented { background: #d1fae5; color: #059669; }

    .recommendation-card h3 {
      font-size: 1rem;
      margin-bottom: 8px;
    }

    .recommendation-card > .card-main > p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .rec-metrics {
      display: flex;
      gap: 24px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .metric-value {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .metric-value.positive { color: #22c55e; }
    .metric-value.effort.low { color: #22c55e; }
    .metric-value.effort.medium { color: #f59e0b; }
    .metric-value.effort.high { color: #ef4444; }

    .confidence-bar {
      width: 60px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
    }

    .confidence-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 3px;
    }

    .expand-icon {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
    }

    .expand-icon svg {
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    /* Card Details */
    .card-details {
      padding: 0 20px 20px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
    }

    .detail-section h4 {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .analysis-points {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .analysis-points li {
      font-size: 0.8125rem;
      padding: 8px 0;
      padding-left: 20px;
      position: relative;
    }

    .analysis-points li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--primary-color);
    }

    .impact-preview {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .impact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: var(--bg-secondary);
      border-radius: 8px;
      font-size: 0.8125rem;
    }

    .detail-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
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

    .modal-badges {
      display: flex;
      gap: 8px;
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

    .modal-body h2 {
      font-size: 1.125rem;
      margin-bottom: 12px;
    }

    .modal-body > p {
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .modal-impact h4 {
      font-size: 0.875rem;
      margin-bottom: 12px;
    }

    .impact-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .impact-card {
      text-align: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 10px;
    }

    .impact-card .value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .impact-card .value.positive { color: #22c55e; }

    .impact-card .label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 768px) {
      .page-header, .filters-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .ai-summary {
        flex-direction: column;
        text-align: center;
      }

      .ai-stats {
        justify-content: center;
      }

      .filter-tabs {
        overflow-x: auto;
      }

      .filter-selects {
        flex-wrap: wrap;
      }

      .matrix-grid, .detail-grid, .impact-cards {
        grid-template-columns: 1fr;
      }

      .rec-metrics {
        flex-wrap: wrap;
      }
    }
  `]
})
export class RecommendationsComponent {
  statusFilter = 'all';
  categoryFilter = 'all';
  priorityFilter = 'all';
  sortBy = 'priority';
  showMatrix = false;
  expandedId: string | null = null;
  selectedRecommendation = signal<Recommendation | null>(null);

  recommendations = signal<Recommendation[]>([
    {
      id: '1',
      title: 'Mobil Uygulama Giriş Sürecini Basitleştirme',
      description: 'Parmak izi ve yüz tanıma ile hızlı giriş seçeneğinin varsayılan olarak sunulması. Mevcut durumda kullanıcıların %68\'i şifre ile giriş yapmaya devam ediyor.',
      category: 'digital',
      priority: 'critical',
      status: 'new',
      source: 'ai',
      confidence: 92,
      impact: { nps: 8, satisfaction: 12, effort: 'low', timeline: '2-4 hafta' },
      relatedFeedback: 847,
      relatedInsights: ['ins-1', 'ins-2'],
      createdAt: '2025-01-18'
    },
    {
      id: '2',
      title: 'Çağrı Merkezi IVR Menüsü Optimizasyonu',
      description: 'IVR menüsünü 5 seviyeden 3 seviyeye indirmek ve en sık kullanılan işlemleri öne çıkarmak. Ortalama bekleme süresi %35 azalabilir.',
      category: 'service',
      priority: 'high',
      status: 'under_review',
      source: 'insight',
      confidence: 85,
      impact: { nps: 6, satisfaction: 15, effort: 'medium', timeline: '4-6 hafta' },
      relatedFeedback: 523,
      relatedInsights: ['ins-3'],
      createdAt: '2025-01-16'
    },
    {
      id: '3',
      title: 'Şube İçi Dijital Kiosk Kurulumu',
      description: 'Yoğun şubelere self-servis kiosk kurularak basit işlemlerin (dekont, hesap özeti) müşteri tarafından yapılabilmesinin sağlanması.',
      category: 'service',
      priority: 'medium',
      status: 'accepted',
      source: 'feedback',
      confidence: 78,
      impact: { nps: 4, satisfaction: 8, effort: 'high', timeline: '3-6 ay' },
      relatedFeedback: 312,
      relatedInsights: ['ins-4'],
      createdAt: '2025-01-10'
    },
    {
      id: '4',
      title: 'Proaktif Bildirim Sistemi',
      description: 'Müşterilere hesap hareketleri ve kampanyalar hakkında kişiselleştirilmiş bildirimler gönderilmesi. Push notification açma oranı %40 artırılabilir.',
      category: 'communication',
      priority: 'medium',
      status: 'new',
      source: 'ai',
      confidence: 88,
      impact: { nps: 5, satisfaction: 10, effort: 'medium', timeline: '6-8 hafta' },
      relatedFeedback: 234,
      relatedInsights: ['ins-5', 'ins-6'],
      createdAt: '2025-01-17'
    },
    {
      id: '5',
      title: 'Online Kredi Başvuru Formu İyileştirmesi',
      description: 'Form alanlarının azaltılması ve otomatik doldurma özelliklerinin eklenmesi. Başvuru tamamlama oranı %25 artırılabilir.',
      category: 'digital',
      priority: 'high',
      status: 'implemented',
      source: 'survey',
      confidence: 91,
      impact: { nps: 7, satisfaction: 14, effort: 'low', timeline: '2-3 hafta' },
      relatedFeedback: 678,
      relatedInsights: ['ins-7'],
      createdAt: '2024-12-20',
      implementedAt: '2025-01-15'
    },
    {
      id: '6',
      title: 'Müşteri Temsilcisi Empati Eğitimi',
      description: 'Tüm müşteri temsilcilerine empati ve aktif dinleme odaklı eğitim programı uygulanması.',
      category: 'training',
      priority: 'high',
      status: 'accepted',
      source: 'ai',
      confidence: 82,
      impact: { nps: 6, satisfaction: 12, effort: 'medium', timeline: '2-3 ay' },
      relatedFeedback: 445,
      relatedInsights: ['ins-8'],
      createdAt: '2025-01-12'
    }
  ]);

  totalRecommendations = computed(() => this.recommendations().length);
  newRecommendations = computed(() => this.recommendations().filter(r => r.status === 'new').length);
  implementedCount = computed(() => this.recommendations().filter(r => r.status === 'implemented').length);
  avgConfidence = computed(() => {
    const recs = this.recommendations();
    if (recs.length === 0) return 0;
    return Math.round(recs.reduce((sum, r) => sum + r.confidence, 0) / recs.length);
  });

  filteredRecommendations = computed(() => {
    let result = this.recommendations();
    
    if (this.statusFilter !== 'all') {
      result = result.filter(r => r.status === this.statusFilter);
    }
    if (this.categoryFilter !== 'all') {
      result = result.filter(r => r.category === this.categoryFilter);
    }
    if (this.priorityFilter !== 'all') {
      result = result.filter(r => r.priority === this.priorityFilter);
    }
    
    // Sort
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          return b.impact.nps - a.impact.nps;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  });

  getStatusCount(status: string): number {
    return this.recommendations().filter(r => r.status === status).length;
  }

  getMatrixQuadrant(quadrant: string): Recommendation[] {
    return this.recommendations().filter(r => {
      const highImpact = r.impact.nps >= 6;
      const lowEffort = r.impact.effort === 'low';
      
      switch (quadrant) {
        case 'quick': return highImpact && lowEffort;
        case 'strategic': return highImpact && !lowEffort;
        case 'fill': return !highImpact && lowEffort;
        case 'avoid': return !highImpact && !lowEffort;
        default: return false;
      }
    });
  }

  getPriorityText(priority: string): string {
    const texts: Record<string, string> = {
      'critical': 'Kritik',
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük'
    };
    return texts[priority] || priority;
  }

  getCategoryText(category: string): string {
    const texts: Record<string, string> = {
      'process': 'Süreç',
      'product': 'Ürün',
      'service': 'Hizmet',
      'digital': 'Dijital',
      'training': 'Eğitim',
      'communication': 'İletişim'
    };
    return texts[category] || category;
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'new': 'Yeni',
      'under_review': 'İnceleniyor',
      'accepted': 'Kabul Edildi',
      'rejected': 'Reddedildi',
      'implemented': 'Uygulandı'
    };
    return texts[status] || status;
  }

  getEffortText(effort: string): string {
    const texts: Record<string, string> = {
      'low': 'Düşük',
      'medium': 'Orta',
      'high': 'Yüksek'
    };
    return texts[effort] || effort;
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  selectRecommendation(rec: Recommendation): void {
    this.selectedRecommendation.set(rec);
  }

  acceptRecommendation(rec: Recommendation): void {
    this.recommendations.update(list => 
      list.map(r => r.id === rec.id ? { ...r, status: 'accepted' as const } : r)
    );
  }

  rejectRecommendation(rec: Recommendation): void {
    this.recommendations.update(list => 
      list.map(r => r.id === rec.id ? { ...r, status: 'rejected' as const } : r)
    );
  }

  createActionPlan(rec: Recommendation): void {
    // Navigate to action plans with pre-filled data
    console.log('Creating action plan for:', rec.title);
  }

  refreshRecommendations(): void {
    // In real app, fetch new recommendations from AI service
    console.log('Refreshing recommendations...');
  }
}
