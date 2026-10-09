/**
 * GET /api/observations/[id]
 *
 * Polling endpoint for observation processing status:
 * Returns current processing_status ('pending', 'processed', 'needs_review', 'failed'),
 * reference_code, user complaint details, capture metadata, and linked incident details once processing completes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteParams,
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid observation ID" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    const { data: observation, error } = await supabase
      .from("observations")
      .select(`
        *,
        incidents (
          id,
          title,
          status,
          severity,
          summary,
          observation_count
        )
      `)
      .eq("id", id)
      .single();

    if (error || !observation) {
      return NextResponse.json(
        {
          error: "Observation not found",
          id,
        },
        { status: 404 },
      );
    }

    const fallbackRef = `CL-${new Date(observation.created_at).getFullYear()}-${observation.id.slice(0, 6).toUpperCase()}`;

    return NextResponse.json({
      id: observation.id,
      reference_code: observation.reference_code || fallbackRef,
      status: observation.processing_status,
      incident_id: observation.incident_id,
      user_category: observation.user_category || null,
      user_urgency: observation.user_urgency || null,
      category: observation.category,
      severity: observation.severity,
      summary: observation.summary,
      location_label: observation.location_label,
      location_context: observation.location_context,
      key_entities: observation.key_entities,
      raw_text: observation.raw_text,
      image_path: observation.image_path,
      location_accuracy_m: observation.location_accuracy_m,
      capture_source: observation.capture_source,
      location_source: observation.location_source,
      captured_at: observation.captured_at,
      observed_at: observation.observed_at,
      created_at: observation.created_at,
      incident: observation.incidents,
    });
  } catch (err: any) {
    console.error("Error in GET /api/observations/[id]:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
