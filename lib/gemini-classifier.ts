import { readFile } from "node:fs/promises";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

import { getGeminiApiKey, getGeminiModel } from "@/lib/env";
import { FrameClassification, FrameMetadata, SearchTraceEntry } from "@/lib/types";

const CONFIDENCE_THRESHOLD = 0.6;

const classificationSchema = {
  type: "object",
  properties: {
    label: {
      type: "string",
      enum: ["present", "absent", "uncertain"],
      description: "Whether the semantic state implied by the user query is true in this frame.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence score from 0 to 1.",
    },
    reason: {
      type: "string",
      description: "Short, frame-specific explanation.",
    },
  },
  required: ["label", "confidence", "reason"],
  additionalProperties: false,
} as const;

export function isAmbiguousClassification(result: FrameClassification): boolean {
  return result.label === "uncertain" || result.confidence < CONFIDENCE_THRESHOLD;
}

function buildPrompt(query: string): string {
  return `You are analyzing a single sampled frame from a video.

The user wants to locate when a semantic state changes in the video.

User query:
${query}

Your task:
Determine whether the semantic state implied by the user query is TRUE in this frame.

Interpret the query operationally:
- If the query is about something disappearing or being removed, decide whether that object is still present in this frame.
- If the query is about something appearing, decide whether it is present in this frame.
- If the query is about a state like "door opens", decide whether that state is true in this frame.

Return strict JSON only with this schema:
{
  "label": "present" | "absent" | "uncertain",
  "confidence": number between 0 and 1,
  "reason": "short explanation"
}

Label definitions:
- present: the semantic state is clearly true in the frame
- absent: the semantic state is clearly false in the frame
- uncertain: the frame does not contain enough visual evidence to decide confidently

Rules:
- Be conservative.
- Use "uncertain" if the object or state is occluded, blurry, partially visible, or ambiguous.
- Keep the reason short and specific.
- Output JSON only. No markdown. No prose outside JSON.`;
}

function getMimeType(imagePath: string): string {
  const extension = path.extname(imagePath).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function parseClassification(rawText: string): FrameClassification {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Gemini returned non-JSON output: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini classification payload must be an object.");
  }

  const candidate = parsed as Record<string, unknown>;
  const label = candidate.label;
  const confidence = candidate.confidence;
  const reason = candidate.reason;

  if (label !== "present" && label !== "absent" && label !== "uncertain") {
    throw new Error("Gemini classification label is invalid.");
  }

  if (typeof confidence !== "number" || Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Gemini classification confidence must be a number between 0 and 1.");
  }

  if (typeof reason !== "string" || !reason.trim()) {
    throw new Error("Gemini classification reason must be a non-empty string.");
  }

  return {
    label,
    confidence,
    reason: reason.trim(),
  };
}

type CachedEntry = {
  classification: FrameClassification;
  trace: SearchTraceEntry;
};

type GeminiFrameClassifierOptions = {
  onClassifyStart?: (frame: FrameMetadata, currentCalls: number) => void;
  onClassifyComplete?: (frame: FrameMetadata, nextCalls: number, classification: FrameClassification) => void;
};

export class GeminiFrameClassifier {
  private readonly client = new GoogleGenAI({
    apiKey: getGeminiApiKey(),
  });

  private readonly model = getGeminiModel();
  private readonly cache = new Map<number, CachedEntry>();
  private readonly seenTrace = new Set<number>();
  private totalCalls = 0;

  constructor(
    private readonly query: string,
    private readonly options: GeminiFrameClassifierOptions = {},
  ) {}

  getCallCount(): number {
    return this.totalCalls;
  }

  async classify(frame: FrameMetadata): Promise<FrameClassification> {
    const cached = this.cache.get(frame.sampleIndex);

    if (cached) {
      return cached.classification;
    }

    this.options.onClassifyStart?.(frame, this.totalCalls);

    const imageBytes = await readFile(frame.imagePath);
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt(this.query) },
            {
              inlineData: {
                mimeType: getMimeType(frame.imagePath),
                data: imageBytes.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: classificationSchema,
      },
    });

    const classification = parseClassification(response.text ?? "");
    const trace: SearchTraceEntry = {
      sampleIndex: frame.sampleIndex,
      timestampSec: frame.timestampSec,
      label: classification.label,
      confidence: classification.confidence,
      reason: classification.reason,
    };

    this.cache.set(frame.sampleIndex, {
      classification,
      trace,
    });
    this.totalCalls += 1;
    this.options.onClassifyComplete?.(frame, this.totalCalls, classification);

    return classification;
  }

  async classifyForTrace(frame: FrameMetadata, trace: SearchTraceEntry[]): Promise<FrameClassification> {
    const classification = await this.classify(frame);

    if (!this.seenTrace.has(frame.sampleIndex)) {
      trace.push({
        sampleIndex: frame.sampleIndex,
        timestampSec: frame.timestampSec,
        label: classification.label,
        confidence: classification.confidence,
        reason: classification.reason,
      });
      this.seenTrace.add(frame.sampleIndex);
    }

    return classification;
  }
}
