import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

interface SettingGroup {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Setting {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'toggle' | 'select' | 'textarea' | 'color' | 'email';
  value: any;
  options?: { value: string; label: string }[];
  group: string;
  required?: boolean;
  min?: number;
  max?: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Sistem Ayarları</h1>
          <p>Uygulama ayarlarını yapılandırın</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="resetToDefaults()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            Varsayılana Dön
          </button>
          <button class="btn btn-primary" (click)="saveSettings()" [disabled]="!hasChanges()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Kaydet
          </button>
        </div>
      </div>

      <div class="settings-layout">
        <!-- Settings Navigation -->
        <div class="settings-nav">
          @for (group of settingGroups; track group.id) {
            <button 
              class="nav-item"
              [class.active]="selectedGroup() === group.id"
              (click)="selectGroup(group.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                @switch (group.icon) {
                  @case ('globe') {
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  }
                  @case ('bell') {
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  }
                  @case ('shield') {
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  }
                  @case ('database') {
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  }
                  @case ('zap') {
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  }
                  @case ('mail') {
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  }
                  @case ('layout') {
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  }
                  @default {
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  }
                }
              </svg>
              <div class="nav-text">
                <span class="nav-title">{{ group.name }}</span>
                <span class="nav-desc">{{ group.description }}</span>
              </div>
            </button>
          }
        </div>

        <!-- Settings Content -->
        <div class="settings-content">
          <div class="content-header">
            <h2>{{ getCurrentGroupName() }}</h2>
            <p>{{ getCurrentGroupDescription() }}</p>
          </div>

          <div class="settings-form">
            @for (setting of getGroupSettings(); track setting.key) {
              <div class="setting-item" [class]="setting.type">
                <div class="setting-info">
                  <label [for]="setting.key">{{ setting.label }}</label>
                  <p>{{ setting.description }}</p>
                </div>
                <div class="setting-control">
                  @switch (setting.type) {
                    @case ('text') {
                      <input 
                        type="text" 
                        [id]="setting.key"
                        [(ngModel)]="setting.value"
                        (ngModelChange)="markChanged()"
                        [required]="setting.required ?? false"
                      />
                    }
                    @case ('number') {
                      <input 
                        type="number" 
                        [id]="setting.key"
                        [(ngModel)]="setting.value"
                        (ngModelChange)="markChanged()"
                        [min]="setting.min ?? null"
                        [max]="setting.max ?? null"
                      />
                    }
                    @case ('email') {
                      <input 
                        type="email" 
                        [id]="setting.key"
                        [(ngModel)]="setting.value"
                        (ngModelChange)="markChanged()"
                        [required]="setting.required ?? false"
                      />
                    }
                    @case ('toggle') {
                      <label class="toggle">
                        <input 
                          type="checkbox" 
                          [id]="setting.key"
                          [(ngModel)]="setting.value"
                          (ngModelChange)="markChanged()"
                        />
                        <span class="toggle-slider"></span>
                      </label>
                    }
                    @case ('select') {
                      <select 
                        [id]="setting.key"
                        [(ngModel)]="setting.value"
                        (ngModelChange)="markChanged()"
                      >
                        @for (opt of setting.options; track opt.value) {
                          <option [value]="opt.value">{{ opt.label }}</option>
                        }
                      </select>
                    }
                    @case ('textarea') {
                      <textarea 
                        [id]="setting.key"
                        [(ngModel)]="setting.value"
                        (ngModelChange)="markChanged()"
                        rows="3"
                      ></textarea>
                    }
                    @case ('color') {
                      <div class="color-input">
                        <input 
                          type="color" 
                          [id]="setting.key"
                          [(ngModel)]="setting.value"
                          (ngModelChange)="markChanged()"
                        />
                        <span>{{ setting.value }}</span>
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Unsaved Changes Warning -->
      @if (hasChanges()) {
        <div class="unsaved-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Kaydedilmemiş değişiklikler var</span>
          <div class="banner-actions">
            <button class="btn btn-link" (click)="discardChanges()">Vazgeç</button>
            <button class="btn btn-primary btn-sm" (click)="saveSettings()">Kaydet</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-page {
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .header-content p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: 12px;
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
      transition: all 0.2s ease;
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

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-dark);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .btn-link {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 8px 12px;
    }

    .btn-link:hover {
      color: var(--text-primary);
    }

    .btn-sm {
      padding: 8px 16px;
    }

    /* Layout */
    .settings-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
      min-height: calc(100vh - 200px);
    }

    /* Navigation */
    .settings-nav {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 12px;
      height: fit-content;
    }

    .nav-item {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .nav-item svg {
      width: 22px;
      height: 22px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .nav-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-title {
      font-weight: 500;
      font-size: 0.9375rem;
      color: var(--text-primary);
    }

    .nav-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .nav-item:hover {
      background: var(--bg-secondary);
    }

    .nav-item.active {
      background: var(--primary-light);
    }

    .nav-item.active svg {
      color: var(--primary-color);
    }

    .nav-item.active .nav-title {
      color: var(--primary-color);
    }

    /* Content */
    .settings-content {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
    }

    .content-header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .content-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .content-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    /* Settings Form */
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .setting-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .setting-item.toggle {
      align-items: center;
    }

    .setting-info {
      flex: 1;
    }

    .setting-info label {
      display: block;
      font-weight: 500;
      font-size: 0.9375rem;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .setting-info p {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      line-height: 1.5;
    }

    .setting-control {
      flex-shrink: 0;
      min-width: 200px;
    }

    .setting-control input[type="text"],
    .setting-control input[type="number"],
    .setting-control input[type="email"],
    .setting-control select,
    .setting-control textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      transition: border-color 0.2s ease;
    }

    .setting-control input:focus,
    .setting-control select:focus,
    .setting-control textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .setting-control textarea {
      resize: vertical;
    }

    /* Toggle */
    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
      cursor: pointer;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--border-color);
      border-radius: 14px;
      transition: 0.3s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .toggle input:checked + .toggle-slider {
      background-color: var(--primary-color);
    }

    .toggle input:checked + .toggle-slider::before {
      transform: translateX(22px);
    }

    /* Color Input */
    .color-input {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .color-input input[type="color"] {
      width: 48px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
    }

    .color-input span {
      font-family: 'Fira Code', monospace;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    /* Unsaved Banner */
    .unsaved-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: var(--text-primary);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 100;
    }

    .unsaved-banner svg {
      width: 20px;
      height: 20px;
      color: var(--warning-color);
    }

    .unsaved-banner span {
      font-size: 0.875rem;
    }

    .banner-actions {
      display: flex;
      gap: 8px;
      margin-left: 12px;
    }

    .banner-actions .btn-link {
      color: rgba(255, 255, 255, 0.7);
    }

    .banner-actions .btn-link:hover {
      color: white;
    }

    .banner-actions .btn-primary {
      background: white;
      color: var(--text-primary);
    }

    .banner-actions .btn-primary:hover {
      background: var(--bg-secondary);
    }

    @media (max-width: 1024px) {
      .settings-layout {
        grid-template-columns: 1fr;
      }

      .settings-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 8px;
      }

      .nav-item {
        flex: 1;
        min-width: 140px;
        padding: 12px;
      }

      .nav-desc {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .btn {
        flex: 1;
      }

      .setting-item {
        flex-direction: column;
        gap: 12px;
      }

      .setting-control {
        width: 100%;
        min-width: unset;
      }

      .unsaved-banner {
        left: 16px;
        right: 16px;
        transform: none;
        flex-wrap: wrap;
      }

      .banner-actions {
        width: 100%;
        margin-left: 0;
        margin-top: 8px;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService);

  selectedGroup = signal('general');
  changed = signal(false);

  settingGroups: SettingGroup[] = [
    { id: 'general', name: 'Genel', icon: 'globe', description: 'Temel uygulama ayarları' },
    { id: 'notifications', name: 'Bildirimler', icon: 'bell', description: 'Bildirim tercihleri' },
    { id: 'security', name: 'Güvenlik', icon: 'shield', description: 'Güvenlik ve gizlilik' },
    { id: 'data', name: 'Veri Yönetimi', icon: 'database', description: 'Veri işleme ayarları' },
    { id: 'integrations', name: 'Entegrasyonlar', icon: 'zap', description: 'Dış sistem bağlantıları' },
    { id: 'email', name: 'E-posta', icon: 'mail', description: 'E-posta şablonları' },
    { id: 'appearance', name: 'Görünüm', icon: 'layout', description: 'Arayüz özelleştirme' }
  ];

  settings: Setting[] = [
    // General
    { key: 'app_name', label: 'Uygulama Adı', description: 'Sistemde görünecek uygulama adı', type: 'text', value: 'Sentimenter CX', group: 'general', required: true },
    { key: 'company_name', label: 'Şirket Adı', description: 'Raporlarda ve bildirimlerde kullanılacak şirket adı', type: 'text', value: 'Albaraka Türk', group: 'general', required: true },
    { key: 'default_language', label: 'Varsayılan Dil', description: 'Yeni kullanıcılar için varsayılan arayüz dili', type: 'select', value: 'tr', group: 'general', options: [
      { value: 'tr', label: 'Türkçe' },
      { value: 'en', label: 'English' },
      { value: 'ar', label: 'العربية' }
    ]},
    { key: 'timezone', label: 'Saat Dilimi', description: 'Sistem genelinde kullanılacak saat dilimi', type: 'select', value: 'Europe/Istanbul', group: 'general', options: [
      { value: 'Europe/Istanbul', label: 'İstanbul (UTC+3)' },
      { value: 'Europe/London', label: 'Londra (UTC+0)' },
      { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' }
    ]},
    { key: 'date_format', label: 'Tarih Formatı', description: 'Tarih gösterim formatı', type: 'select', value: 'dd.MM.yyyy', group: 'general', options: [
      { value: 'dd.MM.yyyy', label: '31.01.2024' },
      { value: 'yyyy-MM-dd', label: '2024-01-31' },
      { value: 'MM/dd/yyyy', label: '01/31/2024' }
    ]},

    // Notifications
    { key: 'email_notifications', label: 'E-posta Bildirimleri', description: 'Önemli olaylar için e-posta bildirimi gönder', type: 'toggle', value: true, group: 'notifications' },
    { key: 'browser_notifications', label: 'Tarayıcı Bildirimleri', description: 'Tarayıcı üzerinden anlık bildirim göster', type: 'toggle', value: true, group: 'notifications' },
    { key: 'alarm_notification', label: 'Alarm Bildirimleri', description: 'Alarm tetiklendiğinde bildirim gönder', type: 'toggle', value: true, group: 'notifications' },
    { key: 'daily_digest', label: 'Günlük Özet', description: 'Günlük aktivite özeti e-postası gönder', type: 'toggle', value: false, group: 'notifications' },
    { key: 'notification_email', label: 'Bildirim E-postası', description: 'Sistem bildirimlerinin gönderileceği e-posta adresi', type: 'email', value: 'notifications@albarakaturk.com.tr', group: 'notifications' },

    // Security
    { key: 'session_timeout', label: 'Oturum Süresi (dk)', description: 'İşlem yapılmadığında otomatik çıkış süresi', type: 'number', value: 30, group: 'security', min: 5, max: 480 },
    { key: 'password_min_length', label: 'Min. Şifre Uzunluğu', description: 'Kullanıcı şifrelerinin minimum karakter sayısı', type: 'number', value: 8, group: 'security', min: 6, max: 32 },
    { key: 'require_2fa', label: 'İki Faktörlü Doğrulama', description: 'Tüm kullanıcılar için 2FA zorunlu olsun', type: 'toggle', value: false, group: 'security' },
    { key: 'ip_restriction', label: 'IP Kısıtlaması', description: 'Sadece belirli IP adreslerinden erişime izin ver', type: 'toggle', value: false, group: 'security' },
    { key: 'allowed_ips', label: 'İzin Verilen IP\'ler', description: 'Virgülle ayrılmış IP adresleri veya CIDR blokları', type: 'textarea', value: '', group: 'security' },
    { key: 'audit_logging', label: 'Denetim Kaydı', description: 'Tüm kullanıcı işlemlerini kaydet', type: 'toggle', value: true, group: 'security' },

    // Data
    { key: 'data_retention_days', label: 'Veri Saklama (gün)', description: 'Ham verilerin sistemde saklanacağı süre', type: 'number', value: 365, group: 'data', min: 30, max: 3650 },
    { key: 'auto_cleanup', label: 'Otomatik Temizlik', description: 'Eski verileri otomatik olarak temizle', type: 'toggle', value: true, group: 'data' },
    { key: 'export_format', label: 'Varsayılan Dışa Aktarma', description: 'Raporlar için varsayılan dosya formatı', type: 'select', value: 'xlsx', group: 'data', options: [
      { value: 'xlsx', label: 'Excel (XLSX)' },
      { value: 'csv', label: 'CSV' },
      { value: 'pdf', label: 'PDF' },
      { value: 'json', label: 'JSON' }
    ]},
    { key: 'anonymize_data', label: 'Veri Anonimleştirme', description: 'Raporlarda kişisel verileri gizle', type: 'toggle', value: true, group: 'data' },
    { key: 'gdpr_compliance', label: 'KVKK/GDPR Uyumu', description: 'Kişisel veri işleme uyumluluk modu', type: 'toggle', value: true, group: 'data' },

    // Integrations
    { key: 'api_enabled', label: 'API Erişimi', description: 'REST API erişimini etkinleştir', type: 'toggle', value: true, group: 'integrations' },
    { key: 'api_rate_limit', label: 'API Hız Limiti', description: 'Dakika başına maksimum API isteği', type: 'number', value: 100, group: 'integrations', min: 10, max: 10000 },
    { key: 'webhook_enabled', label: 'Webhook Bildirimleri', description: 'Olaylar için webhook bildirimi gönder', type: 'toggle', value: false, group: 'integrations' },
    { key: 'webhook_url', label: 'Webhook URL', description: 'Bildirimlerin gönderileceği URL', type: 'text', value: '', group: 'integrations' },
    { key: 'azure_ad_enabled', label: 'Azure AD SSO', description: 'Azure Active Directory ile oturum açmayı etkinleştir', type: 'toggle', value: true, group: 'integrations' },

    // Email
    { key: 'smtp_host', label: 'SMTP Sunucusu', description: 'E-posta gönderimi için SMTP sunucu adresi', type: 'text', value: 'smtp.albarakaturk.com.tr', group: 'email' },
    { key: 'smtp_port', label: 'SMTP Port', description: 'SMTP sunucu portu', type: 'number', value: 587, group: 'email', min: 1, max: 65535 },
    { key: 'smtp_username', label: 'SMTP Kullanıcı', description: 'SMTP kimlik doğrulama kullanıcı adı', type: 'text', value: 'noreply@albarakaturk.com.tr', group: 'email' },
    { key: 'sender_name', label: 'Gönderen Adı', description: 'E-postalarda görünecek gönderen adı', type: 'text', value: 'Sentimenter CX', group: 'email' },
    { key: 'sender_email', label: 'Gönderen E-posta', description: 'E-postalarda görünecek gönderen adresi', type: 'email', value: 'noreply@albarakaturk.com.tr', group: 'email' },

    // Appearance
    { key: 'primary_color', label: 'Ana Renk', description: 'Uygulamanın ana tema rengi', type: 'color', value: '#00553A', group: 'appearance' },
    { key: 'logo_text', label: 'Logo Metni', description: 'Sidebar\'da görünecek logo metni', type: 'text', value: 'Sentimenter', group: 'appearance' },
    { key: 'compact_mode', label: 'Kompakt Mod', description: 'Daha küçük boşluklar ve yazı boyutları kullan', type: 'toggle', value: false, group: 'appearance' },
    { key: 'dark_mode', label: 'Karanlık Mod', description: 'Karanlık tema varsayılan olsun', type: 'toggle', value: false, group: 'appearance' },
    { key: 'sidebar_collapsed', label: 'Sidebar Kapalı Başlasın', description: 'Uygulama açıldığında sidebar daraltılmış olsun', type: 'toggle', value: false, group: 'appearance' }
  ];

  originalSettings: Map<string, any> = new Map();

  ngOnInit(): void {
    this.saveOriginalValues();
  }

  saveOriginalValues(): void {
    this.settings.forEach(s => {
      this.originalSettings.set(s.key, s.value);
    });
  }

  selectGroup(id: string): void {
    this.selectedGroup.set(id);
  }

  getCurrentGroupName(): string {
    return this.settingGroups.find(g => g.id === this.selectedGroup())?.name || '';
  }

  getCurrentGroupDescription(): string {
    return this.settingGroups.find(g => g.id === this.selectedGroup())?.description || '';
  }

  getGroupSettings(): Setting[] {
    return this.settings.filter(s => s.group === this.selectedGroup());
  }

  markChanged(): void {
    this.changed.set(true);
  }

  hasChanges(): boolean {
    return this.changed();
  }

  saveSettings(): void {
    console.log('Saving settings...', this.settings);
    this.saveOriginalValues();
    this.changed.set(false);
  }

  discardChanges(): void {
    this.settings.forEach(s => {
      s.value = this.originalSettings.get(s.key);
    });
    this.changed.set(false);
  }

  resetToDefaults(): void {
    if (confirm('Tüm ayarları varsayılan değerlere döndürmek istediğinizden emin misiniz?')) {
      // Reset to default values
      console.log('Reset to defaults');
    }
  }
}
