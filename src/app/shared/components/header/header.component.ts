import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User, Notification, NotificationType } from '../../../core/models';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="header">
      <div class="header-left">
        <div class="search-box">
          <i class="icon icon-search"></i>
          <input 
            type="text" 
            [placeholder]="t()('searchPlaceholder')" 
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch.emit(searchQuery)"
          >
        </div>
      </div>

      <div class="header-right">
        <!-- Language Selector -->
        <div class="dropdown language-dropdown">
          <button class="dropdown-toggle" (click)="languageDropdown.set(!languageDropdown())">
            <span class="flag">{{selectedLanguage() === 'tr' ? '🇹🇷' : selectedLanguage() === 'en' ? '🇬🇧' : '🇸🇦'}}</span>
            <span class="lang-code">{{selectedLanguage().toUpperCase()}}</span>
          </button>
          @if (languageDropdown()) {
            <div class="dropdown-menu">
              <button class="dropdown-item" (click)="changeLanguage('tr')">
                <span class="flag">🇹🇷</span> Türkçe
              </button>
              <button class="dropdown-item" (click)="changeLanguage('en')">
                <span class="flag">🇬🇧</span> English
              </button>
            </div>
          }
        </div>

        <!-- Notifications -->
        <div class="dropdown notifications-dropdown">
          <button class="icon-btn" (click)="notificationsDropdown.set(!notificationsDropdown())">
            <i class="icon icon-bell"></i>
            @if (unreadCount() > 0) {
              <span class="notification-badge">{{unreadCount()}}</span>
            }
          </button>
          @if (notificationsDropdown()) {
            <div class="dropdown-menu notifications-menu">
              <div class="dropdown-header">
                <h4>{{t()('notifications')}}</h4>
                @if (unreadCount() > 0) {
                  <button class="mark-all-read" (click)="markAllRead.emit()">{{t()('markAllRead')}}</button>
                }
              </div>
              <div class="notifications-list">
                @for (notification of notifications; track notification.id) {
                  <div 
                    class="notification-item" 
                    [class.unread]="!notification.isRead"
                    (click)="onNotificationClick.emit(notification)"
                  >
                    <div class="notification-icon" [class]="'type-' + notification.type.toLowerCase()">
                      <i class="icon icon-{{getNotificationIcon(notification.type)}}"></i>
                    </div>
                    <div class="notification-content">
                      <h5>{{notification.title}}</h5>
                      <p>{{notification.message}}</p>
                      <span class="notification-time">{{notification.createdAt | date:'short'}}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-notifications">
                    <i class="icon icon-bell-off"></i>
                    <p>{{t()('noNotifications')}}</p>
                  </div>
                }
              </div>
              <div class="dropdown-footer">
                <a href="/notifications">{{t()('viewAllNotifications')}}</a>
              </div>
            </div>
          }
        </div>

        <!-- Alarms Quick View -->
        <div class="dropdown alarms-dropdown">
          <button class="icon-btn" [class.has-alarms]="activeAlarmsCount > 0" (click)="alarmsDropdown.set(!alarmsDropdown())">
            <i class="icon icon-alert-triangle"></i>
            @if (activeAlarmsCount > 0) {
              <span class="alarm-badge">{{activeAlarmsCount}}</span>
            }
          </button>
          @if (alarmsDropdown()) {
            <div class="dropdown-menu alarms-menu">
              <div class="dropdown-header">
                <h4>{{t()('activeAlarms')}}</h4>
              </div>
              <div class="alarms-summary">
                <div class="alarm-stat critical">
                  <span class="count">{{alarmsBySeverity?.['CRITICAL'] || 0}}</span>
                  <span class="label">{{t()('critical')}}</span>
                </div>
                <div class="alarm-stat high">
                  <span class="count">{{alarmsBySeverity?.['HIGH'] || 0}}</span>
                  <span class="label">{{t()('high')}}</span>
                </div>
                <div class="alarm-stat medium">
                  <span class="count">{{alarmsBySeverity?.['MEDIUM'] || 0}}</span>
                  <span class="label">{{t()('medium')}}</span>
                </div>
              </div>
              <div class="dropdown-footer">
                <a href="/tasks/alarms">{{t()('manageAlarms')}}</a>
              </div>
            </div>
          }
        </div>

        <!-- User Menu -->
        <div class="dropdown user-dropdown">
          <button class="user-toggle" (click)="userDropdown.set(!userDropdown())">
            <div class="avatar">
              @if (user?.avatar) {
                <img [src]="user!.avatar" [alt]="user!.firstName">
              } @else {
                <span>{{user?.firstName?.[0]}}{{user?.lastName?.[0]}}</span>
              }
            </div>
            <div class="user-info">
              <span class="user-name">{{user?.firstName}} {{user?.lastName}}</span>
              <span class="user-role">{{user?.role}}</span>
            </div>
            <i class="icon icon-chevron-down"></i>
          </button>
          @if (userDropdown()) {
            <div class="dropdown-menu user-menu">
              <a class="dropdown-item" href="/profile">
                <i class="icon icon-user"></i> {{t()('profile')}}
              </a>
              <a class="dropdown-item" href="/settings">
                <i class="icon icon-settings"></i> {{t()('settings')}}
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout" (click)="onLogout.emit()">
                <i class="icon icon-logout"></i> {{t()('logout')}}
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 64px;
      background: var(--header-bg, #fff);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      z-index: 999;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--input-bg, #f3f4f6);
      border-radius: 0.5rem;
      padding: 0.5rem 1rem;
      min-width: 320px;

      input {
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        font-size: 0.875rem;
      }

      .icon {
        color: var(--text-secondary, #6b7280);
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dropdown {
      position: relative;
    }

    .dropdown-toggle, .icon-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .icon-btn {
      padding: 0.5rem;

      &.has-alarms {
        color: var(--danger-color, #ef4444);
      }
    }

    .notification-badge, .alarm-badge {
      position: absolute;
      top: 0;
      right: 0;
      background: var(--danger-color, #ef4444);
      color: #fff;
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      min-width: 1rem;
      text-align: center;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      min-width: 200px;
      z-index: 1000;
      overflow: hidden;
    }

    .notifications-menu, .alarms-menu {
      width: 360px;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h4 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
      }
    }

    .mark-all-read {
      background: none;
      border: none;
      color: var(--primary-color, #3b82f6);
      font-size: 0.75rem;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .notifications-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--hover-bg, #f9fafb);
      }

      &.unread {
        background: var(--primary-light, #eff6ff);
      }
    }

    .notification-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.type-info { background: #dbeafe; color: #3b82f6; }
      &.type-success { background: #d1fae5; color: #10b981; }
      &.type-warning { background: #fef3c7; color: #f59e0b; }
      &.type-error { background: #fee2e2; color: #ef4444; }
      &.type-alarm { background: #fee2e2; color: #ef4444; }
      &.type-task { background: #e0e7ff; color: #6366f1; }
    }

    .notification-content {
      flex: 1;
      min-width: 0;

      h5 {
        margin: 0 0 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      p {
        margin: 0 0 0.25rem;
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .notification-time {
      font-size: 0.625rem;
      color: var(--text-muted, #9ca3af);
    }

    .empty-notifications {
      padding: 2rem;
      text-align: center;
      color: var(--text-secondary, #6b7280);

      .icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
    }

    .dropdown-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
      text-align: center;

      a {
        color: var(--primary-color, #3b82f6);
        font-size: 0.875rem;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .alarms-summary {
      display: flex;
      justify-content: space-around;
      padding: 1rem;
    }

    .alarm-stat {
      text-align: center;

      .count {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .label {
        font-size: 0.75rem;
        color: var(--text-secondary, #6b7280);
      }

      &.critical .count { color: #ef4444; }
      &.high .count { color: #f59e0b; }
      &.medium .count { color: #3b82f6; }
    }

    .user-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-color, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 600;
      font-size: 0.875rem;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      text-transform: capitalize;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      width: 100%;
      background: none;
      border: none;
      text-align: left;
      font-size: 0.875rem;
      color: var(--text-primary, #1f2937);
      cursor: pointer;
      text-decoration: none;

      &:hover {
        background: var(--hover-bg, #f3f4f6);
      }

      &.logout {
        color: var(--danger-color, #ef4444);
      }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-color, #e5e7eb);
      margin: 0.5rem 0;
    }

    .language-dropdown {
      .flag {
        font-size: 1.25rem;
      }

      .lang-code {
        font-size: 0.75rem;
        font-weight: 500;
      }
    }

    .icon {
      width: 20px;
      height: 20px;
    }
  `]
})
export class HeaderComponent {
  private translationService = inject(TranslationService);
  
  @Input() user?: User | null;
  @Input() notifications: Notification[] = [];
  @Input() activeAlarmsCount = 0;
  @Input() alarmsBySeverity?: Record<string, number>;
  @Input() breadcrumbs: Array<{label: string; url: string}> = [];
  @Input() pageTitle = 'Dashboard';
  
  @Output() onSearch = new EventEmitter<string>();
  @Output() onLogout = new EventEmitter<void>();
  @Output() onNotificationClick = new EventEmitter<Notification>();
  @Output() markAllRead = new EventEmitter<void>();
  @Output() languageChange = new EventEmitter<string>();
  @Output() toggleSidebar = new EventEmitter<void>();

  searchQuery = '';
  selectedLanguage = computed(() => this.translationService.getLanguage());
  
  t = computed(() => (key: string) => this.translationService.translate(key));

  languageDropdown = signal(false);
  notificationsDropdown = signal(false);
  alarmsDropdown = signal(false);
  userDropdown = signal(false);

  unreadCount = () => this.notifications.filter(n => !n.isRead).length;

  changeLanguage(lang: 'en' | 'tr'): void {
    this.translationService.setLanguage(lang);
    this.languageChange.emit(lang);
    this.languageDropdown.set(false);
  }

  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      [NotificationType.INFO]: 'info',
      [NotificationType.SUCCESS]: 'check-circle',
      [NotificationType.WARNING]: 'alert-triangle',
      [NotificationType.ERROR]: 'x-circle',
      [NotificationType.ALARM]: 'bell',
      [NotificationType.TASK]: 'clipboard'
    };
    return icons[type] || 'info';
  }
}
