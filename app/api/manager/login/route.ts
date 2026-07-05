import { NextResponse } from "next/server";
import { checkPassword, managerCookieOptions } from "@/lib/manager-auth";

export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.password !== "string" || !checkPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const cookie = managerCookieOptions();
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
