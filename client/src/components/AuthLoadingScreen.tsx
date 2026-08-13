export default function AuthLoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading authentication state"
    >
      <p className="text-sm font-medium text-teal-800">Loading…</p>
    </div>
  );
}
