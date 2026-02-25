import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  avatar?: string;
  preferences: {
    language: 'tr' | 'en' | 'ar';
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
  };
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  details?: string;
  ip?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <div class="profile-header">
        <h1>Profilim</h1>
        <p>Hesap ayarlarınızı ve tercihlerinizi yönetin</p>
      </div>

      <div class="profile-layout">
        <!-- Sidebar -->
        <div class="profile-sidebar">
          <div class="profile-card">
            <div class="avatar-section">
              <div class="avatar-wrapper">
                @if (profile().avatar) {
                  <img [src]="profile().avatar" alt="Avatar" />
                } @else {
                  <div class="avatar-placeholder">
                    {{ getInitials() }}
                  </div>
                }
                <button class="avatar-edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              </div>
              <h3>{{ profile().firstName }} {{ profile().lastName }}</h3>
              <p class="role-label">{{ profile().role }}</p>
              <p class="dept-label">{{ profile().department }}</p>
            </div>
            
            <div class="profile-stats">
              <div class="stat-item">
                <span class="stat-value">127</span>
                <span class="stat-label">Görev</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">89%</span>
                <span class="stat-label">Başarı</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">34</span>
                <span class="stat-label">Gün</span>
              </div>
            </div>
          </div>

          <div class="nav-card">
            <button 
              class="nav-item"
              [class.active]="activeTab() === 'profile'"
              (click)="setActiveTab('profile')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profil Bilgileri
            </button>
            <button 
              class="nav-item"
              [class.active]="activeTab() === 'security'"
              (click)="setActiveTab('security')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Güvenlik
            </button>
            <button 
              class="nav-item"
              [class.active]="activeTab() === 'preferences'"
              (click)="setActiveTab('preferences')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Tercihler
            </button>
            <button 
              class="nav-item"
              [class.active]="activeTab() === 'activity'"
              (click)="setActiveTab('activity')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Aktivite Geçmişi
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="profile-content">
          @switch (activeTab()) {
            @case ('profile') {
              <div class="content-section">
                <div class="section-header">
                  <h2>Profil Bilgileri</h2>
                  <p>Kişisel bilgilerinizi güncelleyin</p>
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>Ad</label>
                    <input type="text" [(ngModel)]="profile().firstName" />
                  </div>
                  <div class="form-group">
                    <label>Soyad</label>
                    <input type="text" [(ngModel)]="profile().lastName" />
                  </div>
                  <div class="form-group full-width">
                    <label>E-posta</label>
                    <input type="email" [(ngModel)]="profile().email" disabled />
                    <span class="field-hint">E-posta değişikliği için IT ekibiyle iletişime geçin</span>
                  </div>
                  <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" [(ngModel)]="profile().phone" />
                  </div>
                  <div class="form-group">
                    <label>Departman</label>
                    <input type="text" [(ngModel)]="profile().department" disabled />
                  </div>
                </div>

                <div class="form-actions">
                  <button class="btn btn-primary" (click)="saveProfile()">
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            }

            @case ('security') {
              <div class="content-section">
                <div class="section-header">
                  <h2>Güvenlik Ayarları</h2>
                  <p>Hesap güvenliğinizi yönetin</p>
                </div>

                <div class="security-section">
                  <h3>Şifre Değiştir</h3>
                  <div class="form-grid">
                    <div class="form-group full-width">
                      <label>Mevcut Şifre</label>
                      <input type="password" [(ngModel)]="currentPassword" />
                    </div>
                    <div class="form-group">
                      <label>Yeni Şifre</label>
                      <input type="password" [(ngModel)]="newPassword" />
                    </div>
                    <div class="form-group">
                      <label>Şifre Tekrar</label>
                      <input type="password" [(ngModel)]="confirmPassword" />
                    </div>
                  </div>

                  <div class="password-requirements">
                    <span class="req-title">Şifre gereksinimleri:</span>
                    <ul>
                      <li [class.met]="passwordReqs().minLength">En az 8 karakter</li>
                      <li [class.met]="passwordReqs().hasUpper">En az 1 büyük harf</li>
                      <li [class.met]="passwordReqs().hasLower">En az 1 küçük harf</li>
                      <li [class.met]="passwordReqs().hasNumber">En az 1 rakam</li>
                      <li [class.met]="passwordReqs().hasSpecial">En az 1 özel karakter</li>
                    </ul>
                  </div>

                  <div class="form-actions">
                    <button class="btn btn-primary" (click)="changePassword()">
                      Şifreyi Değiştir
                    </button>
                  </div>
                </div>

                <div class="security-section">
                  <h3>İki Faktörlü Doğrulama</h3>
                  <div class="two-factor-card">
                    <div class="two-factor-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <div class="two-factor-text">
                        <h4>SMS ile Doğrulama</h4>
                        <p>Giriş yaparken telefonunuza SMS ile kod gönderilir</p>
                      </div>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" [(ngModel)]="twoFactorEnabled" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>

                <div class="security-section">
                  <h3>Aktif Oturumlar</h3>
                  <div class="sessions-list">
                    @for (session of activeSessions(); track session.id) {
                      <div class="session-item" [class.current]="session.current">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          @if (session.device === 'desktop') {
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          } @else {
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                          }
                        </svg>
                        <div class="session-info">
                          <span class="session-device">{{ session.name }}</span>
                          <span class="session-details">
                            {{ session.location }} • {{ session.lastActive | date:'dd MMM HH:mm' }}
                            @if (session.current) {
                              <span class="current-badge">Bu cihaz</span>
                            }
                          </span>
                        </div>
                        @if (!session.current) {
                          <button class="end-session-btn" (click)="endSession(session.id)">
                            Sonlandır
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @case ('preferences') {
              <div class="content-section">
                <div class="section-header">
                  <h2>Tercihler</h2>
                  <p>Uygulama tercihlerinizi özelleştirin</p>
                </div>

                <div class="pref-section">
                  <h3>Genel</h3>
                  <div class="pref-grid">
                    <div class="pref-item">
                      <div class="pref-label">
                        <span>Dil</span>
                        <span class="pref-desc">Arayüz dili</span>
                      </div>
                      <select [(ngModel)]="profile().preferences.language">
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                        <option value="ar">العربية</option>
                      </select>
                    </div>
                    <div class="pref-item">
                      <div class="pref-label">
                        <span>Saat Dilimi</span>
                        <span class="pref-desc">Tarih ve saat gösterimi</span>
                      </div>
                      <select [(ngModel)]="profile().preferences.timezone">
                        <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                        <option value="Europe/London">Londra (GMT+0)</option>
                        <option value="Asia/Dubai">Dubai (GMT+4)</option>
                      </select>
                    </div>
                    <div class="pref-item">
                      <div class="pref-label">
                        <span>Tema</span>
                        <span class="pref-desc">Görünüm tercihi</span>
                      </div>
                      <div class="theme-options">
                        <button 
                          class="theme-option"
                          [class.active]="profile().preferences.theme === 'light'"
                          (click)="setTheme('light')"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"/>
                            <line x1="12" y1="1" x2="12" y2="3"/>
                            <line x1="12" y1="21" x2="12" y2="23"/>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                            <line x1="1" y1="12" x2="3" y2="12"/>
                            <line x1="21" y1="12" x2="23" y2="12"/>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                          </svg>
                          Açık
                        </button>
                        <button 
                          class="theme-option"
                          [class.active]="profile().preferences.theme === 'dark'"
                          (click)="setTheme('dark')"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                          </svg>
                          Koyu
                        </button>
                        <button 
                          class="theme-option"
                          [class.active]="profile().preferences.theme === 'auto'"
                          (click)="setTheme('auto')"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          Otomatik
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pref-section">
                  <h3>Bildirimler</h3>
                  <div class="notif-options">
                    <label class="notif-option">
                      <div class="notif-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <div>
                          <span>E-posta Bildirimleri</span>
                          <span class="notif-desc">Önemli güncellemeler e-posta ile gönderilsin</span>
                        </div>
                      </div>
                      <input type="checkbox" [(ngModel)]="profile().preferences.notifications.email" />
                    </label>
                    <label class="notif-option">
                      <div class="notif-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        <div>
                          <span>Push Bildirimleri</span>
                          <span class="notif-desc">Tarayıcı bildirimleri alın</span>
                        </div>
                      </div>
                      <input type="checkbox" [(ngModel)]="profile().preferences.notifications.push" />
                    </label>
                    <label class="notif-option">
                      <div class="notif-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <div>
                          <span>SMS Bildirimleri</span>
                          <span class="notif-desc">Acil durumlar için SMS alın</span>
                        </div>
                      </div>
                      <input type="checkbox" [(ngModel)]="profile().preferences.notifications.sms" />
                    </label>
                  </div>
                </div>

                <div class="form-actions">
                  <button class="btn btn-primary" (click)="savePreferences()">
                    Tercihleri Kaydet
                  </button>
                </div>
              </div>
            }

            @case ('activity') {
              <div class="content-section">
                <div class="section-header">
                  <h2>Aktivite Geçmişi</h2>
                  <p>Son hesap aktiviteleriniz</p>
                </div>

                <div class="activity-timeline">
                  @for (activity of activityLogs(); track activity.id) {
                    <div class="activity-item">
                      <div class="activity-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          @switch (activity.action) {
                            @case ('login') {
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                              <polyline points="10 17 15 12 10 7"/>
                              <line x1="15" y1="12" x2="3" y2="12"/>
                            }
                            @case ('password_change') {
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            }
                            @case ('profile_update') {
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            }
                            @default {
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            }
                          }
                        </svg>
                      </div>
                      <div class="activity-content">
                        <span class="activity-action">{{ getActivityLabel(activity.action) }}</span>
                        @if (activity.details) {
                          <span class="activity-details">{{ activity.details }}</span>
                        }
                        <span class="activity-time">
                          {{ activity.timestamp | date:'dd MMM yyyy HH:mm' }}
                          @if (activity.ip) {
                            <span class="activity-ip">IP: {{ activity.ip }}</span>
                          }
                        </span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .profile-header {
      margin-bottom: 32px;
    }

    .profile-header h1 {
      font-size: 1.75rem;
      margin-bottom: 4px;
    }

    .profile-header p {
      color: var(--text-secondary);
    }

    .profile-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
    }

    /* Sidebar */
    .profile-sidebar {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .profile-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .avatar-section {
      text-align: center;
    }

    .avatar-wrapper {
      position: relative;
      width: 100px;
      height: 100px;
      margin: 0 auto 16px;
    }

    .avatar-wrapper img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 600;
    }

    .avatar-edit {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 32px;
      height: 32px;
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-edit svg {
      width: 14px;
      height: 14px;
    }

    .avatar-section h3 {
      margin-bottom: 4px;
    }

    .role-label {
      color: var(--primary-color);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .dept-label {
      color: var(--text-tertiary);
      font-size: 0.8125rem;
    }

    .profile-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .nav-card {
      background: white;
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .nav-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      text-align: left;
      transition: all 0.2s ease;
    }

    .nav-item svg {
      width: 20px;
      height: 20px;
      color: var(--text-secondary);
    }

    .nav-item:hover {
      background: var(--bg-secondary);
    }

    .nav-item.active {
      background: var(--primary-light);
      color: var(--primary-color);
    }

    .nav-item.active svg {
      color: var(--primary-color);
    }

    /* Content */
    .profile-content {
      min-height: 600px;
    }

    .content-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .section-header {
      margin-bottom: 24px;
    }

    .section-header h2 {
      font-size: 1.25rem;
      margin-bottom: 4px;
    }

    .section-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-group label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .form-group input,
    .form-group select {
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-group input:disabled {
      background: var(--bg-secondary);
      cursor: not-allowed;
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .form-actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
    }

    /* Security */
    .security-section {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--border-color);
    }

    .security-section:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .security-section h3 {
      font-size: 1rem;
      margin-bottom: 16px;
    }

    .password-requirements {
      margin-top: 16px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .req-title {
      font-size: 0.8125rem;
      font-weight: 500;
      display: block;
      margin-bottom: 8px;
    }

    .password-requirements ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .password-requirements li {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .password-requirements li::before {
      content: '○';
      color: var(--border-color);
    }

    .password-requirements li.met {
      color: var(--success-color);
    }

    .password-requirements li.met::before {
      content: '●';
      color: var(--success-color);
    }

    .two-factor-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .two-factor-info {
      display: flex;
      gap: 12px;
    }

    .two-factor-info svg {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
    }

    .two-factor-text h4 {
      font-size: 0.875rem;
      margin-bottom: 2px;
    }

    .two-factor-text p {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .toggle-switch {
      position: relative;
      width: 48px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--border-color);
      transition: 0.3s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--primary-color);
    }

    input:checked + .slider:before {
      transform: translateX(24px);
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .session-item.current {
      border: 1px solid var(--primary-color);
      background: var(--primary-light);
    }

    .session-item svg {
      width: 24px;
      height: 24px;
      color: var(--text-secondary);
    }

    .session-info {
      flex: 1;
    }

    .session-device {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .session-details {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .current-badge {
      background: var(--primary-color);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.625rem;
      margin-left: 8px;
    }

    .end-session-btn {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid var(--error-color);
      color: var(--error-color);
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
    }

    /* Preferences */
    .pref-section {
      margin-bottom: 32px;
    }

    .pref-section h3 {
      font-size: 1rem;
      margin-bottom: 16px;
    }

    .pref-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .pref-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .pref-label span:first-child {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .pref-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .pref-item select {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
      background: white;
    }

    .theme-options {
      display: flex;
      gap: 8px;
    }

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .theme-option svg {
      width: 20px;
      height: 20px;
    }

    .theme-option.active {
      border-color: var(--primary-color);
      background: var(--primary-light);
    }

    .notif-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .notif-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
    }

    .notif-label {
      display: flex;
      gap: 12px;
    }

    .notif-label svg {
      width: 24px;
      height: 24px;
      color: var(--text-secondary);
    }

    .notif-label span:first-child {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .notif-desc {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .notif-option input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color);
    }

    /* Activity */
    .activity-timeline {
      position: relative;
      padding-left: 28px;
    }

    .activity-timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .activity-item {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      position: relative;
    }

    .activity-icon {
      position: absolute;
      left: -28px;
      width: 24px;
      height: 24px;
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .activity-icon svg {
      width: 12px;
      height: 12px;
      color: var(--text-secondary);
    }

    .activity-content {
      flex: 1;
    }

    .activity-action {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .activity-details {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .activity-time {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 4px;
    }

    .activity-ip {
      margin-left: 8px;
    }

    @media (max-width: 1024px) {
      .profile-layout {
        grid-template-columns: 1fr;
      }

      .profile-sidebar {
        flex-direction: row;
        overflow-x: auto;
      }

      .profile-card {
        min-width: 200px;
      }

      .nav-card {
        display: flex;
        min-width: max-content;
      }
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-group.full-width {
        grid-column: span 1;
      }

      .password-requirements ul {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent {
  private authService = inject(AuthService);

  activeTab = signal<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  twoFactorEnabled = false;

  profile = signal<UserProfile>({
    id: 'usr-001',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    email: 'ahmet.yilmaz@albarakaturk.com.tr',
    phone: '+90 532 123 4567',
    department: 'Müşteri Deneyimi',
    role: 'CX Analisti',
    preferences: {
      language: 'tr',
      timezone: 'Europe/Istanbul',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      theme: 'light'
    }
  });

  passwordReqs = computed(() => ({
    minLength: this.newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(this.newPassword),
    hasLower: /[a-z]/.test(this.newPassword),
    hasNumber: /[0-9]/.test(this.newPassword),
    hasSpecial: /[!@#$%^&*]/.test(this.newPassword)
  }));

  activeSessions = signal([
    {
      id: 's1',
      device: 'desktop',
      name: 'Chrome - Windows',
      location: 'İstanbul, Türkiye',
      lastActive: new Date(),
      current: true
    },
    {
      id: 's2',
      device: 'mobile',
      name: 'Safari - iPhone',
      location: 'İstanbul, Türkiye',
      lastActive: new Date('2024-01-06T18:30:00')
    }
  ]);

  activityLogs = signal<ActivityLog[]>([
    {
      id: 'a1',
      action: 'login',
      timestamp: new Date(),
      details: 'Chrome tarayıcısından giriş yapıldı',
      ip: '192.168.1.100'
    },
    {
      id: 'a2',
      action: 'password_change',
      timestamp: new Date('2024-01-05T14:20:00'),
      ip: '192.168.1.100'
    },
    {
      id: 'a3',
      action: 'profile_update',
      timestamp: new Date('2024-01-03T10:15:00'),
      details: 'Telefon numarası güncellendi'
    },
    {
      id: 'a4',
      action: 'login',
      timestamp: new Date('2024-01-02T09:00:00'),
      details: 'Mobil uygulamadan giriş yapıldı',
      ip: '10.0.0.50'
    }
  ]);

  setActiveTab(tab: 'profile' | 'security' | 'preferences' | 'activity'): void {
    this.activeTab.set(tab);
  }

  getInitials(): string {
    const p = this.profile();
    return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`;
  }

  saveProfile(): void {
    console.log('Saving profile:', this.profile());
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      alert('Şifreler eşleşmiyor');
      return;
    }
    console.log('Changing password');
  }

  endSession(sessionId: string): void {
    this.activeSessions.update(sessions => 
      sessions.filter(s => s.id !== sessionId)
    );
  }

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.profile.update(p => ({
      ...p,
      preferences: { ...p.preferences, theme }
    }));
  }

  savePreferences(): void {
    console.log('Saving preferences:', this.profile().preferences);
  }

  getActivityLabel(action: string): string {
    const labels: Record<string, string> = {
      login: 'Oturum açıldı',
      password_change: 'Şifre değiştirildi',
      profile_update: 'Profil güncellendi'
    };
    return labels[action] || action;
  }
}
