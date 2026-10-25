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
  title:       'Akwaaba — Ghana Events & Tickets', // rename via lib/theme BRAND_NAME
  description: "Discover and book Ghana's best events. Pay with MTN MoMo, Vodafone Cash, or AirtelTigo.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030806',
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
