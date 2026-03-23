import { Component, inject, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { LanguageSwitcher } from '../../core/components/language-switcher/language-switcher';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    LanguageSwitcher
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private translationService = inject(TranslationService);
  private alertService = inject(AlertService);
  
  toggleSidenav = output<void>();

  // Controls the small green/red dot near the notifications bell.
  alertIndicator = signal<'green' | 'red'>('green');
  alertCount = signal<number>(0);

  readonly t = (key: string): string => this.translationService.translate(key);

  get currentUser() {
    return this.authService.currentUser();
  }

  get userName(): string {
    const user = this.currentUser;
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return this.t('header.userFallbackName');
  }

  get userInitials(): string {
    const user = this.currentUser;
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  get roleLabel(): string {
    const user = this.currentUser;
    if (!user?.role) return '';
    const key = `roles.${user.role}`;
    const translated = this.t(key);
    return translated === key ? String(user.role) : translated;
  }

  ngOnInit(): void {
    this.alertService.getAlerts(false).subscribe({
      next: (res) => {
        const alerts = res?.data ?? [];
        const hasAlerts = alerts.length > 0;
        const hasCritical = alerts.some((a) => a.priority === 'critical' || a.priority === 'high');
        this.alertCount.set(alerts.length);
        this.alertIndicator.set(hasCritical || hasAlerts ? 'red' : 'green');
      },
      error: () => {
        // If alerts endpoint fails, keep indicator green.
        this.alertIndicator.set('green');
        this.alertCount.set(0);
      },
    });
  }

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  onLogout(): void {
    this.authService.logout();
  }

  onProfile(): void {
    this.router.navigate(['/app/profile']);
  }
}
