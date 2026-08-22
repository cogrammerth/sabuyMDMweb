export type AgentId =
  | "orchestrator"
  | "backend"
  | "frontend"
  | "tester"
  | "security";

export type PipelineStatus =
  | "IDLE"
  | "WORKING"
  | "VALIDATING"
  | "COMPLETED"
  | "ERROR";

export type TaskStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface AgentDefinition {
  id: AgentId;
  codename: string;
  title: string;
  jersey: string;
  hair: string;
  specialty: string;
  owns: string[];
  neverTouches: string[];
  deskIndex: number;
}

export interface AgentTask {
  id: string;
  agent: AgentId;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: TaskResult;
}

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface TaskResult {
  summary: string;
  checks: CheckResult[];
  consoleErrors?: string[];
  snapshotDiffs?: string[];
  artifacts?: Record<string, unknown>;
}

export interface HandoffRecord {
  id: string;
  from: AgentId;
  to: AgentId;
  taskId: string;
  summary: string;
  validation?: TaskResult;
  at: string;
}

export interface OfficeSpeech {
  agent: AgentId;
  text: string;
  at: string;
}

export interface ActiveHandoff {
  from: AgentId;
  to: AgentId;
  packetLabel: string;
}

export interface AgentWorkflowState {
  current_agent: AgentId | null;
  task_queue: AgentTask[];
  handoff_log: HandoffRecord[];
  status: PipelineStatus;
  goal: string | null;
  speech: OfficeSpeech | null;
  activeHandoff: ActiveHandoff | null;
  lastError: string | null;
  runId: string | null;
  updatedAt: string;
}

export type StateListener = (state: AgentWorkflowState) => void;
