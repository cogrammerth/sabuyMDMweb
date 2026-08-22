import { NextResponse } from "next/server";
import { getWorkflowState } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getWorkflowState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
