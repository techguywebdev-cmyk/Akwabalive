'use client';

import type { MomentChapter } from './types';
import { C, formatTime, activeChapterIndex } from './types';

interface MomentChaptersProps {
  chapters: MomentChapter[];
  currentSeconds: number;
  durationSeconds: number;
  youtubeId?: string | null;
  onSeek: (seconds: number) => void;
}

function chapterThumb(chapter: MomentChapter, youtubeId?: string | null) {
  if (chapter.thumbUrl) return chapter.thumbUrl;
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  }
  return null;
}

export default function MomentChapters({
  chapters,
  currentSeconds,
  youtubeId,
  onSeek,
}: MomentChaptersProps) {
  if (!chapters.length) return null;

  const active = activeChapterIndex(chapters, currentSeconds);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 14,
        padding: '12px 0 calc(10px + env(safe-area-inset-bottom))',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 70%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 8,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          padding: '0 14px 10px',
          margin: 0,
        }}
      >
        Moment Chapters
      </p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          padding: '0 14px 8px',
          scrollbarWidth: 'none',
          pointerEvents: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {chapters.map((ch, i) => {
          const isActive = i === active;
          const thumb = chapterThumb(ch, youtubeId);
          return (
            <button
              key={`${ch.label}-${ch.startSeconds}`}
              type="button"
              onClick={() => onSeek(ch.startSeconds)}
              style={{
                flexShrink: 0,
                width: 96,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 62,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: isActive
                    ? `1.5px solid ${C.gold}`
                    : '1px solid rgba(255,255,255,0.14)',
                  boxShadow: isActive
                    ? '0 0 0 2px rgba(200,146,42,0.28), 0 8px 24px rgba(0,0,0,0.55), 0 0 20px rgba(200,146,42,0.2)'
                    : '0 6px 18px rgba(0,0,0,0.4)',
                  position: 'relative',
                  background: '#1a1610',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 180ms ease, box-shadow 180ms ease',
                }}
              >
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: isActive ? 1 : 0.8,
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isActive
                      ? 'rgba(0,0,0,0.15)'
                      : 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 10,
                      lineHeight: 1,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    ▶
                  </span>
                </div>
              </div>
              <p
                style={{
                  margin: '7px 0 0',
                  fontFamily: 'var(--font-dm-mono,monospace)',
                  fontSize: 9,
                  color: isActive ? C.gold : 'rgba(255,250,240,0.5)',
                  letterSpacing: '0.3px',
                }}
              >
                {formatTime(ch.startSeconds)}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontFamily: 'var(--font-inter,sans-serif)',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#FFFEF8' : 'rgba(255,250,240,0.72)',
                  lineHeight: 1.2,
                  maxWidth: 96,
                }}
              >
                {ch.label}
              </p>
            </button>
          );
        })}
      </div>

      <p
        style={{
          textAlign: 'center',
          margin: '6px 0 0',
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 8,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'rgba(255,250,240,0.32)',
        }}
      >
        ↑ Swipe up for next moment
      </p>
    </div>
  );
}
