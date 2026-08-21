'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface CustomPlayerProps {
  youtubeId: string;
  title: string;
  onReady?: () => void;
}

/**
 * Custom YouTube player that hides native chrome.
 * - Dynamic origin (works on localhost + production)
 * - Graceful fallback iframe if API fails
 * - Thumbnail until ready
 */
export default function CustomPlayer({ youtubeId, title, onReady }: CustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let destroyed = false;
    let failTimer: ReturnType<typeof setTimeout> | null = null;

    function destroyPlayer() {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
    }

    function initPlayer() {
      if (!containerRef.current || destroyed || !window.YT?.Player) return;
      destroyPlayer();
      setPlaying(false);
      setReady(false);

      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://akwabalive.vercel.app';

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
            showinfo: 0,
            origin,
          },
          events: {
            onReady: (e: any) => {
              if (destroyed) return;
              setReady(true);
              try {
                e.target.playVideo();
              } catch {
                /* autoplay may be blocked */
              }
              onReady?.();
            },
            onStateChange: (e: any) => {
              if (!destroyed) setPlaying(e.data === 1);
            },
            onError: () => {
              if (!destroyed) setUseFallback(true);
            },
          },
        });
      } catch {
        if (!destroyed) setUseFallback(true);
      }
    }

    setUseFallback(false);

    if (window.YT?.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script');
        s.id = 'yt-api-script';
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => {
          if (!destroyed) setUseFallback(true);
        };
        document.head.appendChild(s);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (!destroyed) initPlayer();
      };
      // Fallback if API never loads
      failTimer = setTimeout(() => {
        if (!destroyed && !playerRef.current) setUseFallback(true);
      }, 8000);
    }

    return () => {
      destroyed = true;
      if (failTimer) clearTimeout(failTimer);
      destroyPlayer();
    };
  }, [youtubeId, onReady]);

  function togglePlay() {
    if (useFallback) return;
    if (!playerRef.current) return;
    try {
      if (playing) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    } catch {
      /* ignore */
    }
  }

  if (useFallback) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1 }}>
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1 }}>
      {/* Oversized container clips YouTube chrome */}
      <div
        style={{
          position: 'absolute',
          top: '-52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(177.78vh)',
          minWidth: '100%',
          height: 'calc(100% + 52px)',
          overflow: 'hidden',
        }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Tap overlay — play/pause, blocks native clicks */}
      <div
        onClick={togglePlay}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            togglePlay();
          }
        }}
        aria-label={playing ? 'Pause video' : 'Play video'}
        style={{ position: 'absolute', inset: 0, zIndex: 6, cursor: 'pointer' }}
      />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 7, background: '#000' }}>
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: '#000',
          zIndex: 6,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: '#000',
          zIndex: 6,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
