import type { AgentId, AgentTask } from "./types";
import { SPECIALIST_ORDER } from "./roster";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface DecomposedGoal {
  summary: string;
  tasks: AgentTask[];
}

const KEYWORD_AGENTS: Array<{ pattern: RegExp; agents: AgentId[] }> = [
  {
    pattern: /\b(api|route|schema|supabase|heartbeat|policy sync|dpc contract)\b/i,
    agents: ["backend", "security", "tester"],
  },
  {
    pattern: /\b(ui|dashboard|tailwind|widget|office|page|component)\b/i,
    agents: ["frontend", "tester"],
  },
  {
    pattern: /\b(qr|zero-?touch|provision)\b/i,
    agents: ["frontend", "security", "tester"],
  },
  {
    pattern: /\b(locktask|kiosk|rls|safe.?boot|adb|usb debug|factory reset)\b/i,
    agents: ["backend", "security", "tester"],
  },
  {
    pattern: /\b(map|geo|leaflet|location_logs|healthcheck|phase 4)\b/i,
    agents: ["backend", "frontend", "security", "tester"],
  },
  {
    pattern: /\b(production readiness|app.?version|device.?name|fleet control|app_versions|apk|releases?|dpc-releases|storage)\b/i,
    agents: ["backend", "frontend", "security", "tester"],
  },
  {
    pattern: /\b(test|playwright|e2e|browser)\b/i,
    agents: ["tester"],
  },
  {
    pattern: /\b(i18n|locale|bilingual|translation|ภาษา)\b/i,
    agents: ["frontend", "tester"],
  },
];

const TASK_TEMPLATES: Record<Exclude<AgentId, "orchestrator">, (goal: string) => Pick<AgentTask, "title" | "description">> = {
  backend: (goal) => ({
    title: "Inspect API & DPC contracts",
    description: `Verify Route Handlers, schema mapping, and heartbeat/policy/version contracts for: ${goal}`,
  }),
  frontend: (goal) => ({
    title: "Inspect admin UI surfaces",
    description: `Confirm device table, policy toggles, QR generator, and office widget render for: ${goal}`,
  }),
  security: (goal) => ({
    title: "Audit locktask / RLS / bypass posture",
    description: `Check fail-open policy defaults, kiosk invariant, RLS, and service-role exposure for: ${goal}`,
  }),
  tester: (goal) => ({
    title: "Run localhost browser & API loop",
    description: `Hit http://localhost:3000, capture console errors, and validate UI testids for: ${goal}`,
  }),
};

function uniqueAgents(ids: AgentId[]): AgentId[] {
  const seen = new Set<AgentId>();
  const out: AgentId[] = [];
  for (const id of ids) {
    if (id === "orchestrator") continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.sort(
    (a, b) => SPECIALIST_ORDER.indexOf(a) - SPECIALIST_ORDER.indexOf(b)
  );
}

/**
 * Lead Orchestrator: deterministic decomposition so specialists never invent
 * scope. Unknown goals run the full four-desk loop.
 */
export function decomposeGoal(goal: string): DecomposedGoal {
  const trimmed = goal.trim() || "Full floor health check";
  const matched: AgentId[] = [];
  const wantsFullFloor = /\b(full|health check|all desks|all agents)\b/i.test(trimmed);

  if (!wantsFullFloor) {
    for (const rule of KEYWORD_AGENTS) {
      if (rule.pattern.test(trimmed)) {
        matched.push(...rule.agents);
      }
    }
  }

  const agents = uniqueAgents(
    wantsFullFloor || matched.length === 0 ? [...SPECIALIST_ORDER] : matched
  );

  const tasks: AgentTask[] = [
    {
      id: uid("task"),
      agent: "orchestrator",
      title: "Brief the floor",
      description: `Operator goal: ${trimmed}`,
      status: "pending",
      createdAt: nowIso(),
    },
    ...agents.map((agent) => {
      const template = TASK_TEMPLATES[agent as Exclude<AgentId, "orchestrator">];
      return {
        id: uid("task"),
        agent,
        ...template(trimmed),
        status: "pending" as const,
        createdAt: nowIso(),
      };
    }),
    {
      id: uid("task"),
      agent: "orchestrator",
      title: "Sign off",
      description: "Collect validation reports and mark the phase complete or error.",
      status: "pending",
      createdAt: nowIso(),
    },
  ];

  return {
    summary: `Queued ${agents.length} specialists after intake.`,
    tasks,
  };
}

export function nextPending(tasks: AgentTask[]): AgentTask | undefined {
  return tasks.find((task) => task.status === "pending");
}
