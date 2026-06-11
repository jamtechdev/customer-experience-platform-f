import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
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
  private toastr = inject(ToastrService);
  protected loaderService = inject(LoaderService);

  firstName = '';
  lastName = '';
  companyName = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: 'user' = 'user';
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getters
  t = (key: string): string => this.translationService.translate(key);

  onSignup(): void {
    if (!this.firstName || !this.lastName || !this.companyName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set(this.t('auth.validationError'));
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set(this.t('auth.passwordMismatch'));
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set(this.t('auth.passwordMinLength'));
      return;
    }

    this.errorMessage.set('');

    this.authService.register({
      firstName: this.firstName,
      lastName: this.lastName,
      companyName: this.companyName,
      email: this.email,
      password: this.password,
      role: this.role
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastr.success('Your workspace is ready.', 'Account created');
          this.router.navigate(['/app/dashboard'], { replaceUrl: true });
        } else {
          const message = this.t('auth.signupError');
          this.errorMessage.set(message);
          this.toastr.error(message, 'Signup failed');
        }
      },
      error: (error) => {
        const message = error.error?.message || error.message || this.t('auth.signupError');
        this.errorMessage.set(message);
        this.toastr.error(message, 'Signup failed');
      }
    });
  }
}
