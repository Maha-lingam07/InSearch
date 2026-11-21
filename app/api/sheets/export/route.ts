import { NextRequest, NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/credentials";
import { localOnly, sameOrigin } from "@/lib/oauth-state";

type Creator = { name: string; username: string; category?: string; location?: string; followers?: number; score?: number; summary?: string; email?: string; status?: string; lastMailedAt?: string; };
const tabs = ["Profiles", "New leads", "Mailed", "Accepted", "Opt-out", "No reply"];
const headers = ["Name", "Instagram username", "Profile URL", "Category", "Location", "Followers", "Match score", "Public business email", "Summary", "Status", "Last mailed"];

function toRow(creator: Creator) {
  return [creator.name, `@${creator.username}`, `https://www.instagram.com/${encodeURIComponent(creator.username)}/`, creator.category || "", creator.location || "", creator.followers || "", creator.score ?? "", creator.email || "", creator.summary || "", creator.status || "New lead", creator.lastMailedAt || ""];
}

export async function POST(request: NextRequest) {
  if (!localOnly(request) || !sameOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  try {
    const body = await request.json() as { campaignTitle?: string; creators?: Creator[]; spreadsheetId?: string };
    const title = (body.campaignTitle || "Creator campaign").trim().slice(0, 100);
    const creators = (body.creators || []).slice(0, 500);
    if (!creators.length || creators.some((creator) => !creator.username || !creator.name)) return NextResponse.json({ error: "Add valid profile details before exporting." }, { status: 400 });
    const accessToken = await getGoogleAccessToken();
    const base = "https://sheets.googleapis.com/v4/spreadsheets";
    let spreadsheetId = body.spreadsheetId;
    let spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit` : "";

    if (spreadsheetId) {
      if (!/^[A-Za-z0-9_-]{20,200}$/.test(spreadsheetId)) return NextResponse.json({ error: "The saved spreadsheet reference is invalid." }, { status: 400 });
      const clearResponse = await fetch(`${base}/${encodeURIComponent(spreadsheetId)}/values:batchClear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ranges: tabs.map((tab) => `'${tab}'!A:Z`) }),
      });
      if (!clearResponse.ok) return NextResponse.json({ error: "Could not update the existing campaign spreadsheet. Re-export as a new sheet or reconnect Google." }, { status: 502 });
    } else {
      const createResponse = await fetch(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties: { title }, sheets: tabs.map((tab) => ({ properties: { title: tab } })) }),
      });
      const created = await createResponse.json() as { spreadsheetId?: string; spreadsheetUrl?: string };
      if (!createResponse.ok || !created.spreadsheetId) return NextResponse.json({ error: "Google Sheets could not create this campaign workbook." }, { status: 502 });
      spreadsheetId = created.spreadsheetId;
      spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    }

    const data: Array<{ range: string; values: unknown[][] }> = [{ range: "Profiles!A1", values: [headers, ...creators.map(toRow)] }];
    for (const status of tabs.slice(1)) {
      const rows = creators.filter((creator) => (creator.status || "New lead") === status);
      data.push({ range: `'${status}'!A1`, values: [headers, ...rows.map(toRow)] });
    }
    const writeResponse = await fetch(`${base}/${encodeURIComponent(spreadsheetId!)}/values:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    });
    if (!writeResponse.ok) return NextResponse.json({ error: "The campaign sheet was created, but writing the profile rows failed." }, { status: 502 });
    return NextResponse.json({ spreadsheetId, spreadsheetUrl, rows: creators.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export campaign details.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
