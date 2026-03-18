import { Component, inject, output, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { TranslationService } from '../../core/services/translation.service';

export interface SidebarMenuItem {
  labelKey: string;
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
  private translationService = inject(TranslationService);
  navigate = output<void>();
  readonly t = (key: string): string => this.translationService.translate(key);

  /** Cached menu – only recomputed on route change to avoid OOM from getter on every CD. */
  readonly flatMenuItems = signal<SidebarFlatItem[]>([]);
  private routerSub?: Subscription;

  /** App menu (CX) – shown only when URL is under /app */
  private appMenuItems: SidebarMenuItem[] = [
    { labelKey: 'nav.dashboard', icon: 'dashboard', route: '/app/dashboard' },
    {
      labelKey: 'nav.reports',
      icon: 'description',
      route: '/app/reports',
      children: [
        { labelKey: 'nav.reportList', icon: 'list', route: '/app/reports' },
        { labelKey: 'nav.executiveSummary', icon: 'summarize', route: '/app/reports/executive-summary' },
        { labelKey: 'nav.reportBuilder', icon: 'edit', route: '/app/reports/builder' }
      ]
    },
    {
      labelKey: 'nav.dataSources',
      icon: 'database',
      children: [
        { labelKey: 'nav.csvUpload', icon: 'upload', route: '/app/data-sources/csv-upload' },
        { labelKey: 'nav.importHistory', icon: 'history', route: '/app/data-sources/import-history' }
      ]
    },
    {
      labelKey: 'nav.analysis',
      icon: 'bar_chart',
      children: [
        { labelKey: 'nav.sentimentAnalysis', icon: 'sentiment_satisfied', route: '/app/analysis/sentiment' },
        { labelKey: 'nav.npsAnalysis', icon: 'trending_up', route: '/app/analytics/nps-analysis' },
        { labelKey: 'nav.rootCause', icon: 'search', route: '/app/analysis/root-cause' },
        { labelKey: 'nav.competitorAnalysis', icon: 'compare', route: '/app/analysis/competitor' }
      ]
    },
    {
      labelKey: 'nav.cxJourney',
      icon: 'map',
      children: [
        { labelKey: 'nav.journeyMap', icon: 'route', route: '/app/cx/journeys' },
        { labelKey: 'nav.journeyHeatmap', icon: 'grid_on', route: '/app/cx/journey-heatmap' },
        { labelKey: 'nav.touchpoints', icon: 'place', route: '/app/cx/touchpoints' },
        { labelKey: 'nav.actionPlans', icon: 'assignment', route: '/app/cx/action-plans' },
        { labelKey: 'nav.processEnhancement', icon: 'trending_up', route: '/app/cx/process-enhancement' }
      ]
    },
    {
      labelKey: 'nav.socialMedia',
      icon: 'share',
      children: [
        { labelKey: 'nav.socialAnalysis', icon: 'analytics', route: '/app/social-media/social-analysis' },
        { labelKey: 'nav.methodology', icon: 'menu_book', route: '/app/social-media/methodology' }
      ]
    },
    {
      labelKey: 'nav.alerts',
      icon: 'notifications',
      children: [
        { labelKey: 'nav.alertDashboard', icon: 'dashboard', route: '/app/alerts/alert-dashboard' },
        { labelKey: 'nav.alertConfiguration', icon: 'tune', route: '/app/alerts/alert-configuration' }
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
          if (child.route) out.push({ label: this.t(child.labelKey), icon: child.icon, route: child.route });
        }
      } else if (item.route) {
        out.push({ label: this.t(item.labelKey), icon: item.icon, route: item.route });
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
    effect(() => {
      // Recompute labels when language changes.
      this.translationService.currentLang();
      this.updateMenu();
    });
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
