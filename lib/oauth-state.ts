import { randomBytes, timingSafeEqual } from "node:crypto";

export function newOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function validOAuthState(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function localOnly(request: Request) {
  const host = request.headers.get("host") || "";
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
