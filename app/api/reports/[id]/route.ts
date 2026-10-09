/**
 * GET & PATCH /api/reports/[id]
 *
 * Staff endpoints for viewing and managing individual observations:
 * - GET: Full detail with signed image, coordinates, link decisions, and contact details
 * - PATCH: Link to incident, detach, change processing status, or reprocess
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { extractCoordinates } from "@/src/lib/pipeline/coordinates";
import { processObservation } from "@/src/lib/pipeline";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const supabase = getAdminClient();

    const { data: observation, error } = await supabase
      .from("observations")
      .select(`
        *,
        incidents (
          id,
          title,
          category,
          severity,
          status,
          summary,
          observation_count
        )
      `)
      .eq("id", id)
      .single();

    if (error || !observation) {
      return NextResponse.json(
        { error: "Report not found", id },
        { status: 404 },
      );
    }

    // Extract lat/lng
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      if (observation.location) {
        const coords = extractCoordinates(observation.location);
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch {
      // ignore
    }

    // Signed URL for image
    let imageSignedUrl: string | null = null;
    if (observation.image_path) {
      try {
        const { data: signed } = await supabase.storage
          .from("evidence")
          .createSignedUrl(observation.image_path, 3600);
        imageSignedUrl = signed?.signedUrl || null;
      } catch (e) {
        // ignore
      }
    }

    // Fetch link_decisions for explainability audit
    const { data: linkDecisions } = await supabase
      .from("link_decisions")
      .select("*")
      .eq("observation_id", id)
      .order("created_at", { ascending: false });

    const fallbackRef = `CL-${new Date(observation.created_at).getFullYear()}-${observation.id.slice(0, 6).toUpperCase()}`;

    return NextResponse.json({
      ...observation,
      reference_code: observation.reference_code || fallbackRef,
      lat,
      lng,
      image_signed_url: imageSignedUrl,
      link_decisions: linkDecisions || [],
      incident: observation.incidents,
    });
  } catch (err: any) {
    console.error("GET /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, incident_id } = body;

    const supabase = getAdminClient();

    // Verify observation exists
    const { data: observation, error: fetchErr } = await supabase
      .from("observations")
      .select("id, incident_id, processing_status")
      .eq("id", id)
      .single();

    if (fetchErr || !observation) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (action === "link") {
      if (!incident_id) {
        return NextResponse.json({ error: "Missing incident_id to link" }, { status: 400 });
      }

      await supabase
        .from("observations")
        .update({ incident_id, processing_status: "processed" })
        .eq("id", id);

      await supabase.from("incident_events").insert({
        incident_id,
        observation_id: id,
        type: "observation_added",
        note: "Observation manually linked to incident by staff analyst.",
      });

      return NextResponse.json({ success: true, message: "Report linked to incident successfully." });
    }

    if (action === "detach") {
      const oldIncidentId = observation.incident_id;
      if (oldIncidentId) {
        await supabase
          .from("observations")
          .update({ incident_id: null })
          .eq("id", id);

        await supabase.from("incident_events").insert({
          incident_id: oldIncidentId,
          observation_id: id,
          type: "status_changed",
          note: "Observation manually detached from incident by staff analyst.",
        });
      }

      return NextResponse.json({ success: true, message: "Report detached from incident." });
    }

    if (action === "mark_reviewed") {
      await supabase
        .from("observations")
        .update({ processing_status: "processed" })
        .eq("id", id);

      return NextResponse.json({ success: true, message: "Report marked as reviewed." });
    }

    if (action === "mark_needs_review") {
      await supabase
        .from("observations")
        .update({ processing_status: "needs_review" })
        .eq("id", id);

      return NextResponse.json({ success: true, message: "Report flagged for review." });
    }

    if (action === "reprocess") {
      const result = await processObservation(id);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message },
      { status: 500 },
    );
  }
}
