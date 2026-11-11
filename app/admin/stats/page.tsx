'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

type Pair = { now: number; prev: number };
type Stats = {
  days: number;
  totals: { people: number; calendars: number; ticketsSold: number; revenue: number };
  period: Record<'signups' | 'views' | 'visitors' | 'impressions' | 'saves' | 'going' | 'follows' | 'alerts' | 'tickets' | 'shareVisits', Pair>;
  series: { day: string; views: number; visitors: number; saves: number; signups: number }[];
  topEvents: { slug: string; title: string; date: string | null; image: string | null; views: number; visitors: number; saves: number; going: number }[];
  topSharers: { username: string; visits: number }[];
};

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString('en-GB'));
const soft = 'linear-gradient(120deg, rgba(123,227,168,0.09), rgba(255,255,255,0.035) 55%)';
const eyebrow: React.CSSProperties = { margin: 0, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.mintText };

function Change({ p }: { p: Pair }) {
  if (!p.prev && !p.now) return null;
  if (!p.prev) return <span style={{ color: T.mintText }}>new</span>;
  const pct = Math.round(((p.now - p.prev) / p.prev) * 100);
  return <span style={{ color: pct >= 0 ? T.mintText : '#FF9C8A' }}>{pct >= 0 ? '+' : ''}{pct}%</span>;
}

function Tile({ label, p, big }: { label: string; p: Pair; big?: boolean }) {
  return (
    <div style={{ padding: '16px 16px 14px', borderRadius: 20, background: soft }}>
      <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontFamily: FONT.display, fontSize: big ? 40 : 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: T.white }}>{fmt(p.now)}</p>
      <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700 }}><Change p={p} /></p>
    </div>
  );
}

/** Views by day as soft mint bars; the busiest day is labelled */
function Chart({ series }: { series: Stats['series'] }) {
  const max = Math.max(1, ...series.map((d) => d.views));
  const peak = series.reduce((a, b) => (b.views > a.views ? b : a), series[0]);
  return (
    <div style={{ padding: '18px 16px 12px', borderRadius: 22, background: soft }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <p style={eyebrow}>Event views by day</p>
        {peak?.views ? <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>Busiest: {new Date(peak.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {fmt(peak.views)}</p> : null}
      </div>
      <div role="img" aria-label="Event views per day" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, marginTop: 16 }}>
        {series.map((d) => (
          <span key={d.day} title={`${d.day}: ${d.views} views, ${d.visitors} people, ${d.saves} saves, ${d.signups} sign-ups`}
            style={{ flex: 1, minWidth: 2, height: `${Math.max(2, (d.views / max) * 100)}%`, borderRadius: 4, background: d.views ? GRAD.mint : 'rgba(255,255,255,0.08)', opacity: d.views ? 0.92 : 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT.sans, fontSize: 11.5, color: T.text3 }}>
        <span>{new Date(series[0].day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Private numbers for the TsaCoal admin */
export default function AdminStatsPage() {
  const { user, loading } = useAuth();
  const db = useMemo(() => createClient(), []);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let live = true;
    setErr(null);
    db.auth.getSession().then(async ({ data: { session } }) => {
      const r = await fetch(`/api/admin/stats?days=${days}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
      if (!live) return;
      if (!r.ok) { setErr(r.status === 403 ? 'This page is only for the TsaCoal admin.' : 'Couldn’t load the numbers. Try again.'); return; }
      setStats(await r.json());
    });
    return () => { live = false; };
  }, [user, loading, db, days]);

  const p = stats?.period;
  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <Nav back="/" />
      <main style={{ maxWidth: 820, margin: '0 auto', padding: 'calc(100px + env(safe-area-inset-top, 0px)) 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(34px, 9vw, 48px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.02, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: '0.06em' }}>Stats</h1>
          <div role="tablist" aria-label="Period" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" role="tab" aria-selected={days === d} onClick={() => { setStats(null); setDays(d); }} style={{ height: 32, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, ...(days === d ? { background: GRAD.mint, color: T.onMint } : { background: 'transparent', color: T.text2 }) }}>{d} days</button>
            ))}
          </div>
        </div>
        <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Compared with the {days} days before. Visitors, countries and where traffic comes from are in Vercel Analytics.</p>

        {!user && !loading ? (
          <p style={{ marginTop: 32, fontFamily: FONT.sans, color: T.text2 }}><Link href="/auth?next=/admin/stats" style={{ color: T.mintText }}>Sign in</Link> with the admin account.</p>
        ) : err ? (
          <p style={{ marginTop: 32, fontFamily: FONT.sans, color: T.text2 }}>{err}</p>
        ) : !stats || !p ? (
          <div aria-busy="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 28 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="ak-sk" style={{ height: 104, borderRadius: 20 }} />)}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 28 }}>
              <Tile label="People viewing events" p={p.visitors} big />
              <Tile label="Event views" p={p.views} big />
              <Tile label="New sign-ups" p={p.signups} big />
              <Tile label="Nights saved" p={p.saves} big />
              <Tile label="Going / interested" p={p.going} />
              <Tile label="Follows" p={p.follows} />
              <Tile label="Ticket alerts" p={p.alerts} />
              <Tile label="Visits from shared links" p={p.shareVisits} />
              <Tile label="Tickets" p={p.tickets} />
              <Tile label="Seen in feeds" p={p.impressions} />
            </div>

            <p style={{ margin: '18px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>
              All time: <b style={{ color: T.white }}>{fmt(stats.totals.people)}</b> people · <b style={{ color: T.white }}>{fmt(stats.totals.calendars)}</b> calendars · <b style={{ color: T.white }}>{fmt(stats.totals.ticketsSold)}</b> tickets · <b style={{ color: T.white }}>₵{fmt(Math.round(stats.totals.revenue))}</b> sold
            </p>

            <div style={{ marginTop: 28 }}><Chart series={stats.series} /></div>

            <section style={{ marginTop: 36 }}>
              <p style={eyebrow}>Top events</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {stats.topEvents.length ? stats.topEvents.map((e, i) => (
                  <Link key={e.slug} href={`/events/${e.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, background: soft, textDecoration: 'none' }}>
                    <span style={{ width: 22, textAlign: 'center', fontFamily: FONT.display, fontWeight: 800, color: T.text3 }}>{i + 1}</span>
                    <span style={{ width: 40, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {e.image && <img src={e.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                      <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>
                        {[`${fmt(e.views)} views`, `${fmt(e.visitors)} people`, e.saves ? `${e.saves} saved` : null, e.going ? `${e.going} going` : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Link>
                )) : <p style={{ margin: 0, fontFamily: FONT.sans, color: T.text3 }}>Nothing yet in this period.</p>}
              </div>
            </section>

            {stats.topSharers.length > 0 && (
              <section style={{ marginTop: 36 }}>
                <p style={eyebrow}>Bringing people in</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  {stats.topSharers.map((s) => (
                    <span key={s.username} style={{ padding: '8px 12px', borderRadius: 999, background: soft, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>@{s.username} · <b style={{ color: T.white }}>{s.visits}</b></span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
