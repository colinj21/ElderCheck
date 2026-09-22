import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ElderCheck — Peace of mind, every day",
    template: "%s · ElderCheck",
  },
  description:
    "A gentle daily check-in that keeps your family close, and keeps your loved one independent.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ElderCheck",
  },
  openGraph: {
    title: "ElderCheck — Peace of mind, every day",
    description:
      "A gentle daily check-in that keeps your family close, and keeps your loved one independent.",
    type: "website",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f6b52",
  width: "device-width",
  initialScale: 1,
  // No maximumScale: locking zoom fails WCAG 1.4.4 and makes the app
  // unusable for low-vision users -- a core audience for this product.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}

