'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Volume2, VolumeX } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface CustomPlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface CustomPlayerProps {
  youtubeId: string;
  title: string;
  onReady?: () => void;
  onDoubleTap?: () => void;
  onTimeUpdate?: (current: number, duration: number) => void;
  /** Seek here once player is ready (e.g. ?t=120) */
  initialSeekSeconds?: number | null;
}

const CustomPlayer = forwardRef<CustomPlayerHandle, CustomPlayerProps>(
  function CustomPlayer(
    {
      youtubeId,
      title,
      onReady,
      onDoubleTap,
      onTimeUpdate,
      initialSeekSeconds,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [muted, setMuted] = useState(true);
    const [useFallback, setUseFallback] = useState(false);

    const coverWrap: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(1.28)',
      width: 'max(100%, 177.78vh)',
      height: 'max(100%, 56.25vw)',
    };

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        const p = playerRef.current;
        if (!p || typeof p.seekTo !== 'function') return;
        try {
          p.seekTo(seconds, true);
          p.playVideo();
        } catch {
          /* ignore */
        }
      },
      getCurrentTime() {
        try {
          return playerRef.current?.getCurrentTime?.() ?? 0;
        } catch {
          return 0;
        }
      },
      getDuration() {
        try {
          return playerRef.current?.getDuration?.() ?? 0;
        } catch {
          return 0;
        }
      },
    }));

    useEffect(() => {
      let destroyed = false;
      let failTimer: ReturnType<typeof setTimeout> | null = null;
      let progressTimer: ReturnType<typeof setInterval> | null = null;

      function destroyPlayer() {
        if (progressTimer) clearInterval(progressTimer);
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
        }
      }

      function startProgress() {
        if (progressTimer) clearInterval(progressTimer);
        progressTimer = setInterval(() => {
          const p = playerRef.current;
          if (!p || typeof p.getDuration !== 'function') return;
          try {
            const d = p.getDuration() || 0;
            const t = p.getCurrentTime() || 0;
            onTimeUpdateRef.current?.(t, d);
          } catch {
            /* ignore */
          }
        }, 250);
      }

      function initPlayer() {
        if (!containerRef.current || destroyed || !window.YT?.Player) return;
        destroyPlayer();
        setPlaying(false);
        setReady(false);
        setMuted(true);

        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://akwabalive.vercel.app';

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
              cc_load_policy: 0,
              fs: 0,
              disablekb: 1,
              origin,
              start:
                initialSeekSeconds && initialSeekSeconds > 0
                  ? Math.floor(initialSeekSeconds)
                  : undefined,
            },
            events: {
              onReady: (e: any) => {
                if (destroyed) return;
                setReady(true);
                try {
                  e.target.unMute();
                  e.target.setVolume(100);
                  if (initialSeekSeconds && initialSeekSeconds > 0) {
                    e.target.seekTo(initialSeekSeconds, true);
                  }
                  e.target.playVideo();
                  setMuted(false);
                } catch {
                  try {
                    e.target.mute();
                    e.target.playVideo();
                    setMuted(true);
                  } catch {
                    /* ignore */
                  }
                }
                startProgress();
                onReady?.();
              },
              onStateChange: (e: any) => {
                if (destroyed) return;
                setPlaying(e.data === 1);
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
        if (tapTimer.current) clearTimeout(tapTimer.current);
        destroyPlayer();
      };
    }, [youtubeId, onReady, initialSeekSeconds]);

    function unmuteAndPlay() {
      if (!playerRef.current) return;
      try {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
        playerRef.current.playVideo();
        setMuted(false);
      } catch {
        /* ignore */
      }
    }

    function togglePlay() {
      if (useFallback || !playerRef.current) return;
      try {
        if (muted) {
          unmuteAndPlay();
          return;
        }
        if (playing) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      } catch {
        /* ignore */
      }
    }

    function toggleMute(e: React.MouseEvent) {
      e.stopPropagation();
      if (!playerRef.current) return;
      try {
        if (muted) unmuteAndPlay();
        else {
          playerRef.current.mute();
          setMuted(true);
        }
      } catch {
        /* ignore */
      }
    }

    function handleTap() {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
        onDoubleTap?.();
        return;
      }
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        togglePlay();
      }, 260);
    }

    const chrome = (
      <>
        <div
          onClick={handleTap}
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

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={{
            position: 'absolute',
            right: 14,
            top: 72,
            zIndex: 8,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
            color: '#FFFEF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </>
    );

    if (useFallback) {
      const start =
        initialSeekSeconds && initialSeekSeconds > 0
          ? `&start=${Math.floor(initialSeekSeconds)}`
          : '';
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          <div style={coverWrap}>
            <iframe
              title={title}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&playsinline=1&rel=0&modestbranding=1&controls=0${start}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
          {chrome}
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <div style={coverWrap}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {chrome}

        {!ready && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 7, background: '#000' }}>
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
            />
          </div>
        )}
      </div>
    );
  },
);

export default CustomPlayer;
