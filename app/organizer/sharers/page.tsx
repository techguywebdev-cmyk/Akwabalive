'use client';

import { useEffect, useMemo, useState } from 'react';
import Nav from '@/components/layout/Nav';
import { createClient } from '@/lib/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

type Row = { by_username: string; full_name: string | null; avatar_url: string | null; visitors: number; joined: number; last_visit: string };

const ago = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 3600000;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/** Admin: who brings people to Tsacoal through the links and cards they share */
export default function SharersPage() {
  const isAdmin = useIsAdmin();
  const db = useMemo(() => createClient(), []);
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    setRows(null);
    db.rpc('share_leaderboard', { p_days: days }).then(({ data }) => setRows((data ?? []) as Row[]));
  }, [isAdmin, db, days]);

  const total = rows?.reduce((a, r) => ({ v: a.v + Number(r.visitors), j: a.j + Number(r.joined) }), { v: 0, j: 0 });

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/organizer/review" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(32px, 9vw, 44px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.02, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>Who brings people</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>People who opened someone’s shared link or card, and how many of them then signed in.</p>

        {!isAdmin ? (
          <p style={{ marginTop: 24, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>Only the admin can see this.</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
              {[7, 30, 90].map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} style={{ height: 34, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: days === d ? 'rgba(123,227,168,0.16)' : 'rgba(255,255,255,0.06)', color: days === d ? T.mint : T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>{d} days</button>
              ))}
            </div>

            {total && (
              <div style={{ display: 'flex', gap: 28, marginTop: 22 }}>
                {[['Visits from shares', total.v], ['Then signed in', total.j]].map(([l, n]) => (
                  <div key={l as string}>
                    <div style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', background: GRAD.mint, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{n}</div>
                    <div style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}

            {rows && !rows.length && <p style={{ marginTop: 24, fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>No visits from shared links yet. They show up here as soon as someone opens one.</p>}
            {rows && rows.length > 0 && (
              <ol style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4 }}>
                {rows.map((r, i) => (
                  <li key={r.by_username} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' }}>
                    <span style={{ width: 22, textAlign: 'right', fontFamily: FONT.display, fontSize: 15, fontWeight: 800, color: i < 3 ? T.mint : T.text3 }}>{i + 1}</span>
                    {r.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.avatar_url} alt="" width={42} height={42} style={{ width: 42, height: 42, borderRadius: 14, objectFit: 'cover' }} />
                      : <span style={{ width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#26302B', color: '#D6FBE6', fontFamily: FONT.display, fontSize: 16, fontWeight: 800 }}>{r.by_username.charAt(0).toUpperCase()}</span>}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.white }}>{r.full_name || r.by_username}</span>
                      <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>@{r.by_username} · last {ago(r.last_visit)}</span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: T.white }}>{r.visitors}</span>
                      <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 11.5, color: T.text3 }}>{Number(r.joined) ? `${r.joined} joined` : 'visits'}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </div>
  );
}
