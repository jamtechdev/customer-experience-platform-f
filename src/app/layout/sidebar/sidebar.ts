import { Component, inject, output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
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
export class Sidebar implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  navigate = output<void>();

  /** Cached menu – only recomputed on route change to avoid OOM from getter on every CD. */
  readonly flatMenuItems = signal<SidebarFlatItem[]>([]);
  private routerSub?: Subscription;

  /** App menu (CX) – shown only when URL is under /app */
  private appMenuItems: SidebarMenuItem[] = [
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
    }
  ];

  private readonly exactTrueOptions = { exact: true };
  private readonly exactFalseOptions = { exact: false };

  getLinkActiveOptions(route: string): { exact: boolean } {
    return route === '/app/reports' ? this.exactTrueOptions : this.exactFalseOptions;
  }

  private flatten(items: SidebarMenuItem[]): SidebarFlatItem[] {
    const out: SidebarFlatItem[] = [];
    for (const item of items) {
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

  private updateMenu(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.flatMenuItems.set([]);
      return;
    }
    this.flatMenuItems.set(this.flatten(this.appMenuItems));
  }

  ngOnInit(): void {
    this.updateMenu();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateMenu());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  onNavigate(): void {
    this.navigate.emit();
  }
}
