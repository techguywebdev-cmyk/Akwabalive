'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  MessageCircle, X, Send, Gift, Heart, Share2,
  Bookmark, Ticket, ArrowLeft, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';

const C = {
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.18)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.75)', c3: 'rgba(245,236,215,0.42)',
  glass: 'rgba(18,18,18,0.62)', glassBd: 'rgba(255,255,255,0.13)',
  greenL: '#4ade80', red: '#e53935',
};

interface Moment {
  id: string; title: string; event_name: string;
  event_slug: string | null; youtube_id: string;
  description: string | null; year: number | null;
  is_featured: boolean;
}

interface Comment {
  id: string; moment_id: string; user_id: string;
  content: string; created_at: string;
  profiles?: { username: string; full_name: string | null; avatar_url: string | null };
}

// Curated event photos per moment
const EVENT_PHOTOS: Record<string, string[]> = {
  default: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80&auto=format&fit=crop',
  ],
};

function GlassBtn({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active?: boolean;
  onClick?: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: C.glass, backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: `1px solid ${active ? 'rgba(200,146,42,0.5)' : C.glassBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 220ms', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, color: '#fff', fontWeight: 700, padding: '0 3px' }}>
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>{label}</span>
    </button>
  );
}

function CommentsSheet({ moment, comments, onClose, onSend, onGift, user, profile }: {
  moment: Moment; comments: Comment[]; onClose: () => void;
  onSend: (t: string) => void; onGift: (c: Comment) => void;
  user: any; profile: any;
}) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [comments.length]);

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: '38%', background: C.glass, backdropFilter: 'blur(36px) saturate(1.8)', WebkitBackdropFilter: 'blur(36px) saturate(1.8)', borderTop: `1px solid ${C.glassBd}`, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', zIndex: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, marginBottom: 4 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.glassBd }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 12px', borderBottom: `1px solid ${C.glassBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 15, fontWeight: 600, color: C.cream }}>Comments</span>
          <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3 }}>{comments.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.greenL, boxShadow: `0 0 6px ${C.greenL}` }} />
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: C.greenL }}>Live</span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: `1px solid ${C.glassBd}`, color: C.c3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.c3 }}>No comments yet. Be first!</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 13, fontWeight: 700, color: '#0D0B08', overflow: 'hidden' }}>
              {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.profiles?.username?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', padding: '9px 13px', border: `1px solid ${C.glassBd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, fontWeight: 600, color: C.gold }}>@{c.profiles?.username ?? 'user'}</span>
                  <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, lineHeight: 1.45 }}>{c.content}</p>
              </div>
              {user && c.user_id !== user.id && (
                <button onClick={() => onGift(c)} style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '1px', color: C.c3, padding: 0 }}>
                  <Gift size={10} style={{ color: C.gold }} /> Gift ticket
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px 14px 20px', borderTop: `1px solid ${C.glassBd}`, display: 'flex', gap: 10, alignItems: 'center' }}>
        {user ? (
          <>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 12, fontWeight: 700, color: '#0D0B08' }}>
              {(profile?.username?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.glassBd}`, borderRadius: 24, padding: '0 6px 0 14px' }}>
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onSend(text.trim()); setText(''); } }}
                placeholder="Add a comment…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, padding: '10px 0' }} />
              <button onClick={() => { if (text.trim()) { onSend(text.trim()); setText(''); } }}
                style={{ width: 34, height: 34, borderRadius: '50%', background: text.trim() ? C.gold : 'transparent', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}>
                <Send size={15} style={{ color: text.trim() ? '#0D0B08' : C.c3 }} />
              </button>
            </div>
          </>
        ) : (
          <Link href="/auth" style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, background: C.goldDim, border: '1px solid rgba(200,146,42,0.3)', borderRadius: 24, padding: '12px', textDecoration: 'none', display: 'block' }}>
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  );
}

function GiftModal({ comment, moment, onClose, onConfirm }: { comment: Comment; moment: Moment; onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
      <div style={{ background: C.glass, backdropFilter: 'blur(32px)', border: `1px solid ${C.glassBd}`, borderRadius: 20, padding: '28px 24px', maxWidth: 320, width: '88%' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.goldDim, border: '1px solid rgba(200,146,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Gift size={22} style={{ color: C.gold }} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, fontWeight: 300, color: C.cream, marginBottom: 10 }}>Gift a Ticket</h3>
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.65, marginBottom: 24 }}>
          Send a ticket for <strong style={{ color: C.cream }}>{moment.event_name}</strong> to{' '}
          <strong style={{ color: C.gold }}>@{comment.profiles?.username}</strong>. They&apos;ll receive it instantly in their wallet.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.glassBd}`, color: C.c2, padding: '12px', borderRadius: 10, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 2, background: C.gold, border: 'none', color: '#0D0B08', padding: '12px', borderRadius: 10, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Gift size={13} /> Send Gift
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MomentsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [moments,      setMoments]      = useState<Moment[]>([]);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [comments,     setComments]     = useState<Record<string, Comment[]>>({});
  const [showComments, setShowComments] = useState(false);
  const [liked,        setLiked]        = useState<Record<string, boolean>>({});
  const [saved,        setSaved]        = useState<Record<string, boolean>>({});
  const [giftTarget,   setGiftTarget]   = useState<Comment | null>(null);
  const [lightbox,     setLightbox]     = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const touchY   = useRef(0);
  const touchX   = useRef(0);
  const dragging = useRef(false);

  useEffect(() => { loadMoments(); }, []);

  async function loadMoments() {
    const { data } = await supabase.from('moments').select('*')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false });
    setMoments((data ?? []) as Moment[]);
    setLoading(false);
  }

  const moment = moments[activeIdx];
  const currentComments = comments[moment?.id] ?? [];

  useEffect(() => {
    if (!moment) return;
    const id = moment.id;
    supabase.from('moment_comments')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('moment_id', id).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(p => ({ ...p, [id]: data as Comment[] })); });

    const ch = supabase.channel(`mc-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moment_comments', filter: `moment_id=eq.${id}` },
        async (payload) => {
          const { data } = await supabase.from('moment_comments').select('*, profiles(username, full_name, avatar_url)').eq('id', payload.new.id).single();
          if (data) setComments(p => ({ ...p, [id]: [...(p[id] ?? []), data as Comment] }));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeIdx, moment?.id]);

  async function handleSend(text: string) {
    if (!user || !moment) return;
    await supabase.from('moment_comments').insert({ moment_id: moment.id, user_id: user.id, content: text });
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchY.current = e.touches[0].clientY;
    touchX.current = e.touches[0].clientX;
    dragging.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dy = Math.abs(e.touches[0].clientY - touchY.current);
    const dx = Math.abs(e.touches[0].clientX - touchX.current);
    if (dy > dx && dy > 10) dragging.current = true;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (showComments || !dragging.current) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 40) return;
    if (dy > 0 && activeIdx < moments.length - 1) { setActiveIdx(i => i + 1); setShowComments(false); }
    else if (dy < 0 && activeIdx > 0) { setActiveIdx(i => i - 1); setShowComments(false); }
  }

  if (loading) return (
    <div style={{ background: '#000', height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Loading…</p>
    </div>
  );

  if (!moments.length) return (
    <div style={{ background: '#000', height: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 26, color: 'rgba(255,255,255,0.25)' }}>No moments yet</p>
      <Link href="/events" style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.35)', padding: '11px 22px', borderRadius: 6 }}>Browse Events</Link>
    </div>
  );

  const photos = EVENT_PHOTOS[moment?.event_slug ?? ''] ?? EVENT_PHOTOS.default;

  return (
    <div style={{ background: '#000', height: '100svh', width: '100vw', overflow: 'hidden', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* FIXED HEADER */}
      <div style={{ height: 56, flexShrink: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.7)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 14px', borderRadius: 20, textDecoration: 'none' }}>
          <ArrowLeft size={12} /> Back
        </Link>
        <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 14, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#F5ECD7' }}>
          AK<span style={{ color: C.gold }}>W</span>AABA
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {moment?.is_featured && <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, background: 'rgba(200,146,42,0.18)', color: C.gold, border: '1px solid rgba(200,146,42,0.3)' }}>Featured</span>}
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(245,236,215,0.42)', border: '1px solid rgba(255,255,255,0.1)' }}>{moment?.year}</span>
        </div>
      </div>

      {/* VIDEO AREA */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>

        {/* Block YouTube title bar at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, zIndex: 5, background: 'rgba(0,0,0,1)', pointerEvents: 'none' }} />

        {/* YouTube iframe */}
        {moment && (
          <iframe key={moment.id}
            src={`https://www.youtube.com/embed/${moment.youtube_id}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&iv_load_policy=3&fs=0&color=white&origin=${encodeURIComponent('https://akwabalive.vercel.app')}`}
            style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: 'calc((100svh - 56px) * 16 / 9)', height: 'calc(100% + 120px)', minWidth: '100%', border: 'none', zIndex: 2 }}
            allow="autoplay; fullscreen" allowFullScreen
          />
        )}

        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.15) 40%, transparent 65%)', pointerEvents: 'none' }} />
        {/* Block YouTube bottom suggestions */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, zIndex: 4, background: 'rgba(0,0,0,0.96)', pointerEvents: 'none' }} />

        {/* RIGHT ACTION BUTTONS */}
        <div style={{ position: 'absolute', right: 12, bottom: 170, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <GlassBtn icon={<Heart size={20} fill={liked[moment?.id] ? C.red : 'none'} style={{ color: liked[moment?.id] ? C.red : C.cream }} />} label="2.4K" active={liked[moment?.id]} onClick={() => moment && setLiked(l => ({ ...l, [moment.id]: !l[moment.id] }))} />
          <GlassBtn icon={<MessageCircle size={20} style={{ color: C.cream }} />} label={String(currentComments.length || 256)} badge={currentComments.length} onClick={() => setShowComments(v => !v)} />
          <GlassBtn icon={<Bookmark size={20} fill={saved[moment?.id] ? C.gold : 'none'} style={{ color: saved[moment?.id] ? C.gold : C.cream }} />} label="Save" active={saved[moment?.id]} onClick={() => moment && setSaved(s => ({ ...s, [moment.id]: !s[moment.id] }))} />
          <GlassBtn icon={<Share2 size={20} style={{ color: C.cream }} />} label="Share" />
          {moment?.event_slug && (
            <Link href={`/events/${moment.event_slug}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: C.glass, backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                <Ticket size={20} style={{ color: C.gold }} />
              </div>
              <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>Tickets</span>
            </Link>
          )}
        </div>

        {/* BOTTOM INFO */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 72, zIndex: 10, padding: '0 18px 20px' }}>
          <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.gold, opacity: 0.85, marginBottom: 6 }}>{moment?.event_name}</p>
          <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 300, color: C.cream, lineHeight: 1.1, marginBottom: 8 }}>{moment?.title}</h2>
          {moment?.description && (
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, lineHeight: 1.5, marginBottom: 10, maxWidth: 260 }}>{moment.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>📅 {moment?.year}</span>
            <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 11, color: C.c3 }}>⏱ 1h 45m</span>
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: C.glass, color: C.c3, border: `1px solid ${C.glassBd}` }}>HD</span>
          </div>

          {/* PHOTO GALLERY STRIP */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 12 }}>
            {photos.map((src, i) => (
              <button key={i} onClick={() => setLightbox(src)}
                style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', cursor: 'pointer', padding: 0, transition: 'transform 180ms', outline: 'none' }} />
            ))}
          </div>

          {moment?.event_slug && (
            <Link href={`/events/${moment.event_slug}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: '#0D0B08', background: C.gold, padding: '10px 18px', borderRadius: 22, textDecoration: 'none', fontWeight: 700 }}>
              <Ticket size={13} /> Get Tickets
            </Link>
          )}
        </div>

        {/* Swipe hint */}
        {moments.length > 1 && !showComments && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.35 }}>
            <ChevronDown size={13} style={{ color: C.c3 }} />
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Swipe</span>
          </div>
        )}

        {/* COMMENTS SHEET */}
        {showComments && moment && (
          <CommentsSheet moment={moment} comments={currentComments} onClose={() => setShowComments(false)} onSend={handleSend} onGift={c => setGiftTarget(c)} user={user} profile={profile} />
        )}

        {/* GIFT MODAL */}
        {giftTarget && moment && (
          <GiftModal comment={giftTarget} moment={moment} onClose={() => setGiftTarget(null)} onConfirm={() => setGiftTarget(null)} />
        )}

        {/* LIGHTBOX */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(245,236,215,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <X size={16} />
            </button>
            {/* Prev/Next in lightbox */}
            {photos.indexOf(lightbox) > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setLightbox(photos[photos.indexOf(lightbox) - 1]); }} style={{ position: 'absolute', left: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(245,236,215,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            )}
            {photos.indexOf(lightbox) < photos.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setLightbox(photos[photos.indexOf(lightbox) + 1]); }} style={{ position: 'absolute', right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(245,236,215,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            )}
            <img src={lightbox} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} />
            {/* Dot indicators */}
            <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 6 }}>
              {photos.map((p, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setLightbox(p); }} style={{ width: i === photos.indexOf(lightbox) ? 20 : 6, height: 6, borderRadius: 3, background: i === photos.indexOf(lightbox) ? '#C8922A' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 200ms' }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
