import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService, AdminDashboardStats } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private translationService = inject(TranslationService);
  private dashboardService = inject(DashboardService);
  protected authService = inject(AuthService);

  t = (key: string): string => this.translationService.translate(key);
  currentUser = this.authService.currentUser;

  loading = signal(true);
  stats = signal<AdminDashboardStats | null>(null);
  error = signal(false);

  ngOnInit(): void {
    this.loadAdminStats();
  }

  loadAdminStats(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardService.getAdminStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stats.set(res.data);
        } else {
          this.stats.set(null);
          this.error.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.stats.set(null);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
