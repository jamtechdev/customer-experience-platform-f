import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, checkerGuard } from './core/guards/auth.guard';
import { adminAuthGuard } from './core/guards/admin-auth.guard';
import { adminGuestGuard } from './core/guards/admin-guest.guard';

export const routes: Routes = [
  // Landing page (public)
  {
    path: '',
    loadComponent: () => import('./landing/landing').then(m => m.Landing)
  },
  // Admin routes (separate from user routes)
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/admin/auth/admin-login/admin-login').then(m => m.AdminLogin),
        canActivate: [adminGuestGuard]
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
        canActivate: [adminAuthGuard],
        data: { title: 'Admin Dashboard', breadcrumb: 'Admin Dashboard' }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/user-management/user-management').then(m => m.UserManagement),
        canActivate: [adminAuthGuard],
        data: { title: 'User Management', breadcrumb: 'Users' }
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/admin/role-management/role-management').then(m => m.RoleManagement),
        canActivate: [adminAuthGuard],
        data: { title: 'Role Management', breadcrumb: 'Roles' }
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/admin/system-settings/system-settings').then(m => m.SystemSettings),
        canActivate: [adminAuthGuard],
        data: { title: 'System Settings', breadcrumb: 'Settings' }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then(m => m.Signup),
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
    canActivate: [authGuard],
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


      // CX Journey / Roadmap
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


      // Data Sources
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

      // Reports
      {
        path: 'reports',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/reports/report-list/report-list').then(m => m.ReportList),
            data: { title: 'Reports', breadcrumb: 'Reports' }
          },
          {
            path: 'builder',
            loadComponent: () => import('./features/reports/report-builder/report-builder').then(m => m.ReportBuilder),
            data: { title: 'Report Builder', breadcrumb: 'Report Builder' }
          }
        ]
      },



      // Analytics routes
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
