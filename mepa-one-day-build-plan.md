# Mepa Ledger — One-Day Build Plan

## Project Identity
**Mepa Ledger** is a low-bandwidth, offline-first business ledger for Ghanaian market traders. It tracks stock bought on credit, payments received, customer/supplier balances, and proof of settlement across mobile money and cash transactions.

This is NOT a generic accounting app, mobile-money wallet, lending product, or marketplace. It is a shared trade-credit and payment-reconciliation layer for informal commerce.

## Core Philosophy for This Build
- **Mobile-first** (Android-focused, works on modest devices)
- **Offline-first** (local IndexedDB via Dexie.js; sync is a future concern)
- **One-minute entry** (a trader must record a credit purchase in under 60 seconds)
- **Shared receipt** (both parties can inspect the same immutable record)
- **No backend today** (all data is client-side; backend sync is explicitly out of scope)

## Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite 5 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Offline Database | Dexie.js (IndexedDB wrapper) |
| PWA | vite-plugin-pwa |
| QR / Share | qrcode.react + Web Share API |
| Export | papaparse (CSV) |
| Icons | lucide-react |

## Data Schema (Non-Negotiable)

### contacts
```typescript
interface Contact {
  id: string;          // uuid
  name: string;
  phone: string;
  type: "supplier" | "customer";
  createdAt: number;   // timestamp
}
```

### obligations (core object: "what is owed")
```typescript
interface Obligation {
  id: string;          // uuid
  contactId: string;   // fk -> contacts
  direction: "they_owe_me" | "i_owe_them";
  amount: number;      // original amount
  description: string;
  date: string;        // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  status: "open" | "partial" | "settled";
  remainingAmount: number;
  createdAt: number;
}
```

### payments
```typescript
interface Payment {
  id: string;            // uuid
  obligationId: string;  // fk -> obligations
  amount: number;
  method: "cash" | "momo";
  reference: string;     // e.g. MoMo txn ID
  date: string;
  note: string;
  createdAt: number;
}
```

### CRITICAL RULE
When a payment is created, YOU must update the parent obligation in the same Dexie transaction:
```
remaining = obligation.remainingAmount - payment.amount
if remaining <= 0: status = "settled", remainingAmount = 0
else if remaining < obligation.amount: status = "partial"
else: status = "open"
```

## MVP Feature List (In Priority Order)

### P0 — Must Have for Demo
1. **Contact management** — Add/view contacts (name, phone, type)
2. **Create obligation** — Select contact, enter amount, description, date, due date, direction
3. **Record payment** — Select open obligation, enter amount, method (cash/MoMo), reference, date
4. **Balance engine** — Calculate `they_owe_me` and `i_owe_them` totals per contact and globally
5. **Dashboard** — Summary cards: "You are owed GHS X" / "You owe GHS Y" + list of overdue obligations
6. **Contact detail** — View all obligations for one contact with status badges (open/partial/settled)
7. **Shared receipt / QR** — Generate a verify page from base64-encoded obligation+payments JSON. URL: `/verify?data=BASE64`. Render clean receipt. Include visual "Confirm this record" button.
8. **Export** — Download all obligations + payments as CSV
9. **PWA** — Service worker, manifest, installable on Android
10. **Offline-first** — All reads/writes go to Dexie. App works with zero connectivity.

### P1 — Nice to Have (Only if P0 is Done)
11. **Demo data seed** — Pre-populate with 3 realistic Ghanaian trader scenarios
12. **Payment history per obligation** — Show list of payments inside obligation detail
13. **Due-date reminders** — Visual "overdue" badge (no SMS automation)

### P2 — Explicitly Out of Scope
- Multi-device sync / backend server
- SMS / WhatsApp reminder automation
- Photo attachments for receipts
- Multi-language (Twi, Ga, Ewe, Hausa)
- Real MoMo API integration
- Tax / GRA compliance features
- Inventory management
- User authentication / accounts
- AI features

## UI/UX Requirements
- **Screen size**: Optimize for 360px–414px width (budget Android phones)
- **Touch targets**: Minimum 44px height for all buttons
- **Color coding**: Green for "they_owe_me", Red for "i_owe_them", Gray for settled
- **Typography**: Large, readable fonts (minimum 16px body)
- **Navigation**: Bottom tab bar or simple page stack (Home / Contacts / Add / Export)
- **Empty states**: Friendly messages when no data exists yet
- **Loading**: No spinners for local DB ops; instant feedback

## File Structure
```
src/
  db.ts                 # Dexie database class + schema
  types.ts              # TypeScript interfaces
  seed.ts               # Demo data generator
  utils/
    formatCurrency.ts   # GHS formatting
    calculateBalances.ts # Core balance math
  components/
    Layout.tsx          # App shell + navigation
    Dashboard.tsx       # Summary cards + overdue list
    ContactList.tsx     # All contacts with balance preview
    ContactForm.tsx     # Add new contact
    ContactDetail.tsx   # Obligations for one contact
    ObligationForm.tsx  # Create new obligation
    PaymentForm.tsx     # Record payment on obligation
    ObligationCard.tsx  # Single obligation display
    ReceiptViewer.tsx   # /verify route for shared receipts
    ExportButton.tsx    # CSV download
  App.tsx
  main.tsx
public/
  manifest.json         # PWA manifest (generated by vite-plugin-pwa)
```

## Build Checklist
- [ ] Vite + React + TypeScript scaffold
- [ ] Tailwind configured
- [ ] vite-plugin-pwa configured (manifest: name "Mepa Ledger", short_name "Mepa", theme #0f766e)
- [ ] Dexie database with 3 stores (contacts, obligations, payments)
- [ ] All CRUD operations working in Dexie
- [ ] Balance calculation algorithm implemented and tested
- [ ] Contact list screen
- [ ] Add contact screen
- [ ] Create obligation screen
- [ ] Record payment screen with partial-payment logic
- [ ] Dashboard with summary cards
- [ ] Contact detail with obligation history
- [ ] Shared receipt / QR code generation
- [ ] Verify receipt page (`/verify?data=`)
- [ ] CSV export
- [ ] PWA installable (service worker active)
- [ ] Offline test: disable network, reload, create transaction, re-enable
- [ ] Demo data seeded
- [ ] Build passes (`npm run build`)

## Demo Script (3 Minutes)
1. Open app on phone (PWA installed). Show pre-seeded contacts.
2. Tap "Kwame (Supplier)" — show GHS 1,200 obligation.
3. Record partial payment of GHS 500 via MoMo. Watch balance update to GHS 700, status "Partial".
4. Tap "Share Receipt" — show QR code. Explain: "Kwame scans this, sees the exact same record. No dispute." (Open `/verify` in second tab.)
5. Show Dashboard: "I am owed GHS 800. I owe GHS 700."
6. Turn off Wi-Fi. Reload app. Create a transaction. Turn Wi-Fi on. Data persists.
7. Tap Export. Download CSV. Open to show structured data.

## Academic Defense Points
- **Offline-first**: Uses IndexedDB via Dexie for zero-connectivity operation.
- **No backend**: Matches the brief's constraint of starting without payment-rail integration.
- **Shared receipt**: Cryptographically immutable reference (base64-encoded record) prevents disputes.
- **Balance algorithm**: Client-side transaction logic ensures data consistency without server.
- **PWA**: Installable on Android, mimicking native app experience on low-cost devices.
- **Scope discipline**: Explicitly avoids lending, tax, marketplace, and inventory to maintain focus.
