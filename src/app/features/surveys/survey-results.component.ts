import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface SurveyResponse {
  id: string;
  respondentId?: string;
  submittedAt: Date;
  answers: { questionId: string; value: any }[];
  npsScore?: number;
  csatScore?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface QuestionSummary {
  questionId: string;
  questionText: string;
  questionType: string;
  responseCount: number;
  averageScore?: number;
  distribution?: { label: string; count: number; percentage: number }[];
  textResponses?: string[];
}

@Component({
  selector: 'app-survey-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="survey-results">
      <!-- Header -->
      <div class="results-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div class="title-section">
            <h1>{{ surveyTitle() }}</h1>
            <span class="response-count">{{ totalResponses() }} yanıt</span>
          </div>
        </div>
        <div class="header-actions">
          <select [(ngModel)]="dateRange" class="date-select">
            <option value="7d">Son 7 gün</option>
            <option value="30d">Son 30 gün</option>
            <option value="90d">Son 90 gün</option>
            <option value="all">Tümü</option>
          </select>
          <button class="btn btn-outline" (click)="exportResults()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Dışa Aktar
          </button>
          <button class="btn btn-primary" (click)="viewResponses()">
            Yanıtları Gör
          </button>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="stats-overview">
        <div class="stat-card primary">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalResponses() }}</span>
            <span class="stat-label">Toplam Yanıt</span>
          </div>
          <span class="stat-trend up">+12%</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon completion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ completionRate() }}%</span>
            <span class="stat-label">Tamamlanma Oranı</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ avgCompletionTime() }}</span>
            <span class="stat-label">Ort. Tamamlama Süresi</span>
          </div>
        </div>

        <div class="stat-card nps">
          <div class="nps-score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                [attr.stroke]="getNpsColor(npsScore())" 
                stroke-width="8"
                stroke-linecap="round"
                [attr.stroke-dasharray]="getNpsDashArray(npsScore())"
                stroke-dashoffset="70.5"
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" 
                    font-size="24" font-weight="bold">{{ npsScore() }}</text>
              <text x="50" y="68" text-anchor="middle" font-size="8" fill="#6b7280">NPS</text>
            </svg>
          </div>
          <div class="nps-breakdown">
            <div class="nps-segment promoters">
              <span class="segment-value">{{ npsBreakdown().promoters }}%</span>
              <span class="segment-label">Destekleyenler</span>
            </div>
            <div class="nps-segment passives">
              <span class="segment-value">{{ npsBreakdown().passives }}%</span>
              <span class="segment-label">Pasifler</span>
            </div>
            <div class="nps-segment detractors">
              <span class="segment-value">{{ npsBreakdown().detractors }}%</span>
              <span class="segment-label">Eleştirenler</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="trend-section">
        <div class="section-header">
          <h2>Yanıt Trendi</h2>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot responses"></span> Yanıtlar</span>
            <span class="legend-item"><span class="dot nps"></span> NPS</span>
          </div>
        </div>
        <div class="trend-chart">
          <div class="chart-area">
            @for (point of trendData(); track $index) {
              <div class="chart-bar-group">
                <div class="bar-container">
                  <div 
                    class="bar responses" 
                    [style.height.%]="(point.responses / maxResponses()) * 100"
                  >
                    <span class="bar-value">{{ point.responses }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ point.date }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Question Breakdown -->
      <div class="questions-section">
        <div class="section-header">
          <h2>Soru Bazlı Analiz</h2>
        </div>

        @for (question of questionSummaries(); track question.questionId) {
          <div class="question-result-card">
            <div class="question-header">
              <span class="question-text">{{ question.questionText }}</span>
              <span class="question-meta">{{ question.responseCount }} yanıt</span>
            </div>

            @switch (question.questionType) {
              @case ('NPS') {
                <div class="nps-result">
                  <div class="nps-distribution">
                    @for (item of question.distribution; track item.label) {
                      <div class="dist-item" [class]="getNpsClass(+item.label)">
                        <span class="dist-number">{{ item.label }}</span>
                        <div class="dist-bar">
                          <div class="dist-fill" [style.width.%]="item.percentage"></div>
                        </div>
                        <span class="dist-count">{{ item.count }}</span>
                      </div>
                    }
                  </div>
                  <div class="nps-avg">
                    <span class="avg-label">Ortalama Skor</span>
                    <span class="avg-value">{{ question.averageScore?.toFixed(1) }}</span>
                  </div>
                </div>
              }
              @case ('RATING') {
                <div class="rating-result">
                  <div class="rating-stars">
                    @for (star of [1,2,3,4,5]; track star) {
                      <div class="star-row">
                        <div class="star-icons">
                          @for (s of getStarArray(star); track $index) {
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          }
                        </div>
                        <div class="star-bar">
                          <div 
                            class="star-fill" 
                            [style.width.%]="getDistPercentage(question.distribution, star.toString())"
                          ></div>
                        </div>
                        <span class="star-count">{{ getDistCount(question.distribution, star.toString()) }}</span>
                      </div>
                    }
                  </div>
                  <div class="rating-avg">
                    <span class="avg-value">{{ question.averageScore?.toFixed(1) }}</span>
                    <div class="avg-stars">
                      @for (s of [1,2,3,4,5]; track s) {
                        <svg viewBox="0 0 24 24" [class.filled]="s <= (question.averageScore || 0)">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      }
                    </div>
                  </div>
                </div>
              }
              @case ('CHOICE') {
                <div class="choice-result">
                  @for (item of question.distribution; track item.label) {
                    <div class="choice-item">
                      <div class="choice-label">{{ item.label }}</div>
                      <div class="choice-bar">
                        <div class="choice-fill" [style.width.%]="item.percentage"></div>
                      </div>
                      <div class="choice-stats">
                        <span class="choice-pct">{{ item.percentage }}%</span>
                        <span class="choice-count">({{ item.count }})</span>
                      </div>
                    </div>
                  }
                </div>
              }
              @case ('MULTIPLE') {
                <div class="choice-result multiple">
                  @for (item of question.distribution; track item.label) {
                    <div class="choice-item">
                      <div class="choice-label">{{ item.label }}</div>
                      <div class="choice-bar">
                        <div class="choice-fill multi" [style.width.%]="item.percentage"></div>
                      </div>
                      <div class="choice-stats">
                        <span class="choice-pct">{{ item.percentage }}%</span>
                        <span class="choice-count">({{ item.count }})</span>
                      </div>
                    </div>
                  }
                </div>
              }
              @case ('TEXT') {
                <div class="text-result">
                  <div class="text-responses">
                    @for (text of question.textResponses?.slice(0, 5); track $index) {
                      <div class="text-response">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>{{ text }}</span>
                      </div>
                    }
                  </div>
                  @if ((question.textResponses?.length || 0) > 5) {
                    <button class="view-all-btn">
                      Tüm yanıtları gör ({{ question.textResponses?.length }})
                    </button>
                  }
                </div>
              }
            }
          </div>
        }
      </div>

      <!-- Sentiment Analysis -->
      <div class="sentiment-section">
        <div class="section-header">
          <h2>Duygu Analizi</h2>
        </div>
        <div class="sentiment-grid">
          <div class="sentiment-chart">
            <div class="donut-chart">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="12"/>
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke="#22c55e" 
                  stroke-width="12"
                  stroke-dasharray="188.5 251.3"
                  stroke-dashoffset="-62.8"
                  transform="rotate(-90 50 50)"
                />
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke="#f59e0b" 
                  stroke-width="12"
                  stroke-dasharray="50.3 251.3"
                  stroke-dashoffset="-251.3"
                  transform="rotate(-90 50 50)"
                />
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke="#ef4444" 
                  stroke-width="12"
                  stroke-dasharray="12.6 251.3"
                  stroke-dashoffset="-301.6"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div class="sentiment-legend">
              <div class="legend-item">
                <span class="color positive"></span>
                <span class="label">Pozitif</span>
                <span class="value">75%</span>
              </div>
              <div class="legend-item">
                <span class="color neutral"></span>
                <span class="label">Nötr</span>
                <span class="value">20%</span>
              </div>
              <div class="legend-item">
                <span class="color negative"></span>
                <span class="label">Negatif</span>
                <span class="value">5%</span>
              </div>
            </div>
          </div>

          <div class="keywords-cloud">
            <h3>Sık Kullanılan Kelimeler</h3>
            <div class="cloud-items">
              <span class="cloud-item" style="font-size: 1.5rem;">hizmet</span>
              <span class="cloud-item" style="font-size: 1.2rem;">hızlı</span>
              <span class="cloud-item" style="font-size: 1.4rem;">memnun</span>
              <span class="cloud-item" style="font-size: 1.1rem;">kolay</span>
              <span class="cloud-item" style="font-size: 1.3rem;">güvenli</span>
              <span class="cloud-item negative" style="font-size: 1rem;">bekleme</span>
              <span class="cloud-item" style="font-size: 1.1rem;">uygulama</span>
              <span class="cloud-item" style="font-size: 1.2rem;">destek</span>
              <span class="cloud-item negative" style="font-size: 0.9rem;">sorun</span>
              <span class="cloud-item" style="font-size: 1rem;">çözüm</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Responses -->
      <div class="recent-section">
        <div class="section-header">
          <h2>Son Yanıtlar</h2>
          <button class="view-all-link" (click)="viewResponses()">
            Tümünü Gör
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
        <div class="responses-table">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>NPS</th>
                <th>Duygu</th>
                <th>Açık Uçlu Yanıt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (response of recentResponses(); track response.id) {
                <tr>
                  <td>{{ response.submittedAt | date:'dd MMM yyyy HH:mm' }}</td>
                  <td>
                    <span class="nps-badge" [class]="getNpsClass(response.npsScore || 0)">
                      {{ response.npsScore }}
                    </span>
                  </td>
                  <td>
                    <span class="sentiment-badge" [class]="response.sentiment">
                      @switch (response.sentiment) {
                        @case ('positive') { 😊 Pozitif }
                        @case ('neutral') { 😐 Nötr }
                        @case ('negative') { 😞 Negatif }
                      }
                    </span>
                  </td>
                  <td class="text-cell">
                    {{ getTextAnswer(response) | slice:0:100 }}...
                  </td>
                  <td>
                    <button class="view-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .survey-results {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn svg {
      width: 20px;
      height: 20px;
    }

    .title-section h1 {
      font-size: 1.5rem;
      margin: 0;
    }

    .response-count {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .date-select {
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

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    /* Stats Overview */
    .stats-overview {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .stat-card.primary {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: white;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      background: rgba(0,0,0,0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-card.primary .stat-icon {
      background: rgba(255,255,255,0.2);
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.completion {
      background: var(--success-light);
      color: var(--success-color);
    }

    .stat-icon.time {
      background: var(--warning-light);
      color: var(--warning-color);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.8125rem;
      opacity: 0.8;
    }

    .stat-trend {
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.2);
    }

    .stat-trend.up {
      color: #10b981;
    }

    .stat-card.nps {
      grid-column: span 1;
      display: flex;
      gap: 20px;
      padding: 16px;
    }

    .nps-score-circle {
      width: 100px;
      height: 100px;
    }

    .nps-score-circle svg text {
      fill: var(--text-primary);
    }

    .nps-breakdown {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }

    .nps-segment {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .segment-value {
      font-weight: 600;
      font-size: 0.875rem;
      width: 40px;
    }

    .segment-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .nps-segment.promoters .segment-value { color: #22c55e; }
    .nps-segment.passives .segment-value { color: #f59e0b; }
    .nps-segment.detractors .segment-value { color: #ef4444; }

    /* Trend Section */
    .trend-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 1.125rem;
      margin: 0;
    }

    .chart-legend {
      display: flex;
      gap: 16px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .legend-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot.responses { background: var(--primary-color); }
    .dot.nps { background: #22c55e; }

    .trend-chart {
      height: 200px;
    }

    .chart-area {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 180px;
      gap: 8px;
    }

    .chart-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bar-container {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .bar {
      width: 60%;
      background: var(--primary-color);
      border-radius: 4px 4px 0 0;
      position: relative;
      min-height: 4px;
    }

    .bar-value {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .bar-label {
      margin-top: 8px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Questions Section */
    .questions-section {
      margin-bottom: 32px;
    }

    .question-result-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .question-text {
      font-weight: 500;
      font-size: 1rem;
    }

    .question-meta {
      color: var(--text-tertiary);
      font-size: 0.8125rem;
    }

    /* NPS Result */
    .nps-result {
      display: flex;
      gap: 32px;
    }

    .nps-distribution {
      flex: 1;
    }

    .dist-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .dist-number {
      width: 24px;
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: center;
    }

    .dist-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .dist-fill {
      height: 100%;
      background: var(--border-color);
      border-radius: 4px;
    }

    .dist-item.promoter .dist-fill { background: #22c55e; }
    .dist-item.passive .dist-fill { background: #f59e0b; }
    .dist-item.detractor .dist-fill { background: #ef4444; }

    .dist-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      width: 30px;
      text-align: right;
    }

    .nps-avg {
      text-align: center;
      padding: 20px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .avg-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 4px;
    }

    .avg-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    /* Rating Result */
    .rating-result {
      display: flex;
      gap: 32px;
    }

    .rating-stars {
      flex: 1;
    }

    .star-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .star-icons {
      display: flex;
      gap: 2px;
      width: 100px;
    }

    .star-icons svg {
      width: 16px;
      height: 16px;
      color: #f59e0b;
    }

    .star-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .star-fill {
      height: 100%;
      background: #f59e0b;
      border-radius: 4px;
    }

    .star-count {
      width: 40px;
      text-align: right;
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .rating-avg {
      text-align: center;
      padding: 20px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .rating-avg .avg-value {
      font-size: 2rem;
      font-weight: 700;
      display: block;
    }

    .avg-stars {
      display: flex;
      justify-content: center;
      gap: 4px;
      margin-top: 8px;
    }

    .avg-stars svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: #f59e0b;
    }

    .avg-stars svg.filled {
      fill: #f59e0b;
    }

    /* Choice Result */
    .choice-result {
      max-width: 600px;
    }

    .choice-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .choice-label {
      width: 150px;
      font-size: 0.875rem;
    }

    .choice-bar {
      flex: 1;
      height: 24px;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
    }

    .choice-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 6px;
    }

    .choice-fill.multi {
      background: #8b5cf6;
    }

    .choice-stats {
      width: 80px;
      text-align: right;
    }

    .choice-pct {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .choice-count {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Text Result */
    .text-result {
      padding: 0;
    }

    .text-responses {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .text-response {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .text-response svg {
      width: 16px;
      height: 16px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .view-all-btn {
      margin-top: 12px;
      padding: 10px 16px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--primary-color);
    }

    /* Sentiment Section */
    .sentiment-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .sentiment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .sentiment-chart {
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .donut-chart {
      width: 160px;
      height: 160px;
    }

    .sentiment-legend {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sentiment-legend .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sentiment-legend .color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .color.positive { background: #22c55e; }
    .color.neutral { background: #f59e0b; }
    .color.negative { background: #ef4444; }

    .sentiment-legend .label {
      flex: 1;
      font-size: 0.875rem;
    }

    .sentiment-legend .value {
      font-weight: 600;
    }

    .keywords-cloud h3 {
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .cloud-items {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .cloud-item {
      padding: 6px 12px;
      background: var(--bg-secondary);
      border-radius: 16px;
      color: var(--primary-color);
    }

    .cloud-item.negative {
      color: var(--error-color);
    }

    /* Recent Section */
    .recent-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .view-all-link {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--primary-color);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .view-all-link svg {
      width: 16px;
      height: 16px;
    }

    .responses-table {
      overflow-x: auto;
    }

    .responses-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .responses-table th {
      text-align: left;
      padding: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-color);
    }

    .responses-table td {
      padding: 12px;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--border-color);
    }

    .nps-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .nps-badge.promoter { background: #dcfce7; color: #16a34a; }
    .nps-badge.passive { background: #fef3c7; color: #d97706; }
    .nps-badge.detractor { background: #fee2e2; color: #dc2626; }

    .sentiment-badge {
      font-size: 0.8125rem;
    }

    .sentiment-badge.positive { color: #16a34a; }
    .sentiment-badge.neutral { color: #d97706; }
    .sentiment-badge.negative { color: #dc2626; }

    .text-cell {
      max-width: 300px;
      color: var(--text-secondary);
    }

    .view-btn {
      width: 32px;
      height: 32px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .view-btn svg {
      width: 16px;
      height: 16px;
    }

    @media (max-width: 1200px) {
      .stats-overview {
        grid-template-columns: repeat(2, 1fr);
      }

      .sentiment-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .results-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .stats-overview {
        grid-template-columns: 1fr;
      }

      .nps-result,
      .rating-result {
        flex-direction: column;
      }
    }
  `]
})
export class SurveyResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  dateRange = '30d';
  surveyId = signal<string>('');
  surveyTitle = signal('Müşteri Memnuniyeti Anketi 2024');
  totalResponses = signal(1247);
  completionRate = signal(87);
  avgCompletionTime = signal('2:34');
  npsScore = signal(42);

  npsBreakdown = signal({
    promoters: 58,
    passives: 26,
    detractors: 16
  });

  trendData = signal([
    { date: '01 Oca', responses: 45 },
    { date: '02 Oca', responses: 62 },
    { date: '03 Oca', responses: 38 },
    { date: '04 Oca', responses: 71 },
    { date: '05 Oca', responses: 55 },
    { date: '06 Oca', responses: 89 },
    { date: '07 Oca', responses: 67 }
  ]);

  maxResponses = computed(() => 
    Math.max(...this.trendData().map(d => d.responses))
  );

  questionSummaries = signal<QuestionSummary[]>([
    {
      questionId: 'q1',
      questionText: 'Albaraka Türk\'ü bir arkadaşınıza veya meslektaşınıza tavsiye etme olasılığınız nedir?',
      questionType: 'NPS',
      responseCount: 1247,
      averageScore: 7.8,
      distribution: [
        { label: '0', count: 12, percentage: 1 },
        { label: '1', count: 8, percentage: 0.6 },
        { label: '2', count: 15, percentage: 1.2 },
        { label: '3', count: 22, percentage: 1.8 },
        { label: '4', count: 35, percentage: 2.8 },
        { label: '5', count: 87, percentage: 7 },
        { label: '6', count: 120, percentage: 9.6 },
        { label: '7', count: 187, percentage: 15 },
        { label: '8', count: 245, percentage: 19.6 },
        { label: '9', count: 312, percentage: 25 },
        { label: '10', count: 204, percentage: 16.4 }
      ]
    },
    {
      questionId: 'q2',
      questionText: 'Mobil bankacılık uygulamamızı nasıl değerlendirirsiniz?',
      questionType: 'RATING',
      responseCount: 1189,
      averageScore: 4.2,
      distribution: [
        { label: '1', count: 35, percentage: 3 },
        { label: '2', count: 59, percentage: 5 },
        { label: '3', count: 143, percentage: 12 },
        { label: '4', count: 357, percentage: 30 },
        { label: '5', count: 595, percentage: 50 }
      ]
    },
    {
      questionId: 'q3',
      questionText: 'Hangi bankacılık kanalını en sık kullanıyorsunuz?',
      questionType: 'CHOICE',
      responseCount: 1247,
      distribution: [
        { label: 'Mobil Uygulama', count: 623, percentage: 50 },
        { label: 'İnternet Bankacılığı', count: 312, percentage: 25 },
        { label: 'Şube', count: 187, percentage: 15 },
        { label: 'ATM', count: 100, percentage: 8 },
        { label: 'Çağrı Merkezi', count: 25, percentage: 2 }
      ]
    },
    {
      questionId: 'q4',
      questionText: 'Deneyiminizi nasıl iyileştirebileceğimizi bize anlatır mısınız?',
      questionType: 'TEXT',
      responseCount: 876,
      textResponses: [
        'Mobil uygulama çok hızlı ve kullanışlı. Özellikle yeni arayüz tasarımı çok başarılı.',
        'Şube bekleme süreleri bazen uzun olabiliyor, randevu sistemi geliştirilebilir.',
        'Döviz transferi işlemleri için daha düşük komisyon oranları tercih ederim.',
        'Müşteri hizmetleri her zaman çok yardımcı oluyor, teşekkürler.',
        'Yatırım ürünleri hakkında daha fazla bilgi ve eğitim içeriği sunulabilir.',
        'Kredi kartı limitlerinin artırılması konusunda daha esnek olunabilir.'
      ]
    }
  ]);

  recentResponses = signal<SurveyResponse[]>([
    {
      id: 'r1',
      submittedAt: new Date('2024-01-07T14:32:00'),
      npsScore: 9,
      sentiment: 'positive',
      answers: [{ questionId: 'q4', value: 'Hizmetlerinizden çok memnunum, mobil uygulama harika çalışıyor.' }]
    },
    {
      id: 'r2',
      submittedAt: new Date('2024-01-07T13:15:00'),
      npsScore: 7,
      sentiment: 'neutral',
      answers: [{ questionId: 'q4', value: 'Genel olarak iyi ama bazı işlemler daha hızlı olabilir.' }]
    },
    {
      id: 'r3',
      submittedAt: new Date('2024-01-07T11:45:00'),
      npsScore: 10,
      sentiment: 'positive',
      answers: [{ questionId: 'q4', value: 'Mükemmel hizmet kalitesi, teşekkürler!' }]
    },
    {
      id: 'r4',
      submittedAt: new Date('2024-01-07T10:22:00'),
      npsScore: 5,
      sentiment: 'negative',
      answers: [{ questionId: 'q4', value: 'Şubede çok bekledim, randevu sistemi düzeltilmeli.' }]
    },
    {
      id: 'r5',
      submittedAt: new Date('2024-01-07T09:08:00'),
      npsScore: 8,
      sentiment: 'positive',
      answers: [{ questionId: 'q4', value: 'Katılım bankacılığı konusunda en iyisiniz.' }]
    }
  ]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.surveyId.set(id);
      this.loadSurveyResults(id);
    }
  }

  loadSurveyResults(id: string): void {
    console.log('Loading results for survey:', id);
  }

  getNpsColor(score: number): string {
    if (score >= 50) return '#22c55e';
    if (score >= 0) return '#f59e0b';
    return '#ef4444';
  }

  getNpsDashArray(score: number): string {
    const normalized = (score + 100) / 200;
    const circumference = 2 * Math.PI * 45;
    return `${normalized * circumference} ${circumference}`;
  }

  getNpsClass(score: number): string {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }

  getStarArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getDistPercentage(dist: { label: string; percentage: number }[] | undefined, label: string): number {
    return dist?.find(d => d.label === label)?.percentage || 0;
  }

  getDistCount(dist: { label: string; count: number }[] | undefined, label: string): number {
    return dist?.find(d => d.label === label)?.count || 0;
  }

  getTextAnswer(response: SurveyResponse): string {
    const textAnswer = response.answers.find(a => typeof a.value === 'string');
    return textAnswer?.value || '';
  }

  exportResults(): void {
    console.log('Exporting results');
  }

  viewResponses(): void {
    this.router.navigate(['/surveys', this.surveyId(), 'responses']);
  }

  goBack(): void {
    this.router.navigate(['/surveys']);
  }
}
