'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { card } from '@/components/organizer/ui';
import { T, FONT, GRAD } from '@/lib/thiscene';

type Claim = { id: string; role: string; proof: string; contact: string | null; created_at: string; user_id: string; events: { id: string; slug: string; title: string; date: string } | null };
type Who = { id: string; username: string; full_name: string | null };

/** Organisers asking for an imported event: check their proof, then move the event to their account */
export default function ClaimsReview() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<Claim[] | null>(null);
  const [who, setWho] = useState<Record<string, Who>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('event_claims').select('id, role, proof, contact, created_at, user_id, events(id, slug, title, date)').eq('status', 'pending').order('created_at');
    const rows = (data ?? []) as unknown as Claim[];
    setList(rows);
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id, username, full_name').in('id', ids);
      setWho(Object.fromEntries(((p ?? []) as Who[]).map((x) => [x.id, x])));
    }
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function approve(c: Claim) {
    setBusy(c.id);
    const { error } = await supabase.rpc('approve_event_claim', { p_claim: c.id });
    setBusy('');
    if (!error) setList((l) => (l ?? []).filter((x) => x.id !== c.id && x.events?.id !== c.events?.id));
  }
  async function decline(c: Claim) {
    setBusy(c.id);
    await supabase.from('event_claims').update({ status: 'declined', decided_at: new Date().toISOString() }).eq('id', c.id);
    setBusy('');
    setList((l) => (l ?? []).filter((x) => x.id !== c.id));
  }

  if (!list?.length) return null;
  const btn: React.CSSProperties = { height: 38, padding: '0 14px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 };
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: T.white }}><BadgeCheck size={19} color={T.mintText} /> Event claims · {list.length}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((c) => {
          const p = who[c.user_id];
          return (
            <article key={c.id} style={{ ...card, padding: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.mintText }}>{c.role}{p ? ` · @${p.username}` : ''}</p>
              {c.events && <Link href={`/events/${c.events.slug}`} style={{ display: 'block', marginTop: 4, fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.white, textDecoration: 'none' }}>{c.events.title}</Link>}
              <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5, color: T.text, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.proof}</p>
              {c.contact && <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>Contact: <a href={`tel:${c.contact.replace(/\s/g, '')}`} style={{ color: T.text2 }}>{c.contact}</a></p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" disabled={busy === c.id} onClick={() => approve(c)} style={{ ...btn, border: 'none', background: GRAD.mint, color: T.onMint }}><Check size={15} /> Give it to them</button>
                <button type="button" disabled={busy === c.id} onClick={() => decline(c)} style={{ ...btn, border: 'none', background: 'transparent', color: T.text }}><X size={15} /> Decline</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
