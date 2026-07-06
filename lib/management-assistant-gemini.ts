import "server-only";

// Thin wrapper around the Gemini generateContent REST API (function calling
// / tool-use flavor), used only by the AI assistant's API route. Kept
// deliberately dependency-free (no @ai-sdk/google) since the tool-calling
// loop and guardrails need direct control over each step's token usage.

export type GeminiModelId = "gemini-2.5-flash" | "gemini-2.5-flash-lite";

// Structured so a second provider (e.g. Claude, per the assignment's
// optional second model) can be added as a sibling entry later without
// reshaping this table — see AGENTS.md dropdown requirement.
export const AVAILABLE_MODELS: { id: GeminiModelId; label: string; provider: "gemini" }[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (cheaper)", provider: "gemini" },
];

// $ per 1M tokens, current as of the Part D research write-up (see
// Part_D_Research_Writeup.docx, Section 3). Re-check ai.google.dev/gemini-api/docs/pricing
// periodically — Google revises these without notice.
const PRICING: Record<GeminiModelId, { inputPerM: number; outputPerM: number }> = {
  "gemini-2.5-flash": { inputPerM: 0.3, outputPerM: 2.5 },
  "gemini-2.5-flash-lite": { inputPerM: 0.1, outputPerM: 0.4 },
};

export function computeCostUsd(model: GeminiModelId, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[model];
  return (promptTokens / 1_000_000) * pricing.inputPerM + (completionTokens / 1_000_000) * pricing.outputPerM;
}

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown>; id?: string } }
  | { functionResponse: { name: string; response: { result: unknown }; id?: string } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type GeminiCallResult = {
  parts: GeminiPart[];
  promptTokens: number;
  completionTokens: number;
};

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return key;
}

export async function callGemini(args: {
  model: GeminiModelId;
  systemInstruction: string;
  contents: GeminiContent[];
  tools: ToolDeclaration[];
}): Promise<GeminiCallResult> {
  const { model, systemInstruction, contents, tools } = args;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getApiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts ?? [];
  const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

  return { parts, promptTokens, completionTokens };
}
