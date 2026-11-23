import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ErrorBoundary } from "./error-boundary";
import { ConfigProvider } from "./configs/settings";
import { FONT_SCALE, parseConfig } from "./configs/settings-shared";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CG Songbook",
    template: "Songbook – %s",
  },
  description: "Contains all songs from Sky's 2025 collection PDF, plus Hanny's favorites.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the visitor's settings from cookies so the very first render uses them
  const cookieStore = await cookies();
  const config = parseConfig((name) => cookieStore.get(name)?.value);

  return (
      <html lang="en" style={{ fontSize: FONT_SCALE[config.fontSize] }}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ErrorBoundary>
              <ConfigProvider initial={config}>
                {children}
              </ConfigProvider>
          </ErrorBoundary>
        </body>
      </html>
  );
}
