export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  priority: RecommendationPriority;
  category: string;
  department: string;
  impactArea: ImpactArea;
  expectedBenefit: string;
  effortLevel: EffortLevel;
  relatedFeedbackIds: string[];
  relatedPainPointIds: string[];
  suggestedActions: SuggestedAction[];
  status: RecommendationStatus;
  implementedAt?: Date;
  feedback?: RecommendationFeedback;
  createdAt: Date;
}

export enum RecommendationType {
  PROCESS_IMPROVEMENT = 'PROCESS_IMPROVEMENT',
  PRODUCT_ENHANCEMENT = 'PRODUCT_ENHANCEMENT',
  SERVICE_UPGRADE = 'SERVICE_UPGRADE',
  TRAINING_NEED = 'TRAINING_NEED',
  POLICY_CHANGE = 'POLICY_CHANGE',
  TECHNOLOGY_UPDATE = 'TECHNOLOGY_UPDATE',
  COMMUNICATION_IMPROVEMENT = 'COMMUNICATION_IMPROVEMENT',
  QUICK_WIN = 'QUICK_WIN'
}

export enum RecommendationPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ImpactArea {
  CUSTOMER_SATISFACTION = 'CUSTOMER_SATISFACTION',
  OPERATIONAL_EFFICIENCY = 'OPERATIONAL_EFFICIENCY',
  REVENUE = 'REVENUE',
  COST_REDUCTION = 'COST_REDUCTION',
  BRAND_REPUTATION = 'BRAND_REPUTATION',
  EMPLOYEE_SATISFACTION = 'EMPLOYEE_SATISFACTION'
}

export enum EffortLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export interface SuggestedAction {
  id: string;
  action: string;
  owner: string;
  timeline: string;
  resources: string;
}

export enum RecommendationStatus {
  NEW = 'NEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  REJECTED = 'REJECTED',
  DEFERRED = 'DEFERRED'
}

export interface RecommendationFeedback {
  isHelpful: boolean;
  rating: number;
  comment?: string;
  submittedBy: string;
  submittedAt: Date;
}

// Root Cause Analysis
export interface RootCauseAnalysis {
  id: string;
  title: string;
  description: string;
  feedbackIds: string[];
  category: string;
  rootCauses: IdentifiedRootCause[];
  contributingFactors: ContributingFactor[];
  timeline: RCATimeline[];
  recommendations: string[];
  analysisMethod: AnalysisMethod;
  confidence: number;
  status: RCAStatus;
  severity: RootCauseSeverity;
  impactedFeedbackCount: number;
  resolutionStatus?: ResolutionStatus;
  occurrenceCount?: number;
  affectedAreas?: string[];
  keywords?: string[];
  sampleFeedbacks?: SampleFeedback[];
  suggestedSolutions?: SuggestedSolution[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SampleFeedback {
  id: string;
  content: string;
  sentiment: string;
  date: Date;
}

export interface SuggestedSolution {
  id: string;
  title: string;
  description: string;
  effort: string;
  impact: string;
}

export enum RootCauseSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ResolutionStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DEFERRED = 'DEFERRED'
}

export interface IdentifiedRootCause {
  id: string;
  cause: string;
  description: string;
  category: RootCauseCategory;
  frequency: number;
  impact: number;
  confidence: number;
  evidence: string[];
  isVerified: boolean;
}

export enum RootCauseCategory {
  PEOPLE = 'PEOPLE',
  PROCESS = 'PROCESS',
  TECHNOLOGY = 'TECHNOLOGY',
  POLICY = 'POLICY',
  ENVIRONMENT = 'ENVIRONMENT',
  COMMUNICATION = 'COMMUNICATION'
}

export interface ContributingFactor {
  factor: string;
  weight: number;
  category: string;
}

export interface RCATimeline {
  date: Date;
  event: string;
  impact: string;
}

export enum AnalysisMethod {
  FIVE_WHYS = 'FIVE_WHYS',
  FISHBONE = 'FISHBONE',
  PARETO = 'PARETO',
  AI_POWERED = 'AI_POWERED',
  HYBRID = 'HYBRID'
}

export enum RCAStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED'
}

// Sentiment Analysis
export interface SentimentAnalysisResult {
  id: string;
  feedbackId: string;
  overallSentiment: SentimentType;
  sentimentScore: number;
  emotions: EmotionScore[];
  aspects: AspectSentiment[];
  keywords: KeywordSentiment[];
  entities: EntityMention[];
  language: string;
  confidence: number;
  processedAt: Date;
}

export enum SentimentType {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  MIXED = 'MIXED'
}

export interface EmotionScore {
  emotion: string;
  score: number;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentType;
  score: number;
  mentions: number;
}

export interface KeywordSentiment {
  keyword: string;
  sentiment: SentimentType;
  frequency: number;
}

export interface EntityMention {
  entity: string;
  type: EntityType;
  sentiment: SentimentType;
  count: number;
}

export enum EntityType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  PERSON = 'PERSON',
  LOCATION = 'LOCATION',
  ORGANIZATION = 'ORGANIZATION',
  FEATURE = 'FEATURE'
}
