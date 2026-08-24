'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, Send, X } from 'lucide-react';
import type { Comment, Moment } from './types';
import { C } from './types';

interface CommentsSheetProps {
  moment: Moment;
  comments: Comment[];
  onClose: () => void;
  onSend: (text: string) => void;
  onGift: (c: Comment) => void;
  user: { id: string } | null;
  profile: { username?: string | null } | null;
}

export default function CommentsSheet({
  moment,
  comments,
  onClose,
  onSend,
  onGift,
  user,
  profile,
}: CommentsSheetProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      80,
    );
    return () => window.clearTimeout(t);
  }, [comments.length]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: '38%',
        background: C.glass,
        backdropFilter: 'blur(36px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(36px) saturate(1.8)',
        borderTop: `1px solid ${C.glassBd}`,
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 10,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: C.glassBd,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 20px 12px',
          borderBottom: `1px solid ${C.glassBd}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 15,
              fontWeight: 600,
              color: C.cream,
            }}
          >
            Comments
          </span>
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 13,
              color: C.c3,
            }}
          >
            {comments.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: C.greenL,
                boxShadow: `0 0 6px ${C.greenL}`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 7.5,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: C.greenL,
              }}
            >
              Live
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comments"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${C.glassBd}`,
              color: C.c3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {comments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 14,
                color: C.c3,
              }}
            >
              No comments yet. Be first!
            </p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: C.gold,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-syne,sans-serif)',
                fontSize: 13,
                fontWeight: 700,
                color: '#0D0B08',
                overflow: 'hidden',
              }}
            >
              {c.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.profiles.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (c.profiles?.username?.[0] ?? 'U').toUpperCase()
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '9px 13px',
                  border: `1px solid ${C.glassBd}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-inter,sans-serif)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.gold,
                    }}
                  >
                    @{c.profiles?.username ?? 'user'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter,sans-serif)',
                      fontSize: 11,
                      color: C.c3,
                    }}
                  >
                    {new Date(c.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-inter,sans-serif)',
                    fontSize: 14,
                    color: C.cream,
                    lineHeight: 1.45,
                  }}
                >
                  {c.content}
                </p>
              </div>
              {user && c.user_id !== user.id && (
                <button
                  onClick={() => onGift(c)}
                  style={{
                    marginTop: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-dm-mono,monospace)',
                    fontSize: 8,
                    letterSpacing: '1px',
                    color: C.c3,
                    padding: 0,
                  }}
                >
                  <Gift size={10} style={{ color: C.gold }} /> Gift ticket
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '10px 14px 20px',
          borderTop: `1px solid ${C.glassBd}`,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {user ? (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: C.gold,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-syne,sans-serif)',
                fontSize: 12,
                fontWeight: 700,
                color: '#0D0B08',
              }}
            >
              {(profile?.username?.[0] ?? 'U').toUpperCase()}
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${C.glassBd}`,
                borderRadius: 24,
                padding: '0 6px 0 14px',
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && text.trim()) {
                    onSend(text.trim());
                    setText('');
                  }
                }}
                placeholder="Add a comment…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-inter,sans-serif)',
                  fontSize: 14,
                  color: C.cream,
                  padding: '10px 0',
                }}
              />
              <button
                onClick={() => {
                  if (text.trim()) {
                    onSend(text.trim());
                    setText('');
                  }
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: text.trim() ? C.gold : 'transparent',
                  border: 'none',
                  cursor: text.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 200ms',
                }}
              >
                <Send
                  size={15}
                  style={{ color: text.trim() ? '#0D0B08' : C.c3 }}
                />
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/auth"
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 9,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: C.gold,
              background: C.goldDim,
              border: '1px solid rgba(200,146,42,0.3)',
              borderRadius: 24,
              padding: '12px',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  );
}
