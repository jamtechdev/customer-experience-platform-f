import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  route?: string;
  roles?: string[];
  children?: SidebarMenuItem[];
}

/** Flat item for sidebar - sab parent level. */
export interface SidebarFlatItem {
  label: string;
  icon: string;
  route: string;
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
  private authService = inject(AuthService);
  navigate = output<void>();

  menuItems: SidebarMenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/app/dashboard' },
    {
      label: 'Reports',
      icon: 'description',
      route: '/app/reports',
      children: [
        { label: 'Report List', icon: 'list', route: '/app/reports' },
        { label: 'Executive Summary', icon: 'summarize', route: '/app/reports/executive-summary' },
        { label: 'Report Builder', icon: 'edit', route: '/app/reports/builder' }
      ]
    },
    {
      label: 'Data',
      icon: 'database',
      children: [
        { label: 'CSV Upload', icon: 'upload', route: '/app/data-sources/csv-upload' },
        { label: 'Import History', icon: 'history', route: '/app/data-sources/import-history' }
      ]
    },
    {
      label: 'Analysis',
      icon: 'bar_chart',
      children: [
        { label: 'Sentiment', icon: 'sentiment_satisfied', route: '/app/analysis/sentiment' },
        { label: 'NPS Analysis', icon: 'trending_up', route: '/app/analytics/nps-analysis' },
        { label: 'Root Cause', icon: 'search', route: '/app/analysis/root-cause' },
        { label: 'Competitor', icon: 'compare', route: '/app/analysis/competitor' }
      ]
    },
    {
      label: 'CX Journey',
      icon: 'map',
      children: [
        { label: 'Journey Map', icon: 'route', route: '/app/cx/journeys' },
        { label: 'Journey Heatmap', icon: 'grid_on', route: '/app/cx/journey-heatmap' },
        { label: 'Touchpoints', icon: 'place', route: '/app/cx/touchpoints' },
        { label: 'Action Plans', icon: 'assignment', route: '/app/cx/action-plans' },
        { label: 'Process Enhancement', icon: 'trending_up', route: '/app/cx/process-enhancement' }
      ]
    },
    {
      label: 'Social Media',
      icon: 'share',
      children: [
        { label: 'Social Analysis', icon: 'analytics', route: '/app/social-media/social-analysis' },
        { label: 'Methodology', icon: 'menu_book', route: '/app/social-media/methodology' }
      ]
    },
    {
      label: 'Alerts',
      icon: 'notifications',
      children: [
        { label: 'Alert Dashboard', icon: 'dashboard', route: '/app/alerts/alert-dashboard' },
        { label: 'Alert Configuration', icon: 'tune', route: '/app/alerts/alert-configuration' }
      ]
    },
    {
      label: 'Administration',
      icon: 'admin_panel_settings',
      children: [
        { label: 'Users', icon: 'people', route: '/manage/users' },
        { label: 'Roles', icon: 'security', route: '/manage/roles' },
        { label: 'Settings', icon: 'settings', route: '/manage/settings' },
        { label: 'Journey Stages', icon: 'account_tree', route: '/manage/journey-stages' },
        { label: 'Datasets', icon: 'folder', route: '/manage/datasets' }
      ]
    }
  ];

  /** Stable options for RouterLinkActive to avoid NG0103 (endless change notifications). */
  private readonly exactTrueOptions = { exact: true };
  private readonly exactFalseOptions = { exact: false };

  getLinkActiveOptions(route: string): { exact: boolean } {
    return (route === '/app/reports' || route === '/manage/dashboard') ? this.exactTrueOptions : this.exactFalseOptions;
  }

  /** Flat menu items - all under /app and /manage. No role-based filtering for now. */
  get flatMenuItems(): SidebarFlatItem[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    const out: SidebarFlatItem[] = [];
    for (const item of this.menuItems) {
      if (item.children?.length) {
        for (const child of item.children) {
          if (child.route) out.push({ label: child.label, icon: child.icon, route: child.route });
        }
      } else if (item.route) {
        out.push({ label: item.label, icon: item.icon, route: item.route });
      }
    }
    return out;
  }

  onNavigate(): void {
    this.navigate.emit();
  }
}
