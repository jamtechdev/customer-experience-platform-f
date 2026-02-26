import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  private router = inject(Router);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  protected loaderService = inject(LoaderService);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getters
  t = (key: string): string => this.translationService.translate(key);

  onSignup(): void {
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

    this.errorMessage.set('');
    this.loaderService.show(this.t('loading'));

    this.authService.register({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.loaderService.hide();
        if (response.success) {
          this.router.navigate(['/app/dashboard'], { replaceUrl: true });
        } else {
          this.errorMessage.set(this.t('signupError'));
        }
      },
      error: (error) => {
        this.loaderService.hide();
        const message = error.error?.message || error.message || this.t('signupError');
        this.errorMessage.set(message);
      }
    });
  }
}
