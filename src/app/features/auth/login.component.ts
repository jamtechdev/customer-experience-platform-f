import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService, Language } from '../../core/services/translation.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <!-- Logo & Header -->
        <div class="login-header">
          <div class="header-top">
            <div class="logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="var(--primary-color)"/>
                <path d="M16 32V20L24 14L32 20V32H26V26H22V32H16Z" fill="white"/>
                <circle cx="24" cy="22" r="3" fill="white"/>
              </svg>
            </div>
            <div class="language-switcher">
              <button 
                class="lang-icon-btn"
                (click)="toggleLanguageMenu()"
                [attr.aria-expanded]="showLanguageMenu()"
                title="Change Language"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </button>
              @if (showLanguageMenu()) {
                <div class="language-menu">
                  <button 
                    class="lang-option" 
                    [class.active]="currentLang() === 'tr'"
                    (click)="switchLanguage('tr'); showLanguageMenu.set(false)"
                  >
                    <span class="lang-flag">🇹🇷</span>
                    <span class="lang-name">Türkçe</span>
                    @if (currentLang() === 'tr') {
                      <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  </button>
                  <button 
                    class="lang-option" 
                    [class.active]="currentLang() === 'en'"
                    (click)="switchLanguage('en'); showLanguageMenu.set(false)"
                  >
                    <span class="lang-flag">🇬🇧</span>
                    <span class="lang-name">English</span>
                    @if (currentLang() === 'en') {
                      <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  </button>
                </div>
              }
            </div>
          </div>
          <h1>{{ t('loginTitle') }}</h1>
          <p>{{ t('loginSubtitle') }}</p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="login-form">
          @if (successMessage()) {
            <div class="alert alert-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{{ successMessage() }}</span>
            </div>
          }
          @if (errorMessage()) {
            <div class="alert alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <div class="form-group">
            <label for="email">{{ t('email') }}</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                placeholder="ornek@albarakaturk.com.tr"
                required
                [disabled]="isLoading()"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">{{ t('password') }}</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
                [disabled]="isLoading()"
              />
              <button 
                type="button" 
                class="toggle-password"
                (click)="showPassword.set(!showPassword())"
              >
                @if (showPassword()) {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
              <span class="checkbox-custom"></span>
              <span>{{ t('rememberMe') }}</span>
            </label>
            <a routerLink="/forgot-password" class="forgot-link">{{ t('forgotPassword') }}</a>
          </div>

          <button type="submit" class="btn-login" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="spinner"></span>
              <span>Giriş Yapılıyor...</span>
            } @else {
              <span>{{ t('loginButton') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            }
          </button>
        </form>

        <!-- SSO Options -->
        <div class="sso-section">
          <div class="divider">
            <span>veya</span>
          </div>

          <button class="btn-sso" (click)="onSSOLogin('azure')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6L11.4 0v24zM24 24H12.6V12.6L24 0v24z"/>
            </svg>
            <span>Azure AD {{ t('login') }}</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p>&copy; {{ currentYear }} Albaraka Türk Katılım Bankası</p>
          <p class="version">CX Platform v1.0.0</p>
        </div>
      </div>

      <!-- Background Decoration -->
      <div class="login-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .login-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .circle {
      position: absolute;
      border-radius: 50%;
      opacity: 0.1;
    }

    .circle-1 {
      width: 600px;
      height: 600px;
      background: var(--primary-color);
      top: -200px;
      right: -200px;
    }

    .circle-2 {
      width: 400px;
      height: 400px;
      background: var(--success-color);
      bottom: -100px;
      left: -100px;
    }

    .circle-3 {
      width: 200px;
      height: 200px;
      background: var(--warning-color);
      top: 50%;
      left: 20%;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 40px;
      position: relative;
      z-index: 1;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
    }

    .logo svg {
      width: 100%;
      height: 100%;
    }

    .login-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .login-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.875rem;
    }

    .alert svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .alert-error {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .alert-success {
      background: #d1fae5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-wrapper > svg {
      position: absolute;
      left: 14px;
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
      pointer-events: none;
    }

    .input-wrapper input {
      width: 100%;
      padding: 14px 14px 14px 46px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: var(--bg-secondary);
    }

    .input-wrapper input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
      background: white;
    }

    .input-wrapper input::placeholder {
      color: var(--text-tertiary);
    }

    .input-wrapper input:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .toggle-password {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--text-tertiary);
      transition: color 0.2s ease;
    }

    .toggle-password:hover {
      color: var(--text-primary);
    }

    .toggle-password svg {
      width: 20px;
      height: 20px;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .checkbox-label input {
      display: none;
    }

    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color);
      border-radius: 4px;
      transition: all 0.2s ease;
      position: relative;
    }

    .checkbox-label input:checked + .checkbox-custom {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .checkbox-label input:checked + .checkbox-custom::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 2px;
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .forgot-link {
      font-size: 0.875rem;
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }

    .forgot-link:hover {
      color: var(--primary-dark);
      text-decoration: underline;
    }

    .btn-login {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-login svg {
      width: 20px;
      height: 20px;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sso-section {
      margin-top: 24px;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-color);
    }

    .divider span {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .btn-sso {
      width: 100%;
      padding: 12px 24px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s ease;
    }

    .btn-sso:hover {
      background: var(--bg-secondary);
      border-color: var(--primary-color);
    }

    .btn-sso svg {
      width: 20px;
      height: 20px;
      color: #0078d4;
    }

    .login-footer {
      margin-top: 32px;
      text-align: center;
      color: var(--text-tertiary);
      font-size: 0.75rem;
    }

    .login-footer .version {
      margin-top: 4px;
      opacity: 0.7;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 24px;
      }

      .form-options {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private translation = inject(TranslationService);

  email = '';
  password = '';
  rememberMe = false;
  
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation helper
  t = (key: string) => this.translation.translate(key);
  
  // Language switcher
  currentLang = this.translation.currentLang;
  showLanguageMenu = signal(false);
  
  switchLanguage(lang: Language): void {
    this.translation.setLanguage(lang);
    this.showLanguageMenu.set(false);
  }
  
  toggleLanguageMenu(): void {
    this.showLanguageMenu.set(!this.showLanguageMenu());
  }

  ngOnInit(): void {
    // Check if user just registered
    if (this.route.snapshot.queryParams['registered'] === 'true') {
      this.successMessage.set(this.t('signupSuccess'));
    }
    
    // Pre-fill email and password from query params (for testing)
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['email']) {
      this.email = decodeURIComponent(queryParams['email']);
    }
    if (queryParams['password']) {
      this.password = decodeURIComponent(queryParams['password']);
    }
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set(this.t('validationError'));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response && response.success && response.data) {
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          
          // Redirect to dashboard (or returnUrl if provided)
          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          const redirectUrl = returnUrl || '/app/dashboard';
          this.router.navigateByUrl(redirectUrl);
        } else {
          this.errorMessage.set(response?.message || this.t('loginError'));
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        let errorMsg = this.t('loginError');
        
        if (error?.error) {
          if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.errors && Array.isArray(error.error.errors) && error.error.errors.length > 0) {
            errorMsg = error.error.errors[0].msg || error.error.errors[0];
          } else if (typeof error.error === 'string') {
            errorMsg = error.error;
          }
        } else if (error?.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage.set(errorMsg);
        console.error('Login error:', error);
      }
    });
  }

  onSSOLogin(provider: string): void {
    // Redirect to SSO provider
    console.log('SSO Login:', provider);
    // In real implementation: window.location.href = `/api/auth/sso/${provider}`;
  }
}
