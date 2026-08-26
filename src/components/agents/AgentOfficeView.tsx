"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENT_ROSTER } from "@/lib/agents/roster";
import type {
  AgentId,
  AgentWorkflowState,
  PipelineStatus,
} from "@/lib/agents/types";
import {
  DESK_LAYOUT,
  FRAMES,
  JERSEY,
  PIXEL,
  SCENE,
  type PixelFrame,
} from "./sprites";

const AGENTS: AgentId[] = [
  "orchestrator",
  "backend",
  "frontend",
  "tester",
  "security",
];

const SHORT_ROLE: Record<AgentId, string> = {
  orchestrator: "Lead",
  backend: "Backend",
  frontend: "Frontend",
  tester: "QA",
  security: "Security",
};

const SPECIALISTS: AgentId[] = ["backend", "frontend", "tester", "security"];

function deskCenter(id: AgentId): { x: number; y: number } {
  const desk = DESK_LAYOUT[id];
  return { x: desk.x + 8, y: desk.y + 10 };
}

function openTask(id: AgentId, state: AgentWorkflowState | null) {
  if (!state) return undefined;
  const mine = state.task_queue.filter(
    (task) =>
      task.agent === id && (task.status === "pending" || task.status === "running")
  );
  return mine.find((task) => task.status === "running") ?? mine[0];
}

/** True if this desk still has work — queued by the user, waiting, or running now. */
function isAssigned(id: AgentId, state: AgentWorkflowState | null): boolean {
  if (!state) return false;
  if (openTask(id, state)) return true;
  const floorBusy = state.status === "WORKING" || state.status === "VALIDATING";
  if (!floorBusy) return false;
  return state.current_agent === id || state.activeHandoff?.to === id;
}

function idleFrame(nowMs: number, desk: number): PixelFrame {
  const cycle = Math.floor(nowMs / 220) + desk * 5;
  if (cycle % 19 === 0) return "sip";
  return cycle % 2 === 0 ? "idle" : "idle2";
}

function workFrame(nowMs: number, desk: number): PixelFrame {
  const cycle = Math.floor(nowMs / 90) + desk;
  return cycle % 2 === 0 ? "type1" : "type2";
}

function walkFrame(nowMs: number): PixelFrame {
  return Math.floor(nowMs / 110) % 2 === 0 ? "walk1" : "walk2";
}

function floorBusy(state: AgentWorkflowState | null): boolean {
  return state?.status === "WORKING" || state?.status === "VALIDATING";
}

function drawPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) {
  if (!color || color === "transparent") return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function recolor(ch: string, agent: AgentId): string {
  if (ch === "j") return JERSEY[agent].fill;
  if (ch === "d") return JERSEY[agent].dark;
  if (ch === "h" || ch === "H") return AGENT_ROSTER[agent].hair;
  return PIXEL[ch] ?? "transparent";
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  agent: AgentId,
  frame: PixelFrame,
  flip = false
) {
  const rows = FRAMES[frame];
  ctx.save();
  if (flip) {
    ctx.translate(Math.round(ox) + 16, Math.round(oy));
    ctx.scale(-1, 1);
    ox = 0;
    oy = 0;
  } else {
    ox = Math.round(ox);
    oy = Math.round(oy);
  }
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      drawPixel(ctx, ox + x, oy + y, recolor(row[x], agent));
    }
  }
  ctx.restore();
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  monitor: string,
  glow: boolean
) {
  ctx.fillStyle = "#5a3218";
  ctx.fillRect(x - 2, y + 14, 22, 6);
  ctx.fillStyle = "#7a4a22";
  ctx.fillRect(x - 1, y + 13, 20, 2);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 4, y + 4, 12, 10);
  ctx.fillStyle = glow ? monitor : "#243018";
  ctx.fillRect(x + 5, y + 5, 10, 7);
  if (glow) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = monitor;
    ctx.fillRect(x + 4, y + 4, 12, 9);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#2a2018";
  ctx.fillRect(x + 8, y + 12, 4, 2);
}

function drawScene(ctx: CanvasRenderingContext2D, t: number) {
  const { width, height } = SCENE;
  ctx.fillStyle = "#6fa8d4";
  ctx.fillRect(0, 0, width, 78);
  ctx.fillStyle = "#f2d9a0";
  ctx.fillRect(0, 78, width, 12);
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(0, 90, width, height - 90);

  for (let y = 90; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      const odd = ((x + y) / 8) % 2 === 0;
      ctx.fillStyle = odd ? "#b8884c" : "#a07038";
      ctx.fillRect(x, y, 8, 8);
    }
  }

  ctx.fillStyle = "#8ec8ee";
  ctx.fillRect(12, 14, 52, 36);
  ctx.fillStyle = "#3d2a18";
  ctx.fillRect(10, 12, 56, 3);
  ctx.fillRect(10, 12, 3, 40);
  ctx.fillRect(63, 12, 3, 40);
  ctx.fillRect(10, 49, 56, 3);
  ctx.fillRect(37, 12, 2, 40);
  ctx.fillRect(10, 30, 56, 2);
  ctx.fillStyle = "#fff8e8";
  const cloud = Math.floor(t / 80) % 36;
  ctx.fillRect(16 + cloud, 20, 12, 4);
  ctx.fillRect(20 + cloud, 17, 9, 4);
  const cloud2 = (cloud + 18) % 36;
  ctx.fillRect(14 + cloud2, 28, 8, 3);
  ctx.fillRect(16 + cloud2, 26, 6, 3);

  const sway = Math.floor(t / 180) % 2;
  ctx.fillStyle = "#2d6b3a";
  ctx.fillRect(292 + sway, 62, 16, 28);
  ctx.fillStyle = "#5c3a1e";
  ctx.fillRect(298, 86, 4, 8);

  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(248, 18, 28, 22);
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(250, 20, 24, 18);
  ctx.fillStyle = "#f0e8c8";
  const seconds = Math.floor(t / 1000) % 12;
  ctx.fillRect(261, 24, 2, 8);
  ctx.fillRect(261, 29, 4 + (seconds % 6), 2);

  ctx.fillStyle = "#3d2a18";
  ctx.fillRect(0, 86, width, 4);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  pulse: number
) {
  const on = pulse % 20 < 12;
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(x + 5, y - 8, 7, 7);
  ctx.fillStyle = on ? color : "#3a2818";
  ctx.fillRect(x + 6, y - 7, 5, 5);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string
) {
  const label = text.length > 28 ? `${text.slice(0, 26)}…` : text;
  const w = Math.min(140, Math.max(48, label.length * 4 + 10));
  const bx = Math.max(4, Math.min(SCENE.width - w - 4, x - w / 2 + 8));
  const by = Math.max(4, y - 28);
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(bx, by, w, 18);
  ctx.fillStyle = "#fff6d8";
  ctx.fillRect(bx + 1, by + 1, w - 2, 16);
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(x + 6, by + 18, 2, 3);
  ctx.fillRect(x + 4, by + 20, 4, 2);
  ctx.font = "5px monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, bx + 4, by + 11);
}

function drawPacket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  to: AgentId
) {
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(x + 4, y - 2, 8, 6);
  ctx.fillStyle = "#fff8e0";
  ctx.fillRect(x + 5, y - 1, 6, 4);
  ctx.fillStyle = JERSEY[to].fill;
  ctx.fillRect(x + 6, y, 4, 2);
}

function handoffProgress(startedAt: number, nowMs: number, durationMs: number) {
  if (!startedAt) return 0;
  return Math.max(0, Math.min(1, (nowMs - startedAt) / durationMs));
}

function statusTone(status: PipelineStatus): string {
  switch (status) {
    case "WORKING":
      return "#3bc46a";
    case "VALIDATING":
      return "#e28a3b";
    case "COMPLETED":
      return "#5aa0ff";
    case "ERROR":
      return "#e23b3b";
    default:
      return "#c4a06a";
  }
}

export default function AgentOfficeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<AgentWorkflowState | null>(null);
  const [goal, setGoal] = useState("Full floor health check");
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const handoffAnimRef = useRef({ key: "", startedAt: 0 });

  useEffect(() => {
    let stopped = false;
    const apply = (next: AgentWorkflowState) => {
      setState(next);
      setBusy(next.status === "WORKING" || next.status === "VALIDATING");
    };

    const pollOnce = () => {
      fetch("/api/agents/state")
        .then((res) => res.json())
        .then((data) => {
          if (!stopped) apply(data as AgentWorkflowState);
        })
        .catch(() => undefined);
    };

    pollOnce();
    const poll = setInterval(pollOnce, 700);
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/agents/events");
      es.onmessage = (event) => {
        if (stopped) return;
        try {
          apply(JSON.parse(event.data) as AgentWorkflowState);
        } catch {
          /* keep last good snapshot; polling covers bad frames */
        }
      };
    } catch {
      /* polling covers this */
    }

    return () => {
      stopped = true;
      es?.close();
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = (nowMs: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const snapshot = stateRef.current;
      if (ctx && canvas) {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, SCENE.width, SCENE.height);
        drawScene(ctx, nowMs);

        const busyFloor = floorBusy(snapshot);
        const handoff = snapshot?.activeHandoff ?? null;
        const handoffKey = handoff
          ? `${handoff.from}->${handoff.to}:${handoff.packetLabel}`
          : "";
        if (handoffKey !== handoffAnimRef.current.key) {
          handoffAnimRef.current = {
            key: handoffKey,
            startedAt: handoffKey ? nowMs : 0,
          };
        }
        const walkU = handoff
          ? handoffProgress(handoffAnimRef.current.startedAt, nowMs, 1100)
          : 0;
        const walkingId = handoff?.from ?? null;

        for (const id of AGENTS) {
          const desk = DESK_LAYOUT[id];
          const assigned = isAssigned(id, snapshot);
          const running = openTask(id, snapshot)?.status === "running";
          const current = snapshot?.current_agent === id;
          const workingHere =
            busyFloor && assigned && walkingId !== id;
          const glow =
            workingHere &&
            (running || current || Math.floor(nowMs / 140) % 2 === 0);
          drawDesk(ctx, desk.x, desk.y, desk.monitor, Boolean(glow));
        }

        for (const id of AGENTS) {
          if (id === walkingId) continue;
          const desk = DESK_LAYOUT[id];
          const assigned = isAssigned(id, snapshot);
          const current = snapshot?.current_agent === id;
          const workingHere = busyFloor && assigned;
          const bob = workingHere
            ? Math.floor(nowMs / 140) % 2
            : Math.floor(nowMs / 380 + AGENT_ROSTER[id].deskIndex) % 4 === 0
              ? 1
              : 0;
          const sprite = workingHere
            ? workFrame(nowMs, AGENT_ROSTER[id].deskIndex)
            : idleFrame(nowMs, AGENT_ROSTER[id].deskIndex);
          drawSprite(ctx, desk.x, desk.y - bob, id, sprite);
          if (current || (busyFloor && assigned)) {
            drawBadge(ctx, desk.x, desk.y - bob, JERSEY[id].fill, nowMs / 16);
          }
        }

        if (handoff && walkingId) {
          const from = DESK_LAYOUT[handoff.from];
          const to = DESK_LAYOUT[handoff.to];
          const x = from.x + (to.x - from.x) * walkU;
          const y =
            from.y + (to.y - from.y) * walkU - Math.sin(walkU * Math.PI) * 18;
          const flip = to.x < from.x;
          drawSprite(ctx, x, y, walkingId, walkFrame(nowMs), flip);
          drawPacket(
            ctx,
            x,
            y - 10 - Math.sin(walkU * Math.PI) * 10,
            handoff.to
          );
        }

        if (snapshot?.speech) {
          const speaker = snapshot.speech.agent;
          const seated = DESK_LAYOUT[speaker];
          const dest = handoff ? DESK_LAYOUT[handoff.to] : seated;
          const walking = Boolean(handoff && speaker === walkingId);
          const x = walking ? seated.x + (dest.x - seated.x) * walkU : seated.x;
          const y = walking ? seated.y + (dest.y - seated.y) * walkU : seated.y;
          drawBubble(ctx, x, y, snapshot.speech.text);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dispatch = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agents/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) setBusy(false);
    } catch {
      setBusy(false);
    }
  }, [busy, goal]);

  const currentTask = useMemo(() => {
    if (!state) return "Waiting for the floor…";
    const running = state.task_queue.find((task) => task.status === "running");
    return running?.title ?? state.speech?.text ?? "Idle";
  }, [state]);

  return (
    <section
      className="office-root"
      data-testid="agent-office"
      aria-label="Virtual agent office"
    >
      <header className="office-chrome">
        <div>
          <p className="office-kicker">NEKKETSU OPS FLOOR</p>
          <h2>Sabuy Agent Office</h2>
        </div>
        <span
          className="office-status"
          style={{ color: statusTone(state?.status ?? "IDLE") }}
        >
          {state?.status ?? "IDLE"}
        </span>
      </header>

      <div className="office-stage">
        <canvas
          ref={canvasRef}
          width={SCENE.width}
          height={SCENE.height}
          className="office-canvas"
          data-testid="office-canvas"
        />
        <div className="office-scanlines" aria-hidden />
        <svg
          className="office-links"
          viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          {SPECIALISTS.map((id) => {
            const from = deskCenter("orchestrator");
            const to = deskCenter(id);
            const assigned = isAssigned(id, state);
            return (
              <g key={id}>
                <line
                  className="office-link-shadow"
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
                <line
                  className={assigned ? "office-link busy" : "office-link idle"}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              </g>
            );
          })}
        </svg>
        <ul className="office-labels">
          {AGENTS.map((id) => {
            const desk = DESK_LAYOUT[id];
            const agent = AGENT_ROSTER[id];
            const task = openTask(id, state);
            const assigned = isAssigned(id, state);
            return (
              <li
                key={id}
                className={assigned ? "office-label assigned" : "office-label"}
                style={{
                  left: `${((desk.x + 8) / SCENE.width) * 100}%`,
                  top: `${((desk.y + 24) / SCENE.height) * 100}%`,
                  borderColor: assigned ? "#e23b3b" : agent.jersey,
                }}
              >
                <strong>{agent.codename}</strong>
                <small>{SHORT_ROLE[id]}</small>
                {task ? <em className="office-task">{task.title}</em> : null}
                <span
                  className={
                    assigned ? "office-signal busy" : "office-signal idle"
                  }
                  aria-label={
                    assigned
                      ? `Has a task: ${task?.title ?? "assigned"}`
                      : "No task"
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>

      <p className="office-speech" data-testid="office-speech">
        {currentTask}
        <span className="office-blink">█</span>
      </p>

      <form
        className="office-dispatch"
        onSubmit={(event) => {
          event.preventDefault();
          void dispatch();
        }}
      >
        <label className="sr-only" htmlFor="agent-goal">
          Dispatch goal
        </label>
        <input
          id="agent-goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="Dispatch a goal to Kunio…"
          maxLength={180}
        />
        <button type="submit" disabled={busy}>
          {busy ? "WORKING" : "DISPATCH"}
        </button>
      </form>

      <ol className="office-log" data-testid="handoff-log">
        {(state?.handoff_log ?? []).slice(-6).map((entry) => (
          <li key={entry.id}>
            <span>
              {AGENT_ROSTER[entry.from].codename} → {AGENT_ROSTER[entry.to].codename}
            </span>
            <em>{entry.summary}</em>
          </li>
        ))}
      </ol>
    </section>
  );
}
