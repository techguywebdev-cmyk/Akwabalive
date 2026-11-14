import type { Metadata } from 'next';

export const SITE_URL = 'https://tsacoal.com';

/** Title, description and picture for a shared link (WhatsApp, X, iMessage, Instagram DMs) */
export function shareMeta({ title, description, image, path, square }: { title: string; description: string; image?: string | null; path: string; square?: boolean }): Metadata {
  // no picture of its own: the brand card
  const images = image ? [{ url: image, ...(square ? { width: 800, height: 800 } : {}) }] : [{ url: '/opengraph-image.jpg', width: 1200, height: 630 }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: 'TsaCoal', title, description, url: path, images },
    twitter: { site: '@tsacoal', creator: '@tsacoal', card: image && square ? 'summary' : 'summary_large_image', title, description, images: [images[0].url] },
  };
}
