import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Competitor {
  id: string;
  name: string;
  logo?: string;
  color: string;
}

interface MetricComparison {
  metric: string;
  values: { competitorId: string; value: number; trend: 'up' | 'down' | 'stable' }[];
}

@Component({
  selector: 'app-competitor-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="competitor-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Rakip Analizi</h1>
          <p>Sektördeki konumunuzu ve rakiplerinizle karşılaştırmanızı görüntüleyin</p>
        </div>
        <div class="header-actions">
          <select [(ngModel)]="selectedPeriod" class="period-select">
            <option value="7d">Son 7 Gün</option>
            <option value="30d">Son 30 Gün</option>
            <option value="90d">Son 90 Gün</option>
            <option value="1y">Son 1 Yıl</option>
          </select>
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

      <!-- Competitor Selection -->
      <div class="competitor-selection">
        <h2>Karşılaştırma</h2>
        <div class="competitors-grid">
          @for (comp of competitors(); track comp.id) {
            <div 
              class="competitor-card"
              [class.selected]="selectedCompetitors().includes(comp.id)"
              [class.self]="comp.id === 'self'"
              (click)="toggleCompetitor(comp.id)"
            >
              <div class="comp-logo" [style.background-color]="comp.color">
                {{ comp.name.charAt(0) }}
              </div>
              <span class="comp-name">{{ comp.name }}</span>
              @if (selectedCompetitors().includes(comp.id)) {
                <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </div>
          }
        </div>
      </div>

      <!-- Overview Metrics -->
      <div class="metrics-overview">
        <div class="metric-card">
          <div class="metric-header">
            <h3>NPS Skoru</h3>
            <span class="metric-period">Son 30 gün</span>
          </div>
          <div class="metric-chart">
            @for (comp of getSelectedCompetitors(); track comp.id) {
              <div class="chart-bar-group">
                <div class="bar-container">
                  <div 
                    class="bar"
                    [style.height.%]="getNpsHeight(comp.id)"
                    [style.background-color]="comp.color"
                  >
                    <span class="bar-value">{{ getNpsValue(comp.id) }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ comp.name }}</span>
              </div>
            }
          </div>
          <div class="metric-insight">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Sektör ortalamasının <strong>8 puan</strong> üzerinde performans gösteriyorsunuz</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Duygu Dağılımı</h3>
            <span class="metric-period">Son 30 gün</span>
          </div>
          <div class="sentiment-comparison">
            @for (comp of getSelectedCompetitors(); track comp.id) {
              <div class="sentiment-row">
                <span class="comp-label" [style.color]="comp.color">{{ comp.name }}</span>
                <div class="sentiment-bars">
                  <div class="sentiment-bar positive" [style.width.%]="getSentimentValue(comp.id, 'positive')"></div>
                  <div class="sentiment-bar neutral" [style.width.%]="getSentimentValue(comp.id, 'neutral')"></div>
                  <div class="sentiment-bar negative" [style.width.%]="getSentimentValue(comp.id, 'negative')"></div>
                </div>
                <div class="sentiment-values">
                  <span class="positive">{{ getSentimentValue(comp.id, 'positive') }}%</span>
                  <span class="neutral">{{ getSentimentValue(comp.id, 'neutral') }}%</span>
                  <span class="negative">{{ getSentimentValue(comp.id, 'negative') }}%</span>
                </div>
              </div>
            }
          </div>
          <div class="sentiment-legend">
            <span><span class="dot positive"></span> Pozitif</span>
            <span><span class="dot neutral"></span> Nötr</span>
            <span><span class="dot negative"></span> Negatif</span>
          </div>
        </div>
      </div>

      <!-- Detailed Comparison Table -->
      <div class="comparison-section">
        <h2>Detaylı Karşılaştırma</h2>
        <div class="comparison-table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Metrik</th>
                @for (comp of getSelectedCompetitors(); track comp.id) {
                  <th>
                    <div class="th-content">
                      <div class="th-logo" [style.background-color]="comp.color">{{ comp.name.charAt(0) }}</div>
                      {{ comp.name }}
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (metric of comparisonMetrics(); track metric.metric) {
                <tr>
                  <td class="metric-name">{{ metric.metric }}</td>
                  @for (comp of getSelectedCompetitors(); track comp.id) {
                    <td>
                      <div class="metric-value">
                        <span>{{ getMetricValue(metric, comp.id) }}</span>
                        <span class="trend" [class]="getMetricTrend(metric, comp.id)">
                          @switch (getMetricTrend(metric, comp.id)) {
                            @case ('up') {
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"/>
                              </svg>
                            }
                            @case ('down') {
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            }
                            @default {
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                            }
                          }
                        </span>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Channel Comparison -->
      <div class="channel-section">
        <h2>Kanal Bazlı Karşılaştırma</h2>
        <div class="channel-grid">
          @for (channel of channels(); track channel.name) {
            <div class="channel-card">
              <div class="channel-header">
                <div class="channel-icon" [class]="channel.type">
                  @switch (channel.type) {
                    @case ('instagram') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                    }
                    @case ('twitter') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                      </svg>
                    }
                    @case ('google') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                    }
                    @case ('appstore') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                    }
                  }
                </div>
                <span class="channel-name">{{ channel.name }}</span>
              </div>
              <div class="channel-rankings">
                @for (ranking of channel.rankings; track ranking.competitorId; let i = $index) {
                  <div class="ranking-item" [class.self]="ranking.competitorId === 'self'">
                    <span class="rank">{{ i + 1 }}</span>
                    <span class="comp-name">{{ getCompetitorName(ranking.competitorId) }}</span>
                    <span class="score">{{ ranking.score }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Trending Topics -->
      <div class="topics-section">
        <h2>Gündem Konuları</h2>
        <div class="topics-grid">
          @for (topic of trendingTopics(); track topic.name) {
            <div class="topic-card">
              <div class="topic-header">
                <span class="topic-name">{{ topic.name }}</span>
                <span class="topic-trend" [class]="topic.trend">
                  @if (topic.trend === 'up') { 📈 } @else if (topic.trend === 'down') { 📉 } @else { ➡️ }
                </span>
              </div>
              <div class="topic-mentions">
                @for (mention of topic.mentions; track mention.competitorId) {
                  <div class="mention-bar">
                    <span class="mention-name">{{ getCompetitorName(mention.competitorId) }}</span>
                    <div class="mention-progress">
                      <div 
                        class="mention-fill"
                        [style.width.%]="(mention.count / topic.maxMentions) * 100"
                        [style.background-color]="getCompetitorColor(mention.competitorId)"
                      ></div>
                    </div>
                    <span class="mention-count">{{ mention.count }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Insights -->
      <div class="insights-section">
        <h2>AI Öngörüler</h2>
        <div class="insights-grid">
          <div class="insight-card positive">
            <div class="insight-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="insight-content">
              <h4>Güçlü Yön</h4>
              <p>Mobil bankacılık memnuniyetinde sektör lideri konumundasınız. Son 30 günde bu alanda %12 artış kaydettiniz.</p>
            </div>
          </div>
          <div class="insight-card warning">
            <div class="insight-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="insight-content">
              <h4>Dikkat Gerektiren</h4>
              <p>Şube hizmetleri konusunda Banka B ve Banka C sizden önde. Bekleme süreleri konusunda iyileştirme yapılabilir.</p>
            </div>
          </div>
          <div class="insight-card info">
            <div class="insight-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="insight-content">
              <h4>Fırsat</h4>
              <p>Dijital onboarding sürecinde rakiplerinizden %25 daha hızlısınız. Bu avantajı pazarlama mesajlarında kullanabilirsiniz.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .competitor-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
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

    .period-select {
      padding: 10px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
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

    /* Competitor Selection */
    .competitor-selection {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .competitor-selection h2 {
      font-size: 1rem;
      margin-bottom: 16px;
    }

    .competitors-grid {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .competitor-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 2px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .competitor-card:hover {
      border-color: var(--border-color);
    }

    .competitor-card.selected {
      border-color: var(--primary-color);
      background: var(--primary-light);
    }

    .competitor-card.self {
      background: var(--primary-light);
    }

    .comp-logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    .comp-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .check-icon {
      width: 18px;
      height: 18px;
      color: var(--primary-color);
    }

    /* Metrics Overview */
    .metrics-overview {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .metric-header h3 {
      font-size: 1rem;
      margin: 0;
    }

    .metric-period {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .metric-chart {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 180px;
      padding: 20px 0;
    }

    .chart-bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
    }

    .bar-container {
      height: 140px;
      display: flex;
      align-items: flex-end;
      width: 100%;
      justify-content: center;
    }

    .bar {
      width: 40px;
      border-radius: 6px 6px 0 0;
      position: relative;
      min-height: 20px;
    }

    .bar-value {
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-weight: 600;
      font-size: 0.875rem;
    }

    .bar-label {
      margin-top: 8px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-align: center;
    }

    .metric-insight {
      display: flex;
      gap: 10px;
      padding: 12px;
      background: var(--success-light);
      border-radius: 8px;
      font-size: 0.8125rem;
    }

    .metric-insight svg {
      width: 18px;
      height: 18px;
      color: var(--success-color);
      flex-shrink: 0;
    }

    /* Sentiment Comparison */
    .sentiment-comparison {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .sentiment-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .comp-label {
      width: 100px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .sentiment-bars {
      flex: 1;
      height: 24px;
      display: flex;
      border-radius: 4px;
      overflow: hidden;
    }

    .sentiment-bar.positive { background: #22c55e; }
    .sentiment-bar.neutral { background: #f59e0b; }
    .sentiment-bar.negative { background: #ef4444; }

    .sentiment-values {
      display: flex;
      gap: 8px;
      font-size: 0.75rem;
    }

    .sentiment-values .positive { color: #22c55e; }
    .sentiment-values .neutral { color: #f59e0b; }
    .sentiment-values .negative { color: #ef4444; }

    .sentiment-legend {
      display: flex;
      gap: 20px;
      justify-content: center;
    }

    .sentiment-legend span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot.positive { background: #22c55e; }
    .dot.neutral { background: #f59e0b; }
    .dot.negative { background: #ef4444; }

    /* Comparison Table */
    .comparison-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .comparison-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .comparison-table-wrapper {
      overflow-x: auto;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
    }

    .comparison-table th {
      padding: 16px;
      text-align: left;
      font-size: 0.8125rem;
      font-weight: 600;
      border-bottom: 2px solid var(--border-color);
    }

    .th-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .th-logo {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .comparison-table td {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .metric-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .metric-value {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .trend {
      width: 20px;
      height: 20px;
    }

    .trend svg {
      width: 16px;
      height: 16px;
    }

    .trend.up { color: #22c55e; }
    .trend.down { color: #ef4444; }
    .trend.stable { color: #6b7280; }

    /* Channel Comparison */
    .channel-section {
      margin-bottom: 24px;
    }

    .channel-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .channel-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .channel-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .channel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .channel-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .channel-icon svg {
      width: 20px;
      height: 20px;
    }

    .channel-icon.instagram { background: #fce7f3; color: #db2777; }
    .channel-icon.twitter { background: #dbeafe; color: #2563eb; }
    .channel-icon.google { background: #fee2e2; color: #dc2626; }
    .channel-icon.appstore { background: #f3f4f6; color: #374151; }

    .channel-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .channel-rankings {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: var(--bg-secondary);
      border-radius: 6px;
    }

    .ranking-item.self {
      background: var(--primary-light);
    }

    .rank {
      width: 20px;
      height: 20px;
      background: var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 600;
    }

    .ranking-item:first-child .rank {
      background: #fef3c7;
      color: #d97706;
    }

    .ranking-item .comp-name {
      flex: 1;
      font-size: 0.8125rem;
    }

    .ranking-item .score {
      font-weight: 600;
      font-size: 0.875rem;
    }

    /* Topics Section */
    .topics-section {
      margin-bottom: 24px;
    }

    .topics-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .topics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .topic-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .topic-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .topic-name {
      font-weight: 500;
    }

    .topic-trend {
      font-size: 1.25rem;
    }

    .topic-mentions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mention-bar {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mention-name {
      width: 80px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .mention-progress {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .mention-fill {
      height: 100%;
      border-radius: 4px;
    }

    .mention-count {
      width: 40px;
      font-size: 0.75rem;
      text-align: right;
    }

    /* Insights Section */
    .insights-section h2 {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .insight-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      border-radius: 12px;
    }

    .insight-card.positive {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .insight-card.warning {
      background: #fefce8;
      border: 1px solid #fef08a;
    }

    .insight-card.info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }

    .insight-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .insight-card.positive .insight-icon {
      background: #dcfce7;
      color: #22c55e;
    }

    .insight-card.warning .insight-icon {
      background: #fef3c7;
      color: #f59e0b;
    }

    .insight-card.info .insight-icon {
      background: #dbeafe;
      color: #3b82f6;
    }

    .insight-icon svg {
      width: 20px;
      height: 20px;
    }

    .insight-content h4 {
      font-size: 0.875rem;
      margin-bottom: 6px;
    }

    .insight-content p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 1200px) {
      .metrics-overview {
        grid-template-columns: 1fr;
      }

      .channel-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .topics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .channel-grid,
      .topics-grid,
      .insights-grid {
        grid-template-columns: 1fr;
      }

      .competitors-grid {
        flex-direction: column;
      }
    }
  `]
})
export class CompetitorAnalysisComponent {
  selectedPeriod = '30d';
  selectedCompetitors = signal<string[]>(['self', 'comp1', 'comp2']);

  competitors = signal<Competitor[]>([
    { id: 'self', name: 'Albaraka Türk', color: '#059669' },
    { id: 'comp1', name: 'Banka A', color: '#2563eb' },
    { id: 'comp2', name: 'Banka B', color: '#dc2626' },
    { id: 'comp3', name: 'Banka C', color: '#7c3aed' },
    { id: 'comp4', name: 'Banka D', color: '#f59e0b' }
  ]);

  npsScores: Record<string, number> = {
    'self': 45,
    'comp1': 38,
    'comp2': 42,
    'comp3': 35,
    'comp4': 40
  };

  sentimentData: Record<string, { positive: number; neutral: number; negative: number }> = {
    'self': { positive: 65, neutral: 25, negative: 10 },
    'comp1': { positive: 55, neutral: 30, negative: 15 },
    'comp2': { positive: 60, neutral: 25, negative: 15 },
    'comp3': { positive: 50, neutral: 35, negative: 15 },
    'comp4': { positive: 58, neutral: 28, negative: 14 }
  };

  comparisonMetrics = signal<MetricComparison[]>([
    { 
      metric: 'Mobil Uygulama Puanı',
      values: [
        { competitorId: 'self', value: 4.6, trend: 'up' },
        { competitorId: 'comp1', value: 4.3, trend: 'stable' },
        { competitorId: 'comp2', value: 4.5, trend: 'up' }
      ]
    },
    { 
      metric: 'Ortalama Yanıt Süresi',
      values: [
        { competitorId: 'self', value: 2.4, trend: 'down' },
        { competitorId: 'comp1', value: 3.1, trend: 'stable' },
        { competitorId: 'comp2', value: 2.8, trend: 'down' }
      ]
    },
    { 
      metric: 'Müşteri Şikayet Oranı',
      values: [
        { competitorId: 'self', value: 3.2, trend: 'down' },
        { competitorId: 'comp1', value: 4.5, trend: 'up' },
        { competitorId: 'comp2', value: 3.8, trend: 'stable' }
      ]
    },
    { 
      metric: 'Sosyal Medya Etkileşimi',
      values: [
        { competitorId: 'self', value: 8750, trend: 'up' },
        { competitorId: 'comp1', value: 6200, trend: 'up' },
        { competitorId: 'comp2', value: 7100, trend: 'stable' }
      ]
    }
  ]);

  channels = signal([
    {
      name: 'Instagram',
      type: 'instagram',
      rankings: [
        { competitorId: 'self', score: 4.7 },
        { competitorId: 'comp2', score: 4.5 },
        { competitorId: 'comp1', score: 4.2 }
      ]
    },
    {
      name: 'Twitter/X',
      type: 'twitter',
      rankings: [
        { competitorId: 'comp1', score: 4.4 },
        { competitorId: 'self', score: 4.3 },
        { competitorId: 'comp2', score: 4.1 }
      ]
    },
    {
      name: 'Google Reviews',
      type: 'google',
      rankings: [
        { competitorId: 'self', score: 4.5 },
        { competitorId: 'comp1', score: 4.3 },
        { competitorId: 'comp2', score: 4.0 }
      ]
    },
    {
      name: 'App Store',
      type: 'appstore',
      rankings: [
        { competitorId: 'self', score: 4.6 },
        { competitorId: 'comp2', score: 4.4 },
        { competitorId: 'comp1', score: 4.2 }
      ]
    }
  ]);

  trendingTopics = signal([
    {
      name: 'Mobil Bankacılık',
      trend: 'up',
      maxMentions: 450,
      mentions: [
        { competitorId: 'self', count: 450 },
        { competitorId: 'comp1', count: 320 },
        { competitorId: 'comp2', count: 280 }
      ]
    },
    {
      name: 'Müşteri Hizmetleri',
      trend: 'stable',
      maxMentions: 380,
      mentions: [
        { competitorId: 'comp1', count: 380 },
        { competitorId: 'self', count: 290 },
        { competitorId: 'comp2', count: 250 }
      ]
    },
    {
      name: 'Kredi Faiz Oranları',
      trend: 'up',
      maxMentions: 520,
      mentions: [
        { competitorId: 'comp2', count: 520 },
        { competitorId: 'self', count: 410 },
        { competitorId: 'comp1', count: 350 }
      ]
    }
  ]);

  toggleCompetitor(id: string): void {
    if (id === 'self') return; // Can't deselect self
    
    this.selectedCompetitors.update(selected => {
      if (selected.includes(id)) {
        return selected.filter(c => c !== id);
      } else {
        return [...selected, id];
      }
    });
  }

  getSelectedCompetitors(): Competitor[] {
    return this.competitors().filter(c => this.selectedCompetitors().includes(c.id));
  }

  getNpsValue(competitorId: string): number {
    return this.npsScores[competitorId] || 0;
  }

  getNpsHeight(competitorId: string): number {
    const value = this.getNpsValue(competitorId);
    const max = Math.max(...Object.values(this.npsScores));
    return (value / max) * 100;
  }

  getSentimentValue(competitorId: string, type: 'positive' | 'neutral' | 'negative'): number {
    return this.sentimentData[competitorId]?.[type] || 0;
  }

  getMetricValue(metric: MetricComparison, competitorId: string): string {
    const data = metric.values.find(v => v.competitorId === competitorId);
    if (!data) return '-';
    return data.value >= 1000 ? data.value.toLocaleString() : data.value.toString();
  }

  getMetricTrend(metric: MetricComparison, competitorId: string): string {
    const data = metric.values.find(v => v.competitorId === competitorId);
    return data?.trend || 'stable';
  }

  getCompetitorName(id: string): string {
    return this.competitors().find(c => c.id === id)?.name || id;
  }

  getCompetitorColor(id: string): string {
    return this.competitors().find(c => c.id === id)?.color || '#6b7280';
  }
}
