import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import { BRAND } from "@/lib/brand";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import SiteMain from "@/components/site/SiteMain";
import SiteOnly from "@/components/site/SiteOnly";
import { THEME_SCRIPT } from "@/components/site/ThemeToggle";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--f-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });
// Display face carries the headline weight; tight tracking is applied in CSS.
const display = Archivo({
  subsets: ["latin"],
  variable: "--f-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name}, ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.strapline,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  themeColor: "#050608",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] btn btn-primary"
        >
          Skip to content
        </a>
        <Header />
        {/*
          A plain wrapper, not <main>.

          The admin panel brings its own header and navigation, and nesting that
          inside the site's <main> put site navigation inside the main-content
          landmark: a screen reader user skipping to content landed on the admin
          nav, and its sign-out form became the first form on the page. Each
          section declares its own <main> instead, so the landmark always
          contains what it claims to.
        */}
        <div id="main" className="flex-1 flex flex-col">
          <SiteMain>{children}</SiteMain>
        </div>
        <SiteOnly>
          <Footer />
        </SiteOnly>
      </body>
    </html>
  );
}
