/**
 * Single environment config for dev and production. Values from .env (process.env).
 */

import {
  getEnv,
  getEnvBoolean,
  getEnvNumber,
  getEnvArray,
  isProduction,
} from './environment.helper';

const prod = isProduction();

export const environment = {
  production: prod,

  appName: getEnv('NG_APP_NAME', 'Sentimenter CX'),
  appVersion: getEnv('NG_APP_VERSION', '1.0.0'),
  appTitle: getEnv('NG_APP_TITLE', 'Albaraka Türk Müşteri Deneyimi Platformu'),

  // Backend base URL. If NG_APP_API_URL is not provided at build time,
  // fall back to the deployed API endpoint.
  apiUrl: getEnv('NG_APP_API_URL', 'http://localhost:5000/api'),
  apiVersion: getEnv('NG_APP_API_VERSION', 'v1'),
  apiTimeout: getEnvNumber('NG_APP_API_TIMEOUT', 30000),

  auth: {
    tokenKey: getEnv('NG_APP_TOKEN_KEY', 'sentimenter_token'),
    refreshTokenKey: getEnv('NG_APP_REFRESH_TOKEN_KEY', 'sentimenter_refresh_token'),
    tokenExpiry: getEnvNumber('NG_APP_TOKEN_EXPIRY', 3600),
    refreshTokenExpiry: getEnvNumber('NG_APP_REFRESH_TOKEN_EXPIRY', 604800),
  },

  websocket: {
    enabled: false,
    url: (() => {
      const wsUrl = getEnv('NG_APP_WEBSOCKET_URL', '');
      if (wsUrl) return wsUrl;
      if (prod) return '';
      const wsHost = getEnv('NG_APP_WEBSOCKET_HOST', '') || getEnv('NG_APP_API_HOST', '');
      const wsPort = getEnv('NG_APP_WEBSOCKET_PORT', '') || getEnv('NG_APP_API_PORT', '');
      const wsPath = getEnv('NG_APP_WEBSOCKET_PATH', '/ws');
      const wsProtocol = getEnv('NG_APP_WEBSOCKET_PROTOCOL', 'ws');
      if (!wsHost) return '';
      return `${wsProtocol}://${wsHost}${wsPort ? ':' + wsPort : ''}${wsPath}`;
    })(),
    reconnectInterval: getEnvNumber('NG_APP_WEBSOCKET_RECONNECT_INTERVAL', 5000),
    maxReconnectAttempts: getEnvNumber('NG_APP_WEBSOCKET_MAX_RECONNECT_ATTEMPTS', 10),
  },

  features: {
    aiAnalysis: getEnvBoolean('NG_APP_FEATURE_AI_ANALYSIS', true),
    competitorAnalysis: getEnvBoolean('NG_APP_FEATURE_COMPETITOR_ANALYSIS', true),
    socialMediaIntegration: getEnvBoolean('NG_APP_FEATURE_SOCIAL_MEDIA_INTEGRATION', false),
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

  languages: [
    { code: 'tr', name: 'Türkçe', default: true },
    { code: 'en', name: 'English', default: false },
    { code: 'ar', name: 'العربية', default: false },
  ],

  dataSources: {
    instagram: { enabled: false, apiUrl: '' },
    twitter: { enabled: false, apiUrl: '' },
    youtube: { enabled: false, apiUrl: '' },
    googleReviews: { enabled: false, apiUrl: '' },
    appStore: { enabled: false, apiUrl: '' },
    playStore: { enabled: false, apiUrl: '' },
    sikayetVar: { enabled: false, scrapeEnabled: false },
  },

  pagination: {
    defaultPageSize: getEnvNumber('NG_APP_PAGINATION_DEFAULT_PAGE_SIZE', 20),
    pageSizeOptions: getEnvArray('NG_APP_PAGINATION_PAGE_SIZE_OPTIONS', [
      '10',
      '20',
      '50',
      '100',
    ]).map(Number),
  },

  cache: {
    enabled: getEnvBoolean('NG_APP_CACHE_ENABLED', true),
    ttl: getEnvNumber('NG_APP_CACHE_TTL', prod ? 600 : 300),
    maxSize: getEnvNumber('NG_APP_CACHE_MAX_SIZE', prod ? 200 : 100),
  },

  analytics: {
    enabled: getEnvBoolean('NG_APP_ANALYTICS_ENABLED', prod),
    googleAnalyticsId: getEnv('NG_APP_GOOGLE_ANALYTICS_ID', prod ? 'G-XXXXXXXXXX' : ''),
  },

  logging: {
    level: getEnv(
      'NG_APP_LOG_LEVEL',
      prod ? 'error' : 'debug'
    ) as 'debug' | 'info' | 'warn' | 'error',
    console: getEnvBoolean('NG_APP_LOG_CONSOLE', !prod),
    remote: getEnvBoolean('NG_APP_LOG_REMOTE', prod),
  },

  security: {
    kvkkCompliance: getEnvBoolean('NG_APP_KVKK_COMPLIANCE', true),
    gdprCompliance: getEnvBoolean('NG_APP_GDPR_COMPLIANCE', true),
    dataRetentionDays: getEnvNumber('NG_APP_DATA_RETENTION_DAYS', 365),
    sessionTimeout: getEnvNumber('NG_APP_SESSION_TIMEOUT', 1800),
    maxLoginAttempts: getEnvNumber('NG_APP_MAX_LOGIN_ATTEMPTS', 5),
    lockoutDuration: getEnvNumber('NG_APP_LOCKOUT_DURATION', 900),
  },

  charts: {
    defaultColors: [
      '#059669',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#84cc16',
    ],
    animationDuration: 300,
  },

  dateFormat: {
    short: 'dd.MM.yyyy',
    medium: 'dd MMM yyyy',
    long: 'dd MMMM yyyy',
    full: 'dd MMMM yyyy HH:mm',
    time: 'HH:mm',
    datetime: 'dd.MM.yyyy HH:mm',
  },

  upload: {
    maxFileSize: getEnvNumber('NG_APP_UPLOAD_MAX_FILE_SIZE', 10485760),
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/json',
    ],
    maxFiles: getEnvNumber('NG_APP_UPLOAD_MAX_FILES', 10),
  },

  sentiment: {
    positiveThreshold: getEnvNumber('NG_APP_SENTIMENT_POSITIVE_THRESHOLD', 0.6),
    negativeThreshold: getEnvNumber('NG_APP_SENTIMENT_NEGATIVE_THRESHOLD', 0.4),
    veryPositiveThreshold: getEnvNumber('NG_APP_SENTIMENT_VERY_POSITIVE_THRESHOLD', 0.8),
    veryNegativeThreshold: getEnvNumber('NG_APP_SENTIMENT_VERY_NEGATIVE_THRESHOLD', 0.2),
  },

  ai: {
    modelEndpoint: (() => {
      const endpoint = getEnv('NG_APP_AI_MODEL_ENDPOINT', '');
      if (endpoint) return endpoint;
      if (prod) return '';
      const apiHost = getEnv('NG_APP_API_HOST', '');
      const apiPort = getEnv('NG_APP_API_PORT', '');
      const apiProtocol = getEnv('NG_APP_API_PROTOCOL', 'http');
      if (!apiHost) return '';
      return `${apiProtocol}://${apiHost}${apiPort ? ':' + apiPort : ''}/api/analysis/offline-ai`;
    })(),
    confidenceThreshold: getEnvNumber('NG_APP_AI_CONFIDENCE_THRESHOLD', 0.7),
    maxTokens: getEnvNumber('NG_APP_AI_MAX_TOKENS', 2048),
  },
};
