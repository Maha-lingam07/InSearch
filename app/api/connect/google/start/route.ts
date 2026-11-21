import { NextRequest, NextResponse } from "next/server";
import { newOAuthState, localOnly } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  if (!localOnly(request)) return new NextResponse("This integration is available only on the local app.", { status: 403 });
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.APP_ENCRYPTION_KEY) {
    const target = new URL("/", request.url);
    target.searchParams.set("connection_setup", "google");
    return NextResponse.redirect(target);
  }

  const state = newOAuthState();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || new URL("/api/connect/google/callback", request.url).toString();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.send"].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("insearch_google_state", state, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: 600, path: "/api/connect/google/callback" });
  return response;
}
