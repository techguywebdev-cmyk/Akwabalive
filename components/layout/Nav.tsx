'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { C, G, R } from '@/lib/theme';
import { Icon, PAGE_ICONS, type IconName } from '@/components/ui/Icon';

const LINKS: { href: string; label: string; live?: boolean }[] = [
  { href: '/', label: 'Discover' },
  { href: '/events', label: 'Events' },
  { href: '#', label: 'Live', live: true },
  { href: '/moments', label: 'Moments' },
  { href: '#', label: 'Cities' },
];

const sans = 'var(--font-inter,sans-serif)';
const mono = 'var(--font-dm-mono,monospace)';
const ACCENT = 'rgb(var(--accent-rgb))';

/** 38px square glass button — This-scine's header control. */
function HeaderButton({
  label, icon, href, onClick, active = false, badge, size = 17,
}: {
  label: string; icon: IconName; href?: string; onClick?: () => void; active?: boolean; badge?: number; size?: number;
}) {
  const style: React.CSSProperties = {
    position: 'relative', width: 38, height: 38, borderRadius: 12, flexShrink: 0, padding: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
    background: active ? 'rgba(var(--accent-rgb), 0.16)' : 'rgba(0,0,0,0.55)',
    border: `1px solid ${active ? 'rgba(var(--accent-rgb), 0.45)' : 'rgba(255,255,255,0.10)'}`,
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    color: active ? ACCENT : 'rgba(255,255,255,0.75)', transition: 'all 0.2s ease',
  };
  const inner = (
    <>
      <Icon name={icon} size={size} />
      {!!badge && badge > 0 && (
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px', background: ACCENT, color: '#07070F', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0D0B08', lineHeight: 1 }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </>
  );
  if (href) return <Link href={href} aria-label={label} title={label} style={style}>{inner}</Link>;
  return <button type="button" aria-label={label} title={label} aria-expanded={onClick ? active : undefined} onClick={onClick} style={style}>{inner}</button>;
}

/**
 * Transparent header (This-scine style): no bar, just a dark fade from the top so
 * controls stay legible over full-bleed imagery. Glass icon buttons on the right,
 * an accent dot that follows the page's current colour next to the wordmark.
 */
export default function Nav({
  active,
}: {
  /** kept for older call sites; the header is always transparent now */
  transparent?: boolean;
  active?: string;
  variant?: 'default' | 'moments';
  onSearch?: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const accountLinks = user
    ? [
        { label: 'My profile', href: `/u/${profile?.username ?? ''}` },
        { label: 'My tickets', href: '/account/tickets' },
        { label: 'Dream events', href: '/account/dream-events' },
        { label: 'Organizer dashboard', href: '/organizer/dashboard' },
      ]
    : [];

  const avatar = (
    <Link href={`/u/${profile?.username ?? ''}`} aria-label="My profile" style={{ width: 36, height: 36, flexShrink: 0, position: 'relative', textDecoration: 'none' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(var(--accent-rgb), 0.14)', border: '2px solid rgba(var(--accent-rgb), 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {profile?.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: ACCENT }}>{(profile?.username?.[0] ?? 'U').toUpperCase()}</span>}
      </span>
    </Link>
  );

  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 26px',
          background: 'linear-gradient(to bottom, rgba(8,6,4,0.9) 0%, rgba(8,6,4,0.55) 55%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Wordmark + live accent dot */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', pointerEvents: 'auto', flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 12px ${ACCENT}`, transition: 'all 0.5s ease' }} />
          <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 16, fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)' }}>
            AK<span style={{ color: C.gold }}>W</span>AABA
          </span>
        </Link>

        {/* Page links with icons (desktop) */}
        {!isMobile && (
          <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'auto' }}>
            {LINKS.map((l) => {
              const on = active === l.label;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-current={on ? 'page' : undefined}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', borderRadius: 12,
                    fontFamily: sans, fontSize: 14, fontWeight: on ? 700 : 500, textDecoration: 'none',
                    color: on ? '#fff' : 'rgba(255,255,255,0.7)',
                    ...(on
                      ? { background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
                      : { border: '1px solid transparent' }),
                    textShadow: on ? 'none' : '0 1px 6px rgba(0,0,0,0.6)',
                  }}
                >
                  <Icon name={PAGE_ICONS[l.label]} size={16} color={on ? ACCENT : 'currentColor'} />
                  {l.label}
                  {l.live && <span style={{ width: 6, height: 6, borderRadius: 3, background: C.red, animation: 'blink 1.4s ease-in-out infinite' }} />}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {isMobile && <HeaderButton label="Moments" icon="moments" href="/moments" active={active === 'Moments'} />}
          {user && <HeaderButton label="My tickets" icon="ticket" href="/account/tickets" />}
          {user && !isMobile && <HeaderButton label="Dream events" icon="bookmark" href="/account/dream-events" />}
          {!isMobile && (
            <Link href="/organizer/events/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 12, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <Icon name="plus" size={15} strokeWidth={2.2} /> List event
            </Link>
          )}
          <HeaderButton label={menuOpen ? 'Close menu' : 'Menu'} icon={menuOpen ? 'close' : 'menu'} onClick={() => setMenuOpen((o) => !o)} active={menuOpen} />
          {user ? avatar : (
            <Link href="/auth" style={{ height: 34, padding: '0 12px', borderRadius: 22, background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.4)', color: ACCENT, fontFamily: sans, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Menu — glass sheet with a page icon per item */}
      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: 'none', cursor: 'default' }} />
          <div
            role="dialog"
            aria-label="Menu"
            style={{
              position: 'fixed', zIndex: 199, top: 'calc(64px + env(safe-area-inset-top, 0px))', right: 12, width: 'min(320px, calc(100vw - 24px))',
              maxHeight: 'calc(100svh - 84px)', overflowY: 'auto',
              ...G.sheet, border: '1px solid rgba(255,255,255,0.10)', borderRadius: R.card + 2, padding: 8,
            }}
          >
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 12px', borderBottom: `1px solid ${C.bd}`, marginBottom: 6 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--accent-rgb), 0.16)', border: '2px solid rgba(var(--accent-rgb), 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontFamily: sans, fontWeight: 700 }}>
                  {(profile?.username?.[0] ?? 'U').toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.cream }}>{profile?.full_name}</p>
                  <p style={{ fontFamily: mono, fontSize: 11, color: C.c3 }}>@{profile?.username}</p>
                </div>
              </div>
            )}
            {[...LINKS, ...accountLinks].map((l) => {
              const on = active === l.label;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '0 12px', borderRadius: 12,
                    fontFamily: sans, fontSize: 15, fontWeight: on ? 700 : 500, textDecoration: 'none',
                    color: on ? '#fff' : 'rgba(255,255,255,0.78)', background: on ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(var(--accent-rgb), 0.16)' : 'rgba(255,255,255,0.05)', color: on ? ACCENT : 'rgba(255,255,255,0.7)' }}>
                    <Icon name={PAGE_ICONS[l.label] ?? 'dots'} size={17} />
                  </span>
                  {l.label}
                  {'live' in l && Boolean(l.live) && <span style={{ width: 6, height: 6, borderRadius: 3, background: C.red, marginLeft: 'auto' }} />}
                </Link>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.bd}` }}>
              <Link href="/organizer/events/new" onClick={() => setMenuOpen(false)} style={{ flex: 1, height: 46, borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                <Icon name="plus" size={15} strokeWidth={2.2} /> List event
              </Link>
              {user ? (
                <button type="button" onClick={() => { signOut(); setMenuOpen(false); }} style={{ flex: 1, height: 46, borderRadius: R.btn, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(206,17,38,0.4)', color: '#FCA5A5', fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="logout" size={16} /> Sign out
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} style={{ flex: 1, height: 46, borderRadius: R.btn, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: C.cream, fontFamily: sans, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                  <Icon name="user" size={16} /> Sign in
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
