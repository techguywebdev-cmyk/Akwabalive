export interface Moment {
  id: string;
  title: string;
  event_name: string;
  event_slug: string | null;
  youtube_id: string;
  description: string | null;
  year: number | null;
  is_featured: boolean;
  like_count?: number;
  view_count?: number;
  duration_label?: string | null;
}

export interface Comment {
  id: string;
  moment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const C = {
  gold: '#C8922A',
  goldDim: 'rgba(200,146,42,0.18)',
  cream: '#F5ECD7',
  c2: 'rgba(245,236,215,0.75)',
  c3: 'rgba(245,236,215,0.42)',
  glass: 'rgba(15,15,15,0.65)',
  glassBd: 'rgba(255,255,255,0.12)',
  greenL: '#4ade80',
  red: '#e53935',
} as const;

/** Fallback photo strips keyed by event_slug */
export const EVENT_PHOTOS: Record<string, string[]> = {
  'sarkodie-live-in-concert': [
    'https://images.unsplash.com/photo-1501386761578-eaa54b915e8e?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=300&q=80&auto=format&fit=crop',
  ],
  'chale-wote-street-art-festival': [
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604537466158-719b1972feb8?w=300&q=80&auto=format&fit=crop',
  ],
  'detty-december-beach-rave': [
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&q=80&auto=format&fit=crop',
  ],
  'akwasidae-festival': [
    'https://images.unsplash.com/photo-1604537466158-719b1972feb8?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=300&q=80&auto=format&fit=crop',
  ],
  'aboakyer-festival': [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80&auto=format&fit=crop',
  ],
  'gh-music-awards-after-party': [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80&auto=format&fit=crop',
  ],
  'afrobeats-beyond-festival': [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=300&q=80&auto=format&fit=crop',
  ],
  default: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=300&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=300&q=80&auto=format&fit=crop',
  ],
};

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** A chapter/segment within a moment video */
export interface MomentChapter {
  label: string;
  startSeconds: number;
  thumbUrl?: string | null;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function activeChapterIndex(chapters: MomentChapter[], currentSeconds: number): number {
  let active = 0;
  for (let i = 0; i < chapters.length; i++) {
    if (currentSeconds >= chapters[i].startSeconds) active = i;
  }
  return active;
}

/**
 * Returns chapters for a moment if it has them defined.
 * Extend this with per-moment chapter data as needed.
 */
export function getChapters(moment: Moment | null): MomentChapter[] {
  if (!moment) return [];
  // Per-video chapter data keyed by youtube_id
  const CHAPTERS: Record<string, MomentChapter[]> = {
    // Chale Wote 2026
    'r0uX9-mZhes': [
      { label: 'Jamestown Streets', startSeconds: 0 },
      { label: 'Art Walk', startSeconds: 100 },
      { label: 'Performance', startSeconds: 240 },
      { label: 'Crowd', startSeconds: 360 },
    ],
    // Rapperholic 2025 Kumasi
    'HvOb5CJU0rY': [
      { label: 'Opening', startSeconds: 0 },
      { label: 'First Act', startSeconds: 180 },
      { label: 'Sarkodie', startSeconds: 600 },
      { label: 'Finale', startSeconds: 1800 },
    ],
    // BHIM Fest 2025
    'kTsBn5D8DJA': [
      { label: 'Intro', startSeconds: 0 },
      { label: 'Reggae Session', startSeconds: 300 },
      { label: 'Stonebwoy', startSeconds: 900 },
      { label: 'Crowd', startSeconds: 1500 },
    ],
  };
  return CHAPTERS[moment.youtube_id] ?? [];
}
