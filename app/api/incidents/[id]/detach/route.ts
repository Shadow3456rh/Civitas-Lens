/**
 * POST /api/incidents/[id]/detach
 *
 * Detaches an observation from an incident cluster and moves it into a brand new
 * incident (human correction of a false AI correlation merge).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { maxSeverity } from "@/src/config/matching";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const detachSchema = z.object({
  observation_id: z.string().uuid("Valid observation UUID required"),
});

export async function POST(
  request: NextRequest,
  context: RouteParams,
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const validation = detachSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { observation_id } = validation.data;
    const supabase = getAdminClient();

    // 1. Fetch observation and verify it belongs to this incident
    const { data: observation, error: obsError } = await supabase
      .from("observations")
      .select("*")
      .eq("id", observation_id)
      .single();

    if (obsError || !observation) {
      return NextResponse.json(
        { error: "Observation not found", observation_id },
        { status: 404 },
      );
    }

    if (observation.incident_id !== id) {
      return NextResponse.json(
        { error: "Observation is not linked to this incident", observation_id, expected_incident: id },
        { status: 400 },
      );
    }

    // 2. Create a new incident cluster for the detached observation
    const cleanTitle =
      observation.summary && observation.summary.trim().length > 0
        ? observation.summary.length > 70
          ? `${observation.summary.slice(0, 67)}...`
          : observation.summary
        : `Detached Incident Report (${observation.category || "General"})`;

    const effectiveTime =
      observation.observed_at || observation.captured_at || new Date().toISOString();

    const { data: newIncident, error: createError } = await supabase
      .from("incidents")
      .insert({
        title: cleanTitle,
        category: observation.category || "other",
        severity: observation.severity || "medium",
        status: "new",
        summary: observation.summary || "Independent incident created via analyst detachment.",
        centroid: observation.location,
        first_seen_at: effectiveTime,
        last_seen_at: effectiveTime,
        observation_count: 1,
      })
      .select("id")
      .single();

    if (createError || !newIncident) {
      console.error("Failed to create new incident for detachment:", createError);
      return NextResponse.json(
        { error: "Failed to initialize new incident", details: createError?.message },
        { status: 500 },
      );
    }

    const newIncidentId = newIncident.id;

    // 3. Re-link observation to the new incident
    await supabase
      .from("observations")
      .update({ incident_id: newIncidentId })
      .eq("id", observation_id);

    // 4. Log creation event on the new incident
    await supabase.from("incident_events").insert({
      incident_id: newIncidentId,
      observation_id: observation_id,
      type: "created",
      note: `Created via human analyst correction (detached from incident ${id}).`,
    });

    // 5. Update original incident
    await supabase.from("incident_events").insert({
      incident_id: id,
      observation_id: observation_id,
      type: "observation_added",
      note: `Observation ${observation_id} was detached by an analyst (false merge correction).`,
    });

    // Fetch remaining observations for the original incident
    const { data: remainingObs } = await supabase
      .from("observations")
      .select("id, severity, observed_at, location")
      .eq("incident_id", id);

    const remainingCount = remainingObs ? remainingObs.length : 0;

    if (remainingCount === 0) {
      // No observations left -> archive incident
      await supabase
        .from("incidents")
        .update({
          observation_count: 0,
          status: "archived",
        })
        .eq("id", id);
    } else if (remainingObs) {
      // Recalculate max severity across remaining observations
      let updatedSeverity: any = "low";
      for (const ro of remainingObs) {
        updatedSeverity = maxSeverity(updatedSeverity, ro.severity);
      }

      await supabase
        .from("incidents")
        .update({
          observation_count: remainingCount,
          severity: updatedSeverity,
        })
        .eq("id", id);
    }

    return NextResponse.json({
      success: true,
      original_incident_id: id,
      new_incident_id: newIncidentId,
      detached_observation_id: observation_id,
      remaining_observations: remainingCount,
      message: "Observation successfully detached into a new incident.",
    });
  } catch (err: any) {
    console.error("Error in POST /api/incidents/[id]/detach:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
