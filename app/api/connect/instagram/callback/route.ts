import { NextRequest, NextResponse } from "next/server";
import { saveProviderTokens } from "@/lib/credentials";
import { localOnly, validOAuthState } from "@/lib/oauth-state";

function finish(request: NextRequest, success: boolean) {
  const target = new URL("/", request.url);
  target.searchParams.set(success ? "connected" : "connection_error", "instagram");
  const response = NextResponse.redirect(target);
  response.cookies.delete("insearch_instagram_state");
  return response;
}

export async function GET(request: NextRequest) {
  if (!localOnly(request)) return new NextResponse("This integration is available only on the local app.", { status: 403 });
  if (request.nextUrl.searchParams.get("error")) return finish(request, false);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !validOAuthState(request.cookies.get("insearch_instagram_state")?.value, state)) return finish(request, false);

  try {
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI || new URL("/api/connect/instagram/callback", request.url).toString();
    const body = new URLSearchParams({
      client_id: process.env.META_APP_ID || "",
      client_secret: process.env.META_APP_SECRET || "",
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const shortToken = await shortResponse.json() as { access_token?: string; user_id?: number; user?: { username?: string } };
    if (!shortResponse.ok || !shortToken.access_token) return finish(request, false);
    const longParams = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: process.env.META_APP_SECRET || "", access_token: shortToken.access_token });
    const longResponse = await fetch(`https://graph.instagram.com/access_token?${longParams}`);
    const longToken = await longResponse.json() as { access_token?: string; expires_in?: number; token_type?: string };
    if (!longResponse.ok || !longToken.access_token) return finish(request, false);
    let account = shortToken.user?.username;
    let accountId = String(shortToken.user_id || "");
    const profileParams = new URLSearchParams({ fields: "id,username", access_token: longToken.access_token });
    const profileResponse = await fetch(`https://graph.instagram.com/v27.0/me?${profileParams}`);
    if (profileResponse.ok) {
      const profile = await profileResponse.json() as { id?: string; username?: string };
      account = profile.username || account;
      accountId = profile.id || accountId;
    }
    await saveProviderTokens("instagram", { access_token: longToken.access_token, expires_at: Date.now() + (longToken.expires_in || 5_184_000) * 1000, token_type: longToken.token_type, account, account_id: accountId });
    return finish(request, true);
  } catch {
    return finish(request, false);
  }
}
