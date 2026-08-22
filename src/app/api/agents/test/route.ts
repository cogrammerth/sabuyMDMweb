import { NextResponse } from "next/server";
import { getAgentStore, isPipelineBusy } from "@/lib/agents";
import { runBrowserTester } from "@/lib/agents/specialists/tester";

export const dynamic = "force-dynamic";

/**
 * Manual QA trigger. Prefer dispatching a goal through the orchestrator;
 * this endpoint exists so the Lead can re-run the browser loop in isolation.
 */
export async function POST() {
  if (isPipelineBusy()) {
    return NextResponse.json(
      { success: false, error: "Pipeline is already running" },
      { status: 409 }
    );
  }

  const store = getAgentStore();
  store.setStatus("VALIDATING", "tester");
  store.speak("tester", "Manual browser loop — checking localhost:3000");

  try {
    const result = await runBrowserTester("manual QA loop");
    const failed = result.checks.some((item) => !item.ok);
    if (failed) {
      store.fail(result.summary);
    } else {
      store.complete(result.summary);
    }
    return NextResponse.json({ success: !failed, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QA loop failed";
    store.fail(message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
