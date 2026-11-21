import { NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/credentials";
import { localOnly, sameOrigin } from "@/lib/oauth-state";

type Outgoing = { username: string; to: string; subject: string; body: string };
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const headerSafe = (value: string) => !/[\r\n]/.test(value);

export async function POST(request: NextRequest) {
  if (!localOnly(request) || !sameOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  try {
    const payload = await request.json() as { confirmed?: boolean; messages?: Outgoing[] };
    if (payload.confirmed !== true) return NextResponse.json({ error: "Confirm the campaign send before continuing." }, { status: 400 });
    const messages = payload.messages || [];
    if (!messages.length || messages.length > 20) return NextResponse.json({ error: "Send between 1 and 20 reviewed messages per batch." }, { status: 400 });
    if (messages.some((message) => !message.username || !emailPattern.test(message.to) || !headerSafe(message.subject) || !message.subject.trim() || !message.body.trim() || message.body.length > 10_000)) return NextResponse.json({ error: "One or more messages have an invalid recipient, subject, or body." }, { status: 400 });

    const accessToken = await getGoogleAccessToken();
    const results: Array<{ username: string; ok: boolean }> = [];
    for (const message of messages) {
      const encodedSubject = `=?UTF-8?B?${Buffer.from(message.subject, "utf8").toString("base64")}?=`;
      const mime = [
        `To: ${message.to}`,
        `Subject: ${encodedSubject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(message.body, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
      ].join("\r\n");
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: Buffer.from(mime, "utf8").toString("base64url") }),
      });
      results.push({ username: message.username, ok: response.ok });
      if (results.length < messages.length) await new Promise((resolve) => setTimeout(resolve, 180));
    }
    return NextResponse.json({ results, sent: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send campaign emails.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
