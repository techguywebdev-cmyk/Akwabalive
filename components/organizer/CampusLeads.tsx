'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Plus, X, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { card } from '@/components/organizer/ui';
import { T, FONT } from '@/lib/thiscene';

type Lead = { id: string; title: string; link: string; source: string | null; school: string | null; created_at: string };

/** Campus nights spotted in the press: open the story, then make the event from its link (or from the flyer) */
export default function CampusLeads() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<Lead[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('event_leads').select('id, title, link, source, school, created_at').eq('kind', 'campus').eq('status', 'pending').order('created_at', { ascending: false }).limit(40);
    setList((data ?? []) as Lead[]);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function decide(l: Lead, status: 'added' | 'dismissed') {
    setList((x) => (x ?? []).filter((y) => y.id !== l.id));
    await supabase.from('event_leads').update({ status, decided_at: new Date().toISOString() }).eq('id', l.id);
  }

  async function checkNow() {
    setChecking(true); setNote('');
    const t = (await supabase.auth.getSession()).data.session?.access_token;
    const r = await fetch('/api/events/campus', { headers: { authorization: `Bearer ${t}` } }).then((x) => x.json()).catch(() => null);
    setChecking(false);
    setNote(r && typeof r.read === 'number' ? `Read ${r.read} stories: ${r.added} new campus ${r.added === 1 ? 'lead' : 'leads'}` : 'Couldn’t check right now');
    load();
  }

  const ghost: React.CSSProperties = { height: 38, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: T.text, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', textDecoration: 'none' };

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: T.white }}><GraduationCap size={19} color={T.mintText} /> Campus nights</h2>
        <button type="button" onClick={checkNow} disabled={checking} style={{ ...ghost, height: 36, fontSize: 13 }}><RefreshCw size={14} /> {checking ? 'Checking…' : 'Check now'}</button>
      </div>
      <p style={{ margin: '6px 0 12px', fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.5, color: T.text2 }}>
        SRC weeks, hall weeks and artiste nights in the news, checked every 2 hours. Open the story, then add the event from its ticket link or flyer.
      </p>
      {note && <p role="status" style={{ margin: '0 0 10px', fontFamily: FONT.sans, fontSize: 13.5, color: T.mintText }}>{note}</p>}
      {list === null ? <div style={{ ...card, height: 80 }} /> : list.length === 0 ? (
        <p style={{ ...card, margin: 0, padding: 16, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>No campus news right now. Most SRC and hall weeks run February to August.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((l) => (
            <article key={l.id} style={{ ...card, padding: 14 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.mintText }}>{[l.school && l.school !== 'Campus' ? l.school : null, l.source].filter(Boolean).join(' · ')}</p>
              <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 4, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.4, color: T.white, textDecoration: 'none' }}>{l.title}</a>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Link href={`/organizer/events/from-link?url=${encodeURIComponent(l.link)}`} onClick={() => decide(l, 'added')} style={{ ...ghost, border: 'none', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontWeight: 700 }}><Plus size={15} /> Add event</Link>
                <button type="button" onClick={() => decide(l, 'dismissed')} style={ghost}><X size={15} /> Not an event</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
