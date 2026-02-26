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
        if (response.success) {
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          // Always redirect to dashboard after login
          this.router.navigate(['/app/dashboard'], { replaceUrl: true });
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
    // Redirect to SSO provider
    console.log('SSO Login:', provider);
    // In real implementation: window.location.href = `/api/auth/sso/${provider}`;
  }
}
