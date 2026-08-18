'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle, X, Send, Gift, ChevronUp, ChevronDown,
  Volume2, VolumeX, Settings, Heart, Share2, ArrowLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';

const C = {
  bg: '#0D0B08', bg2: '#141109',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.18)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.7)', c3: 'rgba(245,236,215,0.4)',
  c4: 'rgba(245,236,215,0.12)',
  glass: 'rgba(10,14,10,0.55)',
  glassBd: 'rgba(245,236,215,0.12)',
  greenL: '#4ade80',
  red: '#CE1126',
};

interface Moment {
  id: string;
  title: string;
  event_name: string;
  event_slug: string | null;
  youtube_id: string;
  description: string | null;
  year: number | null;
  is_featured: boolean;
}

interface Comment {
  id: string;
  moment_id: string;
  user_id: string;
  content: string;
  gift_event_slug: string | null;
  created_at: string;
  profiles?: { username: string; full_name: string | null; avatar_url: string | null };
}

const EMOJIS = ['🔥', '❤️', '🎵', '🙌', '😮', '💫'];

/* ── Liquid Glass Comment Overlay ─────────────────── */
function CommentOverlay({
  moment,
  comments,
  onClose,
  onSend,
  onGift,
  currentUser,
  currentProfile,
}: {
  moment: Moment;
  comments: Comment[];
  onClose: () => void;
  onSend: (text: string) => void;
  onGift: (comment: Comment) => void;
  currentUser: any;
  currentProfile: any;
}) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '65%',
      background: C.glass,
      backdropFilter: 'blur(32px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
      borderTop: `1px solid ${C.glassBd}`,
      borderRadius: '20px 20px 0 0',
      display: 'flex', flexDirection: 'column',
      zIndex: 20,
    }}>
      {/* Handle + header */}
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.glassBd, margin: '0 auto 10px' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px', borderBottom: `1px solid ${C.glassBd}` }}>
        <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.c2 }}>
          Live Comments · {comments.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.greenL, boxShadow: `0 0 8px ${C.greenL}`, animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.greenL }}>LIVE</span>
        </div>
        <button onClick={onClose} style={{ background: C.c4, border: `1px solid ${C.glassBd}`, color: C.c3, cursor: 'pointer', padding: 6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {/* Comments scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3 }}>Be the first to comment</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 12, fontWeight: 700, color: '#0D0B08', overflow: 'hidden' }}>
              {c.profiles?.avatar_url
                ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (c.profiles?.username?.[0] ?? 'U').toUpperCase()
              }
            </div>
            {/* Bubble */}
            <div style={{ flex: 1 }}>
              <div style={{ background: 'rgba(245,236,215,0.07)', borderRadius: '0 12px 12px 12px', padding: '8px 12px', border: `1px solid ${C.glassBd}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8.5, color: C.gold }}>@{c.profiles?.username ?? 'user'}</span>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, color: C.c3 }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, lineHeight: 1.4 }}>{c.content}</p>
                {c.gift_event_slug && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, background: C.goldDim, borderRadius: 6, padding: '4px 8px' }}>
                    <Gift size={10} style={{ color: C.gold }} />
                    <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, color: C.gold }}>Gifted a ticket</span>
                  </div>
                )}
              </div>
              {/* Gift button — show for other users' comments */}
              {currentUser && c.user_id !== currentUser.id && (
                <button onClick={() => onGift(c)}
                  style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '1px', color: C.c3, padding: '2px 0' }}>
                  <Gift size={9} /> Gift ticket
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.glassBd}`, display: 'flex', gap: 8, alignItems: 'center' }}>
        {currentUser ? (
          <>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 11, fontWeight: 700, color: '#0D0B08' }}>
              {(currentProfile?.username?.[0] ?? 'U').toUpperCase()}
            </div>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Add a comment…"
              style={{ flex: 1, background: 'rgba(245,236,215,0.08)', border: `1px solid ${C.glassBd}`, borderRadius: 20, padding: '9px 14px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.cream, outline: 'none' }}
            />
            <button onClick={handleSend} disabled={!text.trim()}
              style={{ width: 34, height: 34, borderRadius: '50%', background: text.trim() ? C.gold : C.c4, border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}>
              <Send size={14} style={{ color: text.trim() ? '#0D0B08' : C.c3 }} />
            </button>
          </>
        ) : (
          <Link href="/auth" style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, background: C.goldDim, border: `1px solid rgba(200,146,42,0.3)`, borderRadius: 20, padding: '11px', textDecoration: 'none', display: 'block' }}>
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Gift Modal ─────────────────────────────────── */
function GiftModal({ comment, moment, onClose, onGift }: { comment: Comment; moment: Moment; onClose: () => void; onGift: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,11,8,0.7)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: C.glass, backdropFilter: 'blur(24px)', border: `1px solid ${C.glassBd}`, borderRadius: 16, padding: 24, maxWidth: 320, width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Gift size={20} style={{ color: C.gold }} />
          <h3 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 22, fontWeight: 400, color: C.cream }}>Gift a Ticket</h3>
        </div>
        <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c2, lineHeight: 1.6, marginBottom: 20 }}>
          Send a ticket for <strong style={{ color: C.cream }}>{moment.event_name}</strong> to{' '}
          <strong style={{ color: C.gold }}>@{comment.profiles?.username}</strong>. They will receive it instantly in their My Tickets wallet.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.glassBd}`, color: C.c2, padding: 12, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onGift} style={{ flex: 2, background: C.gold, border: 'none', color: '#0D0B08', padding: 12, borderRadius: 8, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Gift size={13} /> Gift Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single Video Slide ─────────────────────────── */
function MomentSlide({
  moment, active, showComments, setShowComments, comments, onSend, onGift, currentUser, currentProfile, giftTarget, setGiftTarget,
}: {
  moment: Moment; active: boolean;
  showComments: boolean; setShowComments: (v: boolean) => void;
  comments: Comment[]; onSend: (text: string) => void;
  onGift: (comment: Comment) => void;
  currentUser: any; currentProfile: any;
  giftTarget: Comment | null; setGiftTarget: (c: Comment | null) => void;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>

      {/* YouTube player — full width */}
      {active && (
        <iframe
          src={`https://www.youtube.com/embed/${moment.youtube_id}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1`}
          style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      )}

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,11,8,0.92) 0%, transparent 40%, transparent 70%, rgba(13,11,8,0.5) 100%)', pointerEvents: 'none', zIndex: 5 }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {moment.is_featured && (
            <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: C.goldDim, color: C.gold, border: '1px solid rgba(200,146,42,0.3)' }}>Featured</span>
          )}
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: 'rgba(10,14,10,0.7)', color: C.c2, border: `1px solid ${C.glassBd}` }}>{moment.year}</span>
        </div>
        <button onClick={() => setShowComments(!showComments)}
          style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: showComments ? C.goldDim : 'rgba(10,14,10,0.7)', border: `1px solid ${showComments ? 'rgba(200,146,42,0.4)' : C.glassBd}`, color: showComments ? C.gold : C.c2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
          <MessageCircle size={17} />
          {comments.length > 0 && (
            <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: '#fff', fontWeight: 700 }}>
              {comments.length > 9 ? '9+' : comments.length}
            </div>
          )}
        </button>
      </div>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: showComments ? '65%' : 0, left: 0, right: 0, zIndex: 10, padding: '0 20px 28px', transition: 'bottom 300ms ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, opacity: 0.8, marginBottom: 6 }}>{moment.event_name}</p>
            <h2 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 300, color: C.cream, lineHeight: 1.1, marginBottom: 8 }}>{moment.title}</h2>
            {moment.description && (
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: C.c2, lineHeight: 1.5, maxWidth: 260 }}>{moment.description}</p>
            )}
            {moment.event_slug && (
              <Link href={`/events/${moment.event_slug}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7.5, letterSpacing: '2px', textTransform: 'uppercase', color: '#0D0B08', background: C.gold, padding: '7px 14px', borderRadius: 5, textDecoration: 'none', fontWeight: 700 }}>
                Get Tickets \u2192
              </Link>
            )}
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <button onClick={() => setLiked(l => !l)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: liked ? 'rgba(206,17,38,0.25)' : 'rgba(10,14,10,0.7)', border: `1px solid ${liked ? 'rgba(206,17,38,0.5)' : C.glassBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 220ms' }}>
                <Heart size={20} fill={liked ? C.red : 'none'} style={{ color: liked ? C.red : C.c2 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.c3 }}>Like</span>
            </button>
            <button onClick={() => setShowComments(!showComments)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(10,14,10,0.7)', border: `1px solid ${C.glassBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={20} style={{ color: C.c2 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.c3 }}>{comments.length}</span>
            </button>
            <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(10,14,10,0.7)', border: `1px solid ${C.glassBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={20} style={{ color: C.c2 }} />
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, color: C.c3 }}>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment overlay */}
      {showComments && (
        <CommentOverlay
          moment={moment} comments={comments}
          onClose={() => setShowComments(false)}
          onSend={onSend} onGift={c => setGiftTarget(c)}
          currentUser={currentUser} currentProfile={currentProfile}
        />
      )}

      {/* Gift modal */}
      {giftTarget && (
        <GiftModal
          comment={giftTarget} moment={moment}
          onClose={() => setGiftTarget(null)}
          onGift={() => { setGiftTarget(null); }}
        />
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────── */
export default function MomentsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [moments,      setMoments]      = useState<Moment[]>([]);
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [comments,     setComments]     = useState<Record<string, Comment[]>>({});
  const [showComments, setShowComments] = useState(false);
  const [giftTarget,   setGiftTarget]   = useState<Comment | null>(null);
  const [loading,      setLoading]      = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY  = useRef(0);

  useEffect(() => {
    loadMoments();
  }, []);

  async function loadMoments() {
    const { data } = await supabase
      .from('moments').select('*')
      .order('is_featured', { ascending: false })
      .order('year', { ascending: false });
    setMoments((data ?? []) as Moment[]);
    setLoading(false);
  }

  // Subscribe to real-time comments for current moment
  useEffect(() => {
    if (!moments.length) return;
    const momentId = moments[activeIndex]?.id;
    if (!momentId) return;

    // Load existing comments
    supabase
      .from('moment_comments')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('moment_id', momentId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setComments(prev => ({ ...prev, [momentId]: data as Comment[] }));
      });

    // Real-time subscription
    const channel = supabase
      .channel(`moment-${momentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moment_comments',
        filter: `moment_id=eq.${momentId}`,
      }, async (payload) => {
        const { data: withProfile } = await supabase
          .from('moment_comments')
          .select('*, profiles(username, full_name, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        if (withProfile) {
          setComments(prev => ({
            ...prev,
            [momentId]: [...(prev[momentId] ?? []), withProfile as Comment],
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeIndex, moments.length]);

  async function handleSend(momentId: string, text: string) {
    if (!user) return;
    await supabase.from('moment_comments').insert({
      moment_id: momentId,
      user_id:   user.id,
      content:   text,
    });
  }

  // Touch swipe navigation
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (showComments) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 60) return;
    if (dy > 0 && activeIndex < moments.length - 1) {
      setActiveIndex(i => i + 1);
    } else if (dy < 0 && activeIndex > 0) {
      setActiveIndex(i => i - 1);
    }
  }

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.3)' }}>Loading moments…</p>
    </div>
  );

  if (!moments.length) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 24, color: 'rgba(245,236,215,0.3)' }}>No moments yet</p>
      <Link href="/events" style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.gold, textDecoration: 'none', border: '1px solid rgba(200,146,42,0.3)', padding: '10px 20px', borderRadius: 6 }}>Browse Events</Link>
    </div>
  );

  const currentMoment = moments[activeIndex];
  const currentComments = comments[currentMoment?.id] ?? [];

  return (
    <div style={{ background: '#000', height: '100svh', overflow: 'hidden', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back button */}
      <Link href="/" style={{ position: 'absolute', top: 16, left: 16, zIndex: 50, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: C.c2, background: 'rgba(10,14,10,0.7)', backdropFilter: 'blur(10px)', border: `1px solid ${C.glassBd}`, padding: '8px 14px', borderRadius: 6, textDecoration: 'none' }}>
        <ArrowLeft size={12} /> Back
      </Link>

      {/* Scroll indicators */}
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {moments.map((_, i) => (
          <button key={i} onClick={() => setActiveIndex(i)}
            style={{ width: 3, height: i === activeIndex ? 24 : 8, borderRadius: 2, background: i === activeIndex ? C.gold : 'rgba(245,236,215,0.25)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 300ms' }} />
        ))}
      </div>

      {/* Navigation arrows */}
      {activeIndex > 0 && (
        <button onClick={() => setActiveIndex(i => i - 1)}
          style={{ position: 'absolute', top: 16, right: 60, zIndex: 50, width: 36, height: 36, borderRadius: '50%', background: 'rgba(10,14,10,0.7)', border: `1px solid ${C.glassBd}`, color: C.c2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronUp size={18} />
        </button>
      )}
      {activeIndex < moments.length - 1 && (
        <button onClick={() => setActiveIndex(i => i + 1)}
          style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 50, width: 36, height: 36, borderRadius: '50%', background: 'rgba(10,14,10,0.7)', border: `1px solid ${C.glassBd}`, color: C.c2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronDown size={18} />
        </button>
      )}

      {/* Active slide */}
      {currentMoment && (
        <MomentSlide
          moment={currentMoment}
          active={true}
          showComments={showComments}
          setShowComments={setShowComments}
          comments={currentComments}
          onSend={text => handleSend(currentMoment.id, text)}
          onGift={c => setGiftTarget(c)}
          currentUser={user}
          currentProfile={profile}
          giftTarget={giftTarget}
          setGiftTarget={setGiftTarget}
        />
      )}

      {/* Swipe hint */}
      {!showComments && moments.length > 1 && (
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.5 }}>
          <ChevronUp size={14} style={{ color: C.c3 }} />
          <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 7, letterSpacing: '2px', textTransform: 'uppercase', color: C.c3 }}>Swipe</span>
          <ChevronDown size={14} style={{ color: C.c3 }} />
        </div>
      )}
    </div>
  );
}
