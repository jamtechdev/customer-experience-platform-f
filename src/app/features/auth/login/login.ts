import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
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
export class Login implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private snackBar = inject(MatSnackBar);
  protected loaderService = inject(LoaderService);

  email = '';
  password = '';
  rememberMe = false;

  showPassword = signal(false);
  errorMessage = signal('');

  currentYear = new Date().getFullYear();

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const emailQ = q.get('email');
    const hasSensitiveQuery = q.has('password') || emailQ;
    if (!hasSensitiveQuery) return;
    if (emailQ) this.email = emailQ;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set(this.t('auth.validationError'));
      return;
    }

    this.errorMessage.set('');

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const okMsg =
            (typeof response.message === 'string' && response.message) || 'Login successful';
          this.snackBar.open(okMsg, 'Close', { duration: 3000 });
          if (this.rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          this.router.navigate(['/app/dashboard'], { replaceUrl: true });
        } else {
          const msg =
            (typeof response.message === 'string' && response.message) || this.t('auth.loginError');
          this.errorMessage.set(msg);
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        const message = error.error?.message || error.message || this.t('auth.loginError');
        this.errorMessage.set(message);
        this.snackBar.open(message, 'Close', { duration: 6000 });
      }
    });
  }

}
