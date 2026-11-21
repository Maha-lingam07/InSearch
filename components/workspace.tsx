"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type View = "brief" | "profiles" | "emails" | "saved";
type Status = "New lead" | "Mailed" | "Accepted" | "Opt-out" | "No reply";
type Brief = { title: string; brand: string; details: string; topics: string; location: string; followers: string; hashtags: string; examples: string; };
type Creator = { username: string; name: string; category: string; location: string; followers: number; score: number; distance: number | null; bio: string; tags: string[]; email: string; avatar: string; color: string; status: Status; isSample?: boolean; reason?: string; lastMailedAt?: string; };
type Draft = { username: string; subject: string; body: string; source?: "AI" | "Template" };
type Campaign = { id: string; brief: Brief; creators: Creator[]; drafts: Draft[]; updatedAt: string; sheetId?: string; sheetUrl?: string; };
type IntegrationStatus = { google: boolean; instagram: boolean; googleAccount?: string | null; instagramAccount?: string | null; setupError?: string; };

const emptyBrief: Brief = { title: "", brand: "", details: "", topics: "", location: "", followers: "10,000 – 100,000", hashtags: "", examples: "" };
const sampleCreators: Creator[] = [
  { username: "earthywithananya", name: "Ananya Rao", category: "Slow living · Sustainable fashion", location: "Bengaluru, India", followers: 48200, score: 96, distance: 4.2, bio: "A thoughtful everyday edit of Indian labels, low-waste living and pieces made to last.", tags: ["slowfashion", "indianbrands", "sustainableliving"], email: "partnerships@earthywithananya.example", avatar: "AR", color: "sage", status: "New lead", isSample: true, reason: "Strong overlap with sustainable fashion and India-first labels." },
  { username: "thegreenthread", name: "Mira Kapoor", category: "Ethical style · Thrift finds", location: "Bengaluru, India", followers: 31700, score: 91, distance: 8.6, bio: "Finding the stories in pre-loved clothes and making conscious style feel easy.", tags: ["thriftedstyle", "rewear", "slowfashion"], email: "hello@thegreenthread.example", avatar: "MK", color: "peach", status: "New lead", isSample: true, reason: "The profile focuses on slow fashion and sustainable habits." },
  { username: "kindred.kitchen", name: "Nisha Menon", category: "Plant-based food · Home", location: "Mysuru, India", followers: 68400, score: 87, distance: 142, bio: "Seasonal recipes and warm, practical ways to bring more plants into daily meals.", tags: ["plantbased", "seasonalcooking", "homegrown"], email: "collabs@kindredkitchen.example", avatar: "NM", color: "blue", status: "New lead", isSample: true, reason: "Good values fit, though the main topic is less directly aligned." },
  { username: "littlewildstudio", name: "Tara Iyer", category: "Conscious beauty · Wellness", location: "Bengaluru, India", followers: 12900, score: 83, distance: 11.3, bio: "Ingredient-first skincare, mindful routines and honest reviews from a working artist.", tags: ["cleanbeauty", "mindfulroutine", "indianbeauty"], email: "tara@littlewildstudio.example", avatar: "TI", color: "lilac", status: "New lead", isSample: true, reason: "Strong India and conscious-living match with a different category." },
  { username: "everyday.cultivate", name: "Rhea Suresh", category: "Urban gardening · DIY", location: "Chennai, India", followers: 95600, score: 79, distance: 289, bio: "Small-space gardening, composting and beginner-friendly ways to grow at home.", tags: ["urbangarden", "growyourown", "lowwaste"], email: "work@everydaycultivate.example", avatar: "RS", color: "yellow", status: "New lead", isSample: true, reason: "Shared sustainability values; weaker fashion relevance." },
];

const statuses: Status[] = ["New lead", "Mailed", "Accepted", "Opt-out", "No reply"];
const storageKey = "insearch-campaigns-v1";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const base = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const path: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.5 4.5"/></>,
    users: <><path d="M16 20v-1.4a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M20 20v-1.4a4 4 0 0 0-3-3.9M16 3.6a3.5 3.5 0 0 1 0 6.8"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H3.8a1.8 1.8 0 1 1 0-3.6H4a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0V4a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    down: <path d="m7 10 5 5 5-5"/>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v4h14v-4"/></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
    google: <><path d="M20.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h4.8a4.1 4.1 0 0 1-1.8 2.7v2.3h3c1.7-1.6 2.5-4 2.5-6.8Z"/><path d="M12 21c2.4 0 4.5-.8 6-2.1l-3-2.3c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.4A9 9 0 0 0 12 21Z"/><path d="M7 13.8a5.5 5.5 0 0 1 0-3.6V7.8H4a9 9 0 0 0 0 8.4l3-2.4Z"/><path d="M12 6.5c1.3 0 2.5.5 3.4 1.3L18 5.2A8.7 8.7 0 0 0 12 3a9 9 0 0 0-8 4.8l3 2.4c.7-2.1 2.7-3.7 5-3.7Z"/></>,
    back: <><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  };
  return <svg {...base}>{path[name] || path.spark}</svg>;
}

function makeTemplate(brief: Brief, creator: Creator): Draft {
  const first = creator.name.split(" ")[0];
  return {
    username: creator.username,
    subject: `${brief.brand || "A collaboration idea"} × ${first}`,
    source: "Template",
    body: `Hi ${first},\n\nI’m reaching out from ${brief.brand || "our team"}. We came across your work around ${creator.category.split(" · ")[0].toLowerCase()}, and your thoughtful approach feels like a promising fit for ${brief.title || "our campaign"}.\n\n${brief.details || "We would love to explore a collaboration."}\n\nWould you be open to sharing your availability and rates?\n\nIf this is not a fit, reply and let me know; I will not follow up.\n\nWarmly,\n[Your name]\n${brief.brand || "Our team"}`,
  };
}

function safeReadCampaigns(): Campaign[] {
  try { return JSON.parse(localStorage.getItem(storageKey) || "[]") as Campaign[]; } catch { return []; }
}

export default function Workspace() {
  const [view, setView] = useState<View>("brief");
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [activeId, setActiveId] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState<Campaign[]>([]);
  const [connections, setConnections] = useState<IntegrationStatus>({ google: false, instagram: false });
  const [sort, setSort] = useState("score");
  const [filter, setFilter] = useState("All profiles");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState("");
  const [toast, setToast] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [sendResults, setSendResults] = useState<{ sent: number; failed: number } | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [manualForm, setManualForm] = useState({ name: "", username: "", category: "", location: "", followers: "", distance: "", email: "", bio: "" });

  const refreshConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      if (response.ok) setConnections(await response.json() as IntegrationStatus);
    } catch { /* The local UI remains usable when connection status cannot be read. */ }
  }, []);

  useEffect(() => {
    setSaved(safeReadCampaigns());
    void refreshConnections();
    const onFocus = () => { void refreshConnections(); };
    window.addEventListener("focus", onFocus);
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const setup = params.get("connection_setup");
    const connectionError = params.get("connection_error");
    if (connected) setToast(`${connected === "google" ? "Google" : "Instagram"} account connected.`);
    else if (setup === "google") setToast("Add Google OAuth client ID and secret to .env, then retry.");
    else if (setup === "instagram") setToast("Add a Meta app ID and secret to .env, then retry.");
    else if (connectionError) setToast(`${connectionError === "google" ? "Google" : "Instagram"} connection was not completed. Check the OAuth setup and try again.`);
    if (connected || setup || connectionError) window.history.replaceState({}, "", window.location.pathname);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshConnections]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4200);
  };

  const sortedCreators = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = creators.filter((creator) => {
      const text = `${creator.name} ${creator.username} ${creator.category} ${creator.location}`.toLowerCase();
      const byStatus = filter === "All profiles" || creator.status === filter;
      return byStatus && (!q || text.includes(q));
    });
    return [...filtered].sort((a, b) => sort === "followers" ? b.followers - a.followers : sort === "distance" ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : b.score - a.score);
  }, [creators, filter, query, sort]);

  const eligible = creators.filter((creator) => !creator.isSample && creator.status === "New lead" && creator.email && !creator.email.endsWith(".example"));
  const draftRecipients = eligible.filter((creator) => drafts.some((draft) => draft.username === creator.username));
  const sendableDrafts = drafts.filter((draft) => eligible.some((creator) => creator.username === draft.username) && draft.subject.trim() && draft.body.trim());

  function currentCampaign(): Campaign {
    return { id: activeId || crypto.randomUUID(), brief, creators, drafts, updatedAt: new Date().toISOString(), ...((saved.find((item) => item.id === activeId)?.sheetId) ? { sheetId: saved.find((item) => item.id === activeId)?.sheetId, sheetUrl: saved.find((item) => item.id === activeId)?.sheetUrl } : {}) };
  }

  function saveCampaign(silent = false) {
    if (!brief.title.trim()) { notify("Give this campaign a title before saving it."); return null; }
    const campaign = currentCampaign();
    const next = [campaign, ...saved.filter((item) => item.id !== campaign.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setActiveId(campaign.id);
    setSaved(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (!silent) notify(`“${brief.title}” saved on this device.`);
    return campaign;
  }

  function persistSnapshot(campaign: Campaign) {
    const nextCampaign = { ...campaign, updatedAt: new Date().toISOString() };
    const next = [nextCampaign, ...saved.filter((item) => item.id !== nextCampaign.id)];
    setSaved(next); setActiveId(nextCampaign.id); localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function newCampaign() {
    setActiveId(""); setBrief(emptyBrief); setCreators([]); setDrafts([]); setReviewed(false); setSendResults(null); setView("brief");
  }

  function loadCampaign(campaign: Campaign) {
    setActiveId(campaign.id); setBrief(campaign.brief); setCreators(campaign.creators || []); setDrafts(campaign.drafts || []); setView(campaign.creators?.length ? "profiles" : "brief"); setReviewed(false); setSendResults(null);
  }

  async function proceedToProfiles(event: React.FormEvent) {
    event.preventDefault();
    if (!brief.title.trim()) { notify("Add a campaign title before you continue."); return; }
    const campaign = saveCampaign(true);
    if (!campaign) return;
    const initial = creators.length ? creators : sampleCreators.map((creator) => ({ ...creator }));
    setCreators(initial);
    setView("profiles");
    setLoading("rank");
    try {
      const response = await fetch("/api/ai/rank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief, candidates: initial.map(({ username, name, bio, category, location, followers }) => ({ username, name, bio, category, location, followers })) }) });
      const result = await response.json() as { ranked?: Array<{ username: string; score: number; reason: string; summary: string }>; error?: string };
      if (!response.ok || !result.ranked?.length) throw new Error(result.error || "Could not score profiles.");
      const indexed = new Map(result.ranked.map((item) => [item.username, item]));
      const updated = initial.map((creator) => { const ranked = indexed.get(creator.username); return ranked ? { ...creator, score: ranked.score, reason: ranked.reason, bio: ranked.summary || creator.bio } : creator; });
      setCreators(updated); persistSnapshot({ ...campaign, creators: updated });
      notify("Profile scores updated.");
    } catch (error) {
      setCreators(initial); persistSnapshot({ ...campaign, creators: initial });
      notify(`${error instanceof Error ? error.message : "Scoring is unavailable."} Sample scores are shown.`);
    } finally { setLoading(""); }
  }

  function updateCreator(username: string, update: Partial<Creator>) {
    const next = creators.map((creator) => creator.username === username ? { ...creator, ...update } : creator);
    setCreators(next);
    const old = saved.find((campaign) => campaign.id === activeId);
    if (old) {
      const campaign = { ...old, creators: next, updatedAt: new Date().toISOString() };
      const all = [campaign, ...saved.filter((item) => item.id !== activeId)];
      setSaved(all); localStorage.setItem(storageKey, JSON.stringify(all));
    }
  }

  function addCreator(event: React.FormEvent) {
    event.preventDefault();
    const username = manualForm.username.trim().replace(/^@/, "");
    const followers = Number(manualForm.followers.replace(/[^\d]/g, ""));
    if (!manualForm.name.trim() || !username || !manualForm.category.trim()) { notify("Add a name, Instagram username, and category."); return; }
    if (creators.some((creator) => creator.username.toLowerCase() === username.toLowerCase())) { notify("That Instagram username is already in this campaign."); return; }
    const fresh: Creator = { username, name: manualForm.name.trim(), category: manualForm.category.trim(), location: manualForm.location.trim() || "Location not listed", followers, score: 0, distance: manualForm.distance.trim() ? Number(manualForm.distance.replace(/[^\d.]/g, "")) : null, bio: manualForm.bio.trim() || "No summary added yet.", tags: [], email: manualForm.email.trim(), avatar: manualForm.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: "sage", status: "New lead", isSample: false };
    setCreators((current) => [fresh, ...current]);
    setManualForm({ name: "", username: "", category: "", location: "", followers: "", distance: "", email: "", bio: "" });
    setManualOpen(false); notify("Profile added. Confirm the public details before outreach.");
  }

  function removeCreator(username: string) {
    setCreators((current) => current.filter((creator) => creator.username !== username));
    notify("Profile removed from this campaign.");
  }

  async function exportSheet() {
    if (!connections.google) { notify("Connect Google first to create and open the campaign Sheet."); return; }
    const campaign = saveCampaign(true);
    if (!campaign) return;
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setLoading("sheet");
    try {
      const response = await fetch("/api/sheets/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignTitle: brief.title, creators, spreadsheetId: campaign.sheetId }) });
      const result = await response.json() as { spreadsheetId?: string; spreadsheetUrl?: string; error?: string };
      if (!response.ok || !result.spreadsheetId || !result.spreadsheetUrl) throw new Error(result.error || "Sheet export failed.");
      const updated = { ...campaign, creators, sheetId: result.spreadsheetId, sheetUrl: result.spreadsheetUrl, updatedAt: new Date().toISOString() };
      const next = [updated, ...saved.filter((item) => item.id !== campaign.id)];
      setSaved(next); localStorage.setItem(storageKey, JSON.stringify(next));
      if (tab) tab.location.href = result.spreadsheetUrl; else window.location.assign(result.spreadsheetUrl);
      notify("Campaign details exported with status tabs in Google Sheets.");
    } catch (error) {
      tab?.close(); notify(error instanceof Error ? error.message : "Could not export to Google Sheets.");
    } finally { setLoading(""); }
  }

  async function generateDrafts() {
    const recipients = creators.filter((creator) => !creator.isSample && creator.status === "New lead" && creator.email && !creator.email.endsWith(".example")).slice(0, 20);
    if (!recipients.length) { setDrafts([]); setView("emails"); notify("No real creator recipients are ready yet. Sample records remain excluded from drafting and sending."); return; }
    setLoading("drafts"); setReviewed(false); setSendResults(null);
    try {
      const response = await fetch("/api/ai/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign: brief, creators: recipients.map(({ username, name, email, category, bio }) => ({ username, name, email, category, bio })) }) });
      const result = await response.json() as { drafts?: Draft[]; error?: string };
      if (!response.ok || !result.drafts?.length) throw new Error(result.error || "No email drafts were returned.");
      const withSource = result.drafts.map((draft) => ({ ...draft, source: "AI" as const }));
      setDrafts(withSource); setView("emails");
      const campaign = currentCampaign();
      const updated = { ...campaign, drafts: withSource, updatedAt: new Date().toISOString() };
      const next = [updated, ...saved.filter((item) => item.id !== updated.id)];
      setSaved(next); setActiveId(updated.id); localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) {
      const templates = recipients.map((creator) => makeTemplate(brief, creator));
      setDrafts(templates); setView("emails");
      const campaign = currentCampaign();
      persistSnapshot({ ...campaign, drafts: templates });
      notify(`${error instanceof Error ? error.message : "Could not prepare drafts."} Editable starter text is shown instead.`);
    }
    finally { setLoading(""); }
  }

  function editDraft(username: string, key: "subject" | "body", value: string) {
    setReviewed(false);
    setDrafts((current) => current.map((draft) => draft.username === username ? { ...draft, [key]: value } : draft));
  }

  async function sendReviewedDrafts() {
    if (!reviewed) { notify("Confirm that you reviewed every recipient and message before sending."); return; }
    const outgoing = sendableDrafts.map((draft) => ({ username: draft.username, to: creators.find((creator) => creator.username === draft.username)?.email || "", subject: draft.subject, body: draft.body }));
    if (!outgoing.length) { notify("No eligible reviewed email drafts are ready to send."); setSendConfirm(false); return; }
    setLoading("send");
    try {
      const response = await fetch("/api/gmail/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: true, messages: outgoing }) });
      const result = await response.json() as { results?: Array<{ username: string; ok: boolean }>; sent?: number; failed?: number; error?: string };
      if (!response.ok || !result.results) throw new Error(result.error || "Gmail send failed.");
      for (const item of result.results) if (item.ok) updateCreator(item.username, { status: "Mailed", lastMailedAt: new Date().toISOString() });
      setSendResults({ sent: result.sent || 0, failed: result.failed || 0 }); setSendConfirm(false); setReviewed(false);
      const latestCreators = creators.map((creator) => result.results?.some((item) => item.ok && item.username === creator.username) ? { ...creator, status: "Mailed" as Status, lastMailedAt: new Date().toISOString() } : creator);
      const campaign = { ...currentCampaign(), creators: latestCreators, drafts, updatedAt: new Date().toISOString() };
      const next = [campaign, ...saved.filter((item) => item.id !== campaign.id)];
      setSaved(next); localStorage.setItem(storageKey, JSON.stringify(next)); setCreators(latestCreators);
      notify(`${result.sent || 0} email${result.sent === 1 ? "" : "s"} sent${result.failed ? ` · ${result.failed} failed` : ""}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Could not send campaign emails."); }
    finally { setLoading(""); }
  }

  async function connect(provider: "google" | "instagram") {
    const popup = window.open(`/api/connect/${provider === "google" ? "google" : "instagram"}/start`, "_blank");
    if (popup) popup.opener = null;
    if (!popup) notify("Allow pop-ups for this local app so the provider login can open in a new tab.");
    else notify(`Opening ${provider === "google" ? "Google" : "Instagram"} authorization in a new tab.`);
  }

  const campaignTabs = <div className="step-nav" aria-label="Campaign progress">
    {[{ key: "brief", label: "Campaign brief", number: "01" }, { key: "profiles", label: "Review profiles", number: "02" }, { key: "emails", label: "Email review", number: "03" }].map((step, index) => <button key={step.key} className={`step-nav-item ${view === step.key ? "current" : (["brief", "profiles", "emails"].indexOf(view) > index ? "done" : "")}`} onClick={() => { if (step.key === "brief") setView("brief"); else if (step.key === "profiles" && creators.length) setView("profiles"); else if (step.key === "emails" && drafts.length) setView("emails"); }}><span className="step-nav-num">{step.number}</span><span>{step.label}</span></button>)}
  </div>;

  const connectionCard = (provider: "google" | "instagram") => {
    const isGoogle = provider === "google";
    const connected = isGoogle ? connections.google : connections.instagram;
    const account = isGoogle ? connections.googleAccount : connections.instagramAccount;
    return <article className={`integration-card ${connected ? "connected" : ""}`} key={provider}>
      <div className={`integration-icon ${isGoogle ? "google-icon" : "instagram-icon"}`}><Icon name={isGoogle ? "google" : "instagram"} size={20}/></div>
      <div className="integration-copy"><strong>{isGoogle ? "Google account" : "Instagram account"}</strong><span>{connected ? account || "Connected" : isGoogle ? "Sheets export + Gmail outreach" : "Professional account connection"}</span></div>
      <span className={`connection-status ${connected ? "online" : "offline"}`}><i></i>{connected ? "Connected" : "Not connected"}</span>
      <button type="button" className={connected ? "integration-reconnect" : "integration-connect"} onClick={() => void connect(provider)}>{connected ? "Reconnect" : "Connect account"}<Icon name="external" size={14}/></button>
    </article>;
  };

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand-lockup" href="#top" aria-label="InSearch home"><span className="brand-mark"><span></span><span></span><span></span><span></span></span><span>insearch<span className="brand-period">.</span></span></a>
      <div className="workspace-switcher"><div className="workspace-monogram">M</div><div className="workspace-name"><strong>Morrow Studio</strong><span>Personal workspace</span></div><Icon name="down" size={15}/></div>
      <div className="nav-label">CAMPAIGNS</div>
      <nav className="main-nav" aria-label="Campaign navigation">
        <button className={`nav-link nav-button ${view === "brief" ? "active" : ""}`} onClick={newCampaign}><Icon name="plus"/><span>Campaign brief</span></button>
        <button className={`nav-link nav-button ${view === "saved" ? "active" : ""}`} onClick={() => setView("saved")}><Icon name="grid"/><span>Saved campaigns</span>{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>
      </nav>
      <div className="sidebar-spacer"></div>
      <div className="plan-card"><div className="plan-icon"><Icon name="spark" size={17}/></div><div><strong>Review before sending</strong></div></div>
      <div className="sidebar-profile"><div className="profile-avatar">S</div><div className="profile-name"><strong>Sankar</strong><span>Project owner</span></div></div>
    </aside>

    <section className="main-area" id="top">
      <header className="topbar"><div className="breadcrumbs"><span>Campaigns</span><span className="crumb-sep">/</span><strong>{view === "brief" ? "Campaign brief" : view === "profiles" ? "Profile review" : view === "emails" ? "Email review" : "Saved campaigns"}</strong></div><div className="topbar-actions">{view === "brief" && !accountsOpen && <button type="button" className="quiet-button accounts-reopen" onClick={() => setAccountsOpen(true)}><Icon name="settings" size={15}/>Show accounts</button>}<span className="local-badge"><span></span>Saved on this device</span><button className="top-avatar" aria-label="Sankar profile">S</button></div></header>
      <div className="content-wrap">
        {view !== "saved" && <div className="page-heading">
          <div><div className="eyebrow"><span className="eyebrow-line"></span>INSEARCH CREATOR WORKSPACE</div><h1>{view === "brief" ? <>Start with the campaign<span>.</span></> : view === "profiles" ? <>A shortlist to make yours<span>.</span></> : <>A good first hello<span>.</span></>}</h1><p>{view === "brief" ? "Write the brief and connect your accounts." : view === "profiles" ? "Review, sort, and choose profiles." : "Edit each message before approving the send."}</p></div>
          {campaignTabs}
        </div>}

        {view === "brief" && <div className={`brief-layout ${accountsOpen ? "" : "accounts-closed"}`}>
          <section className="brief-panel" aria-labelledby="brief-heading">
            <div className="panel-header"><div><span className="section-kicker">01 · CAMPAIGN</span><h2 id="brief-heading">Campaign brief</h2></div><span className="required-tag">Title required</span></div>
            <form className="brief-form" onSubmit={proceedToProfiles}>
              <div className="field-row two-col"><label className="field"><span>Campaign title</span><input value={brief.title} onChange={(event) => setBrief({ ...brief, title: event.target.value })} placeholder="e.g. Spring, a little greener" required /></label><label className="field"><span>Brand or business</span><input value={brief.brand} onChange={(event) => setBrief({ ...brief, brand: event.target.value })} placeholder="Your brand name" /></label></div>
              <label className="field"><span>Campaign details</span><textarea value={brief.details} onChange={(event) => setBrief({ ...brief, details: event.target.value })} rows={4} placeholder="What should creators know about the collaboration?" /></label>
              <label className="field"><span>Creator topics <i>Separate with commas</i></span><input value={brief.topics} onChange={(event) => setBrief({ ...brief, topics: event.target.value })} placeholder="slow living, beauty, travel" /></label>
              <div className="field-row two-col"><label className="field"><span>Location</span><div className="input-with-icon"><Icon name="pin" size={16}/><input value={brief.location} onChange={(event) => setBrief({ ...brief, location: event.target.value })} placeholder="City, region, or country" /></div></label><label className="field"><span>Follower range</span><div className="select-wrap"><select value={brief.followers} onChange={(event) => setBrief({ ...brief, followers: event.target.value })}><option>Any audience size</option><option>Under 10,000</option><option>10,000 – 100,000</option><option>100,000 – 500,000</option><option>Over 500,000</option></select><Icon name="down" size={16}/></div></label></div>
              <label className="field"><span>Hashtags to explore <i>Optional</i></span><input value={brief.hashtags} onChange={(event) => setBrief({ ...brief, hashtags: event.target.value })} placeholder="#slowfashion  #madeinindia" /></label>
              <label className="field"><span>Example profiles <i>Optional · one username or URL per line</i></span><textarea className="url-textarea" rows={2} value={brief.examples} onChange={(event) => setBrief({ ...brief, examples: event.target.value })} placeholder="@creatorname or https://instagram.com/creatorname" /></label>
              <div className="form-footer"><span><span className="save-check"><Icon name="check" size={11}/></span> Saved campaigns stay in this browser</span><div className="brief-actions"><button type="button" className="quiet-button" onClick={() => saveCampaign()}>Save campaign</button><button type="submit" className="primary-button" disabled={loading === "rank"}>{loading === "rank" ? <><span className="button-spinner"></span>Preparing list…</> : <>Proceed to profiles <Icon name="arrow" size={16}/></>}</button></div></div>
            </form>
          </section>
          {accountsOpen && <aside className="connections-panel"><div className="panel-header"><div><span className="section-kicker">02 · CONNECT</span><h2>Accounts</h2></div><button type="button" className="icon-button" onClick={() => setAccountsOpen(false)} aria-label="Close accounts panel" title="Close"><Icon name="close" size={16}/></button></div>
            <div className="integration-list">{connectionCard("instagram")}{connectionCard("google")}</div>
            <div className="connection-note"><p>Instagram login doesn’t search profiles. Add profiles manually.</p></div>
          </aside>}
        </div>}

        {view === "profiles" && <section className="profile-view" aria-labelledby="profile-heading">
          <div className="stage-toolbar"><div><span className="section-kicker">CAMPAIGN · {brief.title || "Untitled campaign"}</span><h2 id="profile-heading">Profile shortlist <span className="count-bubble">{creators.length}</span></h2><p>Sample profiles · add profiles manually</p></div><div className="stage-actions"><button className="quiet-button" onClick={() => saveCampaign()}>Save results</button><button className="export-button" onClick={() => void exportSheet()} disabled={loading === "sheet"}><Icon name="download" size={16}/>{loading === "sheet" ? "Exporting…" : "Extract to Google Sheet"}<Icon name="external" size={14}/></button></div></div>
          <div className="profile-controls"><label className="search-box"><Icon name="search" size={16}/><input aria-label="Search profiles" placeholder="Search this campaign" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="sort-control"><span>Sort by</span><div className="select-wrap compact"><select value={sort} aria-label="Sort profiles" onChange={(event) => setSort(event.target.value)}><option value="score">Similarity score</option><option value="followers">Follower count</option><option value="distance">Distance</option></select><Icon name="down" size={14}/></div></div><button className="secondary-button" onClick={() => setManualOpen(true)}><Icon name="plus" size={15}/>Add profile manually</button></div>
          <div className="status-tabs" role="group" aria-label="Filter by contact status">{["All profiles", ...statuses].map((value) => <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{value}<span>{value === "All profiles" ? creators.length : creators.filter((creator) => creator.status === value).length}</span></button>)}</div>
          <div className="candidate-table" id="profile-list"><div className="candidate-head"><span>CREATOR</span><span>FIT</span><span>FOLLOWERS</span><span>LOCATION</span><span>STATUS</span><span></span></div>
            {sortedCreators.map((creator) => <article className="candidate-row" key={creator.username}>
              <div className="candidate-person"><div className={`creator-avatar ${creator.color}`}>{creator.avatar}</div><div className="candidate-identity"><strong>{creator.name}{creator.isSample && <span className="fixture-badge">SAMPLE</span>}</strong><a href={`https://www.instagram.com/${encodeURIComponent(creator.username)}/`} target="_blank" rel="noreferrer">@{creator.username} <Icon name="external" size={12}/></a><span>{creator.category}</span></div></div>
              <div className="candidate-fit"><span className="fit-score">{creator.score}<small>%</small></span><span className="fit-reason">{creator.reason || "Manually added profile"}</span></div>
              <strong className="candidate-followers">{creator.followers ? creator.followers.toLocaleString() : "—"}</strong><span className="candidate-location"><Icon name="pin" size={14}/>{creator.location || "—"}</span>
              <label className="status-select"><span className="sr-only">Contact status for {creator.name}</span><select value={creator.status} onChange={(event) => updateCreator(creator.username, { status: event.target.value as Status })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><Icon name="down" size={13}/></label>
              <button className="row-more" onClick={() => removeCreator(creator.username)} aria-label={`Remove ${creator.name}`} title="Remove profile"><Icon name="trash" size={16}/></button>
            </article>)}
            {sortedCreators.length === 0 && <div className="empty-state"><span><Icon name="search" size={20}/></span><strong>No profiles in this view</strong><p>Change the filter or add a verified public profile manually.</p></div>}
          </div>
          <div className="profile-stage-footer"><span><span className="live-dot"></span>{sortedCreators.length} shown · {eligible.length} eligible for first-contact email</span><div><button className="quiet-button" onClick={() => setView("brief")}><Icon name="back" size={15}/>Back to brief</button><button className="primary-button" onClick={() => void generateDrafts()} disabled={loading === "drafts"}>{loading === "drafts" ? <><span className="button-spinner"></span>Writing drafts…</> : <>Proceed to email review <Icon name="arrow" size={16}/></>}</button></div></div>
        </section>}

        {view === "emails" && <section className="email-stage" aria-labelledby="emails-heading">
          <div className="stage-toolbar"><div><span className="section-kicker">CAMPAIGN · {brief.title || "Untitled campaign"}</span><h2 id="emails-heading">Review each email <span className="count-bubble">{draftRecipients.length}</span></h2><p>Each message is editable. Opt-outs and prior sends are excluded. Maximum 20 per reviewed send batch.</p></div><button className="quiet-button" onClick={() => setView("profiles")}><Icon name="back" size={15}/>Back to profiles</button></div>
          {eligible.length === 0 ? <div className="email-empty"><span className="sample-spark"><Icon name="mail" size={19}/></span><h3>No real recipients ready to email</h3><p>Sample fixtures are excluded from sending. Add a manually verified public business email to a profile, or wait until an approved discovery source is connected.</p><button className="secondary-button" onClick={() => setView("profiles")}>Return to profile review <Icon name="arrow" size={14}/></button></div> : draftRecipients.length === 0 ? <div className="email-empty"><span className="sample-spark"><Icon name="mail" size={19}/></span><h3>{sendResults?.sent ? "This batch is complete" : "Drafts are ready to prepare"}</h3><p>{sendResults?.sent ? `${eligible.length} more profiles are eligible for a later batch.` : "Generate editable messages for the next eligible group. Up to 20 recipients are drafted at a time."}</p><button className="primary-button" onClick={() => void generateDrafts()} disabled={loading === "drafts"}>{loading === "drafts" ? "Writing drafts…" : "Draft next group"} <Icon name="arrow" size={14}/></button></div> : <>
            <div className="source-banner email-ai-banner"><span>Review recipient details and edit the message before sending.</span><button className="quiet-button" onClick={() => void generateDrafts()} disabled={loading === "drafts"}>Rewrite drafts</button></div>
            <div className="draft-list">{draftRecipients.map((creator) => {
              const draft = drafts.find((item) => item.username === creator.username) || makeTemplate(brief, creator);
              return <article className="draft-card" key={creator.username}><div className="draft-card-head"><div className={`creator-avatar ${creator.color}`}>{creator.avatar}</div><div><strong>{creator.name}</strong><span>{creator.email} · @{creator.username}</span></div><span className={`draft-source ${draft.source === "AI" ? "ai" : "template"}`}>{draft.source === "AI" ? "Suggested draft" : "Starter text"}</span></div><label className="field"><span>Subject</span><input value={draft.subject} onChange={(event) => editDraft(creator.username, "subject", event.target.value)} /></label><label className="field"><span>Message</span><textarea rows={9} value={draft.body} onChange={(event) => editDraft(creator.username, "body", event.target.value)} /></label></article>;
            })}</div>
            <div className="email-review-footer"><label className="review-confirm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)}/><span></span><span>I reviewed each recipient and message, including the opt-out line.</span></label><button className="primary-button" onClick={() => setSendConfirm(true)} disabled={!reviewed || sendableDrafts.length === 0 || loading === "send"}>Review send <Icon name="arrow" size={16}/></button></div>
            {sendResults && <div className="send-results" role="status"><Icon name="check" size={16}/>{sendResults.sent} sent · {sendResults.failed} failed. Sent contacts were moved to Mailed.</div>}
          </>}
        </section>}

        {view === "saved" && <section className="saved-view"><div className="saved-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span>YOUR WORK</div><h1>Saved campaigns<span>.</span></h1><p>Campaigns and results stored locally in this browser.</p></div><button className="primary-button" onClick={newCampaign}><Icon name="plus" size={16}/>New campaign</button></div>
          {saved.length ? <div className="saved-list">{saved.map((campaign) => <article className="saved-campaign" key={campaign.id}><div className="saved-campaign-mark"><Icon name="grid" size={18}/></div><div className="saved-campaign-info"><strong>{campaign.brief.title || "Untitled campaign"}</strong><span>{campaign.brief.brand || "No brand"} · {campaign.creators.length} profiles · Updated {new Date(campaign.updatedAt).toLocaleDateString()}</span><div className="saved-badges"><span>{campaign.creators.filter((creator) => creator.status === "Mailed").length} mailed</span><span>{campaign.creators.filter((creator) => creator.status === "Accepted").length} accepted</span><span>{campaign.creators.filter((creator) => creator.status === "Opt-out").length} opted out</span></div></div><div className="saved-actions">{campaign.sheetUrl && <a className="sheet-link" href={campaign.sheetUrl} target="_blank" rel="noreferrer">Open Sheet <Icon name="external" size={13}/></a>}<button className="secondary-button" onClick={() => loadCampaign(campaign)}>Open campaign <Icon name="arrow" size={14}/></button><button className="row-more" onClick={() => { const next = saved.filter((item) => item.id !== campaign.id); setSaved(next); localStorage.setItem(storageKey, JSON.stringify(next)); notify("Campaign removed from this browser."); }} aria-label={`Delete ${campaign.brief.title}`}><Icon name="trash" size={15}/></button></div></article>)}</div> : <div className="saved-empty"><span className="sample-spark"><Icon name="grid" size={19}/></span><h2>No saved campaigns yet</h2><p>Save a campaign brief or results and they’ll be here the next time you open this browser.</p><button className="primary-button" onClick={newCampaign}><Icon name="plus" size={15}/>Create your first campaign</button></div>}
        </section>}

        <footer className="page-footer"><span>Thoughtful partnerships, one step at a time.</span><span>INSEARCH <i>·</i> CAMPAIGN WORKSPACE</span></footer>
      </div>
    </section>

    {manualOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setManualOpen(false); }}><section className="email-modal manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-title"><div className="modal-heading"><div><span className="section-kicker">VERIFIED PUBLIC DETAILS</span><h2 id="manual-title">Add a profile manually</h2><p>Enter details you have reviewed from the creator’s public profile.</p></div><button className="icon-button" onClick={() => setManualOpen(false)} aria-label="Close"><Icon name="close"/></button></div><form className="manual-form" onSubmit={addCreator}><div className="field-row two-col"><label className="field"><span>Name</span><input value={manualForm.name} onChange={(event) => setManualForm({ ...manualForm, name: event.target.value })} required /></label><label className="field"><span>Instagram username</span><input value={manualForm.username} onChange={(event) => setManualForm({ ...manualForm, username: event.target.value })} placeholder="@username" required /></label></div><label className="field"><span>Category / topics</span><input value={manualForm.category} onChange={(event) => setManualForm({ ...manualForm, category: event.target.value })} required /></label><div className="field-row two-col"><label className="field"><span>Public location</span><input value={manualForm.location} onChange={(event) => setManualForm({ ...manualForm, location: event.target.value })} /></label><label className="field"><span>Follower count</span><input inputMode="numeric" value={manualForm.followers} onChange={(event) => setManualForm({ ...manualForm, followers: event.target.value })} /></label></div><label className="field"><span>Approx. distance in km <i>Optional, manually verified</i></span><input inputMode="decimal" value={manualForm.distance} onChange={(event) => setManualForm({ ...manualForm, distance: event.target.value })} /></label><label className="field"><span>Public business email <i>Optional</i></span><input type="email" value={manualForm.email} onChange={(event) => setManualForm({ ...manualForm, email: event.target.value })} placeholder="business@example.com" /></label><label className="field"><span>Profile summary / evidence</span><textarea rows={3} value={manualForm.bio} onChange={(event) => setManualForm({ ...manualForm, bio: event.target.value })} /></label><div className="modal-actions"><button type="button" className="quiet-button" onClick={() => setManualOpen(false)}>Cancel</button><button className="primary-button" type="submit">Add to campaign <Icon name="check" size={15}/></button></div></form></section></div>}

    {sendConfirm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSendConfirm(false); }}><section className="email-modal send-modal" role="dialog" aria-modal="true" aria-labelledby="send-title"><div className="modal-heading"><div><span className="section-kicker">FINAL REVIEW</span><h2 id="send-title">Send {sendableDrafts.length} email{sendableDrafts.length === 1 ? "" : "s"}?</h2><p>This sends each reviewed message from your connected Gmail account to its listed recipient.</p></div><button className="icon-button" onClick={() => setSendConfirm(false)} aria-label="Close confirmation"><Icon name="close"/></button></div><div className="send-recipient-list">{sendableDrafts.map((draft) => { const creator = creators.find((item) => item.username === draft.username); return <div key={draft.username}><span>{creator?.name || draft.username}</span><span>{creator?.email}</span></div>; })}</div><div className="modal-notice"><Icon name="clock" size={15}/> This action sends real email. Opt-out and previously mailed profiles are excluded.</div><div className="modal-actions"><button className="quiet-button" onClick={() => setSendConfirm(false)}>Go back to review</button><button className="primary-button send-final-button" onClick={() => void sendReviewedDrafts()} disabled={loading === "send"}>{loading === "send" ? "Sending…" : `Send ${sendableDrafts.length} email${sendableDrafts.length === 1 ? "" : "s"}`} <Icon name="arrow" size={15}/></button></div></section></div>}
    {toast && <div className="toast" role="status"><span className="toast-icon"><Icon name="check" size={15}/></span>{toast}</div>}
  </main>;
}
