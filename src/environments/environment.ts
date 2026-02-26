/**
 * Sentimenter CX - Development Environment Configuration
 * Albaraka Türk Customer Experience Platform
 * 
 * Environment variables can be set via:
 * 1. .env.development file (recommended)
 * 2. System environment variables
 * 3. Direct values below (fallback)
 */

import { getEnv, getEnvBoolean, getEnvNumber, getEnvArray } from './environment.helper';

export const environment = {
  production: false,
  
  // Application Settings
  appName: getEnv('NG_APP_NAME', 'Sentimenter CX'),
  appVersion: getEnv('NG_APP_VERSION', '1.0.0'),
  appTitle: getEnv('NG_APP_TITLE', 'Albaraka Türk Müşteri Deneyimi Platformu'),
  
  // API Configuration - Node.js Backend
  // Construct API URL from environment variables
  apiUrl: (() => {
    const apiUrl = getEnv('NG_APP_API_URL', '');
    if (apiUrl) return apiUrl;
    
    // Build from components if not provided
    const apiHost = getEnv('NG_APP_API_HOST', 'localhost');
    const apiPort = getEnv('NG_APP_API_PORT', '5000');
    const apiPath = getEnv('NG_APP_API_PATH', '/api');
    const apiProtocol = getEnv('NG_APP_API_PROTOCOL', 'http');
    return `${apiProtocol}://${apiHost}:${apiPort}${apiPath}`;
  })(),
  apiVersion: getEnv('NG_APP_API_VERSION', 'v1'),
  apiTimeout: getEnvNumber('NG_APP_API_TIMEOUT', 30000), // 30 seconds
  
  // Authentication
  auth: {
    tokenKey: getEnv('NG_APP_TOKEN_KEY', 'sentimenter_token'),
    refreshTokenKey: getEnv('NG_APP_REFRESH_TOKEN_KEY', 'sentimenter_refresh_token'),
    tokenExpiry: getEnvNumber('NG_APP_TOKEN_EXPIRY', 3600), // 1 hour in seconds
    refreshTokenExpiry: getEnvNumber('NG_APP_REFRESH_TOKEN_EXPIRY', 604800), // 7 days in seconds
  },
  
  // WebSocket Configuration (for real-time updates) - DISABLED: No WebSocket support in this project
  websocket: {
    enabled: false, // Disabled - project uses CSV upload only, no real-time connections
    url: (() => {
      const wsUrl = getEnv('NG_APP_WEBSOCKET_URL', '');
      if (wsUrl) return wsUrl;
      
      // Build from components if not provided
      const wsHost = getEnv('NG_APP_WEBSOCKET_HOST', getEnv('NG_APP_API_HOST', 'localhost'));
      const wsPort = getEnv('NG_APP_WEBSOCKET_PORT', getEnv('NG_APP_API_PORT', '5000'));
      const wsPath = getEnv('NG_APP_WEBSOCKET_PATH', '/ws');
      const wsProtocol = getEnv('NG_APP_WEBSOCKET_PROTOCOL', 'ws');
      return `${wsProtocol}://${wsHost}:${wsPort}${wsPath}`;
    })(),
    reconnectInterval: getEnvNumber('NG_APP_WEBSOCKET_RECONNECT_INTERVAL', 5000),
    maxReconnectAttempts: getEnvNumber('NG_APP_WEBSOCKET_MAX_RECONNECT_ATTEMPTS', 10),
  },
  
  // Feature Flags
  features: {
    aiAnalysis: getEnvBoolean('NG_APP_FEATURE_AI_ANALYSIS', true), // Internal rule-based AI
    competitorAnalysis: getEnvBoolean('NG_APP_FEATURE_COMPETITOR_ANALYSIS', true),
    socialMediaIntegration: getEnvBoolean('NG_APP_FEATURE_SOCIAL_MEDIA_INTEGRATION', false), // Data from CSV only
    makerCheckerWorkflow: getEnvBoolean('NG_APP_FEATURE_MAKER_CHECKER_WORKFLOW', true),
    multiLanguage: getEnvBoolean('NG_APP_FEATURE_MULTI_LANGUAGE', true),
    darkMode: getEnvBoolean('NG_APP_FEATURE_DARK_MODE', true),
    exportToPdf: getEnvBoolean('NG_APP_FEATURE_EXPORT_PDF', true),
    exportToExcel: getEnvBoolean('NG_APP_FEATURE_EXPORT_EXCEL', true),
    realtimeNotifications: getEnvBoolean('NG_APP_FEATURE_REALTIME_NOTIFICATIONS', true),
    sentimentAnalysis: getEnvBoolean('NG_APP_FEATURE_SENTIMENT_ANALYSIS', true),
    rootCauseAnalysis: getEnvBoolean('NG_APP_FEATURE_ROOT_CAUSE_ANALYSIS', true),
    predictiveAnalytics: getEnvBoolean('NG_APP_FEATURE_PREDICTIVE_ANALYTICS', true),
    surveyModule: getEnvBoolean('NG_APP_FEATURE_SURVEY_MODULE', true),
    scheduledReports: getEnvBoolean('NG_APP_FEATURE_SCHEDULED_REPORTS', true),
  },
  
  // Supported Languages
  languages: [
    { code: 'tr', name: 'Türkçe', default: true },
    { code: 'en', name: 'English', default: false },
    { code: 'ar', name: 'العربية', default: false },
  ],
  
  // Data Sources Configuration (All data from CSV uploads)
  dataSources: {
    instagram: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    twitter: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    youtube: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    googleReviews: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    appStore: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    playStore: {
      enabled: false, // Data from CSV
      apiUrl: '',
    },
    sikayetVar: {
      enabled: false, // Data from CSV
      scrapeEnabled: false,
    },
  },
  
  // Pagination Settings
  pagination: {
    defaultPageSize: getEnvNumber('NG_APP_PAGINATION_DEFAULT_PAGE_SIZE', 20),
    pageSizeOptions: getEnvArray('NG_APP_PAGINATION_PAGE_SIZE_OPTIONS', ['10', '20', '50', '100']).map(Number),
  },
  
  // Cache Settings
  cache: {
    enabled: getEnvBoolean('NG_APP_CACHE_ENABLED', true),
    ttl: getEnvNumber('NG_APP_CACHE_TTL', 300), // 5 minutes
    maxSize: getEnvNumber('NG_APP_CACHE_MAX_SIZE', 100), // max 100 cached items
  },
  
  // Analytics & Tracking (development disabled)
  analytics: {
    enabled: getEnvBoolean('NG_APP_ANALYTICS_ENABLED', false),
    googleAnalyticsId: getEnv('NG_APP_GOOGLE_ANALYTICS_ID', ''),
  },
  
  // Logging
  logging: {
    level: getEnv('NG_APP_LOG_LEVEL', 'debug') as 'debug' | 'info' | 'warn' | 'error',
    console: getEnvBoolean('NG_APP_LOG_CONSOLE', true),
    remote: getEnvBoolean('NG_APP_LOG_REMOTE', false),
  },
  
  // Security
  security: {
    kvkkCompliance: getEnvBoolean('NG_APP_KVKK_COMPLIANCE', true),
    gdprCompliance: getEnvBoolean('NG_APP_GDPR_COMPLIANCE', true),
    dataRetentionDays: getEnvNumber('NG_APP_DATA_RETENTION_DAYS', 365),
    sessionTimeout: getEnvNumber('NG_APP_SESSION_TIMEOUT', 1800), // 30 minutes
    maxLoginAttempts: getEnvNumber('NG_APP_MAX_LOGIN_ATTEMPTS', 5),
    lockoutDuration: getEnvNumber('NG_APP_LOCKOUT_DURATION', 900), // 15 minutes
  },
  
  // Chart Configuration
  charts: {
    defaultColors: [
      '#059669', // Primary green
      '#3b82f6', // Blue
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#84cc16', // Lime
    ],
    animationDuration: 300,
  },
  
  // Date/Time Format
  dateFormat: {
    short: 'dd.MM.yyyy',
    medium: 'dd MMM yyyy',
    long: 'dd MMMM yyyy',
    full: 'dd MMMM yyyy HH:mm',
    time: 'HH:mm',
    datetime: 'dd.MM.yyyy HH:mm',
  },
  
  // File Upload Settings
  upload: {
    maxFileSize: getEnvNumber('NG_APP_UPLOAD_MAX_FILE_SIZE', 10485760), // 10 MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/json'],
    maxFiles: getEnvNumber('NG_APP_UPLOAD_MAX_FILES', 10),
  },
  
  // Sentiment Analysis Thresholds
  sentiment: {
    positiveThreshold: getEnvNumber('NG_APP_SENTIMENT_POSITIVE_THRESHOLD', 0.6),
    negativeThreshold: getEnvNumber('NG_APP_SENTIMENT_NEGATIVE_THRESHOLD', 0.4),
    veryPositiveThreshold: getEnvNumber('NG_APP_SENTIMENT_VERY_POSITIVE_THRESHOLD', 0.8),
    veryNegativeThreshold: getEnvNumber('NG_APP_SENTIMENT_VERY_NEGATIVE_THRESHOLD', 0.2),
  },
  
  // AI Model Configuration (Internal offline processing)
  ai: {
    modelEndpoint: (() => {
      const endpoint = getEnv('NG_APP_AI_MODEL_ENDPOINT', '');
      if (endpoint) return endpoint;
      
      // Build from API URL if not provided
      const apiHost = getEnv('NG_APP_API_HOST', 'localhost');
      const apiPort = getEnv('NG_APP_API_PORT', '5000');
      const apiProtocol = getEnv('NG_APP_API_PROTOCOL', 'http');
      return `${apiProtocol}://${apiHost}:${apiPort}/api/analysis/offline-ai`;
    })(),
    confidenceThreshold: getEnvNumber('NG_APP_AI_CONFIDENCE_THRESHOLD', 0.7),
    maxTokens: getEnvNumber('NG_APP_AI_MAX_TOKENS', 2048),
  },
};
