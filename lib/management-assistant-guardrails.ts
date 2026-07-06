import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import type { GeminiModelId } from "./management-assistant-gemini";

// Guardrails for the AI assistant: rate limiting on our own endpoint (not
// just relying on Gemini's own free-tier limit) and a hard spending ceiling.
// Both fail closed — a caller over either cap is refused outright, never
// queued or silently degraded. See Part_D_Research_Writeup.docx, Section 4.

// Set at/under Gemini's own published free-tier limits (~10-15 RPM, ~1,500
// RPD) so our endpoint refuses before Google's API would anyway return a
// 429 — a clearer error message for whoever's testing, and a real ceiling
// once/if a paid key is behind this.
const RPM_CAP = 10;
const RPD_CAP = 1400;

// A genuinely busy day of real use was estimated at ~$0.20-0.60 (Section 3
// of the write-up); these ceilings sit comfortably above that so normal use
// is never blocked, while still capping what a runaway loop could cost.
const DAILY_SPEND_CAP_USD = 1.0;
const MONTHLY_SPEND_CAP_USD = 10.0;

export class GuardrailError extends Error {}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function countSince(sinceIso: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("AssistantRequestLog")
    .select("ID", { count: "exact", head: true })
    .gte("CreatedAt", sinceIso);
  if (error) throw new Error(`AssistantRequestLog count: ${error.message}`);
  return count ?? 0;
}

async function sumCostSince(sinceIso: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("AssistantRequestLog")
    .select("CostUsd")
    .gte("CreatedAt", sinceIso);
  if (error) throw new Error(`AssistantRequestLog cost sum: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + Number((row as { CostUsd: number }).CostUsd), 0);
}

export type UsageStatus = {
  requestsLastMinute: number;
  requestsToday: number;
  costToday: number;
  costThisMonth: number;
  rpmCap: number;
  rpdCap: number;
  dailySpendCap: number;
  monthlySpendCap: number;
};

export async function getUsageStatus(): Promise<UsageStatus> {
  const [requestsLastMinute, requestsToday, costToday, costThisMonth] = await Promise.all([
    countSince(isoMinutesAgo(1)),
    countSince(isoDaysAgo(1)),
    sumCostSince(isoDaysAgo(1)),
    sumCostSince(isoDaysAgo(30)),
  ]);
  return {
    requestsLastMinute,
    requestsToday,
    costToday,
    costThisMonth,
    rpmCap: RPM_CAP,
    rpdCap: RPD_CAP,
    dailySpendCap: DAILY_SPEND_CAP_USD,
    monthlySpendCap: MONTHLY_SPEND_CAP_USD,
  };
}

// Call before every Gemini request (each tool-calling step), not just once
// per user question — a single question can be 3-6 of these.
export async function assertWithinGuardrails(): Promise<void> {
  const status = await getUsageStatus();
  if (status.requestsLastMinute >= status.rpmCap) {
    throw new GuardrailError(
      `Rate limit reached (${status.requestsLastMinute}/${status.rpmCap} requests this minute). Please wait a minute and try again.`
    );
  }
  if (status.requestsToday >= status.rpdCap) {
    throw new GuardrailError(`Daily request cap reached (${status.requestsToday}/${status.rpdCap}). Try again tomorrow.`);
  }
  if (status.costToday >= status.dailySpendCap) {
    throw new GuardrailError(
      `Daily spending cap reached ($${status.costToday.toFixed(4)}/$${status.dailySpendCap.toFixed(2)}). Try again tomorrow.`
    );
  }
  if (status.costThisMonth >= status.monthlySpendCap) {
    throw new GuardrailError(
      `Monthly spending cap reached ($${status.costThisMonth.toFixed(2)}/$${status.monthlySpendCap.toFixed(2)}). Contact the site owner to raise it.`
    );
  }
}

export async function recordUsage(model: GeminiModelId, promptTokens: number, completionTokens: number, costUsd: number): Promise<void> {
  const { error } = await supabaseAdmin.from("AssistantRequestLog").insert({
    Model: model,
    PromptTokens: promptTokens,
    CompletionTokens: completionTokens,
    CostUsd: costUsd,
  });
  if (error) throw new Error(`AssistantRequestLog insert: ${error.message}`);
}
