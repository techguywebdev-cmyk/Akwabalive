'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Gift, MessageSquareText, Play, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase/types';
import type { Comment, Moment } from './types';
import { formatTime } from './types';
import { T, FONT, EASE, GRAD } from '@/lib/thiscene';
import { threadComments, commenterName } from '@/lib/comments';

interface Props {
  moment: Moment;
  comments: Comment[];
  user: User | null;
  profile: Profile | null;
  currentSeconds: number;
  wasThereIds: Set<string>;
  goingIds: Set<string>;
  /** e.g. "2026" — label for the "Going" badge and prompt */
  nextLabel: string | null;
  /** Gifting is possible only when the next edition sells tickets on TsaCoal */
  canGift: boolean;
  /** "r, g, b" — the video's colour, so the sheet carries the same glow as the slide */
  tint?: string;
  /** Used on event pages: quick prompts instead of the video ones, a "Going" badge, its own empty state */
  prompts?: string[];
  goingLabel?: string;
  emptyHint?: string;
  /** Render inside a fixed layer (event pages) instead of over a slide */
  fixed?: boolean;
  heading?: string;
  onClose: () => void;
  /** parentId when it's a reply */
  onSend: (text: string, parentId?: string | null) => void;
  /** Save an edit to your own comment */
  onEdit?: (c: Comment, text: string) => void;
  onSeek: (seconds: number) => void;
  onGift: (c: Comment) => void;
  /** Moderation: authors (and the admin) delete, everyone else reports */
  onDelete?: (c: Comment) => void;
  onReport?: (c: Comment) => void;
  isAdmin?: boolean;
}

const STAMP = /(\d{1,2}):([0-5]\d)/g;

/** Comment text with mm:ss timestamps as small chips that jump the video */
function CommentText({ text, onSeek }: { text: string; onSeek: (s: number) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of Array.from(text.matchAll(STAMP))) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i).replace(/▸\s*$/, ''));
    const secs = Number(m[1]) * 60 + Number(m[2]);
    parts.push(
      <button key={i} type="button" onClick={() => onSeek(secs)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', margin: '0 2px', borderRadius: 999, verticalAlign: 'middle',
        border: 'none', cursor: 'pointer', background: 'rgba(123,227,168,0.14)', color: T.mintText, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700,
      }}>
        <Play size={10} fill={T.mintText} /> {m[0]}
      </button>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function Avatar({ url, name, size = 34 }: { url?: string | null; name: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0, borderRadius: size / 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(150deg, #2C3631 0%, #151A17 100%)', color: '#D6FBE6', fontFamily: FONT.sans, fontSize: size * 0.38, fontWeight: 700,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name[0]?.toUpperCase()}
    </span>
  );
}

export default function CommentsSheet({
  moment, comments, user, profile, currentSeconds, goingIds, nextLabel, canGift, tint = '34, 96, 66',
  onClose, onSend, onEdit, onSeek, onGift, prompts, goingLabel, emptyHint, fixed, heading = 'Comments', onDelete, onReport, isAdmin = false,
}: Props) {
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<'top' | 'new'>('top');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The keyboard floats over the page: lift the sheet above it and fit it in what's left of the screen
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

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Threads: each comment followed by its replies
  const list = useMemo(() => threadComments(comments, order === 'new'), [comments, order]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (editing) { onEdit?.(editing, text); setEditing(null); setDraft(''); return; }
    onSend(text, replyTo?.id ?? null);
    setReplyTo(null);
    setDraft('');
  }

  function prompt(text: string, append = false) {
    setDraft((d) => (append ? `${d}${d && !d.endsWith(' ') ? ' ' : ''}${text}` : text));
    inputRef.current?.focus();
  }

  const year = moment.year ? String(moment.year) : null;
  const me = profile?.full_name || profile?.username || 'You';

  // Not a nested component: that would remount the input on every keystroke
  const sheet = (
    <>
      <button type="button" aria-label="Close comments" onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 40, border: 'none', cursor: 'pointer',
        background: 'rgba(0,0,0,0.45)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease',
      }} />
      <section aria-label="Comments" style={{
        position: 'absolute', left: 0, right: 0, bottom: kb, zIndex: 41, height: kb && room ? Math.min(room - 24, 680) : '74%', maxHeight: 680, maxWidth: 640, margin: '0 auto',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: '26px 26px 0 0', borderTop: '1px solid rgba(255,255,255,0.14)',
        // The video's colour at the top, settling into near-black
        background: `linear-gradient(180deg, rgba(${tint}, 0.42) 0%, rgba(${tint}, 0.16) 26%, rgba(11,13,12,0) 60%), #0B0D0C`,
        boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
        transform: shown ? 'none' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 0 20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>
              {heading} <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{comments.length || ''}</span>
            </h2>
            <p style={{ margin: '2px 0 0', fontFamily: FONT.sans, fontSize: 13, color: T.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {moment.event_name}{year ? ` · ${year}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            width: 38, height: 38, borderRadius: 19, flexShrink: 0, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.1)', color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </header>

        {comments.length > 1 && (
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', gap: 2, margin: '14px 20px 0', padding: 3, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
            {([['top', 'Top'], ['new', 'Newest']] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={order === k} onClick={() => setOrder(k)} style={{
                height: 30, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600,
                background: order === k ? 'rgba(255,255,255,0.16)' : 'transparent', color: order === k ? T.white : T.text2,
              }}>{label}</button>
            ))}
          </div>
        )}

        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 12px' }}>
          {list.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 20px' }}>
              <span style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', color: T.text2 }}>
                <MessageSquareText size={24} />
              </span>
              <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.white }}>No comments yet</p>
              <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>{emptyHint ?? 'Were you there? Start the conversation.'}</p>
            </div>
          )}
          {list.map(({ c, reply, to }) => {
            const name = c.profiles?.full_name || c.profiles?.username || 'Someone';
            const going = goingIds.has(c.user_id);
            const mine = user?.id === c.user_id;
            const toMe = reply && !!user && to?.user_id === user.id && !mine;
            const pending = c.id.startsWith('temp-');
            return (
              <article key={c.id} style={{ display: 'flex', gap: 12, padding: reply ? '8px 0 8px 46px' : '12px 0' }}>
                <Avatar url={c.profiles?.avatar_url} name={name} size={reply ? 26 : 34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    {c.profiles?.username
                      ? <Link href={`/u/${c.profiles.username}`} style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, color: T.white, textDecoration: 'none' }}>{name}</Link>
                      : <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 700, color: T.white }}>{name}</span>}
                    {going && (goingLabel || nextLabel) && (
                      <span style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(123,227,168,0.14)', color: T.mintText, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700 }}>{goingLabel ?? `Going ${nextLabel}`}</span>
                    )}
                    {toMe && <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(123,227,168,0.14)', color: T.mintText, fontFamily: FONT.sans, fontSize: 11, fontWeight: 700 }}>replied to you</span>}
                    <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{pending ? 'sending' : timeAgo(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.45, color: T.text, wordBreak: 'break-word' }}>
                    {reply && to && to.user_id !== c.user_id && <span style={{ color: T.mintText, fontWeight: 600 }}>@{to.profiles?.username || commenterName(to)} </span>}
                    <CommentText text={c.content} onSeek={onSeek} />
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {canGift && user && !mine && (
                    <button type="button" onClick={() => onGift(c)} style={{
                      marginTop: 4, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.mintText,
                    }}>
                      <Gift size={13} /> Gift a ticket
                    </button>
                  )}
                  {user && !pending && (
                    <button type="button" onClick={() => { setEditing(null); setReplyTo(c); inputRef.current?.focus(); }} style={miniBtn}>Reply</button>
                  )}
                  {user && mine && onEdit && !pending && (
                    <button type="button" onClick={() => { setReplyTo(null); setEditing(c); setDraft(c.content); inputRef.current?.focus(); }} style={miniBtn}>Edit</button>
                  )}
                  {user && (mine || isAdmin) && onDelete && !pending && (
                    <button type="button" onClick={() => { if (window.confirm('Delete this comment?')) onDelete(c); }} style={miniBtn}>Delete</button>
                  )}
                  {user && !mine && onReport && (
                    reported.has(c.id)
                      ? <span style={{ ...miniBtn, cursor: 'default' }}>Reported · thanks</span>
                      : <button type="button" onClick={() => { setReported((r) => new Set(r).add(c.id)); onReport(c); }} style={miniBtn}>Report</button>
                  )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div style={{ padding: kb ? '10px 14px 10px' : '10px 14px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(11,13,12,0.92)' }}>
          {user ? (
            <>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>
                {prompts ? prompts.map((p) => <PromptChip key={p} onClick={() => prompt(`${p} `)}>{p}</PromptChip>) : (
                  <>
                    <PromptChip onClick={() => prompt(`▸ ${formatTime(currentSeconds)} `, true)}><Play size={11} fill="currentColor" /> {formatTime(currentSeconds)}</PromptChip>
                    {nextLabel && <PromptChip onClick={() => prompt(`Who’s going in ${nextLabel}? `)}>Who’s going in {nextLabel}?</PromptChip>}
                    <PromptChip onClick={() => prompt('Best moment: ')}>Best moment</PromptChip>
                  </>
                )}
              </div>
              {(replyTo || editing) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {editing ? 'Editing your comment' : <>Replying to <b style={{ color: T.mintText, fontWeight: 700 }}>@{replyTo!.profiles?.username || commenterName(replyTo)}</b></>}
                  </span>
                  <button type="button" onClick={() => { setReplyTo(null); setEditing(null); setDraft(''); }} style={{ ...miniBtn, marginTop: 0 }}>Cancel</button>
                </div>
              )}
              <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar url={profile?.avatar_url} name={me} size={36} />
                <label style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: 46, borderRadius: 23, background: 'rgba(255,255,255,0.08)', border: 'none', padding: '0 5px 0 16px' }}>
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Add a comment</span>
                  <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={editing ? 'Edit your comment…' : replyTo ? `Reply to ${commenterName(replyTo)}…` : 'Add a comment…'} maxLength={500}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: T.white, fontFamily: FONT.sans, fontSize: 15 }} />
                  <button type="submit" aria-label="Post comment" disabled={!draft.trim()} style={{
                    width: 36, height: 36, borderRadius: 18, border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: draft.trim() ? 'pointer' : 'default', transition: 'background 200ms ease',
                    background: draft.trim() ? T.mint : 'rgba(255,255,255,0.08)', color: draft.trim() ? T.onMint : T.text3,
                  }}>
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </button>
                </label>
              </form>
            </>
          ) : (
            <Link href="/auth" style={{ height: 48, borderRadius: 999, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Sign in to comment
            </Link>
          )}
        </div>
      </section>
    </>
  );
  return fixed ? <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>{sheet}</div> : sheet;
}

const miniBtn: React.CSSProperties = { marginTop: 4, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: T.text3 };

function PromptChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(255,255,255,0.07)', border: 'none', color: T.text2, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600,
    }}>
      {children}
    </button>
  );
}
