# Agent desks (Sabuy MDM)

The operator talks to the **Lead Orchestrator** only. Specialists return structured reports; they do not hijack the conversation.

| Agent | Runtime | Cursor rule |
| --- | --- | --- |
| Lead Orchestrator (Kunio) | `src/lib/agents/orchestrator.ts` + `pipeline.ts` | `.cursor/rules/00-lead-orchestrator.mdc` |
| Backend & API (Riki) | `src/lib/agents/specialists/backend.ts` | `.cursor/rules/backend-architect.mdc` |
| Frontend & UI (Misako) | `src/lib/agents/specialists/frontend.ts` | `.cursor/rules/frontend-ui.mdc` |
| QA / Browser (Godai) | `src/lib/agents/specialists/tester.ts` | `.cursor/rules/qa-tester.mdc` |
| Security / DPC (Tosa) | `src/lib/agents/specialists/security.ts` | `.cursor/rules/security-auditor.mdc` |

State machine: `src/lib/agents/state.ts`  
Visualizer: `/admin` → `AgentOfficeView`  
Browser loop: `scripts/browser-loop.mjs` + `e2e/`
