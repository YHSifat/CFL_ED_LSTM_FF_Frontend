"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { THEME_KEY } from "@/lib/theme";

// The `dark` class on <html> is the source of truth. It is set before first paint by the
// inline script in app/layout.tsx (no flash), and toggled here.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export default function ThemeToggle() {
  // Server snapshot is null: the theme is unknown until the client renders.
  const dark = useSyncExternalStore(subscribe, isDark, () => null);

  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const next = !isDark();
    const apply = () => {
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // Storage blocked (private mode): the choice lasts for this page only.
      }
    };
    const rect = e.currentTarget.getBoundingClientRect();
    spreadTheme(apply, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-background"
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        // Hidden until the client knows the theme, so the icon never shows the wrong state.
        style={{ visibility: dark === null ? "hidden" : "visible" }}
      >
        {dark ? (
          // Sun: currently dark, click for light.
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          // Moon: currently light, click for dark.
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}

const SPREAD_MS = 650;
const SPREAD_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * Switch theme with a flash spreading from (x, y): the new theme is revealed in a growing circle
 * (View Transitions API) with a glowing ring on its edge. Browsers without view transitions, and
 * users who prefer reduced motion, get an instant switch.
 */
function spreadTheme(apply: () => void, x: number, y: number) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }

  // Radius that reaches the farthest corner of the viewport.
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement;

  // The ring is its own view-transition layer (painted above the page snapshots), created in the
  // new state only. It is a circle of radius r whose glow sits at its edge; scaling it 0 → 1 in step
  // with the clip-path keeps the glow on the reveal's front.
  const ring = document.createElement("div");
  ring.className = "theme-flash";
  Object.assign(ring.style, { left: `${x - r}px`, top: `${y - r}px`, width: `${2 * r}px`, height: `${2 * r}px` });

  root.classList.add("theme-transition");
  const transition = document.startViewTransition(() => {
    apply();
    document.body.appendChild(ring);
  });

  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: SPREAD_MS, easing: SPREAD_EASING, pseudoElement: "::view-transition-new(root)" },
    );
    root.animate(
      { transform: ["scale(0)", "scale(1)"], opacity: [1, 1, 0] },
      { duration: SPREAD_MS, easing: SPREAD_EASING, pseudoElement: "::view-transition-new(theme-flash)" },
    );
  });

  transition.finished.finally(() => {
    ring.remove();
    root.classList.remove("theme-transition");
  });
}
