import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private router = inject(Router);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  protected loaderService = inject(LoaderService);

  email = '';
  submitted = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage.set(this.t('validationError') || 'Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage.set(this.t('invalidEmail') || 'Please enter a valid email address');
      return;
    }

    this.errorMessage.set('');
    this.loaderService.show(this.t('loading') || 'Loading...');

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.loaderService.hide();
        if (response.success) {
          this.submitted.set(true);
        } else {
          this.errorMessage.set(response.message || this.t('forgotPasswordError') || 'Failed to send reset code');
        }
      },
      error: (error) => {
        this.loaderService.hide();
        const message = error.error?.message || error.message || this.t('forgotPasswordError') || 'Failed to send reset code. Please try again.';
        this.errorMessage.set(message);
      }
    });
  }
}
