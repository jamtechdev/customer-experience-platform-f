import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page (public)
  {
    path: '',
    loadComponent: () => import('./landing/landing').then(m => m.Landing)
  },
  // All users use /app/dashboard; redirect old admin/manage URLs
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
    canActivate: [authGuard, adminGuard],
    children: [
      // Dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/main-dashboard/main-dashboard').then(m => m.MainDashboard),
        data: { title: 'Dashboard', breadcrumb: 'Dashboard' }
      },
      {
        path: 'executive-dashboard',
        loadComponent: () => import('./features/dashboard/executive-dashboard/executive-dashboard').then(m => m.ExecutiveDashboard),
        data: { title: 'Executive Dashboard', breadcrumb: 'Executive Dashboard' }
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
        data: { title: 'CSV Upload', breadcrumb: 'CSV Upload' }
      },
      {
        path: 'data-sources/csv-mapping/:importId',
        loadComponent: () => import('./features/data-ingestion/csv-mapping/csv-mapping').then(m => m.CsvMapping),
        data: { title: 'CSV Column Mapping', breadcrumb: 'CSV Mapping' }
      },
      {
        path: 'data-sources/import-history',
        loadComponent: () => import('./features/data-ingestion/import-history/import-history').then(m => m.ImportHistory),
        data: { title: 'Import History', breadcrumb: 'Import History' }
      },

      // Reports (list + executive-summary for all; builder for Admin + CX Manager only)
      {
        path: 'reports',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/reports/report-list/report-list').then(m => m.ReportList),
            data: { title: 'Reports', breadcrumb: 'Reports' }
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
            path: 'source-extraction',
            loadComponent: () => import('./features/social-media/source-extraction/source-extraction').then(m => m.SourceExtraction),
            data: { title: 'Source Extraction', breadcrumb: 'Source Extraction' }
          },
          {
            path: 'methodology',
            loadComponent: () => import('./features/social-media/methodology/methodology').then(m => m.Methodology),
            data: { title: 'Analysis Methodology', breadcrumb: 'Methodology' }
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
