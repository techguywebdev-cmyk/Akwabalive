'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Check, X } from 'lucide-react';
import type { Comment } from '@/components/moments/types';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { threadComments, commenterName } from '@/lib/comments';
import { T, FONT, GRAD } from '@/lib/thiscene';

const ago = (iso: string) => {
  const s = Math.max(1, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const action: React.CSSProperties = { padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 600, color: T.text3 };

/**
 * The comments panel on a feed card: rises from the bottom over the details, stopping just below the
 * video/flyer, so people talk without leaving the feed. The thread is the clip's own (the same one as
 * on the Moments page) or, for events with no clips yet, the event's chat.
 * Reply to anyone, edit or delete your own; replies to you are marked.
 */
export default function FeedComments({
  height, title, comments, onSend, onEdit, onDelete, onClose, momentHref,
}: {
  height: number;
  title: string;
  comments: Comment[];
  onSend: (userId: string, text: string, profile?: Comment['profiles'], parentId?: string | null) => Promise<void> | void;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  /** Where the full thread lives (the Moments page), when it's a clip's thread */
  momentHref?: string;
}) {
  const { user, profile } = useAuth();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => threadComments(comments), [comments]);

  // The keyboard floats over the page: lift the panel above it and keep it no taller than what's left
  const [kb, setKb] = useState(0);
  const [room, setRoom] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => { setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop)); setRoom(vv.height); };
    on();
    vv.addEventListener('resize', on); vv.addEventListener('scroll', on);
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
  }, []);
  // The feed stays put while the panel is open
  useEffect(() => {
    const sc = panel.current?.closest('[data-feed-scroller]') as HTMLElement | null;
    if (!sc) return;
    const prev = sc.style.overflowY;
    sc.style.overflowY = 'hidden';
    return () => { sc.style.overflowY = prev; };
  }, []);

  // New top-level comments land at the bottom; follow them (not when a reply lands mid-thread)
  const lastId = comments[comments.length - 1]?.id;
  useEffect(() => {
    const last = comments[comments.length - 1];
    if (last && !last.parent_id) list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startReply = (c: Comment) => { setEditing(null); setReplyTo(c); setText(''); input.current?.focus(); };
  const startEdit = (c: Comment) => { setReplyTo(null); setEditing(c); setText(c.content); input.current?.focus(); };
  const cancel = () => { setReplyTo(null); setEditing(null); setText(''); };

  const send = () => {
    if (!user || !text.trim()) return;
    const t = text;
    setText('');
    if (editing) { onEdit?.(editing.id, t); setEditing(null); return; }
    onSend(user.id, t, profile ? { username: profile.username, full_name: profile.full_name ?? null, avatar_url: profile.avatar_url ?? null } : undefined, replyTo?.id ?? null);
    setReplyTo(null);
  };

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label={`Comments on ${title}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', zIndex: 6, left: 0, right: 0, bottom: kb, height: room ? Math.min(height, room - 90) : height, transition: 'bottom 120ms ease',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(14,30,22,0.94) 0%, rgba(9,18,13,0.97) 100%)',
        backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderRadius: '22px 22px 0 0', boxShadow: '0 -20px 50px rgba(0,0,0,0.45)',
        animation: 'fcUp 260ms cubic-bezier(0.22,1,0.36,1)',
        paddingBottom: kb ? 0 : 'env(safe-area-inset-bottom, 0px)',
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
        {rows.length === 0 ? (
          <p style={{ margin: '18px 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>No comments yet. Start it off.</p>
        ) : rows.map(({ c, reply, to }) => {
          const mine = !!user && user.id === c.user_id;
          const toMe = reply && !!user && to?.user_id === user.id && !mine;
          const pending = c.id.startsWith('temp-');
          return (
            <div key={c.id} style={{ display: 'flex', gap: 10, padding: reply ? '6px 0 6px 40px' : '9px 0' }}>
              <span style={{ width: reply ? 24 : 30, height: reply ? 24 : 30, borderRadius: reply ? 8 : 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(123,227,168,0.16)', color: T.mintText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: reply ? 11 : 13, fontWeight: 800 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : commenterName(c).charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.text2 }}>
                  {c.profiles?.username ? <Link href={`/u/${c.profiles.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>{commenterName(c)}</Link> : commenterName(c)}
                  {toMe && <span style={{ padding: '1px 6px', borderRadius: 5, background: 'rgba(123,227,168,0.16)', color: T.mintText, fontSize: 11, fontWeight: 700 }}>replied to you</span>}
                  <span style={{ fontWeight: 500, color: T.text3 }}>· {pending ? 'sending' : ago(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
                </span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 1.4, color: T.white, wordBreak: 'break-word' }}>
                  {reply && to && to.user_id !== c.user_id && <span style={{ color: T.mintText, fontWeight: 600 }}>@{to.profiles?.username || commenterName(to)} </span>}
                  {c.content}
                </span>
                {!pending && user && (
                  <span style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <button type="button" onClick={() => startReply(c)} style={action}>Reply</button>
                    {mine && onEdit && <button type="button" onClick={() => startEdit(c)} style={action}>Edit</button>}
                    {mine && onDelete && <button type="button" onClick={() => { if (window.confirm(c.parent_id ? 'Delete this reply?' : 'Delete this comment and its replies?')) onDelete(c.id); }} style={action}>Delete</button>}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '6px 14px 12px' }}>
        {user ? (
          <>
            {(replyTo || editing) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 8px', fontFamily: FONT.sans, fontSize: 12.5, color: T.text2 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editing ? 'Editing your comment' : <>Replying to <b style={{ color: T.mintText, fontWeight: 700 }}>@{replyTo!.profiles?.username || commenterName(replyTo)}</b></>}
                </span>
                <button type="button" onClick={cancel} style={action}>Cancel</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 6px 0 16px', borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') cancel(); }}
                placeholder={editing ? 'Edit your comment…' : replyTo ? `Reply to ${commenterName(replyTo)}…` : 'Add a comment…'}
                maxLength={500}
                style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', color: T.white, fontFamily: FONT.sans, fontSize: 15 }}
              />
              <button type="button" onClick={send} disabled={!text.trim()} aria-label={editing ? 'Save' : 'Send'} style={{ width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer', background: text.trim() ? GRAD.mint : 'rgba(255,255,255,0.08)', color: text.trim() ? T.onMint : T.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {editing ? <Check size={18} strokeWidth={2.4} /> : <ArrowUp size={18} strokeWidth={2.4} />}
              </button>
            </div>
          </>
        ) : (
          <Link href="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 999, background: 'rgba(255,255,255,0.07)', color: T.text, fontFamily: FONT.sans, fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}>
            Sign in to comment
          </Link>
        )}
      </div>
    </div>
  );
}
