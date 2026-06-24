import type { Metadata } from "next";
import { Inter, Merriweather, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneRoster 1.1 Tools — Clever",
  description: "Generate and validate OneRoster 1.1 CSV data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${merriweather.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header style={{ backgroundColor: "#0A1E46" }}>
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span
                className="text-white text-xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-merriweather)" }}
              >
                Clever
              </span>
              <span className="text-white/30 text-lg font-thin">|</span>
              <span className="text-white/70 text-sm font-medium tracking-wide">
                OneRoster Tools
              </span>
            </div>
            <nav className="flex gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Generator
              </Link>
              <Link
                href="/validate"
                className="px-3 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Validator
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer style={{ backgroundColor: "#0A1E46" }}>
          <div className="max-w-5xl mx-auto px-6 h-10 flex items-center">
            <span className="text-white/40 text-xs">
              © {new Date().getFullYear()} Clever Inc. OneRoster 1.1 CSV Tools
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
