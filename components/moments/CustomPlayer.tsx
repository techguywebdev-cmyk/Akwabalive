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
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
            origin,
          },
          events: {
            onReady: (e: any) => {
              if (destroyed) return;
              setReady(true);
              try {
                e.target.mute();
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
      else {
        try {
          playerRef.current.unMute();
        } catch {
          /* ignore */
        }
        playerRef.current.playVideo();
      }
    } catch {
      /* ignore */
    }
  }

  const coverWrap: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    /* Cover: fill height on portrait, fill width on landscape */
    width: 'max(100%, 177.78vh)',
    height: 'max(100%, 56.25vw)',
  };

  if (useFallback) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1, overflow: 'hidden' }}>
        <div style={coverWrap}>
          <iframe
            title={title}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&controls=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 1, overflow: 'hidden' }}>
      <div style={coverWrap}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

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
