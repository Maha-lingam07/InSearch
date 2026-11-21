import { NextRequest, NextResponse } from "next/server";
import { saveProviderTokens } from "@/lib/credentials";
import { localOnly, validOAuthState } from "@/lib/oauth-state";

function finish(request: NextRequest, status: "google" | "error") {
  const target = new URL("/", request.url);
  target.searchParams.set(status === "google" ? "connected" : "connection_error", status === "google" ? "google" : "google");
  const response = NextResponse.redirect(target);
  response.cookies.delete("insearch_google_state");
  return response;
}

export async function GET(request: NextRequest) {
  if (!localOnly(request)) return new NextResponse("This integration is available only on the local app.", { status: 403 });
  if (request.nextUrl.searchParams.get("error")) return finish(request, "error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !validOAuthState(request.cookies.get("insearch_google_state")?.value, state)) return finish(request, "error");

  try {
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || new URL("/api/connect/google/callback", request.url).toString();
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string };
    if (!tokenResponse.ok || !token.access_token) return finish(request, "error");
    let account: string | undefined;
    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (userResponse.ok) account = (await userResponse.json() as { email?: string }).email;
    await saveProviderTokens("google", { access_token: token.access_token, refresh_token: token.refresh_token, token_type: token.token_type, scope: token.scope, account, expires_at: Date.now() + (token.expires_in || 3600) * 1000 });
    return finish(request, "google");
  } catch {
    return finish(request, "error");
  }
}
