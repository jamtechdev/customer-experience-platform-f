import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcher } from '../../core/components/language-switcher/language-switcher';
import { getRoleLabel } from '../../core/models/user.model';

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
export class Header {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  toggleSidenav = output<void>();

  get currentUser() {
    return this.authService.currentUser();
  }

  get userName(): string {
    const user = this.currentUser;
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'User';
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
    return user ? getRoleLabel(user.role) : '';
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
