/**
 * GET /api/incidents
 *
 * Analyst/Admin API: Lists all incident clusters with optional filtering:
 * - search (text search in title and summary)
 * - category (exact match or 'all')
 * - status (exact match or 'all')
 * - severity (exact match or 'all')
 * - time_range ('24h' | '7d' | '30d' | 'all')
 *
 * Extracts centroid coordinates to lat/lng for map rendering.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { extractCoordinates } from "@/src/lib/pipeline/coordinates";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const timeRange = searchParams.get("time_range");

    const supabase = getAdminClient();

    let query = supabase
      .from("incidents")
      .select(`
        id,
        title,
        category,
        severity,
        status,
        summary,
        centroid,
        first_seen_at,
        last_seen_at,
        observation_count,
        created_at
      `)
      .order("last_seen_at", { ascending: false });

    // Category filter
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    // Status filter
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Severity filter
    if (severity && severity !== "all") {
      query = query.eq("severity", severity);
    }

    // Time range filter
    if (timeRange && timeRange !== "all") {
      let hoursAgo = 24;
      if (timeRange === "7d") hoursAgo = 24 * 7;
      if (timeRange === "30d") hoursAgo = 24 * 30;

      const cutoff = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
      query = query.gte("last_seen_at", cutoff);
    }

    // Text search filter
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error("Error querying incidents:", error);
      return NextResponse.json(
        { error: "Failed to fetch incidents", details: error.message },
        { status: 500 },
      );
    }

    // Extract coordinates for each incident
    const formatted = (incidents || []).map((inc) => {
      let lat = 37.7749;
      let lng = -122.4194;
      try {
        if (inc.centroid) {
          const coords = extractCoordinates(inc.centroid);
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (e) {
        console.warn(`Could not parse centroid for incident ${inc.id}:`, e);
      }

      return {
        ...inc,
        lat,
        lng,
      };
    });

    return NextResponse.json({
      incidents: formatted,
      total: formatted.length,
    });
  } catch (err: any) {
    console.error("Unhandled error in GET /api/incidents:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
