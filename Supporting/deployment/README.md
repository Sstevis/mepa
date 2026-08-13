# Mepa Ledger — Deployment Guide

## Project name

**Mepa Ledger** — offline-first business ledger for Ghanaian market traders (client-side PWA).

## Deployed instance

| Field | Value |
|-------|-------|
| **Live application** | https://mepa-wheat.vercel.app/ |
| **Source repository** | https://github.com/Sstevis/mepa |
| **Hosting platform** | Vercel |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Authentication** | Not applicable in this prototype |
| **Test credentials** | Not applicable |
| **Data storage** | Browser-local IndexedDB; no shared server database |

SPA routing on Vercel is handled by root [`vercel.json`](../../vercel.json). Netlify-style fallback remains in `client/public/_redirects`.

## Build architecture

| Layer | Technology |
|-------|------------|
| Build tool | Vite 5 (`vite.config.ts` at repo root) |
| App root | `client/` (HTML entry: `client/index.html`) |
| Source | `client/src/` (React 18 + TypeScript) |
| Routing | Wouter (client-side SPA routes) |
| Data | Dexie.js / IndexedDB (browser only — no backend) |
| Styling | Tailwind CSS 3 |
| PWA | `vite-plugin-pwa` (service worker + web manifest) |
| Tests | Vitest (`client/src/**/*.test.ts`) |

**Production build flow:**

1. TypeScript type-check: `tsc --noEmit` (via `npm run typecheck`)
2. Vite bundles `client/` → static assets in **`dist/`** at repo root
3. PWA plugin generates `dist/sw.js`, `dist/manifest.webmanifest`, and precache manifest

There is **no Node server** in production. Deploy the contents of `dist/` to any static host or PWA-capable CDN.

## Build command

From the project root:

```bash
npm install
npm run typecheck
npm test
npm run build
```

Optional local production preview:

```bash
npm run preview
```

Default preview URL: `http://127.0.0.1:4173/`

## Output directory

**`dist/`** (repo root)

Typical contents after a successful build:

```
dist/
├── index.html
├── assets/
│   ├── index-*.css
│   └── index-*.js
├── icon.svg
├── manifest.webmanifest
├── registerSW.js
├── sw.js
├── workbox-*.js
└── _redirects          # SPA fallback for Netlify-style hosts
```

## Hosting assumptions

- **Static file hosting** only (Netlify, Vercel static, GitHub Pages, Cloudflare Pages, Azure Static Web Apps, S3 + CloudFront, etc.)
- **HTTPS** recommended (required for PWA install and service worker on most browsers)
- **SPA fallback required:** all unknown paths must serve `index.html` so Wouter can handle client routes. This repo includes `vercel.json` for Vercel and `client/public/_redirects` for Netlify.
- **No server-side API** — the app does not call a backend in this prototype
- **Browser support:** modern Chromium-based Android browsers and current desktop Chrome/Edge/Firefox

## IndexedDB single-device limitation

- All contacts, obligations, and payments are stored in the browser’s **IndexedDB** (`MepaLedger` database via Dexie).
- Data is **per browser / per device**. Clearing site data, using private browsing, or switching devices does not sync records.
- First visit on an empty database runs **seed data** once (4 demo contacts). To reset demo data: DevTools → Application → IndexedDB → delete `MepaLedger` → reload.
- CSV export is the only built-in backup path in this prototype.

## Production smoke-test checklist

Run after deploying `dist/` (or after `npm run preview` locally):

- [ ] **`/`** — Dashboard loads; balance cards visible
- [ ] **`/contacts`** — Contact list with seed names (Kwame, Ama, Kofi, Esi)
- [ ] **`/contacts/seed-contact-kofi`** — Kofi detail; Beverages obligation GH₵2,500
- [ ] **`/obligations/seed-obl-kofi/pay`** — Payment form loads for Kofi’s obligation
- [ ] **`/export`** — Export page loads; CSV download works when data exists
- [ ] **Deep-link refresh** — Reload each URL above; page must not 404 (SPA fallback)
- [ ] **PWA** — Service worker registers; app installable on Android Chrome (optional)
- [ ] **Offline** — Disable network; app shell still loads from cache; IndexedDB CRUD works
- [ ] **Payment validation** — Overpayment on Kofi shows inline error; no navigation away
- [ ] **Receipt verify** — `/verify?data=...` shows “not independently verified” wording

## Rollback / redeployment notes

- **Rollback:** Redeploy the previous `dist/` artifact (or revert to the prior Git tag/commit and rebuild). Static hosts usually keep deployment history (Netlify/Vercel deploy list).
- **Redeploy:** Run `npm run build` and upload/replace the entire `dist/` folder. Do not partial-upload — asset filenames are content-hashed and `index.html` references current hashes.
- **Cache:** After redeploy, hard-refresh or wait for service worker `autoUpdate` (vite-plugin-pwa). If users see stale UI, clear site data or unregister the service worker once.
- **Database:** Redeploying does **not** reset user IndexedDB data on their device. Schema changes in future versions would require a Dexie migration strategy (not implemented in MVP).

## Related documentation

- [`Supporting/technical-debt.md`](../technical-debt.md) — known limitations (no auth, unverified receipts, single-device storage)
- [`Deployment_and_Source_Links.txt`](../../Deployment_and_Source_Links.txt) — submission links and deployment metadata
