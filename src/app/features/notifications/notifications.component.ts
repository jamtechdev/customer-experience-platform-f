import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Notification {
  id: string;
  type: 'task' | 'alarm' | 'system' | 'feedback' | 'approval' | 'mention';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="notifications-page">
      <div class="notifications-header">
        <div class="header-left">
          <h1>Bildirimler</h1>
          <span class="unread-count" *ngIf="unreadCount() > 0">
            {{ unreadCount() }} okunmamış
          </span>
        </div>
        <div class="header-actions">
          <button class="btn btn-text" (click)="markAllAsRead()" *ngIf="unreadCount() > 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Tümünü Okundu İşaretle
          </button>
          <button class="btn btn-outline" (click)="openSettings()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Ayarlar
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button 
            class="filter-tab"
            [class.active]="activeFilter() === 'all'"
            (click)="setFilter('all')"
          >
            Tümü
            <span class="tab-count">{{ notifications().length }}</span>
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeFilter() === 'unread'"
            (click)="setFilter('unread')"
          >
            Okunmamış
            <span class="tab-count">{{ unreadCount() }}</span>
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeFilter() === 'task'"
            (click)="setFilter('task')"
          >
            Görevler
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeFilter() === 'alarm'"
            (click)="setFilter('alarm')"
          >
            Alarmlar
          </button>
          <button 
            class="filter-tab"
            [class.active]="activeFilter() === 'approval'"
            (click)="setFilter('approval')"
          >
            Onaylar
          </button>
        </div>

        <div class="filter-actions">
          <select [(ngModel)]="sortOrder" class="sort-select">
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
          </select>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list">
        @if (filteredNotifications().length === 0) {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h3>Bildirim yok</h3>
            <p>Yeni bildirimleriniz burada görünecek</p>
          </div>
        } @else {
          <!-- Group by date -->
          @for (group of groupedNotifications(); track group.date) {
            <div class="date-group">
              <div class="date-label">{{ group.label }}</div>
              @for (notification of group.items; track notification.id) {
                <div 
                  class="notification-item"
                  [class.unread]="!notification.read"
                  (click)="handleNotificationClick(notification)"
                >
                  <div class="notif-icon" [class]="notification.type">
                    @switch (notification.type) {
                      @case ('task') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      }
                      @case ('alarm') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      }
                      @case ('system') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                      }
                      @case ('feedback') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      }
                      @case ('approval') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      }
                      @case ('mention') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="4"/>
                          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                        </svg>
                      }
                    }
                  </div>

                  <div class="notif-content">
                    <div class="notif-header">
                      <span class="notif-title">{{ notification.title }}</span>
                      <span class="notif-time">{{ getTimeAgo(notification.timestamp) }}</span>
                    </div>
                    <p class="notif-message">{{ notification.message }}</p>
                    @if (notification.metadata) {
                      <div class="notif-meta">
                        @if (notification.metadata['source']) {
                          <span class="meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {{ notification.metadata['source'] }}
                          </span>
                        }
                        @if (notification.metadata['priority']) {
                          <span class="meta-item priority" [class]="notification.metadata['priority']">
                            {{ notification.metadata['priority'] === 'high' ? 'Yüksek Öncelik' : 
                               notification.metadata['priority'] === 'medium' ? 'Orta Öncelik' : 'Düşük Öncelik' }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div class="notif-actions">
                    @if (!notification.read) {
                      <button 
                        class="action-btn" 
                        title="Okundu işaretle"
                        (click)="markAsRead(notification, $event)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    }
                    <button 
                      class="action-btn delete" 
                      title="Sil"
                      (click)="deleteNotification(notification.id, $event)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Settings Modal -->
      @if (showSettings()) {
        <div class="modal-overlay" (click)="closeSettings()">
          <div class="settings-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Bildirim Ayarları</h2>
              <button class="close-btn" (click)="closeSettings()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="settings-section">
                <h3>Bildirim Kanalları</h3>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">E-posta Bildirimleri</span>
                    <span class="option-desc">Önemli güncellemeler için e-posta alın</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.email" />
                </label>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Push Bildirimleri</span>
                    <span class="option-desc">Tarayıcı bildirimleri</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.push" />
                </label>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">SMS Bildirimleri</span>
                    <span class="option-desc">Kritik alarmlar için SMS</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.sms" />
                </label>
              </div>

              <div class="settings-section">
                <h3>Bildirim Türleri</h3>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Görev Atamaları</span>
                    <span class="option-desc">Size atanan yeni görevler</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.tasks" />
                </label>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Alarm Bildirimleri</span>
                    <span class="option-desc">Sistem alarmları ve uyarılar</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.alarms" />
                </label>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Onay İstekleri</span>
                    <span class="option-desc">Maker-Checker onay talepleri</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.approvals" />
                </label>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Bahsetmeler</span>
                    <span class="option-desc">Yorumlarda bahsedildiğinizde</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.mentions" />
                </label>
              </div>

              <div class="settings-section">
                <h3>Sessiz Saatler</h3>
                <label class="setting-option">
                  <div class="option-info">
                    <span class="option-title">Sessiz Mod</span>
                    <span class="option-desc">Belirli saatlerde bildirim alma</span>
                  </div>
                  <input type="checkbox" [(ngModel)]="notifSettings.quietMode" />
                </label>
                @if (notifSettings.quietMode) {
                  <div class="quiet-hours">
                    <div class="time-range">
                      <label>Başlangıç</label>
                      <input type="time" [(ngModel)]="notifSettings.quietStart" />
                    </div>
                    <span class="time-separator">-</span>
                    <div class="time-range">
                      <label>Bitiş</label>
                      <input type="time" [(ngModel)]="notifSettings.quietEnd" />
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeSettings()">İptal</button>
              <button class="btn btn-primary" (click)="saveSettings()">Kaydet</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-page {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .notifications-header {
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

    .header-left h1 {
      font-size: 1.5rem;
      margin: 0;
    }

    .unread-count {
      background: var(--primary-color);
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-text {
      background: transparent;
      border: none;
      color: var(--primary-color);
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
    }

    .filter-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.2s ease;
    }

    .filter-tab:hover {
      background: var(--bg-secondary);
    }

    .filter-tab.active {
      background: var(--primary-light);
      color: var(--primary-color);
      font-weight: 500;
    }

    .tab-count {
      font-size: 0.75rem;
      background: var(--bg-secondary);
      padding: 2px 6px;
      border-radius: 10px;
    }

    .filter-tab.active .tab-count {
      background: rgba(0,0,0,0.1);
    }

    .sort-select {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
      background: white;
    }

    /* Notifications List */
    .notifications-list {
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-tertiary);
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .date-group {
      margin-bottom: 24px;
    }

    .date-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      margin-bottom: 12px;
      padding-left: 8px;
    }

    .notification-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .notification-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .notification-item.unread {
      background: var(--primary-light);
      border-color: var(--primary-color);
    }

    .notif-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .notif-icon svg {
      width: 22px;
      height: 22px;
    }

    .notif-icon.task {
      background: var(--info-light);
      color: var(--info-color);
    }

    .notif-icon.alarm {
      background: var(--warning-light);
      color: var(--warning-color);
    }

    .notif-icon.system {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }

    .notif-icon.feedback {
      background: var(--success-light);
      color: var(--success-color);
    }

    .notif-icon.approval {
      background: #ede9fe;
      color: #7c3aed;
    }

    .notif-icon.mention {
      background: #fce7f3;
      color: #db2777;
    }

    .notif-content {
      flex: 1;
      min-width: 0;
    }

    .notif-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .notif-title {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .notif-time {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      flex-shrink: 0;
    }

    .notif-message {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;
    }

    .notif-meta {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .meta-item svg {
      width: 12px;
      height: 12px;
    }

    .meta-item.priority {
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .meta-item.priority.high {
      background: var(--error-light);
      color: var(--error-color);
    }

    .meta-item.priority.medium {
      background: var(--warning-light);
      color: var(--warning-color);
    }

    .meta-item.priority.low {
      background: var(--bg-secondary);
      color: var(--text-tertiary);
    }

    .notif-actions {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.2s ease;
    }

    .notification-item:hover .action-btn {
      opacity: 1;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      background: var(--border-color);
    }

    .action-btn.delete:hover {
      background: var(--error-light);
    }

    .action-btn.delete:hover svg {
      color: var(--error-color);
    }

    /* Settings Modal */
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

    .settings-modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-header h2 {
      font-size: 1.125rem;
      margin: 0;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn svg {
      width: 18px;
      height: 18px;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section:last-child {
      margin-bottom: 0;
    }

    .settings-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .setting-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
    }

    .option-info {
      display: flex;
      flex-direction: column;
    }

    .option-title {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .option-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .setting-option input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color);
    }

    .quiet-hours {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .time-range {
      flex: 1;
    }

    .time-range label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 4px;
    }

    .time-range input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .time-separator {
      font-weight: 500;
      color: var(--text-tertiary);
      margin-top: 18px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 768px) {
      .notifications-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .filter-tabs {
        overflow-x: auto;
        width: 100%;
        padding-bottom: 8px;
      }

      .notification-item {
        flex-direction: column;
      }

      .notif-actions {
        justify-content: flex-end;
      }

      .notif-actions .action-btn {
        opacity: 1;
      }

      .settings-modal {
        margin: 16px;
        max-height: calc(100vh - 32px);
      }
    }
  `]
})
export class NotificationsComponent {
  private router = inject(Router);

  activeFilter = signal<string>('all');
  sortOrder = 'newest';
  showSettings = signal(false);

  notifSettings = {
    email: true,
    push: true,
    sms: false,
    tasks: true,
    alarms: true,
    approvals: true,
    mentions: true,
    quietMode: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  };

  notifications = signal<Notification[]>([
    {
      id: 'n1',
      type: 'alarm',
      title: 'Kritik Duygu Skoru Uyarısı',
      message: 'Instagram kanalında negatif duygu oranı %25\'i aştı. Acil aksiyon gerekebilir.',
      timestamp: new Date(),
      read: false,
      actionUrl: '/analysis/sentiment',
      metadata: { source: 'Instagram', priority: 'high' }
    },
    {
      id: 'n2',
      type: 'task',
      title: 'Yeni Görev Atandı',
      message: 'Mobil uygulama şikayetlerinin kök neden analizi görevi size atandı.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      actionUrl: '/tasks',
      metadata: { priority: 'medium' }
    },
    {
      id: 'n3',
      type: 'approval',
      title: 'Onay Bekliyor',
      message: 'Q4 2024 CX Raporu onayınızı bekliyor.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      actionUrl: '/maker-checker'
    },
    {
      id: 'n4',
      type: 'feedback',
      title: 'Yeni Müşteri Geri Bildirimi',
      message: 'Şubeden alınan 5 yıldızlı geri bildirim: "Personel çok ilgili ve yardımsever."',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: true
    },
    {
      id: 'n5',
      type: 'mention',
      title: 'Yorumda bahsedildiniz',
      message: '@ayse.demir tarafından mobil uygulama şikayeti analizinde bahsedildiniz.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: 'n6',
      type: 'system',
      title: 'Sistem Bakımı',
      message: 'Planlı sistem bakımı: 15 Ocak 2024, 02:00-04:00 arası',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: 'n7',
      type: 'alarm',
      title: 'NPS Skoru Düşüşü',
      message: 'Haftalık NPS skoru önceki haftaya göre 5 puan düştü.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      read: true,
      metadata: { priority: 'medium' }
    }
  ]);

  unreadCount = computed(() => 
    this.notifications().filter(n => !n.read).length
  );

  filteredNotifications = computed(() => {
    let items = [...this.notifications()];
    
    const filter = this.activeFilter();
    if (filter === 'unread') {
      items = items.filter(n => !n.read);
    } else if (filter !== 'all') {
      items = items.filter(n => n.type === filter);
    }

    if (this.sortOrder === 'oldest') {
      items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } else {
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return items;
  });

  groupedNotifications = computed(() => {
    const items = this.filteredNotifications();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups: { date: string; label: string; items: Notification[] }[] = [];

    const todayItems = items.filter(n => n.timestamp >= today);
    if (todayItems.length) {
      groups.push({ date: 'today', label: 'Bugün', items: todayItems });
    }

    const yesterdayItems = items.filter(n => 
      n.timestamp >= yesterday && n.timestamp < today
    );
    if (yesterdayItems.length) {
      groups.push({ date: 'yesterday', label: 'Dün', items: yesterdayItems });
    }

    const weekItems = items.filter(n => 
      n.timestamp >= thisWeek && n.timestamp < yesterday
    );
    if (weekItems.length) {
      groups.push({ date: 'week', label: 'Bu Hafta', items: weekItems });
    }

    const olderItems = items.filter(n => n.timestamp < thisWeek);
    if (olderItems.length) {
      groups.push({ date: 'older', label: 'Daha Eski', items: olderItems });
    }

    return groups;
  });

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  markAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notifications.update(items => 
      items.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
  }

  markAllAsRead(): void {
    this.notifications.update(items => 
      items.map(n => ({ ...n, read: true }))
    );
  }

  deleteNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notifications.update(items => 
      items.filter(n => n.id !== id)
    );
  }

  openSettings(): void {
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  saveSettings(): void {
    console.log('Saving settings:', this.notifSettings);
    this.closeSettings();
  }
}
