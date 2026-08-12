# Mepa Ledger — Technical Debt

## Client-side IndexedDB storage (single device)

- **Debt:** All contacts, obligations, and payments live in browser IndexedDB via Dexie with no server sync or multi-device replication.
- **Cause:** 48-hour MVP scope and exam constraint to avoid backend infrastructure, authentication, and payment-rail integration.
- **Impact:** Data is lost if the browser storage is cleared, the device is lost, or the user switches phones. Two traders cannot share a live ledger state automatically.
- **Priority:** High for production; acceptable for demo/MVP.
- **Proposed Resolution:** Add encrypted cloud backup and optional CouchDB/PouchDB sync with conflict-safe append-only payment records.

## Receipt sharing is not cryptographically verified

- **Debt:** Shared receipts are base64-encoded JSON in a URL/QR code. The Verify Receipt page displays client-supplied data only.
- **Cause:** Demo needed a shared-record concept without backend signing, identity verification, or MoMo API access.
- **Impact:** Either party could tamper with encoded data before sharing. The app must not claim independent verification or trust.
- **Priority:** High before any real dispute-resolution use case.
- **Proposed Resolution:** Sign receipts server-side (or with device-bound keys), include checksums, timestamps, and optional third-party anchoring; replace “verify” wording with authenticated receipt status.

## No authentication or audit trail

- **Debt:** No user accounts, roles, login, or immutable audit log of who changed what.
- **Cause:** Time-boxed scope; brief explicitly excluded identity verification and PINs in MVP.
- **Impact:** No accountability on a shared device; no compliance-ready history for disputes or tax review.
- **Priority:** Medium–High for production.
- **Proposed Resolution:** Add lightweight auth, per-user actions, append-only audit events, and exportable audit CSV.

## No server persistence or backups

- **Debt:** No automated backup, restore, or admin recovery path beyond manual CSV export.
- **Cause:** Offline-first MVP prioritized local CRUD and PWA installability over hosting costs and ops.
- **Impact:** Users rely on manual export and device storage integrity.
- **Priority:** Medium.
- **Proposed Resolution:** Scheduled encrypted backup to object storage; restore flow on new device install.

## No payment-provider verification

- **Debt:** MoMo/cash references are free-text fields; the app does not confirm transactions with MTN MoMo or banks.
- **Cause:** Exam scope excludes direct payment-rail API integration.
- **Impact:** Recorded payments reflect user entry only, not confirmed settlement on a payment network.
- **Priority:** Medium for trust; Low for ledger MVP demo.
- **Proposed Resolution:** Optional MoMo webhook/API reconciliation with reference matching and status badges.
