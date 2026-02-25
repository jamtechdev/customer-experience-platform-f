import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="forgot-container">
      <div class="forgot-card">
        <!-- Logo & Header -->
        <div class="forgot-header">
          <div class="logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="var(--primary-color)"/>
              <path d="M16 32V20L24 14L32 20V32H26V26H22V32H16Z" fill="white"/>
              <circle cx="24" cy="22" r="3" fill="white"/>
            </svg>
          </div>
          <h1>Şifre Sıfırlama</h1>
          <p>E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz</p>
        </div>

        @if (step() === 'request') {
          <!-- Request Form -->
          <form (ngSubmit)="onSubmit()" class="forgot-form">
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
              <label for="email">E-posta Adresi</label>
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

            <button type="submit" class="btn-submit" [disabled]="isLoading()">
              @if (isLoading()) {
                <span class="spinner"></span>
                <span>Gönderiliyor...</span>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                </svg>
                <span>Sıfırlama Bağlantısı Gönder</span>
              }
            </button>
          </form>
        } @else {
          <!-- Success Message -->
          <div class="success-message">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2>E-posta Gönderildi</h2>
            <p>
              <strong>{{ email }}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
              Lütfen e-postanızı kontrol edin.
            </p>
            <div class="success-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>E-posta birkaç dakika içinde gelmezse spam klasörünüzü kontrol edin.</span>
            </div>
            <button class="btn-resend" (click)="onResend()" [disabled]="resendCooldown() > 0">
              @if (resendCooldown() > 0) {
                <span>Tekrar gönder ({{ resendCooldown() }}s)</span>
              } @else {
                <span>Tekrar Gönder</span>
              }
            </button>
          </div>
        }

        <!-- Back to Login -->
        <div class="back-to-login">
          <a routerLink="/login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Giriş sayfasına dön</span>
          </a>
        </div>

        <!-- Footer -->
        <div class="forgot-footer">
          <p>&copy; {{ currentYear }} Albaraka Türk Katılım Bankası</p>
        </div>
      </div>

      <!-- Background Decoration -->
      <div class="forgot-bg">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>
  `,
  styles: [`
    .forgot-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    .forgot-bg {
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

    .forgot-card {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 40px;
      position: relative;
      z-index: 1;
    }

    .forgot-header {
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

    .forgot-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .forgot-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
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
      color: var(--error-color);
      border: 1px solid #fecaca;
    }

    .form-group {
      margin-bottom: 24px;
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

    .btn-submit {
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

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
    }

    .btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-submit svg {
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

    .success-message {
      text-align: center;
    }

    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #d4edda, #c3e6cb);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .success-icon svg {
      width: 40px;
      height: 40px;
      color: var(--success-color);
    }

    .success-message h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
    }

    .success-message p {
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .success-message strong {
      color: var(--text-primary);
    }

    .success-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: #fff3cd;
      border-radius: 8px;
      font-size: 0.75rem;
      color: #856404;
      text-align: left;
      margin-bottom: 20px;
    }

    .success-note svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .btn-resend {
      padding: 10px 20px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-resend:hover:not(:disabled) {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .btn-resend:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .back-to-login {
      margin-top: 24px;
      text-align: center;
    }

    .back-to-login a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: color 0.2s ease;
    }

    .back-to-login a:hover {
      color: var(--primary-dark);
    }

    .back-to-login svg {
      width: 18px;
      height: 18px;
    }

    .forgot-footer {
      margin-top: 32px;
      text-align: center;
      color: var(--text-tertiary);
      font-size: 0.75rem;
    }

    @media (max-width: 480px) {
      .forgot-card {
        padding: 24px;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private router = inject(Router);

  email = '';
  step = signal<'request' | 'success'>('request');
  isLoading = signal(false);
  errorMessage = signal('');
  resendCooldown = signal(0);

  currentYear = new Date().getFullYear();

  private cooldownInterval: any;

  async onSubmit(): Promise<void> {
    if (!this.email) {
      this.errorMessage.set('Lütfen e-posta adresinizi girin.');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage.set('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.step.set('success');
      this.startCooldown();
    } catch (error) {
      this.errorMessage.set('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResend(): Promise<void> {
    if (this.resendCooldown() > 0) return;

    this.isLoading.set(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.startCooldown();
    } catch (error) {
      // Handle error
    } finally {
      this.isLoading.set(false);
    }
  }

  private startCooldown(): void {
    this.resendCooldown.set(60);
    
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    this.cooldownInterval = setInterval(() => {
      if (this.resendCooldown() > 0) {
        this.resendCooldown.update(v => v - 1);
      } else {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
