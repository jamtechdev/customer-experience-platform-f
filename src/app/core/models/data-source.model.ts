export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  platform: string;
  status: DataSourceStatus;
  configuration: DataSourceConfig;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncFrequency: SyncFrequency;
  totalRecords: number;
  errorCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum DataSourceType {
  SOCIAL_MEDIA_API = 'SOCIAL_MEDIA_API',
  WEB_SCRAPER = 'WEB_SCRAPER',
  API_INTEGRATION = 'API_INTEGRATION',
  FILE_IMPORT = 'FILE_IMPORT',
  DATABASE = 'DATABASE',
  WEBHOOK = 'WEBHOOK',
  CALL_CENTER = 'CALL_CENTER'
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
  PENDING = 'PENDING'
}

export enum SyncFrequency {
  REAL_TIME = 'REAL_TIME',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MANUAL = 'MANUAL'
}

export interface DataSourceConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  endpoint?: string;
  webhookUrl?: string;
  fileFormat?: string;
  filePath?: string;
  connectionString?: string;
  filters?: DataSourceFilter[];
  mappings?: FieldMapping[];
}

export interface DataSourceFilter {
  field: string;
  operator: string;
  value: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
}

export interface SyncLog {
  id: string;
  dataSourceId: string;
  startTime: Date;
  endTime?: Date;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: SyncError[];
}

export enum SyncStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'
}

export interface SyncError {
  recordId?: string;
  message: string;
  timestamp: Date;
}
