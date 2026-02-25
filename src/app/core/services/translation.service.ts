import { Injectable, signal, computed } from '@angular/core';

export type Language = 'en' | 'tr';

export interface Translations {
  [key: string]: string | Translations;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage = signal<Language>('tr');
  
  readonly currentLang = computed(() => this.currentLanguage());

  private translations: Record<Language, Translations> = {
    en: {
      // Auth
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      firstName: 'First Name',
      lastName: 'Last Name',
      rememberMe: 'Remember Me',
      forgotPassword: 'Forgot Password?',
      loginButton: 'Sign In',
      signupButton: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      noAccount: "Don't have an account?",
      loginTitle: 'CX Platform',
      loginSubtitle: 'Customer Experience Management System',
      signupTitle: 'Create Account',
      signupSubtitle: 'Join the customer experience platform',
      // Landing
      landingTitle: 'Measure, Analyze, and Improve',
      landingSubtitle: 'Your Customer Experience',
      landingDescription: 'Analyze data from social media, app store reviews, and NPS surveys to increase customer satisfaction and grow your business.',
      getStarted: 'Get Started Free',
      learnMore: 'Learn More',
      features: 'Powerful Features',
      sentimentAnalysis: 'Sentiment Analysis',
      sentimentAnalysisDesc: 'Automatically analyze customer feedback and detect positive/negative trends.',
      npsAnalysis: 'NPS Analysis',
      npsAnalysisDesc: 'Calculate Net Promoter Score and measure customer loyalty.',
      rootCauseAnalysis: 'Root Cause Analysis',
      rootCauseAnalysisDesc: 'Identify the root causes of customer complaints and generate solutions.',
      competitorAnalysis: 'Competitor Analysis',
      competitorAnalysisDesc: 'Compare with competitors and evaluate your market position.',
      detailedReports: 'Detailed Reports',
      detailedReportsDesc: 'Create comprehensive reports in PDF and Excel formats and share them.',
      customerJourney: 'Customer Journey',
      customerJourneyDesc: 'Map all touchpoints and optimize customer experience.',
      // Messages
      loginSuccess: 'Login successful!',
      signupSuccess: 'Account created successfully! Please login.',
      loginError: 'Invalid email or password.',
      signupError: 'Registration failed. Please try again.',
      validationError: 'Please fill in all fields.',
      passwordMismatch: 'Passwords do not match.',
      passwordMinLength: 'Password must be at least 6 characters.',
      agreeToTerms: 'I agree to the terms of service and privacy policy',
      // Stats
      offline: '100% Offline',
      analysis24_7: '24/7 Analysis',
      aiPowered: 'AI-Powered Recommendations',
      // Footer
      copyright: 'Albaraka Türk Participation Bank. All rights reserved.',
      // Navigation
      dashboard: 'Dashboard',
      admin: 'Admin',
      profile: 'Profile',
      settings: 'Settings',
      // Dashboard
      dashboardTitle: 'Dashboard',
      dashboardSubtitle: 'Customer experience general overview',
      totalFeedback: 'Total Feedback',
      averageSentimentScore: 'Average Sentiment Score',
      npsScore: 'NPS Score',
      resolutionRate: 'Resolution Rate',
      target: 'Target',
      sentimentDistribution: 'Sentiment Analysis Distribution',
      sourceDistribution: 'Source Distribution',
      activeAlarms: 'Active Alarms',
      categoryDistribution: 'Category Distribution',
      aiRecommendations: 'AI Recommendations',
      latestFeedback: 'Latest Feedback',
      taskSummary: 'Task Summary',
      pendingTasks: 'Pending Tasks',
      inProgressTasks: 'In-Progress Tasks',
      approvalPending: 'Approval Pending',
      completed: 'Completed',
      seeAll: 'See All',
      noActiveAlarms: 'No active alarms found',
      noRecommendations: 'No recommendations generated yet',
      noFeedback: 'No feedback yet',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      feedbackCount: 'feedback',
      downloadPdf: 'Download PDF',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisQuarter: 'This Quarter',
      thisYear: 'This Year',
      search: 'Search',
      searchPlaceholder: 'Search... (Ctrl+K)',
      notifications: 'Notifications',
      markAllRead: 'Mark All as Read',
      viewAllNotifications: 'View All Notifications',
      noNotifications: 'No notifications',
      manageAlarms: 'Manage Alarms',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      privacyPolicy: 'Privacy Policy',
      termsOfUse: 'Terms of Use',
      help: 'Help',
      makerChecker: 'Maker-Checker',
      // Menu Items
      feedback: 'Feedback',
      customerJourneys: 'Customer Journeys',
      touchpoints: 'Touchpoints',
      actionPlans: 'Action Plans',
      analysis: 'Analysis',
      trendAnalysis: 'Trend Analysis',
      tasks: 'Tasks',
      dataSources: 'Data Sources',
      reports: 'Reports',
      kpiDashboard: 'KPI Dashboard',
      reportBuilder: 'Report Builder',
      scheduledReports: 'Scheduled Reports',
      surveys: 'Surveys',
      surveyBuilder: 'Survey Builder',
      userManagement: 'User Management',
      roleManagement: 'Role Management',
      dataDictionary: 'Data Dictionary',
      auditLogs: 'Audit Logs',
      systemSettings: 'System Settings',
      loading: 'Loading...',
      retry: 'Retry'
    },
    tr: {
      // Auth
      login: 'Giriş Yap',
      signup: 'Kayıt Ol',
      logout: 'Çıkış Yap',
      email: 'E-posta Adresi',
      password: 'Şifre',
      confirmPassword: 'Şifre Tekrar',
      firstName: 'Ad',
      lastName: 'Soyad',
      rememberMe: 'Beni Hatırla',
      forgotPassword: 'Şifremi Unuttum',
      loginButton: 'Giriş Yap',
      signupButton: 'Hesap Oluştur',
      alreadyHaveAccount: 'Zaten hesabınız var mı?',
      noAccount: 'Hesabınız yok mu?',
      loginTitle: 'CX Platform',
      loginSubtitle: 'Müşteri Deneyimi Yönetim Sistemi',
      signupTitle: 'Hesap Oluştur',
      signupSubtitle: 'Müşteri deneyimi platformuna katılın',
      // Landing
      landingTitle: 'Müşteri Deneyiminizi',
      landingSubtitle: 'Ölçün, Analiz Edin, İyileştirin',
      landingDescription: 'Sosyal medya, uygulama mağazası yorumları ve NPS anketlerinden gelen verileri analiz ederek müşteri memnuniyetini artırın ve işletmenizi büyütün.',
      getStarted: 'Ücretsiz Başlayın',
      learnMore: 'Daha Fazla Bilgi',
      features: 'Güçlü Özellikler',
      sentimentAnalysis: 'Duygu Analizi',
      sentimentAnalysisDesc: 'Müşteri geri bildirimlerini otomatik olarak analiz edin ve pozitif/negatif trendleri tespit edin.',
      npsAnalysis: 'NPS Analizi',
      npsAnalysisDesc: 'Net Promoter Score hesaplayın ve müşteri sadakatini ölçün.',
      rootCauseAnalysis: 'Kök Neden Analizi',
      rootCauseAnalysisDesc: 'Müşteri şikayetlerinin temel nedenlerini belirleyin ve çözümler üretin.',
      competitorAnalysis: 'Rakip Analizi',
      competitorAnalysisDesc: 'Rakiplerinizle karşılaştırın ve pazardaki konumunuzu değerlendirin.',
      detailedReports: 'Detaylı Raporlar',
      detailedReportsDesc: 'PDF ve Excel formatında kapsamlı raporlar oluşturun ve paylaşın.',
      customerJourney: 'Müşteri Yolculuğu',
      customerJourneyDesc: 'Tüm temas noktalarını haritalayın ve müşteri deneyimini optimize edin.',
      // Messages
      loginSuccess: 'Giriş başarılı!',
      signupSuccess: 'Hesabınız başarıyla oluşturuldu! Lütfen giriş yapın.',
      loginError: 'E-posta veya şifre hatalı.',
      signupError: 'Kayıt işlemi başarısız. Lütfen tekrar deneyin.',
      validationError: 'Lütfen tüm alanları doldurun.',
      passwordMismatch: 'Şifreler eşleşmiyor.',
      passwordMinLength: 'Şifre en az 6 karakter olmalıdır.',
      agreeToTerms: 'Kullanım şartlarını ve gizlilik politikasını kabul ediyorum',
      // Stats
      offline: '100% Offline Çalışma',
      analysis24_7: '24/7 Analiz',
      aiPowered: 'AI Destekli Öneriler',
      // Footer
      copyright: 'Albaraka Türk Katılım Bankası. Tüm hakları saklıdır.',
      // Navigation
      dashboard: 'Dashboard',
      admin: 'Yönetim',
      profile: 'Profil',
      settings: 'Ayarlar',
      // Dashboard
      dashboardTitle: 'Dashboard',
      dashboardSubtitle: 'Müşteri deneyimi genel görünümü',
      totalFeedback: 'Toplam Geri Bildirim',
      averageSentimentScore: 'Ortalama Duygu Skoru',
      npsScore: 'NPS Skoru',
      resolutionRate: 'Çözüm Oranı',
      target: 'Hedef',
      sentimentDistribution: 'Duygu Analizi Dağılımı',
      sourceDistribution: 'Kaynak Dağılımı',
      activeAlarms: 'Aktif Alarmlar',
      categoryDistribution: 'Kategori Dağılımı',
      aiRecommendations: 'AI Önerileri',
      latestFeedback: 'Son Geri Bildirimler',
      taskSummary: 'Görev Özeti',
      pendingTasks: 'Bekleyen Görevler',
      inProgressTasks: 'İşlemdeki Görevler',
      approvalPending: 'Onay Bekleyen',
      completed: 'Tamamlanan',
      seeAll: 'Tümünü Gör',
      noActiveAlarms: 'Aktif alarm bulunmuyor',
      noRecommendations: 'Henüz öneri üretilmedi',
      noFeedback: 'Henüz geri bildirim yok',
      positive: 'Pozitif',
      neutral: 'Nötr',
      negative: 'Negatif',
      feedbackCount: 'geri bildirim',
      downloadPdf: 'PDF İndir',
      today: 'Bugün',
      thisWeek: 'Bu Hafta',
      thisMonth: 'Bu Ay',
      thisQuarter: 'Bu Çeyrek',
      thisYear: 'Bu Yıl',
      search: 'Ara',
      searchPlaceholder: 'Ara... (Ctrl+K)',
      notifications: 'Bildirimler',
      markAllRead: 'Tümünü Okundu İşaretle',
      viewAllNotifications: 'Tüm Bildirimleri Gör',
      noNotifications: 'Bildirim bulunmuyor',
      manageAlarms: 'Alarmları Yönet',
      critical: 'Kritik',
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük',
      privacyPolicy: 'Gizlilik Politikası',
      termsOfUse: 'Kullanım Koşulları',
      help: 'Yardım',
      makerChecker: 'Maker-Checker',
      // Menu Items
      feedback: 'Geri Bildirimler',
      customerJourneys: 'Müşteri Yolculukları',
      touchpoints: 'Temas Noktaları',
      actionPlans: 'Aksiyon Planları',
      analysis: 'Analiz',
      trendAnalysis: 'Trend Analizi',
      tasks: 'Görevler',
      dataSources: 'Veri Kaynakları',
      reports: 'Raporlar',
      kpiDashboard: 'KPI Dashboard',
      reportBuilder: 'Rapor Oluşturucu',
      scheduledReports: 'Zamanlanmış Raporlar',
      surveys: 'Anketler',
      surveyBuilder: 'Anket Oluşturucu',
      userManagement: 'Kullanıcı Yönetimi',
      roleManagement: 'Rol Yönetimi',
      dataDictionary: 'Veri Sözlüğü',
      auditLogs: 'Denetim Kayıtları',
      systemSettings: 'Sistem Ayarları',
      loading: 'Yükleniyor...',
      retry: 'Tekrar Dene'
    }
  };

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', lang);
    }
  }

  getLanguage(): Language {
    return this.currentLanguage();
  }

  translate(key: string, params?: Record<string, string>): string {
    const lang = this.currentLanguage();
    const keys = key.split('.');
    let value: any = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        value = this.translations['en'];
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2];
          } else {
            return key;
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }

    return value;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('preferredLanguage') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'tr')) {
        this.currentLanguage.set(savedLang);
      }
    }
  }
}
