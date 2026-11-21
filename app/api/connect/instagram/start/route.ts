import { NextRequest, NextResponse } from "next/server";
import { newOAuthState, localOnly } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  if (!localOnly(request)) return new NextResponse("This integration is available only on the local app.", { status: 403 });
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.APP_ENCRYPTION_KEY) {
    const target = new URL("/", request.url);
    target.searchParams.set("connection_setup", "instagram");
    return NextResponse.redirect(target);
  }

  const state = newOAuthState();
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || new URL("/api/connect/instagram/callback", request.url).toString();
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic",
    state,
    enable_fb_login: "0",
  });
  const response = NextResponse.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
  response.cookies.set("insearch_instagram_state", state, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: 600, path: "/api/connect/instagram/callback" });
  return response;
}
