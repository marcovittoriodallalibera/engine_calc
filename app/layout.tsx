import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Phase 360 | Two-stroke timing workbench",
    template: "%s | Phase 360",
  },
  description:
    "A private, browser-based workbench for two-stroke port timing, rotary inlet, compression, squish and geometric time-area calculations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  applicationName: "Phase 360",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
