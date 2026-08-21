'use client';

import { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import type { Comment, Moment } from './types';
import { C } from './types';

interface GiftModalProps {
  comment: Comment;
  moment: Moment;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function GiftModal({ comment, moment, onClose, onConfirm }: GiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      setDone(true);
      setTimeout(onClose, 1400);
    } catch (e: any) {
      setError(e?.message ?? 'Could not send gift. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.glass,
          backdropFilter: 'blur(32px)',
          border: `1px solid ${C.glassBd}`,
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 320,
          width: '88%',
        }}
      >
        {done ? (
          <>
            <h3
              style={{
                fontFamily: 'var(--font-cormorant,serif)',
                fontSize: 24,
                fontWeight: 300,
                color: C.cream,
                marginBottom: 10,
              }}
            >
              Gift sent!
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 13,
                color: C.c2,
                lineHeight: 1.65,
              }}
            >
              @{comment.profiles?.username} will receive a ticket for{' '}
              <strong style={{ color: C.cream }}>{moment.event_name}</strong>.
            </p>
          </>
        ) : (
          <>
            <h3
              style={{
                fontFamily: 'var(--font-cormorant,serif)',
                fontSize: 24,
                fontWeight: 300,
                color: C.cream,
                marginBottom: 10,
              }}
            >
              Gift a Ticket
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-inter,sans-serif)',
                fontSize: 13,
                color: C.c2,
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              Send a complimentary ticket for{' '}
              <strong style={{ color: C.cream }}>{moment.event_name}</strong> to{' '}
              <strong style={{ color: C.gold }}>@{comment.profiles?.username}</strong>. They’ll
              receive it in their account.
            </p>
            {error && (
              <p
                style={{
                  fontFamily: 'var(--font-inter,sans-serif)',
                  fontSize: 12,
                  color: C.red,
                  marginBottom: 12,
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: `1px solid ${C.glassBd}`,
                  color: C.c2,
                  padding: '12px',
                  borderRadius: 10,
                  fontFamily: 'var(--font-dm-mono,monospace)',
                  fontSize: 8,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  flex: 2,
                  background: C.gold,
                  border: 'none',
                  color: '#0D0B08',
                  padding: '12px',
                  borderRadius: 10,
                  fontFamily: 'var(--font-dm-mono,monospace)',
                  fontSize: 8,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Gift size={13} />
                )}
                {loading ? 'Sending…' : 'Send Gift'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
