import {
  User,
  Lead,
  LeadType,
  Pipeline,
  Stage,
  Activity,
  Task,
  AIInsight,
  Notification,
  AICommand,
  CustomFieldDefinition,
  UserRole,
  LeadStatus,
  LeadPriority,
  TaskStatus,
  TaskType,
  TaskPriority,
  ActivityType,
  AIInsightType,
  AIInsightSeverity,
  AIInsightStatus,
  AICommandStatus,
} from "@prisma/client";

export type {
  User,
  Lead,
  LeadType,
  Pipeline,
  Stage,
  Activity,
  Task,
  AIInsight,
  Notification,
  AICommand,
  CustomFieldDefinition,
  UserRole,
  LeadStatus,
  LeadPriority,
  TaskStatus,
  TaskType,
  TaskPriority,
  ActivityType,
  AIInsightType,
  AIInsightSeverity,
  AIInsightStatus,
  AICommandStatus,
};

export type LeadWithRelations = Lead & {
  leadType: LeadType | null;
  owner: Pick<User, "id" | "name" | "email" | "image"> | null;
  stage: Stage | null;
  pipeline: Pipeline | null;
  _count?: {
    activities: number;
    tasks: number;
  };
};

export type LeadDetail = Lead & {
  leadType: LeadType | null;
  owner: Pick<User, "id" | "name" | "email" | "image"> | null;
  creator: Pick<User, "id" | "name"> | null;
  stage: Stage | null;
  pipeline: Pipeline | null;
  activities: ActivityWithUser[];
  tasks: TaskWithAssignee[];
  aiInsights: AIInsight[];
  customValues: CustomFieldValueWithDef[];
};

export type ActivityWithUser = Activity & {
  user: Pick<User, "id" | "name" | "image"> | null;
};

export type TaskWithAssignee = Task & {
  assignee: Pick<User, "id" | "name" | "image"> | null;
  lead: Pick<Lead, "id" | "displayName"> | null;
};

export type CustomFieldValueWithDef = {
  id: string;
  value: string | null;
  fieldDefinition: CustomFieldDefinition;
};

export interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  openTasks: number;
  overdueTasks: number;
  totalPipelineValue: number;
  closedWonValue: number;
  recentActivities: ActivityWithUser[];
  myTasks: TaskWithAssignee[];
  insights: AIInsight[];
}

export interface AIActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  warnings?: string[];
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface ParsedIntent {
  intent: string;
  confidence: number;
  leadMatch?: {
    leadId: string;
    name: string;
    confidence: number;
  } | null;
  updates?: Record<string, unknown>;
  note?: string;
  task?: {
    title: string;
    type: string;
    dueAt?: string;
    priority?: string;
  };
  requiresConfirmation: boolean;
  userFacingSummary: string;
  proposedActions: ProposedAction[];
}

export interface ProposedAction {
  type: string;
  description: string;
  data: Record<string, unknown>;
  sensitive: boolean;
}

export interface FilterParams {
  search?: string;
  leadTypeId?: string;
  stageId?: string;
  pipelineId?: string;
  ownerId?: string;
  priority?: string;
  status?: string;
  source?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
