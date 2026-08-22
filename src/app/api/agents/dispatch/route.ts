import { NextRequest, NextResponse } from "next/server";
import { dispatchGoal, isPipelineBusy } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { goal?: unknown };
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (!goal) {
      return NextResponse.json(
        { success: false, error: "goal is required" },
        { status: 400 }
      );
    }
    if (isPipelineBusy()) {
      return NextResponse.json(
        { success: false, error: "Pipeline is already running" },
        { status: 409 }
      );
    }
    const state = dispatchGoal(goal);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dispatch failed",
      },
      { status: 500 }
    );
  }
}
