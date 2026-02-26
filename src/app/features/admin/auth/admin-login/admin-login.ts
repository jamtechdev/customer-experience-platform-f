import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { UserRole } from '../../../../core/models';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
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
          const user = this.authService.currentUser();
          // Check if user is admin
          if (user && user.role === UserRole.ADMIN) {
            if (this.rememberMe) {
              localStorage.setItem('rememberMe', 'true');
            }
            this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
          } else {
            this.errorMessage.set('Access denied. Admin privileges required.');
            this.authService.logout();
          }
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
}
