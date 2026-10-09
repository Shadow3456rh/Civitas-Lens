/**
 * Zod schemas for LLM structured outputs.
 *
 * These schemas define the exact shapes the LLM must produce. The callJson
 * helper validates responses against these schemas and retries on failure.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Observation Analysis (LLM call #1 per observation)
// ---------------------------------------------------------------------------

/** Categories the AI can assign to an observation. */
export const observationCategoryEnum = z.enum([
  "unusual_activity",
  "safety_concern",
  "accident",
  "environmental",
  "infrastructure",
  "other",
]);
export type ObservationCategory = z.infer<typeof observationCategoryEnum>;

/** Severity levels matching the database enum and Badge component. */
export const severityEnum = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof severityEnum>;

/**
 * The structured output the LLM produces when analyzing a single observation.
 * Contains extracted entities, categorization, severity, and context.
 */
export const observationAnalysisSchema = z.object({
  /** Primary category for this observation. */
  category: observationCategoryEnum,
  /** Brief plain-language summary of what was observed (1-3 sentences). */
  summary: z.string().min(1).max(500),
  /** Description of the location context (nearby landmarks, area type). */
  location_context: z.string().min(1).max(300),
  /** Assessed severity based on potential impact. */
  severity: severityEnum,
  /** Key entities extracted: people, vehicles, objects, organizations, etc. */
  key_entities: z.array(z.string()).min(0).max(20),
  /** Model's confidence in this analysis (0 = no confidence, 1 = certain). */
  confidence: z.number().min(0).max(1),
});
export type ObservationAnalysis = z.infer<typeof observationAnalysisSchema>;

// ---------------------------------------------------------------------------
// Relationship Decision (LLM call #2 per observation, if candidates exist)
// ---------------------------------------------------------------------------

/**
 * The structured output the LLM produces when comparing a new observation
 * against a candidate incident to decide if they are related.
 */
export const relationshipDecisionSchema = z.object({
  /** Matched candidate incident ID, or null if unrelated. */
  matched_incident_id: z.string().nullable().optional(),
  /** Whether the new observation is related to any candidate incident. */
  related: z.boolean(),
  /** Brief explanation of the decision (max 200 chars for storage). */
  reason: z.string().min(1).max(200),
  /** Model's confidence in this relationship decision (0-1). */
  confidence: z.number().min(0).max(1),
});
export type RelationshipDecision = z.infer<typeof relationshipDecisionSchema>;

// ---------------------------------------------------------------------------
// Incident Synthesis (Regenerate incident summary from all observations)
// ---------------------------------------------------------------------------

export const incidentSynthesisSchema = z.object({
  /** Concise factual title for the incident (max 80 chars). */
  title: z.string().min(1).max(80),
  /** Cohesive updated plain-language summary combining all observations (1-3 sentences). */
  summary: z.string().min(1).max(500),
  /** Overall assessed severity across all reports. */
  severity: severityEnum,
});
export type IncidentSynthesis = z.infer<typeof incidentSynthesisSchema>;


