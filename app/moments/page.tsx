'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import CustomPlayer from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftModal from '@/components/moments/GiftModal';
import MomentActions from '@/components/moments/MomentActions';
import MomentInfo from '@/components/moments/MomentInfo';
import SearchSheet from '@/components/moments/SearchSheet';
import { C, EVENT_PHOTOS } from '@/components/moments/types';
import type { Comment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentLikes } from '@/hooks/useMomentLikes';

export default function MomentsPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const {
    moments,
    activeIdx,
    setActiveIdx,
    moment,
    loading,
    goNext,
    goPrev,
    total,
  } = useMoments(initialId);

  const { comments, send } = useMomentComments(moment?.id);
  const { liked, likeCount, toggle: toggleLike } = useMomentLikes(moment?.id, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);

  const touchY = useRef(0);
  const touchX = useRef(0);

  // Sync URL when active moment changes
  useEffect(() => {
    if (!moment?.id) return;
    const url = `/moments?id=${moment.id}`;
    window.history.replaceState(null, '', url);
  }, [moment?.id]);

  // Keyboard: arrows + space
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showComments || showSearch || lightbox) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
        setShowComments(false);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
        setShowComments(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, showComments, showSearch, lightbox]);

  const handleShare = useCallback(async () => {
    if (!moment) return;
    const url = `${window.location.origin}/moments?id=${moment.id}`;
    const data = {
      title: moment.title,
      text: `${moment.title} — ${moment.event_name} on Akwaaba`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }, [moment]);

  const handleLike = useCallback(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    toggleLike();
  }, [user, router, toggleLike]);

  const handleSend = useCallback(
    (text: string) => {
      if (!user) return;
      send(user.id, text);
    },
    [user, send],
  );

  const handleGift = useCallback(
    async () => {
      if (!user || !giftTarget || !moment) return;
      // Create a gifted ticket record (requires tickets table + RLS)
      const { error } = await supabase.from('tickets').insert({
        user_id: giftTarget.user_id,
        event_slug: moment.event_slug ?? 'unknown',
        event_title: moment.event_name,
        event_date: moment.year ? `${moment.year}-01-01` : new Date().toISOString().slice(0, 10),
        event_venue: 'Gifted via Moments',
        ticket_tier: 'Gift',
        quantity: 1,
        total_paid: 0,
        gifted_by: user.id,
        gifted_to: giftTarget.user_id,
        status: 'gifted',
      });
      if (error) throw new Error(error.message);
    },
    [user, giftTarget, moment, supabase],
  );

  function handleTouchStart(e: React.TouchEvent) {
    touchY.current = e.touches[0].clientY;
    touchX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (showComments || showSearch || lightbox) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 35) return;
    if (dy > 0) {
      goNext();
      setShowComments(false);
    } else {
      goPrev();
      setShowComments(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          background: '#000',
          height: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 9,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          Loading…
        </p>
      </div>
    );
  }

  if (!moments.length) {
    return (
      <div
        style={{
          background: '#000',
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-cormorant,serif)',
            fontSize: 26,
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          No moments yet
        </p>
        <Link
          href="/events"
          style={{
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: C.gold,
            textDecoration: 'none',
            border: '1px solid rgba(200,146,42,0.35)',
            padding: '11px 22px',
            borderRadius: 6,
          }}
        >
          Browse Events
        </Link>
      </div>
    );
  }

  const photos =
    EVENT_PHOTOS[moment?.event_slug ?? ''] ?? EVENT_PHOTOS.default;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* HEADER */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          background: 'rgba(0,0,0,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(245,236,215,0.65)',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '7px 14px',
            borderRadius: 20,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={12} /> Back
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-syne,sans-serif)',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#F5ECD7',
          }}
        >
          AK<span style={{ color: C.gold }}>W</span>AABA
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {moment?.is_featured && (
            <span
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 7,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(200,146,42,0.18)',
                color: C.gold,
                border: '1px solid rgba(200,146,42,0.3)',
              }}
            >
              Featured
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 7,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.07)',
              color: 'rgba(245,236,215,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {activeIdx + 1} / {total}
          </span>
        </div>
      </div>

      {/* VIDEO AREA */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {moment && <CustomPlayer youtubeId={moment.youtube_id} title={moment.title} />}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.1) 40%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {moment && (
          <MomentActions
            liked={liked}
            likeCount={likeCount}
            commentCount={comments.length}
            eventSlug={moment.event_slug}
            onLike={handleLike}
            onComments={() => setShowComments((v) => !v)}
            onSearch={() => setShowSearch(true)}
            onShare={handleShare}
          />
        )}

        {moment && (
          <MomentInfo moment={moment} photos={photos} onPhotoClick={setLightbox} />
        )}

        {showComments && moment && (
          <CommentsSheet
            moment={moment}
            comments={comments}
            onClose={() => setShowComments(false)}
            onSend={handleSend}
            onGift={(c) => setGiftTarget(c)}
            user={user}
            profile={profile}
          />
        )}

        {giftTarget && moment && (
          <GiftModal
            comment={giftTarget}
            moment={moment}
            onClose={() => setGiftTarget(null)}
            onConfirm={handleGift}
          />
        )}

        {showSearch && (
          <SearchSheet
            moments={moments}
            onSelect={setActiveIdx}
            onClose={() => setShowSearch(false)}
          />
        )}

        {lightbox && (
          <Lightbox
            photos={photos}
            current={lightbox}
            onClose={() => setLightbox(null)}
            onChange={setLightbox}
          />
        )}

        {shareToast && (
          <div
            style={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              background: C.glass,
              border: `1px solid ${C.glassBd}`,
              borderRadius: 12,
              padding: '10px 18px',
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 13,
              color: C.cream,
              backdropFilter: 'blur(16px)',
            }}
          >
            Link copied
          </div>
        )}
      </div>
    </div>
  );
}

function Lightbox({
  photos,
  current,
  onClose,
  onChange,
}: {
  photos: string[];
  current: string;
  onClose: () => void;
  onChange: (src: string) => void;
}) {
  const touchX = useRef(0);

  return (
    <div
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 40) {
          const idx = photos.indexOf(current);
          if (dx > 0 && idx < photos.length - 1) {
            e.stopPropagation();
            onChange(photos[idx + 1]);
          } else if (dx < 0 && idx > 0) {
            e.stopPropagation();
            onChange(photos[idx - 1]);
          }
        }
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(245,236,215,0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={16} />
      </button>
      {photos.indexOf(current) > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange(photos[photos.indexOf(current) - 1]);
          }}
          style={{
            position: 'absolute',
            left: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: C.cream,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          ‹
        </button>
      )}
      {photos.indexOf(current) < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange(photos[photos.indexOf(current) + 1]);
          }}
          style={{
            position: 'absolute',
            right: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: C.cream,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          ›
        </button>
      )}
      <img
        src={current}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '80vh',
          borderRadius: 12,
          objectFit: 'contain',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      />
      <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 6 }}>
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onChange(p);
            }}
            style={{
              width: i === photos.indexOf(current) ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === photos.indexOf(current) ? C.gold : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 200ms',
            }}
          />
        ))}
      </div>
    </div>
  );
}
