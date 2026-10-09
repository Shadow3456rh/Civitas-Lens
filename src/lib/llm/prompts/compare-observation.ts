/**
 * Prompt: Compare Observation
 *
 * Compares a new observation against up to 5 candidate incidents to determine
 * if the observation describes an existing incident or represents a new one.
 * Must answer with the candidate ID or null.
 */

import { ChatMessage, textMessage } from "../client";
import { RelationshipDecision, relationshipDecisionSchema } from "../schemas";
import { callJson, CallJsonOptions } from "../json";

export interface CandidateIncidentInfo {
  id: string;
  title: string;
  category: string;
  severity: string;
  summary: string;
  distance_m?: number | null;
  time_diff_min?: number | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
}

export interface NewObservationInfo {
  category: string;
  summary: string;
  severity: string;
  raw_text?: string | null;
  user_category?: string | null;
  user_urgency?: string | null;
  location_context?: string | null;
  location_label?: string | null;
  key_entities?: string[];
  observed_at?: string | null;
}

export interface CompareObservationInput {
  newObservation: NewObservationInfo;
  candidates: CandidateIncidentInfo[];
}

const SYSTEM_PROMPT = `You are Civitas Lens Incident Correlation Engine.
Your job is to compare a NEW observation against up to 5 nearby candidate incidents and determine if it describes the same real-world incident.

Rules:
1. Two observations are related if they describe the SAME underlying event, incident progression, or direct consequences (e.g. fire + smoke report, water leak + flooded street, collision + traffic backlog).
2. Different events occurring in the same general area (e.g. a pothole vs a separate graffiti or robbery) are NOT related.
3. If the observation matches ONE of the candidate incidents, return that candidate's exact ID as "matched_incident_id", set "related" to true, and provide a concise reason (max 200 characters) and your confidence score (0.0 to 1.0).
4. If the observation does NOT match ANY candidate incident, return null for "matched_incident_id", set "related" to false, and provide a concise reason (max 200 characters) why it is distinct.

Output MUST be a JSON object:
{
  "matched_incident_id": "<candidate_id>" or null,
  "related": boolean,
  "reason": "Concise explanation (max 200 chars)",
  "confidence": 0.85
}`;

/**
 * Builds the chat message array for compareObservation.
 */
export function buildCompareObservationPrompt(input: CompareObservationInput): ChatMessage[] {
  const { newObservation, candidates } = input;

  // Limit candidates to at most 5 per requirements
  const limitedCandidates = candidates.slice(0, 5);

  const observationBlock = [
    `=== NEW OBSERVATION ===`,
    newObservation.raw_text ? `Citizen Complaint Text: "${newObservation.raw_text}"` : null,
    newObservation.user_category ? `User Category Hint: ${newObservation.user_category}` : null,
    newObservation.user_urgency ? `User Urgency Hint: ${newObservation.user_urgency}` : null,
    `AI-Assessed Category: ${newObservation.category}`,
    `AI-Assessed Severity: ${newObservation.severity}`,
    `AI Summary: ${newObservation.summary}`,
    newObservation.location_label ? `Location: ${newObservation.location_label}` : null,
    newObservation.location_context ? `Location Context: ${newObservation.location_context}` : null,
    newObservation.key_entities && newObservation.key_entities.length > 0
      ? `Key Entities: ${newObservation.key_entities.join(", ")}`
      : null,
    newObservation.observed_at ? `Observed At: ${newObservation.observed_at}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const candidateBlocks = limitedCandidates.map((c, i) => {
    const lines = [
      `--- Candidate #${i + 1} (ID: ${c.id}) ---`,
      `Title: ${c.title}`,
      `Category: ${c.category}`,
      `Severity: ${c.severity}`,
      `Summary: ${c.summary}`,
    ];
    if (c.distance_m !== undefined && c.distance_m !== null) {
      lines.push(`Distance: ~${Math.round(c.distance_m)}m away`);
    }
    if (c.time_diff_min !== undefined && c.time_diff_min !== null) {
      lines.push(`Time Difference: ~${Math.round(c.time_diff_min)} minutes apart`);
    }
    return lines.join("\n");
  });

  const candidatesSection =
    limitedCandidates.length > 0
      ? `=== CANDIDATE INCIDENTS (Choose ONE ID or null) ===\n\n${candidateBlocks.join("\n\n")}`
      : `No candidate incidents found nearby.`;

  const userContent = `${observationBlock}\n\n${candidatesSection}\n\nDetermine whether this new observation belongs to any candidate incident. Output the JSON object.`;

  return [
    textMessage("system", SYSTEM_PROMPT),
    textMessage("user", userContent),
  ];
}

/**
 * Executes observation correlation comparison via LLM with JSON schema validation.
 */
export async function compareObservation(
  input: CompareObservationInput,
  options?: CallJsonOptions,
): Promise<RelationshipDecision> {
  // If there are no candidates, return an immediate null decision without calling the LLM
  if (!input.candidates || input.candidates.length === 0) {
    return {
      matched_incident_id: null,
      related: false,
      reason: "No candidate incidents were provided for correlation.",
      confidence: 1.0,
    };
  }

  const messages = buildCompareObservationPrompt(input);
  return callJson(relationshipDecisionSchema, messages, options);
}
