export interface Feedback {
  id: string;
  source: FeedbackSource;
  sourceId?: string;
  platform: Platform;
  content: string;
  originalLanguage: string;
  translatedContent?: string;
  author?: string;
  authorId?: string;
  sentiment: SentimentType;
  sentimentScore: number;
  category: FeedbackCategory;
  subCategory?: string;
  tags: string[];
  rootCauses: RootCause[];
  priority: Priority;
  status: FeedbackStatus;
  assignedTo?: string;
  department?: string;
  productService?: string;
  touchpoint?: string;
  customFields?: Record<string, any>;
  metadata: FeedbackMetadata;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  // Additional display properties
  title?: string;
  channel?: Platform;
  customerName?: string;
  customerId?: string;
}

export enum FeedbackSource {
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  APP_STORE = 'APP_STORE',
  GOOGLE_REVIEWS = 'GOOGLE_REVIEWS',
  COMPLAINT_SITE = 'COMPLAINT_SITE',
  CALL_CENTER = 'CALL_CENTER',
  SURVEY = 'SURVEY',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
  API = 'API',
  FILE_IMPORT = 'FILE_IMPORT',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  YOUTUBE = 'YOUTUBE',
  PLAY_STORE = 'PLAY_STORE',
  SIKAYETVAR = 'SIKAYETVAR'
}

export enum Platform {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  YOUTUBE = 'YOUTUBE',
  LINKEDIN = 'LINKEDIN',
  GOOGLE = 'GOOGLE',
  APP_STORE_IOS = 'APP_STORE_IOS',
  PLAY_STORE = 'PLAY_STORE',
  SIKAYETVAR = 'SIKAYETVAR',
  EKSI_SOZLUK = 'EKSI_SOZLUK',
  INTERNAL = 'INTERNAL',
  OTHER = 'OTHER',
  CALL_CENTER = 'CALL_CENTER',
  EMAIL = 'EMAIL',
  WEB = 'WEB',
  SURVEY = 'SURVEY',
  BRANCH = 'BRANCH',
  COMPLAINT_SITE = 'COMPLAINT_SITE',
  GOOGLE_REVIEWS = 'GOOGLE_REVIEWS',
  APP_STORE = 'APP_STORE'
}

export enum SentimentType {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  MIXED = 'MIXED'
}

export enum FeedbackCategory {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  DELIVERY = 'DELIVERY',
  AFTER_SALES = 'AFTER_SALES',
  PRICING = 'PRICING',
  MOBILE_APP = 'MOBILE_APP',
  INTERNET_BANKING = 'INTERNET_BANKING',
  BRANCH = 'BRANCH',
  ATM = 'ATM',
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  DEPOSIT = 'DEPOSIT',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
  PRICE = 'PRICE',
  STAFF = 'STAFF',
  DIGITAL = 'DIGITAL',
  GENERAL = 'GENERAL'
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum FeedbackStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED'
}

export interface RootCause {
  id: string;
  name: string;
  description: string;
  confidence: number;
  frequency: number;
}

export interface FeedbackMetadata {
  originalUrl?: string;
  likes?: number;
  shares?: number;
  comments?: number;
  rating?: number;
  location?: string;
  deviceInfo?: string;
  appVersion?: string;
  responseTime?: number;
  isVerified?: boolean;
}

export interface FeedbackFilter {
  sources?: FeedbackSource[];
  platforms?: Platform[];
  sentiments?: SentimentType[];
  categories?: FeedbackCategory[];
  priorities?: Priority[];
  statuses?: FeedbackStatus[];
  departments?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
  tags?: string[];
}

export interface FeedbackStats {
  total: number;
  bySentiment: Record<SentimentType, number>;
  bySource: Record<FeedbackSource, number>;
  byCategory: Record<FeedbackCategory, number>;
  byStatus: Record<FeedbackStatus, number>;
  avgSentimentScore: number;
  trendPercentage: number;
}

// Type aliases for backward compatibility
export { Priority as FeedbackPriority };
export { SentimentType as Sentiment };
export { Platform as Channel };
