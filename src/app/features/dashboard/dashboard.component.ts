import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  FeedbackService, 
  ReportService, 
  TaskService, 
  AlarmService,
  AnalysisService,
  DashboardService,
  TranslationService,
  DataSourceService,
  AuthService
} from '../../core/services';
import { 
  FeedbackStats, 
  KPI, 
  TrendDirection, 
  KPIStatus,
  SentimentType,
  FeedbackCategory
} from '../../core/models';
import { KpiCardComponent, StatCardComponent } from '../../shared/components/cards/kpi-card.component';
import { SentimentBadgeComponent } from '../../shared/components/badges/badges.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    KpiCardComponent,
    StatCardComponent,
    SentimentBadgeComponent
  ],
  template: `
    <div class="dashboard">
      @if (isLoading()) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>{{t()('loading') || 'Loading...'}}</p>
        </div>
      }
      
      @if (loadingError()) {
        <div class="error-banner">
          <i class="icon icon-alert-circle"></i>
          <span>{{loadingError()}}</span>
          <button class="retry-btn" (click)="loadDashboardData()">{{t()('retry') || 'Retry'}}</button>
        </div>
      }

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>{{t()('dashboardTitle')}}</h1>
          <p class="subtitle">{{t()('dashboardSubtitle')}}</p>
        </div>
        <div class="header-actions">
          <select [(ngModel)]="selectedPeriod" (ngModelChange)="onPeriodChange($event)" class="period-select">
            <option value="today">{{t()('today')}}</option>
            <option value="week">{{t()('thisWeek')}}</option>
            <option value="month">{{t()('thisMonth')}}</option>
            <option value="quarter">{{t()('thisQuarter')}}</option>
            <option value="year">{{t()('thisYear')}}</option>
          </select>
          <button class="btn btn-primary" (click)="exportDashboard()">
            <i class="icon icon-download"></i>
            {{t()('downloadPdf')}}
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <app-kpi-card
          [label]="t()('totalFeedback')"
          [value]="stats()?.total || 0"
          icon="message-square"
          iconBg="#3b82f6"
          [trend]="TrendDirection.UP"
          [trendPercentage]="12.5"
          [status]="KPIStatus.ON_TARGET"
        />
        <app-kpi-card
          [label]="t()('averageSentimentScore')"
          [value]="stats()?.avgSentimentScore || 0"
          unit="/100"
          icon="heart"
          iconBg="#10b981"
          [trend]="getTrendDirection('sentiment')"
          [trendPercentage]="getTrendPercentage('sentiment')"
          [status]="getKPIStatus('sentiment')"
          [showTarget]="true"
          [target]="75"
        />
        <app-kpi-card
          [label]="t()('npsScore')"
          [value]="npsScore()"
          icon="users"
          iconBg="#8b5cf6"
          [trend]="getTrendDirection('nps')"
          [trendPercentage]="getTrendPercentage('nps')"
          [status]="getKPIStatus('nps')"
          [showTarget]="true"
          [target]="50"
        />
        <app-kpi-card
          [label]="t()('resolutionRate')"
          [value]="resolutionRate()"
          unit="%"
          icon="check-circle"
          iconBg="#f59e0b"
          [trend]="getTrendDirection('resolution')"
          [trendPercentage]="getTrendPercentage('resolution')"
          [status]="getKPIStatus('resolution')"
          [showTarget]="true"
          [target]="90"
        />
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Sentiment Overview -->
        <div class="card sentiment-card">
          <div class="card-header">
            <h3>{{t()('sentimentDistribution')}}</h3>
            <a routerLink="/analysis/sentiment" class="view-all">{{t()('seeAll')}} →</a>
          </div>
          <div class="card-body">
            <div class="sentiment-chart">
              <div class="donut-chart">
                <svg viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#10b981" 
                    stroke-width="12"
                    [attr.stroke-dasharray]="getStrokeDashArray('positive')"
                    stroke-dashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#f3f4f6" 
                    stroke-width="12"
                    [attr.stroke-dasharray]="getStrokeDashArray('neutral')"
                    [attr.stroke-dashoffset]="getNeutralOffset()"
                    transform="rotate(-90 50 50)"
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="#ef4444" 
                    stroke-width="12"
                    [attr.stroke-dasharray]="getStrokeDashArray('negative')"
                    [attr.stroke-dashoffset]="getNegativeOffset()"
                    transform="rotate(-90 50 50)"
                  />
                  <text x="50" y="50" text-anchor="middle" dy="0.35em" class="donut-text">
                    {{stats()?.total || 0}}
                  </text>
                </svg>
              </div>
              <div class="sentiment-legend">
                <div class="legend-item">
                  <span class="legend-color positive"></span>
                  <span class="legend-label">{{t()('positive')}}</span>
                  <span class="legend-value">{{getSentimentPercentage('POSITIVE')}}%</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color neutral"></span>
                  <span class="legend-label">{{t()('neutral')}}</span>
                  <span class="legend-value">{{getSentimentPercentage('NEUTRAL')}}%</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color negative"></span>
                  <span class="legend-label">{{t()('negative')}}</span>
                  <span class="legend-value">{{getSentimentPercentage('NEGATIVE')}}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Source Distribution -->
        <div class="card sources-card">
          <div class="card-header">
            <h3>{{t()('sourceDistribution')}}</h3>
            <a routerLink="/data/sources" class="view-all">{{t()('seeAll')}} →</a>
          </div>
          <div class="card-body">
            <div class="source-list">
              @for (source of topSources(); track source.name) {
                <div class="source-item">
                  <div class="source-info">
                    <i class="icon icon-{{source.icon}}"></i>
                    <span>{{source.name}}</span>
                  </div>
                  <div class="source-bar">
                    <div class="bar-fill" [style.width.%]="source.percentage"></div>
                  </div>
                  <span class="source-count">{{source.count}}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Active Alarms -->
        <div class="card alarms-card">
          <div class="card-header">
            <h3>{{t()('activeAlarms')}}</h3>
            <a routerLink="/tasks/alarms" class="view-all">{{t()('seeAll')}} →</a>
          </div>
          <div class="card-body">
            @if (activeAlarms().length > 0) {
              <div class="alarm-list">
                @for (alarm of activeAlarms(); track alarm.id) {
                  <div class="alarm-item" [class]="'severity-' + alarm.severity.toLowerCase()">
                    <div class="alarm-icon">
                      <i class="icon icon-alert-triangle"></i>
                    </div>
                    <div class="alarm-content">
                      <h4>{{alarm.title}}</h4>
                      <p>{{alarm.description}}</p>
                      <span class="alarm-time">{{alarm.createdAt | date:'short'}}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <i class="icon icon-check-circle"></i>
                <p>{{t()('noActiveAlarms')}}</p>
              </div>
            }
          </div>
        </div>

        <!-- Category Distribution -->
        <div class="card category-card">
          <div class="card-header">
            <h3>{{t()('categoryDistribution')}}</h3>
          </div>
          <div class="card-body">
            <div class="category-grid">
              @for (category of topCategories(); track category.name) {
                <div class="category-item">
                  <div class="category-icon" [style.background]="category.color + '20'" [style.color]="category.color">
                    <i class="icon icon-{{category.icon}}"></i>
                  </div>
                  <div class="category-info">
                    <span class="category-name">{{category.name}}</span>
                    <span class="category-count">{{category.count}} {{t()('feedbackCount')}}</span>
                  </div>
                  <span class="category-trend" [class.up]="category.trend > 0" [class.down]="category.trend < 0">
                    {{category.trend > 0 ? '+' : ''}}{{category.trend}}%
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Recent Feedback -->
        <div class="card recent-card">
          <div class="card-header">
            <h3>{{t()('latestFeedback')}}</h3>
            <a routerLink="/feedback" class="view-all">{{t()('seeAll')}} →</a>
          </div>
          <div class="card-body">
            <div class="feedback-list">
              @for (feedback of recentFeedback(); track feedback.id) {
                <div class="feedback-item">
                  <div class="feedback-header">
                    <app-sentiment-badge [sentiment]="feedback.sentiment" [showLabel]="false" />
                    <span class="feedback-source">{{feedback.platform}}</span>
                    <span class="feedback-time">{{feedback.createdAt | date:'short'}}</span>
                  </div>
                  <p class="feedback-content">{{feedback.content | slice:0:150}}{{feedback.content.length > 150 ? '...' : ''}}</p>
                  <div class="feedback-tags">
                    @for (tag of feedback.tags.slice(0, 3); track tag) {
                      <span class="tag">{{tag}}</span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <p>{{t()('noFeedback')}}</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- AI Recommendations -->
        <div class="card recommendations-card">
          <div class="card-header">
            <h3>{{t()('aiRecommendations')}}</h3>
            <a routerLink="/analysis/recommendations" class="view-all">{{t()('seeAll')}} →</a>
          </div>
          <div class="card-body">
            <div class="recommendation-list">
              @for (rec of aiRecommendations(); track rec.id) {
                <div class="recommendation-item">
                  <div class="rec-priority" [class]="'priority-' + rec.priority.toLowerCase()"></div>
                  <div class="rec-content">
                    <h4>{{rec.title}}</h4>
                    <p>{{rec.description | slice:0:100}}...</p>
                    <div class="rec-meta">
                      <span class="rec-type">{{rec.type}}</span>
                      <span class="rec-confidence">%{{rec.confidence}} güven</span>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="empty-state">
                  <i class="icon icon-lightbulb"></i>
                  <p>{{t()('noRecommendations')}}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Task Summary -->
      <div class="task-summary">
        <h3>{{t()('taskSummary')}}</h3>
        <div class="task-stats">
          <app-stat-card
            [label]="t()('pendingTasks')"
            [value]="taskStats().pending"
            icon="clock"
            iconBg="#fef3c7"
            iconColor="#d97706"
            [clickable]="true"
          />
          <app-stat-card
            [label]="t()('inProgressTasks')"
            [value]="taskStats().inProgress"
            icon="loader"
            iconBg="#dbeafe"
            iconColor="#2563eb"
            [clickable]="true"
          />
          <app-stat-card
            [label]="t()('approvalPending')"
            [value]="taskStats().pendingApproval"
            icon="user-check"
            iconBg="#e0e7ff"
            iconColor="#6366f1"
            [clickable]="true"
            [badge]="t()('makerChecker')"
            badgeBg="#6366f1"
          />
          <app-stat-card
            [label]="t()('completed')"
            [value]="taskStats().completed"
            icon="check-circle"
            iconBg="#d1fae5"
            iconColor="#059669"
            [clickable]="true"
          />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 0;
      min-height: 100%;
      background: var(--bg-primary, #f9fafb);
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      gap: 1rem;

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-color, #e5e7eb);
        border-top-color: var(--primary-color, #3b82f6);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      p {
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      background: #fee2e2;
      color: #991b1b;
      border-left: 4px solid #ef4444;
      margin: 0 1.5rem 1.5rem;

      .icon {
        width: 20px;
        height: 20px;
      }

      .retry-btn {
        margin-left: auto;
        padding: 0.5rem 1rem;
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background 0.2s;

        &:hover {
          background: #dc2626;
        }
      }
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding: 1.5rem 1.5rem 0;

      h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        letter-spacing: -0.025em;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
      }
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .period-select {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
      background: #fff;
      font-size: 0.875rem;
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

        &:hover {
          background: var(--primary-dark, #2563eb);
        }
      }
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding: 0 1.5rem;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding: 0 1.5rem;
    }

    .card {
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--border-color, #e5e7eb);
      transition: box-shadow 0.2s, transform 0.2s;

      &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .view-all {
        font-size: 0.875rem;
        color: var(--primary-color, #3b82f6);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .card-body {
      padding: 1.25rem;
    }

    /* Sentiment Card */
    .sentiment-chart {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .donut-chart {
      width: 160px;
      height: 160px;

      svg {
        width: 100%;
        height: 100%;
      }

      .donut-text {
        font-size: 1.25rem;
        font-weight: 700;
        fill: var(--text-primary, #1f2937);
      }
    }

    .sentiment-legend {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;

      &.positive { background: #10b981; }
      &.neutral { background: #f3f4f6; }
      &.negative { background: #ef4444; }
    }

    .legend-label {
      flex: 1;
      font-size: 0.875rem;
    }

    .legend-value {
      font-weight: 600;
    }

    /* Sources Card */
    .source-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .source-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 120px;
      font-size: 0.875rem;
    }

    .source-bar {
      flex: 1;
      height: 8px;
      background: var(--border-color, #e5e7eb);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--primary-color, #3b82f6);
      border-radius: 4px;
    }

    .source-count {
      width: 50px;
      text-align: right;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Alarms Card */
    .alarm-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .alarm-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: var(--bg-secondary, #f9fafb);

      &.severity-critical {
        border-left: 3px solid #ef4444;
      }

      &.severity-high {
        border-left: 3px solid #f59e0b;
      }

      &.severity-medium {
        border-left: 3px solid #3b82f6;
      }
    }

    .alarm-icon {
      color: currentColor;
    }

    .alarm-content {
      flex: 1;

      h4 {
        margin: 0 0 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      p {
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }

      .alarm-time {
        font-size: 0.625rem;
        color: var(--text-muted, #9ca3af);
      }
    }

    /* Category Card */
    .category-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
      transition: background 0.2s;

      &:hover {
        background: var(--bg-secondary, #f9fafb);
      }
    }

    .category-icon {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .category-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .category-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .category-count {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
    }

    .category-trend {
      font-size: 0.875rem;
      font-weight: 500;

      &.up { color: #10b981; }
      &.down { color: #ef4444; }
    }

    /* Recent Feedback Card */
    .recent-card {
      grid-column: span 2;
    }

    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .feedback-item {
      padding: 1rem;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.5rem;
    }

    .feedback-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .feedback-source {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
    }

    .feedback-time {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
    }

    .feedback-content {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .feedback-tags {
      display: flex;
      gap: 0.5rem;
    }

    .tag {
      padding: 0.125rem 0.5rem;
      background: var(--bg-secondary, #f3f4f6);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
    }

    /* Recommendations Card */
    .recommendation-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .recommendation-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: var(--bg-secondary, #f9fafb);
    }

    .rec-priority {
      width: 4px;
      border-radius: 2px;

      &.priority-critical { background: #ef4444; }
      &.priority-high { background: #f59e0b; }
      &.priority-medium { background: #3b82f6; }
      &.priority-low { background: #10b981; }
    }

    .rec-content {
      flex: 1;

      h4 {
        margin: 0 0 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      p {
        margin: 0 0 0.5rem;
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }
    }

    .rec-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.625rem;
    }

    .rec-type {
      padding: 0.125rem 0.375rem;
      background: #e0e7ff;
      color: #4f46e5;
      border-radius: 0.25rem;
    }

    .rec-confidence {
      color: var(--text-secondary, #6b7280);
    }

    /* Task Summary */
    .task-summary {
      padding: 0 1.5rem 1.5rem;

      h3 {
        margin: 0 0 1.5rem;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #1f2937);
      }
    }

    .task-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: var(--text-secondary, #6b7280);

      .icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    }

    .icon {
      width: 20px;
      height: 20px;
    }

    @media (max-width: 1280px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .recent-card {
        grid-column: span 2;
      }

      .task-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .kpi-grid,
      .dashboard-grid,
      .task-stats {
        grid-template-columns: 1fr;
      }

      .recent-card {
        grid-column: span 1;
      }

      .page-header {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private reportService = inject(ReportService);
  private taskService = inject(TaskService);
  private alarmService = inject(AlarmService);
  private analysisService = inject(AnalysisService);
  private dashboardService = inject(DashboardService);
  private translationService = inject(TranslationService);
  private dataSourceService = inject(DataSourceService);
  private authService = inject(AuthService);

  TrendDirection = TrendDirection;
  KPIStatus = KPIStatus;

  // Translation getters
  t = computed(() => (key: string) => this.translationService.translate(key));

  selectedPeriod = 'month';
  isLoading = signal(true);
  loadingError = signal<string | null>(null);
  
  stats = signal<FeedbackStats | null>(null);
  npsScore = signal(0);
  resolutionRate = signal(0);
  
  activeAlarms = signal<any[]>([]);
  recentFeedback = signal<any[]>([]);
  aiRecommendations = signal<any[]>([]);
  
  taskStats = signal({
    pending: 0,
    inProgress: 0,
    pendingApproval: 0,
    completed: 0
  });

  topSources = signal<Array<{ name: string; icon: string; count: number; percentage: number }>>([]);
  topCategories = signal<Array<{ name: string; icon: string; count: number; color: string; trend: number }>>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.loadingError.set(null);
    
    const user = this.authService.currentUser();
    const companyId = user?.settings?.companyId || 1; // Get from user settings or default
    const dateRange = this.getDateRange();

    // Load comprehensive dashboard stats
    this.dashboardService.getStats(companyId, dateRange.startDate, dateRange.endDate).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data;
          // Update sentiment stats
          this.stats.set({
            total: data.sentiment?.total || 0,
            avgSentimentScore: data.sentiment?.averageScore || 0,
            bySentiment: {
              POSITIVE: data.sentiment?.positive || 0,
              NEGATIVE: data.sentiment?.negative || 0,
              NEUTRAL: data.sentiment?.neutral || 0
            }
          } as any);
          
          // Update NPS
          if (data.nps) {
            this.npsScore.set(data.nps.score || 0);
          }
          
          // Calculate resolution rate (if available)
          if (data.alerts) {
            const total = data.alerts.total || 0;
            const resolved = total - (data.alerts.critical || 0) - (data.alerts.high || 0);
            this.resolutionRate.set(total > 0 ? Math.round((resolved / total) * 100) : 0);
          }
          
          // Update alerts
          if (data.alerts?.recent) {
            this.activeAlarms.set(data.alerts.recent.map((a: any) => ({
              id: a.id,
              title: a.title,
              description: a.message,
              severity: a.priority,
              createdAt: new Date(a.createdAt)
            })));
          }
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        // Only log detailed errors in development
        if (!environment.production) {
          console.error('Failed to load dashboard data:', error);
        }
        const errorMsg = error?.error?.message || error?.message || 'Failed to load dashboard data';
        this.loadingError.set(errorMsg);
        // Set default values on error
        this.stats.set({
          total: 0,
          avgSentimentScore: 0,
          bySentiment: {
            POSITIVE: 0,
            NEGATIVE: 0,
            NEUTRAL: 0
          }
        } as any);
        this.activeAlarms.set([]);
        this.isLoading.set(false);
      }
    });

    // Load NPS details
    this.dashboardService.getNPSDashboard(companyId, dateRange.startDate, dateRange.endDate).subscribe({
      next: (response) => {
        if (response.success && response.data?.current) {
          this.npsScore.set(response.data.current.npsScore || 0);
        }
      },
      error: (error) => {
        console.error('Failed to load NPS data:', error);
      }
    });

    // Load feedback stats for sources and categories
    this.feedbackService.getFeedbackStats({ dateFrom: dateRange.startDate, dateTo: dateRange.endDate }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const stats = response.data;
          
          // Process source distribution
          if (stats.bySource) {
            const total = stats.total || 1;
            const sources: Array<{ name: string; icon: string; count: number; percentage: number }> = [];
            
            const sourceIcons: Record<string, string> = {
              'instagram': 'instagram',
              'twitter': 'twitter',
              'facebook': 'facebook',
              'google': 'google',
              'app_store': 'apple',
              'play_store': 'play',
              'linkedin': 'linkedin',
              'youtube': 'youtube',
              'tiktok': 'video',
              'whatsapp': 'message-circle'
            };
            
            Object.entries(stats.bySource).forEach(([source, count]: [string, any]) => {
              if (count > 0) {
                sources.push({
                  name: source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  icon: sourceIcons[source.toLowerCase()] || 'globe',
                  count: count,
                  percentage: Math.round((count / total) * 100)
                });
              }
            });
            
            // Sort by count and take top 5
            this.topSources.set(sources.sort((a, b) => b.count - a.count).slice(0, 5));
          }
          
          // Process category distribution
          if (stats.byCategory) {
            const categories: Array<{ name: string; icon: string; count: number; color: string; trend: number }> = [];
            
            const categoryConfig: Record<string, { icon: string; color: string }> = {
              'mobile_app': { icon: 'smartphone', color: '#3b82f6' },
              'customer_service': { icon: 'headphones', color: '#10b981' },
              'credit_card': { icon: 'credit-card', color: '#8b5cf6' },
              'atm': { icon: 'map-pin', color: '#f59e0b' },
              'internet_banking': { icon: 'globe', color: '#6366f1' },
              'branch': { icon: 'building', color: '#ec4899' },
              'product': { icon: 'package', color: '#14b8a6' },
              'service': { icon: 'settings', color: '#f97316' }
            };
            
            Object.entries(stats.byCategory).forEach(([category, count]: [string, any]) => {
              if (count > 0) {
                const config = categoryConfig[category.toLowerCase()] || { icon: 'tag', color: '#6b7280' };
                categories.push({
                  name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  icon: config.icon,
                  count: count,
                  color: config.color,
                  trend: Math.floor(Math.random() * 20) - 10 // TODO: Calculate real trend
                });
              }
            });
            
            // Sort by count and take top 5
            this.topCategories.set(categories.sort((a, b) => b.count - a.count).slice(0, 5));
          }
        }
      },
      error: (error) => {
        // Silently handle feedback stats errors
        if (!environment.production) {
          console.warn('Failed to load feedback stats:', error);
        }
      }
    });

    // Load recent feedback
    this.feedbackService.getFeedback(undefined, { page: 1, pageSize: 5 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.recentFeedback.set(response.data.map((f: any) => ({
            id: f.id,
            content: f.content,
            platform: f.source || f.platform,
            sentiment: f.sentiment || 'NEUTRAL',
            tags: f.tags || [],
            createdAt: new Date(f.date || f.createdAt)
          })));
        }
      },
      error: (error) => {
        // Silently handle recent feedback errors
        if (!environment.production) {
          console.warn('Failed to load recent feedback:', error);
        }
        this.recentFeedback.set([]);
      }
    });

    // Load AI recommendations
    this.analysisService.getRecommendations({ page: 1, pageSize: 3 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.aiRecommendations.set(response.data);
        }
      },
      error: (error) => {
        // Silently handle AI recommendations errors
        if (!environment.production) {
          console.warn('Failed to load AI recommendations:', error);
        }
        this.aiRecommendations.set([]);
      }
    });

    // Load task stats
    this.taskService.getTaskStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.taskStats.set({
            pending: response.data.pending || 0,
            inProgress: response.data.inProgress || 0,
            pendingApproval: response.data.pendingApproval || 0,
            completed: response.data.completed || 0
          });
        }
      },
      error: (error) => {
        // Silently handle task stats errors
        if (!environment.production) {
          console.warn('Failed to load task stats:', error);
        }
        // Keep default values (0)
      }
    });
  }

  private getDateRange(): { startDate?: Date; endDate?: Date } {
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (this.selectedPeriod) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }
    
    return { startDate, endDate: new Date() };
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.loadDashboardData();
  }

  exportDashboard(): void {
    this.reportService.exportDashboardToPdf({
      period: this.selectedPeriod,
      sections: ['kpis', 'sentiment', 'sources', 'categories']
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
    });
  }

  getSentimentPercentage(sentiment: string): number {
    const stats = this.stats();
    if (!stats || !stats.bySentiment) return 0;
    const total = stats.total || 1;
    return Math.round(((stats.bySentiment as any)[sentiment] || 0) / total * 100);
  }

  getStrokeDashArray(type: string): string {
    const circumference = 2 * Math.PI * 40;
    const percentage = this.getSentimentPercentage(type.toUpperCase());
    const dashLength = (percentage / 100) * circumference;
    return `${dashLength} ${circumference}`;
  }

  getNeutralOffset(): number {
    const circumference = 2 * Math.PI * 40;
    const positivePercentage = this.getSentimentPercentage('POSITIVE');
    return -(positivePercentage / 100) * circumference;
  }

  getNegativeOffset(): number {
    const circumference = 2 * Math.PI * 40;
    const positivePercentage = this.getSentimentPercentage('POSITIVE');
    const neutralPercentage = this.getSentimentPercentage('NEUTRAL');
    return -((positivePercentage + neutralPercentage) / 100) * circumference;
  }

  // Dynamic trend calculation (simplified - in real app, compare with previous period)
  getTrendDirection(metric: string): TrendDirection {
    // TODO: Compare with previous period data
    return TrendDirection.UP;
  }

  getTrendPercentage(metric: string): number {
    // TODO: Calculate real trend percentage
    const trends: Record<string, number> = {
      'total': 12.5,
      'sentiment': 5.2,
      'nps': 0.8,
      'resolution': 3.4
    };
    return trends[metric] || 0;
  }

  getKPIStatus(metric: string): KPIStatus {
    const stats = this.stats();
    if (!stats) return KPIStatus.ON_TARGET;
    
    switch (metric) {
      case 'sentiment':
        const sentimentScore = stats.avgSentimentScore || 0;
        if (sentimentScore >= 75) return KPIStatus.ABOVE_TARGET;
        if (sentimentScore >= 60) return KPIStatus.ON_TARGET;
        return KPIStatus.BELOW_TARGET;
      case 'nps':
        const nps = this.npsScore();
        if (nps >= 50) return KPIStatus.ON_TARGET;
        return KPIStatus.BELOW_TARGET;
      case 'resolution':
        const resolution = this.resolutionRate();
        if (resolution >= 90) return KPIStatus.ABOVE_TARGET;
        if (resolution >= 80) return KPIStatus.ON_TARGET;
        return KPIStatus.BELOW_TARGET;
      default:
        return KPIStatus.ON_TARGET;
    }
  }
}
