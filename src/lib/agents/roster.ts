import type { AgentDefinition, AgentId } from "./types";

/**
 * Explicit specialist boundaries. The orchestrator is the only agent that
 * talks to the operator; everyone else receives a typed task and returns a
 * structured report. Crossing `neverTouches` is a pipeline error.
 */
export const AGENT_ROSTER: Record<AgentId, AgentDefinition> = {
  orchestrator: {
    id: "orchestrator",
    codename: "KUNIO",
    title: "Lead Orchestrator",
    jersey: "#e23b3b",
    hair: "#1a1208",
    specialty: "Goal decomposition, handoffs, operator conversation",
    owns: [
      "Breaking a high-level goal into ordered specialist tasks",
      "Handoff log and pipeline status",
      "Direct operator conversation (never delegated)",
    ],
    neverTouches: [
      "Route handler implementations",
      "SQL migrations",
      "Playwright selectors",
      "RLS / locktask policy details",
    ],
    deskIndex: 0,
  },
  backend: {
    id: "backend",
    codename: "RIKI",
    title: "Backend & API Architect",
    jersey: "#3b6fe2",
    hair: "#2a1a0a",
    specialty: "Route Handlers, schemas, Supabase, DPC contracts",
    owns: [
      "src/app/api/** Route Handlers",
      "src/lib/supabase.ts",
      "src/types/mdm.ts",
      "supabase/migrations/**",
      "CamelCase HTTP ↔ snake_case Postgres mapping",
    ],
    neverTouches: [
      "React components / Tailwind / dashboard widgets",
      "Playwright specs",
      "Operator-facing copy except API error strings",
    ],
    deskIndex: 1,
  },
  frontend: {
    id: "frontend",
    codename: "MISAKO",
    title: "Frontend & UI Engineer",
    jersey: "#3bc46a",
    hair: "#4a2010",
    specialty: "App Router pages, Tailwind, dashboard widgets",
    owns: [
      "src/app/**/page.tsx and layouts (non-API)",
      "src/components/**",
      "src/app/globals.css",
      "data-testid contracts used by QA",
    ],
    neverTouches: [
      "Supabase service-role client",
      "SQL / RLS",
      "DPC JSON extras checksum logic",
    ],
    deskIndex: 2,
  },
  tester: {
    id: "tester",
    codename: "GODAI",
    title: "Quality & Browser Tester",
    jersey: "#e28a3b",
    hair: "#1a1208",
    specialty: "Playwright / fetch smoke tests against localhost",
    owns: [
      "e2e/**",
      "playwright.config.ts",
      "scripts/browser-loop.mjs",
      "Console-error and snapshot-diff reports",
    ],
    neverTouches: [
      "Production schema changes",
      "Policy default values",
      "Shipping untested UI",
    ],
    deskIndex: 3,
  },
  security: {
    id: "security",
    codename: "TOSA",
    title: "Security & DPC Policy Auditor",
    jersey: "#7b3be2",
    hair: "#0d0a08",
    specialty: "Locktask, RLS, Safe Boot / ADB, Zero-Touch integrity",
    owns: [
      "Policy fail-open defaults (factory reset, safe boot)",
      "Kiosk mode + kioskPackage invariant",
      "RLS enabled / no anon grants",
      "Service-role key never in client bundles",
      "Zero-Touch extras shape (checksum, component name)",
    ],
    neverTouches: [
      "Visual styling",
      "E2E selector churn",
      "Device heartbeat field mapping",
    ],
    deskIndex: 4,
  },
};

export const SPECIALIST_ORDER: AgentId[] = [
  "backend",
  "frontend",
  "security",
  "tester",
];

export function agentById(id: AgentId): AgentDefinition {
  return AGENT_ROSTER[id];
}
