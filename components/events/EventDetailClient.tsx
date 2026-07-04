'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin, Calendar, Clock, Users, ArrowLeft,
  Share2, Heart, CheckCircle, X, Ticket, Star,
  Loader2,
} from 'lucide-react';
import type { GhanaEvent } from '@/lib/types';
import { cityLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

const C = {
  bg:      '#0D0B08', bg2: '#141109', bg3: '#1C1710', bg4: '#242018',
  gold:    '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream:   '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  c4:      'rgba(245,236,215,0.08)', bd: 'rgba(245,236,215,0.07)', bd2: 'rgba(245,236,215,0.13)',
  red:     '#CE1126', green: '#2D6A4F', greenL: '#4ade80',
  greenDim:'rgba(45,106,79,0.15)', greenBd: 'rgba(45,106,79,0.35)',
};

function getTiers(price: number) {
  if (price === 0) return [
    { name: 'General Admission', price: 0, desc: 'Free entry — RSVP required. Limited capacity.', available: true, spots: 500 },
  ];
  return [
    { name: 'General',  price,                   desc: 'Standard entry. Full access to all main stages and areas.', available: true,        spots: 200 },
    { name: 'VIP',      price: Math.round(price * 2.2), desc: 'Priority entry, dedicated VIP lounge, 2 complimentary drinks, premium viewing area.', available: true, spots: 48 },
    { name: 'VVIP',     price: Math.round(price * 4.5), desc: 'Front section access, private table for 4, full open bar, artist meet & greet pass.', available: price < 300, spots: 8 },
  ];
}

function getDescription(event: GhanaEvent): string {
  const descs: Record<string, string> = {
    festival:  `${event.title} is one of Ghana's most anticipated events of the year. Bringing together the finest artists, performers, and creatives from across the continent, this is more than an event — it's a cultural moment. Expect electrifying performances, immersive art installations, incredible food, and the best crowd Ghana has to offer.\n\nDoors open one hour before showtime. The energy builds all day and peaks late into the night. Come ready.`,
    concert:   `An unforgettable night of live music at ${event.venue}. ${event.title} brings world-class performance to Ghana, delivering the kind of show that stays with you long after the last note fades.\n\nPremium sound design, stunning production, and an audience of thousands united by music. This is the concert event of the year — you need to be in the room.`,
    culture:   `${event.title} celebrates the rich cultural heritage of Ghana and the African continent. A gathering of tradition, art, and community spirit.\n\nWitness traditional ceremonies, master craftsmen at work, kente exhibitions, traditional drumming and dance, and a marketplace of authentic Ghanaian goods. Bring the family. Come proud.`,
    food:      `Ghana's premier food event returns to ${event.venue}. ${event.title} brings together the country's finest chefs, celebrated street food vendors, and culinary innovators for a full celebration of Ghanaian and West African cuisine.\n\nTaste, learn, and discover the flavours that define who we are. Live cooking demonstrations, cocktail bars, and the Jollof Wars. Come hungry.`,
    nightlife: `${event.title} is the night everyone will be talking about. At ${event.venue}, Ghana's most sought-after DJs and performers come together for an evening of pure energy.\n\nDress to impress. This is a curated experience for those who take their nights seriously — world-class sound, precision lighting, and an environment designed around the moment.`,
    sports:    `${event.title} at ${event.venue} brings elite athletic competition and community spirit together on Ghanaian soil.\n\nCheer on local heroes and national champions. Feel the electricity of a full crowd. Experience sport the way it was meant to be experienced — live, loud, and in community.`,
    tech:      `${event.title} is Ghana's leading technology gathering. A space for founders, engineers, investors, and thinkers to connect and build the future of African technology.\n\nWorld-class keynotes, hands-on workshops, startup pitches, and career-defining networking. Whether you're building the next big thing or looking for it — start here.`,
    art:       `${event.title} at ${event.venue} showcases the extraordinary depth of Ghanaian and Pan-African artistic talent.\n\nMeet the artists. Acquire original works. Experience art as a living conversation between creator and community.`,
  };
  return descs[event.category] ?? descs.festival;
}

/* ── TICKET MODAL ─────────────────────────────────── */
function TicketModal({ event, onClose }: { event: GhanaEvent; onClose: () => void }) {
  const tiers = getTiers(event.price);
  const [selected,   setSelected]   = useState(0);
  const [qty,        setQty]        = useState(1);
  const [step,       setStep]       = useState<'select' | 'pay' | 'done'>('select');
  const [payMethod,  setPayMethod]  = useState('');

  const tier  = tiers[selected];
  const total = tier.price * qty;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(13,11,8,0.9)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: C.bg2, borderRadius: '20px 20px 0 0', border: `1px solid ${C.bd2}`, borderBottom: 'none', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 20px 16px', borderBottom: `1px solid ${C.bd}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.8, marginBottom: 5 }}>
              {step === 'select' ? '— Choose ticket' : step === 'pay' ? '— Payment' : '— Confirmed'}
            </p>
            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 21, fontWeight: 400, color: C.cream, lineHeight: 1.15, maxWidth: 260 }}>{event.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: C.c4, border: `1px solid ${C.bd}`, color: C.c3, cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', padding: '12px 20px', borderBottom: `1px solid ${C.bd}`, gap: 0 }}>
          {['Select', 'Payment', 'Done'].map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= ['select','pay','done'].indexOf(step) ? C.gold : C.bg3, border: `1px solid ${i <= ['select','pay','done'].indexOf(step) ? C.gold : C.bd}`, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, fontWeight: 600, color: i <= ['select','pay','done'].indexOf(step) ? '#000' : C.c3 }}>{i + 1}</div>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: i <= ['select','pay','done'].indexOf(step) ? C.c2 : C.c3 }}>{s}</span>
              {i < 2 && <div style={{ flex: 1, height: 1, background: C.bd, marginLeft: 6 }} />}
            </div>
          ))}
        </div>

        {step === 'select' && (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: C.bg3, borderRadius: 10, marginBottom: 20, border: `1px solid ${C.bd}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}><Calendar size={10} style={{ color: C.gold }} />{event.dateLabel} · {event.time}</p>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} style={{ color: C.gold }} />{event.venue}</p>
              </div>
            </div>

            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'block', width: 14, height: 1, background: C.gold }} />Ticket types
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {tiers.map((t, i) => (
                <button key={t.name} onClick={() => t.available && setSelected(i)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 10, textAlign: 'left', border: `1px solid ${selected === i ? C.goldBd : C.bd}`, background: selected === i ? C.goldDim : C.bg3, cursor: t.available ? 'pointer' : 'not-allowed', opacity: t.available ? 1 : 0.45, transition: 'all 180ms', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 14, fontWeight: 600, color: C.cream }}>{t.name}</span>
                      {!t.available && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(206,17,38,0.15)', color: C.red, border: '1px solid rgba(206,17,38,0.25)', padding: '2px 7px', borderRadius: 3 }}>Sold out</span>}
                      {t.available && t.spots <= 20 && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', textTransform: 'uppercase', background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}`, padding: '2px 7px', borderRadius: 3 }}>{t.spots} left</span>}
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, lineHeight: 1.45 }}>{t.desc}</p>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 16, textAlign: 'right' }}>
                    {t.price === 0
                      ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, fontWeight: 700, color: C.greenL }}>FREE</span>
                      : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 17, color: C.cream, letterSpacing: '-0.5px' }}><span style={{ fontSize: 10, color: C.gold }}>₵</span>{t.price.toLocaleString()}</span>
                    }
                  </div>
                </button>
              ))}
            </div>

            {tier.price > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: `1px solid ${C.bd}`, marginBottom: 0 }}>
                <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c2 }}>Quantity</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.bd}`, background: C.bg3, color: C.cream, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 18, color: C.cream, minWidth: 28, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(10, q + 1))} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${C.bd}`, background: C.bg3, color: C.cream, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 18 }}>
              {tier.price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2 }}>{qty} × {tier.name}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 22, color: C.cream, letterSpacing: '-1.5px' }}><span style={{ fontSize: 12, color: C.gold }}>₵</span>{total.toLocaleString()}</span>
                </div>
              )}
              <button onClick={() => setStep('pay')} style={{ width: '100%', background: C.gold, color: '#0D0B08', border: 'none', padding: 16, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
                {tier.price === 0 ? 'Reserve My Spot →' : 'Continue to Payment →'}
              </button>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, textAlign: 'center', marginTop: 10 }}>Secure checkout · QR ticket delivered instantly</p>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div style={{ padding: '20px' }}>
            <div style={{ background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2 }}>{tier.name} × {qty}</span>
                <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 18, color: C.cream, letterSpacing: '-1px' }}>
                  {tier.price === 0 ? <span style={{ color: C.greenL, fontSize: 13, letterSpacing: '1px', fontWeight: 700 }}>FREE</span> : <><span style={{ fontSize: 10, color: C.gold }}>₵</span>{total.toLocaleString()}</>}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{event.title} · {event.dateLabel}</p>
            </div>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'block', width: 14, height: 1, background: C.gold }} />Choose payment method
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Visa / Mastercard'].map(method => (
                <button key={method} onClick={() => setPayMethod(method)}
                  style={{ padding: '14px 10px', border: `1px solid ${payMethod === method ? C.goldBd : C.bd}`, borderRadius: 8, background: payMethod === method ? C.goldDim : C.bg3, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: payMethod === method ? C.gold : C.c2, cursor: 'pointer', transition: 'all 180ms', textAlign: 'center' }}>
                  {method}
                </button>
              ))}
            </div>
            {payMethod && (
              <div style={{ background: C.goldDim, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.6 }}>
                  {payMethod.includes('Visa') ? 'You will be redirected to a secure Paystack payment page.' : `A payment prompt will be sent to your ${payMethod} number. Have your PIN ready.`}
                </p>
              </div>
            )}
            <button onClick={() => payMethod && setStep('done')}
              style={{ width: '100%', background: payMethod ? C.gold : C.bg3, color: payMethod ? '#0D0B08' : C.c3, border: `1px solid ${payMethod ? C.gold : C.bd}`, padding: 16, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: payMethod ? 'pointer' : 'not-allowed', transition: 'all 200ms', marginBottom: 10 }}>
              {payMethod ? `Pay with ${payMethod}` : 'Select a payment method'}
            </button>
            <button onClick={() => setStep('select')} style={{ width: '100%', background: 'transparent', color: C.c3, border: `1px solid ${C.bd}`, padding: 13, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>← Back</button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.greenDim, border: `1px solid ${C.greenBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <CheckCircle size={32} style={{ color: C.greenL }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 26, fontWeight: 300, color: C.cream, marginBottom: 10, letterSpacing: '-0.5px' }}>
              {tier.price === 0 ? 'Spot Reserved!' : "You're going!"}
            </h3>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c2, lineHeight: 1.6, maxWidth: 320, marginBottom: 24 }}>
              Your QR ticket for <strong style={{ color: C.cream }}>{event.title}</strong> has been sent to your phone.
            </p>
            <div style={{ width: 140, height: 140, background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, padding: 8 }}>
                {Array.from({ length: 49 }).map((_, i) => (
                  <div key={i} style={{ width: 12, height: 12, background: Math.random() > 0.5 ? C.cream : 'transparent', borderRadius: 1 }} />
                ))}
              </div>
            </div>
            <div style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20, textAlign: 'left' }}>
              {[
                { label: 'Event',  value: event.title     },
                { label: 'Ticket', value: tier.name       },
                { label: 'Date',   value: event.dateLabel },
                { label: 'Venue',  value: event.venue     },
                { label: 'Ref',    value: `AKW-${Math.random().toString(36).substr(2,8).toUpperCase()}` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.bd}` }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.cream, maxWidth: '60%', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{ width: '100%', background: C.gold, color: '#0D0B08', border: 'none', padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN ─────────────────────────────────────────── */
export default function EventDetailClient({ event, related }: { event: GhanaEvent; related: GhanaEvent[] }) {
  const { user } = useAuth();
  const supabase  = createClient();

  const [saved,        setSaved]        = useState(false);
  const [ticketOpen,   setTicketOpen]   = useState(false);
  const [inDreamList,  setInDreamList]  = useState(false);
  const [dreamLoading, setDreamLoading] = useState(false);
  const [dreamToast,   setDreamToast]   = useState('');

  const tiers       = getTiers(event.price);
  const description = getDescription(event);
  const paragraphs  = description.split('\n\n');

  // Check if already in dream list
  useEffect(() => {
    if (!user) return;
    supabase
      .from('dream_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_slug', event.slug)
      .maybeSingle()
      .then(({ data }) => setInDreamList(!!data));
  }, [user, event.slug]);

  async function toggleDreamList() {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setDreamLoading(true);
    if (inDreamList) {
      await supabase
        .from('dream_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_slug', event.slug);
      setInDreamList(false);
      showToast('Removed from Dream List');
    } else {
      await supabase.from('dream_events').upsert({
        user_id:     user.id,
        event_slug:  event.slug,
        event_title: event.title,
        event_image: event.image,
        is_public:   true,
      }, { onConflict: 'user_id,event_slug' });
      setInDreamList(true);
      showToast('Added to Dream List ✨');
    }
    setDreamLoading(false);
  }

  function showToast(msg: string) {
    setDreamToast(msg);
    setTimeout(() => setDreamToast(''), 2800);
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: 62 }}>

      {/* Toast */}
      {dreamToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 600, background: C.bg2, border: `1px solid ${C.bd2}`,
          borderRadius: 10, padding: '12px 20px',
          fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase',
          color: C.cream, whiteSpace: 'nowrap',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeSlideUp 0.3s ease both',
        }}>
          {dreamToast}
        </div>
      )}

      {/* HERO */}
      <div style={{ position: 'relative', width: '100%', height: 'min(65vw, 520px)', minHeight: 300, overflow: 'hidden', background: C.bg3 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.42) saturate(0.75)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, rgba(13,11,8,0.3) 55%, transparent 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(13,11,8,0.72) 0%, transparent 65%)' }} />

        <Link href="/events" style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.65)', background: 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(245,236,215,0.1)', padding: '8px 14px', borderRadius: 6, textDecoration: 'none' }}>
          <ArrowLeft size={12} /> Events
        </Link>

        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
          <button
            onClick={toggleDreamList}
            disabled={dreamLoading}
            title={inDreamList ? 'Remove from Dream List' : 'Add to Dream List'}
            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${inDreamList ? 'rgba(200,146,42,0.45)' : 'rgba(245,236,215,0.12)'}`, background: inDreamList ? C.goldDim : 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: inDreamList ? C.gold : 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 220ms' }}>
            {dreamLoading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Star size={17} fill={inDreamList ? C.gold : 'none'} />}
          </button>
          <button
            onClick={() => setSaved(s => !s)}
            style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${saved ? 'rgba(206,17,38,0.4)' : 'rgba(245,236,215,0.12)'}`, background: saved ? 'rgba(206,17,38,0.15)' : 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: saved ? C.red : 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 220ms' }}>
            <Heart size={17} fill={saved ? C.red : 'none'} />
          </button>
          <button style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(245,236,215,0.12)', background: 'rgba(13,11,8,0.72)', backdropFilter: 'blur(10px)', color: 'rgba(245,236,215,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 size={17} />
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 28px', zIndex: 2 }}>
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
            ? <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 17, fontWeight: 700, color: C.greenL, letterSpacing: '0.5px' }}>FREE</p>
            : <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 21, color: C.cream, letterSpacing: '-1px' }}><span style={{ fontSize: 11, color: C.gold }}>₵</span>{event.price.toLocaleString()}</p>
          }
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          {/* Dream list button in sticky bar */}
          <button
            onClick={toggleDreamList}
            disabled={dreamLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase',
              border: `1px solid ${inDreamList ? C.goldBd : C.bd}`,
              background: inDreamList ? C.goldDim : 'transparent',
              color: inDreamList ? C.gold : C.c3,
              padding: '11px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms', flexShrink: 0,
            }}
            title={inDreamList ? 'Remove from Dream List' : 'Add to Dream List'}
          >
            <Star size={13} fill={inDreamList ? C.gold : 'none'} />
            <span className="hidden sm:inline">{inDreamList ? 'In Dream List' : 'Dream List'}</span>
          </button>
          <button onClick={() => setTicketOpen(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.gold, color: '#0D0B08', border: 'none', padding: '11px 20px', borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            <Ticket size={14} />
            {event.price === 0 ? 'Reserve' : 'Get Tickets'}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 24 }}>
          {[
            { Icon: Calendar, label: 'Date',  value: event.dateLabel },
            { Icon: Clock,    label: 'Time',  value: event.time      },
            { Icon: MapPin,   label: 'Venue', value: event.venue     },
            { Icon: Users,    label: 'City',  value: `${cityLabel(event.city)} · ${event.region}` },
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
                    : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 17, color: C.cream, letterSpacing: '-0.5px' }}><span style={{ fontSize: 10, color: C.gold }}>₵</span>{tier.price.toLocaleString()}</span>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* CTA row — Get Tickets + Dream List side by side */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setTicketOpen(true)}
              style={{ flex: 1, background: C.gold, color: '#0D0B08', border: 'none', padding: 15, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ticket size={14} />{event.price === 0 ? 'Reserve Free Ticket' : `Get Tickets — from ₵${event.price.toLocaleString()}`}
            </button>
            <button onClick={toggleDreamList} disabled={dreamLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${inDreamList ? C.goldBd : C.bd}`, background: inDreamList ? C.goldDim : 'transparent', color: inDreamList ? C.gold : C.c3, padding: '15px 18px', borderRadius: 8, cursor: 'pointer', transition: 'all 200ms', flexShrink: 0 }}>
              <Star size={16} fill={inDreamList ? C.gold : 'none'} />
            </button>
          </div>

          {/* Dream list prompt for non-logged-in users */}
          {!user && (
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c3, textAlign: 'center', marginTop: 12 }}>
              <Link href="/auth" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link> to add this to your Dream List so friends can gift you a ticket
            </p>
          )}

          {inDreamList && (
            <div style={{ marginTop: 12, background: C.goldDim, border: `1px solid ${C.goldBd}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={13} style={{ color: C.gold, flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, lineHeight: 1.5 }}>
                This event is on your Dream List. Friends who visit your profile can gift you a ticket.
              </p>
            </div>
          )}
        </div>

        {/* Venue */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.75, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'block', width: 16, height: 1, background: C.gold }} />Venue
          </p>
          <div style={{ padding: '20px', background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 400, color: C.cream, marginBottom: 6 }}>{event.venue}</h3>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
              <MapPin size={12} style={{ color: C.gold, flexShrink: 0 }} />{cityLabel(event.city)}, Ghana
            </p>
            <div style={{ height: 180, borderRadius: 8, background: `linear-gradient(135deg, ${C.bg3} 0%, ${C.bg4} 100%)`, border: `1px solid ${C.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <MapPin size={32} style={{ color: C.gold, opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Interactive map — coming soon</p>
            </div>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(event.venue + ', Ghana')}`} target="_blank" rel="noopener noreferrer"
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 7, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c2, textDecoration: 'none' }}>
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
              'QR ticket delivered to your phone instantly after payment',
              'Tickets are non-refundable but transferable up to 24hrs before the event',
              'Pay with MTN MoMo, Vodafone Cash, AirtelTigo, or Visa/Mastercard',
              event.category === 'nightlife' || event.category === 'concert' ? 'Smart casual or formal attire enforced — no flip flops or shorts' : 'All ages welcome unless otherwise stated',
              'Gates open 60 minutes before event start time',
              'Bolt and taxis are available nearby for late-night travel',
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
                    <span style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 6.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 3, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBd}` }}>{ev.badge}</span>
                  </div>
                  <div style={{ padding: '12px 13px 14px' }}>
                    <h4 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 15, fontWeight: 400, color: C.cream, lineHeight: 1.2, marginBottom: 5 }}>{ev.title}</h4>
                    <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3, marginBottom: 8 }}>{ev.dateLabel}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.bd}` }}>
                      {ev.price === 0
                        ? <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, fontWeight: 700, color: C.greenL, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Free</span>
                        : <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14, color: C.cream }}><span style={{ fontSize: 9, color: C.gold }}>₵</span>{ev.price}</span>
                      }
                      <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.gold }}>View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {ticketOpen && <TicketModal event={event} onClose={() => setTicketOpen(false)} />}
    </div>
  );
}
