import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type {
  ActiveHandoff,
  AgentId,
  AgentTask,
  AgentWorkflowState,
  HandoffRecord,
  OfficeSpeech,
  PipelineStatus,
  StateListener,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "agent-state.json");

function nowIso(): string {
  return new Date().toISOString();
}

export function createIdleState(): AgentWorkflowState {
  return {
    current_agent: null,
    task_queue: [],
    handoff_log: [],
    status: "IDLE",
    goal: null,
    speech: {
      agent: "orchestrator",
      text: "Office idle. Dispatch a goal when you're ready.",
      at: nowIso(),
    },
    activeHandoff: null,
    lastError: null,
    runId: null,
    updatedAt: nowIso(),
  };
}

function loadPersisted(): AgentWorkflowState | null {
  try {
    const raw = readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as AgentWorkflowState;
    if (!parsed || typeof parsed.status !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: AgentWorkflowState): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    console.error("[agents] persist failed:", error);
  }
}

type GlobalAgents = typeof globalThis & {
  __sabuyAgentStore?: AgentStore;
};

class AgentStore {
  private state: AgentWorkflowState;
  private listeners = new Set<StateListener>();

  constructor() {
    this.state = loadPersisted() ?? createIdleState();
    if (this.state.status === "WORKING" || this.state.status === "VALIDATING") {
      this.state = {
        ...this.state,
        status: "IDLE",
        current_agent: null,
        activeHandoff: null,
        lastError: "Previous run interrupted (server restart).",
        updatedAt: nowIso(),
      };
      persist(this.state);
    }
  }

  getState(): AgentWorkflowState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commit(patch: Partial<AgentWorkflowState>): AgentWorkflowState {
    this.state = {
      ...this.state,
      ...patch,
      updatedAt: nowIso(),
    };
    persist(this.state);
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error("[agents] listener error:", error);
      }
    }
    return this.state;
  }

  reset(): AgentWorkflowState {
    return this.commit(createIdleState());
  }

  startRun(goal: string, tasks: AgentTask[], runId: string): AgentWorkflowState {
    return this.commit({
      goal,
      runId,
      task_queue: tasks,
      handoff_log: [],
      status: "WORKING",
      current_agent: "orchestrator",
      lastError: null,
      activeHandoff: null,
      speech: {
        agent: "orchestrator",
        text: `Breaking it down — ${tasks.length} tasks on the board.`,
        at: nowIso(),
      },
    });
  }

  setStatus(status: PipelineStatus, current: AgentId | null): AgentWorkflowState {
    return this.commit({ status, current_agent: current });
  }

  speak(agent: AgentId, text: string): AgentWorkflowState {
    const speech: OfficeSpeech = { agent, text, at: nowIso() };
    return this.commit({ speech, current_agent: agent });
  }

  setHandoff(handoff: ActiveHandoff | null): AgentWorkflowState {
    return this.commit({ activeHandoff: handoff });
  }

  updateTask(
    taskId: string,
    patch: Partial<AgentTask>
  ): AgentWorkflowState {
    const task_queue = this.state.task_queue.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task
    );
    return this.commit({ task_queue });
  }

  recordHandoff(record: HandoffRecord): AgentWorkflowState {
    return this.commit({
      handoff_log: [...this.state.handoff_log, record],
    });
  }

  complete(summary: string): AgentWorkflowState {
    return this.commit({
      status: "COMPLETED",
      current_agent: "orchestrator",
      activeHandoff: null,
      speech: {
        agent: "orchestrator",
        text: summary,
        at: nowIso(),
      },
      lastError: null,
    });
  }

  fail(message: string): AgentWorkflowState {
    return this.commit({
      status: "ERROR",
      current_agent: "orchestrator",
      activeHandoff: null,
      lastError: message,
      speech: {
        agent: "orchestrator",
        text: `Pipeline error: ${message}`,
        at: nowIso(),
      },
    });
  }
}

export function getAgentStore(): AgentStore {
  const g = globalThis as GlobalAgents;
  if (!g.__sabuyAgentStore) {
    g.__sabuyAgentStore = new AgentStore();
  }
  return g.__sabuyAgentStore;
}

export function getWorkflowState(): AgentWorkflowState {
  return getAgentStore().getState();
}
