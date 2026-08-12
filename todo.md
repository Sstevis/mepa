# Mepa Ledger — Build TODO (Phase B Execution Order)

## Phase B-1: Foundation (Do First)
- [ ] Install all dependencies: react-router-dom, dexie, qrcode.react, papaparse, lucide-react, tailwindcss, vite-plugin-pwa
- [ ] Configure Tailwind (tailwind.config.js, index.css)
- [ ] Configure vite-plugin-pwa in vite.config.ts (manifest: name "Mepa Ledger", short_name "Mepa", theme_color "#0f766e", background_color "#ffffff", start_url "/", display "standalone")
- [ ] Create src/types.ts with all TypeScript interfaces (Contact, Obligation, Payment)
- [ ] Create src/db.ts with Dexie database class, 3 stores, and all CRUD methods
- [ ] Create src/utils/calculateBalances.ts — core balance math (sum by direction, per contact, global)
- [ ] Create src/utils/formatCurrency.ts — GHS formatting
- [ ] Verify build passes: `npm run build`

## Phase B-2: Core Screens
- [ ] Create src/components/Layout.tsx — App shell with bottom navigation (Home, Contacts, Add, Export)
- [ ] Create src/components/Dashboard.tsx — Summary cards + overdue obligations list
- [ ] Create src/components/ContactList.tsx — Display all contacts with balance preview badges
- [ ] Create src/components/ContactForm.tsx — Form to add new contact (name, phone, type)
- [ ] Create src/components/ContactDetail.tsx — Show one contact + all their obligations + payment history
- [ ] Create src/components/ObligationForm.tsx — Create new obligation (select contact, amount, description, date, due date, direction)
- [ ] Create src/components/PaymentForm.tsx — Record payment on selected obligation (amount, method, reference, date) + UPDATE parent obligation remainingAmount/status
- [ ] Create src/components/ObligationCard.tsx — Reusable card showing obligation info, status badge, remaining amount

## Phase B-3: Shared Receipt & Export
- [ ] Create src/components/ReceiptViewer.tsx — Route `/verify?data=BASE64` that decodes and displays obligation + payments as clean receipt
- [ ] Add "Share Receipt" button to obligation detail — generates base64 JSON, shows QR code, uses Web Share API
- [ ] Create src/components/ExportButton.tsx — Export all obligations + payments to CSV via papaparse

## Phase B-4: Polish & Demo
- [ ] Create src/seed.ts — Pre-populate database with 3 realistic Ghanaian scenarios:
  1. Kwame (Supplier) — Carton of rice, GHS 1,200, partial payment GHS 500
  2. Ama (Customer) — Cosmetics batch, GHS 800, fully paid
  3. Kofi (Supplier) — Beverages, GHS 2,500, open
- [ ] Wire up seed.ts to run once on first load (check if contacts exist first)
- [ ] Test PWA installability on Android or Chrome DevTools
- [ ] Test offline: disable network, reload, create transaction, verify persistence
- [ ] Test balance math: ensure partial payments update remainingAmount correctly
- [ ] Test shared receipt: encode obligation, open verify URL, confirm data renders
- [ ] Final build check: `npm run build` passes with zero errors

## Phase B-5: Explicitly Skip (Mention as Future Work)
- [ ] Backend sync server
- [ ] SMS/WhatsApp reminders
- [ ] Photo attachments
- [ ] Multi-language support
- [ ] Real MoMo API integration
- [ ] User accounts/authentication
- [ ] Inventory management
