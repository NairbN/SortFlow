import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SortFlow",
  description: "Sort team tools for DMD Systems Recovery",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex gap-4 border-b border-zinc-200 px-6 py-3 text-sm font-medium dark:border-zinc-800">
          <Link href="/" className="hover:underline">
            SLA Queue
          </Link>
          <Link href="/pallets" className="hover:underline">
            Pallet Board
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
