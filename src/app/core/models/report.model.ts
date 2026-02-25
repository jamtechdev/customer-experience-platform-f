export interface Report {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  frequency: ReportFrequency;
  format: ReportFormat;
  filters: ReportFilter;
  sections: ReportSection[];
  schedule?: ReportSchedule;
  recipients?: string[];
  status?: ReportStatus;
  dateRange?: { start: Date; end: Date };
  lastGeneratedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  progress?: number;
  fileUrl?: string;
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  SCHEDULED = 'SCHEDULED',
  FAILED = 'FAILED'
}

export enum ReportType {
  DASHBOARD = 'DASHBOARD',
  SENTIMENT = 'SENTIMENT',
  SENTIMENT_ANALYSIS = 'SENTIMENT_ANALYSIS',
  ROOT_CAUSE = 'ROOT_CAUSE',
  KPI = 'KPI',
  KPI_COMPARISON = 'KPI_COMPARISON',
  COMPETITOR = 'COMPETITOR',
  COMPETITOR_ANALYSIS = 'COMPETITOR_ANALYSIS',
  JOURNEY = 'JOURNEY',
  CX_ROADMAP = 'CX_ROADMAP',
  FEEDBACK = 'FEEDBACK',
  TASK_SUMMARY = 'TASK_SUMMARY',
  ALARM_SUMMARY = 'ALARM_SUMMARY',
  CUSTOM = 'CUSTOM'
}

export enum ReportFrequency {
  REAL_TIME = 'REAL_TIME',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  ON_DEMAND = 'ON_DEMAND'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  WORD = 'WORD',
  DASHBOARD = 'DASHBOARD',
  JSON = 'JSON'
}

export interface ReportFilter {
  dateRange: DateRange;
  sources?: string[];
  platforms?: string[];
  categories?: string[];
  departments?: string[];
  products?: string[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  compareWithPrevious?: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  chartType?: ChartType;
  metrics?: string[];
  data?: any;
  order: number;
  isVisible: boolean;
}

export enum SectionType {
  KPI_CARDS = 'KPI_CARDS',
  CHART = 'CHART',
  TABLE = 'TABLE',
  TEXT = 'TEXT',
  MAP = 'MAP',
  WORD_CLOUD = 'WORD_CLOUD',
  TIMELINE = 'TIMELINE'
}

export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  DONUT = 'DONUT',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  HEATMAP = 'HEATMAP',
  FUNNEL = 'FUNNEL',
  GAUGE = 'GAUGE',
  TREEMAP = 'TREEMAP'
}

export interface ReportSchedule {
  isEnabled: boolean;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
}

// KPI Models
export interface KPI {
  id: string;
  name: string;
  description?: string;
  category: KPICategory;
  value: number;
  previousValue: number;
  target: number;
  unit: string;
  trend: TrendDirection;
  trendPercentage?: number;
  changePercent?: number;
  status?: KPIStatus;
  isAlert?: boolean;
  history?: number[];
  lastUpdated?: Date;
}

export enum KPICategory {
  CUSTOMER_SATISFACTION = 'CUSTOMER_SATISFACTION',
  SENTIMENT = 'SENTIMENT',
  RESPONSE_TIME = 'RESPONSE_TIME',
  RESOLUTION_RATE = 'RESOLUTION_RATE',
  RESOLUTION = 'RESOLUTION',
  VOLUME = 'VOLUME',
  ENGAGEMENT = 'ENGAGEMENT',
  LOYALTY = 'LOYALTY',
  PERFORMANCE = 'PERFORMANCE'
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE'
}

export enum KPIStatus {
  ON_TARGET = 'ON_TARGET',
  BELOW_TARGET = 'BELOW_TARGET',
  ABOVE_TARGET = 'ABOVE_TARGET',
  CRITICAL = 'CRITICAL'
}

// Survey Models
export interface Survey {
  id: string;
  name: string;
  type: SurveyType;
  questions: SurveyQuestion[];
  responseCount: number;
  avgScore: number;
  status: SurveyStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export enum SurveyType {
  NPS = 'NPS',
  CSAT = 'CSAT',
  CES = 'CES',
  CUSTOM = 'CUSTOM'
}

export enum SurveyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  isRequired: boolean;
  order: number;
}

export enum QuestionType {
  RATING = 'RATING',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT = 'TEXT',
  NPS_SCALE = 'NPS_SCALE'
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;
  answers: SurveyAnswer[];
  score?: number;
  completedAt: Date;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | number | string[];
}

// Competitor Analysis
export interface CompetitorAnalysis {
  id: string;
  competitor: Competitor;
  period: DateRange;
  metrics: CompetitorMetrics;
  insights: string[];
  generatedAt: Date;
}

export interface Competitor {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  socialHandles: SocialHandle[];
  isActive: boolean;
}

export interface SocialHandle {
  platform: string;
  handle: string;
  url: string;
}

export interface CompetitorMetrics {
  sentimentScore: number;
  feedbackVolume: number;
  positivePercentage: number;
  negativePercentage: number;
  topTopics: TopicCount[];
  strengthAreas: string[];
  weaknessAreas: string[];
}

export interface TopicCount {
  topic: string;
  count: number;
  sentiment: number;
}
