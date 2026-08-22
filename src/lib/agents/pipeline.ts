import { randomUUID } from "crypto";
import { decomposeGoal } from "./orchestrator";
import { getAgentStore } from "./state";
import { runBackendArchitect } from "./specialists/backend";
import { runFrontendEngineer } from "./specialists/frontend";
import { runSecurityAuditor } from "./specialists/security";
import { runBrowserTester } from "./specialists/tester";
import type {
  AgentId,
  AgentTask,
  AgentWorkflowState,
  HandoffRecord,
  TaskResult,
} from "./types";

const running = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function executeSpecialist(
  agent: AgentId,
  goal: string
): Promise<TaskResult> {
  switch (agent) {
    case "backend":
      return runBackendArchitect(goal);
    case "frontend":
      return runFrontendEngineer(goal);
    case "security":
      return runSecurityAuditor(goal);
    case "tester":
      return runBrowserTester(goal);
    case "orchestrator":
      return {
        summary: "Lead desk coordinating.",
        checks: [{ name: "intake", ok: true, detail: goal }],
      };
    default: {
      const _exhaustive: never = agent;
      return _exhaustive;
    }
  }
}

async function handoff(
  from: AgentId,
  to: AgentId,
  task: AgentTask,
  validation?: TaskResult
): Promise<void> {
  const store = getAgentStore();
  store.setHandoff({
    from,
    to,
    packetLabel: task.title,
  });
  store.speak(from, `Packet → ${to}: ${task.title}`);
  await sleep(900);
  const record: HandoffRecord = {
    id: uid("handoff"),
    from,
    to,
    taskId: task.id,
    summary: validation?.summary ?? task.title,
    validation,
    at: new Date().toISOString(),
  };
  store.recordHandoff(record);
  store.setHandoff(null);
}

export function isPipelineBusy(): boolean {
  const status = getAgentStore().getState().status;
  return status === "WORKING" || status === "VALIDATING";
}

/**
 * Lead Orchestrator entry point. Returns immediately after queueing;
 * specialists run on the floor so the operator conversation stays on this desk.
 */
export function dispatchGoal(goal: string): AgentWorkflowState {
  const store = getAgentStore();
  if (isPipelineBusy()) {
    throw new Error("Floor is already working. Wait for COMPLETED or ERROR.");
  }

  const { tasks } = decomposeGoal(goal);
  const runId = randomUUID();
  const state = store.startRun(goal.trim() || "Full office health check", tasks, runId);

  void runPipeline(runId).catch((error) => {
    store.fail(error instanceof Error ? error.message : "Unknown pipeline failure");
  });

  return state;
}

async function runPipeline(runId: string): Promise<void> {
  if (running.has(runId)) return;
  running.add(runId);

  const store = getAgentStore();
  try {
    let previous: AgentId = "orchestrator";
    const started = Date.now();

    while (true) {
      const snapshot = store.getState();
      if (snapshot.runId !== runId) return;

      const next = snapshot.task_queue.find((task) => task.status === "pending");
      if (!next) break;

      if (next.agent === "tester") {
        store.setStatus("VALIDATING", "tester");
      } else {
        store.setStatus("WORKING", next.agent);
      }

      if (previous !== next.agent) {
        await handoff(previous, next.agent, next);
      }

      store.updateTask(next.id, {
        status: "running",
        startedAt: new Date().toISOString(),
      });
      store.speak(next.agent, next.title);

      const goal = snapshot.goal ?? "";
      const result = await executeSpecialist(next.agent, goal);
      const failed = result.checks.some((item) => !item.ok);

      store.updateTask(next.id, {
        status: failed && next.agent !== "orchestrator" ? "failed" : "done",
        completedAt: new Date().toISOString(),
        result,
      });

      previous = next.agent;
      await sleep(350);
    }

    const final = store.getState();
    const specialistFails = final.task_queue.filter(
      (task) => task.agent !== "orchestrator" && task.status === "failed"
    );
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    if (specialistFails.length > 0) {
      store.fail(
        `${specialistFails.length} specialist report(s) need a fix before sign-off.`
      );
      return;
    }

    store.complete(`Floor signed off in ${elapsed}s. All desks green.`);
  } finally {
    running.delete(runId);
  }
}
