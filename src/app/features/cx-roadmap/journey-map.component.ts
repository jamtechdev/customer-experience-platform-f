import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerJourneyService } from '../../core/services';
import { 
  CustomerJourney, 
  JourneyStage, 
  Touchpoint, 
  PainPoint, 
  Opportunity,
  ActionPlan,
  EmotionType,
  TouchpointChannel
} from '../../core/models';

@Component({
  selector: 'app-journey-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="journey-map-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <a routerLink="/cx/journeys" class="back-link">
            <i class="icon icon-arrow-left"></i>
            Geri
          </a>
          <div>
            <h1>{{journey()?.name || 'Müşteri Yolculuğu'}}</h1>
            <p class="subtitle">{{journey()?.productService}}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportMap()">
            <i class="icon icon-download"></i>
            PDF İndir
          </button>
          <button class="btn btn-primary" (click)="editJourney()">
            <i class="icon icon-edit"></i>
            Düzenle
          </button>
        </div>
      </div>

      <!-- Journey Metrics -->
      <div class="journey-metrics">
        <div class="metric-card">
          <span class="metric-value">{{journey()?.metrics?.overallNps || 0}}</span>
          <span class="metric-label">NPS</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{journey()?.metrics?.overallCsat || 0}}%</span>
          <span class="metric-label">CSAT</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{journey()?.metrics?.overallCes || 0}}</span>
          <span class="metric-label">CES</span>
        </div>
        <div class="metric-card warning">
          <span class="metric-value">{{journey()?.metrics?.weakLinksCount || 0}}</span>
          <span class="metric-label">Zayıf Nokta</span>
        </div>
        <div class="metric-card danger">
          <span class="metric-value">{{journey()?.metrics?.painPointsCount || 0}}</span>
          <span class="metric-label">Sorun Alanı</span>
        </div>
        <div class="metric-card success">
          <span class="metric-value">{{journey()?.metrics?.opportunitiesCount || 0}}</span>
          <span class="metric-label">Fırsat</span>
        </div>
      </div>

      <!-- Journey Map Visualization -->
      <div class="journey-map-container">
        <div class="journey-map">
          <!-- Stage Headers -->
          <div class="stage-row header-row">
            <div class="row-label">Aşama</div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell stage-header">
                <h3>{{stage.name}}</h3>
                <p>{{stage.description}}</p>
              </div>
            }
          </div>

          <!-- Customer Goals -->
          <div class="stage-row goals-row">
            <div class="row-label">
              <i class="icon icon-target"></i>
              Müşteri Hedefleri
            </div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell">
                <ul class="goal-list">
                  @for (goal of stage.customerGoals; track goal) {
                    <li>{{goal}}</li>
                  }
                </ul>
              </div>
            }
          </div>

          <!-- Touchpoints -->
          <div class="stage-row touchpoints-row">
            <div class="row-label">
              <i class="icon icon-layout"></i>
              Temas Noktaları
            </div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell">
                <div class="touchpoint-list">
                  @for (touchpointId of stage.touchpointIds; track touchpointId) {
                    @let touchpoint = getTouchpoint(touchpointId);
                    @if (touchpoint) {
                      <div 
                        class="touchpoint-card" 
                        [class.weak-link]="touchpoint.isWeakLink"
                        (click)="selectTouchpoint(touchpoint)"
                      >
                        <div class="touchpoint-icon">
                          <i class="icon icon-{{getChannelIcon(touchpoint.channel)}}"></i>
                        </div>
                        <span class="touchpoint-name">{{touchpoint.name}}</span>
                        @if (touchpoint.isWeakLink) {
                          <span class="weak-badge">!</span>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- Emotions Journey Line -->
          <div class="stage-row emotions-row">
            <div class="row-label">
              <i class="icon icon-heart"></i>
              Duygu Yolculuğu
            </div>
            <div class="emotion-chart">
              <svg [attr.viewBox]="'0 0 ' + ((journey()?.stages?.length || 1) * 200) + ' 100'" preserveAspectRatio="none">
                <!-- Emotion line -->
                <path 
                  [attr.d]="getEmotionPath()" 
                  fill="none" 
                  stroke="#3b82f6" 
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <!-- Data points -->
                @for (stage of journey()?.stages || []; track stage.id; let i = $index) {
                  <circle 
                    [attr.cx]="(i * 200) + 100" 
                    [attr.cy]="getEmotionY(stage)"
                    r="8" 
                    [attr.fill]="getEmotionColor(stage.customerEmotions[0])"
                    stroke="#fff"
                    stroke-width="2"
                  />
                }
              </svg>
              <div class="emotion-labels">
                @for (stage of journey()?.stages || []; track stage.id) {
                  <div class="emotion-label">
                    <span class="emoji">{{getEmotionEmoji(stage.customerEmotions[0])}}</span>
                    <span class="emotion-name">{{getEmotionName(stage.customerEmotions[0])}}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Channels -->
          <div class="stage-row channels-row">
            <div class="row-label">
              <i class="icon icon-globe"></i>
              Kanallar
            </div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell">
                <div class="channel-list">
                  @for (channel of stage.channels; track channel) {
                    <span class="channel-tag">{{channel}}</span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Pain Points -->
          <div class="stage-row painpoints-row">
            <div class="row-label">
              <i class="icon icon-alert-circle"></i>
              Sorun Alanları
            </div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell">
                <div class="painpoint-list">
                  @for (touchpointId of stage.touchpointIds; track touchpointId) {
                    @let touchpoint = getTouchpoint(touchpointId);
                    @if (touchpoint) {
                      @for (ppId of touchpoint.painPointIds; track ppId) {
                        @let painPoint = getPainPoint(ppId);
                        @if (painPoint) {
                          <div class="painpoint-card" [class]="'severity-' + painPoint.severity.toLowerCase()">
                            <span class="pp-title">{{painPoint.title}}</span>
                            <span class="pp-severity">{{painPoint.severity}}</span>
                          </div>
                        }
                      }
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- Opportunities -->
          <div class="stage-row opportunities-row">
            <div class="row-label">
              <i class="icon icon-lightbulb"></i>
              Fırsatlar
            </div>
            @for (stage of journey()?.stages || []; track stage.id) {
              <div class="stage-cell">
                <div class="opportunity-list">
                  @for (touchpointId of stage.touchpointIds; track touchpointId) {
                    @let touchpoint = getTouchpoint(touchpointId);
                    @if (touchpoint) {
                      @for (oppId of touchpoint.opportunityIds; track oppId) {
                        @let opportunity = getOpportunity(oppId);
                        @if (opportunity) {
                          <div class="opportunity-card" [class]="'type-' + opportunity.type.toLowerCase().replace('_', '-')">
                            <span class="opp-title">{{opportunity.title}}</span>
                            <span class="opp-type">{{opportunity.type}}</span>
                          </div>
                        }
                      }
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Selected Touchpoint Details Panel -->
      @if (selectedTouchpoint()) {
        <div class="touchpoint-panel">
          <div class="panel-header">
            <h3>{{selectedTouchpoint()!.name}}</h3>
            <button class="close-btn" (click)="selectedTouchpoint.set(null)">
              <i class="icon icon-x"></i>
            </button>
          </div>
          <div class="panel-body">
            <div class="panel-section">
              <h4>Genel Bilgiler</h4>
              <div class="info-grid">
                <div class="info-item">
                  <label>Kanal</label>
                  <span>{{selectedTouchpoint()!.channel}}</span>
                </div>
                <div class="info-item">
                  <label>Tip</label>
                  <span>{{selectedTouchpoint()!.type}}</span>
                </div>
                <div class="info-item">
                  <label>Memnuniyet Skoru</label>
                  <span>{{selectedTouchpoint()!.satisfactionScore}}/100</span>
                </div>
                <div class="info-item">
                  <label>Geri Bildirim Sayısı</label>
                  <span>{{selectedTouchpoint()!.feedbackCount}}</span>
                </div>
              </div>
            </div>

            <div class="panel-section">
              <h4>Duygu Analizi</h4>
              <div class="sentiment-bars">
                <div class="sentiment-bar positive">
                  <span class="bar-label">Pozitif</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="selectedTouchpoint()!.actualSentiment.positive"></div>
                  </div>
                  <span class="bar-value">{{selectedTouchpoint()!.actualSentiment.positive}}%</span>
                </div>
                <div class="sentiment-bar neutral">
                  <span class="bar-label">Nötr</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="selectedTouchpoint()!.actualSentiment.neutral"></div>
                  </div>
                  <span class="bar-value">{{selectedTouchpoint()!.actualSentiment.neutral}}%</span>
                </div>
                <div class="sentiment-bar negative">
                  <span class="bar-label">Negatif</span>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="selectedTouchpoint()!.actualSentiment.negative"></div>
                  </div>
                  <span class="bar-value">{{selectedTouchpoint()!.actualSentiment.negative}}%</span>
                </div>
              </div>
            </div>

            @if (selectedTouchpoint()!.isWeakLink) {
              <div class="panel-section warning-section">
                <h4><i class="icon icon-alert-triangle"></i> Zayıf Nokta</h4>
                <p>Bu temas noktası düşük memnuniyet skoru ve yüksek şikayet oranı nedeniyle zayıf nokta olarak işaretlenmiştir.</p>
              </div>
            }

            <div class="panel-actions">
              <button class="btn btn-secondary" (click)="viewFeedback(selectedTouchpoint()!)">
                Geri Bildirimleri Gör
              </button>
              <button class="btn btn-primary" (click)="createActionPlan(selectedTouchpoint()!)">
                Aksiyon Planı Oluştur
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Action Plans Section -->
      <div class="action-plans-section">
        <div class="section-header">
          <h2>İyileştirme Aksiyon Planları</h2>
          <button class="btn btn-primary" (click)="createNewActionPlan()">
            <i class="icon icon-plus"></i>
            Yeni Plan
          </button>
        </div>

        <div class="action-plans-grid">
          @for (plan of actionPlans(); track plan.id) {
            <div class="action-plan-card">
              <div class="plan-header">
                <h4>{{plan.title}}</h4>
                <span class="plan-status" [class]="'status-' + plan.status.toLowerCase().replace('_', '-')">
                  {{plan.status}}
                </span>
              </div>
              <p class="plan-description">{{plan.description}}</p>
              <div class="plan-meta">
                <span><i class="icon icon-user"></i> {{plan.owner}}</span>
                <span><i class="icon icon-calendar"></i> {{plan.timeline.endDate | date:'shortDate'}}</span>
              </div>
              <div class="plan-progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="plan.progress"></div>
                </div>
                <span>{{plan.progress}}% tamamlandı</span>
              </div>
            </div>
          } @empty {
            <div class="empty-plans">
              <i class="icon icon-clipboard"></i>
              <p>Henüz aksiyon planı oluşturulmadı</p>
              <button class="btn btn-primary" (click)="createNewActionPlan()">İlk Planı Oluştur</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .journey-map-page {
      padding: 1.5rem;
      max-width: 100%;
      overflow-x: hidden;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .back-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary, #6b7280);
      text-decoration: none;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.2s;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
        color: var(--text-primary, #1f2937);
      }
    }

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

    /* Journey Metrics */
    .journey-metrics {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      flex: 1;
      background: #fff;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;

      .metric-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
      }

      .metric-label {
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }

      &.warning .metric-value { color: #f59e0b; }
      &.danger .metric-value { color: #ef4444; }
      &.success .metric-value { color: #10b981; }
    }

    /* Journey Map Container */
    .journey-map-container {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
      margin-bottom: 1.5rem;
    }

    .journey-map {
      min-width: 1000px;
      padding: 1.5rem;
    }

    .stage-row {
      display: flex;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      &:last-child {
        border-bottom: none;
      }
    }

    .row-label {
      width: 150px;
      flex-shrink: 0;
      padding: 1rem;
      background: var(--bg-secondary, #f9fafb);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #6b7280);
    }

    .stage-cell {
      flex: 1;
      padding: 1rem;
      border-left: 1px solid var(--border-color, #e5e7eb);
      min-width: 200px;
    }

    .stage-header {
      background: var(--primary-light, #eff6ff);

      h3 {
        margin: 0 0 0.25rem;
        font-size: 1rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }
    }

    .goal-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.875rem;

      li {
        margin-bottom: 0.25rem;
      }
    }

    /* Touchpoints */
    .touchpoint-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .touchpoint-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;

      &:hover {
        background: var(--hover-bg, #e5e7eb);
      }

      &.weak-link {
        border: 2px solid #f59e0b;
        background: #fffbeb;
      }
    }

    .touchpoint-icon {
      width: 28px;
      height: 28px;
      border-radius: 0.375rem;
      background: var(--primary-color, #3b82f6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .touchpoint-name {
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .weak-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      background: #f59e0b;
      color: #fff;
      border-radius: 50%;
      font-size: 0.625rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Emotion Chart */
    .emotions-row {
      .stage-cell {
        display: none;
      }
    }

    .emotion-chart {
      flex: 1;
      padding: 1rem;
      border-left: 1px solid var(--border-color, #e5e7eb);

      svg {
        width: 100%;
        height: 80px;
      }
    }

    .emotion-labels {
      display: flex;
      justify-content: space-around;
      margin-top: 0.5rem;
    }

    .emotion-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;

      .emoji {
        font-size: 1.5rem;
      }

      .emotion-name {
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }
    }

    /* Channels */
    .channel-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .channel-tag {
      padding: 0.25rem 0.5rem;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    /* Pain Points */
    .painpoint-list, .opportunity-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .painpoint-card, .opportunity-card {
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
    }

    .painpoint-card {
      &.severity-critical {
        background: #fef2f2;
        border-left: 3px solid #ef4444;
      }
      &.severity-high {
        background: #fff7ed;
        border-left: 3px solid #f59e0b;
      }
      &.severity-medium {
        background: #fefce8;
        border-left: 3px solid #eab308;
      }
      &.severity-low {
        background: #f0fdf4;
        border-left: 3px solid #10b981;
      }
    }

    .pp-severity, .opp-type {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: rgba(0, 0, 0, 0.1);
    }

    .opportunity-card {
      &.type-quick-win {
        background: #d1fae5;
        border-left: 3px solid #10b981;
      }
      &.type-major-project {
        background: #dbeafe;
        border-left: 3px solid #3b82f6;
      }
      &.type-fill-in {
        background: #f3e8ff;
        border-left: 3px solid #8b5cf6;
      }
    }

    /* Touchpoint Panel */
    .touchpoint-panel {
      position: fixed;
      right: 0;
      top: 64px;
      width: 400px;
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

      h3 {
        margin: 0;
        font-size: 1.125rem;
      }
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: 0.375rem;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .panel-body {
      padding: 1.5rem;
    }

    .panel-section {
      margin-bottom: 1.5rem;

      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .info-item {
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

    .sentiment-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .sentiment-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .bar-label {
        width: 60px;
        font-size: 0.8125rem;
      }

      .bar-track {
        flex: 1;
        height: 8px;
        background: var(--border-color, #e5e7eb);
        border-radius: 4px;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 4px;
      }

      .bar-value {
        width: 40px;
        text-align: right;
        font-size: 0.8125rem;
        font-weight: 500;
      }

      &.positive .bar-fill { background: #10b981; }
      &.neutral .bar-fill { background: #9ca3af; }
      &.negative .bar-fill { background: #ef4444; }
    }

    .warning-section {
      background: #fffbeb;
      padding: 1rem;
      border-radius: 0.5rem;
      border-left: 3px solid #f59e0b;

      h4 {
        color: #b45309;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: #92400e;
      }
    }

    .panel-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Action Plans Section */
    .action-plans-section {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      h2 {
        margin: 0;
        font-size: 1.125rem;
      }
    }

    .action-plans-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .action-plan-card {
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .plan-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.5rem;

      h4 {
        margin: 0;
        font-size: 0.9375rem;
      }
    }

    .plan-status {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;

      &.status-draft { background: #f3f4f6; color: #6b7280; }
      &.status-approved { background: #dbeafe; color: #2563eb; }
      &.status-in-progress { background: #fef3c7; color: #d97706; }
      &.status-completed { background: #d1fae5; color: #059669; }
    }

    .plan-description {
      margin: 0 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
    }

    .plan-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      margin-bottom: 0.75rem;

      span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }

    .plan-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;

      .progress-bar {
        flex: 1;
        height: 6px;
        background: var(--border-color, #e5e7eb);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: var(--primary-color, #3b82f6);
        border-radius: 3px;
      }
    }

    .empty-plans {
      grid-column: span 3;
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary, #6b7280);

      .icon {
        font-size: 3rem;
        opacity: 0.3;
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 1rem;
      }
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    @media (max-width: 1280px) {
      .action-plans-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .empty-plans {
        grid-column: span 2;
      }
    }

    @media (max-width: 768px) {
      .journey-metrics {
        flex-wrap: wrap;
      }

      .metric-card {
        min-width: calc(33% - 0.75rem);
      }

      .action-plans-grid {
        grid-template-columns: 1fr;
      }

      .empty-plans {
        grid-column: span 1;
      }
    }
  `]
})
export class JourneyMapComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private journeyService = inject(CustomerJourneyService);

  journey = signal<CustomerJourney | null>(null);
  touchpoints = signal<Touchpoint[]>([]);
  painPoints = signal<PainPoint[]>([]);
  opportunities = signal<Opportunity[]>([]);
  actionPlans = signal<ActionPlan[]>([]);
  selectedTouchpoint = signal<Touchpoint | null>(null);

  ngOnInit(): void {
    const journeyId = this.route.snapshot.paramMap.get('id');
    if (journeyId) {
      this.loadJourney(journeyId);
    }
  }

  loadJourney(id: string): void {
    this.journeyService.getJourneyById(id).subscribe(response => {
      if (response.success) {
        this.journey.set(response.data);
        this.touchpoints.set(response.data.touchpoints || []);
        this.painPoints.set(response.data.painPoints || []);
        this.opportunities.set(response.data.opportunities || []);
      }
    });

    this.journeyService.getActionPlans(id).subscribe(response => {
      if (response.success) {
        this.actionPlans.set(response.data);
      }
    });
  }

  getTouchpoint(id: string): Touchpoint | undefined {
    return this.touchpoints().find(t => t.id === id);
  }

  getPainPoint(id: string): PainPoint | undefined {
    return this.painPoints().find(p => p.id === id);
  }

  getOpportunity(id: string): Opportunity | undefined {
    return this.opportunities().find(o => o.id === id);
  }

  selectTouchpoint(touchpoint: Touchpoint): void {
    this.selectedTouchpoint.set(touchpoint);
  }

  getChannelIcon(channel: TouchpointChannel): string {
    const icons: Record<TouchpointChannel, string> = {
      [TouchpointChannel.BRANCH]: 'building',
      [TouchpointChannel.ATM]: 'credit-card',
      [TouchpointChannel.MOBILE_APP]: 'smartphone',
      [TouchpointChannel.INTERNET_BANKING]: 'globe',
      [TouchpointChannel.CALL_CENTER]: 'phone',
      [TouchpointChannel.EMAIL]: 'mail',
      [TouchpointChannel.SOCIAL_MEDIA]: 'share-2',
      [TouchpointChannel.WEBSITE]: 'monitor',
      [TouchpointChannel.CHATBOT]: 'message-circle',
      [TouchpointChannel.SMS]: 'message-square',
      [TouchpointChannel.NOTIFICATION]: 'bell'
    };
    return icons[channel] || 'circle';
  }

  getEmotionEmoji(emotion: EmotionType): string {
    const emojis: Record<EmotionType, string> = {
      [EmotionType.DELIGHTED]: '😄',
      [EmotionType.HAPPY]: '😊',
      [EmotionType.SATISFIED]: '🙂',
      [EmotionType.NEUTRAL]: '😐',
      [EmotionType.FRUSTRATED]: '😤',
      [EmotionType.ANGRY]: '😠',
      [EmotionType.DISAPPOINTED]: '😞'
    };
    return emojis[emotion] || '😐';
  }

  getEmotionName(emotion: EmotionType): string {
    const names: Record<EmotionType, string> = {
      [EmotionType.DELIGHTED]: 'Çok Mutlu',
      [EmotionType.HAPPY]: 'Mutlu',
      [EmotionType.SATISFIED]: 'Memnun',
      [EmotionType.NEUTRAL]: 'Nötr',
      [EmotionType.FRUSTRATED]: 'Sinirli',
      [EmotionType.ANGRY]: 'Kızgın',
      [EmotionType.DISAPPOINTED]: 'Hayal Kırıklığı'
    };
    return names[emotion] || 'Nötr';
  }

  getEmotionY(stage: JourneyStage): number {
    const emotionValues: Record<EmotionType, number> = {
      [EmotionType.DELIGHTED]: 10,
      [EmotionType.HAPPY]: 25,
      [EmotionType.SATISFIED]: 40,
      [EmotionType.NEUTRAL]: 50,
      [EmotionType.FRUSTRATED]: 65,
      [EmotionType.ANGRY]: 80,
      [EmotionType.DISAPPOINTED]: 90
    };
    return emotionValues[stage.customerEmotions?.[0]] || 50;
  }

  getEmotionColor(emotion: EmotionType): string {
    const colors: Record<EmotionType, string> = {
      [EmotionType.DELIGHTED]: '#10b981',
      [EmotionType.HAPPY]: '#22c55e',
      [EmotionType.SATISFIED]: '#84cc16',
      [EmotionType.NEUTRAL]: '#eab308',
      [EmotionType.FRUSTRATED]: '#f97316',
      [EmotionType.ANGRY]: '#ef4444',
      [EmotionType.DISAPPOINTED]: '#dc2626'
    };
    return colors[emotion] || '#eab308';
  }

  getEmotionPath(): string {
    const stages = this.journey()?.stages || [];
    if (stages.length === 0) return '';

    const points = stages.map((stage, i) => {
      const x = (i * 200) + 100;
      const y = this.getEmotionY(stage);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }

  exportMap(): void {
    const journey = this.journey();
    if (journey) {
      this.journeyService.exportJourneyMap(journey.id).subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journey-map-${journey.name}.pdf`;
        a.click();
      });
    }
  }

  editJourney(): void {
    // Navigate to edit
  }

  viewFeedback(touchpoint: Touchpoint): void {
    // Navigate to feedback with filter
  }

  createActionPlan(touchpoint: Touchpoint): void {
    // Open action plan modal
  }

  createNewActionPlan(): void {
    // Open action plan modal
  }
}
