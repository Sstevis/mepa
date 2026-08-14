/** Non-blocking notice that scoped local storage is separate from the legacy prototype database. */
export default function ScopedLedgerNotice() {
  return (
    <div
      className="border-b border-teal-100 bg-teal-50/80 px-4 py-2 text-center text-xs text-teal-950 md:px-6"
      role="status"
    >
      This workspace uses a separate local ledger. Older records from the previous local
      prototype are not automatically imported.
    </div>
  );
}
