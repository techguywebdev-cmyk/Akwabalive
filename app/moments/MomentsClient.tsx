'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import CustomPlayer from '@/components/moments/CustomPlayer';
import CommentsSheet from '@/components/moments/CommentsSheet';
import GiftModal from '@/components/moments/GiftModal';
import MomentActions from '@/components/moments/MomentActions';
import MomentInfo from '@/components/moments/MomentInfo';
import { C, EVENT_PHOTOS } from '@/components/moments/types';
import type { Comment } from '@/components/moments/types';
import { useMoments } from '@/hooks/useMoments';
import { useMomentComments } from '@/hooks/useMomentComments';

export default function MomentsClient() {
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

  const [showComments, setShowComments] = useState(false);
  const [giftTarget, setGiftTarget] = useState<Comment | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);

  const touchY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 2800);
  }, []);

  useEffect(() => {
    bumpChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [activeIdx, bumpChrome]);

  useEffect(() => {
    if (!moment?.id) return;
    window.history.replaceState(null, '', `/moments?id=${moment.id}`);
  }, [moment?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showComments || lightbox) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
        setShowComments(false);
        bumpChrome();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
        setShowComments(false);
        bumpChrome();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, showComments, lightbox, bumpChrome]);

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

  function handleTouchStart(e: React.TouchEvent) {
    touchY.current = e.touches[0].clientY;
    bumpChrome();
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
    bumpChrome();
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

  const photos = EVENT_PHOTOS[moment?.event_slug ?? ''] ?? EVENT_PHOTOS.default;

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
      {/* FULL-SCREEN VIDEO */}
      <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
        {moment && <CustomPlayer youtubeId={moment.youtube_id} title={moment.title} />}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 22%, transparent 42%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* HEADER — hamburger + logo + counter. No Back, no Featured */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          paddingTop: 'env(safe-area-inset-top)',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
          zIndex: 20,
          opacity: chromeVisible ? 1 : 0,
          transform: chromeVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'opacity 280ms ease, transform 280ms ease',
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => router.push('/')}
          aria-label="Menu"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span style={{ width: 16, height: 1.5, background: '#F5ECD7', borderRadius: 1 }} />
          <span style={{ width: 16, height: 1.5, background: '#F5ECD7', borderRadius: 1 }} />
          <span style={{ width: 12, height: 1.5, background: '#F5ECD7', borderRadius: 1 }} />
        </button>

        <span
          style={{
            fontFamily: 'var(--font-syne,sans-serif)',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#F5ECD7',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}
        >
          AK<span style={{ color: C.gold }}>W</span>AABA
        </span>

        <span
          style={{
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
            minWidth: 40,
            textAlign: 'center',
          }}
        >
          {activeIdx + 1} / {total}
        </span>
      </div>

      {/* RIGHT EVENT PANEL — Going / Edition / Chat / Tickets */}
      {moment && (
        <MomentActions
          commentCount={comments.length}
          eventSlug={moment.event_slug}
          year={moment.year}
          attendeeCount={0}
          onComments={() => {
            bumpChrome();
            setShowComments((v) => !v);
          }}
        />
      )}

      {/* BOTTOM INFO + PHOTOS */}
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

      {lightbox && (
        <Lightbox
          photos={photos}
          current={lightbox}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
