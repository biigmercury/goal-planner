import type { Metadata } from "next";
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
  title: "Goal Planner",
  description: "A tiny MVP goal planner with auto-scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
          <header className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
              <a href="/" className="font-semibold tracking-tight">Goal Planner</a>
              <nav className="flex items-center gap-4 text-sm">
                <a className="rounded-md px-2 py-1 hover:bg-neutral-100" href="/today">Today</a>
                <a className="rounded-md px-2 py-1 hover:bg-neutral-100" href="/calendar">Calendar</a>
                <a className="rounded-md px-2 py-1 hover:bg-neutral-100" href="/plan">Plan</a>
                <a className="rounded-md border border-neutral-300 px-2 py-1 hover:bg-neutral-50" href="/goals/new">New goal</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
