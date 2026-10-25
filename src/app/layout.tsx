// Polyfills phải import ĐẦU TIÊN để chạy trước mọi client bundle / React hydrate
// trên iOS Safari cũ (Base UI dùng Object.hasOwn — ES2022).
import "@/lib/polyfills";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { StickySiteHeader } from "@/components/layout/sticky-site-header";
import "./globals.css";

// Phase 1 (Premier League-inspired): body dùng Plus Jakarta Sans, heading dùng Sora.
const appSans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});
const appHeading = Sora({
  variable: "--font-app-heading",
  subsets: ["latin"],
  display: "swap",
});

// Đồng bộ favicon/app icon theo logo chính.
export const metadata: Metadata = {
  applicationName: "Phủi League",
  title: "Phủi League",
  description: "Phủi League — tìm đối, tìm người, tìm sân.",
  themeColor: "#37003c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Phủi League",
  },
  icons: {
    icon: [
      { url: "/logo-with-background.png", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${appSans.variable} ${appHeading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-muted">
        <StickySiteHeader />
        {children}
      </body>
    </html>
  );
}
