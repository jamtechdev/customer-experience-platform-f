import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService, Language } from '../../core/services/translation.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="signup-container">
      <div class="signup-card">
        <!-- Header -->
        <div class="signup-header">
          <div class="header-top">
            <div class="logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="#059669"/>
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
          <h1>{{ t('signupTitle') }}</h1>
          <p>{{ t('signupSubtitle') }}</p>
        </div>

        <!-- Signup Form -->
        <form (ngSubmit)="onSignup()" class="signup-form">
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

          @if (successMessage()) {
            <div class="alert alert-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <div class="form-row">
            <div class="form-group">
              <label for="firstName">{{ t('firstName') }}</label>
              <input
                type="text"
                id="firstName"
                [(ngModel)]="firstName"
                name="firstName"
                [placeholder]="t('firstName')"
                required
                [disabled]="isLoading()"
              />
            </div>
            <div class="form-group">
              <label for="lastName">{{ t('lastName') }}</label>
              <input
                type="text"
                id="lastName"
                [(ngModel)]="lastName"
                name="lastName"
                [placeholder]="t('lastName')"
                required
                [disabled]="isLoading()"
              />
            </div>
          </div>

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
                placeholder="En az 6 karakter"
                required
                minlength="6"
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

          <div class="form-group">
            <label for="confirmPassword">{{ t('confirmPassword') }}</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                [type]="showConfirmPassword() ? 'text' : 'password'"
                id="confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                placeholder="Şifrenizi tekrar girin"
                required
                [disabled]="isLoading()"
              />
              <button 
                type="button" 
                class="toggle-password"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
              >
                @if (showConfirmPassword()) {
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

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="agreeToTerms" name="agreeToTerms" required />
              <span class="checkbox-custom"></span>
              <span>{{ t('agreeToTerms') }}</span>
            </label>
          </div>

          <button type="submit" class="btn-signup" [disabled]="isLoading() || !agreeToTerms">
            @if (isLoading()) {
              <span class="spinner"></span>
              <span>Kayıt Olunuyor...</span>
            } @else {
              <span>{{ t('signupButton') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            }
          </button>
        </form>

        <!-- Footer -->
        <div class="signup-footer">
          <p>{{ t('alreadyHaveAccount') }} <a routerLink="/login">{{ t('login') }}</a></p>
        </div>
      </div>

      <!-- Background Decoration -->
      <div class="signup-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>
  `,
  styles: [`
    .signup-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .signup-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .circle {
      position: absolute;
      border-radius: 50%;
      opacity: 0.15;
      animation: float 20s ease-in-out infinite;
    }

    .circle-1 {
      width: 500px;
      height: 500px;
      background: #059669;
      top: -150px;
      right: -150px;
      animation-delay: 0s;
    }

    .circle-2 {
      width: 400px;
      height: 400px;
      background: #10b981;
      bottom: -100px;
      left: -100px;
      animation-delay: 5s;
    }

    .circle-3 {
      width: 300px;
      height: 300px;
      background: #34d399;
      top: 50%;
      left: 10%;
      animation-delay: 10s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(30px, -30px) scale(1.1); }
    }

    .signup-card {
      width: 100%;
      max-width: 520px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(5, 150, 105, 0.15);
      padding: 48px;
      position: relative;
      z-index: 1;
      border: 1px solid rgba(5, 150, 105, 0.1);
    }

    .signup-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .logo {
      width: 56px;
      height: 56px;
      margin: 0 auto;
    }

    .logo svg {
      width: 100%;
      height: 100%;
    }

    .language-switcher {
      position: relative;
    }

    .lang-icon-btn {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #6b7280;
    }

    .lang-icon-btn:hover {
      border-color: #059669;
      color: #059669;
      background: #f0fdf4;
    }

    .lang-icon-btn svg {
      width: 20px;
      height: 20px;
    }

    .language-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 160px;
      z-index: 1000;
      overflow: hidden;
    }

    .lang-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: white;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      color: #1f2937;
    }

    .lang-option:hover {
      background: #f9fafb;
    }

    .lang-option.active {
      background: #f0fdf4;
      color: #059669;
      font-weight: 500;
    }

    .lang-flag {
      font-size: 1.25rem;
      line-height: 1;
    }

    .lang-name {
      flex: 1;
    }

    .check-icon {
      width: 16px;
      height: 16px;
      color: #059669;
    }

    .signup-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #059669, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .signup-header p {
      color: #6b7280;
      font-size: 0.9375rem;
      line-height: 1.5;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
      font-size: 0.875rem;
    }

    .form-group input[type="text"] {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 0.9375rem;
      transition: all 0.2s ease;
      background: #fafafa;
      color: #1f2937;
    }

    .form-group input[type="text"]:focus {
      outline: none;
      border-color: #059669;
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1);
      background: white;
    }

    .form-group input[type="text"]:not(:placeholder-shown) {
      background: white;
    }

    .form-group input[type="text"]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
      color: #9ca3af;
      pointer-events: none;
    }

    .input-wrapper input {
      width: 100%;
      padding: 14px 14px 14px 46px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 0.9375rem;
      transition: all 0.2s ease;
      background: #fafafa;
      color: #1f2937;
    }

    .input-wrapper input:focus {
      outline: none;
      border-color: #059669;
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1);
      background: white;
    }

    .input-wrapper input:not(:placeholder-shown) {
      background: white;
    }

    .input-wrapper input::placeholder {
      color: #9ca3af;
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
      color: #9ca3af;
      transition: color 0.2s ease;
    }

    .toggle-password:hover {
      color: #1f2937;
    }

    .toggle-password svg {
      width: 20px;
      height: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      color: #4b5563;
    }

    .checkbox-label input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      transition: all 0.2s ease;
      position: relative;
      flex-shrink: 0;
      margin-top: 2px;
      background: white;
    }

    .checkbox-label:hover .checkbox-custom {
      border-color: #059669;
    }

    .checkbox-label input:checked + .checkbox-custom {
      background: #059669;
      border-color: #059669;
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

    .btn-signup {
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s ease;
      margin-top: 12px;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
    }

    .btn-signup:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.35);
      background: linear-gradient(135deg, #047857, #065f46);
    }

    .btn-signup:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-signup:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-signup svg {
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

    .signup-footer {
      margin-top: 24px;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .signup-footer a {
      color: #059669;
      text-decoration: none;
      font-weight: 500;
    }

    .signup-footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 640px) {
      .signup-card {
        padding: 32px 24px;
        border-radius: 16px;
      }

      .signup-header h1 {
        font-size: 1.75rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .header-top {
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .language-switcher {
        position: absolute;
        top: 24px;
        right: 24px;
      }
    }
  `]
})
export class SignupComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private translation = inject(TranslationService);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeToTerms = false;
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

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

  onSignup(): void {
    // Validation
    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set(this.t('validationError'));
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set(this.t('passwordMismatch'));
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set(this.t('passwordMinLength'));
      return;
    }

    if (!this.agreeToTerms) {
      this.errorMessage.set(this.t('agreeToTerms'));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register({
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response && response.success) {
          this.successMessage.set(this.t('signupSuccess'));
          // Auto-login after successful registration
          setTimeout(() => {
            this.authService.login({ email: this.email, password: this.password }).subscribe({
              next: (loginResponse) => {
                if (loginResponse && loginResponse.success && loginResponse.data) {
                  this.router.navigate(['/app/dashboard']);
                } else {
                  this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
                }
              },
              error: () => {
                this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
              }
            });
          }, 1500);
        } else {
          this.errorMessage.set(response?.message || this.t('signupError'));
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        let errorMsg = this.t('signupError');
        
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
        console.error('Registration error:', error);
      }
    });
  }
}
