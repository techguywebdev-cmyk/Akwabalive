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
  durationSeconds,
  youtubeId,
  onSeek,
}: MomentChaptersProps) {
  if (!chapters.length) return null;

  const active = activeChapterIndex(chapters, currentSeconds);
  const progress =
    durationSeconds > 0 ? Math.min(1, Math.max(0, currentSeconds / durationSeconds)) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 14,
        padding: '0 0 calc(8px + env(safe-area-inset-bottom))',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      {/* Time + progress */}
      <div
        style={{
          padding: '0 14px 10px',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontFamily: 'var(--font-dm-mono,monospace)',
            fontSize: 10,
            letterSpacing: '0.5px',
            color: 'rgba(255,250,240,0.7)',
          }}
        >
          <span>
            {formatTime(currentSeconds)} / {formatTime(durationSeconds)}
          </span>
        </div>
        <div
          onClick={(e) => {
            if (durationSeconds <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * durationSeconds);
          }}
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progress * 100}%`,
              background: C.gold,
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 8,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: C.gold,
          padding: '0 14px 8px',
          margin: 0,
        }}
      >
        Moment Chapters
      </p>

      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '0 14px 6px',
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
                width: 88,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 56,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: isActive
                    ? `1.5px solid ${C.gold}`
                    : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: isActive ? `0 0 0 1px rgba(200,146,42,0.35)` : 'none',
                  position: 'relative',
                  background: '#1a1610',
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
                      opacity: isActive ? 1 : 0.75,
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 10,
                      lineHeight: 1,
                    }}
                  >
                    ▶
                  </span>
                </div>
              </div>
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: 'var(--font-dm-mono,monospace)',
                  fontSize: 9,
                  color: isActive ? C.gold : 'rgba(255,250,240,0.55)',
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
                  color: isActive ? '#FFFEF8' : 'rgba(255,250,240,0.75)',
                  lineHeight: 1.2,
                  maxWidth: 88,
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
          margin: '4px 0 0',
          fontFamily: 'var(--font-dm-mono,monospace)',
          fontSize: 8,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'rgba(255,250,240,0.35)',
        }}
      >
        ↑ Swipe up for next moment
      </p>
    </div>
  );
}
