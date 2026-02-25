export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  assignedBy: string;
  assignee?: { id: string; name: string; avatar?: string };
  department: string;
  category?: string;
  relatedFeedbackIds: string[];
  relatedFeedbackCount?: number;
  relatedFeedbacks?: Array<{ id: string; content: string; sentiment: string }>;
  activityLog?: Array<{ timestamp: Date; action: string; user: string }>;
  dueDate: Date;
  completedAt?: Date;
  makerCheckerId?: string;
  notes: TaskNote[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskType {
  FEEDBACK_REVIEW = 'FEEDBACK_REVIEW',
  ROOT_CAUSE_ANALYSIS = 'ROOT_CAUSE_ANALYSIS',
  CUSTOMER_RESPONSE = 'CUSTOMER_RESPONSE',
  IMPROVEMENT_ACTION = 'IMPROVEMENT_ACTION',
  ALARM_RESPONSE = 'ALARM_RESPONSE',
  REPORT_GENERATION = 'REPORT_GENERATION'
}

export enum TaskPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface TaskNote {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

export interface Alarm {
  id: string;
  type: AlarmType;
  severity: AlarmSeverity;
  title: string;
  description: string;
  message?: string;
  source?: string;
  triggerCondition: string;
  threshold: number | { value: number; unit: string };
  currentValue: number;
  status: AlarmStatus;
  relatedFeedbackIds: string[];
  assignedTaskId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  triggeredAt?: Date;
  createdAt: Date;
}

export enum AlarmType {
  SENTIMENT_DROP = 'SENTIMENT_DROP',
  VOLUME_SPIKE = 'VOLUME_SPIKE',
  NEGATIVE_TREND = 'NEGATIVE_TREND',
  CRITICAL_FEEDBACK = 'CRITICAL_FEEDBACK',
  SLA_BREACH = 'SLA_BREACH',
  KPI_THRESHOLD = 'KPI_THRESHOLD',
  COMPETITOR_MENTION = 'COMPETITOR_MENTION'
}

export enum AlarmSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum AlarmStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

// Maker-Checker Workflow
export interface MakerCheckerRecord {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: MakerCheckerAction;
  makerId: string;
  makerName: string;
  makerAction: Date;
  checkerId?: string;
  checkerName?: string;
  checkerAction?: Date;
  status: MakerCheckerStatus;
  originalData?: any;
  changedData?: any;
  comments?: string;
  rejectionReason?: string;
}

export enum EntityType {
  FEEDBACK = 'FEEDBACK',
  TASK = 'TASK',
  ALARM = 'ALARM',
  USER = 'USER',
  REPORT = 'REPORT',
  SETTING = 'SETTING'
}

export enum MakerCheckerAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT'
}

export enum MakerCheckerStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}
