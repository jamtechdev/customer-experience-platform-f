export interface CustomerJourney {
  id: string;
  name: string;
  description: string;
  productService: string;
  stages: JourneyStage[];
  touchpoints: Touchpoint[];
  painPoints: PainPoint[];
  opportunities: Opportunity[];
  metrics: JourneyMetrics;
  status: JourneyStatus;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface JourneyStage {
  id: string;
  name: string;
  order: number;
  description: string;
  customerGoals: string[];
  customerEmotions: EmotionType[];
  channels: string[];
  touchpointIds: string[];
  metrics: StageMetrics;
}

export interface Touchpoint {
  id: string;
  name: string;
  type: TouchpointType;
  channel: TouchpointChannel;
  stageId: string;
  description: string;
  customerAction: string;
  expectedEmotion: EmotionType;
  actualSentiment: SentimentScore;
  feedbackCount: number;
  satisfactionScore: number;
  painPointIds: string[];
  opportunityIds: string[];
  isWeakLink: boolean;
  priority: number;
}

export enum TouchpointType {
  AWARENESS = 'AWARENESS',
  CONSIDERATION = 'CONSIDERATION',
  ACQUISITION = 'ACQUISITION',
  SERVICE = 'SERVICE',
  LOYALTY = 'LOYALTY',
  ADVOCACY = 'ADVOCACY'
}

export enum TouchpointChannel {
  BRANCH = 'BRANCH',
  ATM = 'ATM',
  MOBILE_APP = 'MOBILE_APP',
  INTERNET_BANKING = 'INTERNET_BANKING',
  CALL_CENTER = 'CALL_CENTER',
  EMAIL = 'EMAIL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  WEBSITE = 'WEBSITE',
  CHATBOT = 'CHATBOT',
  SMS = 'SMS',
  NOTIFICATION = 'NOTIFICATION'
}

export enum EmotionType {
  DELIGHTED = 'DELIGHTED',
  HAPPY = 'HAPPY',
  SATISFIED = 'SATISFIED',
  NEUTRAL = 'NEUTRAL',
  FRUSTRATED = 'FRUSTRATED',
  ANGRY = 'ANGRY',
  DISAPPOINTED = 'DISAPPOINTED'
}

export interface SentimentScore {
  positive: number;
  neutral: number;
  negative: number;
  overall: number;
}

export interface PainPoint {
  id: string;
  title: string;
  description: string;
  severity: PainPointSeverity;
  frequency: number;
  impactScore: number;
  touchpointIds: string[];
  rootCauses: string[];
  relatedFeedbackIds: string[];
  suggestedActions: string[];
  status: PainPointStatus;
}

export enum PainPointSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum PainPointStatus {
  IDENTIFIED = 'IDENTIFIED',
  ANALYZING = 'ANALYZING',
  ACTION_PLANNED = 'ACTION_PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  MONITORING = 'MONITORING'
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  potentialImpact: ImpactLevel;
  effortRequired: EffortLevel;
  touchpointIds: string[];
  suggestedActions: string[];
  expectedOutcome: string;
  estimatedTimeline: string;
  department: string;
  status: OpportunityStatus;
}

export enum OpportunityType {
  QUICK_WIN = 'QUICK_WIN',
  MAJOR_PROJECT = 'MAJOR_PROJECT',
  FILL_IN = 'FILL_IN',
  THANKLESS_TASK = 'THANKLESS_TASK'
}

export enum ImpactLevel {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum EffortLevel {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum OpportunityStatus {
  IDENTIFIED = 'IDENTIFIED',
  VALIDATED = 'VALIDATED',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DEFERRED = 'DEFERRED'
}

export interface StageMetrics {
  nps: number;
  csat: number;
  ces: number;
  feedbackVolume: number;
  sentimentScore: number;
  conversionRate?: number;
  dropOffRate?: number;
}

export interface JourneyMetrics {
  overallNps: number;
  overallCsat: number;
  overallCes: number;
  totalFeedback: number;
  avgSentiment: number;
  weakLinksCount: number;
  painPointsCount: number;
  opportunitiesCount: number;
  lastUpdated: Date;
}

export enum JourneyStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

// Action Plan
export interface ActionPlan {
  id: string;
  journeyId: string;
  title: string;
  description: string;
  objectives: string[];
  department: string;
  owner: string;
  actions: Action[];
  timeline: Timeline;
  budget?: number;
  expectedOutcomes: ExpectedOutcome[];
  status: ActionPlanStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Action {
  id: string;
  title: string;
  description: string;
  assignee: string;
  department: string;
  startDate: Date;
  dueDate: Date;
  completedDate?: Date;
  status: ActionStatus;
  dependencies: string[];
  notes: string;
}

export enum ActionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Timeline {
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  isCompleted: boolean;
}

export interface ExpectedOutcome {
  metric: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}

export enum ActionPlanStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
