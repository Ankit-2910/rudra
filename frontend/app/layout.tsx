import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "RUDRA — Shivanchal's AI Digital Twin Company";
const DESCRIPTION =
  "Explore Shivanchal Consultants as a living 3D company where every employee is an AI agent. Reception, CEO, Finance, Legal (FinePrint), and Tender Intelligence (BidSight).";

export const metadata: Metadata = {
  metadataBase: new URL("https://rudra.shivanchal.in"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://rudra.shivanchal.in",
    siteName: "RUDRA",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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
