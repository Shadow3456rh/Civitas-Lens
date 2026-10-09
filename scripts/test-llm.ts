/**
 * Verification test suite for Civitas Lens LLM integration (/src/lib/llm).
 *
 * Runs unit and integration verification for:
 * 1. Image resizing and data URL generation (sharp)
 * 2. Zod schema validation and type parsing
 * 3. Prompt builders and message ordering (image first, then text)
 * 4. JSON extraction heuristics
 * 5. callJson retry and error handling logic
 * 6. Live LLM endpoint connection check (if server is reachable)
 *
 * Run with: npm run test:llm
 */

import sharp from "sharp";
import {
  resizeForLLM,
  resizeToDataUrl,
  observationAnalysisSchema,
  relationshipDecisionSchema,
  buildAnalyzeObservationPrompt,
  buildCompareObservationPrompt,
  extractAndParseJson,
  callJson,
  LLMJsonValidationError,
} from "../src/lib/llm";

// Colors for terminal output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
    passedCount++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}    Civitas Lens — LLM Module Verification Suite     ${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  // -------------------------------------------------------------------------
  // 1. Image Resizing (sharp)
  // -------------------------------------------------------------------------
  console.log(`${YELLOW}[1/6] Testing Image Processing (sharp)...${RESET}`);
  try {
    // Generate an in-memory 1600x1200 test image
    const rawImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 29, g: 53, b: 87 }, // Civitas Navy
      },
    })
      .png()
      .toBuffer();

    const resized = await resizeForLLM(rawImageBuffer);
    assert(resized.wasResized === true, "Identified that 1600x1200 image needs resizing");
    assert(resized.width === 896, `Resized longest side to exactly 896px (actual: ${resized.width}px)`);
    assert(resized.height === 672, `Maintained aspect ratio (height: 672px, actual: ${resized.height}px)`);

    const dataUrl = await resizeToDataUrl(rawImageBuffer);
    assert(dataUrl.startsWith("data:image/jpeg;base64,"), "Generates valid data:image/jpeg;base64 URL");
    assert(dataUrl.length > 100, "Base64 data URL contains expected payload size");

    // Test image that is already smaller than 896px
    const smallImageBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const smallResized = await resizeForLLM(smallImageBuffer);
    assert(smallResized.wasResized === false, "Image under 896px is not enlarged");
    assert(smallResized.width === 400 && smallResized.height === 300, "Preserved original dimensions for small image");
  } catch (err) {
    console.error("Image processing error:", err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // 2. Zod Schemas
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}[2/6] Testing Zod Schemas...${RESET}`);
  {
    // Valid ObservationAnalysis
    const validObservation = {
      category: "infrastructure",
      summary: "Main water line burst causing localized street flooding.",
      location_context: "Intersection of 5th Ave and Main St",
      severity: "high",
      key_entities: ["water line", "flooded street", "manhole cover"],
      confidence: 0.92,
    };
    const obsResult = observationAnalysisSchema.safeParse(validObservation);
    assert(obsResult.success, "ObservationAnalysis schema accepts valid data");

    // Invalid category
    const invalidCat = { ...validObservation, category: "supernatural_event" };
    const invalidCatResult = observationAnalysisSchema.safeParse(invalidCat);
    assert(!invalidCatResult.success, "ObservationAnalysis rejects invalid category enum");

    // Invalid severity
    const invalidSev = { ...validObservation, severity: "extreme_emergency" };
    const invalidSevResult = observationAnalysisSchema.safeParse(invalidSev);
    assert(!invalidSevResult.success, "ObservationAnalysis rejects invalid severity enum");

    // Invalid confidence range (> 1.0)
    const invalidConf = { ...validObservation, confidence: 1.5 };
    const invalidConfResult = observationAnalysisSchema.safeParse(invalidConf);
    assert(!invalidConfResult.success, "ObservationAnalysis rejects confidence out of 0-1 range");

    // Valid RelationshipDecision
    const validRelMatch = {
      matched_incident_id: "c79b9a62-4217-48f8-8bb3-4cb82b95b451",
      related: true,
      reason: "Describes same burst pipe at 5th and Main.",
      confidence: 0.88,
    };
    const relMatchResult = relationshipDecisionSchema.safeParse(validRelMatch);
    assert(relMatchResult.success, "RelationshipDecision schema accepts matched candidate");

    // Valid RelationshipDecision with null match
    const validRelNoMatch = {
      matched_incident_id: null,
      related: false,
      reason: "Separate event 3km away, unrelated to water break.",
      confidence: 0.95,
    };
    const relNoMatchResult = relationshipDecisionSchema.safeParse(validRelNoMatch);
    assert(relNoMatchResult.success, "RelationshipDecision schema accepts null match");

    // Invalid RelationshipDecision reason too long (> 200 chars)
    const longReason = {
      ...validRelNoMatch,
      reason: "A".repeat(250),
    };
    const longReasonResult = relationshipDecisionSchema.safeParse(longReason);
    assert(!longReasonResult.success, "RelationshipDecision rejects reason exceeding 200 characters");
  }

  // -------------------------------------------------------------------------
  // 3. Prompt Builders
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}[3/6] Testing Prompt Generation & Message Structure...${RESET}`);
  {
    // Test analyzeObservation ordering: Image FIRST, then Text
    const sampleDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const analyzePrompt = buildAnalyzeObservationPrompt({
      rawText: "Water rushing across the sidewalk from cracked main pipe.",
      imageDataUrl: sampleDataUrl,
      locationLabel: "5th Ave & Market St",
      observedAt: "2026-10-10T00:30:00Z",
    });

    assert(analyzePrompt.length === 2, "Analyze prompt has 2 messages (system + user)");
    assert(analyzePrompt[0].role === "system", "First message is system prompt");

    const userMsg = analyzePrompt[1];
    assert(userMsg.role === "user", "Second message is user prompt");
    assert(Array.isArray(userMsg.content), "User message content is multipart array when image provided");

    if (Array.isArray(userMsg.content)) {
      assert(userMsg.content[0].type === "image_url", "Per Gemma 4 guide: IMAGE is the FIRST content part");
      assert(userMsg.content[1].type === "text", "Per Gemma 4 guide: TEXT is the SECOND content part");
    }

    // Test compareObservation prompt
    const comparePrompt = buildCompareObservationPrompt({
      newObservation: {
        category: "infrastructure",
        severity: "high",
        summary: "Flooded intersection from busted line.",
        location_label: "5th Ave",
        key_entities: ["water line"],
      },
      candidates: [
        {
          id: "incident-1234",
          title: "Water Main Leak",
          category: "infrastructure",
          severity: "high",
          summary: "Crews alerted to major pressure drop and surface pooling.",
          distance_m: 85,
          time_diff_min: 12,
        },
      ],
    });

    assert(comparePrompt.length === 2, "Compare prompt has 2 messages (system + user)");
    const compareUserText = typeof comparePrompt[1].content === "string" ? comparePrompt[1].content : "";
    assert(compareUserText.includes("incident-1234"), "Compare prompt includes candidate ID");
    assert(compareUserText.includes("85m away"), "Compare prompt formats proximity distance in meters");
    assert(compareUserText.includes("12 minutes apart"), "Compare prompt formats time difference in minutes");
  }

  // -------------------------------------------------------------------------
  // 4. JSON Extraction Heuristics
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}[4/6] Testing JSON Extraction Heuristics...${RESET}`);
  {
    // Clean raw JSON
    const cleanJson = '{"category":"accident","summary":"Car collision"}';
    const parsedClean = extractAndParseJson(cleanJson) as Record<string, string>;
    assert(parsedClean.category === "accident", "Parses pure JSON string");

    // Markdown code block ```json ... ```
    const fencedJson = 'Here is the analysis:\n```json\n{"category":"environmental","summary":"Oil leak"}\n```\nHope that helps!';
    const parsedFenced = extractAndParseJson(fencedJson) as Record<string, string>;
    assert(parsedFenced.category === "environmental", "Extracts JSON from markdown code fence");

    // Outermost braces heuristic
    const embeddedJson = 'Result: {"category":"other","summary":"Lost pet reported"} - end of report.';
    const parsedEmbedded = extractAndParseJson(embeddedJson) as Record<string, string>;
    assert(parsedEmbedded.category === "other", "Extracts JSON from surrounding text");

    // Invalid JSON throwing error
    let threw = false;
    try {
      extractAndParseJson("This is plain text with no json at all");
    } catch {
      threw = true;
    }
    assert(threw, "Throws appropriate error when no JSON can be extracted");
  }

  // -------------------------------------------------------------------------
  // 5. callJson Retry & Error Handling
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}[5/6] Testing callJson Retry Mechanism...${RESET}`);
  {
    // Mock global fetch to test retry flow
    const originalFetch = globalThis.fetch;

    // Test 5A: First attempt fails schema validation, second attempt succeeds
    let callCount = 0;
    globalThis.fetch = async (url: unknown) => {
      callCount++;
      if (callCount === 1) {
        // Return JSON with invalid category
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    category: "invalid_category",
                    summary: "Something happened",
                    location_context: "Somewhere",
                    severity: "low",
                    key_entities: [],
                    confidence: 0.5,
                  }),
                },
              },
            ],
          }),
        } as unknown as Response;
      } else {
        // Return valid JSON on retry
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    category: "infrastructure",
                    summary: "Fixed summary on retry",
                    location_context: "Intersection",
                    severity: "medium",
                    key_entities: ["pipe"],
                    confidence: 0.9,
                  }),
                },
              },
            ],
          }),
        } as unknown as Response;
      }
    };

    try {
      const result = await callJson(
        observationAnalysisSchema,
        [{ role: "user", content: "Test prompt" }],
        { model: "mock-model" },
      );
      assert(callCount === 2, `Retried exactly once upon initial schema failure (fetch calls: ${callCount})`);
      assert(result.category === "infrastructure", "Successfully recovered valid output after retry");
    } catch (err) {
      console.error("Retry test failed unexpectedly:", err);
      failedCount++;
    }

    // Test 5B: Exhausted retries throw typed LLMJsonValidationError
    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Not JSON at all",
              },
            },
          ],
        }),
      } as unknown as Response;
    };

    let caughtTypedError = false;
    try {
      await callJson(
        observationAnalysisSchema,
        [{ role: "user", content: "Test prompt" }],
        { model: "mock-model" },
      );
    } catch (err) {
      if (err instanceof LLMJsonValidationError) {
        caughtTypedError = true;
      }
    }
    assert(caughtTypedError, "Throws typed LLMJsonValidationError when retries are exhausted");

    // Restore fetch
    globalThis.fetch = originalFetch;
  }

  // -------------------------------------------------------------------------
  // 6. Live Endpoint Check
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}[6/6] Checking Live LLM Endpoint Configuration...${RESET}`);
  {
    const baseUrl = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
    const model = process.env.LLM_MODEL || "gemma4";
    console.log(`  Target endpoint: ${baseUrl}`);
    console.log(`  Configured model: ${model}`);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        console.log(`  ${GREEN}✓${RESET} Live LLM endpoint responded (HTTP ${res.status})`);
      } else {
        console.log(`  ${YELLOW}ℹ${RESET} Live endpoint ${baseUrl} is not currently running (expected for offline local dev until Ollama/vLLM is started).`);
      }
    } catch {
      console.log(`  ${YELLOW}ℹ${RESET} Live endpoint is not running currently.`);
    }
  }

  // Summary
  console.log(`\n${CYAN}------------------------------------------------------${RESET}`);
  if (failedCount === 0) {
    console.log(`${GREEN}ALL ${passedCount} CHECKS PASSED! Module /src/lib/llm is ready.${RESET}`);
  } else {
    console.log(`${RED}${failedCount} CHECKS FAILED. (${passedCount} passed)${RESET}`);
  }
  console.log(`${CYAN}------------------------------------------------------${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test runner error:", err);
  process.exit(1);
});
