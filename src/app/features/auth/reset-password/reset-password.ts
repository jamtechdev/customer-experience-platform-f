import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  protected loaderService = inject(LoaderService);

  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  constructor() {
    // Get email from query params
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
  }

  onSubmit(): void {
    if (!this.email || !this.otp || !this.newPassword || !this.confirmPassword) {
      this.errorMessage.set(this.t('validationError') || 'All fields are required');
      return;
    }

    if (this.otp.length !== 6 || !/^\d{6}$/.test(this.otp)) {
      this.errorMessage.set(this.t('invalidOtp') || 'OTP must be 6 digits');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set(this.t('passwordMinLength') || 'Password must be at least 6 characters');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set(this.t('passwordMismatch') || 'Passwords do not match');
      return;
    }

    this.errorMessage.set('');
    this.loaderService.show(this.t('loading') || 'Loading...');

    this.authService.resetPassword({
      email: this.email,
      otp: this.otp,
      newPassword: this.newPassword
    }).subscribe({
      next: (response) => {
        this.loaderService.hide();
        if (response.success) {
          this.router.navigate(['/login'], { replaceUrl: true });
        } else {
          this.errorMessage.set(response.message || this.t('resetPasswordError') || 'Password reset failed');
        }
      },
      error: (error) => {
        this.loaderService.hide();
        const message = error.error?.message || error.message || this.t('resetPasswordError') || 'Password reset failed. Please try again.';
        this.errorMessage.set(message);
      }
    });
  }
}
