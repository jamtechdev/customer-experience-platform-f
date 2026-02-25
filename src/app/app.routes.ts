import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, checkerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page (public)
  {
    path: '',
    loadComponent: () => import('./features/auth/landing.component').then(m => m.LandingComponent)
  },
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard]
  },

  // Protected routes
  {
    path: 'app',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
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
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { title: 'Dashboard', breadcrumb: 'Ana Sayfa' }
      },

      // Feedback Management
      {
        path: 'feedback',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/feedback/feedback-list.component').then(m => m.FeedbackListComponent),
            data: { title: 'Geri Bildirimler', breadcrumb: 'Geri Bildirimler' }
          },
          {
            path: ':id',
            loadComponent: () => import('./features/feedback/feedback-detail.component').then(m => m.FeedbackDetailComponent),
            data: { title: 'Geri Bildirim Detayı', breadcrumb: 'Detay' }
          }
        ]
      },

      // CX Journey / Roadmap
      {
        path: 'cx',
        children: [
          {
            path: 'journeys',
            loadComponent: () => import('./features/cx-roadmap/journey-list.component').then(m => m.JourneyListComponent),
            data: { title: 'Müşteri Yolculukları', breadcrumb: 'CX Yolculukları' }
          },
          {
            path: 'journeys/:id',
            loadComponent: () => import('./features/cx-roadmap/journey-map.component').then(m => m.JourneyMapComponent),
            data: { title: 'Yolculuk Haritası', breadcrumb: 'Harita' }
          },
          {
            path: 'touchpoints',
            loadComponent: () => import('./features/cx-journey/touchpoints.component').then(m => m.TouchpointsComponent),
            data: { title: 'Temas Noktaları', breadcrumb: 'Temas Noktaları' }
          },
          {
            path: 'action-plans',
            loadComponent: () => import('./features/cx-journey/action-plans.component').then(m => m.ActionPlansComponent),
            data: { title: 'Aksiyon Planları', breadcrumb: 'Aksiyon Planları' }
          }
        ]
      },

      // Analysis
      {
        path: 'analysis',
        children: [
          {
            path: 'sentiment',
            loadComponent: () => import('./features/analysis/sentiment-analysis.component').then(m => m.SentimentAnalysisComponent),
            data: { title: 'Duygu Analizi', breadcrumb: 'Duygu Analizi' }
          },
          {
            path: 'root-cause',
            loadComponent: () => import('./features/analysis/root-cause.component').then(m => m.RootCauseComponent),
            data: { title: 'Kök Neden Analizi', breadcrumb: 'Kök Neden' }
          },
          {
            path: 'recommendations',
            loadComponent: () => import('./features/analysis/recommendations.component').then(m => m.RecommendationsComponent),
            data: { title: 'AI Öneriler', breadcrumb: 'Öneriler' }
          },
          {
            path: 'competitor',
            loadComponent: () => import('./features/analysis/competitor-analysis.component').then(m => m.CompetitorAnalysisComponent),
            data: { title: 'Rakip Analizi', breadcrumb: 'Rakip Analizi' }
          },
          {
            path: 'trends',
            loadComponent: () => import('./features/analysis/trends.component').then(m => m.TrendsComponent),
            data: { title: 'Trend Analizi', breadcrumb: 'Trendler' }
          }
        ]
      },

      // Tasks & Alarms
      {
        path: 'tasks',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/tasks/task-list.component').then(m => m.TaskListComponent),
            data: { title: 'Görevler', breadcrumb: 'Görevler' }
          },
          {
            path: 'maker-checker',
            loadComponent: () => import('./features/maker-checker/maker-checker.component').then(m => m.MakerCheckerComponent),
            canActivate: [checkerGuard],
            data: { title: 'Onay Bekleyenler', breadcrumb: 'Maker-Checker' }
          }
        ]
      },

      // Data Sources
      {
        path: 'data-sources',
        loadComponent: () => import('./features/data-sources/data-sources.component').then(m => m.DataSourcesComponent),
        data: { title: 'Veri Kaynakları', breadcrumb: 'Veri Kaynakları' }
      },
      {
        path: 'data-sources/csv-upload',
        loadComponent: () => import('./features/data-sources/csv-upload.component').then(m => m.CSVUploadComponent),
        data: { title: 'CSV Yükleme', breadcrumb: 'CSV Yükleme' }
      },

      // Reports
      {
        path: 'reports',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
            data: { title: 'Raporlar', breadcrumb: 'Raporlar' }
          },
          {
            path: 'kpis',
            loadComponent: () => import('./features/reports/kpi-dashboard.component').then(m => m.KpiDashboardComponent),
            data: { title: 'KPI Dashboard', breadcrumb: 'KPI Dashboard' }
          },
          {
            path: 'builder',
            loadComponent: () => import('./features/reports/report-builder.component').then(m => m.ReportBuilderComponent),
            data: { title: 'Rapor Oluşturucu', breadcrumb: 'Rapor Oluşturucu' }
          },
          {
            path: 'scheduled',
            loadComponent: () => import('./features/reports/scheduled-reports.component').then(m => m.ScheduledReportsComponent),
            data: { title: 'Zamanlanmış Raporlar', breadcrumb: 'Zamanlanmış' }
          }
        ]
      },

      // Surveys
      {
        path: 'surveys',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/surveys/survey-list.component').then(m => m.SurveyListComponent),
            data: { title: 'Anketler', breadcrumb: 'Anketler' }
          },
          {
            path: 'builder',
            loadComponent: () => import('./features/surveys/survey-builder.component').then(m => m.SurveyBuilderComponent),
            data: { title: 'Anket Oluşturucu', breadcrumb: 'Anket Oluşturucu' }
          },
          {
            path: ':id/results',
            loadComponent: () => import('./features/surveys/survey-results.component').then(m => m.SurveyResultsComponent),
            data: { title: 'Anket Sonuçları', breadcrumb: 'Sonuçlar' }
          }
        ]
      },

      // Admin
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'users',
            loadComponent: () => import('./features/admin/user-management.component').then(m => m.UserManagementComponent),
            data: { title: 'Kullanıcı Yönetimi', breadcrumb: 'Kullanıcılar' }
          },
          {
            path: 'roles',
            loadComponent: () => import('./features/admin/role-management.component').then(m => m.RoleManagementComponent),
            data: { title: 'Rol Yönetimi', breadcrumb: 'Roller' }
          },
          {
            path: 'data-dictionary',
            loadComponent: () => import('./features/admin/data-dictionary.component').then(m => m.DataDictionaryComponent),
            data: { title: 'Veri Sözlüğü', breadcrumb: 'Veri Sözlüğü' }
          },
          {
            path: 'audit-logs',
            loadComponent: () => import('./features/admin/audit-logs.component').then(m => m.AuditLogsComponent),
            data: { title: 'Denetim Kayıtları', breadcrumb: 'Denetim' }
          },
          {
            path: 'settings',
            loadComponent: () => import('./features/admin/settings.component').then(m => m.SettingsComponent),
            data: { title: 'Sistem Ayarları', breadcrumb: 'Ayarlar' }
          }
        ]
      },

      // Profile
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { title: 'Profil', breadcrumb: 'Profil' }
      },

      // Notifications
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
        data: { title: 'Bildirimler', breadcrumb: 'Bildirimler' }
      }
    ]
  },

  // Wildcard route - redirect authenticated users to dashboard, others to landing
  {
    path: '**',
    redirectTo: ''
  }
];
