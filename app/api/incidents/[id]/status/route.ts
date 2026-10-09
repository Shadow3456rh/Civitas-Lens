/**
 * PATCH /api/incidents/[id]/status
 *
 * Changes incident status (new -> under_review -> active -> resolved -> archived)
 * and appends an immutable audit event to incident_events.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/src/lib/supabase/admin";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const statusUpdateSchema = z.object({
  status: z.enum(["new", "under_review", "active", "resolved", "archived"]),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  context: RouteParams,
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const validation = statusUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid status value", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { status, note } = validation.data;
    const supabase = getAdminClient();

    // 1. Fetch current incident
    const { data: currentIncident, error: fetchErr } = await supabase
      .from("incidents")
      .select("id, status, title")
      .eq("id", id)
      .single();

    if (fetchErr || !currentIncident) {
      return NextResponse.json(
        { error: "Incident not found", id },
        { status: 404 },
      );
    }

    const oldStatus = currentIncident.status;

    // 2. Update status
    const { error: updateErr } = await supabase
      .from("incidents")
      .update({ status })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to update incident status", details: updateErr.message },
        { status: 500 },
      );
    }

    // 3. Append timeline event
    const auditNote =
      note || `Status transitioned from ${oldStatus.replace(/_/g, " ")} to ${status.replace(/_/g, " ")} by analyst.`;

    await supabase.from("incident_events").insert({
      incident_id: id,
      type: "status_changed",
      note: auditNote,
    });

    return NextResponse.json({
      success: true,
      id,
      oldStatus,
      newStatus: status,
      note: auditNote,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/incidents/[id]/status:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
