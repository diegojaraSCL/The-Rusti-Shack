-- Part D: AI assistant usage log. Backs the assistant's own rate limiting
-- (per-minute / per-day) and spending-cap guardrails — one row per Gemini
-- API call (a single user question is typically 3-6 calls, per the
-- assignment's own tool-calling step count). Never exposed to anon/authenticated;
-- server-only, same pattern as Orders/OrderLines/Customers_* below.
create table if not exists "AssistantRequestLog" (
  "ID" bigint generated always as identity primary key,
  "CreatedAt" timestamptz not null default now(),
  "Model" text not null,
  "PromptTokens" integer not null check ("PromptTokens" >= 0),
  "CompletionTokens" integer not null check ("CompletionTokens" >= 0),
  "CostUsd" numeric(10,6) not null check ("CostUsd" >= 0)
);

create index if not exists "AssistantRequestLog_CreatedAt_idx" on "AssistantRequestLog" ("CreatedAt");

alter table "AssistantRequestLog" enable row level security;
-- No policies/grants: RLS on with zero grants means anon/authenticated can
-- neither read nor write. Only the server-side supabaseAdmin (service role,
-- bypasses RLS) reads/writes this table, from the assistant's API route.
