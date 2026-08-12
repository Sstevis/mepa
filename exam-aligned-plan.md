# Mepa Ledger — Exam-Aligned Project Plan

## Module Alignment
This project demonstrates competencies across software engineering, mobile development, and human-computer interaction:
- **Architecture**: Offline-first data model with client-side state management
- **Algorithms**: Balance calculation and partial-payment reconciliation
- **UX Design**: Low-bandwidth, low-literacy interface for informal sector users
- **Testing**: PWA validation, offline resilience, and user workflow verification

## Research Foundation
The project is grounded in three empirical sources:
1. Heliyon (2024): 49.6% digital payment use vs. 28.22% accounting record-keeping among Ghanaian informal firms
2. Springer (2025): Mobile phones used for communication and finance, but need for affordable, user-friendly apps tailored to informal businesses
3. World Bank Global Findex: Digitalizing agricultural payments should build on existing mobile-money behavior, not replace it

## Problem Statement
Informal traders in Ghana use mobile money and maintain credit relationships, but lack tools to reconcile obligations across notebooks, SMS, and memory. This leads to payment disputes, poor working-capital visibility, and friction in supplier relationships.

## Solution Hypothesis
A narrow, mobile-first ledger that treats the **obligation between two parties** as the core object — not a general ledger, not a marketplace, not a wallet. By focusing on credit entry, payment reconciliation, and shared receipts, the product can be simpler and more trusted than a notebook.

## Scope Boundaries (Explicit Non-Goals)
- Does NOT hold funds or process payments
- Does NOT provide loans or credit scores
- Does NOT replace tax/accounting software
- Does NOT require identity verification or PINs
- Does NOT integrate with MoMo APIs in MVP

## Technical Decisions & Justification

### Why Dexie.js / IndexedDB?
The brief specifies intermittent connectivity and data-cost constraints. LocalStorage is synchronous and limited to 5MB. IndexedDB is asynchronous, supports structured data, and allows offline CRUD operations. Dexie.js wraps it with a Promise-based API that integrates cleanly with React.

### Why No Backend?
The brief explicitly states the MVP should not require direct access to MTN MoMo, Vodafone Cash, AirtelTigo, bank accounts, or national identity databases. A backend would require authentication, hosting costs, and data privacy compliance that exceed a single-day build and a student budget. The architecture is designed for future CouchDB/PouchDB sync.

### Why PWA Over Native Android?
A PWA installs via the browser, eliminating app store approval delays and APK distribution friction. It runs on any Android device with Chrome, matching the brief's constraint of "modest Android phones." The service worker provides offline caching identical to native offline behavior.

### Why Base64 Receipts Instead of a Server?
Shared verification is proven via a `/verify?data=BASE64` route that decodes obligation+payment JSON client-side. This demonstrates the shared-record concept without backend infrastructure. In production, this would be replaced by signed URLs or blockchain anchoring.

## Success Metrics (Validation Plan)
| Metric | Target | How Measured |
|--------|--------|--------------|
| Time to record credit entry | < 60 seconds | Stopwatch during demo |
| Time to record payment | < 60 seconds | Stopwatch during demo |
| Offline functionality | 100% CRUD ops work | Disable network in DevTools |
| Balance accuracy | 100% match | Manual reconciliation test |
| PWA installability | Lighthouse PWA audit | Chrome DevTools audit |

## Risk Assessment
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Complex balance logic bugs | Medium | Unit-test calculateBalances.ts; verify with seed data |
| IndexedDB compatibility on old Android | Low | Dexie.js handles browser normalization |
| Scope creep | High | Strict enforcement of P0/P1/P2 feature list |
| AI-generated code quality | Medium | Manual review of all balance and DB transaction code |

## Viva Preparation — Expected Questions

**Q: How is this different from SikaBooks or Excel?**
A: SikaBooks is a full accounting suite (GHS 49/month) targeting formal compliance. Excel is single-user. Mepa is narrower: it treats the obligation between two parties as the core object and generates shared, immutable receipts that both sides can verify without file transfers.

**Q: What about data loss if the phone is stolen?**
A: Version one stores data locally, consistent with the brief's trust constraints (no cloud, no PINs). Future versions would add encrypted cloud backup via CouchDB sync. The app includes CSV export as an immediate mitigation.

**Q: Why not build a full backend?**
A: The brief explicitly scopes the MVP away from payment-rail integration and identity verification. A backend would add compliance, hosting, and security obligations that distract from the core hypothesis: can traders record and reconcile obligations faster than a notebook?

**Q: How do you handle conflicts if two people edit the same record?**
A: In this vertical slice, records are append-only. Obligations are created once; payments are added. The verify route is read-only. True multi-user conflict resolution (CRDTs or operational transforms) is architected into the schema but not implemented in the MVP.

**Q: Did you use AI in this project?**
A: Yes, for boilerplate generation (React components, Tailwind styling, config files). I designed the schema, balance algorithms, offline architecture, and validation plan myself. All business logic was manually reviewed and tested.

## Ethical & Safety Considerations
- No medical, financial, or legal advice is given
- No user data is transmitted to third parties
- No identity verification or sensitive credentials are requested
- The app does not present informal records as legally enforceable proof
- Users are clearly informed that the app is a record-keeping tool, not a financial institution

## Future Roadmap (Post-Graduation)
1. CouchDB/PouchDB bidirectional sync for multi-device backup
2. Twilio/WhatsApp API for neutral payment reminders
3. Multi-language support (Twi, Ga, Ewe, Hausa) based on pilot demand
4. Photo attachments for physical receipts
5. Sponsor/wholesaler dashboard for aggregate outstanding balances
