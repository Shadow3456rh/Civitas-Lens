/**
 * Observation Processing Pipeline
 *
 * Implements the core 6-step AI incident-intelligence workflow:
 * 1. Gemma observation analysis -> update observation fields.
 * 2. Spatial/temporal candidate search via find_candidate_incidents RPC.
 * 3. Gemma correlation comparison (if candidates exist) + link_decisions audit logging.
 * 4. Strict backend validation (distance, time, category, confidence).
 * 5. Incident Merge (with summary regeneration) OR New Incident Creation.
 * 6. Resilient failure recovery (sets 'needs_review' or 'failed' without data loss).
 *
 * Idempotent: safe to run multiple times.
 */

import { getAdminClient } from "../supabase/admin";
import { resizeToDataUrl } from "../llm/image";
import {
  analyzeObservation,
  compareObservation,
  synthesizeIncidentSummary,
  CandidateIncidentInfo,
} from "../llm/prompts";
import {
  MATCHING_CONFIG,
  isCategoryCompatible,
  getCompatibleCategories,
  maxSeverity,
} from "../../config/matching";
import { extractCoordinates } from "./coordinates";

export interface ProcessObservationResult {
  observationId: string;
  status: "processed" | "needs_review" | "failed";
  incidentId: string | null;
  action: "merged" | "created" | "already_processed" | "review_required" | "failed";
  message: string;
}

/**
 * Generate a clean, human-readable title from an observation summary.
 */
function generateIncidentTitle(summary: string, category: string): string {
  if (!summary || summary.trim().length === 0) {
    const formattedCat = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `Reported ${formattedCat} Incident`;
  }
  // Extract the first sentence or up to 75 characters
  const firstSentence = summary.split(/[.!?]/)[0].trim();
  if (firstSentence.length <= 75) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 72)}...`;
}

/**
 * Calculates updated weighted centroid point.
 */
function calculateWeightedCentroid(
  oldLat: number,
  oldLng: number,
  oldCount: number,
  newLat: number,
  newLng: number,
): { lat: number; lng: number } {
  const total = oldCount + 1;
  const lat = (oldLat * oldCount + newLat) / total;
  const lng = (oldLng * oldCount + newLng) / total;
  return { lat, lng };
}

/**
 * Process a submitted observation through the incident-intelligence pipeline.
 *
 * @param observationId - The UUID of the observation to process.
 */
export async function processObservation(
  observationId: string,
): Promise<ProcessObservationResult> {
  const supabase = getAdminClient();

  // -------------------------------------------------------------------------
  // Fetch observation record
  // -------------------------------------------------------------------------
  const { data: observation, error: fetchError } = await supabase
    .from("observations")
    .select("*")
    .eq("id", observationId)
    .single();

  if (fetchError || !observation) {
    throw new Error(
      `Observation not found with ID ${observationId}: ${fetchError?.message || "Record missing"}`,
    );
  }

  // Idempotency check: if already processed, return immediately
  if (observation.processing_status === "processed" && observation.incident_id) {
    return {
      observationId,
      status: "processed",
      incidentId: observation.incident_id,
      action: "already_processed",
      message: "Observation has already been processed.",
    };
  }

  let partialAnalysisSaved = false;

  try {
    // -----------------------------------------------------------------------
    // Step 1: Gemma Observation Analysis
    // -----------------------------------------------------------------------
    let imageDataUrl: string | null = null;

    if (observation.image_path) {
      try {
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from("evidence")
          .download(observation.image_path);

        if (downloadError) {
          console.warn(`Storage download warning for ${observation.image_path}:`, downloadError.message);
        } else if (fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          imageDataUrl = await resizeToDataUrl(buffer);
        }
      } catch (imgErr) {
        console.warn(`Image resize warning for ${observation.image_path}:`, imgErr);
      }
    }

    const analysis = await analyzeObservation({
      rawText: observation.raw_text,
      userCategory: observation.user_category,
      userUrgency: observation.user_urgency,
      imageDataUrl,
      locationLabel: observation.location_label,
      observedAt: observation.observed_at,
    });

    // Save extracted intelligence back to observation record
    const { error: updateObsError } = await supabase
      .from("observations")
      .update({
        category: analysis.category,
        severity: analysis.severity,
        summary: analysis.summary,
        location_context: analysis.location_context,
        key_entities: analysis.key_entities,
        ai_raw: analysis,
      })
      .eq("id", observationId);

    if (updateObsError) {
      console.warn("Failed to update observation intelligence fields:", updateObsError.message);
    } else {
      partialAnalysisSaved = true;
    }

    // -----------------------------------------------------------------------
    // Step 2: Spatial & Temporal Search for Candidate Incidents (RPC)
    // -----------------------------------------------------------------------
    const { lat, lng } = extractCoordinates(observation.location);

    const sinceTimestamp = new Date(
      Date.now() - MATCHING_CONFIG.windowHours * 3600 * 1000,
    ).toISOString();

    // Query candidates matching exact category
    const { data: exactCandidates, error: rpcError } = await supabase.rpc(
      "find_candidate_incidents",
      {
        lat,
        lng,
        radius_m: MATCHING_CONFIG.radiusMeters,
        since: sinceTimestamp,
        cat: analysis.category,
      },
    );

    if (rpcError) {
      console.warn("Candidate search RPC error:", rpcError.message);
    }

    let candidates: any[] = exactCandidates ? [...exactCandidates] : [];

    // If fewer than 5 candidates, search compatible cross-domain categories
    if (candidates.length < 5) {
      const compatibleList = getCompatibleCategories(analysis.category as any);
      for (const compCat of compatibleList) {
        if (compCat === analysis.category) continue;
        const { data: compData } = await supabase.rpc("find_candidate_incidents", {
          lat,
          lng,
          radius_m: MATCHING_CONFIG.radiusMeters,
          since: sinceTimestamp,
          cat: compCat,
        });

        if (compData) {
          for (const item of compData) {
            if (!candidates.find((c) => c.id === item.id)) {
              candidates.push(item);
            }
          }
        }
        if (candidates.length >= 5) break;
      }
    }

    // Limit to at most 5 candidates
    candidates = candidates.slice(0, 5);

    // -----------------------------------------------------------------------
    // Step 3 & 4: Gemma Correlation Comparison & Backend Validation
    // -----------------------------------------------------------------------
    let matchedCandidate: any = null;

    if (candidates.length > 0) {
      const candidateInfos: CandidateIncidentInfo[] = candidates.map((c) => {
        const obsTime = new Date(observation.observed_at).getTime();
        const candTime = new Date(c.last_seen_at || c.first_seen_at).getTime();
        const timeDiffMin = Math.abs((obsTime - candTime) / 60000);

        return {
          id: c.id,
          title: c.title,
          category: c.category,
          severity: c.severity,
          summary: c.summary,
          distance_m: c.distance_m,
          time_diff_min: timeDiffMin,
          first_seen_at: c.first_seen_at,
          last_seen_at: c.last_seen_at,
        };
      });

      // Exactly 1 LLM comparison call
      const correlationDecision = await compareObservation({
        newObservation: {
          category: analysis.category,
          summary: analysis.summary,
          severity: analysis.severity,
          raw_text: observation.raw_text,
          user_category: observation.user_category,
          user_urgency: observation.user_urgency,
          location_context: analysis.location_context,
          location_label: observation.location_label,
          key_entities: analysis.key_entities,
          observed_at: observation.observed_at,
        },
        candidates: candidateInfos,
      });

      // Save every judgment in link_decisions for full audit explainability
      for (const cand of candidateInfos) {
        const isGemmaPick =
          correlationDecision.related &&
          correlationDecision.matched_incident_id === cand.id;

        const distanceOk =
          cand.distance_m !== undefined &&
          cand.distance_m !== null &&
          cand.distance_m <= MATCHING_CONFIG.radiusMeters;

        const timeDiffHours = (cand.time_diff_min ?? 0) / 60;
        const timeOk = timeDiffHours <= MATCHING_CONFIG.windowHours;

        const categoryOk = isCategoryCompatible(analysis.category, cand.category);

        const confidenceOk =
          correlationDecision.confidence >= MATCHING_CONFIG.minGemmaConfidence;

        // Step 4 rule: Merge ONLY if Gemma says related AND backend rules pass
        const passedValidation =
          isGemmaPick && distanceOk && timeOk && categoryOk && confidenceOk;

        if (passedValidation && !matchedCandidate) {
          matchedCandidate = cand;
        }

        const gemmaReason = isGemmaPick
          ? correlationDecision.reason
          : `Gemma did not link to this candidate: ${correlationDecision.reason}`;

        // Audit log in link_decisions table
        await supabase.from("link_decisions").insert({
          observation_id: observationId,
          candidate_incident_id: cand.id,
          gemma_related: isGemmaPick,
          gemma_reason: gemmaReason,
          passed_validation: passedValidation,
          distance_m: cand.distance_m ?? null,
          time_diff_min: cand.time_diff_min ?? null,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Step 5: Merge into Incident OR Create New Incident
    // -----------------------------------------------------------------------
    let targetIncidentId: string;
    let actionTaken: "merged" | "created";

    if (matchedCandidate) {
      // ---------------------------------------------------------------------
      // MERGE PATH
      // ---------------------------------------------------------------------
      actionTaken = "merged";
      targetIncidentId = matchedCandidate.id;

      // 1. Fetch current incident record
      const { data: existingIncident } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", targetIncidentId)
        .single();

      const currentCount = existingIncident?.observation_count ?? 1;
      const newCount = currentCount + 1;
      let newSeverity = maxSeverity(existingIncident?.severity, analysis.severity);
      if (observation.user_urgency === "high") {
        newSeverity = maxSeverity(newSeverity, "medium");
      }

      // If user urgency is high, flag incident for review
      if (observation.user_urgency === "high" && existingIncident?.status === "new") {
        await supabase
          .from("incidents")
          .update({ status: "under_review" })
          .eq("id", targetIncidentId);

        await supabase.from("incident_events").insert({
          incident_id: targetIncidentId,
          observation_id: observationId,
          type: "status_changed",
          note: "Incident flagged for review due to citizen report marked with High Urgency.",
        });
      }

      const latestTime = new Date(
        Math.max(
          new Date(existingIncident?.last_seen_at || Date.now()).getTime(),
          new Date(observation.observed_at).getTime(),
        ),
      ).toISOString();

      // Update centroid
      let newCentroidWkt: string | undefined;
      try {
        if (existingIncident?.centroid) {
          const oldCoords = extractCoordinates(existingIncident.centroid);
          const updatedCoords = calculateWeightedCentroid(
            oldCoords.lat,
            oldCoords.lng,
            currentCount,
            lat,
            lng,
          );
          newCentroidWkt = `POINT(${updatedCoords.lng} ${updatedCoords.lat})`;
        }
      } catch {
        // Fall back to new observation location
        newCentroidWkt = `POINT(${lng} ${lat})`;
      }

      // 2. Link observation to target incident
      await supabase
        .from("observations")
        .update({
          incident_id: targetIncidentId,
          processing_status: "processed",
        })
        .eq("id", observationId);

      // 3. Add incident_events row for the observation addition
      await supabase.from("incident_events").insert({
        incident_id: targetIncidentId,
        observation_id: observationId,
        type: "observation_added",
        note: `Observation merged via AI correlation (distance: ~${Math.round(matchedCandidate.distance_m ?? 0)}m).`,
      });

      // If severity escalated, record severity_changed event
      if (existingIncident && newSeverity !== existingIncident.severity) {
        await supabase.from("incident_events").insert({
          incident_id: targetIncidentId,
          observation_id: observationId,
          type: "severity_changed",
          note: `Severity upgraded from ${existingIncident.severity} to ${newSeverity}.`,
        });
      }

      // 4. Update incident metrics
      await supabase
        .from("incidents")
        .update({
          observation_count: newCount,
          severity: newSeverity,
          last_seen_at: latestTime,
          ...(newCentroidWkt ? { centroid: newCentroidWkt } : {}),
        })
        .eq("id", targetIncidentId);

      // 5. Regenerate incident summary from all observations (2nd LLM call)
      const { data: allLinkedObservations } = await supabase
        .from("observations")
        .select("id, summary, severity, location_label, observed_at, key_entities")
        .eq("incident_id", targetIncidentId);

      if (allLinkedObservations && allLinkedObservations.length > 1) {
        try {
          const synthesis = await synthesizeIncidentSummary({
            incidentId: targetIncidentId,
            currentTitle: existingIncident?.title,
            category: existingIncident?.category || analysis.category,
            observations: allLinkedObservations.map((o) => ({
              id: o.id,
              summary: o.summary || "Observation report",
              severity: o.severity,
              location_label: o.location_label,
              observed_at: o.observed_at,
              key_entities: o.key_entities,
            })),
          });

          await supabase
            .from("incidents")
            .update({
              title: synthesis.title,
              summary: synthesis.summary,
              severity: synthesis.severity,
            })
            .eq("id", targetIncidentId);

          await supabase.from("incident_events").insert({
            incident_id: targetIncidentId,
            observation_id: observationId,
            type: "summary_updated",
            note: "Incident summary synthesized by AI from all merged observations.",
          });
        } catch (synthErr) {
          console.warn("Incident summary regeneration warning:", synthErr);
        }
      }
    } else {
      // ---------------------------------------------------------------------
      // CREATE NEW INCIDENT PATH
      // ---------------------------------------------------------------------
      actionTaken = "created";
      const incidentTitle = generateIncidentTitle(analysis.summary, analysis.category);

      let finalSeverity = analysis.severity;
      let initialStatus: "new" | "under_review" = "new";

      if (observation.user_urgency === "high") {
        finalSeverity = maxSeverity(finalSeverity, "medium");
        initialStatus = "under_review";
      }

      const { data: newIncident, error: createError } = await supabase
        .from("incidents")
        .insert({
          title: incidentTitle,
          category: analysis.category,
          severity: finalSeverity,
          status: initialStatus,
          summary: analysis.summary,
          centroid: `POINT(${lng} ${lat})`,
          first_seen_at: observation.observed_at,
          last_seen_at: observation.observed_at,
          observation_count: 1,
        })
        .select("id")
        .single();

      if (createError || !newIncident) {
        throw new Error(`Failed to create new incident: ${createError?.message}`);
      }

      targetIncidentId = newIncident.id;

      // Link observation
      await supabase
        .from("observations")
        .update({
          incident_id: targetIncidentId,
          processing_status: "processed",
        })
        .eq("id", observationId);

      // Timeline 'created' event
      await supabase.from("incident_events").insert({
        incident_id: targetIncidentId,
        observation_id: observationId,
        type: "created",
        note: "Incident created from initial citizen observation.",
      });
    }

    return {
      observationId,
      status: "processed",
      incidentId: targetIncidentId,
      action: actionTaken,
      message:
        actionTaken === "merged"
          ? `Observation merged into existing incident ${targetIncidentId}.`
          : `Created new incident ${targetIncidentId}.`,
    };
  } catch (err: any) {
    console.error(`Pipeline processing failed for observation ${observationId}:`, err);

    // Step 6: On any failure, mark needs_review or failed without losing data
    const finalStatus = partialAnalysisSaved ? "needs_review" : "failed";

    try {
      await supabase
        .from("observations")
        .update({
          processing_status: finalStatus,
        })
        .eq("id", observationId);
    } catch (statusUpdateErr) {
      console.error("Failed to update failure status:", statusUpdateErr);
    }

    return {
      observationId,
      status: finalStatus,
      incidentId: null,
      action: finalStatus === "needs_review" ? "review_required" : "failed",
      message: `Processing encountered an issue: ${err?.message || "Unknown error"}. Status marked as '${finalStatus}'.`,
    };
  }
}
