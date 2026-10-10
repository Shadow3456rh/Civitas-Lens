/**
 * POST /api/observations
 *
 * Receives multipart/form-data observation submission:
 * - text (REQUIRED string, 10 to 1000 chars)
 * - user_category (REQUIRED string/chip)
 * - user_urgency (REQUIRED: 'low' | 'medium' | 'high')
 * - reporter_name (optional string, max 100)
 * - reporter_contact (optional string, max 100)
 * - image (optional File, max 5MB, jpeg/png/webp)
 * - lat (-90 to 90)
 * - lng (-180 to 180)
 * - location_accuracy_m (optional number, >= 0)
 * - capture_source (optional: 'live_camera' | 'gallery_upload')
 * - location_source (optional: 'gps' | 'manual_pin')
 * - captured_at (optional ISO timestamp, treated as observed_at)
 * - location_label (optional human-readable place description)
 *
 * Validates with Zod, uploads optional image to "evidence" bucket,
 * generates a human-friendly reference_code (e.g. CL-2026-000123),
 * inserts the observation with status 'pending', returns its ID and reference_code
 * immediately, and schedules processObservation(id) using Next.js after().
 */

import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { processObservation } from "@/src/lib/pipeline";
import { getCurrentUserAuth } from "@/src/lib/supabase/server";

// Allowed MIME types for uploaded evidence images
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `CL-${year}-${randomSuffix}`;
}

// Form field validation schema
const observationPayloadSchema = z.object({
  text: z
    .string()
    .min(10, "Description must be at least 10 characters long")
    .max(1000, "Description cannot exceed 1000 characters")
    .transform((val) => val.trim()),
  user_category: z
    .string()
    .min(1, "Please select a category for the problem"),
  user_urgency: z
    .enum(["low", "medium", "high"])
    .default("medium"),
  reporter_name: z
    .string()
    .max(100, "Name cannot exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  reporter_contact: z
    .string()
    .max(100, "Contact information cannot exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  location_accuracy_m: z.coerce
    .number()
    .min(0, "Accuracy must be non-negative")
    .optional()
    .nullable(),
  capture_source: z
    .enum(["live_camera", "gallery_upload"])
    .optional()
    .nullable(),
  location_source: z
    .enum(["gps", "manual_pin"])
    .optional()
    .nullable(),
  captured_at: z.string().datetime().optional().nullable(),
  location_label: z.string().max(300).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract text fields
    const textRaw = formData.get("text")?.toString();
    const userCategoryRaw = formData.get("user_category")?.toString();
    const userUrgencyRaw = formData.get("user_urgency")?.toString() || "medium";
    const reporterNameRaw = formData.get("reporter_name")?.toString();
    const reporterContactRaw = formData.get("reporter_contact")?.toString();
    const lat = formData.get("lat")?.toString();
    const lng = formData.get("lng")?.toString();
    const location_accuracy_m = formData.get("location_accuracy_m")?.toString();
    const capture_source = formData.get("capture_source")?.toString();
    const location_source = formData.get("location_source")?.toString();
    const captured_at = formData.get("captured_at")?.toString();
    const location_label = formData.get("location_label")?.toString() || null;

    // Validate fields with Zod
    const validationResult = observationPayloadSchema.safeParse({
      text: textRaw,
      user_category: userCategoryRaw,
      user_urgency: userUrgencyRaw,
      reporter_name: reporterNameRaw || null,
      reporter_contact: reporterContactRaw || null,
      lat,
      lng,
      location_accuracy_m: location_accuracy_m ? Number(location_accuracy_m) : null,
      capture_source: capture_source || null,
      location_source: location_source || null,
      captured_at: captured_at || null,
      location_label,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;

    // Extract optional image file
    const imageEntry = formData.get("image");
    let imageFile: File | null = null;

    if (imageEntry && typeof imageEntry === "object" && "size" in imageEntry && (imageEntry as File).size > 0) {
      imageFile = imageEntry as File;

      // Validate image size (max 5MB)
      if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "Image exceeds 5MB size limit",
            details: { image: ["Uploaded image must be 5MB or smaller"] },
          },
          { status: 400 },
        );
      }

      // Validate image MIME type (jpeg, png, webp)
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          {
            error: "Invalid image format",
            details: {
              image: ["Allowed formats are JPEG, PNG, or WebP"],
            },
          },
          { status: 400 },
        );
      }
    }

    const supabase = getAdminClient();
    let imageStoragePath: string | null = null;

    // Upload image to the "evidence" bucket
    if (imageFile) {
      const ext = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
      const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      imageStoragePath = `observations/${uniqueFilename}`;

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(imageStoragePath, buffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return NextResponse.json(
          {
            error: "Failed to upload image file to storage",
            details: uploadError.message,
          },
          { status: 500 },
        );
      }
    }

    // Treat captured_at as the observation time (observed_at)
    const effectiveObservationTime =
      validatedData.captured_at || new Date().toISOString();
    const pointWkt = `POINT(${validatedData.lng} ${validatedData.lat})`;
    const generatedRefCode = generateReferenceCode();

    // Check if user is logged in to automatically attach their info
    const authContext = await getCurrentUserAuth();
    let finalReporterId = null;
    let finalReporterName = validatedData.reporter_name;
    let finalReporterContact = validatedData.reporter_contact;

    if (authContext) {
      finalReporterId = authContext.id;
      if (authContext.full_name) finalReporterName = authContext.full_name;
      if (authContext.phone) finalReporterContact = authContext.phone;
    }

    const insertPayload: Record<string, any> = {
      raw_text: validatedData.text,
      user_category: validatedData.user_category,
      user_urgency: validatedData.user_urgency,
      reporter_id: finalReporterId,
      reporter_name: finalReporterName,
      reporter_contact: finalReporterContact,
      reference_code: generatedRefCode,
      modality: imageFile ? "image" : "text",
      image_path: imageStoragePath,
      location: pointWkt,
      location_label: validatedData.location_label,
      location_accuracy_m: validatedData.location_accuracy_m,
      capture_source: validatedData.capture_source || (imageFile ? "live_camera" : null),
      location_source: validatedData.location_source || "gps",
      captured_at: validatedData.captured_at || effectiveObservationTime,
      observed_at: effectiveObservationTime,
      processing_status: "pending",
    };

    // Insert observation with processing_status 'pending'
    let { data: newObservation, error: insertError } = await supabase
      .from("observations")
      .insert(insertPayload)
      .select("id, reference_code, processing_status, created_at")
      .single();

    // Fallback if database migration 00012 has not yet been applied to Supabase
    if (insertError && insertError.message?.toLowerCase().includes("column")) {
      console.warn("Retrying with base schema fallback:", insertError.message);
      const fallbackPayload: Record<string, any> = {
        raw_text: validatedData.text,
        modality: imageFile ? "image" : "text",
        image_path: imageStoragePath,
        location: pointWkt,
        location_label: validatedData.location_label,
        location_accuracy_m: validatedData.location_accuracy_m,
        capture_source: validatedData.capture_source || (imageFile ? "live_camera" : null),
        location_source: validatedData.location_source || "gps",
        captured_at: validatedData.captured_at || effectiveObservationTime,
        observed_at: effectiveObservationTime,
        processing_status: "pending",
        ai_raw: {
          user_category: validatedData.user_category,
          user_urgency: validatedData.user_urgency,
          reporter_name: finalReporterName,
          reporter_contact: finalReporterContact,
          reference_code: generatedRefCode,
        },
      };

      const fallbackRes = await supabase
        .from("observations")
        .insert(fallbackPayload)
        .select("id, processing_status, created_at")
        .single();

      newObservation = fallbackRes.data ? { ...fallbackRes.data, reference_code: generatedRefCode } : null;
      insertError = fallbackRes.error;
    }

    if (insertError || !newObservation) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        {
          error: "Failed to record observation in database",
          details: insertError?.message,
        },
        { status: 500 },
      );
    }

    const observationId = newObservation.id;
    const finalReferenceCode = newObservation.reference_code || generatedRefCode;

    // Schedule background processing via Next.js after()
    after(async () => {
      try {
        console.log(`[Pipeline] Triggering processObservation for ${observationId}`);
        const result = await processObservation(observationId);
        console.log(`[Pipeline] Completed processing for ${observationId}:`, result.action);
      } catch (pipelineErr) {
        console.error(`[Pipeline] Uncaught background error for ${observationId}:`, pipelineErr);
      }
    });

    // Return observation ID and reference_code immediately
    return NextResponse.json(
      {
        id: observationId,
        reference_code: finalReferenceCode,
        status: newObservation.processing_status || "pending",
        message: "Observation received and queued for processing.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Observation submission handler error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err?.message || "Unexpected submission failure",
      },
      { status: 500 },
    );
  }
}
