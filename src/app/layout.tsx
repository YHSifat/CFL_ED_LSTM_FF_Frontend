import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono, Manrope, Noto_Sans_Bengali } from "next/font/google";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { THEME_KEY } from "@/lib/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

// Logo wordmark (Manrope) and its Bengali tagline, as in the design reference (public/Header.dc.html).
const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["500", "800"],
  subsets: ["latin"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  weight: ["500"],
  subsets: ["bengali"],
});

// Runs before first paint so a dark page never flashes light: saved choice, else the system setting.
const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export const metadata: Metadata = {
  title: "Bonna · Flood Forecast",
  description: "CFL-EDLSTM water-level forecasting dashboard for BWDB gauge stations",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${plexMono.variable} ${manrope.variable} ${notoBengali.variable} h-full antialiased`}
      // The theme script adds the `dark` class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex h-full min-h-screen flex-col bg-background text-text-primary lg:flex-row">
        <Suspense
          fallback={
            <div className="h-16 shrink-0 border-b border-border bg-card lg:h-screen lg:w-64 lg:border-b-0 lg:border-r" />
          }
        >
          <Sidebar />
        </Suspense>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
