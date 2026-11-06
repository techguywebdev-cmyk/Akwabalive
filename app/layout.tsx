import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/supabase/AuthProvider';

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
  metadataBase: new URL('https://akwabalive.vercel.app'),
  title:       'Akwaaba — Ghana Events & Tickets', // rename via lib/theme BRAND_NAME
  description: "Every event in Ghana in one place: concerts, festivals and parties, with tickets, line-ups and moments.",
  openGraph: { type: 'website', siteName: 'Akwaaba', title: 'Akwaaba — Ghana Events & Tickets', description: 'Every event in Ghana in one place: concerts, festivals and parties, with tickets, line-ups and moments.' },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0F0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
