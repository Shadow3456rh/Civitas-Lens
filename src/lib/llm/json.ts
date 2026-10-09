/**
 * Generic JSON caller with schema validation and retry.
 *
 * Sends a chat request expecting structured JSON, parses the response,
 * validates against a Zod schema, and if invalid, retries ONCE with a
 * corrective message before throwing a typed error.
 */

import { z } from "zod";
import {
  chatCompletion,
  extractContent,
  ChatMessage,
  ChatRequestOptions,
  LLMError,
} from "./client";

// ---------------------------------------------------------------------------
// Typed Error
// ---------------------------------------------------------------------------

export class LLMJsonValidationError extends LLMError {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly zodIssues?: z.ZodIssue[],
  ) {
    super(message);
    this.name = "LLMJsonValidationError";
  }
}

// ---------------------------------------------------------------------------
// JSON Parsing Helper
// ---------------------------------------------------------------------------

/**
 * Extracts and parses a JSON object from LLM response text.
 * Handles markdown code fences (```json ... ```) and leading/trailing text.
 */
export function extractAndParseJson(text: string): unknown {
  const trimmed = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to extractors
  }

  // 2. Extract from ```json ... ``` or ``` ... ``` code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to next heuristic
    }
  }

  // 3. Find outermost JSON object { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      // Continue to fail
    }
  }

  throw new Error(`Failed to locate a valid JSON object in LLM response: "${trimmed.slice(0, 100)}..."`);
}

// ---------------------------------------------------------------------------
// callJson Implementation
// ---------------------------------------------------------------------------

export interface CallJsonOptions extends Partial<Omit<ChatRequestOptions, "messages">> {
  /** Maximum retry attempts on validation failure (defaults to 1). */
  maxRetries?: number;
}

/**
 * Call the LLM and return validated JSON data matching the given Zod schema.
 *
 * @param schema - Zod schema to validate against
 * @param messages - Chat conversation messages
 * @param options - Request options (model, temperature, timeout, etc.)
 * @returns Validated data of type T
 * @throws {LLMJsonValidationError} if parsing or schema validation fails after retry
 * @throws {LLMError} on network/timeout errors
 */
export async function callJson<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  options: CallJsonOptions = {},
): Promise<T> {
  const { maxRetries = 1, ...requestOptions } = options;

  const currentMessages: ChatMessage[] = [...messages];

  // Request json_object response format
  const baseReqOptions: ChatRequestOptions = {
    ...requestOptions,
    messages: currentMessages,
    response_format: requestOptions.response_format ?? { type: "json_object" },
    temperature: requestOptions.temperature ?? 0.1,
  };

  let lastRawResponse = "";
  let lastErrorSummary = "";
  let lastZodIssues: z.ZodIssue[] | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const isRetry = attempt > 0;

    const response = await chatCompletion({
      ...baseReqOptions,
      messages: currentMessages,
    });

    const rawContent = extractContent(response);
    lastRawResponse = rawContent;

    // 1. Try parsing JSON
    let parsed: unknown;
    try {
      parsed = extractAndParseJson(rawContent);
    } catch (parseError) {
      lastErrorSummary = `Invalid JSON syntax: ${(parseError as Error).message}`;
      lastZodIssues = undefined;

      if (!isRetry && attempt < maxRetries) {
        currentMessages.push({
          role: "assistant",
          content: rawContent,
        });
        currentMessages.push({
          role: "user",
          content: `Your response was not valid JSON (${lastErrorSummary}). Fix your JSON and return ONLY the valid JSON object. Do not include markdown code fences or explanatory text.`,
        });
        continue;
      }
      break;
    }

    // 2. Validate against Zod schema
    const validationResult = schema.safeParse(parsed);
    if (validationResult.success) {
      return validationResult.data;
    }

    // Validation failed
    lastZodIssues = validationResult.error.issues;
    const issueDescriptions = validationResult.error.issues
      .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");
    lastErrorSummary = `Schema validation failed:\n${issueDescriptions}`;

    if (!isRetry && attempt < maxRetries) {
      currentMessages.push({
        role: "assistant",
        content: rawContent,
      });
      currentMessages.push({
        role: "user",
        content: `Your JSON response does not conform to the required schema:\n${issueDescriptions}\n\nPlease fix your JSON and return ONLY the valid JSON object matching the schema.`,
      });
      continue;
    }

    break;
  }

  throw new LLMJsonValidationError(
    `Failed to obtain valid JSON from LLM after retry. ${lastErrorSummary}`,
    lastRawResponse,
    lastZodIssues,
  );
}
