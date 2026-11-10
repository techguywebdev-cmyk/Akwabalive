'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Nav, { HeaderIconButton } from '@/components/layout/Nav';
import { Icon } from '@/components/ui/Icon';
import { T, FONT, alpha, GRAD } from '@/lib/thiscene';
import { type RGB, categoryAccent, eventColours, NEUTRAL_ACCENT, toHex } from '@/lib/events/accent';
import { resolveLineupNames } from '@/components/ui/LineupChips';
import { artistForName } from '@/lib/data/artists';
import PartOfSeries from '@/components/series/PartOfSeries';
import RatingSection from '@/components/ratings/RatingSection';
import { getTiers } from '@/lib/events/tiers';
import { hiRes } from '@/lib/events/image';
import { EventTags } from '@/components/events/CardParts';
import { hypeTags } from '@/lib/events/hype';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import FriendsStrip from '@/components/social/FriendsStrip';
import { useEventMoments, useLineupMoments } from '@/components/moments/EventMoments';
import { useArtistPhotos } from '@/hooks/useArtistPhotos';
import { useEventComments } from '@/hooks/useEventComments';
import CommentsSheet from '@/components/moments/CommentsSheet';
import { Portrait } from '@/components/artists/parts';
import { ArrowRight, AtSign, Bookmark, BookmarkCheck, CalendarDays, CalendarPlus, MapPin, Check, ExternalLink, Eye, Globe, Info, Mail, MessageCircle, MessageSquareText, Navigation, Phone, Play, Share2, Shirt, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { eventInfo, hasInfo } from '@/lib/events/contacts';
import { trackEvent, eventCounts, compact, type EventCounts } from '@/lib/events/track';
import { TicketsSheet } from '@/components/events/EventActions';
import { splitEventTitle, eventBlurb } from '@/lib/events/title';
import { parseDay, longDay, shortDay } from '@/lib/dates';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { extractYoutubeId } from '@/lib/events/rank';
import { cityLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { noTicketsYet } from '@/hooks/useTicketAlert';
import { dialHref, ticketDial } from '@/lib/events/dial';
import { useAuth } from '@/lib/supabase/AuthProvider';
import PaystackCheckout from '@/components/payment/PaystackCheckout';
import StatTip from '@/components/events/StatTip';
import AddToCalendar from '@/components/calendars/AddToCalendar';
import ShareCardSheet, { useWarmShareCard } from '@/components/events/ShareCardSheet';

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
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [rgb, setRgb] = useState<RGB>(categoryAccent(event.category));
  const [wash, setWash] = useState<RGB>([14, 17, 16]);
  const [counts, setCounts] = useState<EventCounts | null>(null);
  // Count this view, then show the real numbers once they're worth showing
  useEffect(() => {
    trackEvent(event.slug, 'view');
    let live = true;
    eventCounts([event.slug]).then((c) => { if (live) setCounts(c[event.slug] ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [event.slug]);
  const [ticketOpen,     setTicketOpen]     = useState(false);
  const [calOpen,        setCalOpen]        = useState(false);
  const [inDreamList,    setInDreamList]    = useState(false);
  const [isGoing,        setIsGoing]        = useState(false);
  const [ticketsOpen,    setTicketsOpen]    = useState(false);
  const [dreamLoading,   setDreamLoading]   = useState(false);
  const [dreamToast,     setDreamToast]     = useState('');
  const [ticketSuccess,  setTicketSuccess]  = useState(false);
  const [showPromoVideo, setShowPromoVideo] = useState(false);
  const moments = useEventMoments(event);
  const chat = useEventComments(event.slug);
  const isAdmin = useIsAdmin();
  const [chatOpen, setChatOpen] = useState(false);
  const [wantSound, setWantSound] = useState(false);

  useEffect(() => {
    let live = true;
    eventColours(event.image, event.category).then((c) => { if (live) { setRgb(c.accent ?? NEUTRAL_ACCENT); setWash(c.wash); } });
    return () => { live = false; };
  }, [event.image, event.category]);

  const tiers       = getTiers(event);
  const description = getDescription(event);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('chat') === '1') { setChatOpen(true); return; }
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
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
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
  const acts = lineup.map((name) => ({ name, artist: artistForName(name) }));
  const photos = useArtistPhotos(acts.map((x) => x.artist?.slug).filter((x): x is string => !!x));
  const more = useLineupMoments(acts.map((x) => x.artist?.slug).filter((x): x is string => !!x), lineup, moments.map((m) => m.id), !moments.length);
  const [r, g, b] = rgb;
  // The flyer's colour mixed into near-black: the hero fades into exactly this, then the wash carries on down
  // The flyer's own deep ground colour, fading into near-black further down
  // The flyer's colour, see-through so the app's mint ground shows under it (not a flat black)
  const washA = (k: number) => `rgba(${wash[0]}, ${wash[1]}, ${wash[2]}, ${k})`;
  // Moments open on the Moments page, starting at this clip, so people find the rest of Moments too
  const momentHref = (id: string | number) => `/moments?id=${id}&from=${encodeURIComponent(`/events/${event.slug}`)}`;
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
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    const on = isGoing;
    setIsGoing(!on);
    const { error } = on
      ? await supabase.from('event_attendance').delete().eq('user_id', user.id).eq('event_slug', event.slug)
      : await supabase.from('event_attendance').upsert({ user_id: user.id, event_slug: event.slug, status: 'going', is_public: true }, { onConflict: 'user_id,event_slug' });
    if (error) setIsGoing(on);
    else showToast(on ? 'Removed from your plans' : "You're going — friends can see it");
  }

  // Share opens the card sheet: a designed picture of the show (with your name) and a personal link
  const [sharing, setSharing] = useState(false);
  useWarmShareCard('event', event.slug);
  function share() { setSharing(true); }

  const eyebrow: CSSProperties = { fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 6px' };
  const eyebrowMint: CSSProperties = { ...eyebrow, color: T.mintText };
  const info = eventInfo(event.description, event.listingInfo, event.ticketSource, event.flyerText);
  // Nothing announced yet: the button just says Tickets
  const noTickets = noTicketsYet(event);
  const dial = ticketDial(event);
  const infoRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: -1 };
  const infoLabel: CSSProperties = { display: 'block', fontFamily: FONT.sans, fontSize: 12, color: T.text3 };
  const infoValue: CSSProperties = { display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const infoBtn: CSSProperties = { width: 38, height: 38, borderRadius: 19, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.white, textDecoration: 'none' };
  const roundBtn = (on: boolean): CSSProperties => ({
    width: 44, height: 44, borderRadius: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
    ...(on ? { background: 'rgba(123,227,168,0.16)', color: T.mintText, border: 'none'} : { background: 'rgba(255,255,255,0.08)', color: T.white, border: 'none' }),
  });
  const pillBtn = (on: boolean): CSSProperties => ({ ...roundBtn(on), width: 'auto', padding: '0 16px', gap: 7, fontFamily: FONT.sans, fontSize: 14, fontWeight: 700 });
  const primary: CSSProperties = {
    height: 52, padding: '0 28px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    color: T.onMint, background: GRAD.mint, border: 'none', boxShadow: '0 8px 24px rgba(123,227,168,0.22)',
    fontFamily: FONT.display, fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 40 }}>
      {/* The page washed in the flyer's colour, settling into near-black further down */}
      <span aria-hidden style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: '100%', maxHeight: 2200, pointerEvents: 'none', transition: 'background 900ms ease',
        background: `radial-gradient(120% 40% at 0% 34%, rgba(123,227,168,0.14) 0%, rgba(123,227,168,0) 70%), radial-gradient(120% 40% at 100% 62%, rgba(45,190,140,0.11) 0%, rgba(45,190,140,0) 70%), linear-gradient(180deg, ${washA(0.9)} 0%, ${washA(0.62)} 25%, ${washA(0.3)} 55%, ${washA(0.08)} 82%, rgba(3,8,6,0) 100%)`,
      }} />
      <Nav
        transparent
        active="Events"
        back="/events"
        tabs={false}
        actions={
          <>
            {!moments.length && seriesMomentId && <HeaderIconButton label="Watch the last edition" icon="moments" href={`/moments?id=${seriesMomentId}&from=${encodeURIComponent(`/events/${event.slug}`)}`} />}
          </>
        }
      />

      {(dreamToast || ticketSuccess) && (
        <div role="status" style={{ position: 'fixed', top: 'calc(80px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: 'rgba(9,11,10,0.92)', border: 'none', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 999, padding: '10px 18px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mintText, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {ticketSuccess ? <><Icon name="check" size={16} /> Ticket confirmed — it&apos;s in My tickets</> : dreamToast}
        </div>
      )}

      {/* Hero: the flyer (or promo video) whole and undimmed, like the video on Moments */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 820, margin: '0 auto', minHeight: event.image ? undefined : 320, overflow: 'hidden' }}>
        {/* The flyer at its own shape, full width, high resolution */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hiRes(event.image) ?? ''}
          alt={`${event.title} flyer`}
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '88svh', objectFit: 'cover', objectPosition: 'center top', opacity: showPromoVideo ? 0 : 1, transition: 'opacity 900ms ease' }}
        />
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
      </div>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '8px auto 0', padding: '0 20px' }}>
        <EventTags event={event} accent={a} hype={hypeTags(event, { returning: moments.length > 0 })} />
        <h1 style={{ margin: '12px 0 0', fontFamily: FONT.display, fontSize: short.title.length > 22 ? 'clamp(34px, 8vw, 56px)' : 'clamp(40px, 10vw, 68px)', fontWeight: 800, lineHeight: 0.96, letterSpacing: '-0.035em', color: T.white, textShadow: `0 0 42px ${alpha(a, 0.45)}, 0 2px 18px rgba(0,0,0,0.5)` }}>
          {short.title}
        </h1>
        {short.subtitle && (
          <p style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.82)' }}>{short.subtitle}</p>
        )}
        <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.55, color: T.text2 }}>{eventBlurb(event, 160)}</p>
        {counts && (counts.views7d >= 30 || counts.going >= 10) && (
          <p style={{ margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
            {counts.views7d >= 30 && <StatTip icon={<Eye size={16} />} value={compact(counts.views7d)} tip="visits to this page this week" intro />}
            {counts.going >= 10 && <StatTip icon={<Users size={16} />} value={compact(counts.going)} tip="people are going" />}
          </p>
        )}

        {/* Small actions: the big one (tickets) lives in the bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={toggleGoing} aria-pressed={isGoing} style={pillBtn(isGoing)}>
            {isGoing ? <Check size={16} /> : <UserPlus size={16} />}{isGoing ? 'Going' : 'I’m going'}
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={toggleDreamList} aria-label={inDreamList ? 'Saved' : 'Save'} aria-pressed={inDreamList} disabled={dreamLoading} style={roundBtn(inDreamList)}>
            {inDreamList ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <button type="button" onClick={() => setCalOpen(true)} aria-label="Add to a calendar" title="Add to a calendar" style={roundBtn(false)}><CalendarPlus size={18} /></button>
          <button type="button" onClick={share} aria-label="Share" style={roundBtn(false)}><Share2 size={17} /></button>
        </div>
        {calOpen && <AddToCalendar eventSlug={event.slug} eventTitle={event.title} onClose={() => setCalOpen(false)} />}
        {sharing && <ShareCardSheet slug={event.slug} title={event.title} onClose={() => setSharing(false)} />}

        <FriendsStrip slug={event.slug} variant="full" />

        {/* When and where: the same quiet rows as Info & contact */}
        <section style={{ marginTop: 26 }}>
          <h2 style={eyebrowMint}>When &amp; where</h2>
          <div style={{ marginTop: 8, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: 'none', overflow: 'hidden' }}>
            <div style={{ ...infoRow, borderTop: 'none' }}>
              <CalendarDays size={17} color={T.text2} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={infoLabel}>{daysAway == null ? 'Date' : daysAway < 0 ? 'Past event' : daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`}</span>
                <span style={infoValue}>{parsed ? shortDay(parsed) : event.dateLabel}{event.time ? ` · ${event.time}` : ''}</span>
              </span>
              {calendar && daysAway != null && daysAway >= 0 && <a href={calendar} target="_blank" rel="noopener noreferrer" aria-label="Add to calendar" title="Add to calendar" style={infoBtn}><CalendarPlus size={15} /></a>}
            </div>
            <div style={infoRow}>
              <MapPin size={17} color={T.text2} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={infoLabel}>{[event.area, cityLabel(event.city)].filter(Boolean).join(', ') || 'Venue'}</span>
                <span style={infoValue}>{event.venue}</span>
              </span>
              <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Directions" title="Directions" style={{ ...infoBtn, background: 'rgba(123,227,168,0.14)', color: T.mintText }}><Navigation size={15} /></a>
            </div>
          </div>
        </section>

        {/* Info & contact: numbers, Instagram, dress code and the like, read from the listing and the flyer */}
        {hasInfo(info) && (
          <section style={{ marginTop: 28 }}>
            <h2 style={eyebrowMint}>Info &amp; contact</h2>
            <div style={{ marginTop: 8, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: 'none', overflow: 'hidden' }}>
              {info.ussd.map((code) => (
                <a key={code} href={`tel:${encodeURIComponent(code)}`} style={{ ...infoRow, textDecoration: 'none' }}>
                  <Phone size={17} color={T.text2} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={infoLabel}>Tickets by phone: dial</span><span style={infoValue}>{code}</span></span>
                  <span style={{ ...infoBtn, width: 'auto', padding: '0 14px', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 13.5, fontWeight: 700 }}>Dial</span>
                </a>
              ))}
              {info.phones.map((p) => (
                <div key={p.intl} style={infoRow}>
                  <Phone size={17} color={T.text2} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={infoLabel}>{p.label}</span>
                    <span style={infoValue}>{p.display}</span>
                  </span>
                  <a href={`tel:${p.intl}`} aria-label={`Call ${p.display}`} style={infoBtn}><Phone size={15} /></a>
                  <a href={`https://wa.me/${p.intl.slice(1)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${p.display}`} style={{ ...infoBtn, background: 'rgba(123,227,168,0.14)', color: T.mintText }}><MessageCircle size={15} /></a>
                </div>
              ))}
              {info.instagram.map((h) => (
                <a key={h} href={`https://instagram.com/${h}`} target="_blank" rel="noopener noreferrer" style={{ ...infoRow, textDecoration: 'none' }}>
                  <AtSign size={17} color={T.text2} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={infoLabel}>Instagram</span><span style={infoValue}>@{h}</span></span>
                  <ExternalLink size={15} color={T.text3} />
                </a>
              ))}
              {info.emails.map((m) => (
                <a key={m} href={`mailto:${m}`} style={{ ...infoRow, textDecoration: 'none' }}>
                  <Mail size={17} color={T.text2} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={infoLabel}>Email</span><span style={infoValue}>{m}</span></span>
                </a>
              ))}
              {info.websites.map((w) => (
                <a key={w} href={/^https?:/.test(w) ? w : `https://${w}`} target="_blank" rel="noopener noreferrer" style={{ ...infoRow, textDecoration: 'none' }}>
                  <Globe size={17} color={T.text2} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={infoLabel}>Website</span><span style={infoValue}>{w.replace(/^https?:\/\/(www\.)?/, '')}</span></span>
                  <ExternalLink size={15} color={T.text3} />
                </a>
              ))}
              {info.dressCode && <div style={infoRow}><Shirt size={17} color={T.text2} /><span style={{ flex: 1 }}><span style={infoLabel}>Dress code</span><span style={infoValue}>{info.dressCode}</span></span></div>}
              {info.age && <div style={infoRow}><ShieldCheck size={17} color={T.text2} /><span style={{ flex: 1 }}><span style={infoLabel}>Age</span><span style={infoValue}>{info.age}</span></span></div>}
              {info.notes.map((n) => <div key={n} style={infoRow}><Info size={17} color={T.text2} /><span style={{ flex: 1, ...infoValue }}>{n}</span></div>)}
            </div>
          </section>
        )}

        {acts.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={eyebrowMint}>Line-up</h2>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', margin: '8px -20px 0', padding: '4px 20px 4px' }}>
              {acts.map(({ name, artist }, i) => {
                const face = (
                  <span style={{ width: i === 0 ? 96 : 72, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Portrait name={name} url={artist ? photos[artist.slug] : null} size={i === 0 ? 92 : 68} ring={i === 0} />
                    <span style={{ width: '100%', textAlign: 'center', fontFamily: FONT.sans, fontSize: i === 0 ? 14 : 13, fontWeight: i === 0 ? 700 : 600, lineHeight: 1.2, color: T.white, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</span>
                    {i === 0 && <span style={{ marginTop: -4, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.mintText }}>Headliner</span>}
                  </span>
                );
                return artist
                  ? <Link key={name} href={`/artists/${artist.slug}`} style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>{face}</Link>
                  : <span key={name} style={{ alignSelf: 'flex-start' }}>{face}</span>;
              })}
            </div>
          </section>
        )}

        {/* Relive the last edition: one big moment, the rest underneath */}
        {moments.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2 style={eyebrowMint}>{daysAway != null && daysAway < 0 ? 'Relive the night' : 'Relive the last edition'}</h2>
            <Link href={momentHref(moments[0].id)} style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', marginTop: 4, padding: 0, border: 'none', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', background: '#000', boxShadow: `0 20px 60px rgba(${r}, ${g}, ${b}, 0.25)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${moments[0].youtube_id}/hq720.jpg`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)' }} />
              <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)', width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.92)', color: '#050606' }}>
                <Play size={26} fill="#050606" style={{ marginLeft: 3 }} />
              </span>
              <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14, textAlign: 'left' }}>
                <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{moments[0].title}</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{[moments[0].event_name, moments[0].year].filter(Boolean).join(' · ')}{moments.length > 1 ? ` · ${moments.length} moments` : ''}</span>
              </span>
            </Link>
            {moments.length > 1 && (
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '10px -20px 0', padding: '0 20px' }}>
                {moments.slice(1, 8).map((m, i) => (
                  <Link key={m.id} href={momentHref(m.id)} aria-label={`Play ${m.title}`} style={{ position: 'relative', display: 'block', textDecoration: 'none', width: 128, aspectRatio: '16 / 9', flexShrink: 0, padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#000' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', left: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white }}><Play size={11} fill={T.white} /></span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section style={{ marginTop: 36 }}>
          <h2 style={eyebrow}>About</h2>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ margin: i ? '14px 0 0' : '4px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.78)' }}>{p}</p>
          ))}
        </section>

        <PartOfSeries event={event} />

        {/* The chat: questions and plans before the night, memories after */}
        <section style={{ marginTop: 34 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={eyebrowMint}>The chat{chat.comments.length ? ` · ${chat.comments.length}` : ''}</h2>
            {chat.comments.length > 2 && (
              <button type="button" onClick={() => setChatOpen(true)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.mintText }}>See all</button>
            )}
          </div>
          {chat.comments.slice(-2).map((c) => {
            const name = c.profiles?.full_name || c.profiles?.username || 'Someone';
            return (
              <button key={c.id} type="button" onClick={() => setChatOpen(true)} style={{ display: 'flex', gap: 12, width: '100%', padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #2C3631 0%, #151A17 100%)', color: '#D6FBE6', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: T.white }}>{name}{chat.goingIds.has(c.user_id) ? <span style={{ marginLeft: 6, fontWeight: 600, color: T.mintText }}>· {daysAway != null && daysAway < 0 ? 'was there' : 'going'}</span> : null}</span>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 2, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.text } as CSSProperties}>{c.content}</span>
                </span>
              </button>
            );
          })}
          <button type="button" onClick={() => setChatOpen(true)} style={{ marginTop: chat.comments.length ? 8 : 4, width: '100%', height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: 'none', color: T.text3, fontFamily: FONT.sans, fontSize: 14, textAlign: 'left' }}>
            <MessageSquareText size={17} color={T.text2} />
            {chat.comments.length ? 'Join the conversation…' : daysAway != null && daysAway < 0 ? 'Were you there? Say something…' : 'Ask about tickets, gates, dress code…'}
          </button>
        </section>

        <RatingSection slug={event.slug} title={event.title} past={(() => { const d = parseDay(event.date); return !!d && d.getTime() <= new Date(new Date().toDateString()).getTime(); })()} />

        <section id="tickets" style={{ marginTop: 34 }}>
          <h2 style={eyebrow}>Tickets</h2>
          {listed && (
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.6, color: T.text2 }}>
              Tickets are sold by {event.ticketSource || 'the organiser'}, not on Tsacoal. We list the event so you can find it — buy only on the official page.
            </p>
          )}
          {listed && (
            <Link href={`/organisers/claim?event=${encodeURIComponent(event.slug)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText, textDecoration: 'none' }}>
              Is this your event? Claim it <ArrowRight size={15} />
            </Link>
          )}
          {(!listed || tiers.length > 0) && (
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
              <span style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#26302B', color: '#D6FBE6', fontFamily: FONT.sans, fontWeight: 600 }}>
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

        {/* No clips from this event: say so plainly */}
        {!moments.length && (
          <section style={{ marginTop: 36 }}>
            <h2 style={eyebrowMint}>Moments</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, padding: '16px 16px', borderRadius: 20, background: T.surface, border: 'none' }}>
              <span aria-hidden style={{ width: 42, height: 42, borderRadius: 21, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mintText }}><Play size={17} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>No moments from this event yet</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 1.45, color: T.text2 }}>Clips from the night will show up here.</span>
              </span>
            </div>
          </section>
        )}

        {/* The acts on this bill, live elsewhere (only clips they're confirmed in) */}
        {!moments.length && more.moments.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={eyebrowMint}>See the line-up live</h2>
            <Link href={momentHref(more.moments[0].id)} style={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', marginTop: 4, padding: 0, border: 'none', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', background: '#000' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${more.moments[0].youtube_id}/hq720.jpg`} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)' }} />
              <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)', width: 60, height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.92)', color: '#050606' }}>
                <Play size={24} fill="#050606" style={{ marginLeft: 3 }} />
              </span>
              <span style={{ position: 'absolute', left: 16, right: 16, bottom: 14, textAlign: 'left' }}>
                <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{more.moments[0].title}</span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{[more.moments[0].event_name, more.moments[0].year].filter(Boolean).join(' · ')}</span>
              </span>
            </Link>
            {more.moments.length > 1 && (
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '10px -20px 0', padding: '0 20px' }}>
                {more.moments.slice(1).map((m, i) => (
                  <Link key={m.id} href={momentHref(m.id)} aria-label={`Play ${m.title}`} style={{ position: 'relative', display: 'block', textDecoration: 'none', width: 128, aspectRatio: '16 / 9', flexShrink: 0, padding: 0, border: 'none', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: '#000' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', left: 8, bottom: 8, width: 24, height: 24, borderRadius: 12, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white }}><Play size={11} fill={T.white} /></span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom bar: price + the one main action */}
      <div style={{ position: 'fixed', zIndex: 150, left: 0, right: 0, bottom: 0, padding: '18px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 20px', background: 'linear-gradient(180deg, rgba(10,22,16,0) 0%, rgba(11,24,17,0.9) 30%, rgba(10,21,15,0.97) 100%)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: event.priceUnknown && !info.gatePrice ? 'center' : 'space-between', gap: 12 }}>
          {/* No prices listed: never claim "Free"; use the flyer's gate price when there is one, else say nothing */}
          {!(event.priceUnknown && !info.gatePrice) && <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text2 }}>{event.priceUnknown ? (info.gatePrice ? 'At the gate' : 'Tickets') : free ? 'Entry' : 'From'}</span>
            <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: T.white }}>{event.priceUnknown ? `GH₵ ${info.gatePrice}` : free ? 'Free' : `GH₵ ${event.price.toLocaleString()}`}</span>
          </span>}
          {daysAway != null && daysAway < 0 ? (
            <span style={{ ...primary, background: 'rgba(255,255,255,0.05)', border: 'none', color: T.text2, cursor: 'default', boxShadow: 'none' }}>Event has ended</span>
          ) : dial && (listed || !event.tiers?.length) ? (
            // A short code leads: dialling (MoMo) is how most people buy; the website is the small button beside it
            <>
              <a href={dialHref(dial)} style={{ ...primary, minWidth: 200 }}><Phone size={17} /> Dial {dial}</a>
              {listed && (
                <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" aria-label={`Buy on ${event.ticketSource && !/^dial\b/i.test(event.ticketSource) ? event.ticketSource : 'the website'}`}
                  style={{ width: 52, height: 52, borderRadius: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: T.white, textDecoration: 'none' }}>
                  <Globe size={20} />
                </a>
              )}
            </>
          ) : listed ? (
            <a href={event.ticketUrl!} target="_blank" rel="noopener noreferrer" style={{ ...primary, minWidth: 200 }}>
              {/^dial\b/i.test(event.ticketSource ?? '') ? event.ticketSource : `Tickets on ${event.ticketSource || 'the official site'}`} <Icon name="open" size={16} />
            </a>
          ) : daysAway != null && daysAway < 0 ? (
            <span style={{ ...primary, background: 'rgba(255,255,255,0.05)', border: 'none', color: T.text2, cursor: 'default', boxShadow: 'none' }}>Event has ended</span>
          ) : (
            // No tickets out yet: the sheet explains and offers "Notify me when tickets drop"
            <button type="button" onClick={() => setTicketsOpen(true)} style={{ ...primary, minWidth: 200 }}>
              {noTickets ? 'Tickets' : free ? 'Reserve a spot' : 'Get tickets'}
            </button>
          )}
        </div>
      </div>

      {chatOpen && (
        <CommentsSheet fixed heading="The chat" moment={{ event_name: short.title, year: null } as unknown as Parameters<typeof CommentsSheet>[0]['moment']}
          comments={chat.comments} user={user} profile={profile} currentSeconds={0}
          wasThereIds={new Set()} goingIds={chat.goingIds} nextLabel={null} canGift={false} tint={`${r}, ${g}, ${b}`}
          goingLabel={daysAway != null && daysAway < 0 ? 'Was there' : 'Going'}
          prompts={daysAway != null && daysAway < 0 ? ['Best moment:', 'Who else was there?', 'Next year I want'] : ['Who’s going?', 'What time do gates open?', 'Dress code?', 'Looking for people to go with']}
          emptyHint={daysAway != null && daysAway < 0 ? 'Were you there? Share the best moment.' : 'Ask a question or find people to go with.'}
          onClose={() => setChatOpen(false)} onSend={(text, parentId) => { if (user) chat.send(user.id, text, profile ? { username: profile.username, full_name: profile.full_name ?? null, avatar_url: profile.avatar_url ?? null } : undefined, parentId); }}
          onEdit={(c, text) => chat.edit(c.id, text)} onSeek={() => {}} onGift={() => {}}
          onDelete={(c) => chat.remove(c.id)} onReport={(c) => chat.report(c.id)} isAdmin={isAdmin} />
      )}

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
