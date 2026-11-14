import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { loadAllEvents } from '@/lib/data/allEvents';
import { GUIDES, guideBySlug, days, type Day } from '@/lib/guides';
import { lookFor } from '@/lib/guideLooks';
import { Hero, Row } from '@/components/guides/GuideParts';
import { shareMeta } from '@/lib/og';
import { JsonLd, eventJsonLd, eventListJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { ticketDial } from '@/lib/events/dial';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';
import type { GhanaEvent } from '@/lib/types';

// Fresh on every visit ("today" moves), from an events list kept for a minute
export const dynamic = 'force-dynamic';
export const dynamicParams = false;
export function generateStaticParams() { return GUIDES.map((g) => ({ guide: g.slug })); }

const allEvents = unstable_cache(() => loadAllEvents(), ['guide-events'], { revalidate: 60, tags: ['events'] });
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const long = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const short = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
const known = (v?: string | null) => (v && !/\b(tba|tbc|to be announced)\b/i.test(v) ? v : null);
const city = (c?: string | null) => (c ? c.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : '');

async function listFor(slug: string) {
  const g = guideBySlug(slug);
  if (!g) return null;
  const d = days();
  const all = (await allEvents()).filter((e) => e.date >= d.today).sort((a, b) => a.date.localeCompare(b.date) || Number(!!b.hot) - Number(!!a.hot));
  const list = all.filter((e) => g.match(e, d));
  return { g, d, list, next: list.length ? [] : all.slice(0, 12) };
}

export async function generateMetadata({ params }: { params: { guide: string } }) {
  const r = await listFor(params.guide);
  if (!r) return {};
  const { g, d, list } = r;
  const when = g.slug === 'events-in-ghana-today' ? ` ${long(d.today)}.` : g.slug === 'events-in-ghana-this-weekend' ? ` ${short(d.weekendFrom)} to ${short(d.weekendTo)}.` : '';
  const lead = list.length ? ` ${list.length} listed now, including ${list.slice(0, 2).map((e) => e.title).join(' and ')}.` : '';
  return shareMeta({ title: g.title, description: `${g.about}${when}${lead}`.slice(0, 300), image: list.find((e) => e.image)?.image ?? null, path: `/${g.slug}` });
}

function faqsFor(slug: string, list: GhanaEvent[], d: Day, extra: { q: string; a: string }[]) {
  const top = list.slice(0, 4).map((e) => `${e.title} (${short(e.date)}${known(e.venue) ? `, ${e.venue}` : ''})`).join('; ');
  const dialEx = list.map((e) => ({ e, c: ticketDial(e) })).find((x) => x.c);
  const g = guideBySlug(slug)!;
  return [
    ...extra,
    { q: `What are the best ${g.h1.charAt(0).toLowerCase()}${g.h1.slice(1)}?`, a: list.length ? `Right now on TsaCoal: ${top}. The list on this page updates as soon as new shows are announced.` : `Nothing is listed for this yet. New shows are added as soon as they’re announced, so check back, or browse everything coming up on TsaCoal.` },
    { q: 'How do I buy tickets for events in Ghana?', a: `Most shows in Ghana sell tickets by mobile money short code: you dial the code and pay with MoMo.${dialEx ? ` For example, dial ${dialEx.c} for ${dialEx.e.title}.` : ''} Every listing on TsaCoal shows the short code or the official ticket link.` },
    { q: 'How do I find out about new shows first?', a: 'Follow the artists you like on TsaCoal and save shows to a calendar. You’ll get the ticket and line-up news as soon as it’s out, and a reminder the day before.' },
    ...(slug === 'events-in-ghana-this-weekend' ? [{ q: 'What’s on in Ghana this weekend?', a: list.length ? `${list.length} show${list.length === 1 ? '' : 's'} from ${long(d.weekendFrom)} to ${long(d.weekendTo)}, including ${list.slice(0, 3).map((e) => e.title).join(', ')}.` : `Nothing is listed for ${long(d.weekendFrom)} to ${long(d.weekendTo)} yet.` }] : []),
  ];
}

/** A guide page: one search people make, answered with the live list of shows and the common questions */
export default async function GuidePage({ params }: { params: { guide: string } }) {
  const r = await listFor(params.guide);
  if (!r) notFound();
  const { g, d, list, next } = r;
  const faqs = faqsFor(g.slug, list, d, g.faqs?.(list, d) ?? []);
  const range = g.slug === 'events-in-ghana-today' ? long(d.today) : g.slug === 'events-in-ghana-this-weekend' ? `${long(d.weekendFrom)} to ${long(d.weekendTo)}` : null;
  const shown = list.slice(0, 60);
  const look = lookFor(g.slug);
  // The venues these shows are at, busiest first
  const tally = new Map<string, number>();
  shown.forEach((e) => { const v = known(e.venue); if (v) tally.set(v, (tally.get(v) ?? 0) + 1); });
  const venues = Array.from(tally.entries()).sort((x, y) => y[1] - x[1]).slice(0, 8);

  return (
    <div style={{ minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' }}>
      <JsonLd data={[
        eventListJsonLd(g.h1, `/${g.slug}`, shown),
        breadcrumbJsonLd([['TsaCoal', '/'], [g.h1, `/${g.slug}`]]),
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
        ...shown.slice(0, 20).map((e) => eventJsonLd(e)),
      ]} />
      <Nav back="/" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(96px + env(safe-area-inset-top, 0px)) 20px 20px' }}>
        <nav aria-label="Breadcrumb" style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>
          <Link href="/" style={{ color: T.text3, textDecoration: 'none' }}>TsaCoal</Link> <span aria-hidden>›</span> {g.h1}
        </nav>
        <Hero h1={g.h1} look={look} range={range} count={list.length} nextUp={list[0] ? short(list[0].date) : null}
          flyers={(list.length ? shown : next).filter((e) => e.image).slice(0, 3).map((e) => ({ src: e.image!, title: e.title }))} />

        <h2 style={{ margin: '34px 0 0', fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{list.length ? 'What’s on' : 'Coming up across Ghana'}</h2>
        <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.55, color: T.text2 }}>
          {g.intro} {list.length ? `${list.length} ${list.length === 1 ? 'show is' : 'shows are'} listed right now, soonest first, with times, venues and how to get tickets.` : 'Nothing is listed for this right now; here’s what’s coming up next across Ghana.'}
        </p>
        <ul style={{ margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>{(list.length ? shown : next).map((e) => <Row key={e.slug} e={e} accent={look.accent} />)}</ul>
        {list.length > shown.length && <p style={{ marginTop: 14, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}><Link href="/events" style={{ color: look.accent }}>See all {list.length} on TsaCoal</Link></p>}

        {venues.length > 1 && (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>Where it happens</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {venues.map(([v, n]) => <span key={v} style={{ padding: '9px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.text }}>{v}{n > 1 ? <span style={{ color: T.text3 }}> · {n}</span> : null}</span>)}
            </div>
          </section>
        )}

        {look.about && (
          <section style={{ marginTop: 36, padding: 'clamp(20px, 4vw, 28px)', borderRadius: 26, background: `linear-gradient(160deg, ${look.accent}1F 0%, rgba(255,255,255,0.035) 60%)` }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{look.about.title}</h2>
            <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>{look.about.text}</p>
            <p style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: look.accent }}>Known for</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {look.about.knownFor.map((k) => <span key={k} style={{ padding: '8px 13px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.white }}>{k}</span>)}
            </div>
          </section>
        )}

        <section style={{ marginTop: 44 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>Questions people ask</h2>
          {faqs.map((f) => (
            <details key={f.q} style={{ marginTop: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
              <summary style={{ cursor: 'pointer', fontFamily: FONT.sans, fontSize: 15.5, fontWeight: 700, color: T.white }}>{f.q}</summary>
              <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.55, color: T.text2 }}>{f.a}</p>
            </details>
          ))}
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>More to explore</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
              <Link key={x.slug} href={`/${x.slug}`} style={{ padding: '9px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 600, color: T.text, textDecoration: 'none' }}>{x.h1}</Link>
            ))}
            <Link href="/december" style={{ padding: '9px 14px', borderRadius: 999, background: `${look.accent}1F`, fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, color: look.accent, textDecoration: 'none' }}>Detty December 2026</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
