import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — font sans chính của Ráp Kèo (theo DESIGN.md), khớp với mock football-design.html.
const interSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ráp Kèo",
  description: "Ráp kèo bóng đá phủi — tìm đối, tìm người, tìm sân.",
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
