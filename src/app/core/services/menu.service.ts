import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { MenuItem, UserRole } from '../models';
import { AuthService } from './auth.service';
import { TranslationService } from './translation.service';
import { MenuStatsService } from './menu-stats.service';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private menuStatsService = inject(MenuStatsService);

  getMenuItems(): MenuItem[] {
    const user = this.authService.currentUser();
    const userRole = user?.role || UserRole.VIEWER;
    const currentLang = this.translationService.currentLang();
    const stats = this.menuStatsService.stats();
    const t = (key: string) => this.translationService.translate(key);
    
    // Force reactivity by accessing currentLang and stats
    void currentLang;
    void stats;

    // Single Dashboard menu for all users; route depends on role (Executive → executive-dashboard, others → main dashboard)
    const dashboardRoute = userRole === UserRole.VIEWER ? '/app/executive-dashboard' : '/app/dashboard';

    const menuItems: MenuItem[] = [
      {
        id: 'dashboard',
        label: t('nav.dashboard'),
        icon: 'layout-dashboard',
        route: dashboardRoute
      },
      {
        id: 'data-sources',
        label: t('nav.dataSources'),
        icon: 'database',
        route: '/app/data-sources'
      },
      {
        id: 'cx',
        label: t('nav.cxJourney'),
        icon: 'map',
        children: [
          {
            id: 'cx-journeys',
            label: t('nav.journeyList'),
            icon: 'route',
            route: '/app/cx/journeys'
          },
          {
            id: 'cx-touchpoints',
            label: t('nav.touchpoints'),
            icon: 'mouse-pointer',
            route: '/app/cx/touchpoints'
          },
          {
            id: 'cx-action-plans',
            label: t('nav.actionPlans'),
            icon: 'clipboard-list',
            route: '/app/cx/action-plans'
          }
        ]
      },
      {
        id: 'analysis',
        label: t('nav.analysis'),
        icon: 'bar-chart',
        children: [
          {
            id: 'analysis-sentiment',
            label: t('nav.sentimentAnalysis'),
            icon: 'heart',
            route: '/app/analysis/sentiment'
          },
          {
            id: 'analysis-root-cause',
            label: t('nav.rootCause'),
            icon: 'search',
            route: '/app/analysis/root-cause'
          },
          {
            id: 'analysis-competitor',
            label: t('nav.competitorAnalysis'),
            icon: 'trending-up',
            route: '/app/analysis/competitor'
          },
          {
            id: 'analysis-nps',
            label: t('nav.surveys'),
            icon: 'trending-up',
            route: '/app/analytics/nps-analysis'
          }
        ]
      },
      {
        id: 'reports',
        label: t('nav.reports'),
        icon: 'file-text',
        children: [
          {
            id: 'reports-list',
            label: t('nav.reports'),
            icon: 'file-text',
            route: '/app/reports'
          },
          {
            id: 'reports-builder',
            label: t('nav.reportBuilder'),
            icon: 'edit',
            route: '/app/reports/builder'
          },
          {
            id: 'reports-executive-summary',
            label: t('nav.executiveSummary') || 'Executive Summary',
            icon: 'summarize',
            route: '/app/reports/executive-summary'
          },
          {
            id: 'reports-dashboard',
            label: t('nav.dashboardReports') || 'Dashboard Reports',
            icon: 'bar-chart',
            route: '/app/reports/dashboard-reports'
          }
        ]
      },
      {
        id: 'social-media',
        label: t('nav.feedback'),
        icon: 'share-2',
        children: [
          {
            id: 'social-analysis',
            label: t('nav.socialAnalysis') || 'Social Analysis',
            icon: 'bar-chart',
            route: '/app/social-media/social-analysis'
          },
          {
            id: 'social-methodology',
            label: t('nav.methodology') || 'Methodology',
            icon: 'description',
            route: '/app/social-media/methodology'
          }
        ]
      },
      {
        id: 'alerts',
        label: t('nav.tasks'),
        icon: 'bell',
        route: '/app/alerts'
      }
    ];

    // Add admin menu only for admin users (admin routes are under /admin, not /app)
    if (userRole === UserRole.ADMIN) {
      menuItems.push({
        id: 'admin',
        label: t('nav.admin'),
        icon: 'settings',
        permissions: ['admin'],
        children: [
          {
            id: 'admin-users',
            label: t('nav.userManagement'),
            icon: 'users',
            route: '/admin/users',
            permissions: ['admin']
          },
          {
            id: 'admin-roles',
            label: t('nav.roleManagement'),
            icon: 'user-check',
            route: '/admin/roles',
            permissions: ['admin']
          },
          {
            id: 'admin-settings',
            label: t('nav.systemSettings'),
            icon: 'settings',
            route: '/admin/settings',
            permissions: ['admin']
          },
          {
            id: 'admin-journey-stages',
            label: t('nav.journeyStages') || 'Journey Stages',
            icon: 'route',
            route: '/admin/journey-stages',
            permissions: ['admin']
          }
        ]
      });
    }


    // Filter menu items based on permissions
    return this.filterMenuItemsByPermissions(menuItems, userRole);
  }

  private filterMenuItemsByPermissions(items: MenuItem[], userRole: UserRole | string): MenuItem[] {
    return items
      .filter(item => {
        if (item.permissions && item.permissions.length > 0) {
          return item.permissions.includes(userRole);
        }
        return true;
      })
      .map(item => {
        if (item.children) {
          return {
            ...item,
            children: this.filterMenuItemsByPermissions(item.children, userRole)
          };
        }
        return item;
      });
  }
}
