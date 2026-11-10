import { Suspense } from 'react';
import MomentsClient from './MomentsClient';
import { createClient } from '@supabase/supabase-js';
import { shareMeta } from '@/lib/og';

export async function generateMetadata({ searchParams }: { searchParams: { id?: string } }) {
  const base = shareMeta({ title: 'Moments', description: 'Clips from the biggest nights in Ghana: concerts, festivals and shows.', path: '/moments' });
  const id = searchParams?.id;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!id || !url || !key || !/^[a-zA-Z0-9-]{4,64}$/.test(id)) return base;
  const { data: m } = await createClient(url, key).from('moments').select('title, event_name, year, youtube_id').eq('id', id).maybeSingle();
  if (!m) return base;
  return shareMeta({
    title: m.title,
    description: `${[m.event_name, m.year].filter(Boolean).join(' ')} · Watch on Tsacoal`,
    image: m.youtube_id ? `https://i.ytimg.com/vi/${m.youtube_id}/hqdefault.jpg` : null,
    path: `/moments?id=${encodeURIComponent(id)}`,
  });
}

export default function MomentsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: '#000',
            height: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Loading…
        </div>
      }
    >
      <MomentsClient />
    </Suspense>
  );
}
