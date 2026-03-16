import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  protected loaderService = inject(LoaderService);

  email = '';
  password = '';
  rememberMe = false;
  
  showPassword = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set(this.t('validationError'));
      return;
    }

    this.errorMessage.set('');
    this.loaderService.show(this.t('loading'));

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.loaderService.hide();
        // #region agent log
        try {
          fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '2f0b58',
            },
            body: JSON.stringify({
              sessionId: '2f0b58',
              runId: 'pre-fix',
              hypothesisId: 'H4',
              location: 'login.ts:onLogin',
              message: 'Login next handler (debug session 2f0b58)',
              data: {
                success: response?.success ?? null,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {
          // ignore logging errors
        }
        // #endregion agent log
        // #region agent log
        try {
          fetch('http://127.0.0.1:7282/ingest/6408ea06-d2e1-4105-95ab-8cd74cbff087', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': 'a75a41',
            },
            body: JSON.stringify({
              sessionId: 'a75a41',
              runId: 'pre-fix',
              hypothesisId: 'H5',
              location: 'login.ts:onLogin',
              message: 'Login subscription next handler',
              data: {
                success: response?.success ?? null,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        } catch {
          // ignore logging errors
        }
        // #endregion agent log
        if (response.success) {
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          // Angular router navigation to app (routes will send to dashboard)
          this.router.navigate(['/app']);
        } else {
          this.errorMessage.set(this.t('loginError'));
        }
      },
      error: (error) => {
        this.loaderService.hide();
        const message = error.error?.message || error.message || this.t('loginError');
        this.errorMessage.set(message);
      }
    });
  }

  onSSOLogin(provider: string): void {
    // Redirect to SSO provider (URL from env when implemented)
    console.log('SSO Login:', provider);
    // In real implementation: window.location.href = `${environment.apiUrl}/auth/sso/${provider}`;
  }
}
