'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Nav from '@/components/layout/Nav';
import CustomPlayer, {
  type CustomPlayerHandle,
} from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftModal from '@/components/moments/GiftModal';
import MomentActions from '@/components/moments/MomentActions';
import MomentInfo from '@/components/moments/MomentInfo';
import MomentChapters from '@/components/moments/MomentChapters';
import { C, EVENT_PHOTOS, getChapters } from '@/components/moments/types';
import type { Comment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { useMomentComments } from '@/hooks/useMomentComments';
import { useMomentLikes } from '@/hooks/useMomentLikes';
import { events } from '@/lib/data/events';

export default function MomentsClient() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  const initialT = Number(searchParams.get('t') || 0);

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
  const { liked, toggle: toggleLike } = useMomentLikes(moment?.id, user?.id);

  const [showComments, setShowComments] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [heartBurst, setHeartBurst] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const touchY = useRef(0);
  const playerRef = useRef<CustomPlayerHandle>(null);
  const eventMeta = events.find((e) => e.slug === moment?.event_slug);

  const chapters = useMemo(() => getChapters(moment), [moment]);

  useEffect(() => {
    setCurrentSeconds(0);
    setDurationSeconds(0);
  }, [moment?.id]);

  useEffect(() => {
    if (!moment?.id) return;
    const tParam =
      currentSeconds > 5 ? `&t=${Math.floor(currentSeconds)}` : '';
    // keep id in URL; only bake t on share, not every tick
    window.history.replaceState(null, '', `/moments?id=${moment.id}`);
  }, [moment?.id, currentSeconds]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showComments || lightbox) return;
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
  }, [goNext, goPrev, showComments, lightbox]);

  const handleSend = useCallback(
    (text: string) => {
      if (!user) return;
      send(user.id, text);
    },
    [user, send],
  );

  const handleGift = useCallback(async () => {
    if (!user || !giftTarget || !moment) return;
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
  }, [user, giftTarget, moment, supabase]);

  const handleShare = useCallback(async () => {
    if (!moment) return;
    const t = Math.floor(currentSeconds);
    const url = `${window.location.origin}/moments?id=${moment.id}${t > 0 ? `&t=${t}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: moment.title,
          text: `${moment.title} — ${moment.event_name} on Akwaaba`,
          url,
        });
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
  }, [moment, currentSeconds]);

  const handleDoubleTap = useCallback(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!liked) toggleLike();
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
  }, [user, router, liked, toggleLike]);

  const handleSeek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
    setCurrentSeconds(seconds);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (showComments || lightbox) return;
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
        <Nav transparent active="Moments" />
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

  const photos = EVENT_PHOTOS[moment?.event_slug ?? ''] ?? EVENT_PHOTOS.default;
  const hasChapters = chapters.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Nav transparent active="Moments" />

      <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
        {moment && (
          <CustomPlayer
            key={moment.id}
            ref={playerRef}
            youtubeId={moment.youtube_id}
            title={moment.title}
            onDoubleTap={handleDoubleTap}
            initialSeekSeconds={
              moment.id === initialId && initialT > 0 ? initialT : null
            }
            onTimeUpdate={(t, d) => {
              setCurrentSeconds(t);
              setDurationSeconds(d);
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 30%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {heartBurst && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Heart
            size={72}
            fill="#e53935"
            color="#e53935"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}
          />
        </div>
      )}

      <span
        style={{
          position: 'absolute',
          top: 70,
          left: 16,
          zIndex: 20,
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 7,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(0,0,0,0.4)',
          color: 'rgba(245,236,215,0.65)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {activeIdx + 1} / {total}
      </span>

      {moment && (
        <MomentActions
          commentCount={comments.length}
          eventSlug={moment.event_slug}
          attendeeCount={eventMeta?.attending ?? 0}
          price={eventMeta?.price ?? null}
          onComments={() => setShowComments((v) => !v)}
        />
      )}

      {/* Info sits above chapters when chapters exist */}
      {moment && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 68,
            bottom: hasChapters ? 168 : 0,
            zIndex: 11,
            pointerEvents: 'none',
          }}
        >
          <MomentInfo
            moment={moment}
            photos={hasChapters ? [] : photos}
            onPhotoClick={setLightbox}
            onShare={handleShare}
            venue={eventMeta?.venue}
            dateLabel={eventMeta?.dateLabel}
          />
        </div>
      )}

      {moment && hasChapters && (
        <MomentChapters
          chapters={chapters}
          currentSeconds={currentSeconds}
          durationSeconds={durationSeconds}
          youtubeId={moment.youtube_id}
          onSeek={handleSeek}
        />
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
    </div>
  );
}
