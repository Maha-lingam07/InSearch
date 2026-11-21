# InSearch

InSearch is a personal creator research and outreach workspace. It separates campaign setup, profile review, email drafting, and saved campaigns so the research data does not crowd the brief screen.

## Run locally

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. The dev server binds to loopback only.

Copy `.env.example` to `.env`, then add your NVIDIA NIM and OpenRouter keys. Generate a 32-byte hex `APP_ENCRYPTION_KEY` using the command in `.env.example`. Keep `.env` private; it is ignored by Git.

## Account connections

The Connect buttons open the provider authorization flow in a new tab. They do not ask for provider passwords inside InSearch. Configure a Google OAuth web client and a Meta app first:

- Google: enable Google Sheets API and Gmail API, configure the OAuth consent screen/test users, and register `http://localhost:3000/api/connect/google/callback` as an authorized redirect URI. InSearch requests Sheets write access and Gmail send access.
- Instagram: configure Instagram Login in a Meta app, add `http://localhost:3000/api/connect/instagram/callback` as the redirect URI, and connect a professional creator or business account.

OAuth credentials stay server-side. Access and refresh tokens are encrypted in `.local-data/` using `APP_ENCRYPTION_KEY`; that directory is ignored by Git.

## What works in this build

- Campaign briefs and saved campaign/result records are stored in this browser's local storage.
- Candidate records can be entered manually and sorted by similarity score, follower count, or an approximate distance you supply.
- `nvidia/nemotron-3-ultra-550b-a55b` scores the candidate records supplied to the server route.
- `nvidia/nemotron-3.5-super-vl:free` drafts messages through OpenRouter.
- An authorized Google account can create or update a campaign spreadsheet with `Profiles`, `New leads`, `Mailed`, `Accepted`, `Opt-out`, and `No reply` tabs.
- An authorized Gmail account can send individually reviewed messages after a separate send confirmation. Sample fixtures are never eligible recipients.

## Discovery limitation

Connecting an Instagram professional account does not enable unrestricted keyword search across Instagram. The current UI labels fixtures as samples and supports manually verified public profile details. A live discovery provider still needs to be selected and authorized. Meta's Content Library account search is documented for its research environment; Instagram Graph API discovery is constrained to supported professional-account/hashtag flows and permissions. Model function calling is an application-to-tool interface; it does not provide MCP access or social-network search by itself.

See the [Meta Instagram account reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/) and [Meta Content Library account guide](https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/ig-accounts) before enabling a live source.

## Portfolio note

Do not commit `.env`, `.local-data/`, or real outreach records. Use authorized test accounts and a small test campaign before sending messages.
