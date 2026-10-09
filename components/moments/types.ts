export interface MomentChapter {
  label: string;
  startSeconds: number;
  thumbUrl?: string;
}

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
  /** Optional chapters from DB (jsonb). Falls back to CHAPTERS_BY_SLUG. */
  chapters?: MomentChapter[] | null;
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

/**
 * Fallback chapters by event_slug (and default).
 * startSeconds are illustrative — tune per real YouTube length.
 * Prefer storing real chapters on moments.chapters in Supabase.
 */
export const CHAPTERS_BY_SLUG: Record<string, MomentChapter[]> = {
  'kundum-harvest-festival': [
    { label: 'Morning Ritual', startSeconds: 0 },
    { label: 'Opening Parade', startSeconds: 155 },
    { label: 'Dance Procession', startSeconds: 380 },
    { label: 'Royal Entrance', startSeconds: 585 },
    { label: 'Night Celebration', startSeconds: 750 },
  ],
  'akwasidae-festival': [
    { label: 'Palace Arrival', startSeconds: 0 },
    { label: 'Drumming', startSeconds: 90 },
    { label: 'Otumfuo Entrance', startSeconds: 210 },
    { label: 'Homage', startSeconds: 360 },
  ],
  'sarkodie-live-in-concert': [
    { label: 'Intro', startSeconds: 0 },
    { label: 'Hits Medley', startSeconds: 120 },
    { label: 'Guest Verse', startSeconds: 280 },
    { label: 'Finale', startSeconds: 420 },
  ],
  'chale-wote-street-art-festival': [
    { label: 'Jamestown Streets', startSeconds: 0 },
    { label: 'Art Walk', startSeconds: 100 },
    { label: 'Performance', startSeconds: 240 },
    { label: 'Crowd', startSeconds: 360 },
  ],
  'detty-december-beach-rave': [
    { label: 'Sunset', startSeconds: 0 },
    { label: 'DJ Set', startSeconds: 90 },
    { label: 'Peak Hour', startSeconds: 240 },
    { label: 'Afterglow', startSeconds: 400 },
  ],
  'afrobeats-beyond-festival': [
    { label: 'Gates Open', startSeconds: 0 },
    { label: 'Main Stage', startSeconds: 150 },
    { label: 'Headliner', startSeconds: 320 },
    { label: 'Close', startSeconds: 480 },
  ],
  default: [
    { label: 'Opening', startSeconds: 0 },
    { label: 'Highlight', startSeconds: 90 },
    { label: 'Peak', startSeconds: 180 },
    { label: 'Close', startSeconds: 270 },
  ],
};

export function getChapters(moment: Moment | null | undefined): MomentChapter[] {
  if (!moment) return [];
  if (Array.isArray(moment.chapters) && moment.chapters.length > 0) {
    return [...moment.chapters].sort((a, b) => a.startSeconds - b.startSeconds);
  }
  const slug = moment.event_slug ?? '';
  return CHAPTERS_BY_SLUG[slug] ?? CHAPTERS_BY_SLUG.default;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function activeChapterIndex(chapters: MomentChapter[], currentSeconds: number): number {
  if (!chapters.length) return -1;
  let idx = 0;
  for (let i = 0; i < chapters.length; i++) {
    if (currentSeconds >= chapters[i].startSeconds) idx = i;
    else break;
  }
  return idx;
}
