import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import { loadAllEvents } from '@/lib/data/allEvents';
import { GUIDES, guideBySlug, days, type Day } from '@/lib/guides';
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

function Row({ e }: { e: GhanaEvent }) {
  const dial = ticketDial(e);
  const price = e.priceUnknown ? null : e.price === 0 ? 'Free' : `From GH₵${e.price.toLocaleString()}`;
  return (
    <li style={{ listStyle: 'none' }}>
      <Link href={`/events/${e.slug}`} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.hairline}`, textDecoration: 'none' }}>
        <span style={{ flexShrink: 0, width: 64, height: 80, borderRadius: 12, overflow: 'hidden', background: '#0B1510' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {e.image && <img src={e.image} alt={`${e.title} flyer`} loading="lazy" width={64} height={80} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.12em', color: T.mintText }}>{short(e.date).toUpperCase()}{known(e.time) ? ` · ${e.time}` : ''}</span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.display, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: T.white }}>{e.title}</span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13.5, color: T.text2 }}>{[known(e.venue), city(e.city)].filter(Boolean).join(', ')}</span>
          {(dial || price) && <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>{[price, dial ? `Tickets: dial ${dial}` : null].filter(Boolean).join(' · ')}</span>}
        </span>
      </Link>
    </li>
  );
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
        <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: 'clamp(34px, 8.5vw, 52px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.02, background: GRAD.text, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', paddingBottom: '0.06em', textWrap: 'balance' }}>{g.h1}</h1>
        {range && <p style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.mintText }}>{range}</p>}
        <p style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.55, color: T.text2 }}>
          {g.intro} {list.length ? `${list.length} ${list.length === 1 ? 'show is' : 'shows are'} listed right now, soonest first, with times, venues and how to get tickets.` : 'Nothing is listed for this right now; here’s what’s coming up next across Ghana.'}
        </p>

        <ul style={{ margin: '22px 0 0', padding: 0 }}>{(list.length ? shown : next).map((e) => <Row key={e.slug} e={e} />)}</ul>
        {list.length > shown.length && <p style={{ marginTop: 14, fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}><Link href="/events" style={{ color: T.mintText }}>See all {list.length} on TsaCoal</Link></p>}

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
            <Link href="/december" style={{ padding: '9px 14px', borderRadius: 999, background: 'rgba(123,227,168,0.12)', fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, color: T.mintText, textDecoration: 'none' }}>Detty December 2026</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
