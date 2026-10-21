'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Nav, { HeaderIconButton } from '@/components/layout/Nav';
import { Icon } from '@/components/ui/Icon';
import { T, FONT, alpha } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventAccent, toHex } from '@/lib/events/accent';
import { resolveLineupNames } from '@/components/ui/LineupChips';
import { getTiers } from '@/lib/events/tiers';
import FlyerCanvas from '@/components/events/FlyerCanvas';
import FriendsStrip from '@/components/social/FriendsStrip';
import { ActionBar, TicketsSheet, ticketsLabel } from '@/components/events/EventActions';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { parseDay, longDay } from '@/lib/dates';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { extractYoutubeId } from '@/lib/events/rank';
import { cityLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import PaystackCheckout from '@/components/payment/PaystackCheckout';

export type { CheckoutTier } from '@/lib/events/tiers';

function getDescription(event: GhanaEvent): string {
  if (event.description?.trim()) return event.description.trim();
  const descs: Record<string, string> = {
    festival:  `${event.title} is one of Ghana\u2019s most anticipated events of the year. Bringing together the finest artists, performers, and creatives from across the continent.\n\nDoors open one hour before showtime. Come ready.`,
    concert:   `An unforgettable night of live music at ${event.venue}. ${event.title} delivers the kind of show that stays with you long after the last note fades.\n\nPremium sound, stunning production, and an audience united by music.`,
    culture:   `${event.title} celebrates the rich cultural heritage of Ghana. A gathering of tradition, art, and community spirit.\n\nWitness traditional ceremonies, kente exhibitions, drumming and dance. Bring the family.`,
    food:      `${event.title} brings together Ghana\u2019s finest chefs and street food vendors for a celebration of Ghanaian cuisine.\n\nLive cooking demonstrations, cocktail bars, and the Jollof Wars. Come hungry.`,
    nightlife: `${event.title} is the night everyone will be talking about. World-class DJs, precision lighting, and an environment designed around the moment.\n\nDress to impress.`,
    sports:    `${event.title} brings elite competition and community spirit to Ghanaian soil.\n\nFeel the electricity of a full crowd. Experience sport the way it was meant to be \u2014 live and loud.`,
    tech:      `${event.title} is Ghana\u2019s leading technology gathering. Founders, engineers, investors, and thinkers connecting to build the future.\n\nKeynotes, workshops, startup pitches, and career-defining networking.`,
    art:       `${event.title} showcases the depth of Ghanaian and Pan-African artistic talent.\n\nMeet the artists. Acquire original works.`,
  };
  return descs[event.category] ?? descs.festival;
}

export default function EventDetailClient({ event, related, seriesMomentId }: { event: GhanaEvent; related: GhanaEvent[]; seriesMomentId?: string | null }) {
  const { user } = useAuth();
  const supabase = createClient();

  const [rgb, setRgb] = useState<RGB>(categoryAccent(event.category));
  const [ticketOpen,     setTicketOpen]     = useState(false);
  const [inDreamList,    setInDreamList]    = useState(false);
  const [isGoing,        setIsGoing]        = useState(false);
  const [ticketsOpen,    setTicketsOpen]    = useState(false);
  const [dreamLoading,   setDreamLoading]   = useState(false);
  const [dreamToast,     setDreamToast]     = useState('');
  const [ticketSuccess,  setTicketSuccess]  = useState(false);
  const [showPromoVideo, setShowPromoVideo] = useState(false);
  const [wantSound, setWantSound] = useState(false);

  useEffect(() => {
    let live = true;
    eventAccent(event.image, event.category).then((c) => { if (live) setRgb(c); });
    return () => { live = false; };
  }, [event.image, event.category]);

  const tiers       = getTiers(event);
  const description = getDescription(event);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('tickets') !== '1') return;
    if (isListedEvent(event) && event.ticketUrl) {
      window.open(event.ticketUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setTicketOpen(true);
  }, [event.slug]);

  const paragraphs  = description.split('\n\n');

  const ytId = event.promoVideoUrl ? extractYoutubeId(event.promoVideoUrl) : null;
  const isMp4 = !!event.promoVideoUrl && /\.(mp4|webm)(\?|$)/i.test(event.promoVideoUrl);

  useEffect(() => {
    const onUnmute = () => setWantSound(true);
    window.addEventListener('akwaaba-unmute-promo', onUnmute);
    return () => window.removeEventListener('akwaaba-unmute-promo', onUnmute);
  }, []);

  useEffect(() => {
    setShowPromoVideo(false);
    setWantSound(false);
  }, [event.slug]);

  // Start promo without depending on image load (avoids stuck flyer)
  useEffect(() => {
    if (!(ytId || isMp4)) return;
    const t = window.setTimeout(() => setShowPromoVideo(true), 900);
    return () => window.clearTimeout(t);
  }, [ytId, isMp4, event.slug]);

  // Browsers block unmuted autoplay — unlock audio on first user gesture (no icon)
  useEffect(() => {
    if (!showPromoVideo) return;
    const unlock = () => {
      // reload embed unmuted by flipping a data attribute via custom event handled below
      window.dispatchEvent(new CustomEvent('akwaaba-unmute-promo'));
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('scroll', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('scroll', unlock);
    };
  }, [showPromoVideo]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('dream_events').select('id')
      .eq('user_id', user.id).eq('event_slug', event.slug)
      .maybeSingle().then(({ data }) => setInDreamList(!!data));
    supabase
      .from('event_attendance').select('id')
      .eq('user_id', user.id).eq('event_slug', event.slug).eq('status', 'going')
      .maybeSingle().then(({ data }) => setIsGoing(!!data));
  }, [user, event.slug]);

  async function toggleDreamList() {
    if (!user) { window.location.href = '/auth'; return; }
    setDreamLoading(true);
    if (inDreamList) {
      await supabase.from('dream_events').delete().eq('user_id', user.id).eq('event_slug', event.slug);
      setInDreamList(false);
      showToast('Removed from your Dream List');
    } else {
      await supabase.from('dream_events').upsert({
        user_id: user.id, event_slug: event.slug,
        event_title: event.title, event_image: event.image, is_public: true,
      }, { onConflict: 'user_id,event_slug' });
      setInDreamList(true);
      showToast('Saved to your Dream List');
    }
    setDreamLoading(false);
  }

  function showToast(msg: string) {
    setDreamToast(msg);
    setTimeout(() => setDreamToast(''), 2800);
  }

  const listed = isListedEvent(event) && !!event.ticketUrl;
  const free = event.price === 0;
  const a = toHex(rgb);
  const lineup = resolveLineupNames(event);
  const short = splitEventTitle(event.title);
  const parsed = parseDay(event.date);
  const eventDate = parsed ?? new Date(0);
  const validDate = !!parsed;
  const longDate = parsed ? longDay(parsed) : event.dateLabel;
  const daysAway = validDate ? Math.round((eventDate.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000) : null;
  const countdown = daysAway == null ? '' : daysAway < 0 ? 'Past event' : daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${cityLabel(event.city)}, Ghana`)}`;
  const calendar = validDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.date.slice(0, 10).replace(/-/g, '')}/${new Date(eventDate.getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, '')}&location=${encodeURIComponent(`${event.venue}, Ghana`)}`
    : null;

  async function toggleGoing() {
    if (!user) { window.location.href = '/auth'; return; }
    const on = isGoing;
    setIsGoing(!on);
    const { error } = on
      ? await supabase.from('event_attendance').delete().eq('user_id', user.id).eq('event_slug', event.slug)
      : await supabase.from('event_attendance').upsert({ user_id: user.id, event_slug: event.slug, status: 'going', is_public: true }, { onConflict: 'user_id,event_slug' });
    if (error) setIsGoing(on);
    else showToast(on ? 'Removed from your plans' : "You're going — friends can see it");
  }

  async function share() {
    const url = `${window.location.origin}/events/${event.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: event.title, url }); return; }
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch { /* cancelled */ }
  }

  const eyebrow: CSSProperties = { fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' };
  const infoRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: `1px solid ${T.hairline}` };
  const primary: CSSProperties = {
    height: 52, padding: '0 28px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    color: T.white, background: alpha(a, 0.22), border: `1px solid ${alpha(a, 0.6)}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <Nav
        active="Events"
        back="/events"
        tabs={false}
        actions={
          <>
            {seriesMomentId && <HeaderIconButton label="Watch the last edition" icon="moments" href={`/moments?id=${seriesMomentId}&from=${encodeURIComponent(`/events/${event.slug}`)}`} />}
          </>
        }
      />

      {(dreamToast || ticketSuccess) && (
        <div role="status" style={{ position: 'fixed', top: 'calc(80px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: 'rgba(5,18,11,0.92)', border: '1px solid rgba(123,227,168,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 999, padding: '10px 18px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mintText, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {ticketSuccess ? <><Icon name="check" size={16} /> Ticket confirmed — it&apos;s in My tickets</> : dreamToast}
        </div>
      )}

      {/* Hero: flyer (or promo video) fading into the green-black ground */}
      <div style={{ position: 'relative', width: '100%', height: 'min(128vw, 660px)', minHeight: 440, overflow: 'hidden' }}>
        {/* The flyer, whole, on its own blurred canvas */}
        <div style={{ position: 'absolute', inset: 0, opacity: showPromoVideo ? 0 : 1, transition: 'opacity 900ms ease' }}>
          <FlyerCanvas src={event.image} accent={a} category={event.category} area={{ top: 'calc(76px + env(safe-area-inset-top, 0px))', bottom: 28, left: 20, right: 20 }} />
        </div>
        {showPromoVideo && ytId && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <iframe
              key={wantSound ? 'snd' : 'mut'}
              title="Announcement"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${wantSound ? 0 : 1}&controls=0&loop=1&playlist=${ytId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0`}
              allow="autoplay; encrypted-media; picture-in-picture"
              style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', border: 'none', pointerEvents: 'none', transform: 'translate(-50%, -50%) scale(2.15)' }}
            />
          </div>
        )}
        {showPromoVideo && isMp4 && event.promoVideoUrl && (
          <video key={wantSound ? 'vs' : 'vm'} src={event.promoVideoUrl} autoPlay muted={!wantSound} loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,6,0.45) 0%, rgba(3,8,6,0) 18%, rgba(3,8,6,0) 85%, #030806 100%)', pointerEvents: 'none' }} />
      </div>

      <main style={{ position: 'relative', maxWidth: 720, margin: '8px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: a }}>
          {[event.category, event.badge && event.badge.toLowerCase() !== event.category ? event.badge.toLowerCase() : '', event.recurring ? 'annual' : '']
            .filter(Boolean)
            .map((t, i) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {i > 0 && <span aria-hidden style={{ width: 3, height: 3, borderRadius: 2, background: a, opacity: 0.6 }} />}
                {t}
              </span>
            ))}
        </div>
        <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: short.title.length > 22 ? 'clamp(34px, 8vw, 56px)' : 'clamp(40px, 10vw, 68px)', fontWeight: 800, lineHeight: 0.96, letterSpacing: '-0.035em', color: T.white, textShadow: `0 0 42px ${alpha(a, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
          {short.title}
        </h1>
        {short.subtitle && (
          <p style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.82)' }}>{short.subtitle}</p>
        )}
        <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{eventBlurb(event, 160)}</p>

        <div style={{ marginTop: 24 }}>
          <ActionBar
            accent={a}
            maxWidth={520}
            actions={[
              { key: 'tickets', icon: 'tickets', label: ticketsLabel(event), aria: `Tickets, ${ticketsLabel(event)}`, primary: true, onClick: () => setTicketsOpen(true) },
              { key: 'going', icon: 'goingUser', label: isGoing ? 'Going' : "I'm going", on: isGoing, onClick: toggleGoing },
              { key: 'save', icon: 'saveTag', label: inDreamList ? 'Saved' : 'Save', on: inDreamList, onClick: toggleDreamList },
              { key: 'share', icon: 'share', label: 'Share', onClick: share },
              ...(calendar && daysAway != null && daysAway >= 0
                ? [{ key: 'cal', icon: 'calendarAdd' as const, label: 'Calendar', href: calendar, external: true }]
                : [{ key: 'map', icon: 'directions' as const, label: 'Directions', href: maps, external: true }]),
            ]}
          />
        </div>

        <FriendsStrip slug={event.slug} variant="full" />

        <div style={{ marginTop: 28 }}>
          <div style={infoRow}>
            <Icon name="calendar" size={22} color="rgba(255,255,255,0.7)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>{longDate}</p>
              <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{[event.time, countdown].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div style={{ ...infoRow, borderBottom: `1px solid ${T.hairline}` }}>
            <Icon name="mapPin" size={22} color="rgba(255,255,255,0.7)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>{event.venue}</p>
              <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>{[event.area, cityLabel(event.city)].filter(Boolean).join(', ')}</p>
            </div>
            <a href={maps} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText, textDecoration: 'none' }}>Directions</a>
          </div>
        </div>


        <section style={{ marginTop: 36 }}>
          <h2 style={eyebrow}>About</h2>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ margin: i ? '14px 0 0' : '4px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)' }}>{p}</p>
          ))}
        </section>

        {lineup.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2 style={eyebrow}>Line-up</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {lineup.map((name, i) => (
                <li key={name} style={{ padding: '12px 0', borderBottom: i === lineup.length - 1 ? 'none' : `1px solid ${T.hairline}`, fontFamily: FONT.display, fontSize: i === 0 ? 22 : 18, fontWeight: i === 0 ? 700 : 600, letterSpacing: '-0.02em', color: i === 0 ? T.white : 'rgba(255,255,255,0.85)' }}>
                  {name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="tickets" style={{ marginTop: 34 }}>
          <h2 style={eyebrow}>Tickets</h2>
          {listed ? (
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.6, color: T.text2 }}>
              Tickets are sold by {event.ticketSource || 'the organiser'}, not on Akwaaba. We list the event so you can find it — buy only on the official page.
            </p>
          ) : (
            <>
              {tiers.map((tier, i) => (
                <div key={tier.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: i === tiers.length - 1 ? 'none' : `1px solid ${T.hairline}`, color: tier.available ? T.white : 'rgba(255,255,255,0.4)' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, textDecoration: tier.available ? 'none' : 'line-through' }}>{tier.name}</span>
                    <span style={{ fontFamily: FONT.sans, fontSize: 13, color: !tier.available ? 'rgba(255,255,255,0.4)' : tier.spots <= 20 ? a : T.text2 }}>
                      {!tier.available ? 'Sold out' : tier.spots <= 20 ? `${tier.spots} left` : tier.desc}
                    </span>
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: tier.price === 0 && tier.available ? T.mintText : undefined }}>
                    {tier.price === 0 ? 'Free' : `GH₵ ${tier.price.toLocaleString()}`}
                  </span>
                </div>
              ))}
              <p style={{ margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
                <Icon name="lock" size={16} /> Pay with MoMo or card · secured by Paystack · QR ticket sent instantly
              </p>
            </>
          )}
        </section>

        {event.organizerUsername && (
          <section style={{ marginTop: 34 }}>
            <h2 style={eyebrow}>Presented by</h2>
            <Link href={`/organizer/${event.organizerUsername}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none', color: T.white }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F5A3F', color: '#D6FBE6', fontFamily: FONT.sans, fontWeight: 600 }}>
                {event.organizerAvatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={event.organizerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (event.organizerName || event.organizerUsername || 'O')[0].toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600 }}>{event.organizerName || event.organizerUsername}</span>
                <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>@{event.organizerUsername} · all their events</span>
              </span>
              <Icon name="open" size={18} color="rgba(255,255,255,0.4)" />
            </Link>
          </section>
        )}

        {related.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>More like this</h2>
              <Link href="/events?view=list" style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText, textDecoration: 'none' }}>See all</Link>
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 14, overflowX: 'auto', marginRight: -20, paddingRight: 20 }}>
              {related.slice(0, 6).map((ev) => (
                <Link key={ev.slug} href={`/events/${ev.slug}`} style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: T.white }}>
                  <span style={{ width: 150, height: 188, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.title}</span>
                  <span style={{ marginTop: -6, fontFamily: FONT.sans, fontSize: 12.5, color: T.text2 }}>{ev.price === 0 ? 'Free' : `GH₵ ${ev.price.toLocaleString()}`}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom bar: price + the one main action */}
      <div style={{ position: 'fixed', zIndex: 150, left: 0, right: 0, bottom: 0, padding: '18px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 20px', background: 'linear-gradient(180deg, rgba(3,8,6,0) 0%, rgba(3,8,6,0.92) 32%, #030806 100%)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text2 }}>{free ? 'Entry' : 'From'}</span>
            <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{free ? 'Free' : `GH₵ ${event.price.toLocaleString()}`}</span>
          </span>
          {daysAway != null && daysAway < 0 ? (
            <span style={{ ...primary, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.text2, cursor: 'default' }}>Event has ended</span>
          ) : listed ? (
            <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" style={primary}>
              Tickets on {event.ticketSource || 'official site'} <Icon name="open" size={16} />
            </a>
          ) : daysAway != null && daysAway < 0 ? (
            <span style={{ ...primary, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.text2, cursor: 'default' }}>Event has ended</span>
          ) : (
            <button type="button" onClick={() => setTicketsOpen(true)} style={primary}>
              {free ? 'Reserve a spot' : 'Get tickets'}
            </button>
          )}
        </div>
      </div>

      {ticketsOpen && (
        <TicketsSheet
          event={event}
          accent={a}
          onClose={() => setTicketsOpen(false)}
          onBuy={() => { setTicketsOpen(false); setTicketOpen(true); }}
        />
      )}

      {ticketOpen && !isListedEvent(event) && (
        <PaystackCheckout
          event={event}
          tiers={tiers}
          onClose={() => setTicketOpen(false)}
          onSuccess={() => {
            setTicketOpen(false);
            setTicketSuccess(true);
            setTimeout(() => setTicketSuccess(false), 5000);
          }}
        />
      )}
    </div>
  );
}
