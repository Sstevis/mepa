# Mepa Ledger

A low-bandwidth, offline-first business ledger for Ghanaian market traders, small retailers, and wholesalers.

## What It Does
Mepa Ledger helps traders answer five daily questions:
- What goods or amount did I receive from this supplier?
- What have I already paid?
- Which customers owe me and for how long?
- Did a customer or supplier dispute a payment?
- How much cash or mobile money is tied up in credit?

## Why It Exists
49.6% of informal firms in Ghana use digital payments, but only ~28% keep accounting records. 13.83% receive trade credit from suppliers and 26.89% extend trade credit to customers. The gap is not payments — it is reconciliation. Mepa Ledger fills that gap.

## Key Features
- **Offline-first**: Works without internet using IndexedDB
- **Shared receipts**: Generate QR codes so both parties see the same record
- **Partial payments**: Track split settlements across cash and mobile money
- **PWA**: Installable on Android like a native app
- **One-minute entry**: Record a credit purchase in under 60 seconds

## Tech Stack
- React 18 + Vite 5 + TypeScript
- Tailwind CSS
- Dexie.js (IndexedDB)
- vite-plugin-pwa

## Running Locally
```bash
npm install
npm run dev
```

## Building
```bash
npm run build
```

## Project Context
This is a final year software development project built as a vertical slice of the Mepa Ledger concept. It demonstrates offline-first architecture, client-side transaction logic, and progressive web app capabilities.
