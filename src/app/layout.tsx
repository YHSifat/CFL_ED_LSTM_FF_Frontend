import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
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

export const metadata: Metadata = {
  title: "Water-Level Forecasting System",
  description: "CFL-EDLSTM water-level forecasting dashboard for BWDB gauge stations",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${plexMono.variable} h-full antialiased`}
    >
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
