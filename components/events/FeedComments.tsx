'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, X } from 'lucide-react';
import type { Comment } from '@/components/moments/types';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GRAD } from '@/lib/thiscene';

const ago = (iso: string) => {
  const s = Math.max(1, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const nameOf = (c: Comment) => c.profiles?.full_name || c.profiles?.username || 'Someone';

/**
 * The comments panel on a feed card: rises from the bottom over the details, stopping just below the
 * video/flyer, so people talk without leaving the feed. The thread is the clip's own (the same one as
 * on the Moments page) or, for events with no clips yet, the event's chat.
 */
export default function FeedComments({
  height, title, comments, onSend, onClose, momentHref,
}: {
  height: number;
  title: string;
  comments: Comment[];
  onSend: (userId: string, text: string) => Promise<void> | void;
  onClose: () => void;
  /** Where the full thread lives (the Moments page), when it's a clip's thread */
  momentHref?: string;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [comments.length]);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try { await onSend(user.id, text); setText(''); } finally { setSending(false); }
  };

  return (
    <div
      role="dialog"
      aria-label={`Comments on ${title}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', zIndex: 6, left: 0, right: 0, bottom: 0, height,
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(14,30,22,0.94) 0%, rgba(9,18,13,0.97) 100%)',
        backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderRadius: '22px 22px 0 0', boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
        animation: 'fcUp 260ms cubic-bezier(0.22,1,0.36,1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <style>{'@keyframes fcUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px 20px' }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.display, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: T.white }}>
          Comments{comments.length ? <span style={{ color: T.text3, fontWeight: 600 }}> · {comments.length}</span> : null}
        </span>
        {momentHref && <Link href={momentHref} style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.mintText, textDecoration: 'none' }}>On Moments</Link>}
        <button type="button" onClick={onClose} aria-label="Close comments" style={{ width: 34, height: 34, borderRadius: 11, border: 'none', background: 'rgba(255,255,255,0.07)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={17} />
        </button>
      </div>

      <div ref={list} className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 8px', overscrollBehavior: 'contain' }}>
        {comments.length === 0 ? (
          <p style={{ margin: '18px 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>No comments yet. Start it off.</p>
        ) : comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(123,227,168,0.16)', color: T.mintText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 13, fontWeight: 800 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : nameOf(c).charAt(0).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.text2 }}>{nameOf(c)} <span style={{ fontWeight: 500, color: T.text3 }}>· {ago(c.created_at)}</span></span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.4, color: T.white, wordBreak: 'break-word' }}>{c.content}</span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 14px 12px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 6px 0 16px', borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Add a comment…"
              maxLength={500}
              style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 15 }}
            />
            <button type="button" onClick={send} disabled={!text.trim() || sending} aria-label="Send" style={{ width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer', background: text.trim() ? GRAD.mint : 'rgba(255,255,255,0.08)', color: text.trim() ? T.onMint : T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <Link href="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: T.text, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}>
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  );
}
