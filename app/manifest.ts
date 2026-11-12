import type { MetadataRoute } from 'next';

/** Add to home screen: opens full screen like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TsaCoal: every event in Ghana',
    short_name: 'TsaCoal',
    description: 'Concerts, festivals and parties in Ghana, with tickets, line-ups and moments.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060A08',
    theme_color: '#0B0F0D',
    categories: ['entertainment', 'music', 'events'],
    icons: [
      { src: '/icon?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon?v=3', sizes: '180x180', type: 'image/png' },
    ],
  };
}
