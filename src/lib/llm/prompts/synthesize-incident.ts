/**
 * Prompt: Synthesize Incident Summary
 *
 * Regenerates the incident title, summary, and severity from all its linked
 * observations when an observation is merged into an existing incident cluster.
 * Per PROJECT_CONTEXT: this is the 2nd LLM call for a merged observation.
 */

import { ChatMessage, textMessage } from "../client";
import { IncidentSynthesis, incidentSynthesisSchema } from "../schemas";
import { callJson, CallJsonOptions } from "../json";

export interface LinkedObservationSummary {
  id: string;
  summary: string;
  severity?: string | null;
  location_label?: string | null;
  observed_at?: string | null;
  key_entities?: string[] | null;
}

export interface SynthesizeIncidentInput {
  incidentId: string;
  currentTitle?: string | null;
  category: string;
  observations: LinkedObservationSummary[];
}

const SYSTEM_PROMPT = `You are Civitas Lens Incident Synthesis Engine.
Your job is to synthesize multiple citizen observations of an ongoing incident into a single factual, high-level intelligence summary and title.

Requirements:
1. "title": A concise, formal title (max 80 chars, e.g., "Downed Power Line on 4th Ave", "Water Main Break at Market & 5th").
2. "summary": 1 to 3 objective sentences combining the key facts across all observations. Mention verified impacts (e.g. road closures, power disruptions, hazards).
3. "severity": Overall assessed incident severity: "low" | "medium" | "high" | "critical" based on the collective situation.

Return a JSON object:
{
  "title": "Concise incident title",
  "summary": "1-3 sentences objective synthesized summary",
  "severity": "low" | "medium" | "high" | "critical"
}`;

/**
 * Builds the chat message array for synthesizeIncidentSummary.
 */
export function buildSynthesizeIncidentPrompt(input: SynthesizeIncidentInput): ChatMessage[] {
  const { category, currentTitle, observations } = input;

  const observationItems = observations.map((obs, idx) => {
    const lines = [
      `Observation #${idx + 1}:`,
      `  - Summary: ${obs.summary}`,
    ];
    if (obs.severity) lines.push(`  - Severity: ${obs.severity}`);
    if (obs.location_label) lines.push(`  - Location: ${obs.location_label}`);
    if (obs.observed_at) lines.push(`  - Time: ${obs.observed_at}`);
    if (obs.key_entities && obs.key_entities.length > 0) {
      lines.push(`  - Entities: ${obs.key_entities.join(", ")}`);
    }
    return lines.join("\n");
  });

  const userContent = [
    `Category: ${category}`,
    currentTitle ? `Current Title: ${currentTitle}` : null,
    `Total Linked Observations: ${observations.length}`,
    `\nObservations:`,
    observationItems.join("\n\n"),
    `\nSynthesize these observations into an updated incident title, summary, and severity. Output the JSON object.`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    textMessage("system", SYSTEM_PROMPT),
    textMessage("user", userContent),
  ];
}

/**
 * Executes incident summary regeneration via LLM with JSON schema validation.
 */
export async function synthesizeIncidentSummary(
  input: SynthesizeIncidentInput,
  options?: CallJsonOptions,
): Promise<IncidentSynthesis> {
  const messages = buildSynthesizeIncidentPrompt(input);
  try {
    return await callJson(incidentSynthesisSchema, messages, options);
  } catch (err) {
    console.warn("LLM synthesizeIncidentSummary failed, using fallback:", err);
    return {
      title: input.currentTitle || "Reported Incident",
      summary: "Incident synthesized from multiple reports. (Fallback summary)",
      severity: "medium",
    };
  }
}
