import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthButtons } from './components/auth-buttons';
import { Navigation } from "./components/navigation";
import { QueryProvider } from "./providers/query-provider";
import { ThemeProvider } from "./providers/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
import Image from "next/image";

import HorizontalLogo from '@/public/horizontal-logo-light.png';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    title: "Trivia Room - Multiplayer Trivia Game",
    description: "Create or join trivia rooms and compete with friends in real-time!",
    images: [
      {
        url: "/seo-image.png",
        width: 1200,
        height: 630,
        alt: "Trivia Room - Multiplayer Trivia Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trivia Room - Multiplayer Trivia Game",
    description: "Create or join trivia rooms and compete with friends in real-time!",
    images: ["/seo-image.png"],
  },
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
                  <Link href="/" className="text-xl font-bold">
                    <Image 
                      src={HorizontalLogo}
                      alt="Trivia Room Logo"
                      width={80}
                      height={40}
                    />
                  </Link>
                  <Navigation />
                </div>
                <div className="flex gap-6">
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
