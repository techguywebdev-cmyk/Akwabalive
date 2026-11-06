'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, X, Radio, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { card } from '@/components/organizer/ui';
import { T, FONT } from '@/lib/thiscene';

type Update = {
  id: string; value: string; status: string; created_at: string;
  sources: { title: string; link: string | null; source: string }[];
  events: { id: string; slug: string; title: string; lineup: string[] | null } | null;
};

/** Line-up news the watcher found: one tap to add the act to the event, or dismiss it */
export default function LineupUpdates() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<Update[] | null>(null);
  const [recent, setRecent] = useState<Update[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const sel = 'id, value, status, created_at, sources, events(id, slug, title, lineup)';
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('event_updates').select(sel).eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      supabase.from('event_updates').select(sel).eq('status', 'applied').order('decided_at', { ascending: false }).limit(5),
    ]);
    setList((p ?? []) as unknown as Update[]);
    setRecent((a ?? []) as unknown as Update[]);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function decide(u: Update, apply: boolean) {
    setBusy(u.id);
    if (apply && u.events) {
      // read the line-up fresh: approving several acts in a row must not overwrite each other
      const { data: cur } = await supabase.from('events').select('lineup').eq('id', u.events.id).single();
      await supabase.from('events').update({ lineup: Array.from(new Set([...((cur?.lineup as string[] | null) ?? []), u.value])), updated_at: new Date().toISOString() }).eq('id', u.events.id);
    }
    await supabase.from('event_updates').update({ status: apply ? 'applied' : 'dismissed', decided_at: new Date().toISOString() }).eq('id', u.id);
    setList((l) => (l ?? []).filter((x) => x.id !== u.id));
    setBusy(null);
  }

  async function checkNow() {
    setChecking(true); setNote('');
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    const [r, f] = await Promise.all([
      fetch('/api/events/watch', { headers: { authorization: `Bearer ${t}` } }).then((x) => x.json()).catch(() => null),
      fetch('/api/events/read-flyers', { headers: { authorization: `Bearer ${t}` } }).then((x) => x.json()).catch(() => null),
      fetch('/api/events/listing-info', { headers: { authorization: `Bearer ${t}` } }).catch(() => null),
    ]);
    setChecking(false);
    const applied = (r?.report ?? []).reduce((n: number, x: { applied: string[] }) => n + x.applied.length, 0);
    const queued = (r?.report ?? []).reduce((n: number, x: { queued: string[] }) => n + x.queued.length, 0);
    setNote(r ? `Checked ${r.events} events: ${applied} added, ${queued} to review${f?.read?.length ? ` · read ${f.read.length} flyers` : ''}` : 'Couldn’t check right now');
    load();
  }

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: T.white }}><Radio size={18} color="#FFB27A" /> Line-up news</h2>
        <button type="button" onClick={checkNow} disabled={checking} style={{ height: 36, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: T.text, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <RefreshCw size={14} /> {checking ? 'Checking…' : 'Check now'}
        </button>
      </div>
      <p style={{ margin: '6px 0 12px', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.5, color: T.text2 }}>
        Every 2 hours we read official sites and the Ghana press. Acts confirmed by two outlets (or the official site plus one) are added automatically; the rest wait here.
      </p>
      {note && <p role="status" style={{ margin: '0 0 10px', fontFamily: FONT.sans, fontSize: 13.5, color: T.mintText }}>{note}</p>}
      {list === null ? <div style={{ ...card, height: 80 }} /> : list.length === 0 ? (
        <p style={{ ...card, margin: 0, padding: 16, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>Nothing to check.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((u) => (
            <article key={u.id} style={{ ...card, padding: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, color: T.white }}>
                <b>{u.value}</b> for <Link href={`/events/${u.events?.slug ?? ''}`} style={{ color: T.mintText, textDecoration: 'none', fontWeight: 600 }}>{u.events?.title ?? 'an event'}</Link>?
              </p>
              <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
                {u.sources.slice(0, 3).map((s, i) => (
                  <li key={i} style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" style={{ color: T.text2 }}>{s.source}</a> : s.source}: {s.title}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" disabled={busy === u.id} onClick={() => decide(u, true)} style={{ height: 38, padding: '0 16px', borderRadius: 999, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><Check size={15} /> Add to line-up</button>
                <button type="button" disabled={busy === u.id} onClick={() => decide(u, false)} style={{ height: 38, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: T.text, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><X size={15} /> Not right</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
          Added automatically lately: {recent.map((r) => `${r.value} (${r.events?.title ?? ''})`).join(', ')}
        </p>
      )}
    </section>
  );
}
