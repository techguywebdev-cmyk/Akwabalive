import { createClient } from '@supabase/supabase-js';
import { shareMeta } from '@/lib/og';

export async function generateMetadata({ params }: { params: { username: string } }) {
  const handle = decodeURIComponent(params.username || '').toLowerCase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let name = `@${handle}`;
  let avatar: string | null = null;
  let bio = '';
  if (url && key) {
    const { data } = await createClient(url, key).from('profiles').select('full_name, avatar_url, bio').ilike('username', handle).maybeSingle();
    if (data) { name = data.full_name ? `${data.full_name} (@${handle})` : `@${handle}`; avatar = data.avatar_url; bio = data.bio ?? ''; }
  }
  return shareMeta({ title: `${name} on TsaCoal`, description: bio || `See where ${name} is going and the moments they’ve shared on TsaCoal.`, image: avatar, path: `/u/${handle}`, square: true });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
