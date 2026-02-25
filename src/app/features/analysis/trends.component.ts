import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TrendData {
  date: string;
  value: number;
}

interface TrendMetric {
  id: string;
  name: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changeType: 'up' | 'down' | 'stable';
  data: TrendData[];
  color: string;
}

interface TrendTopic {
  name: string;
  count: number;
  change: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

@Component({
  selector: 'app-trends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trends-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Trend Analizi</h1>
          <p>Zaman serisi analizleri ve trend tahminleri</p>
        </div>
        <div class="header-actions">
          <div class="date-range">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <select [(ngModel)]="selectedPeriod" (ngModelChange)="onPeriodChange()">
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="90d">Son 90 Gün</option>
              <option value="6m">Son 6 Ay</option>
              <option value="1y">Son 1 Yıl</option>
            </select>
          </div>
          <button class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Dışa Aktar
          </button>
        </div>
      </div>

      <!-- Main Metrics Cards -->
      <div class="metrics-row">
        @for (metric of mainMetrics(); track metric.id) {
          <div 
            class="metric-card"
            [class.selected]="selectedMetrics().includes(metric.id)"
            (click)="toggleMetric(metric.id)"
          >
            <div class="metric-header">
              <span class="metric-name">{{ metric.name }}</span>
              <span class="metric-change" [class]="metric.changeType">
                @if (metric.changeType === 'up') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                } @else if (metric.changeType === 'down') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                }
                {{ metric.change > 0 ? '+' : '' }}{{ metric.change }}%
              </span>
            </div>
            <div class="metric-value">{{ metric.currentValue | number }}</div>
            <div class="mini-chart">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                <path [attr.d]="getMiniChartPath(metric.data)" fill="none" [attr.stroke]="metric.color" stroke-width="2"/>
              </svg>
            </div>
          </div>
        }
      </div>

      <!-- Main Trend Chart -->
      <div class="chart-section">
        <div class="chart-header">
          <h2>Trend Grafiği</h2>
          <div class="chart-legend">
            @for (metric of getSelectedMetrics(); track metric.id) {
              <div class="legend-item">
                <span class="legend-color" [style.background-color]="metric.color"></span>
                {{ metric.name }}
              </div>
            }
          </div>
        </div>
        <div class="chart-container">
          <div class="y-axis">
            @for (label of yAxisLabels(); track label) {
              <span>{{ label | number }}</span>
            }
          </div>
          <div class="chart-area">
            <svg viewBox="0 0 100 50" preserveAspectRatio="none" class="chart-svg">
              <!-- Grid lines -->
              @for (i of [0, 1, 2, 3, 4]; track i) {
                <line 
                  [attr.x1]="0" 
                  [attr.y1]="i * 12.5" 
                  [attr.x2]="100" 
                  [attr.y2]="i * 12.5" 
                  stroke="#e5e7eb" 
                  stroke-width="0.2"
                />
              }
              <!-- Trend lines -->
              @for (metric of getSelectedMetrics(); track metric.id) {
                <path 
                  [attr.d]="getChartPath(metric.data)"
                  fill="none"
                  [attr.stroke]="metric.color"
                  stroke-width="0.5"
                  class="trend-line"
                />
              }
            </svg>
            <div class="x-axis">
              @for (label of xAxisLabels(); track label) {
                <span>{{ label }}</span>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Dual Column Layout -->
      <div class="dual-column">
        <!-- Trending Topics -->
        <div class="trending-section">
          <div class="section-header">
            <h2>Gündem Konuları</h2>
            <select [(ngModel)]="topicFilter" class="filter-select">
              <option value="all">Tümü</option>
              <option value="rising">Yükselen</option>
              <option value="falling">Düşen</option>
            </select>
          </div>
          <div class="topics-list">
            @for (topic of filteredTopics(); track topic.name; let i = $index) {
              <div class="topic-item">
                <span class="topic-rank">{{ i + 1 }}</span>
                <div class="topic-info">
                  <span class="topic-name">{{ topic.name }}</span>
                  <span class="topic-count">{{ topic.count | number }} bahsetme</span>
                </div>
                <div class="topic-sentiment" [class]="topic.sentiment">
                  @switch (topic.sentiment) {
                    @case ('positive') { 😊 }
                    @case ('neutral') { 😐 }
                    @case ('negative') { 😞 }
                  }
                </div>
                <div class="topic-change" [class.up]="topic.change > 0" [class.down]="topic.change < 0">
                  @if (topic.change > 0) { ▲ } @else if (topic.change < 0) { ▼ }
                  {{ topic.change > 0 ? '+' : '' }}{{ topic.change }}%
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Predictions -->
        <div class="predictions-section">
          <div class="section-header">
            <h2>AI Tahminler</h2>
            <span class="ai-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              Son güncelleme: 2 saat önce
            </span>
          </div>
          <div class="predictions-list">
            @for (prediction of predictions(); track prediction.metric) {
              <div class="prediction-card">
                <div class="prediction-header">
                  <span class="prediction-metric">{{ prediction.metric }}</span>
                  <span class="prediction-confidence" [class]="prediction.confidenceLevel">
                    {{ prediction.confidence }}% güven
                  </span>
                </div>
                <div class="prediction-body">
                  <div class="prediction-values">
                    <div class="current">
                      <span class="label">Mevcut</span>
                      <span class="value">{{ prediction.currentValue | number }}</span>
                    </div>
                    <div class="arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                    <div class="predicted">
                      <span class="label">Tahmini (30 gün)</span>
                      <span class="value" [class.up]="prediction.predictedValue > prediction.currentValue" [class.down]="prediction.predictedValue < prediction.currentValue">
                        {{ prediction.predictedValue | number }}
                      </span>
                    </div>
                  </div>
                  <p class="prediction-insight">{{ prediction.insight }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Anomaly Detection -->
      <div class="anomaly-section">
        <div class="section-header">
          <h2>Anomali Tespiti</h2>
          <span class="anomaly-count">{{ anomalies().length }} anomali tespit edildi</span>
        </div>
        <div class="anomalies-grid">
          @for (anomaly of anomalies(); track anomaly.id) {
            <div class="anomaly-card" [class]="anomaly.severity">
              <div class="anomaly-header">
                <span class="anomaly-type">{{ anomaly.type }}</span>
                <span class="anomaly-date">{{ anomaly.date }}</span>
              </div>
              <p class="anomaly-description">{{ anomaly.description }}</p>
              <div class="anomaly-impact">
                <span class="impact-label">Etki:</span>
                <div class="impact-bar">
                  <div class="impact-fill" [style.width.%]="anomaly.impact"></div>
                </div>
                <span class="impact-value">{{ anomaly.impact }}%</span>
              </div>
              <div class="anomaly-actions">
                <button class="btn-small">Detaylar</button>
                <button class="btn-small btn-outline">Yoksay</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Seasonal Patterns -->
      <div class="seasonal-section">
        <h2>Mevsimsel Paternler</h2>
        <div class="heatmap-container">
          <div class="heatmap-header">
            <span></span>
            @for (hour of hours(); track hour) {
              <span class="hour-label">{{ hour }}</span>
            }
          </div>
          @for (day of days(); track day) {
            <div class="heatmap-row">
              <span class="day-label">{{ day }}</span>
              @for (hour of hours(); track hour) {
                <div 
                  class="heatmap-cell"
                  [style.background-color]="getHeatmapColor(day, hour)"
                  [title]="getHeatmapValue(day, hour) + ' etkileşim'"
                ></div>
              }
            </div>
          }
        </div>
        <div class="heatmap-legend">
          <span>Az</span>
          <div class="legend-gradient"></div>
          <span>Çok</span>
        </div>
      </div>

      <!-- Correlation Matrix -->
      <div class="correlation-section">
        <h2>Korelasyon Matrisi</h2>
        <div class="correlation-matrix">
          <div class="matrix-header">
            <span></span>
            @for (metric of correlationMetrics(); track metric) {
              <span class="matrix-label">{{ metric }}</span>
            }
          </div>
          @for (row of correlationMetrics(); track row) {
            <div class="matrix-row">
              <span class="matrix-label">{{ row }}</span>
              @for (col of correlationMetrics(); track col) {
                <div 
                  class="matrix-cell"
                  [style.background-color]="getCorrelationColor(row, col)"
                >
                  {{ getCorrelation(row, col) }}
                </div>
              }
            </div>
          }
        </div>
        <div class="correlation-insights">
          <h4>Önemli Bulgular</h4>
          <ul>
            <li><strong>NPS ↔ Memnuniyet:</strong> Güçlü pozitif korelasyon (0.89)</li>
            <li><strong>Şikayet ↔ Memnuniyet:</strong> Güçlü negatif korelasyon (-0.76)</li>
            <li><strong>Yanıt Süresi ↔ NPS:</strong> Orta düzey negatif korelasyon (-0.52)</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trends-page {
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

    .date-range {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .date-range svg {
      width: 18px;
      height: 18px;
      color: var(--text-tertiary);
    }

    .date-range select {
      border: none;
      font-size: 0.875rem;
      background: transparent;
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
    }

    /* Metrics Row */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .metric-card:hover {
      border-color: var(--border-color);
    }

    .metric-card.selected {
      border-color: var(--primary-color);
      background: var(--primary-light);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .metric-name {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .metric-change {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .metric-change svg {
      width: 14px;
      height: 14px;
    }

    .metric-change.up { color: #22c55e; }
    .metric-change.down { color: #ef4444; }
    .metric-change.stable { color: #6b7280; }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .mini-chart {
      height: 30px;
    }

    .mini-chart svg {
      width: 100%;
      height: 100%;
    }

    /* Chart Section */
    .chart-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .chart-header h2 {
      font-size: 1rem;
    }

    .chart-legend {
      display: flex;
      gap: 20px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .chart-container {
      display: flex;
      gap: 12px;
    }

    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0 8px;
    }

    .y-axis span {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .chart-area {
      flex: 1;
    }

    .chart-svg {
      width: 100%;
      height: 250px;
    }

    .trend-line {
      transition: stroke-width 0.2s ease;
    }

    .trend-line:hover {
      stroke-width: 1;
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
    }

    .x-axis span {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    /* Dual Column */
    .dual-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    /* Trending Topics */
    .trending-section, .predictions-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 1rem;
    }

    .filter-select {
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.8125rem;
    }

    .topics-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .topic-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .topic-rank {
      width: 24px;
      height: 24px;
      background: var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .topic-item:nth-child(1) .topic-rank { background: #fef3c7; color: #d97706; }
    .topic-item:nth-child(2) .topic-rank { background: #e5e7eb; color: #374151; }
    .topic-item:nth-child(3) .topic-rank { background: #fed7aa; color: #c2410c; }

    .topic-info {
      flex: 1;
    }

    .topic-name {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .topic-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .topic-sentiment {
      font-size: 1.25rem;
    }

    .topic-change {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .topic-change.up { background: #dcfce7; color: #22c55e; }
    .topic-change.down { background: #fee2e2; color: #ef4444; }

    /* AI Badge */
    .ai-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .ai-badge svg {
      width: 14px;
      height: 14px;
    }

    /* Predictions */
    .predictions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .prediction-card {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 10px;
    }

    .prediction-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .prediction-metric {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .prediction-confidence {
      font-size: 0.6875rem;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .prediction-confidence.high { background: #dcfce7; color: #22c55e; }
    .prediction-confidence.medium { background: #fef3c7; color: #f59e0b; }
    .prediction-confidence.low { background: #fee2e2; color: #ef4444; }

    .prediction-values {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 12px;
    }

    .current, .predicted {
      text-align: center;
    }

    .current .label, .predicted .label {
      display: block;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      margin-bottom: 4px;
    }

    .current .value, .predicted .value {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .predicted .value.up { color: #22c55e; }
    .predicted .value.down { color: #ef4444; }

    .arrow {
      color: var(--text-tertiary);
    }

    .arrow svg {
      width: 24px;
      height: 24px;
    }

    .prediction-insight {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    /* Anomaly Section */
    .anomaly-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .anomaly-count {
      font-size: 0.8125rem;
      color: var(--warning-color);
    }

    .anomalies-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .anomaly-card {
      padding: 16px;
      border-radius: 10px;
      border-left: 4px solid;
    }

    .anomaly-card.high {
      background: #fef2f2;
      border-color: #ef4444;
    }

    .anomaly-card.medium {
      background: #fffbeb;
      border-color: #f59e0b;
    }

    .anomaly-card.low {
      background: #f0f9ff;
      border-color: #3b82f6;
    }

    .anomaly-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .anomaly-type {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .anomaly-date {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .anomaly-description {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .anomaly-impact {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .impact-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .impact-bar {
      flex: 1;
      height: 6px;
      background: rgba(0,0,0,0.1);
      border-radius: 3px;
    }

    .impact-fill {
      height: 100%;
      background: currentColor;
      border-radius: 3px;
    }

    .anomaly-card.high .impact-fill { background: #ef4444; }
    .anomaly-card.medium .impact-fill { background: #f59e0b; }
    .anomaly-card.low .impact-fill { background: #3b82f6; }

    .impact-value {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .anomaly-actions {
      display: flex;
      gap: 8px;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 0.75rem;
      border-radius: 6px;
      background: var(--primary-color);
      color: white;
      border: none;
      cursor: pointer;
    }

    .btn-small.btn-outline {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    /* Seasonal Section */
    .seasonal-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .seasonal-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .heatmap-container {
      overflow-x: auto;
    }

    .heatmap-header {
      display: grid;
      grid-template-columns: 60px repeat(24, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    .hour-label {
      font-size: 0.625rem;
      color: var(--text-tertiary);
      text-align: center;
    }

    .heatmap-row {
      display: grid;
      grid-template-columns: 60px repeat(24, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    .day-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
    }

    .heatmap-cell {
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .heatmap-cell:hover {
      transform: scale(1.1);
    }

    .heatmap-legend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-top: 16px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .legend-gradient {
      width: 120px;
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(to right, #eff6ff, #3b82f6);
    }

    /* Correlation Matrix */
    .correlation-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .correlation-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .correlation-matrix {
      margin-bottom: 20px;
    }

    .matrix-header {
      display: grid;
      grid-template-columns: 100px repeat(4, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    .matrix-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-align: center;
      padding: 8px 4px;
    }

    .matrix-row {
      display: grid;
      grid-template-columns: 100px repeat(4, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    .matrix-row .matrix-label {
      text-align: left;
    }

    .matrix-cell {
      padding: 12px;
      text-align: center;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .correlation-insights {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .correlation-insights h4 {
      font-size: 0.875rem;
      margin-bottom: 12px;
    }

    .correlation-insights ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .correlation-insights li {
      font-size: 0.8125rem;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .correlation-insights li:last-child {
      border-bottom: none;
    }

    @media (max-width: 1200px) {
      .metrics-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .dual-column {
        grid-template-columns: 1fr;
      }

      .anomalies-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .metrics-row,
      .anomalies-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TrendsComponent {
  selectedPeriod = '30d';
  topicFilter = 'all';
  selectedMetrics = signal<string[]>(['nps', 'satisfaction', 'complaints']);

  mainMetrics = signal<TrendMetric[]>([
    {
      id: 'nps',
      name: 'NPS Skoru',
      currentValue: 45,
      previousValue: 42,
      change: 7.1,
      changeType: 'up',
      color: '#3b82f6',
      data: this.generateTrendData(42, 45, 30)
    },
    {
      id: 'satisfaction',
      name: 'Memnuniyet',
      currentValue: 4.2,
      previousValue: 4.0,
      change: 5.0,
      changeType: 'up',
      color: '#22c55e',
      data: this.generateTrendData(4.0, 4.2, 30)
    },
    {
      id: 'complaints',
      name: 'Şikayet Sayısı',
      currentValue: 156,
      previousValue: 184,
      change: -15.2,
      changeType: 'down',
      color: '#ef4444',
      data: this.generateTrendData(184, 156, 30)
    },
    {
      id: 'response',
      name: 'Ort. Yanıt Süresi',
      currentValue: 2.4,
      previousValue: 2.8,
      change: -14.3,
      changeType: 'down',
      color: '#f59e0b',
      data: this.generateTrendData(2.8, 2.4, 30)
    }
  ]);

  yAxisLabels = signal([100, 75, 50, 25, 0]);
  xAxisLabels = signal(['1', '5', '10', '15', '20', '25', '30']);

  trendingTopics = signal<TrendTopic[]>([
    { name: 'Mobil Uygulama', count: 2847, change: 23, sentiment: 'positive' },
    { name: 'Kredi Başvurusu', count: 1923, change: -8, sentiment: 'negative' },
    { name: 'ATM Hizmeti', count: 1456, change: 5, sentiment: 'neutral' },
    { name: 'Müşteri Hizmetleri', count: 1234, change: 12, sentiment: 'positive' },
    { name: 'Online Bankacılık', count: 987, change: -3, sentiment: 'neutral' }
  ]);

  predictions = signal([
    {
      metric: 'NPS Skoru',
      currentValue: 45,
      predictedValue: 48,
      confidence: 87,
      confidenceLevel: 'high',
      insight: 'Mobil uygulama güncellemeleri ve müşteri hizmetleri iyileştirmeleri NPS üzerinde pozitif etki yaratacak.'
    },
    {
      metric: 'Şikayet Oranı',
      currentValue: 3.2,
      predictedValue: 2.8,
      confidence: 72,
      confidenceLevel: 'medium',
      insight: 'Şube bekleme süreleri konusunda yapılan düzenlemeler şikayet oranını düşürecek.'
    },
    {
      metric: 'Memnuniyet Skoru',
      currentValue: 4.2,
      predictedValue: 4.4,
      confidence: 65,
      confidenceLevel: 'medium',
      insight: 'Dijital kanalların geliştirilmesi genel memnuniyeti artıracak.'
    }
  ]);

  anomalies = signal([
    {
      id: 1,
      type: 'Ani Düşüş',
      date: '15 Ocak 2025',
      description: 'Mobil uygulama memnuniyetinde beklenmedik %12 düşüş',
      severity: 'high',
      impact: 78
    },
    {
      id: 2,
      type: 'Trend Değişimi',
      date: '12 Ocak 2025',
      description: 'Şube ziyaret sayılarında alışılmadık artış trendi',
      severity: 'medium',
      impact: 45
    },
    {
      id: 3,
      type: 'Mevsimsel Sapma',
      date: '10 Ocak 2025',
      description: 'Beklenen mevsimsel patternden sapma tespit edildi',
      severity: 'low',
      impact: 23
    }
  ]);

  days = signal(['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']);
  hours = signal(['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']);

  correlationMetrics = signal(['NPS', 'Memnuniyet', 'Şikayet', 'Yanıt Süresi']);
  correlationData: Record<string, Record<string, number>> = {
    'NPS': { 'NPS': 1.00, 'Memnuniyet': 0.89, 'Şikayet': -0.76, 'Yanıt Süresi': -0.52 },
    'Memnuniyet': { 'NPS': 0.89, 'Memnuniyet': 1.00, 'Şikayet': -0.68, 'Yanıt Süresi': -0.45 },
    'Şikayet': { 'NPS': -0.76, 'Memnuniyet': -0.68, 'Şikayet': 1.00, 'Yanıt Süresi': 0.61 },
    'Yanıt Süresi': { 'NPS': -0.52, 'Memnuniyet': -0.45, 'Şikayet': 0.61, 'Yanıt Süresi': 1.00 }
  };

  heatmapData: Record<string, Record<string, number>> = {};

  constructor() {
    this.generateHeatmapData();
  }

  filteredTopics = computed(() => {
    const filter = this.topicFilter;
    const topics = this.trendingTopics();
    
    if (filter === 'rising') {
      return topics.filter(t => t.change > 0);
    } else if (filter === 'falling') {
      return topics.filter(t => t.change < 0);
    }
    return topics;
  });

  generateTrendData(start: number, end: number, points: number): TrendData[] {
    const data: TrendData[] = [];
    const step = (end - start) / points;
    
    for (let i = 0; i < points; i++) {
      data.push({
        date: `Day ${i + 1}`,
        value: start + step * i + (Math.random() - 0.5) * (end - start) * 0.2
      });
    }
    return data;
  }

  generateHeatmapData(): void {
    const days = this.days();
    const hours = this.hours();
    
    days.forEach(day => {
      this.heatmapData[day] = {};
      hours.forEach(hour => {
        // Generate realistic patterns
        let base = 50;
        const hourNum = parseInt(hour);
        
        // More activity during business hours
        if (hourNum >= 9 && hourNum <= 17) base = 80;
        // Less on weekends
        if (day === 'Cmt' || day === 'Paz') base *= 0.6;
        
        this.heatmapData[day][hour] = Math.floor(base + Math.random() * 40);
      });
    });
  }

  toggleMetric(id: string): void {
    this.selectedMetrics.update(selected => {
      if (selected.includes(id)) {
        return selected.filter(m => m !== id);
      } else {
        return [...selected, id];
      }
    });
  }

  getSelectedMetrics(): TrendMetric[] {
    return this.mainMetrics().filter(m => this.selectedMetrics().includes(m.id));
  }

  getMiniChartPath(data: TrendData[]): string {
    if (data.length < 2) return '';
    
    const width = 100;
    const height = 30;
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }

  getChartPath(data: TrendData[]): string {
    if (data.length < 2) return '';
    
    const width = 100;
    const height = 50;
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }

  getHeatmapColor(day: string, hour: string): string {
    const value = this.heatmapData[day]?.[hour] || 0;
    const intensity = value / 120;
    return `rgba(59, 130, 246, ${intensity})`;
  }

  getHeatmapValue(day: string, hour: string): number {
    return this.heatmapData[day]?.[hour] || 0;
  }

  getCorrelation(row: string, col: string): string {
    const value = this.correlationData[row]?.[col] || 0;
    return value.toFixed(2);
  }

  getCorrelationColor(row: string, col: string): string {
    const value = this.correlationData[row]?.[col] || 0;
    
    if (value === 1) return '#e5e7eb';
    if (value > 0.5) return `rgba(34, 197, 94, ${value})`;
    if (value > 0) return `rgba(34, 197, 94, ${value * 0.5})`;
    if (value > -0.5) return `rgba(239, 68, 68, ${Math.abs(value) * 0.5})`;
    return `rgba(239, 68, 68, ${Math.abs(value)})`;
  }

  onPeriodChange(): void {
    // In real app, fetch new data based on period
    console.log('Period changed to:', this.selectedPeriod);
  }
}
