import type { Metadata } from 'next';
import { Cormorant_Garamond, Syne, DM_Mono, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/supabase/AuthProvider';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight:  ['300', '400', '500', '600'],
  style:   ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const syne = Syne({
  subsets: ['latin'],
  weight:  ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight:  ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight:  ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       'Akwaaba — Ghana Events & Tickets',
  description: "Discover and book Ghana's best events. Pay with MTN MoMo, Vodafone Cash, or AirtelTigo.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${syne.variable} ${dmMono.variable} ${inter.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
