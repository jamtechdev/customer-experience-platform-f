import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private translationService = inject(TranslationService);
  protected authService = inject(AuthService);

  // Translation getter
  t = (key: string): string => this.translationService.translate(key);

  // Get currentUser signal from authService
  currentUser = this.authService.currentUser;

  stats = [
    { label: 'Total Users', value: 0, icon: 'users' },
    { label: 'Active Sessions', value: 0, icon: 'activity' },
    { label: 'System Health', value: '100%', icon: 'heart' },
    { label: 'Pending Tasks', value: 0, icon: 'clock' }
  ];

  ngOnInit(): void {
    // Load admin dashboard data
  }
}
