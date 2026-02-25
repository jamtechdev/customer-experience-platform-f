// Re-export models - handle duplicate names by explicitly selecting exports
export * from './user.model';
export * from './feedback.model';
export * from './task.model';
export * from './customer-journey.model';
export * from './data-source.model';
export * from './report.model';
// Export analysis model but exclude duplicates - use export type for interfaces
export type { 
  AIRecommendation,
  SuggestedAction,
  RecommendationFeedback,
  RootCauseAnalysis,
  IdentifiedRootCause,
  ContributingFactor,
  RCATimeline,
  SentimentAnalysisResult,
  EmotionScore,
  AspectSentiment,
  KeywordSentiment,
  EntityMention
} from './analysis.model';
// Export enums normally
export { 
  RecommendationType,
  RecommendationPriority,
  ImpactArea,
  RecommendationStatus,
  RootCauseCategory,
  AnalysisMethod,
  RCAStatus
} from './analysis.model';

// Common interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  permissions?: string[];
  badge?: string | number;
  isExpanded?: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ALARM = 'ALARM',
  TASK = 'TASK'
}

// Data Dictionary (Veri Sözlüğü)
export interface DataDictionary {
  id: string;
  version: string;
  entities: DataEntity[];
  lastUpdated: Date;
  updatedBy: string;
}

export interface DataEntity {
  name: string;
  description: string;
  schema: string;
  table: string;
  fields: DataField[];
}

export interface DataField {
  name: string;
  description: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: string;
  constraints?: string;
}
