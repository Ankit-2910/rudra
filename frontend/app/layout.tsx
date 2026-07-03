import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUDRA — Shivanchal's AI Digital Twin Company",
  description:
    "Explore Shivanchal Consultants as a living 3D company where every employee is an AI agent. Reception, CEO, Finance, Legal (FinePrint), and Tender Intelligence (BidSight).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
