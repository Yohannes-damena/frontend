import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Tab = { label: string; to: string; icon: ReactNode; primary?: boolean };

const tabs: Tab[] = [
  {
    label: "Home",
    to: "/home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 10L12 3l9 7v11H3z" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    label: "Map",
    to: "/map",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Scan",
    to: "/museums/heritage/scan",
    primary: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M3 7V4h3M17 4h4v3M21 17v3h-4M7 21H3v-4" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    label: "Browse",
    to: "/museums",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: "Profile",
    to: "/profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </svg>
    ),
  },
];

export function FooterNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#2b2b2b]/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {tabs.map((t) => {
          const active = pathname === t.to || (t.to !== "/home" && pathname.startsWith(t.to));
          if (t.primary) {
            return (
              <Link key={t.label} to={t.to} className="flex flex-col items-center gap-1 text-ink">
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold shadow-[0_6px_16px_rgba(192,138,46,0.5)]">
                  {t.icon}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-parchment/70">{t.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={t.label}
              to={t.to}
              className={`flex flex-col items-center gap-1 ${active ? "text-gold" : "text-parchment/70"}`}
            >
              {t.icon}
              <span className="text-[9px] font-medium uppercase tracking-[0.15em]">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function ScreenHeader({ title, back = "/home", right }: { title: string; back?: string; right?: ReactNode }) {
  return (
    <header className="mx-auto flex max-w-md items-center justify-between px-6 pt-12">
      <Link
        to={back}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-parchment/20 text-parchment/80"
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
      <p className="font-display text-sm uppercase tracking-[0.4em] text-parchment/80">{title}</p>
      <span className="flex h-9 w-9 items-center justify-center">{right}</span>
    </header>
  );
}