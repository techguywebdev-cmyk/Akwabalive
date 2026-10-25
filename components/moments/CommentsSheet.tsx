'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, Send, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { C, G, R } from '@/lib/theme';
import type { Profile } from '@/lib/supabase/types';
import type { Comment, Moment } from './types';
import { formatTime } from './types';
import { mono, sans, serif } from './parts';

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
  /** Gifting is possible only when the next edition sells tickets on Akwaaba */
  canGift: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onSeek: (seconds: number) => void;
  onGift: (c: Comment) => void;
}

const STAMP = /(\d{1,2}):([0-5]\d)/g;

/** Renders comment text with mm:ss timestamps as buttons that jump the video. */
function CommentText({ text, onSeek }: { text: string; onSeek: (s: number) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of Array.from(text.matchAll(STAMP))) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i).replace(/▸\s*$/, ''));
    const secs = Number(m[1]) * 60 + Number(m[2]);
    parts.push(
      <button
        key={i}
        type="button"
        onClick={() => onSeek(secs)}
        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: mono, fontSize: 13, color: C.goldText }}
      >
        ▸ {m[0]}
      </button>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

const AVATAR_BG = [C.gold, C.green, '#8E1B24', '#3B3226', '#5A4A2A'];

export default function CommentsSheet({
  moment, comments, user, profile, currentSeconds, wasThereIds, goingIds, nextLabel, canGift,
  onClose, onSend, onSeek, onGift,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'there' | 'new'>('all');
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    if (filter === 'there') return comments.filter((c) => wasThereIds.has(c.user_id));
    if (filter === 'new') return [...comments].reverse();
    return comments;
  }, [comments, filter, wasThereIds]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  function prompt(text: string, append = false) {
    setDraft((d) => (append ? `${d}${d && !d.endsWith(' ') ? ' ' : ''}${text}` : text));
    inputRef.current?.focus();
  }

  const year = moment.year ? String(moment.year) : null;

  return (
    <>
      <button type="button" aria-label="Close comments" onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(8,6,4,0.35)', border: 'none', cursor: 'pointer' }} />
      <section
        aria-label="Comments"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41, height: '72%', maxHeight: 640,
          display: 'flex', flexDirection: 'column', margin: '0 auto', maxWidth: 640,
          ...G.sheet, border: `1px solid ${C.bd2}`, borderBottom: 'none', borderRadius: `${R.sheet}px ${R.sheet}px 0 0`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: C.bd2 }} />
        </div>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 10px 20px' }}>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, color: C.cream }}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </h2>
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.c3 }}>
              {moment.event_name}{year ? ` · ${year}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 44, height: 44, borderRadius: 22, ...G.raised, border: `1px solid ${C.bd}`, color: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </header>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', borderBottom: `1px solid ${C.bd}` }}>
          {([['all', 'Top'], ['new', 'Newest'], ['there', 'Was there']] as const).map(([k, label]) => {
            const on = filter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                aria-pressed={on}
                style={{
                  height: 36, padding: '0 14px', borderRadius: R.chip, cursor: 'pointer', fontFamily: sans, fontSize: 13, fontWeight: 600,
                  ...(on
                    ? { background: C.goldDim, color: C.goldText, border: `1px solid ${C.goldBd}` }
                    : { background: 'transparent', color: C.c2, border: `1px solid ${C.bd2}` }),
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {list.length === 0 && (
            <p style={{ fontFamily: sans, fontSize: 14, color: C.c3, textAlign: 'center', padding: '40px 10px' }}>
              {filter === 'there' ? 'Nobody who was there has commented yet.' : 'Be the first to say something.'}
            </p>
          )}
          {list.map((c, i) => {
            const name = c.profiles?.full_name || c.profiles?.username || 'Someone';
            const there = wasThereIds.has(c.user_id);
            const going = goingIds.has(c.user_id);
            const mine = user?.id === c.user_id;
            return (
              <article key={c.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: `1px solid ${C.bd}` }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 18, overflow: 'hidden', background: AVATAR_BG[i % AVATAR_BG.length], color: i % 5 === 0 ? C.onAccent : C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 13, fontWeight: 700 }}>
                  {c.profiles?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : name[0]?.toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {c.profiles?.username
                      ? <Link href={`/u/${c.profiles.username}`} style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.cream, textDecoration: 'none' }}>{name}</Link>
                      : <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.cream }}>{name}</span>}
                    {there && <Badge tone="gold">Was there</Badge>}
                    {going && nextLabel && <Badge tone="green">Going {nextLabel}</Badge>}
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.c3 }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.45, color: 'rgba(245,236,215,0.92)', wordBreak: 'break-word' }}>
                    <CommentText text={c.content} onSeek={onSeek} />
                  </p>
                  {canGift && user && !mine && (
                    <div>
                      <button
                        type="button"
                        onClick={() => onGift(c)}
                        style={{ height: 34, padding: 0, border: 'none', background: 'none', color: C.goldText, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 600 }}
                      >
                        <Gift size={14} /> Gift a ticket
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div style={{ padding: '10px 12px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${C.bd}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {user ? (
            <>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                <PromptChip onClick={() => prompt('I was there! ')}>I was there</PromptChip>
                {nextLabel && <PromptChip onClick={() => prompt(`Who's going in ${nextLabel}? `)}>Who&apos;s going in {nextLabel}?</PromptChip>}
                <PromptChip onClick={() => prompt(`▸ ${formatTime(currentSeconds)} `, true)}>Add timestamp {formatTime(currentSeconds)}</PromptChip>
              </div>
              <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 18, overflow: 'hidden', background: C.gold, color: C.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontSize: 13, fontWeight: 700 }}>
                  {profile?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile?.username?.[0] ?? 'U').toUpperCase()}
                </span>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', height: 46, borderRadius: 23, ...G.raised, border: `1px solid ${C.bd2}`, padding: '0 5px 0 16px' }}>
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Add a comment</span>
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a comment…"
                    maxLength={500}
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: C.cream, fontFamily: sans, fontSize: 15 }}
                  />
                  <button
                    type="submit"
                    aria-label="Post comment"
                    disabled={!draft.trim()}
                    style={{ width: 36, height: 36, borderRadius: 18, border: 'none', flexShrink: 0, cursor: draft.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', background: draft.trim() ? C.gold : C.bg4, color: draft.trim() ? C.onAccent : C.c3 }}
                  >
                    <Send size={16} />
                  </button>
                </label>
              </form>
            </>
          ) : (
            <Link href="/auth" style={{ height: 48, borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Sign in to comment
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

function Badge({ tone, children }: { tone: 'gold' | 'green'; children: React.ReactNode }) {
  const gold = tone === 'gold';
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 6,
      background: gold ? C.goldDim : C.greenDim, color: gold ? C.goldText : '#86EFAC', border: `1px solid ${gold ? C.goldBd : C.greenBd}`,
    }}>
      {children}
    </span>
  );
}

function PromptChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ flexShrink: 0, height: 36, padding: '0 12px', borderRadius: R.chip, ...G.raised, border: `1px solid ${C.bd2}`, color: C.c2, fontFamily: sans, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  );
}
