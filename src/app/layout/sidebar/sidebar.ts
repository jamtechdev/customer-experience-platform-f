import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private router = inject(Router);
  private authService = inject(AuthService);
  
  navigate = output<void>();

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/app/dashboard' },
    { label: 'CSV Upload', icon: 'upload', route: '/app/data-sources/csv-upload' },
    { label: 'Sentiment Analysis', icon: 'sentiment_satisfied', route: '/app/analysis/sentiment' },
    { label: 'NPS Analysis', icon: 'trending_up', route: '/app/analytics/nps-analysis' },
    { label: 'Root Cause', icon: 'search', route: '/app/analysis/root-cause' },
    { label: 'Competitor Analysis', icon: 'compare', route: '/app/analysis/competitor' },
    { label: 'Journey Mapping', icon: 'map', route: '/app/cx/journeys' },
    { label: 'Social Media', icon: 'share', route: '/app/social-media/social-analysis' },
    { label: 'Alerts', icon: 'notifications', route: '/app/alerts/alert-dashboard' },
    { label: 'Reports', icon: 'description', route: '/app/reports' },
    { label: 'Admin', icon: 'admin_panel_settings', route: '/app/admin/users', roles: ['ADMIN'] }
  ];

  get filteredMenuItems(): MenuItem[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    
    return this.menuItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(user.role);
    });
  }

  onNavigate(): void {
    this.navigate.emit();
  }
}
