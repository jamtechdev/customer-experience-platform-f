import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SentimentType, FeedbackCategory, Platform, Priority, FeedbackStatus } from '../../../core/models';

@Component({
  selector: 'app-sentiment-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sentiment-badge" [class]="'sentiment-' + sentiment.toLowerCase()">
      @switch (sentiment) {
        @case (SentimentType.POSITIVE) {
          <i class="icon icon-smile"></i>
        }
        @case (SentimentType.NEGATIVE) {
          <i class="icon icon-frown"></i>
        }
        @case (SentimentType.MIXED) {
          <i class="icon icon-meh"></i>
        }
        @default {
          <i class="icon icon-minus"></i>
        }
      }
      @if (showLabel) {
        <span>{{getLabel()}}</span>
      }
      @if (showScore && score !== undefined) {
        <span class="score">({{score | number:'1.0-0'}})</span>
      }
    </span>
  `,
  styles: [`
    .sentiment-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;

      &.sentiment-positive {
        background: #d1fae5;
        color: #059669;
      }

      &.sentiment-negative {
        background: #fee2e2;
        color: #dc2626;
      }

      &.sentiment-neutral {
        background: #f3f4f6;
        color: #6b7280;
      }

      &.sentiment-mixed {
        background: #fef3c7;
        color: #d97706;
      }

      .icon {
        width: 14px;
        height: 14px;
      }

      .score {
        opacity: 0.75;
      }
    }
  `]
})
export class SentimentBadgeComponent {
  @Input() sentiment: SentimentType = SentimentType.NEUTRAL;
  @Input() score?: number;
  @Input() showLabel = true;
  @Input() showScore = false;

  SentimentType = SentimentType;

  getLabel(): string {
    const labels: Record<SentimentType, string> = {
      [SentimentType.POSITIVE]: 'Pozitif',
      [SentimentType.NEGATIVE]: 'Negatif',
      [SentimentType.NEUTRAL]: 'Nötr',
      [SentimentType.MIXED]: 'Karışık'
    };
    return labels[this.sentiment];
  }
}

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="priority-badge" [class]="'priority-' + priority.toLowerCase()">
      {{getLabel()}}
    </span>
  `,
  styles: [`
    .priority-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;

      &.priority-critical {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      &.priority-high {
        background: #fff7ed;
        color: #ea580c;
        border: 1px solid #fed7aa;
      }

      &.priority-medium {
        background: #fefce8;
        color: #ca8a04;
        border: 1px solid #fef08a;
      }

      &.priority-low {
        background: #f0fdf4;
        color: #16a34a;
        border: 1px solid #bbf7d0;
      }
    }
  `]
})
export class PriorityBadgeComponent {
  @Input() priority: Priority = Priority.MEDIUM;

  getLabel(): string {
    const labels: Record<Priority, string> = {
      [Priority.CRITICAL]: 'Kritik',
      [Priority.HIGH]: 'Yüksek',
      [Priority.MEDIUM]: 'Orta',
      [Priority.LOW]: 'Düşük'
    };
    return labels[this.priority];
  }
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status.toLowerCase().replace('_', '-')">
      @if (showDot) {
        <span class="status-dot"></span>
      }
      {{getLabel()}}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;

      &.status-new {
        background: #dbeafe;
        color: #1d4ed8;
      }

      &.status-in-review, &.status-in-progress {
        background: #fef3c7;
        color: #d97706;
      }

      &.status-pending-approval {
        background: #e0e7ff;
        color: #4f46e5;
      }

      &.status-assigned {
        background: #f3e8ff;
        color: #9333ea;
      }

      &.status-resolved, &.status-completed, &.status-approved {
        background: #d1fae5;
        color: #059669;
      }

      &.status-closed {
        background: #f3f4f6;
        color: #6b7280;
      }

      &.status-rejected {
        background: #fee2e2;
        color: #dc2626;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: FeedbackStatus | string = FeedbackStatus.NEW;
  @Input() showDot = true;

  getLabel(): string {
    const labels: Record<string, string> = {
      'NEW': 'Yeni',
      'IN_REVIEW': 'İncelemede',
      'PENDING_APPROVAL': 'Onay Bekliyor',
      'ASSIGNED': 'Atandı',
      'IN_PROGRESS': 'İşlemde',
      'RESOLVED': 'Çözüldü',
      'CLOSED': 'Kapatıldı',
      'REJECTED': 'Reddedildi',
      'PENDING': 'Beklemede',
      'COMPLETED': 'Tamamlandı',
      'APPROVED': 'Onaylandı',
      'CANCELLED': 'İptal'
    };
    return labels[this.status] || this.status;
  }
}

@Component({
  selector: 'app-platform-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="platform-icon" [class]="'platform-' + platform.toLowerCase()" [title]="getLabel()">
      <i class="icon icon-{{getIcon()}}"></i>
      @if (showLabel) {
        <span>{{getLabel()}}</span>
      }
    </span>
  `,
  styles: [`
    .platform-icon {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;

      .icon {
        width: 18px;
        height: 18px;
      }

      &.platform-instagram { color: #e4405f; }
      &.platform-facebook { color: #1877f2; }
      &.platform-twitter { color: #1da1f2; }
      &.platform-youtube { color: #ff0000; }
      &.platform-linkedin { color: #0a66c2; }
      &.platform-google { color: #4285f4; }
      &.platform-app_store_ios { color: #007aff; }
      &.platform-play_store { color: #34a853; }
    }
  `]
})
export class PlatformIconComponent {
  @Input() platform: Platform = Platform.OTHER;
  @Input() showLabel = false;

  getIcon(): string {
    const icons: Record<Platform, string> = {
      [Platform.INSTAGRAM]: 'instagram',
      [Platform.FACEBOOK]: 'facebook',
      [Platform.TWITTER]: 'twitter',
      [Platform.YOUTUBE]: 'youtube',
      [Platform.LINKEDIN]: 'linkedin',
      [Platform.GOOGLE]: 'google',
      [Platform.APP_STORE_IOS]: 'apple',
      [Platform.PLAY_STORE]: 'play',
      [Platform.SIKAYETVAR]: 'message-square',
      [Platform.EKSI_SOZLUK]: 'message-circle',
      [Platform.INTERNAL]: 'home',
      [Platform.OTHER]: 'globe',
      [Platform.CALL_CENTER]: 'phone',
      [Platform.EMAIL]: 'mail',
      [Platform.WEB]: 'globe',
      [Platform.SURVEY]: 'clipboard',
      [Platform.BRANCH]: 'building',
      [Platform.COMPLAINT_SITE]: 'alert-circle',
      [Platform.GOOGLE_REVIEWS]: 'star',
      [Platform.APP_STORE]: 'smartphone'
    };
    return icons[this.platform] || 'globe';
  }

  getLabel(): string {
    const labels: Record<Platform, string> = {
      [Platform.INSTAGRAM]: 'Instagram',
      [Platform.FACEBOOK]: 'Facebook',
      [Platform.TWITTER]: 'Twitter/X',
      [Platform.YOUTUBE]: 'YouTube',
      [Platform.LINKEDIN]: 'LinkedIn',
      [Platform.GOOGLE]: 'Google',
      [Platform.APP_STORE_IOS]: 'App Store',
      [Platform.PLAY_STORE]: 'Play Store',
      [Platform.SIKAYETVAR]: 'Şikayetvar',
      [Platform.EKSI_SOZLUK]: 'Ekşi Sözlük',
      [Platform.INTERNAL]: 'Dahili',
      [Platform.OTHER]: 'Diğer',
      [Platform.CALL_CENTER]: 'Çağrı Merkezi',
      [Platform.EMAIL]: 'E-posta',
      [Platform.WEB]: 'Web',
      [Platform.SURVEY]: 'Anket',
      [Platform.BRANCH]: 'Şube',
      [Platform.COMPLAINT_SITE]: 'Şikayet Sitesi',
      [Platform.GOOGLE_REVIEWS]: 'Google Yorumları',
      [Platform.APP_STORE]: 'App Store'
    };
    return labels[this.platform] || 'Diğer';
  }
}
