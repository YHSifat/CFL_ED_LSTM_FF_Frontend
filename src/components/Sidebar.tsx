"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FEATURES } from "@/lib/features";
import BonnaLogo from "@/components/BonnaLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Whether this page reads the station/horizon query params. */
  carriesSelection: boolean;
  /** Hidden from the nav when false (see lib/features.ts). */
  enabled?: boolean;
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/forecast",
    label: "Station Forecast",
    carriesSelection: true,
    icon: (
      <svg {...iconProps}>
        <path d="M3 17l5-5 4 4 8-9" />
        <path d="M14 7h6v6" />
      </svg>
    ),
  },
  {
    href: "/models",
    label: "Model Comparison",
    carriesSelection: true,
    enabled: FEATURES.modelComparison,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="12" width="4" height="8" />
        <rect x="10" y="7" width="4" height="13" />
        <rect x="17" y="3" width="4" height="17" />
      </svg>
    ),
  },
  {
    href: "/performance",
    label: "Forecast Performance",
    carriesSelection: true,
    icon: (
      <svg {...iconProps}>
        <path d="M4 19h16" />
        <path d="M6 15l4-4 3 3 5-6" />
        <circle cx="18" cy="8" r="1" />
      </svg>
    ),
  },
  {
    href: "/ffwc",
    label: "FFWC Comparison",
    carriesSelection: true,
    icon: (
      <svg {...iconProps}>
        <path d="M4 12h4l3-8 4 16 3-8h2" />
      </svg>
    ),
  },
  {
    href: "/explainability",
    label: "Explainability",
    carriesSelection: true,
    enabled: FEATURES.explainability,
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(item: Pick<NavItem, "href" | "carriesSelection">): string {
    if (!item.carriesSelection) return item.href;
    const station = searchParams.get("station");
    const h = searchParams.get("h");
    const params = new URLSearchParams();
    if (station) params.set("station", station);
    if (h) params.set("h", h);
    const qs = params.toString();
    return qs ? `${item.href}?${qs}` : item.href;
  }

  const [open, setOpen] = useState(false);

  // Close the mobile drawer with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The logo is the way home (the map); it keeps the selected station like the nav links.
  const homeHref = hrefFor({ href: "/", carriesSelection: true });
  const closeDrawer = () => setOpen(false);

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.filter((item) => item.enabled !== false).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={hrefFor(item)}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-medium transition-colors"
            style={
              active
                ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-fg)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Narrow screens: top bar with a menu button that opens the nav as a drawer. */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Brand href={homeHref} onClick={closeDrawer} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-background"
          >
            <svg {...iconProps} width={22} height={22}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand href={homeHref} onClick={closeDrawer} padded />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-background"
              >
                <svg {...iconProps} width={20} height={20}>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {nav}
            <Footer />
          </aside>
        </div>
      )}

      {/* Wide screens: fixed sidebar. */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Brand href={homeHref} onClick={closeDrawer} padded />
        {nav}
        <Footer />
      </aside>
    </>
  );
}

function Brand({ href, onClick, padded = false }: { href: string; onClick: () => void; padded?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label="Bonna home: interactive map"
      className={`block rounded-[var(--radius-card)] transition-opacity hover:opacity-85 ${padded ? "px-5 py-5" : ""}`}
    >
      <BonnaLogo />
    </Link>
  );
}

function Footer() {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 py-3 pl-5 pr-3 text-xs text-text-tertiary">
      <span>25 BWDB gauge stations · 4 clusters</span>
      <ThemeToggle />
    </div>
  );
}
