/**
 * LLM Client — Minimal OpenAI-compatible chat client using fetch.
 *
 * Sends requests to LLM_BASE_URL (default: Ollama at localhost:11434/v1).
 * Supports text + image messages, JSON-schema response format, and 60s timeout.
 *
 * Server-side only (uses process.env).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatRole = "system" | "user" | "assistant";

/** Text-only content part. */
export interface TextContent {
  type: "text";
  text: string;
}

/** Base64 image content part (data URL or raw base64). */
export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string; // data:image/jpeg;base64,... or a URL
  };
}

export type ContentPart = TextContent | ImageContent;

export interface ChatMessage {
  role: ChatRole;
  content: string | ContentPart[];
}

export interface ChatRequestOptions {
  /** Model override; defaults to LLM_MODEL env var. */
  model?: string;
  /** Array of messages in the conversation. */
  messages: ChatMessage[];
  /** Temperature (0-2). Defaults to 0.1 for deterministic JSON output. */
  temperature?: number;
  /** Maximum tokens to generate. */
  max_tokens?: number;
  /**
   * Response format. Set to { type: "json_object" } for JSON output.
   * Some providers also accept { type: "json_schema", json_schema: {...} }.
   */
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: Record<string, unknown> };
  /** Request timeout in milliseconds. Defaults to 60_000 (60s). */
  timeout_ms?: number;
}

export interface ChatChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
  };
  finish_reason: string;
}

export interface ChatResponse {
  id: string;
  choices: ChatChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  const url = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
  // Strip trailing slash
  return url.replace(/\/+$/, "");
}

function getModel(): string {
  const model = process.env.LLM_MODEL;
  if (!model) {
    throw new LLMError(
      "LLM_MODEL environment variable is not set. Add it to .env.local.",
    );
  }
  return model;
}

function getApiKey(): string | undefined {
  return process.env.LLM_API_KEY || undefined;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to an OpenAI-compatible endpoint.
 *
 * @throws {LLMError} on network errors, HTTP errors, or timeout.
 */
export async function chatCompletion(
  options: ChatRequestOptions,
): Promise<ChatResponse> {
  const baseUrl = getBaseUrl();
  const model = options.model ?? getModel();
  const apiKey = getApiKey();
  const timeoutMs = options.timeout_ms ?? 60_000;

  const url = `${baseUrl}/chat/completions`;

  // Build request body
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.1,
  };

  if (options.max_tokens) {
    body.max_tokens = options.max_tokens;
  }

  if (options.response_format) {
    body.response_format = options.response_format;
  }

  // Headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // Timeout via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(unreadable)");
      throw new LLMError(
        `LLM API returned HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorBody,
      );
    }

    const data = (await response.json()) as ChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new LLMError("LLM API returned no choices in the response.");
    }

    return data;
  } catch (error) {
    if (error instanceof LLMError) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new LLMError(
        `LLM request timed out after ${timeoutMs}ms. The model may be too slow or the prompt too large.`,
      );
    }

    const msg =
      error instanceof Error ? error.message : "Unknown fetch error";
    throw new LLMError(`LLM request failed: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a text-only user message. */
export function textMessage(role: ChatRole, text: string): ChatMessage {
  return { role, content: text };
}

/**
 * Build a user message with an image (base64 data URL) and text.
 * Per the Gemma 4 model card: image first, then text.
 */
export function imageTextMessage(
  imageDataUrl: string,
  text: string,
): ChatMessage {
  return {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: imageDataUrl },
      },
      {
        type: "text",
        text,
      },
    ],
  };
}

/** Extract the assistant's text content from a chat response. */
export function extractContent(response: ChatResponse): string {
  return response.choices[0].message.content;
}
