import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Лад — AI-планер дня",
  description: "Поділись думками — Лад розбере їх на задачі і складе план дня",
  appleWebApp: {
    title: "Лад",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b1b1b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface pb-16 text-white">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
