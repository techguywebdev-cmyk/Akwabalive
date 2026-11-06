'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, ExternalLink, Search, X } from 'lucide-react';
import Nav from '@/components/layout/Nav';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { BTN } from '@/components/events/CardParts';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

type Row = {
  id: string; title: string; event_name: string; youtube_id: string; year: number | null; description: string | null;
  channel_name: string | null; official: boolean | null; status: string; available: boolean; found_by: string | null;
};

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hq720.jpg`;

/**
 * Admin: official videos the finder picked up from artists' and shows' own YouTube channels
 * wait here for approval, and reposts already live can be hidden.
 */
export default function MomentsReviewPage() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'pending' | 'reposts'>('pending');
  const [add, setAdd] = useState({ url: '', event_name: '', year: '', title: '' });
  const [addNote, setAddNote] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('moments')
      .select('id, title, event_name, youtube_id, year, description, channel_name, official, status, available, found_by')
      .in('status', ['pending', 'live']).order('published_at', { ascending: false, nullsFirst: false });
    setRows((data ?? []) as Row[]);
  }, [supabase]);

  useEffect(() => {
    if (loading) return;
    if (!user) { setAdmin(false); return; }
    supabase.rpc('is_akwaaba_admin').then(({ data }) => { setAdmin(data === true); if (data === true) load(); });
  }, [loading, user, supabase, load]);

  async function setStatus(r: Row, status: 'live' | 'rejected') {
    const patch: Record<string, unknown> = { status };
    if (status === 'live' && names[r.id]?.trim()) patch.event_name = names[r.id].trim();
    const { error } = await supabase.from('moments').update(patch).eq('id', r.id);
    if (!error) setRows((x) => x.map((y) => (y.id === r.id ? { ...y, ...patch } as Row : y)));
  }

  async function findNow() {
    setBusy(true); setNote('');
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/moments/find', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNote('Could not run the finder.'); return; }
    if (!j.enabled) { setNote('Add YOUTUBE_API_KEY in Vercel to turn the finder on.'); return; }
    setNote(`Looked up ${j.resolved} channels, scanned ${j.scanned}, found ${j.found} new video${j.found === 1 ? '' : 's'}.`);
    load();
  }

  async function addVideo() {
    setAddNote('');
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch('/api/moments/add', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(add) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setAddNote(j.error ?? 'Could not add it.'); return; }
    setAddNote('Added — it’s live in Moments.');
    setAdd({ url: '', event_name: '', year: '', title: '' });
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const reposts = rows.filter((r) => r.status === 'live' && !r.official);
  const shown = tab === 'pending' ? pending : reposts;

  if (admin === false) {
    return (
      <div style={{ minHeight: '100svh', background: GROUND }}>
        <Nav back="/organizer/dashboard" />
        <p style={{ padding: '120px 24px', textAlign: 'center', fontFamily: FONT.sans, color: T.text2 }}>Only the Akwaaba admin can review Moments.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: GROUND }}>
      <Nav back="/organizer/dashboard" />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'calc(84px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Moments review</h1>
        <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>
          Videos found on artists’ and shows’ own YouTube channels wait here. Approve the ones that belong on Akwaaba.
        </p>
        <button type="button" onClick={findNow} disabled={busy} style={{ ...BTN.primary, marginTop: 18, height: 46 }}>
          <Search size={17} /> {busy ? 'Looking…' : 'Find official videos now'}
        </button>
        {note && <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.mintText }}>{note}</p>}


        {/* Add a video the finder can't reach (posts on X, or any YouTube link) */}
        <section style={{ marginTop: 26, padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: 'none' }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: T.white }}>Add a video</h2>
          <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>Paste a YouTube or X link — it goes straight into Moments.</p>
          <input placeholder="https://x.com/... or https://youtube.com/..." value={add.url} onChange={(e) => setAdd((a) => ({ ...a, url: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 8, height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none' }} />
          <input placeholder="Show or event (e.g. Rapperholic)" value={add.event_name} onChange={(e) => setAdd((a) => ({ ...a, event_name: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 8, height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Title (optional)" value={add.title} onChange={(e) => setAdd((a) => ({ ...a, title: e.target.value }))} style={{ ...{ display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 8, height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none' }, flex: 1 }} />
            <input placeholder="Year" inputMode="numeric" value={add.year} onChange={(e) => setAdd((a) => ({ ...a, year: e.target.value }))} style={{ ...{ display: 'block', width: '100%', boxSizing: 'border-box' as const, marginTop: 8, height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none' }, width: 90 }} />
          </div>
          <button type="button" onClick={addVideo} disabled={!add.url || !add.event_name} style={{ ...BTN.primary, marginTop: 12, height: 44, width: '100%' }}>Add to Moments</button>
          {addNote && <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.mintText }}>{addNote}</p>}
        </section>

        <div role="tablist" style={{ display: 'inline-flex', marginTop: 24, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
          {([['pending', `To review · ${pending.length}`], ['reposts', `Reposts live · ${reposts.length}`]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{
              height: 38, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600,
              background: tab === k ? GRAD.mint : 'transparent', color: tab === k ? T.onMint : T.text2,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
          {shown.length === 0 && (
            <p style={{ fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>
              {tab === 'pending' ? 'Nothing waiting. The finder checks channels in the background; new official videos show up here.' : 'No reposts live — every video is from an official channel.'}
            </p>
          )}
          {shown.map((r) => (
            <article key={r.id} style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: 'none' }}>
              <a href={`https://www.youtube.com/watch?v=${r.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ position: 'relative', display: 'block', aspectRatio: '16 / 9', background: '#000' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(r.youtube_id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { const i = e.currentTarget; if (i.src.includes('hq720')) i.src = i.src.replace('hq720', 'hqdefault'); }} />
                <span style={{ position: 'absolute', top: 10, right: 10, padding: '5px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 12, color: T.white }}>
                  Watch <ExternalLink size={12} />
                </span>
              </a>
              <div style={{ padding: 16 }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, color: r.official ? T.mintText : T.text3 }}>
                  {r.official && <BadgeCheck size={14} />}{r.channel_name ?? 'Unknown channel'}{r.year ? ` · ${r.year}` : ''}
                </p>
                <h2 style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: T.white }}>{r.title}</h2>
                {tab === 'pending' && (
                  <label style={{ display: 'block', marginTop: 12 }}>
                    <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>Show / event name</span>
                    <input defaultValue={r.event_name} onChange={(e) => setNames((x) => ({ ...x, [r.id]: e.target.value }))}
                      style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15, outline: 'none' }} />
                  </label>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  {tab === 'pending' && (
                    <button type="button" onClick={() => setStatus(r, 'live')} style={{ ...BTN.primary, flex: 1, height: 44 }}><Check size={17} /> Approve</button>
                  )}
                  <button type="button" onClick={() => setStatus(r, 'rejected')} style={{ ...BTN.secondary, flex: tab === 'pending' ? undefined : 1, height: 44 }}>
                    <X size={17} /> {tab === 'pending' ? 'Reject' : 'Hide from Moments'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p style={{ marginTop: 30, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          <Link href="/moments" style={{ color: T.mintText, textDecoration: 'none' }}>Open Moments</Link>
        </p>
      </main>
    </div>
  );
}
