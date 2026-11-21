import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Provider = "google" | "instagram";
export type ProviderTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  account?: string;
  account_id?: string;
};

const dataDir = path.join(process.cwd(), ".local-data");

function encryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error("APP_ENCRYPTION_KEY must be a 32-byte hex value.");
  return Buffer.from(value, "hex");
}

function tokenPath(provider: Provider) {
  return path.join(dataDir, `${provider}.enc`);
}

function seal(value: ProviderTokens) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function unseal(value: string): ProviderTokens {
  const data = Buffer.from(value, "base64url");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as ProviderTokens;
}

export async function saveProviderTokens(provider: Provider, tokens: ProviderTokens) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(tokenPath(provider), seal(tokens), { mode: 0o600 });
}

export async function readProviderTokens(provider: Provider): Promise<ProviderTokens | null> {
  try {
    return unseal(await readFile(tokenPath(provider), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function connectedProviders() {
  const [google, instagram] = await Promise.all([readProviderTokens("google"), readProviderTokens("instagram")]);
  return { google: Boolean(google?.refresh_token || google?.access_token), instagram: Boolean(instagram?.access_token), googleAccount: google?.account || null, instagramAccount: instagram?.account || null };
}

export async function getGoogleAccessToken() {
  const tokens = await readProviderTokens("google");
  if (!tokens) throw new Error("Connect a Google account first.");
  if (tokens.expires_at && tokens.expires_at > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("Google authorization expired. Reconnect your account.");

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !result.access_token) throw new Error("Google authorization expired. Reconnect your account.");
  const updated = { ...tokens, access_token: result.access_token, expires_at: Date.now() + (result.expires_in || 3600) * 1000 };
  await saveProviderTokens("google", updated);
  return updated.access_token;
}

export async function getInstagramAccessToken() {
  const tokens = await readProviderTokens("instagram");
  if (!tokens) throw new Error("Connect an Instagram professional account first.");
  if (tokens.expires_at && tokens.expires_at > Date.now() + 7 * 24 * 60 * 60 * 1000) return tokens.access_token;
  const params = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: tokens.access_token });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params}`);
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !result.access_token) throw new Error("Instagram authorization expired. Reconnect your account.");
  const updated = { ...tokens, access_token: result.access_token, expires_at: Date.now() + (result.expires_in || 5_184_000) * 1000 };
  await saveProviderTokens("instagram", updated);
  return updated.access_token;
}
