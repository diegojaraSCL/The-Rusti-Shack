import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
}

// Secret key bypasses Row Level Security entirely. Only import this from
// server-only code (route handlers, webhooks) that itself checks ownership
// on every query — never from a client component. See SECURITY.md Section 4.
export const supabaseAdmin = createClient(url, secretKey, {
  auth: { persistSession: false },
});
