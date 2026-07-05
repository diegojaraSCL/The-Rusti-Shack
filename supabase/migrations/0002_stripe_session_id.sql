-- Tracks which Stripe Checkout Session created each order, so a retried
-- webhook delivery (Stripe resends on timeout) can never create a duplicate
-- order: the unique constraint makes the second insert fail, and the
-- webhook handler treats that failure as "already processed."
-- Run this once in the Supabase SQL Editor, same as 0001_init.sql.

alter table "Orders" add column if not exists "StripeSessionID" text unique;
