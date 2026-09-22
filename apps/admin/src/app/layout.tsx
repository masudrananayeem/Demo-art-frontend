import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import Providers from "@/components/providers";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeLoader } from "@/components/theme-loader";
import { inter } from "@/lib/fonts";
import { getAbsoluteImageUrl } from "@/lib/metadata-utils";

export const metadata: Metadata = {
  title: "ArtCanvas Studio Admin",
  description: "ArtCanvas admin workspace for products, categories, orders, messages, inventory, and homepage controls.",
  openGraph: {
    title: "ArtCanvas Studio Admin",
    description: "ArtCanvas admin workspace for products, categories, orders, messages, inventory, and homepage controls.",
    type: "website",
    images: [
      {
        url: getAbsoluteImageUrl("/dashboard.png"),
        width: 1200,
        height: 630,
        alt: "Booksetu Admin Dashboard - Marketplace Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtCanvas Studio Admin",
    description: "Comprehensive admin dashboard for managing your Booksetu book marketplace. Track sellers, orders, inventory, and customers in one place.",
    images: [getAbsoluteImageUrl("/dashboard.png")],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={inter.className} suppressHydrationWarning>
        {/* Apply stored theme (light/dark/system) before React hydrates to avoid a flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = 'nextjs-ui-theme';
                  var storedTheme = window.localStorage.getItem(storageKey);
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolvedTheme = storedTheme === 'system' || !storedTheme
                    ? (systemDark ? 'dark' : 'light')
                    : storedTheme;

                  var root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolvedTheme);
                } catch (e) {
                  // Fail silently; ThemeProvider will handle theme on client.
                }
              })();
            `,
          }}
        />
        <ErrorBoundary>
          <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
            <Providers>
              <SidebarConfigProvider>
                <ThemeLoader />
                  {children}
              </SidebarConfigProvider>
            </Providers>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
