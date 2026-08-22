import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_POLICY, toPolicyInsert, toPolicyResponse } from "@/lib/policies";
import type { Policy, PolicyResponse } from "@/types/mdm";

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existingPolicy, error: fetchError } = await supabase
      .from("policies")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (fetchError) {
      console.error("[policy] fetch failed:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch policy" },
        { status: 500 }
      );
    }

    if (existingPolicy) {
      return NextResponse.json(toPolicyResponse(existingPolicy as Policy), {
        status: 200,
      });
    }

    const { data: createdPolicy, error: createError } = await supabase
      .from("policies")
      .insert(toPolicyInsert(deviceId, DEFAULT_POLICY))
      .select("*")
      .maybeSingle();

    if (createError) {
      // Race: another request may have inserted the same device_id.
      if (createError.code === "23505") {
        const { data: racedPolicy, error: retryError } = await supabase
          .from("policies")
          .select("*")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (retryError || !racedPolicy) {
          console.error("[policy] race retry failed:", retryError);
          return NextResponse.json(DEFAULT_POLICY, { status: 200 });
        }

        return NextResponse.json(toPolicyResponse(racedPolicy as Policy), {
          status: 200,
        });
      }

      console.error("[policy] auto-create failed:", createError);
      // Still return defaults so the device can continue operating.
      return NextResponse.json(DEFAULT_POLICY satisfies PolicyResponse, {
        status: 200,
      });
    }

    if (createdPolicy) {
      return NextResponse.json(toPolicyResponse(createdPolicy as Policy), {
        status: 200,
      });
    }

    return NextResponse.json(DEFAULT_POLICY, { status: 200 });
  } catch (error) {
    console.error("[policy] unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
