import "server-only";
import crypto from "crypto";

export const MANAGER_COOKIE_NAME = "manager_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getPassword(): string {
  const password = process.env.MANAGER_PASSWORD;
  if (!password) throw new Error("Missing MANAGER_PASSWORD");
  return password;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Session token never contains the password itself — it's an HMAC keyed by
// the password, so the cookie value alone reveals nothing about it.
function sessionToken(): string {
  return crypto.createHmac("sha256", getPassword()).update("manager-session").digest("hex");
}

export function checkPassword(candidate: string): boolean {
  return timingSafeStringEqual(candidate, getPassword());
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return timingSafeStringEqual(cookieValue, sessionToken());
}

export function managerCookieOptions() {
  return {
    name: MANAGER_COOKIE_NAME,
    value: sessionToken(),
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}
