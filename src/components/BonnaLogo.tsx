import { useId } from "react";

/**
 * Bonna logo mark: a gauge staff rising out of two waves on a rounded tile.
 * From the design reference public/Header.dc.html (light) and HeaderDark.dc.html (dark);
 * the tile colour comes from --logo-tile so it follows the theme.
 */
export function BonnaMark({ size = 36 }: { size?: number }) {
  const clipId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Bonna logo" className="shrink-0">
      <defs>
        <clipPath id={clipId}>
          <rect width="100" height="100" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill="var(--logo-tile)" />
        <rect x="40" y="14" width="8" height="60" rx="2" fill="#FFFFFF" />
        <rect x="48" y="18" width="14" height="4" rx="1" fill="#F59E3B" />
        <rect x="48" y="30" width="8" height="3.5" rx="1" fill="#FFFFFF" />
        <rect x="48" y="40" width="14" height="3.5" rx="1" fill="#FFFFFF" />
        <rect x="48" y="50" width="8" height="3.5" rx="1" fill="#FFFFFF" />
        <path d="M-5 62 Q7.5 55 20 62 T45 62 T70 62 T95 62 T120 62 V105 H-5 Z" fill="#3BA7D6" />
        <path d="M-5 75 Q7.5 70 20 75 T45 75 T70 75 T95 75 T120 75 V105 H-5 Z" fill="#1E86B8" />
      </g>
    </svg>
  );
}

/** Mark + "Bonna" wordmark + bilingual tagline, as in the header design. */
export default function BonnaLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <BonnaMark size={size} />
      <div className="flex flex-col gap-0.5 font-brand">
        <div className="text-[22px] font-extrabold leading-none tracking-[-0.5px] text-[var(--logo-title)]">Bonna</div>
        <div className="text-[11px] font-medium leading-tight text-[var(--logo-tagline)]">
          Flood forecast · বন্যা পূর্বাভাস
        </div>
      </div>
    </div>
  );
}
