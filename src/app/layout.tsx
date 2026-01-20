import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Notes2Comic - Turn Notes Into Engaging Comics",
    template: "%s | Notes2Comic",
  },
  description:
    "Transform boring study materials into fun, visual comic strips. Upload your notes, PDFs, images, or videos and let AI create memorable educational content that actually sticks.",
  keywords: [
    "Notes to Comic",
    "AI Comic Generator",
    "Educational Comics",
    "Study Tools",
    "Visual Learning",
    "Google Gemini",
    "PDF to Comic",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Notes2Comic",
    title: "Notes2Comic - Turn Notes Into Engaging Comics",
    description:
      "Transform boring study materials into fun, visual comic strips using AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notes2Comic - Turn Notes Into Engaging Comics",
    description:
      "Transform boring study materials into fun, visual comic strips using AI",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Notes2Comic",
  description:
    "Transform boring study materials into fun, visual comic strips using AI",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
