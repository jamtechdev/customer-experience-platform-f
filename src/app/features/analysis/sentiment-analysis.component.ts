import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalysisService, FeedbackService } from '../../core/services';
import { 
  SentimentAnalysisResult, 
  SentimentType, 
  FeedbackSource,
  FeedbackCategory 
} from '../../core/models';

// Local type alias for component usage
type SentimentAnalysis = SentimentAnalysisResult;
type Sentiment = SentimentType;

@Component({
  selector: 'app-sentiment-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sentiment-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Duygu Analizi</h1>
          <p class="subtitle">Yapay zeka destekli müşteri geri bildirim duygu analizi</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportReport()">
            <i class="icon icon-download"></i>
            Rapor İndir
          </button>
          <button class="btn btn-primary" (click)="refreshAnalysis()">
            <i class="icon icon-refresh-cw"></i>
            Yenile
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-row">
          <div class="date-range">
            <label>Tarih Aralığı</label>
            <div class="date-inputs">
              <input type="date" [(ngModel)]="filters.startDate">
              <span>-</span>
              <input type="date" [(ngModel)]="filters.endDate">
            </div>
          </div>
          <div class="filter-group">
            <select [(ngModel)]="filters.source" (ngModelChange)="applyFilters()">
              <option value="">Tüm Kaynaklar</option>
              <option value="TWITTER">Twitter/X</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="GOOGLE_REVIEWS">Google Yorumları</option>
              <option value="APP_STORE">App Store</option>
              <option value="PLAY_STORE">Play Store</option>
              <option value="CALL_CENTER">Çağrı Merkezi</option>
              <option value="SIKAYETVAR">Şikayetvar</option>
            </select>
            <select [(ngModel)]="filters.category" (ngModelChange)="applyFilters()">
              <option value="">Tüm Kategoriler</option>
              <option value="PRODUCT">Ürün</option>
              <option value="SERVICE">Hizmet</option>
              <option value="PRICE">Fiyat</option>
              <option value="SUPPORT">Destek</option>
              <option value="UX">Kullanıcı Deneyimi</option>
            </select>
            <button class="btn btn-secondary" (click)="applyFilters()">
              <i class="icon icon-filter"></i>
              Uygula
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="overview-cards">
        <div class="sentiment-card positive">
          <div class="sentiment-icon">
            <i class="icon icon-smile"></i>
          </div>
          <div class="sentiment-info">
            <span class="sentiment-value">{{sentimentSummary().positive}}%</span>
            <span class="sentiment-label">Pozitif</span>
            <span class="sentiment-count">{{sentimentCounts().positive}} geri bildirim</span>
          </div>
          <div class="sentiment-trend up">
            <i class="icon icon-trending-up"></i>
            +2.3%
          </div>
        </div>

        <div class="sentiment-card neutral">
          <div class="sentiment-icon">
            <i class="icon icon-meh"></i>
          </div>
          <div class="sentiment-info">
            <span class="sentiment-value">{{sentimentSummary().neutral}}%</span>
            <span class="sentiment-label">Nötr</span>
            <span class="sentiment-count">{{sentimentCounts().neutral}} geri bildirim</span>
          </div>
          <div class="sentiment-trend">
            <i class="icon icon-minus"></i>
            0.0%
          </div>
        </div>

        <div class="sentiment-card negative">
          <div class="sentiment-icon">
            <i class="icon icon-frown"></i>
          </div>
          <div class="sentiment-info">
            <span class="sentiment-value">{{sentimentSummary().negative}}%</span>
            <span class="sentiment-label">Negatif</span>
            <span class="sentiment-count">{{sentimentCounts().negative}} geri bildirim</span>
          </div>
          <div class="sentiment-trend down">
            <i class="icon icon-trending-down"></i>
            -1.5%
          </div>
        </div>

        <div class="overall-card">
          <div class="overall-score">
            <svg viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#e5e7eb" 
                stroke-width="10"
              />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                [attr.stroke]="getScoreColor(overallScore())"
                stroke-width="10"
                stroke-linecap="round"
                [attr.stroke-dasharray]="getScoreArc(overallScore())"
                stroke-dashoffset="0"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="50" text-anchor="middle" dy="0.3em" class="score-text">
                {{overallScore()}}
              </text>
            </svg>
          </div>
          <div class="overall-info">
            <span class="overall-label">Genel Duygu Skoru</span>
            <span class="overall-desc">{{getScoreLabel(overallScore())}}</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Trend Chart -->
        <div class="chart-card large">
          <div class="chart-header">
            <h3>Duygu Trendi</h3>
            <div class="chart-legend">
              <span class="legend-item positive"><span class="dot"></span> Pozitif</span>
              <span class="legend-item neutral"><span class="dot"></span> Nötr</span>
              <span class="legend-item negative"><span class="dot"></span> Negatif</span>
            </div>
          </div>
          <div class="chart-body trend-chart">
            <div class="trend-bars">
              @for (point of trendData(); track point.date) {
                <div class="trend-bar-group">
                  <div class="stacked-bar">
                    <div class="bar-segment positive" [style.height.%]="point.positive"></div>
                    <div class="bar-segment neutral" [style.height.%]="point.neutral"></div>
                    <div class="bar-segment negative" [style.height.%]="point.negative"></div>
                  </div>
                  <span class="bar-label">{{point.date | date:'d MMM'}}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Source Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Kaynak Dağılımı</h3>
          </div>
          <div class="chart-body">
            <div class="source-list">
              @for (source of sourceDistribution(); track source.source) {
                <div class="source-item">
                  <div class="source-info">
                    <span class="source-icon">
                      <i class="icon icon-{{getSourceIcon(source.source)}}"></i>
                    </span>
                    <span class="source-name">{{source.source}}</span>
                  </div>
                  <div class="source-sentiment">
                    <div class="mini-bar">
                      <div class="bar-fill positive" [style.width.%]="source.positive"></div>
                      <div class="bar-fill neutral" [style.width.%]="source.neutral"></div>
                      <div class="bar-fill negative" [style.width.%]="source.negative"></div>
                    </div>
                    <span class="source-count">{{source.count}}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>Kategori Analizi</h3>
          </div>
          <div class="chart-body">
            <div class="category-list">
              @for (category of categoryAnalysis(); track category.category) {
                <div class="category-item">
                  <div class="category-header">
                    <span class="category-name">{{getCategoryLabel(category.category)}}</span>
                    <span class="category-score" [class]="getScoreClass(category.score)">
                      {{category.score}}
                    </span>
                  </div>
                  <div class="category-bar">
                    <div class="bar-track">
                      <div class="bar-fill" [style.width.%]="category.score" [class]="getScoreClass(category.score)"></div>
                    </div>
                  </div>
                  <div class="category-stats">
                    <span class="stat positive">{{category.positive}}%</span>
                    <span class="stat neutral">{{category.neutral}}%</span>
                    <span class="stat negative">{{category.negative}}%</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Word Cloud & Keywords -->
      <div class="analysis-section">
        <div class="word-cloud-card">
          <div class="card-header">
            <h3>Kelime Bulutu</h3>
            <div class="cloud-filters">
              <button 
                class="cloud-filter" 
                [class.active]="wordCloudFilter() === 'all'"
                (click)="wordCloudFilter.set('all')"
              >Tümü</button>
              <button 
                class="cloud-filter positive" 
                [class.active]="wordCloudFilter() === 'positive'"
                (click)="wordCloudFilter.set('positive')"
              >Pozitif</button>
              <button 
                class="cloud-filter negative" 
                [class.active]="wordCloudFilter() === 'negative'"
                (click)="wordCloudFilter.set('negative')"
              >Negatif</button>
            </div>
          </div>
          <div class="word-cloud">
            @for (word of filteredWords(); track word.text) {
              <span 
                class="cloud-word" 
                [style.font-size.rem]="getWordSize(word.weight)"
                [class]="word.sentiment"
              >
                {{word.text}}
              </span>
            }
          </div>
        </div>

        <div class="keywords-card">
          <div class="card-header">
            <h3>Öne Çıkan Anahtar Kelimeler</h3>
          </div>
          <div class="keywords-section">
            <div class="keyword-group positive">
              <h4><i class="icon icon-thumbs-up"></i> Olumlu Kelimeler</h4>
              <div class="keyword-tags">
                @for (word of topPositiveWords(); track word) {
                  <span class="keyword-tag positive">{{word}}</span>
                }
              </div>
            </div>
            <div class="keyword-group negative">
              <h4><i class="icon icon-thumbs-down"></i> Olumsuz Kelimeler</h4>
              <div class="keyword-tags">
                @for (word of topNegativeWords(); track word) {
                  <span class="keyword-tag negative">{{word}}</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Feedbacks with Sentiment -->
      <div class="recent-section">
        <div class="section-header">
          <h3>Son Analiz Edilen Geri Bildirimler</h3>
          <a routerLink="/feedback" class="view-all">Tümünü Gör →</a>
        </div>
        <div class="feedback-list">
          @for (feedback of recentFeedbacks(); track feedback.id) {
            <div class="feedback-item">
              <div class="feedback-sentiment">
                <span class="sentiment-badge" [class]="feedback.sentiment?.sentiment?.toLowerCase()">
                  {{getSentimentEmoji(feedback.sentiment?.sentiment)}}
                </span>
                <span class="confidence">%{{feedback.sentiment?.confidence || 0}}</span>
              </div>
              <div class="feedback-content">
                <p class="feedback-text">{{feedback.content}}</p>
                <div class="feedback-meta">
                  <span class="source">
                    <i class="icon icon-{{getSourceIcon(feedback.source)}}"></i>
                    {{feedback.source}}
                  </span>
                  <span class="date">{{feedback.createdAt | date:'short'}}</span>
                </div>
              </div>
              <div class="feedback-entities">
                @for (entity of feedback.sentiment?.entities?.slice(0, 3) || []; track entity) {
                  <span class="entity-tag" [class]="entity.sentiment?.toLowerCase()">{{entity.text}}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sentiment-page {
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

    /* Filters */
    .filters-section {
      background: #fff;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .filter-row {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
    }

    .date-range {
      label {
        display: block;
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
        margin-bottom: 0.375rem;
      }
    }

    .date-inputs {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      input {
        padding: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      span {
        color: var(--text-secondary, #9ca3af);
      }
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

    /* Overview Cards */
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .sentiment-card {
      background: #fff;
      padding: 1.25rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;

      &.positive {
        border-left: 4px solid #10b981;
        .sentiment-icon { background: #d1fae5; color: #059669; }
      }
      &.neutral {
        border-left: 4px solid #9ca3af;
        .sentiment-icon { background: #f3f4f6; color: #6b7280; }
      }
      &.negative {
        border-left: 4px solid #ef4444;
        .sentiment-icon { background: #fee2e2; color: #dc2626; }
      }
    }

    .sentiment-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      .icon {
        width: 24px;
        height: 24px;
      }
    }

    .sentiment-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .sentiment-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .sentiment-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary, #1f2937);
    }

    .sentiment-count {
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);
    }

    .sentiment-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary, #6b7280);

      &.up { color: #10b981; }
      &.down { color: #ef4444; }
    }

    .overall-card {
      background: #fff;
      padding: 1.25rem;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .overall-score {
      width: 80px;
      height: 80px;

      svg {
        width: 100%;
        height: 100%;
      }

      .score-text {
        font-size: 1.5rem;
        font-weight: 700;
        fill: var(--text-primary, #1f2937);
      }
    }

    .overall-info {
      display: flex;
      flex-direction: column;
    }

    .overall-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary, #1f2937);
    }

    .overall-desc {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
    }

    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .chart-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      &.large {
        grid-row: span 1;
      }
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h3 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }
    }

    .chart-legend {
      display: flex;
      gap: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      &.positive .dot { background: #10b981; }
      &.neutral .dot { background: #9ca3af; }
      &.negative .dot { background: #ef4444; }
    }

    .chart-body {
      padding: 1rem 1.25rem;
    }

    /* Trend Chart */
    .trend-chart {
      height: 200px;
    }

    .trend-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 100%;
      gap: 0.5rem;
    }

    .trend-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .stacked-bar {
      width: 100%;
      max-width: 24px;
      height: 160px;
      display: flex;
      flex-direction: column-reverse;
      border-radius: 4px 4px 0 0;
      overflow: hidden;
    }

    .bar-segment {
      width: 100%;
      transition: height 0.3s ease;

      &.positive { background: #10b981; }
      &.neutral { background: #9ca3af; }
      &.negative { background: #ef4444; }
    }

    .bar-label {
      margin-top: 0.5rem;
      font-size: 0.625rem;
      color: var(--text-secondary, #9ca3af);
    }

    /* Source Distribution */
    .source-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .source-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .source-icon {
      width: 24px;
      height: 24px;
      border-radius: 0.25rem;
      background: var(--bg-secondary, #f3f4f6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .source-name {
      font-size: 0.8125rem;
    }

    .source-sentiment {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .mini-bar {
      width: 80px;
      height: 8px;
      display: flex;
      border-radius: 4px;
      overflow: hidden;

      .bar-fill {
        height: 100%;
        &.positive { background: #10b981; }
        &.neutral { background: #9ca3af; }
        &.negative { background: #ef4444; }
      }
    }

    .source-count {
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);
      min-width: 32px;
      text-align: right;
    }

    /* Category Analysis */
    .category-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .category-item {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-name {
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .category-score {
      font-size: 0.8125rem;
      font-weight: 600;

      &.good { color: #10b981; }
      &.average { color: #f59e0b; }
      &.poor { color: #ef4444; }
    }

    .category-bar {
      .bar-track {
        width: 100%;
        height: 6px;
        background: var(--border-color, #e5e7eb);
        border-radius: 3px;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 3px;

        &.good { background: #10b981; }
        &.average { background: #f59e0b; }
        &.poor { background: #ef4444; }
      }
    }

    .category-stats {
      display: flex;
      gap: 0.75rem;

      .stat {
        font-size: 0.6875rem;

        &.positive { color: #10b981; }
        &.neutral { color: #6b7280; }
        &.negative { color: #ef4444; }
      }
    }

    /* Word Cloud & Keywords */
    .analysis-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .word-cloud-card, .keywords-card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h3 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }
    }

    .cloud-filters {
      display: flex;
      gap: 0.375rem;
    }

    .cloud-filter {
      padding: 0.25rem 0.625rem;
      border: 1px solid var(--border-color, #e5e7eb);
      background: #fff;
      border-radius: 9999px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover { background: var(--hover-bg, #f3f4f6); }
      &.active { background: var(--primary-color, #3b82f6); color: #fff; border-color: transparent; }
      &.positive.active { background: #10b981; }
      &.negative.active { background: #ef4444; }
    }

    .word-cloud {
      padding: 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.5rem 1rem;
      min-height: 200px;
    }

    .cloud-word {
      transition: transform 0.2s;
      cursor: pointer;

      &:hover { transform: scale(1.1); }
      &.positive { color: #10b981; }
      &.neutral { color: #6b7280; }
      &.negative { color: #ef4444; }
    }

    .keywords-section {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .keyword-group {
      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.8125rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .icon {
          width: 16px;
          height: 16px;
        }
      }

      &.positive h4 { color: #059669; }
      &.negative h4 { color: #dc2626; }
    }

    .keyword-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .keyword-tag {
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8125rem;

      &.positive {
        background: #d1fae5;
        color: #047857;
      }
      &.negative {
        background: #fee2e2;
        color: #b91c1c;
      }
    }

    /* Recent Feedbacks */
    .recent-section {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      h3 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }
    }

    .view-all {
      font-size: 0.8125rem;
      color: var(--primary-color, #3b82f6);
      text-decoration: none;

      &:hover { text-decoration: underline; }
    }

    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .feedback-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
    }

    .feedback-sentiment {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .sentiment-badge {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;

      &.positive { background: #d1fae5; }
      &.neutral { background: #f3f4f6; }
      &.negative { background: #fee2e2; }
    }

    .confidence {
      font-size: 0.625rem;
      color: var(--text-secondary, #9ca3af);
    }

    .feedback-content {
      flex: 1;
    }

    .feedback-text {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .feedback-meta {
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

    .feedback-entities {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .entity-tag {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.6875rem;

      &.positive { background: #d1fae5; color: #047857; }
      &.neutral { background: #f3f4f6; color: #6b7280; }
      &.negative { background: #fee2e2; color: #b91c1c; }
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    @media (max-width: 1280px) {
      .charts-section {
        grid-template-columns: 1fr 1fr;
      }

      .chart-card.large {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
      .overview-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-section {
        grid-template-columns: 1fr;
      }

      .chart-card.large {
        grid-column: span 1;
      }

      .analysis-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SentimentAnalysisComponent implements OnInit {
  private analysisService = inject(AnalysisService);
  private feedbackService = inject(FeedbackService);

  filters = {
    startDate: '',
    endDate: '',
    source: '',
    category: ''
  };

  sentimentSummary = signal({ positive: 45, neutral: 30, negative: 25 });
  sentimentCounts = signal({ positive: 4523, neutral: 3012, negative: 2456 });
  overallScore = signal(72);
  
  // Additional signals for export report
  sentimentScore = signal(72);
  positiveTrend = signal(2.3);
  negativeTrend = signal(-1.5);
  
  trendData = signal<any[]>([]);
  sourceDistribution = signal<any[]>([]);
  categoryAnalysis = signal<any[]>([]);
  
  wordCloudFilter = signal<'all' | 'positive' | 'negative'>('all');
  wordCloudData = signal<any[]>([]);
  
  topPositiveWords = signal<string[]>(['hızlı', 'kolay', 'memnun', 'güvenli', 'kaliteli']);
  topNegativeWords = signal<string[]>(['yavaş', 'sorunlu', 'hata', 'bekleme', 'karmaşık']);
  
  recentFeedbacks = signal<any[]>([]);

  filteredWords = computed(() => {
    const filter = this.wordCloudFilter();
    const words = this.wordCloudData();
    
    if (filter === 'all') return words;
    return words.filter(w => w.sentiment === filter);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Load trend data
    this.trendData.set([
      { date: new Date('2024-01-01'), positive: 45, neutral: 30, negative: 25 },
      { date: new Date('2024-01-08'), positive: 48, neutral: 28, negative: 24 },
      { date: new Date('2024-01-15'), positive: 42, neutral: 32, negative: 26 },
      { date: new Date('2024-01-22'), positive: 50, neutral: 27, negative: 23 },
      { date: new Date('2024-01-29'), positive: 47, neutral: 31, negative: 22 },
      { date: new Date('2024-02-05'), positive: 52, neutral: 28, negative: 20 },
      { date: new Date('2024-02-12'), positive: 49, neutral: 30, negative: 21 }
    ]);

    // Load source distribution
    this.sourceDistribution.set([
      { source: 'Twitter', positive: 40, neutral: 35, negative: 25, count: 1234 },
      { source: 'Instagram', positive: 55, neutral: 30, negative: 15, count: 987 },
      { source: 'Google', positive: 35, neutral: 25, negative: 40, count: 765 },
      { source: 'Şikayetvar', positive: 15, neutral: 20, negative: 65, count: 543 },
      { source: 'Çağrı Merkezi', positive: 30, neutral: 40, negative: 30, count: 432 }
    ]);

    // Load category analysis
    this.categoryAnalysis.set([
      { category: 'PRODUCT', score: 78, positive: 55, neutral: 25, negative: 20 },
      { category: 'SERVICE', score: 65, positive: 40, neutral: 30, negative: 30 },
      { category: 'UX', score: 72, positive: 50, neutral: 28, negative: 22 },
      { category: 'SUPPORT', score: 58, positive: 35, neutral: 25, negative: 40 },
      { category: 'PRICE', score: 45, positive: 25, neutral: 30, negative: 45 }
    ]);

    // Load word cloud data
    this.wordCloudData.set([
      { text: 'hızlı', weight: 50, sentiment: 'positive' },
      { text: 'kolay', weight: 45, sentiment: 'positive' },
      { text: 'memnun', weight: 40, sentiment: 'positive' },
      { text: 'güvenli', weight: 35, sentiment: 'positive' },
      { text: 'sorun', weight: 42, sentiment: 'negative' },
      { text: 'yavaş', weight: 38, sentiment: 'negative' },
      { text: 'hata', weight: 32, sentiment: 'negative' },
      { text: 'bekleme', weight: 28, sentiment: 'negative' },
      { text: 'normal', weight: 30, sentiment: 'neutral' },
      { text: 'faydalı', weight: 25, sentiment: 'positive' },
      { text: 'karmaşık', weight: 22, sentiment: 'negative' },
      { text: 'pratik', weight: 33, sentiment: 'positive' }
    ]);

    // Load recent feedbacks
    this.feedbackService.getFeedback(undefined, { page: 1, pageSize: 5 }).subscribe((response: any) => {
      if (response.success) {
        this.recentFeedbacks.set(response.data.slice(0, 5));
      }
    });
  }

  applyFilters(): void {
    this.loadData();
  }

  refreshAnalysis(): void {
    this.loadData();
  }

  exportReport(): void {
    // Export report functionality
    const reportData = {
      sentimentScore: this.sentimentScore(),
      positiveTrend: this.positiveTrend(),
      negativeTrend: this.negativeTrend(),
      trendData: this.trendData(),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sentiment-analysis-report.json';
    a.click();
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getScoreArc(score: number): string {
    const circumference = 2 * Math.PI * 45;
    const arc = (score / 100) * circumference;
    return `${arc} ${circumference}`;
  }

  getScoreLabel(score: number): string {
    if (score >= 70) return 'Olumlu genel algı';
    if (score >= 50) return 'Nötr genel algı';
    return 'Olumsuz genel algı';
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'good';
    if (score >= 50) return 'average';
    return 'poor';
  }

  getSourceIcon(source: string): string {
    const icons: Record<string, string> = {
      'TWITTER': 'twitter',
      'Twitter': 'twitter',
      'INSTAGRAM': 'instagram',
      'Instagram': 'instagram',
      'FACEBOOK': 'facebook',
      'GOOGLE_REVIEWS': 'map-pin',
      'Google': 'map-pin',
      'SIKAYETVAR': 'message-circle',
      'Şikayetvar': 'message-circle',
      'CALL_CENTER': 'phone',
      'Çağrı Merkezi': 'phone',
      'APP_STORE': 'smartphone',
      'PLAY_STORE': 'smartphone'
    };
    return icons[source] || 'message-square';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'PRODUCT': 'Ürün',
      'SERVICE': 'Hizmet',
      'PRICE': 'Fiyat',
      'SUPPORT': 'Destek',
      'UX': 'Kullanıcı Deneyimi'
    };
    return labels[category] || category;
  }

  getWordSize(weight: number): number {
    return 0.75 + (weight / 50) * 1.5;
  }

  getSentimentEmoji(sentiment?: SentimentType): string {
    const emojis: Record<SentimentType, string> = {
      [SentimentType.POSITIVE]: '😊',
      [SentimentType.NEUTRAL]: '😐',
      [SentimentType.NEGATIVE]: '😞',
      [SentimentType.MIXED]: '🤔'
    };
    return emojis[sentiment || SentimentType.NEUTRAL] || '😐';
  }
}
