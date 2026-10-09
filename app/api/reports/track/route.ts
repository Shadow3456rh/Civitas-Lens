/**
 * GET /api/reports/track
 *
 * Public read-only tracking endpoint for citizens.
 * Query: ?code=CL-2026-XXXXXX or ?code=<uuid>
 *
 * Rate-limited (30 requests per minute per IP).
 * Returns public status stepper details only.
 * NEVER leaks reporter_name, reporter_contact, or other citizens' records.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";

// Simple in-memory IP rate limiter: 30 requests per 60s
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 60000 });
    return true;
  }

  if (entry.count >= 30) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "client_ip";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before checking again." },
        { status: 429 },
      );
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code")?.trim();

    if (!code || code.length < 3) {
      return NextResponse.json(
        { error: "Please enter a valid tracking reference code." },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Query by reference_code (case-insensitive) or by ID
    let query = supabase
      .from("observations")
      .select(`
        id,
        reference_code,
        user_category,
        category,
        summary,
        location_label,
        processing_status,
        created_at,
        observed_at,
        incident_id,
        incidents (
          id,
          status,
          title
        )
      `);

    // Check if code matches standard UUID format or reference_code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

    if (isUuid) {
      query = query.eq("id", code);
    } else {
      query = query.ilike("reference_code", code);
    }

    const { data: observation, error } = await query.maybeSingle();

    if (error || !observation) {
      return NextResponse.json(
        {
          error: "No report found matching that reference code. Please check the code and try again.",
        },
        { status: 404 },
      );
    }

    const inc = (observation as any).incidents;
    const incidentStatus = inc?.status || null;

    // Map internal statuses to user-friendly public status stepper
    // Stepper: 'received' | 'under_review' | 'action_in_progress' | 'resolved'
    let publicStage: "received" | "under_review" | "action_in_progress" | "resolved" = "received";

    if (incidentStatus === "resolved" || incidentStatus === "archived") {
      publicStage = "resolved";
    } else if (incidentStatus === "active") {
      publicStage = "action_in_progress";
    } else if (
      incidentStatus === "under_review" ||
      observation.processing_status === "processed" ||
      observation.processing_status === "needs_review"
    ) {
      publicStage = "under_review";
    } else {
      publicStage = "received";
    }

    const stageIndex = ["received", "under_review", "action_in_progress", "resolved"].indexOf(publicStage);

    return NextResponse.json({
      reference_code: observation.reference_code || `CL-${new Date(observation.created_at).getFullYear()}-${observation.id.slice(0, 6).toUpperCase()}`,
      category: observation.user_category || observation.category || "General civic report",
      summary: observation.summary || "Report received and queued for response triage.",
      location_label: observation.location_label || "Location recorded on city map",
      submitted_at: observation.created_at,
      processing_status: observation.processing_status,
      public_stage: publicStage,
      stage_index: stageIndex >= 0 ? stageIndex : 0,
      current_step_index: stageIndex >= 0 ? stageIndex : 0,
      incident_linked: !!observation.incident_id,
      incident_public_status: incidentStatus ? incidentStatus.replace(/_/g, " ").toUpperCase() : null,
    });
  } catch (err: any) {
    console.error("Tracking endpoint error:", err);
    return NextResponse.json(
      { error: "Unable to retrieve report tracking status." },
      { status: 500 },
    );
  }
}
