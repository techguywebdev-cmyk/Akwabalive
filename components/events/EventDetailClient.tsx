'use client';
import { C } from '@/lib/theme';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin, Calendar, Clock, Users, ArrowLeft,
  Share2, Heart, CheckCircle, Ticket, Star, Loader2, ExternalLink, Play,
} from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { isListedEvent } from '@/lib/types';
import { extractYoutubeId } from '@/lib/events/rank';
import { cityLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import PaystackCheckout from '@/components/payment/PaystackCheckout';
import GoingWith from '@/components/social/GoingWith';
import { LineupSection } from '@/components/ui/LineupChips';

function getTiers(price: number) {
  if (price === 0) return [
    { name: 'General Admission', price: 0, desc: 'Free entry \u2014 RSVP required.', available: true, spots: 500 },
  ];
  return [
    { name: 'General', price, desc: 'Standard entry. Full access to all areas.', available: true, spots: 200 },
    { name: 'VIP', price: Math.round(price * 2.2), desc: 'Priority entry, VIP lounge, 2 drinks.', available: true, spots: 48 },
    { name: 'VVIP', price: Math.round(price * 4.5), desc: 'Front section, private table, open bar, meet & greet.', available: price < 300, spots: 8 },
  ];
}

function getDescription(event: GhanaEvent): string {
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

  const [saved,          setSaved]          = useState(false);
  const [ticketOpen,     setTicketOpen]     = useState(false);
  const [inDreamList,    setInDreamList]    = useState(false);
  const [dreamLoading,   setDreamLoading]   = useState(false);
  const [dreamToast,     setDreamToast]     = useState('');
  const [ticketSuccess,  setTicketSuccess]  = useState(false);
  const [showPromoVideo, setShowPromoVideo] = useState(false);
  const [wantSound, setWantSound] = useState(false);

  const tiers       = getTiers(event.price);
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
  }, [user, event.slug]);

  async function toggleDreamList() {
    if (!user) { window.location.href = '/auth'; return; }
    setDreamLoading(true);
    if (inDreamList) {
      await supabase.from('dream_events').delete().eq('user_id', user.id).eq('event_slug', event.slug);
      setInDreamList(false);
      showToast('Removed from Dream List');
    } else {
      await supabase.from('dream_events').upsert({
        user_id: user.id, event_slug: event.slug,
        event_title: event.title, event_image: event.image, is_public: true,
      }, { onConflict: 'user_id,event_slug' });
      setInDreamList(true);
      showToast('Added to Dream List \u2728');
    }
    setDreamLoading(false);
  }

  function showToast(msg: string) {
    setDreamToast(msg);
    setTimeout(() => setDreamToast(''), 2800);
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 62 }}>

      {dreamToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: C.bg2, border: `1px solid ${C.bd2}`, borderRadius: 10, padding: '12px 20px', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.cream, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {dreamToast}
        </div>
      )}
      {ticketSuccess && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600, background: C.greenDim, border: `1px solid ${C.greenBd}`, borderRadius: 10, padding: '12px 20px', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.greenL, whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} /> Ticket confirmed! Check My Tickets.
        </div>
      )}

      {/* HERO — flyer first, then optional HD promo video */}
      <div style={{ position: 'relative', width: '100%', height: 'min(65vw, 520px)', minHeight: 300, overflow: 'hidden', background: C.bg3 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.42) saturate(0.75)', opacity: showPromoVideo ? 0 : 1, transition: 'opacity 900ms ease' }} />
        {/* Promo video: cover frame, no player chrome, audio after first tap */}
        {showPromoVideo && ytId && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
            <iframe
              key={wantSound ? 'snd' : 'mut'}
              title="Announcement"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${wantSound ? 0 : 1}&controls=0&loop=1&playlist=${ytId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0`}
              allow="autoplay; encrypted-media; picture-in-picture"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'none',
                filter: 'brightness(0.55) saturate(0.85)',
                transform: 'translate(-50%, -50%) scale(2.15)',
                transformOrigin: 'center center',
              }}
            />
            {/* Hide any residual YouTube seek / chrome at edges */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, background: 'linear-gradient(to top, rgba(13,11,8,0.95), transparent)', pointerEvents: 'none', zIndex: 2 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 48, background: 'linear-gradient(to bottom, rgba(13,11,8,0.5), transparent)', pointerEvents: 'none', zIndex: 2 }} />
          </div>
        )}
        {showPromoVideo && isMp4 && event.promoVideoUrl && (
          <video
            key={wantSound ? 'vs' : 'vm'}
            src={event.promoVideoUrl}
            autoPlay
            muted={!wantSound}
            loop
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55) saturate(0.85)', zIndex: 0 }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, rgba(13,11,8,0.3) 55%, transparent 100%)`, zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(13,11,8,0.72) 0%, transparent 65%)', zIndex: 1 }} />
        <Link href="/events" style={{ position: 'absolute', top: 16, left: 16, zIndex: 12, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.65)', background: 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(245,236,215,0.1)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none' }}>
          <ArrowLeft size={12} /> Events
        </Link>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 12, display: 'flex', gap: 8 }}>
          
          {seriesMomentId && (
            <Link
              href={`/moments?id=${seriesMomentId}&from=${encodeURIComponent(`/events/${event.slug}`)}`}
              aria-label="Watch last edition"
              title="Watch last edition"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: `1px solid ${C.goldBd}`,
                background: C.goldDim,
                backdropFilter: 'blur(10px)',
                color: C.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <Play size={16} fill={C.gold} />
            </Link>
          )}
          <button onClick={toggleDreamList} disabled={dreamLoading}
            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${inDreamList ? C.goldBd : 'rgba(245,236,215,0.12)'}`, background: inDreamList ? C.goldDim : 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: inDreamList ? C.gold : 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 220ms' }}>
            {dreamLoading ? <Loader2 size={15} /> : <Star size={17} fill={inDreamList ? C.gold : 'none'} />}
          </button>
          <button onClick={() => setSaved(s => !s)}
            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${saved ? 'rgba(206,17,38,0.4)' : 'rgba(245,236,215,0.12)'}`, background: saved ? 'rgba(206,17,38,0.15)' : 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: saved ? C.red : 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={17} fill={saved ? C.red : 'none'} />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(245,236,215,0.12)', background: 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 size={17} />
          </button>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 28px', zIndex: 2, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>{event.badge}</span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: C.c4, color: C.c2, border: `1px solid ${C.bd}` }}>{event.category}</span>
            {event.recurring && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>Annual</span>}
          </div>
          <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(30px,7vw,56px)', fontWeight: 300, color: '#fff', lineHeight: 1.0, letterSpacing: '-1.5px', marginBottom: 14 }}>{event.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: 'rgba(245,236,215,0.52)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} style={{ color: C.gold }} />{event.dateLabel}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} style={{ color: C.gold }} />{event.time}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={11} style={{ color: C.gold }} />{event.venue}</span>
          </div>
        </div>
      </div>

      {/* STICKY BAR */}
      <div style={{ position: 'sticky', top: 62, zIndex: 90, background: `${C.bg2}F6`, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${C.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3, marginBottom: 1 }}>From</p>
          {event.price === 0
            ? <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 17, fontWeight: 700, color: C.greenL }}>FREE</p>
            : <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 21, color: C.cream, letterSpacing: '-1px' }}><span style={{ fontSize: 11, color: C.gold }}>\u20B5</span>{event.price.toLocaleString()}</p>
          }
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleDreamList} disabled={dreamLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', border: `1px solid ${inDreamList ? C.goldBd : C.bd}`, background: inDreamList ? C.goldDim : 'transparent', color: inDreamList ? C.gold : C.c3, padding: '11px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms' }}>
            <Star size={13} fill={inDreamList ? C.gold : 'none'} />
          </button>
          {isListedEvent(event) && event.ticketUrl ? (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.gold, color: C.onAccent, border: 'none', padding: '11px 20px', borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
              <ExternalLink size={14} />Tickets on {event.ticketSource || 'official site'}
            </a>
          ) : (
          <button onClick={() => setTicketOpen(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.gold, color: C.onAccent, border: 'none', padding: '11px 20px', borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
            <Ticket size={14} />{event.price === 0 ? 'Reserve' : 'Get Tickets'}
          </button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 24 }}>
          {[
            { Icon: Calendar, label: 'Date',  value: event.dateLabel },
            { Icon: Clock,    label: 'Time',  value: event.time },
            { Icon: MapPin,   label: 'Venue', value: event.venue },
            { Icon: Users,    label: 'City',  value: `${cityLabel(event.city)} \u00b7 ${event.region}` },
          ].map(({ Icon, label, value }) => (
            <div key={label} style={{ padding: '14px 16px', background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 10 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon size={10} style={{ color: C.gold }} />{label}
              </p>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, fontWeight: 500, lineHeight: 1.3 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />About this event
          </p>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 15, color: C.c2, lineHeight: 1.8, fontWeight: 300, marginBottom: i < paragraphs.length - 1 ? 16 : 0 }}>{p}</p>
          ))}
        </div>

        {/* Ticket options */}
        <div style={{ marginTop: 36 }}>
          {isListedEvent(event) && (
            <div style={{ background: C.goldDim, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, marginBottom: 6 }}>Listed event</p>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.55 }}>
                Tickets are sold by {event.ticketSource || 'the organiser'}, not on Akwaaba. We list it so you can find it — buy only on the official page.
              </p>
            </div>
          )}

          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />Ticket options
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {tiers.map((tier, i) => (
              <div key={tier.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: i === 0 ? C.goldDim : C.bg2, border: `1px solid ${i === 0 ? C.goldBd : C.bd}`, borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 14, fontWeight: 600, color: C.cream }}>{tier.name}</span>
                    {!tier.available && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(206,17,38,0.15)', color: C.red, border: '1px solid rgba(206,17,38,0.25)', padding: '2px 7px', borderRadius: 3 }}>Sold out</span>}
                    {tier.available && tier.spots <= 20 && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '2px 7px', borderRadius: 3 }}>{tier.spots} left</span>}
                  </div>
                  <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, lineHeight: 1.45 }}>{tier.desc}</p>
                </div>
                <div style={{ flexShrink: 0, marginLeft: 16, textAlign: 'right' }}>
                  {tier.price === 0
                    ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, fontWeight: 700, color: C.greenL }}>FREE</span>
                    : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 17, color: C.cream }}><span style={{ fontSize: 10, color: C.gold }}>\u20B5</span>{tier.price.toLocaleString()}</span>
                  }
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isListedEvent(event) && event.ticketUrl ? (
            <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: C.gold, color: C.onAccent, border: 'none', padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
              <ExternalLink size={14} />Tickets on {event.ticketSource || 'official site'}
            </a>
          ) : (
            <button onClick={() => setTicketOpen(true)}
              style={{ flex: 1, background: C.gold, color: C.onAccent, border: 'none', padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ticket size={14} />{event.price === 0 ? 'Reserve Free Ticket' : `Get Tickets from \u20B5${event.price.toLocaleString()}`}
            </button>
          )}
            <button onClick={toggleDreamList} disabled={dreamLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${inDreamList ? C.goldBd : C.bd}`, background: inDreamList ? C.goldDim : 'transparent', color: inDreamList ? C.gold : C.c3, padding: '15px 18px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms' }}>
              <Star size={16} fill={inDreamList ? C.gold : 'none'} />
            </button>
          </div>
          {!user && (
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, textAlign: 'center', marginTop: 12 }}>
              <Link href="/auth" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link> to add this to your Dream List
            </p>
          )}
          {inDreamList && (
            <div style={{ marginTop: 12, background: C.goldDim, border: `1px solid ${C.goldBd}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={13} style={{ color: C.gold, flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, lineHeight: 1.5 }}>
                On your Dream List. Friends can gift you a ticket from your profile.
              </p>
            </div>
          )}
        </div>

        {event.organizerUsername && (
          <div style={{ marginTop: 28 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />Presented by
            </p>
            <Link
              href={`/organizers/${event.organizerUsername}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: C.bg2,
                border: `1px solid ${C.bd}`,
                borderRadius: 12,
                textDecoration: 'none',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                background: C.bg3, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.gold, fontFamily: 'var(--font-cormorant,serif)', fontSize: 18,
              }}>
                {event.organizerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.organizerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (event.organizerName || event.organizerUsername || 'O')[0].toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 15, fontWeight: 600, color: C.cream, margin: 0 }}>
                  {event.organizerName || event.organizerUsername}
                </p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: C.c3, margin: '4px 0 0' }}>
                  @{event.organizerUsername} · View all their events
                </p>
              </div>
            </Link>
          </div>
        )}

        <LineupSection event={event} />

        {/* Going with others */}
        <GoingWith eventSlug={event.slug} eventTitle={event.title} />

        {/* Venue */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />Venue
          </p>
          <div style={{ padding: '20px', background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 400, color: C.cream, marginBottom: 6 }}>{event.venue}</h3>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
              <MapPin size={12} style={{ color: C.gold, flexShrink: 0 }} />{cityLabel(event.city)}, Ghana
            </p>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(event.venue + ', Ghana')}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2, textDecoration: 'none' }}>
              <MapPin size={11} />Open in Google Maps
            </a>
          </div>
        </div>

        {/* Good to know */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />Good to know
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'QR ticket delivered instantly after payment',
              'Tickets are non-refundable but transferable up to 24hrs before the event',
              'Pay with MTN MoMo, Vodafone Cash, AirtelTigo, or Visa/Mastercard',
              event.category === 'nightlife' || event.category === 'concert' ? 'Smart casual or formal attire enforced' : 'All ages welcome unless otherwise stated',
              'Gates open 60 minutes before event start time',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 14px', background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 8 }}>
                <CheckCircle size={14} style={{ color: C.greenL, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.55 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />More in {cityLabel(event.city)}
              </p>
              <Link href="/events" style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3, textDecoration: 'none' }}>See all</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {related.slice(0, 4).map(ev => (
                <Link key={ev.id} href={`/events/${ev.slug}`} style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.bd}`, background: C.bg2, textDecoration: 'none' }}>
                  <div style={{ position: 'relative', paddingTop: '56%', background: C.bg3 }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${ev.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.68) saturate(0.8)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg2} 0%, transparent 55%)` }} />
                  </div>
                  <div style={{ padding: '12px 13px 14px' }}>
                    <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 15, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 5 }}>{ev.title}</h4>
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 8 }}>{ev.dateLabel}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.bd}` }}>
                      {ev.price === 0
                        ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, color: C.greenL, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Free</span>
                        : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream }}><span style={{ fontSize: 9, color: C.gold }}>\u20B5</span>{ev.price}</span>
                      }
                      <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold }}>View \u2192</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

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
