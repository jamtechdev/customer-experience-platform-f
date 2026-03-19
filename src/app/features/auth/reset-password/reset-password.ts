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
      this.errorMessage.set(this.t('auth.validationError'));
      return;
    }

    if (this.otp.length !== 6 || !/^\d{6}$/.test(this.otp)) {
      this.errorMessage.set(this.t('auth.invalidOtp'));
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set(this.t('auth.passwordMinLength'));
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set(this.t('auth.passwordMismatch'));
      return;
    }

    this.errorMessage.set('');

    this.authService.resetPassword({
      email: this.email,
      otp: this.otp,
      newPassword: this.newPassword
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/login'], { replaceUrl: true });
        } else {
          this.errorMessage.set(response.message || this.t('auth.resetPasswordError'));
        }
      },
      error: (error) => {
        const message = error.error?.message || error.message || this.t('auth.resetPasswordError');
        this.errorMessage.set(message);
      }
    });
  }
}
