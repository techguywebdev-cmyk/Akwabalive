import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/og';

const PRIVATE = ['/api/', '/organizer/', '/account', '/auth', '/notifications', '/t/', '/*?by=', '/*/card'];

/** Every search engine and AI answer engine is welcome on the public pages */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      // Named so they're never caught by a stricter default later: AI search and assistants
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'meta-externalagent'], allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
