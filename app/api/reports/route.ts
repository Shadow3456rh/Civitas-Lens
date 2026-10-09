/**
 * GET /api/reports
 *
 * Staff endpoint for listing and filtering individual citizen reports:
 * - Search by description, reference code, location label
 * - Filter by category, urgency, processing status, linked/unlinked
 * - "Needs attention" tab filter (needs_review or failed)
 * - Pagination & sort
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const urgency = searchParams.get("urgency");
    const status = searchParams.get("status");
    const linked = searchParams.get("linked"); // 'all' | 'linked' | 'unlinked'
    const tab = searchParams.get("tab"); // 'all' | 'needs_attention'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "newest";

    const supabase = getAdminClient();

    let query = supabase
      .from("observations")
      .select(`
        id,
        reference_code,
        user_category,
        user_urgency,
        category,
        severity,
        summary,
        raw_text,
        location_label,
        location_accuracy_m,
        capture_source,
        location_source,
        image_path,
        processing_status,
        incident_id,
        created_at,
        observed_at,
        reporter_name,
        reporter_contact,
        incidents (
          id,
          title,
          status,
          severity
        )
      `, { count: "exact" });

    // Text search over raw_text, reference_code, or location_label
    if (search) {
      query = query.or(
        `raw_text.ilike.%${search}%,reference_code.ilike.%${search}%,location_label.ilike.%${search}%`
      );
    }

    // Category filter (checks user_category or AI category)
    if (category && category !== "all") {
      query = query.or(`user_category.ilike.%${category}%,category.eq.${category}`);
    }

    // Urgency filter
    if (urgency && urgency !== "all") {
      query = query.eq("user_urgency", urgency);
    }

    // Tab filter: "Needs attention"
    if (tab === "needs_attention") {
      query = query.in("processing_status", ["needs_review", "failed"]);
    } else if (status && status !== "all") {
      query = query.eq("processing_status", status);
    }

    // Linked filter
    if (linked === "linked") {
      query = query.not("incident_id", "is", null);
    } else if (linked === "unlinked") {
      query = query.is("incident_id", null);
    }

    // Sort order
    if (sort === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: reports, error, count } = await query;

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports", details: error.message },
        { status: 500 },
      );
    }

    // Generate signed URLs for report images if present
    const reportsWithUrls = await Promise.all(
      (reports || []).map(async (rep: any) => {
        let imageUrl: string | null = null;
        if (rep.image_path) {
          try {
            const { data: signed } = await supabase.storage
              .from("evidence")
              .createSignedUrl(rep.image_path, 3600);
            imageUrl = signed?.signedUrl || null;
          } catch (e) {
            // ignore
          }
        }

        const fallbackRef = `CL-${new Date(rep.created_at).getFullYear()}-${rep.id.slice(0, 6).toUpperCase()}`;

        return {
          ...rep,
          reference_code: rep.reference_code || fallbackRef,
          image_signed_url: imageUrl,
        };
      })
    );

    return NextResponse.json({
      reports: reportsWithUrls,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error("GET /api/reports handler error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err?.message },
      { status: 500 },
    );
  }
}
