export type ApplicationStage =
  | "not-started"
  | "researching"
  | "preparing"
  | "ready"
  | "submitted"
  | "interview"
  | "offer"
  | "accepted"
  | "rejected"
  | "expired"
  | "withdrawn";

export type TaskStatus = "not-started" | "in-progress" | "completed" | "blocked" | "not-applicable";

export interface ApplicationTask {
  id: string;
  title: string;
  group: string;
  required: boolean;
  status: TaskStatus;
  sourceEvidence?: string | null;
  evidenceUrl?: string | null;
  notes?: string | null;
}

export interface Application {
  id: string;
  sourceRow?: number;
  sourcePriority?: number | string | null;
  priority?: "P1" | "P2" | "P3" | null;
  opportunity: string;
  institution: string;
  location?: string | null;
  researchAreas: string[];
  fitScore?: number | null;
  funding?: string | null;
  deadline?: string | null;
  deadlineText?: string | null;
  sourceStatus?: string | null;
  international?: boolean | string | null;
  keyNotes?: string | null;
  sourceVerification?: string | null;
  officialUrl?: string | null;
  stage: ApplicationStage;
  applicationDate?: string | null;
  finalStatus?: string | null;
  notes?: string | null;
  tasks: ApplicationTask[];
  createdAt: string;
  updatedAt: string;
  source?: Record<string, unknown>;
  isCustom?: boolean;
}

export interface TreeNodeRecord {
  id: string;
  title: string;
  type?: string | null;
  parentId?: string | null;
  priority?: "P1" | "P2" | "P3" | null;
  sourcePriority?: string | number | null;
  status: TaskStatus;
  meaning?: string | null;
  preparation?: string | null;
  done?: string | null;
  notes?: string | null;
  source?: Record<string, unknown>;
}

export interface CoreAsset {
  id: string;
  name: string;
  format?: string | null;
  masterLocation?: string | null;
  status: "not-started" | "in-progress" | "ready" | "blocked" | "not-applicable";
  lastUpdated?: string | null;
  usedFor?: string | null;
  notes?: string | null;
}

export interface ApplicationOverride {
  stage?: ApplicationStage;
  applicationDate?: string | null;
  finalStatus?: string | null;
  notes?: string | null;
  fields?: Partial<Omit<Application, "id" | "tasks" | "createdAt" | "updatedAt">>;
  taskStates?: Record<string, TaskStatus>;
  taskNotes?: Record<string, string | null>;
  taskEvidence?: Record<string, string | null>;
  taskRequired?: Record<string, boolean>;
  updatedAt?: string;
}

export interface TreeOverride {
  status?: TaskStatus;
  notes?: string | null;
  updatedAt?: string;
}

export interface LocalState {
  applicationOverrides: Record<string, ApplicationOverride>;
  customApplications: Application[];
  treeOverrides: Record<string, TreeOverride>;
  expandedTreeNodes: Record<string, boolean>;
  lastReferenceData?: ReferenceData;
  updatedAt?: string;
}

export interface ReferenceData {
  applications: Application[];
  applicationTemplate: ApplicationTask[];
  tree: TreeNodeRecord[];
  coreAssets: CoreAsset[];
}

// ===== Trakker OS (V2) =====

export type Mode = "work" | "personal";

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  mode: Mode;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: TaskPriority;
  completed: boolean;
  notes?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  notes?: string | null;
  mode: Mode;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Routine {
  id: string;
  title: string;
  mode: Mode;
  daysOfWeek: number[];
  startTime: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface WorkoutItem {
  id: string;
  title: string;
  startTime: string; // HH:MM
  durationMinutes: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface WorkoutSettings {
  enabled: boolean;
  startTime: string;
  updatedAt?: string;
}

export interface ActiveWorkout {
  workoutId: string;
  workoutTitle: string;
  startedAt: number; // Date.now() timestamp
  durationSeconds: number; // 60
}

export interface Goal {
  id: string;
  title: string;
  horizon: "week" | "month" | "term";
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  done: boolean;
}

export interface TrakkerOsState {
  version: 2;
  mode: Mode;
  tasks: Task[];
  meetings: Meeting[];
  routines: Routine[];
  routineCompletions: Record<string, string>;
  workout: WorkoutSettings;
  workouts: WorkoutItem[];
  goals: Goal[];
  theme?: string;
  updatedAt?: string;
}

// ===== Quick Ideas (Personal mode only) =====

export type QuickIdeaStatus = "open" | "completed" | "archived";

export interface QuickIdea {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  status: QuickIdeaStatus;
}

