import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — font sans chính của Ráp Kèo (theo DESIGN.md), khớp với mock football-design.html.
const interSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Bump favicon/logo hiển thị ở tab trình duyệt và màn hình chính.
// Đặt icon cỡ lớn để trình duyệt ưu tiên dùng bản nét cao.
export const metadata: Metadata = {
  title: "Ráp Kèo",
  description: "Ráp kèo bóng đá phủi — tìm đối, tìm người, tìm sân.",
  icons: {
    icon: [
      { url: "/formation.png", sizes: "any" },
      { url: "/formation.png", type: "image/png", sizes: "32x32" },
      { url: "/formation.png", type: "image/png", sizes: "16x16" },
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
    <html lang="vi" className={`${interSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
