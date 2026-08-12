import { Home, Users, PlusCircle, Download, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/add", label: "Add", icon: PlusCircle },
  { href: "/export", label: "Export", icon: Download },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  hideNav?: boolean;
  onBack?: () => void;
}

export default function Layout({
  children,
  title,
  hideNav = false,
  onBack,
}: LayoutProps) {
  const [location] = useLocation();

  const navLink = (href: string, label: string, Icon: typeof Home) => {
    const active =
      href === "/" ? location === "/" : location.startsWith(href);

    return (
      <Link
        href={href}
        className={cn(
          "relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-teal-50 text-teal-800"
            : "text-gray-600 hover:bg-gray-50 hover:text-teal-700",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-teal-600" />
        )}
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
      >
        <div className="absolute left-0 top-24 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-16 left-1/4 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl gap-6 px-6 md:py-6">
        {!hideNav && (
          <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex">
            <div className="mb-6 px-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                Mepa
              </p>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Ledger
              </h2>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <div key={href}>{navLink(href, label, Icon)}</div>
              ))}
            </nav>
          </aside>
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b bg-white/80 px-1 py-4 backdrop-blur-md md:px-0">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to contacts"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-700 transition hover:bg-teal-50 hover:text-teal-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-lg font-bold tracking-tight text-gray-900">
                {title ?? "Mepa Ledger"}
              </h1>
            </div>
          </header>

          <motion.main
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 py-4 pb-24 md:pb-6"
          >
            {children}
          </motion.main>

          {!hideNav && (
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md md:hidden">
              <ul className="mx-auto grid max-w-lg grid-cols-4">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/"
                      ? location === "/"
                      : location.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs",
                          active
                            ? "font-semibold text-teal-700"
                            : "text-muted-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
