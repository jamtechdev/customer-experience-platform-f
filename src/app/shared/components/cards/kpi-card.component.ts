import { Component, Input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendDirection, KPIStatus } from '../../../core/models';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card" [class]="'status-' + status.toLowerCase()">
      <div class="kpi-header">
        <div class="kpi-icon" [style.background]="iconBg">
          <i class="icon icon-{{icon}}"></i>
        </div>
        <div class="kpi-trend" [class]="'trend-' + trend.toLowerCase()">
          @if (trend === 'UP') {
            <i class="icon icon-trending-up"></i>
          } @else if (trend === 'DOWN') {
            <i class="icon icon-trending-down"></i>
          } @else {
            <i class="icon icon-minus"></i>
          }
          <span>{{trendPercentage | number:'1.1-1'}}%</span>
        </div>
      </div>
      
      <div class="kpi-body">
        <h3 class="kpi-value">
          {{value | number:'1.0-1'}}
          @if (unit) {
            <span class="unit">{{unit}}</span>
          }
        </h3>
        <p class="kpi-label">{{label}}</p>
      </div>

      @if (showTarget) {
        <div class="kpi-footer">
          <div class="target-bar">
            <div class="target-progress" [style.width.%]="progressPercentage"></div>
          </div>
          <div class="target-info">
            <span>{{targetLabel}}: {{target | number:'1.0-1'}}{{unit}}</span>
            <span [class]="progressPercentage >= 100 ? 'achieved' : 'pending'">
              {{progressPercentage | number:'1.0-0'}}%
            </span>
          </div>
        </div>
      }

      @if (subtitle) {
        <p class="kpi-subtitle">{{subtitle}}</p>
      }
    </div>
  `,
  styles: [`
    .kpi-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.status-critical {
        border-left: 4px solid var(--danger-color, #ef4444);
      }

      &.status-below_target {
        border-left: 4px solid var(--warning-color, #f59e0b);
      }

      &.status-on_target {
        border-left: 4px solid var(--success-color, #10b981);
      }

      &.status-above_target {
        border-left: 4px solid var(--primary-color, #3b82f6);
      }
    }

    .kpi-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;

      .icon {
        width: 24px;
        height: 24px;
      }
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;

      &.trend-up {
        background: #d1fae5;
        color: #059669;
      }

      &.trend-down {
        background: #fee2e2;
        color: #dc2626;
      }

      &.trend-stable {
        background: #f3f4f6;
        color: #6b7280;
      }

      .icon {
        width: 16px;
        height: 16px;
      }
    }

    .kpi-body {
      margin-bottom: 0.75rem;
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary, #1f2937);
      margin: 0 0 0.25rem;
      line-height: 1;

      .unit {
        font-size: 1rem;
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
      }
    }

    .kpi-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #6b7280);
      margin: 0;
    }

    .kpi-footer {
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .target-bar {
      height: 6px;
      background: var(--border-color, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .target-progress {
      height: 100%;
      background: var(--primary-color, #3b82f6);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .target-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);

      .achieved {
        color: var(--success-color, #10b981);
        font-weight: 500;
      }

      .pending {
        color: var(--text-secondary, #6b7280);
      }
    }

    .kpi-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
      margin: 0.5rem 0 0;
    }

    .icon {
      display: inline-flex;
    }
  `]
})
export class KpiCardComponent {
  private translationService = inject(TranslationService);
  
  @Input() label = '';
  @Input() value = 0;
  @Input() previousValue?: number;
  @Input() target?: number;
  @Input() unit = '';
  @Input() icon = 'activity';
  @Input() iconBg = '#3b82f6';
  @Input() trend: TrendDirection = TrendDirection.STABLE;
  @Input() trendPercentage = 0;
  @Input() status: KPIStatus = KPIStatus.ON_TARGET;
  @Input() showTarget = false;
  @Input() subtitle?: string;

  get progressPercentage(): number {
    if (!this.target || this.target === 0) return 0;
    return Math.min((this.value / this.target) * 100, 100);
  }
  
  get targetLabel(): string {
    return this.translationService.translate('target');
  }
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class.clickable]="clickable">
      <div class="stat-icon" [style.background]="iconBg" [style.color]="iconColor">
        <i class="icon icon-{{icon}}"></i>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{value | number}}</span>
        <span class="stat-label">{{label}}</span>
      </div>
      @if (badge) {
        <span class="stat-badge" [style.background]="badgeBg">{{badge}}</span>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      &.clickable {
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .stat-icon {
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

    .stat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary, #1f2937);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #6b7280);
      margin-top: 0.25rem;
    }

    .stat-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #fff;
    }
  `]
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() icon = 'activity';
  @Input() iconBg = '#eff6ff';
  @Input() iconColor = '#3b82f6';
  @Input() badge?: string;
  @Input() badgeBg = '#10b981';
  @Input() clickable = false;
}
