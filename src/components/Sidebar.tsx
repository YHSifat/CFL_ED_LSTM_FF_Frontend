"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Whether this page reads the station/horizon query params. */
  carriesSelection: boolean;
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
    href: "/",
    label: "Interactive Map",
    carriesSelection: false,
    icon: (
      <svg {...iconProps}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
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
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="12" width="4" height="8" />
        <rect x="10" y="7" width="4" height="13" />
        <rect x="17" y="3" width="4" height="17" />
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

  function hrefFor(item: NavItem): string {
    if (!item.carriesSelection) return item.href;
    const station = searchParams.get("station");
    const h = searchParams.get("h");
    const params = new URLSearchParams();
    if (station) params.set("station", station);
    if (h) params.set("h", h);
    const qs = params.toString();
    return qs ? `${item.href}?${qs}` : item.href;
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--accent)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
            <path d="M12 3c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12Z" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-text-primary">Water-Level</div>
          <div className="text-xs text-text-secondary">Forecasting System</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={hrefFor(item)}
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

      <div className="mt-auto px-5 py-4 text-xs text-text-tertiary">
        25 BWDB gauge stations · 4 clusters
      </div>
    </aside>
  );
}
