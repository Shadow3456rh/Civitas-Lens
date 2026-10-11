/**
 * Prompt: Analyze Observation
 *
 * Extracts structured data from an observation (text + optional image).
 * Per the Gemma 4 / multimodal model guidelines: image first, then text.
 */

import { ChatMessage, imageTextMessage, textMessage } from "../client";
import { ObservationAnalysis, observationAnalysisSchema } from "../schemas";
import { callJson, CallJsonOptions } from "../json";

export interface AnalyzeObservationInput {
  /** Raw text description submitted by the citizen. */
  rawText?: string | null;
  /** User-selected category chip/hint (e.g. "Road / pothole", "Water / drainage"). */
  userCategory?: string | null;
  /** User-stated urgency level ("low" | "medium" | "high"). */
  userUrgency?: string | null;
  /** Resized base64 image data URL (data:image/jpeg;base64,...), if an image was provided. */
  imageDataUrl?: string | null;
  /** Human-readable location label or geocoded address. */
  locationLabel?: string | null;
  /** Timestamp when the event was observed (ISO string or formatted date). */
  observedAt?: string | null;
}

const SYSTEM_PROMPT = `You are Civitas Lens, an objective public incident-intelligence analyzer.
Analyze citizen observations (text and optional photo) and produce structured incident data in valid JSON.

Valid categories:
- unusual_activity: suspicious or irregular events, abandoned property, unexpected gatherings
- safety_concern: hazards to people, public health risks, fire risk, aggressive conditions
- accident: vehicle collisions, structural failures, falls, transit incidents
- environmental: chemical/fuel spills, downed trees, flooding, toxic smoke, extreme weather impact
- infrastructure: water main breaks, power lines down, road washouts/potholes, failed signals, gas leaks
- other: civic observations not matching the above

Severity criteria:
- low: Minor nuisance or defect, no risk to life or transit flow
- medium: Noticeable hazard, localized disruption, property damage risk
- high: Serious danger, major road blockage, severe disruption requiring rapid response
- critical: Immediate risk to human life or health, major disaster, ongoing emergency

Return a JSON object with:
- "category": one of the 6 categories above
- "summary": concise, objective 1-2 sentence description of what was observed
- "location_context": concise description of the scene or surrounding area (e.g., "Intersection near commercial strip", "Residential sidewalk")
- "severity": "low" | "medium" | "high" | "critical"
- "key_entities": array of up to 5 specific entities (e.g. ["downed oak tree", "power line", "utility pole"])
- "confidence": number between 0.0 and 1.0 reflecting confidence in the analysis`;

/**
 * Builds the chat message array for analyzeObservation.
 * If an image is present, the user message puts the image FIRST, followed by text.
 */
export function buildAnalyzeObservationPrompt(input: AnalyzeObservationInput): ChatMessage[] {
  const textBodyParts: string[] = [];

  textBodyParts.push(`=== USER-PROVIDED COMPLAINT ===`);

  if (input.rawText && input.rawText.trim().length > 0) {
    textBodyParts.push(`Citizen Description: "${input.rawText.trim()}"`);
  } else {
    textBodyParts.push(`Citizen Description: (No text provided with photo)`);
  }

  if (input.userCategory) {
    textBodyParts.push(`User-Selected Category (HINT ONLY): "${input.userCategory}"`);
  }

  if (input.userUrgency) {
    textBodyParts.push(`User-Stated Urgency (HINT ONLY): "${input.userUrgency}"`);
  }

  if (input.userCategory || input.userUrgency) {
    textBodyParts.push(`Note: The user-selected category and urgency are citizen hints, NOT verified facts. Verify against physical evidence (photo/scene description). Your assessment may differ.`);
  }

  if (input.locationLabel) {
    textBodyParts.push(`Reported Location: ${input.locationLabel}`);
  }

  if (input.observedAt) {
    textBodyParts.push(`Observed At: ${input.observedAt}`);
  }

  textBodyParts.push(`\nAnalyze this observation and output the structured JSON object.`);
  const userText = textBodyParts.join("\n");

  const messages: ChatMessage[] = [
    textMessage("system", SYSTEM_PROMPT),
  ];

  if (input.imageDataUrl) {
    // Gemma 4 vision guideline: image FIRST, then text
    messages.push(imageTextMessage(input.imageDataUrl, userText));
  } else {
    messages.push(textMessage("user", userText));
  }

  return messages;
}

export async function analyzeObservation(
  input: AnalyzeObservationInput,
  options?: CallJsonOptions,
): Promise<ObservationAnalysis> {
  const messages = buildAnalyzeObservationPrompt(input);
  try {
    return await callJson(observationAnalysisSchema, messages, options);
  } catch (err) {
    console.warn("LLM analyzeObservation failed, using fallback:", err);
    
    const catMap: Record<string, string> = {
      "Road / pothole": "infrastructure",
      "Water / drainage": "infrastructure",
      "Garbage / sanitation": "environmental",
      "Streetlight / electricity": "infrastructure",
      "Safety / suspicious activity": "safety_concern",
      "Accident": "accident",
      "Environment / pollution": "environmental",
      "Fire": "safety_concern",
      "Other": "other"
    };
    
    const defaultCat = (input.userCategory && catMap[input.userCategory]) ? catMap[input.userCategory] : "other";

    return {
      category: defaultCat as any,
      severity: "medium",
      summary: input.rawText?.slice(0, 500) || "Observation submitted without description.",
      location_context: input.locationLabel?.slice(0, 300) || "Unknown location",
      key_entities: ["fallback_generated"],
      confidence: 0.5,
    };
  }
}
