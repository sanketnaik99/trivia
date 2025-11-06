import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthButtons } from './components/auth-buttons';
import { Navigation } from "./components/navigation";
import { QueryProvider } from "./providers/query-provider";
import ThemeProvider from "./providers/theme-provider";
import { ThemeToggle } from "./components/ui/theme-toggle";

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
  title: "Trivia Room - Multiplayer Trivia Game",
  description: "Create or join trivia rooms and compete with friends in real-time!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <QueryProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <ThemeProvider>
              <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="text-xl font-bold">Trivia</Link>
                    <Navigation />
                  </div>
                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <AuthButtons />
                  </div>
                </div>
              </header>
              <main>
                {children}
              </main>
            </ThemeProvider>
          </body>
        </html>
      </QueryProvider>
    </ClerkProvider>
  );
}
