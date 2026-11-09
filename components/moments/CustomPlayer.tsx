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
  play: () => void;
  /** Toggle sound (counts as the user gesture that unlocks audio) */
  toggleMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface CustomPlayerProps {
  youtubeId: string;
  title: string;
  onReady?: () => void;
  onDoubleTap?: () => void;
  onTimeUpdate?: (current: number, duration: number) => void;
  initialSeekSeconds?: number | null;
  /** Called when the clip finishes. When set, the clip does not loop. */
  onEnded?: () => void;
  /** Reports mute state so the page can draw its own sound button */
  onMuteChange?: (muted: boolean) => void;
  /** Hide the built-in sound button (the page renders one) */
  hideMuteButton?: boolean;
  /** How the 16:9 video fills a tall screen */
  fit?: 'fill' | 'contain';
  /**
   * Only the slide on screen plays. Others load in the background (paused, muted) so they
   * start instantly when scrolled to. Defaults to true.
   */
  active?: boolean;
}

/** Survives swipe — after the user unmutes once, later clips keep sound (swipe is a gesture). */
let soundUnlocked = false;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function loadYTApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject();
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script');
      s.id = 'yt-api-script';
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => reject(new Error('yt api'));
      document.head.appendChild(s);
    }
  });
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
      onEnded,
      onMuteChange,
      hideMuteButton = false,
      fit = 'fill',
      active = true,
    },
    ref,
  ) {
    const activeRef = useRef(active);
    activeRef.current = active;
    const onEndedRef = useRef(onEnded);
    onEndedRef.current = onEnded;
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const youtubeIdRef = useRef(youtubeId);
    const wantPlayRef = useRef(true);
    const userPausedRef = useRef(false);
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const playKick = useRef<ReturnType<typeof setInterval> | null>(null);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onReadyRef = useRef(onReady);
    const initialSeekRef = useRef(initialSeekSeconds);
    onTimeUpdateRef.current = onTimeUpdate;
    onReadyRef.current = onReady;
    initialSeekRef.current = initialSeekSeconds;
    youtubeIdRef.current = youtubeId;

    const [playing, setPlaying] = useState(false);
    // Frames actually on screen: YouTube reports "playing" while its own grey loading card is still up,
    // so the poster stays until the clock has moved
    const [shown, setShown] = useState(false);
    // Paused: our own cover goes back over the video so YouTube's title bar and logo never show
    const [paused, setPaused] = useState(false);
    useEffect(() => {
      if (!playing || shown) return;
      const t = setInterval(() => {
        try { if ((playerRef.current?.getCurrentTime?.() ?? 0) > 2.2) setShown(true); } catch { /* ignore */ } // past YouTube's opening title
      }, 120);
      return () => clearInterval(t);
    }, [playing, shown]);
    const [muted, setMuted] = useState(true);
    useEffect(() => { onMuteChange?.(muted); }, [muted, onMuteChange]);

    const coverWrap: React.CSSProperties = fit === 'fill'
      ? {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.28)',
          width: 'max(100%, 177.78vh)',
          height: 'max(100%, 56.25vw)',
        }
      : {
          position: 'absolute',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          width: '100%',
          aspectRatio: '16 / 9',
        };

    function applySound(p: any) {
      if (!p) return;
      try {
        if (soundUnlocked && !isIOS()) {
          p.unMute();
          p.setVolume(100);
          setMuted(false);
        } else if (soundUnlocked && isIOS()) {
          /* iOS: unmute only inside a user gesture — play() is called from swipe/tap */
          p.unMute();
          p.setVolume(100);
          setMuted(false);
        } else {
          p.mute();
          setMuted(true);
        }
      } catch {
        try {
          p.mute();
          setMuted(true);
        } catch {
          /* ignore */
        }
      }
    }

    function kickPlay() {
      const p = playerRef.current;
      if (!p || userPausedRef.current || !activeRef.current) return;
      try {
        applySound(p);
        p.playVideo();
      } catch {
        /* ignore */
      }
    }

    function startProgress() {
      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = setInterval(() => {
        const p = playerRef.current;
        if (!p || typeof p.getDuration !== 'function') return;
        try {
          onTimeUpdateRef.current?.(p.getCurrentTime() || 0, p.getDuration() || 0);
        } catch {
          /* ignore */
        }
      }, 250);
    }

    function hardenIframe(p: any) {
      try {
        const iframe: HTMLIFrameElement | undefined = p.getIframe?.();
        if (!iframe) return;
        iframe.setAttribute('playsinline', '1');
        iframe.setAttribute('webkit-playsinline', '1');
        iframe.setAttribute(
          'allow',
          'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        );
        iframe.setAttribute('allowfullscreen', '0');
      } catch {
        /* ignore */
      }
    }

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        const p = playerRef.current;
        if (!p) return;
        try {
          userPausedRef.current = false;
          p.seekTo(seconds, true);
          kickPlay();
        } catch {
          /* ignore */
        }
      },
      play() {
        userPausedRef.current = false;
        kickPlay();
      },
      toggleMute() {
        toggleMuteInner();
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

    /* Create the player ONCE. Swap videos with loadVideoById — no remount lag. */
    useEffect(() => {
      let cancelled = false;

      async function boot() {
        try {
          await loadYTApi();
        } catch {
          return;
        }
        if (cancelled || !hostRef.current || playerRef.current) return;
        if (!window.YT?.Player) return;

        const origin = window.location.origin;
        const start =
          initialSeekRef.current && initialSeekRef.current > 0
            ? Math.floor(initialSeekRef.current)
            : 0;

        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId: youtubeIdRef.current,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
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
            start,
            ...(onEndedRef.current ? {} : { loop: 1, playlist: youtubeIdRef.current }),
          },
          events: {
            onReady: (e: any) => {
              if (cancelled) return;
              hardenIframe(e.target);
              e.target.mute();
              setMuted(true);
              if (start > 0) {
                try {
                  e.target.seekTo(start, true);
                } catch {
                  /* ignore */
                }
              }
              if (activeRef.current) kickPlay();
              else {
                // Warm up while hidden: play muted past YouTube's opening title (and its grey loading card), then hold
                // there, so when the slide comes on screen it starts straight away with real frames
                try {
                  e.target.playVideo();
                  const began = Date.now();
                  const hold = setInterval(() => {
                    if (cancelled || activeRef.current) { clearInterval(hold); return; }
                    let t = 0;
                    try { t = e.target.getCurrentTime?.() ?? 0; } catch { /* ignore */ }
                    if (t > 2.4 || Date.now() - began > 9000) {
                      clearInterval(hold);
                      try { e.target.pauseVideo(); } catch { /* ignore */ }
                    }
                  }, 150);
                } catch { /* ignore */ }
              }
              startProgress();
              onReadyRef.current?.();
              if (playKick.current) clearInterval(playKick.current);
              playKick.current = setInterval(() => {
                if (cancelled || userPausedRef.current) return;
                try {
                  const st = playerRef.current?.getPlayerState?.();
                  /* -1 unstarted, 2 paused, 5 cued */
                  if (st === -1 || st === 2 || st === 5 || st === 0) kickPlay();
                } catch {
                  /* ignore */
                }
              }, 400);
              setTimeout(() => {
                if (playKick.current) {
                  clearInterval(playKick.current);
                  playKick.current = null;
                }
              }, 4000);
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              const state = e.data;
              setPlaying(state === 1);
              setPaused(state === 2 && userPausedRef.current);
              if (state === 1) {
                userPausedRef.current = false;
              }
              /* ended → hand off to the page, or loop */
              if (state === 0 && onEndedRef.current) {
                userPausedRef.current = true;
                onEndedRef.current();
                return;
              }
              if (state === 0) {
                try {
                  e.target.seekTo(0, true);
                  e.target.playVideo();
                } catch {
                  /* ignore */
                }
              }
              /* iOS often lands on cued/paused instead of playing */
              if ((state === 2 || state === 5 || state === -1) && !userPausedRef.current && activeRef.current) {
                setTimeout(kickPlay, 50);
              }
            },
          },
        });
      }

      boot();

      function onVis() {
        if (document.visibilityState === 'visible' && !userPausedRef.current) {
          kickPlay();
        }
      }
      document.addEventListener('visibilitychange', onVis);

      return () => {
        cancelled = true;
        document.removeEventListener('visibilitychange', onVis);
        if (progressTimer.current) clearInterval(progressTimer.current);
        if (playKick.current) clearInterval(playKick.current);
        if (tapTimer.current) clearTimeout(tapTimer.current);
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {
            /* ignore */
          }
          playerRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Becoming the slide on screen: play (with sound if it was unlocked); leaving: pause */
    useEffect(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (active) { userPausedRef.current = false; kickPlay(); }
        else { p.pauseVideo(); p.mute(); }
      } catch { /* ignore */ }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    /* Swap clip without tearing down the iframe */
    useEffect(() => {
      const p = playerRef.current;
      userPausedRef.current = false;
      setPlaying(false);
      setShown(false);
      setPaused(false);
      if (!p || typeof p.loadVideoById !== 'function') return;
      try {
        p.mute();
        setMuted(!soundUnlocked);
        p.loadVideoById({
          videoId: youtubeId,
          startSeconds:
            initialSeekSeconds && initialSeekSeconds > 0
              ? Math.floor(initialSeekSeconds)
              : 0,
        });
        /* keep loop playlist in sync */
        try {
          p.setLoop?.(true);
        } catch {
          /* ignore */
        }
        kickPlay();
      } catch {
        kickPlay();
      }
    }, [youtubeId, initialSeekSeconds]);

    function unmuteAndPlay() {
      const p = playerRef.current;
      if (!p) return;
      soundUnlocked = true;
      userPausedRef.current = false;
      try {
        p.unMute();
        p.setVolume(100);
        p.playVideo();
        setMuted(false);
      } catch {
        /* ignore */
      }
    }

    function togglePlay() {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (muted) {
          unmuteAndPlay();
          return;
        }
        const st = p.getPlayerState?.();
        if (st === 1) {
          userPausedRef.current = true;
          p.pauseVideo();
        } else {
          userPausedRef.current = false;
          kickPlay();
        }
      } catch {
        /* ignore */
      }
    }

    function toggleMute(e: React.MouseEvent | React.TouchEvent) {
      e.stopPropagation();
      toggleMuteInner();
    }

    function toggleMuteInner() {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (muted) unmuteAndPlay();
        else {
          soundUnlocked = false;
          p.mute();
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
      }, 220);
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
          <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
        </div>

        <div
          onClick={handleTap}
          onTouchEnd={() => {
            /* iOS: treat the swipe/tap as a play gesture (no preventDefault — it kills scroll momentum) */
            if (!playing) {
              userPausedRef.current = false;
              kickPlay();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={playing ? 'Pause video' : 'Play video'}
          style={{ position: 'absolute', inset: 0, zIndex: 6, cursor: 'pointer' }}
        />

        {!hideMuteButton && <button
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
            border: 'none',
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
        </button>}

        {/* Our cover: a branded loading moment until real frames are on screen (and past YouTube's opening
            title), and again whenever it's paused, so YouTube's own title bar and logo never show */}
        {(!shown || paused) && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: '#000', pointerEvents: 'none', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: fit === 'fill' ? 'cover' : 'contain', filter: paused ? 'brightness(0.7)' : 'brightness(0.5) saturate(1.1)', transform: paused ? 'none' : 'scale(1.04)', transition: 'filter 300ms ease' }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('maxresdefault')) img.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
              }}
            />
            <style>{'@keyframes cpDot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}'}</style>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {paused ? (
                <span style={{ width: 58, height: 58, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,10,8,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#fff' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
                </span>
              ) : (
                /* Loading: three small dots, one after another */
                <span role="status" aria-label="Loading" style={{ display: 'flex', gap: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: '#7BE3A8', animation: `cpDot 1.2s ease-in-out ${i * 0.16}s infinite` }} />
                  ))}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    );
  },
);

export default CustomPlayer;
