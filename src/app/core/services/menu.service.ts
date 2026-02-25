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

    const menuItems: MenuItem[] = [
      {
        id: 'dashboard',
        label: t('dashboard'),
        icon: 'layout-dashboard',
        route: '/app/dashboard'
      },
      {
        id: 'feedback',
        label: t('feedback'),
        icon: 'message-square',
        route: '/app/feedback'
      },
      {
        id: 'cx',
        label: t('customerJourney'),
        icon: 'map',
        children: [
          {
            id: 'cx-journeys',
            label: t('customerJourneys'),
            icon: 'route',
            route: '/app/cx/journeys'
          },
          {
            id: 'cx-touchpoints',
            label: t('touchpoints'),
            icon: 'mouse-pointer',
            route: '/app/cx/touchpoints'
          },
          {
            id: 'cx-action-plans',
            label: t('actionPlans'),
            icon: 'clipboard-list',
            route: '/app/cx/action-plans'
          }
        ]
      },
      {
        id: 'analysis',
        label: t('analysis'),
        icon: 'bar-chart',
        children: [
          {
            id: 'analysis-sentiment',
            label: t('sentimentAnalysis'),
            icon: 'heart',
            route: '/app/analysis/sentiment'
          },
          {
            id: 'analysis-root-cause',
            label: t('rootCauseAnalysis'),
            icon: 'search',
            route: '/app/analysis/root-cause'
          },
          {
            id: 'analysis-recommendations',
            label: t('aiRecommendations'),
            icon: 'lightbulb',
            route: '/app/analysis/recommendations'
          },
          {
            id: 'analysis-competitor',
            label: t('competitorAnalysis'),
            icon: 'trending-up',
            route: '/app/analysis/competitor'
          },
          {
            id: 'analysis-trends',
            label: t('trendAnalysis'),
            icon: 'activity',
            route: '/app/analysis/trends'
          }
        ]
      },
      {
        id: 'tasks',
        label: t('tasks'),
        icon: 'check-square',
        route: '/app/tasks',
        badge: stats.tasks ? (stats.tasks.pending || 0) + (stats.tasks.pendingApproval || 0) : undefined
      },
      {
        id: 'data-sources',
        label: t('dataSources'),
        icon: 'database',
        route: '/app/data-sources'
      },
      {
        id: 'reports',
        label: t('reports'),
        icon: 'file-text',
        children: [
          {
            id: 'reports-list',
            label: t('reports'),
            icon: 'file-text',
            route: '/app/reports'
          },
          {
            id: 'reports-kpis',
            label: t('kpiDashboard'),
            icon: 'bar-chart-2',
            route: '/app/reports/kpis'
          },
          {
            id: 'reports-builder',
            label: t('reportBuilder'),
            icon: 'edit',
            route: '/app/reports/builder'
          },
          {
            id: 'reports-scheduled',
            label: t('scheduledReports'),
            icon: 'clock',
            route: '/app/reports/scheduled'
          }
        ]
      },
      {
        id: 'surveys',
        label: t('surveys'),
        icon: 'clipboard',
        children: [
          {
            id: 'surveys-list',
            label: t('surveys'),
            icon: 'clipboard',
            route: '/app/surveys'
          },
          {
            id: 'surveys-builder',
            label: t('surveyBuilder'),
            icon: 'plus-circle',
            route: '/app/surveys/builder'
          }
        ]
      }
    ];

    // Add admin menu only for admin users
    if (userRole === UserRole.ADMIN) {
      menuItems.push({
        id: 'admin',
        label: t('admin'),
        icon: 'settings',
        permissions: ['admin'],
        children: [
          {
            id: 'admin-users',
            label: t('userManagement'),
            icon: 'users',
            route: '/app/admin/users',
            permissions: ['admin']
          },
          {
            id: 'admin-roles',
            label: t('roleManagement'),
            icon: 'user-check',
            route: '/app/admin/roles',
            permissions: ['admin']
          },
          {
            id: 'admin-data-dictionary',
            label: t('dataDictionary'),
            icon: 'book',
            route: '/app/admin/data-dictionary',
            permissions: ['admin']
          },
          {
            id: 'admin-audit-logs',
            label: t('auditLogs'),
            icon: 'file-text',
            route: '/app/admin/audit-logs',
            permissions: ['admin']
          },
          {
            id: 'admin-settings',
            label: t('systemSettings'),
            icon: 'settings',
            route: '/app/admin/settings',
            permissions: ['admin']
          }
        ]
      });
    }

    // Add Maker-Checker menu for checker role
    if (userRole === UserRole.CHECKER) {
      menuItems.push({
        id: 'maker-checker',
        label: t('makerChecker'),
        icon: 'user-check',
        route: '/app/tasks/maker-checker',
        permissions: ['checker']
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
