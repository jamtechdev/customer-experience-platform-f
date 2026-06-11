import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-onboarding',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './user-onboarding.html',
  styleUrl: './user-onboarding.css',
})
export class UserOnboarding {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  get firstName(): string {
    return this.authService.currentUser()?.firstName || 'there';
  }

  startUpload(): void {
    this.router.navigate(['/app/data-sources/csv-upload']);
  }
}
