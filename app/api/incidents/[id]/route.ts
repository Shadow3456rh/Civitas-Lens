/**
 * GET /api/incidents/[id]
 *
 * Fetches full incident intelligence record:
 * - Incident metadata & centroid coordinates
 * - Linked observations with signed URLs for private evidence images
 * - Incident events timeline (immutable audit trail)
 * - Link decisions explainability data (AI reasoning & validation metrics)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { extractCoordinates } from "@/src/lib/pipeline/coordinates";

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
        { error: "Invalid incident ID" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // 1. Fetch incident record
    const { data: incident, error: incError } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (incError || !incident) {
      return NextResponse.json(
        { error: "Incident not found", id },
        { status: 404 },
      );
    }

    // Extract incident centroid coordinates
    let incidentLat = 37.7749;
    let incidentLng = -122.4194;
    try {
      if (incident.centroid) {
        const coords = extractCoordinates(incident.centroid);
        incidentLat = coords.lat;
        incidentLng = coords.lng;
      }
    } catch (e) {
      console.warn("Could not extract incident centroid:", e);
    }

    // 2. Fetch linked observations
    const { data: observations, error: obsError } = await supabase
      .from("observations")
      .select("*")
      .eq("incident_id", id)
      .order("observed_at", { ascending: false });

    if (obsError) {
      console.warn("Error fetching observations for incident:", obsError);
    }

    // Generate signed URLs for private evidence images
    const processedObservations = await Promise.all(
      (observations || []).map(async (obs) => {
        let imageSignedUrl: string | null = null;
        if (obs.image_path) {
          try {
            const { data: signedData } = await supabase.storage
              .from("evidence")
              .createSignedUrl(obs.image_path, 3600); // 1 hour validity

            imageSignedUrl = signedData?.signedUrl || null;
          } catch (signErr) {
            console.warn(`Failed to sign URL for ${obs.image_path}:`, signErr);
          }
        }

        let obsLat: number | null = null;
        let obsLng: number | null = null;
        try {
          if (obs.location) {
            const coords = extractCoordinates(obs.location);
            obsLat = coords.lat;
            obsLng = coords.lng;
          }
        } catch {
          // ignore
        }

        const userCat = obs.user_category || obs.ai_raw?.user_category || null;
        const userUrg = obs.user_urgency || obs.ai_raw?.user_urgency || null;
        const refCode = obs.reference_code || obs.ai_raw?.reference_code || null;

        return {
          ...obs,
          reference_code: refCode,
          user_category: userCat,
          user_urgency: userUrg,
          image_signed_url: imageSignedUrl,
          lat: obsLat,
          lng: obsLng,
        };
      }),
    );

    // 3. Fetch incident events timeline
    const { data: events, error: eventsError } = await supabase
      .from("incident_events")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.warn("Error fetching incident events:", eventsError);
    }

    // 4. Fetch link_decisions for linked observations
    const obsIds = (observations || []).map((o) => o.id);
    let linkDecisions: any[] = [];

    if (obsIds.length > 0) {
      const { data: decisions, error: decError } = await supabase
        .from("link_decisions")
        .select("*")
        .in("observation_id", obsIds)
        .order("created_at", { ascending: false });

      if (decError) {
        console.warn("Error fetching link decisions:", decError);
      } else if (decisions) {
        linkDecisions = decisions;
      }
    }

    // Map link decisions by observation_id
    const decisionsByObservation: Record<string, any[]> = {};
    for (const d of linkDecisions) {
      if (!decisionsByObservation[d.observation_id]) {
        decisionsByObservation[d.observation_id] = [];
      }
      decisionsByObservation[d.observation_id].push(d);
    }

    return NextResponse.json({
      incident: {
        ...incident,
        lat: incidentLat,
        lng: incidentLng,
      },
      observations: processedObservations,
      events: events || [],
      linkDecisionsByObservation: decisionsByObservation,
    });
  } catch (err: any) {
    console.error("Error in GET /api/incidents/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
