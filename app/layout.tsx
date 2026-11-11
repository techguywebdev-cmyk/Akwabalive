import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/supabase/AuthProvider';
import RefTracker from '@/components/social/RefTracker';
import { JsonLd, siteJsonLd } from '@/lib/seo';

/** Display face — titles, numerals, eyebrows */
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight:  ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight:  ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tsacoal.com'),
  // Pages give their own title; " | Tsacoal" is added to each
  title: { default: 'TsaCoal: Events in Ghana, Concerts, Parties & Tickets', template: '%s | TsaCoal' },
  description: 'Every event in Ghana in one place: concerts, festivals, parties and Detty December shows in Accra, Kumasi and beyond, with tickets, line-ups and clips from past nights.',
  applicationName: 'TsaCoal',
  keywords: ['events in Ghana', 'Accra events', 'things to do in Accra', 'concerts in Ghana', 'Ghana festivals', 'Detty December', 'Accra nightlife', 'parties in Accra', 'Ghana concert tickets', 'Kumasi events', 'Afrobeats concerts', 'Tsacoal'],
  category: 'entertainment',
  formatDetection: { telephone: false },
  // Search Console / Bing Webmaster verification: set these env vars in Vercel
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: { ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : {}) },
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: { type: 'website', siteName: 'TsaCoal', title: 'TsaCoal | Ghana, After Dark', description: 'Every night out in Ghana in one place. Find the show, save it, bring your people.' },
  twitter: { card: 'summary_large_image', title: 'TsaCoal | Ghana, After Dark', description: 'Every night out in Ghana in one place. Find the show, save it, bring your people.' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0F0D',
  // The keyboard floats over the page instead of shrinking it, so the feed doesn't jump to the next card
  interactiveWidget: 'resizes-visual',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable}`}
    >
      <body>
        <JsonLd data={siteJsonLd()} />
        <AuthProvider><RefTracker />{children}</AuthProvider>
      </body>
    </html>
  );
}
