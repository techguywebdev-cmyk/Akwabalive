'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, Lock, Camera, Play, X, CalendarDays, Ticket, Heart, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import type { Profile, DreamEvent } from '@/lib/supabase/types';
import type { GhanaEvent } from '@/lib/types';
import type { Moment } from '@/components/moments/types';
import Nav from '@/components/layout/Nav';
import { BTN } from '@/components/events/CardParts';
import { loadAll, MomentsViewer } from '@/components/moments/EventMoments';
import { momentsForEvent, ytThumb } from '@/lib/moments/match';
import { supabaseToGhanaEvent, type SupabaseEvent } from '@/lib/supabase/events';
import { events as staticEvents } from '@/lib/data/events';
import { parseDay, shortDay } from '@/lib/dates';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND, EASE } from '@/lib/thiscene';

type Tab = 'going' | 'saved' | 'moments';
type Person = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;
type Plan = { event: GhanaEvent; ticket: boolean };

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const nameOf = (p: Pick<Profile, 'full_name' | 'username'>) => p.full_name?.trim() || p.username;

/* ── Avatar ─────────────────────────────────────────────────────────── */

function Avatar({ p, size }: { p: Pick<Profile, 'full_name' | 'username' | 'avatar_url'>; size: number }) {
  const initials = nameOf(p).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return p.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatar_url} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
  ) : (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(140deg, rgba(123,227,168,0.32), rgba(30,110,72,0.5))', color: T.mintText,
      fontFamily: FONT.display, fontWeight: 700, fontSize: size * 0.36, letterSpacing: '-0.02em',
    }}>{initials}</span>
  );
}

/* ── Bottom sheet (portal, above the tab bar) ───────────────────────── */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 330 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', opacity: shown ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, margin: '0 auto', maxHeight: '88svh', overflowY: 'auto',
        background: 'linear-gradient(180deg, #0B2619 0%, #05130C 100%)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${T.hairlineStrong}`,
        padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: `transform 420ms ${EASE.sheet}`,
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: T.white, letterSpacing: '-0.02em' }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={roundBtn}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const roundBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: T.white, cursor: 'pointer',
};

/* ── Followers / following list ─────────────────────────────────────── */

function PeopleSheet({ profileId, kind, onClose }: { profileId: string; kind: 'followers' | 'following'; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    (async () => {
      const col = kind === 'followers' ? 'following_id' : 'follower_id';
      const other = kind === 'followers' ? 'follower_id' : 'following_id';
      const { data: rows } = await supabase.from('follows').select(other).eq(col, profileId).order('created_at', { ascending: false }).limit(200);
      const ids = (rows ?? []).map((r: Record<string, string>) => r[other]);
      if (!ids.length) { setPeople([]); return; }
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids);
      const byId = new Map((data ?? []).map((p) => [p.id, p as Person]));
      setPeople(ids.map((id) => byId.get(id)).filter(Boolean) as Person[]);
    })();
  }, [kind, profileId, supabase]);
  return (
    <Sheet title={kind === 'followers' ? 'Followers' : 'Following'} onClose={onClose}>
      {!people ? <Muted>Loading…</Muted> : !people.length ? <Muted>{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</Muted> : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/u/${p.username}`} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none' }}>
                <Avatar p={p} size={46} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: T.white }}>{nameOf(p)}</span>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>@{p.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ── Edit profile ───────────────────────────────────────────────────── */

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', color: T.white, fontFamily: FONT.sans, fontSize: 16, outline: 'none',
};
const label: React.CSSProperties = { display: 'block', margin: '18px 0 8px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: T.text2 };

function EditSheet({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState(profile.full_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [isPublic, setIsPublic] = useState(profile.is_public);
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { setErr('Choose a photo.'); return; }
    if (file.size > 10 * 1024 * 1024) { setErr('That photo is over 10 MB.'); return; }
    setUploading(true); setErr('');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `avatars/${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('event-images').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    setUploading(false);
    if (error) { setErr('Could not upload that photo. Try another.'); return; }
    setAvatar(supabase.storage.from('event-images').getPublicUrl(path).data.publicUrl);
  }

  async function save() {
    setSaving(true); setErr('');
    const patch = { full_name: name.trim() || null, bio: bio.trim() || null, is_public: isPublic, avatar_url: avatar };
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', profile.id).select('*').single();
    setSaving(false);
    if (error) { setErr('Could not save. Try again.'); return; }
    onSaved(data as Profile);
  }

  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change photo" style={{ position: 'relative', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 40 }}>
          <Avatar p={{ ...profile, full_name: name || profile.full_name, avatar_url: avatar }} size={80} />
          <span style={{ position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, background: T.mint, color: T.onMint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px #0B2619' }}>
            <Camera size={15} strokeWidth={2.2} />
          </span>
        </button>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.mintText }}>
            {uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Add a photo'}
          </button>
          {avatar && !uploading && (
            <button type="button" onClick={() => setAvatar(null)} style={{ display: 'block', marginTop: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>Remove</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>

      <label style={label} htmlFor="pf-name">Name</label>
      <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={profile.username} style={field} />

      <label style={label} htmlFor="pf-bio">Bio</label>
      <textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} placeholder="What you’re into, where you’ll be…" style={{ ...field, resize: 'none', lineHeight: 1.45 }} />
      <p style={{ margin: '6px 0 0', textAlign: 'right', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{bio.length}/160</p>

      <button type="button" role="switch" aria-checked={isPublic} onClick={() => setIsPublic((v) => !v)}
        style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: T.white }}>Public profile</span>
          <span style={{ display: 'block', marginTop: 2, fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.4, color: T.text3 }}>
            {isPublic ? 'Anyone can see the events you’re going to.' : 'Only you see your plans. People can still follow you.'}
          </span>
        </span>
        <span aria-hidden style={{ width: 50, height: 30, borderRadius: 15, padding: 3, boxSizing: 'border-box', background: isPublic ? T.mint : 'rgba(255,255,255,0.16)', transition: 'background 200ms ease', flexShrink: 0 }}>
          <span style={{ display: 'block', width: 24, height: 24, borderRadius: 12, background: isPublic ? T.onMint : T.white, transform: `translateX(${isPublic ? 20 : 0}px)`, transition: 'transform 220ms ease' }} />
        </span>
      </button>

      {err && <p role="alert" style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.danger }}>{err}</p>}
      <button type="button" onClick={save} disabled={saving || uploading} style={{ ...BTN.primary, width: '100%', marginTop: 22, opacity: saving || uploading ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </Sheet>
  );
}

/* ── Content rows ───────────────────────────────────────────────────── */

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: '10px 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text3 }}>{children}</p>;
}

function Empty({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div style={{ padding: '44px 12px 20px', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', background: 'rgba(123,227,168,0.1)', color: T.mintText }}>{icon}</span>
      <p style={{ margin: '14px 0 0', fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>{title}</p>
      <p style={{ margin: '6px auto 0', maxWidth: 300, fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>{body}</p>
      {cta && <Link href={cta.href} style={{ ...BTN.secondary, marginTop: 20, height: 44, fontSize: 14 }}>{cta.label}</Link>}
    </div>
  );
}

function PlanRow({ plan, past }: { plan: Plan; past?: boolean }) {
  const e = plan.event;
  const d = parseDay(e.date);
  return (
    <Link href={`/events/${e.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', textDecoration: 'none', opacity: past ? 0.72 : 1 }}>
      <span style={{ position: 'relative', width: 64, height: 80, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.image && <img src={hiRes(e.image, 300) ?? e.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: past ? T.text3 : T.mintText }}>
          {[d ? shortDay(d) : e.dateLabel, e.time].filter(Boolean).join(' · ')}
        </span>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 3, fontFamily: FONT.display, fontSize: 17, fontWeight: 700, lineHeight: 1.25, color: T.white }}>{e.title}</span>
        <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 14, color: T.text3 }}>
          {[e.venue, e.city].filter(Boolean).join(', ')}
        </span>
      </span>
      {plan.ticket && (
        <span title="Has a ticket" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'rgba(123,227,168,0.12)', color: T.mintText, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          <Ticket size={13} /> {past ? 'Went' : 'Ticket'}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '22px 0 4px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em', color: T.text3 }}>{children}</p>;
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function UserProfilePage() {
  const { username } = useParams() as { username: string };
  const { user, profile: me, loading: authLoading, refreshProfile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [saved, setSaved] = useState<{ dream: DreamEvent; event?: GhanaEvent }[] | null>(null);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [tab, setTab] = useState<Tab>('going');
  const [sheet, setSheet] = useState<null | 'edit' | 'followers' | 'following'>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const own = !!user && profile?.id === user.id;
  const hidden = !!profile && !profile.is_public && !own;

  const load = useCallback(async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
    if (!prof) { setMissing(true); return; }
    const p = prof as Profile;
    setProfile(p);
    const isOwn = user?.id === p.id;

    const [{ count: followers }, { count: following }, followRow] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id),
      user && !isOwn
        ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', p.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCounts({ followers: followers ?? 0, following: following ?? 0 });
    setIsFollowing(!!followRow.data);

    if (!p.is_public && !isOwn) { setPlans([]); setSaved([]); setMoments([]); return; }

    // Going = said "going" + holds a ticket; saved = dream events. RLS only returns public rows to others.
    const [{ data: att }, { data: tix }, { data: dreams }] = await Promise.all([
      supabase.from('event_attendance').select('event_slug').eq('user_id', p.id).eq('status', 'going'),
      supabase.from('tickets').select('event_slug').eq('user_id', p.id).in('status', ['active', 'used']),
      supabase.from('dream_events').select('*').eq('user_id', p.id).order('created_at', { ascending: false }),
    ]);
    const ticketSlugs = new Set((tix ?? []).map((t) => t.event_slug as string));
    const goingSlugs = Array.from(new Set([...(att ?? []).map((a) => a.event_slug as string), ...Array.from(ticketSlugs)]));
    const dreamRows = (dreams ?? []) as DreamEvent[];
    const allSlugs = Array.from(new Set([...goingSlugs, ...dreamRows.map((d) => d.event_slug)]));

    const bySlug = new Map<string, GhanaEvent>();
    staticEvents.forEach((e) => { if (allSlugs.includes(e.slug)) bySlug.set(e.slug, e); });
    if (allSlugs.length) {
      const { data: evs } = await supabase.from('events').select('*, ticket_tiers(*)').in('slug', allSlugs);
      (evs ?? []).forEach((raw) => { try { bySlug.set(raw.slug, supabaseToGhanaEvent(raw as SupabaseEvent)); } catch { /* skip */ } });
    }

    const goingPlans = goingSlugs.map((s) => bySlug.get(s)).filter(Boolean).map((e) => ({ event: e!, ticket: ticketSlugs.has(e!.slug) }));
    setPlans(goingPlans);
    setSaved(dreamRows.map((d) => ({ dream: d, event: bySlug.get(d.event_slug) })));

    // Moments: videos from the events they've been to or are going to (and past editions of them)
    const all = await loadAll();
    const seen = new Set<string>();
    const list: Moment[] = [];
    goingPlans.forEach(({ event }) => momentsForEvent(event, all).forEach((m) => { if (!seen.has(m.id)) { seen.add(m.id); list.push(m); } }));
    setMoments(list.slice(0, 30));
  }, [supabase, username, user]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  async function toggleFollow() {
    if (!user) { window.location.href = `/auth?next=${encodeURIComponent(`/u/${username}`)}`; return; }
    if (!profile || own) return;
    setFollowBusy(true);
    const was = isFollowing;
    setIsFollowing(!was);
    setCounts((c) => ({ ...c, followers: c.followers + (was ? -1 : 1) }));
    const { error } = was
      ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      : await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
    if (error) { setIsFollowing(was); setCounts((c) => ({ ...c, followers: c.followers + (was ? 1 : -1) })); }
    setFollowBusy(false);
  }

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    const title = profile ? `${nameOf(profile)} on Akwaaba` : 'Akwaaba';
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  }

  const t0 = today();
  const upcoming = (plans ?? []).filter((p) => { const d = parseDay(p.event.date); return !d || d >= t0; })
    .sort((a, b) => (parseDay(a.event.date)?.getTime() ?? 0) - (parseDay(b.event.date)?.getTime() ?? 0));
  const past = (plans ?? []).filter((p) => { const d = parseDay(p.event.date); return d && d < t0; })
    .sort((a, b) => (parseDay(b.event.date)?.getTime() ?? 0) - (parseDay(a.event.date)?.getTime() ?? 0));

  const page: React.CSSProperties = { minHeight: '100svh', background: GROUND, backgroundAttachment: 'fixed' };

  if (missing) return (
    <div style={page}>
      <Nav back="/" tabs />
      <Empty icon={<X size={24} />} title="No one here" body={`There’s no Akwaaba profile called @${username}.`} cta={{ href: '/', label: 'Browse events' }} />
    </div>
  );

  const stat = (n: number, word: string, onClick?: () => void) => (
    <button type="button" onClick={onClick} disabled={!onClick} style={{ padding: 0, border: 'none', background: 'none', cursor: onClick ? 'pointer' : 'default', fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>
      <span style={{ fontFamily: FONT.display, fontWeight: 700, color: T.white }}>{n}</span> {word}
    </button>
  );

  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'going', label: 'Going', n: plans?.length },
    { key: 'saved', label: 'Saved', n: saved?.length },
    { key: 'moments', label: 'Moments', n: moments?.length },
  ];

  return (
    <div style={page}>
      <Nav back="/" tabs actions={
        <button type="button" onClick={share} aria-label="Share profile" style={roundBtn}>{copied ? <Check size={18} /> : <Share2 size={18} />}</button>
      } />

      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'calc(76px + env(safe-area-inset-top, 0px)) 20px 120px' }}>
        {!profile ? (
          <div aria-busy style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 88, height: 88, borderRadius: 44, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', width: '60%', height: 22, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ display: 'block', width: '35%', height: 14, marginTop: 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
            </span>
          </div>
        ) : (
          <>
            {/* Header */}
            <header>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Avatar p={profile} size={88} />
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.white, overflowWrap: 'anywhere' }}>{nameOf(profile)}</h1>
                  <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 15, color: T.text3 }}>
                    @{profile.username}{!profile.is_public && <Lock size={13} aria-label="Private" />}
                  </p>
                </div>
              </div>
              {profile.bio && <p style={{ margin: '16px 0 0', fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5, color: T.text, whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 14 }}>
                {stat(counts.followers, counts.followers === 1 ? 'follower' : 'followers', () => setSheet('followers'))}
                {stat(counts.following, 'following', () => setSheet('following'))}
                {!hidden && plans && stat(upcoming.length, 'upcoming')}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {own ? (
                  <button type="button" onClick={() => setSheet('edit')} style={{ ...BTN.secondary, flex: 1, height: 46 }}>Edit profile</button>
                ) : (
                  <button type="button" onClick={toggleFollow} disabled={followBusy} style={{ ...(isFollowing ? BTN.secondary : BTN.primary), flex: 1, height: 46 }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                {own && <Link href="/account/tickets" style={{ ...BTN.secondary, flex: 1, height: 46 }}><Ticket size={17} /> My tickets</Link>}
              </div>
            </header>

            {hidden ? (
              <Empty icon={<Lock size={22} />} title="This profile is private" body={`Follow @${profile.username} to keep up when they share their plans.`} />
            ) : (
              <>
                {/* Tabs */}
                <div role="tablist" style={{ display: 'flex', gap: 26, marginTop: 30, borderBottom: `1px solid ${T.hairline}` }}>
                  {tabs.map((t) => {
                    const on = tab === t.key;
                    return (
                      <button key={t.key} role="tab" aria-selected={on} type="button" onClick={() => setTab(t.key)} style={{
                        position: 'relative', padding: '0 0 12px', border: 'none', background: 'none', cursor: 'pointer',
                        fontFamily: FONT.display, fontSize: 16, fontWeight: on ? 700 : 600, color: on ? T.white : T.text3, transition: 'color 200ms ease',
                      }}>
                        {t.label}{!!t.n && <span style={{ marginLeft: 6, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: on ? T.mintText : T.text3 }}>{t.n}</span>}
                        <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 1, background: T.mint, transform: `scaleX(${on ? 1 : 0})`, transition: 'transform 260ms ease' }} />
                      </button>
                    );
                  })}
                </div>

                {tab === 'going' && (
                  !plans ? <div style={{ paddingTop: 16 }}><Muted>Loading…</Muted></div>
                  : !plans.length ? (
                    <Empty icon={<CalendarDays size={24} />} title={own ? 'No plans yet' : 'No plans yet'}
                      body={own ? 'Get a ticket or tap “Going” on an event and it shows up here.' : `When @${profile.username} is going somewhere, you’ll see it here.`}
                      cta={own ? { href: '/', label: 'Find something to do' } : undefined} />
                  ) : (
                    <>
                      {upcoming.length > 0 && <><SectionLabel>Coming up</SectionLabel>{upcoming.map((p) => <PlanRow key={p.event.slug} plan={p} />)}</>}
                      {past.length > 0 && <><SectionLabel>Been to</SectionLabel>{past.map((p) => <PlanRow key={p.event.slug} plan={p} past />)}</>}
                    </>
                  )
                )}

                {tab === 'saved' && (
                  !saved ? <div style={{ paddingTop: 16 }}><Muted>Loading…</Muted></div>
                  : !saved.length ? (
                    <Empty icon={<Heart size={24} />} title="Nothing saved" body={own ? 'Tap the heart on any event to keep it here.' : `@${profile.username} hasn’t saved any events yet.`} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px 14px', marginTop: 18 }}>
                      {saved.map(({ dream, event }) => {
                        const img = event?.image || dream.event_image;
                        const d = parseDay(event?.date);
                        return (
                          <Link key={dream.id} href={`/events/${dream.event_slug}`} style={{ textDecoration: 'none', minWidth: 0 }}>
                            <span style={{ display: 'block', aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {img && <img src={hiRes(img, 500) ?? img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                            </span>
                            {d && <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: d < t0 ? T.text3 : T.mintText }}>{shortDay(d)}</span>}
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: d ? 2 : 10, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: T.white }}>
                              {event?.title || dream.event_title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )
                )}

                {tab === 'moments' && (
                  !moments ? <div style={{ paddingTop: 16 }}><Muted>Loading…</Muted></div>
                  : !moments.length ? (
                    <Empty icon={<Play size={24} />} title="No moments yet" body={own ? 'Videos from the events you go to collect here.' : `Videos from events @${profile.username} goes to show up here.`} cta={own ? { href: '/moments', label: 'Watch Moments' } : undefined} />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px 14px', marginTop: 18 }}>
                      {moments.map((m, i) => (
                        <button key={m.id} type="button" onClick={() => setViewer(i)} style={{ display: 'block', alignSelf: 'start', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                          <span style={{ position: 'relative', display: 'block', aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ytThumb(m.youtube_id, 'hq')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45))' }}>
                              <span style={{ width: 38, height: 38, borderRadius: 19, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,6,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: T.white }}>
                                <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                              </span>
                            </span>
                            {m.year && <span style={{ position: 'absolute', left: 8, top: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(3,10,6,0.6)', fontFamily: FONT.sans, fontSize: 11, fontWeight: 600, color: T.white }}>{m.year}</span>}
                          </span>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 9, fontFamily: FONT.display, fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: T.white }}>{m.title}</span>
                          <span style={{ display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{m.event_name}</span>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}
      </main>

      {profile && sheet === 'edit' && (
        <EditSheet profile={profile} onClose={() => setSheet(null)} onSaved={(p) => { setProfile(p); setSheet(null); refreshProfile(); }} />
      )}
      {profile && (sheet === 'followers' || sheet === 'following') && (
        <PeopleSheet profileId={profile.id} kind={sheet} onClose={() => setSheet(null)} />
      )}
      {moments && viewer !== null && (
        <MomentsViewer list={moments} start={viewer} eventTitle={profile ? `${nameOf(profile)}’s moments` : 'Moments'} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}
