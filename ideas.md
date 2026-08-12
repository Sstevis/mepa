# Mepa Ledger — Design Decisions & Feature Rationale

## Why "Obligation" as the Core Object?
Most accounting apps use a general ledger with debits/credits. That is overkill for informal traders who think in terms of "Kwame gave me rice on credit" and "Ama paid me GHS 200." The Obligation model maps directly to how traders speak. It is a document-oriented, event-sourced approach: an obligation is created, then payments are appended.

## Why Partial Payment Support?
In informal trade, settlements are rarely single-shot. A customer might pay GHS 200 today, GHS 300 next week, and clear the balance in month two. Without partial payment tracking, the app is useless after the first payment. The status field (open → partial → settled) models this reality.

## Why No Photo Attachments in MVP?
Photos require camera permissions, storage quotas, and compression logic. On a 16GB Android phone with a 2MP camera, a single photo could be 2MB — larger than the entire app. The MVP uses text descriptions and reference numbers. Photos are P2.

## Why Cash + MoMo Methods Only?
These are the two dominant payment channels in Ghana per the Heliyon study. Adding bank transfer, cheque, or card would complicate the UI for channels used by <5% of the target segment. The method field is a string enum, so new methods can be added without schema migration.

## Why Green/Red Color Coding?
Color is a universal literacy aid. A trader who struggles with text can see a green badge and understand "money coming in." Red means "money going out." This aligns with the brief's "mixed digital literacy" constraint.

## Why Bottom Navigation?
Top navigation is hard to reach on large phones with one hand. Bottom tabs are standard in mobile UX (WhatsApp, MoMo apps) and match user muscle memory.

## Why No Real-Time Sync?
Real-time sync requires WebSockets, a server, and conflict resolution. The brief's primary constraint is intermittent connectivity — real-time sync fails precisely when the user needs the app most. Offline-first with manual export is the correct trade-off for the MVP.

## Why Base64 for Shared Receipts?
Base64 is URL-safe, requires no backend, and fits in a QR code. A typical obligation + 3 payments JSON is <2KB, which encodes to ~2.7KB base64. A QR code version 10 can hold ~3KB — sufficient for this use case. The verify route proves the concept without infrastructure.

## Why CSV Export Instead of PDF?
PDF generation libraries (jsPDF, html2canvas) add 200KB+ to the bundle. CSV is 2KB, opens in Excel or Google Sheets, and is editable. Traders can print from Excel if they need a physical copy. CSV is the low-bandwidth choice.

## Why GHS Currency Hardcoded?
The first pilot is Ghana. Hardcoding GHS eliminates currency selection UI, decimal formatting bugs, and exchange rate confusion. The formatCurrency utility wraps `Intl.NumberFormat` with `currency: 'GHS'`, so changing currency later is one line.

## Why 3 Demo Scenarios?
Three scenarios cover the three obligation states:
1. Kwame — Partial (shows payment logic)
2. Ama — Settled (shows completed workflow)
3. Kofi — Open (shows starting state)
This gives the examiner a complete state-space tour in 60 seconds.

## Why No Authentication?
Informal traders share phones. A PIN or biometric lock creates friction and exclusion. The app is single-user per device, with data export as the migration path when a phone changes hands. Authentication is a future concern for multi-device sync.

## Why "Mepa" as a Working Name?
"Mepa" is intended to convey help or support in Ghanaian context. The name is provisional and should be validated with users before branding. For academic purposes, it demonstrates cultural grounding.
