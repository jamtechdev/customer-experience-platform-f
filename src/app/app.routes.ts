import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page (public)
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./landing/landing').then(m => m.Landing)
  },
  // Admin-only platform; legacy public/user URLs go to admin login/dashboard.
  { path: 'admin', redirectTo: 'app/dashboard', pathMatch: 'prefix' },
  { path: 'manage/login', redirectTo: 'login', pathMatch: 'full' },
  { path: 'manage', redirectTo: 'app/dashboard', pathMatch: 'prefix' },
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
    canActivate: [guestGuard]
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword),
    canActivate: [guestGuard]
  },

  // Protected routes
  {
    path: 'app',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    canActivate: [adminGuard],
    children: [
      // Dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        redirectTo: 'reports/dashboard-reports',
        pathMatch: 'full'
      },
      {
        path: 'onboarding',
        redirectTo: 'reports/dashboard-reports',
        pathMatch: 'full'
      },
      {
        path: 'admin-dashboard',
        redirectTo: 'admin/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'admin',
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full'
          },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/admin/dashboard/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
            data: { title: 'Admin Dashboard', breadcrumb: 'Admin Dashboard' }
          },
          {
            path: 'datasets',
            loadComponent: () =>
              import('./features/admin/datasets/admin-datasets').then((m) => m.AdminDatasets),
            data: { title: 'Datasets', breadcrumb: 'Datasets' }
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/admin/role-management/role-management').then((m) => m.RoleManagement),
            data: { title: 'Role Management', breadcrumb: 'Role Management' }
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/admin/system-settings/system-settings').then((m) => m.SystemSettings),
            data: { title: 'System Settings', breadcrumb: 'System Settings' }
          },
          {
            path: 'journey-stages',
            loadComponent: () =>
              import('./features/admin/journey-stage-config/journey-stage-config').then((m) => m.JourneyStageConfig),
            data: { title: 'Journey Stages', breadcrumb: 'Journey Stages' }
          }
        ]
      },
      {
        path: 'executive-dashboard',
        redirectTo: 'reports/dashboard-reports',
        pathMatch: 'full'
      },

      // CX Journey
      {
        path: 'cx',
        children: [
          {
            path: 'journeys',
            loadComponent: () => import('./features/journey/journey-map/journey-map').then(m => m.JourneyMap),
            data: { title: 'Journey Mapping', breadcrumb: 'Journey Mapping' }
          },
          {
            path: 'touchpoints',
            loadComponent: () => import('./features/journey/touchpoint-manager/touchpoint-manager').then(m => m.TouchpointManager),
            data: { title: 'Touchpoints', breadcrumb: 'Touchpoints' }
          },
          {
            path: 'action-plans',
            loadComponent: () => import('./features/journey/action-plans/action-plans').then(m => m.ActionPlans),
            data: { title: 'Action Plans', breadcrumb: 'Action Plans' }
          },
          {
            path: 'process-enhancement',
            loadComponent: () => import('./features/journey/process-enhancement/process-enhancement').then(m => m.ProcessEnhancement),
            data: { title: 'Process Enhancement', breadcrumb: 'Process Enhancement' }
          },
          {
            path: 'journey-heatmap',
            loadComponent: () => import('./features/journey/journey-heatmap/journey-heatmap').then(m => m.JourneyHeatmap),
            data: { title: 'Journey Heatmap', breadcrumb: 'Journey Heatmap' }
          }
        ]
      },

      // Analysis
      {
        path: 'analysis',
        children: [
          {
            path: 'sentiment',
            loadComponent: () => import('./features/analytics/sentiment-analysis/sentiment-analysis').then(m => m.SentimentAnalysis),
            data: { title: 'Sentiment Analysis', breadcrumb: 'Sentiment Analysis' }
          },
          {
            path: 'root-cause',
            loadComponent: () => import('./features/analytics/root-cause-analysis/root-cause-analysis').then(m => m.RootCauseAnalysis),
            data: { title: 'Root Cause Analysis', breadcrumb: 'Root Cause' }
          },
          {
            path: 'competitor',
            loadComponent: () => import('./features/analytics/competitor-comparison/competitor-comparison').then(m => m.CompetitorComparison),
            data: { title: 'Competitor Analysis', breadcrumb: 'Competitor Analysis' }
          },
        ]
      },


      // Data Sources (Admin + CX Manager only)
      {
        path: 'data-sources',
        redirectTo: 'data-sources/csv-upload',
        pathMatch: 'full'
      },
      {
        path: 'data-sources/csv-upload',
        loadComponent: () => import('./features/data-ingestion/csv-upload/csv-upload').then(m => m.CsvUpload),
        data: { title: 'CSV Imports', breadcrumb: 'CSV Imports' }
      },
      {
        path: 'data-sources/csv-mapping/:importId',
        loadComponent: () => import('./features/data-ingestion/csv-mapping/csv-mapping').then(m => m.CsvMapping),
        data: { title: 'CSV Column Mapping', breadcrumb: 'CSV Mapping' }
      },
      {
        path: 'data-sources/import-history',
        redirectTo: 'data-sources/csv-upload',
        pathMatch: 'full'
      },

      // Reports (list + executive-summary for all; builder for Admin + CX Manager only)
      {
        path: 'reports',
        children: [
          {
            path: '',
            redirectTo: 'dashboard-reports',
            pathMatch: 'full'
          },
          {
            path: 'dashboard-reports',
            loadComponent: () => import('./features/reports/dashboard-reports/dashboard-reports').then(m => m.DashboardReports),
            data: { title: 'Dashboard Reports', breadcrumb: 'Dashboard Reports' }
          },
          {
            path: 'builder',
            loadComponent: () => import('./features/reports/report-builder/report-builder').then(m => m.ReportBuilder),
            data: { title: 'Report Builder', breadcrumb: 'Report Builder' }
          },
          {
            path: 'executive-summary',
            loadComponent: () => import('./features/reports/executive-summary/executive-summary').then(m => m.ExecutiveSummary),
            data: { title: 'Executive Summary', breadcrumb: 'Executive Summary' }
          }
        ]
      },



      // Analytics
      {
        path: 'analytics',
        children: [
          {
            path: '',
            redirectTo: 'nps-analysis',
            pathMatch: 'full'
          },
          {
            path: 'nps-analysis',
            loadComponent: () => import('./features/analytics/nps-analysis/nps-analysis').then(m => m.NpsAnalysis),
            data: { title: 'NPS Analysis', breadcrumb: 'NPS Analysis' }
          }
        ]
      },
      {
        path: 'social-media',
        children: [
          {
            path: '',
            redirectTo: 'social-analysis',
            pathMatch: 'full'
          },
          {
            path: 'social-analysis',
            loadComponent: () => import('./features/social-media/social-analysis/social-analysis').then(m => m.SocialAnalysis),
            data: { title: 'Social Media Analysis', breadcrumb: 'Social Media' }
          },
          {
            path: 'dataset-profile',
            loadComponent: () => import('./features/social-media/dataset-profile/dataset-profile').then(m => m.DatasetProfile),
            data: { title: 'Dataset profile', breadcrumb: 'Dataset profile' }
          },
          {
            path: 'source-extraction',
            redirectTo: '/app/data-sources/csv-upload',
            pathMatch: 'full'
          },
          {
            path: 'methodology',
            loadComponent: () => import('./features/social-media/methodology/methodology').then(m => m.Methodology),
            data: { title: 'Scope and method', breadcrumb: 'Scope and method' }
          },
          {
            path: 'arcelik-twitter-cx',
            redirectTo: '/app/reports/executive-summary',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'alerts',
        children: [
          {
            path: '',
            redirectTo: 'alert-dashboard',
            pathMatch: 'full'
          },
          {
            path: 'alert-dashboard',
            loadComponent: () => import('./features/alerts/alert-dashboard/alert-dashboard').then(m => m.AlertDashboard),
            data: { title: 'Alerts', breadcrumb: 'Alerts' }
          },
          {
            path: 'alert-configuration',
            loadComponent: () => import('./features/alerts/alert-configuration/alert-configuration').then(m => m.AlertConfiguration),
            data: { title: 'Alert Configuration', breadcrumb: 'Alert Configuration' }
          }
        ]
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications-page/notifications-page').then(m => m.NotificationsPage),
        data: { title: 'Notifications', breadcrumb: 'Notifications' }
      },
      // Profile
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
        data: { title: 'Profile', breadcrumb: 'Profile' }
      }

    ]
  },

  // Wildcard route - redirect authenticated users to dashboard, others to landing
  {
    path: '**',
    redirectTo: ''
  }
];
