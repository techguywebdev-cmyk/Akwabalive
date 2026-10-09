'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, X, Menu } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { C, G, R } from '@/lib/theme';

const LINKS = [
  { href: '/', label: 'Discover' },
  { href: '/events', label: 'Events' },
  { href: '#', label: 'Live', live: true },
  { href: '/moments', label: 'Moments' },
  { href: '#', label: 'Cities' },
];

const sans = 'var(--font-inter,sans-serif)';
const mono = 'var(--font-dm-mono,monospace)';

/**
 * Floating frosted-glass navigation bar.
 * Always glass (lighter while over a hero, denser once scrolled), flat — no shadows.
 */
export default function Nav({
  transparent = false,
  active,
  variant = 'default',
  onSearch,
}: {
  transparent?: boolean;
  active?: string;
  /** moments = menu left, logo center, search right, no + List */
  variant?: 'default' | 'moments';
  onSearch?: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isMoments = variant === 'moments';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 860);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!transparent) return;
    const fn = () => setScrolled(window.scrollY > 60);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [transparent]);

  const accountLinks = user
    ? [
        { label: 'My profile', href: `/u/${profile?.username ?? ''}` },
        { label: 'My tickets', href: '/account/tickets' },
        { label: 'Dream events', href: '/account/dream-events' },
        { label: 'Organizer dashboard', href: '/organizer/dashboard', accent: true },
      ]
    : [];

  const avatar = (size: number) => (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: C.gold, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        fontFamily: 'var(--font-syne,sans-serif)', fontSize: size * 0.42, fontWeight: 700, color: C.onAccent,
      }}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        (profile?.username?.[0] ?? 'U').toUpperCase()
      )}
    </span>
  );

  const logo = (
    <Link
      href="/"
      style={{
        fontFamily: 'var(--font-syne, sans-serif)', fontSize: 16, fontWeight: 800, letterSpacing: '4px',
        textTransform: 'uppercase', color: C.cream, textDecoration: 'none', flexShrink: 0, padding: '0 6px',
      }}
    >
      AK<span style={{ color: C.gold }}>W</span>AABA
    </Link>
  );

  const iconBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 20, flexShrink: 0,
    ...G.raised, border: `1px solid ${C.bd}`, color: C.cream,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
  };

  const menuButton = (
    <button type="button" onClick={() => setMobileOpen(o => !o)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} style={iconBtn}>
      {mobileOpen ? <X size={18} /> : <Menu size={18} />}
    </button>
  );

  const listBtn = (
    <Link
      href="/organizer/events/new"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        fontFamily: sans, fontSize: 13, fontWeight: 700, background: C.gold, color: C.onAccent,
        height: 40, padding: '0 14px', borderRadius: 20, textDecoration: 'none',
      }}
    >
      <Plus size={15} strokeWidth={2.5} />
      {isMobile ? 'List' : 'List event'}
    </Link>
  );

  return (
    <>
      <div
        style={{
          position: 'fixed', zIndex: 200, left: 0, right: 0,
          top: 'calc(8px + env(safe-area-inset-top, 0px))',
          padding: '0 10px', pointerEvents: 'none',
        }}
      >
        <nav
          style={{
            maxWidth: 1400, margin: '0 auto', height: 56, pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '0 8px', borderRadius: 28, position: 'relative',
            ...(scrolled || mobileOpen ? G.bar : G.overlay),
            border: `1px solid ${scrolled || mobileOpen ? C.bd2 : 'rgba(255,255,255,0.14)'}`,
            transition: 'background 300ms, border-color 300ms',
          }}
        >
          {isMoments ? (
            <>
              {menuButton}
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>{logo}</div>
              <button type="button" aria-label="Search" onClick={onSearch} style={iconBtn}>
                <Search size={17} />
              </button>
            </>
          ) : (
            <>
              {logo}

              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {LINKS.map((link) => {
                    const on = active === link.label;
                    return (
                      <Link
                        key={link.label}
                        href={link.href}
                        style={{
                          fontFamily: sans, fontSize: 14, fontWeight: on ? 700 : 500,
                          color: on ? C.cream : C.c2, padding: '9px 14px', borderRadius: R.chip,
                          background: on ? C.bg4 : 'transparent', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color 180ms, background 180ms',
                        }}
                      >
                        {link.label}
                        {link.live && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'blink 1.4s ease-in-out infinite' }} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {!isMobile && (user ? (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(o => !o)}
                      aria-expanded={menuOpen}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, height: 40, cursor: 'pointer',
                        ...G.raised, border: `1px solid ${C.bd}`, borderRadius: 20, padding: '0 12px 0 5px',
                      }}
                    >
                      {avatar(30)}
                      <span style={{ fontFamily: mono, fontSize: 12, color: C.c2 }}>@{profile?.username ?? '...'}</span>
                    </button>
                    {menuOpen && (
                      <>
                        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                        <div
                          style={{
                            position: 'absolute', top: 50, right: 0, zIndex: 2, minWidth: 220, padding: 6,
                            ...G.sheet, border: `1px solid ${C.bd2}`, borderRadius: R.card,
                          }}
                        >
                          {accountLinks.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              style={{ display: 'block', padding: '11px 12px', borderRadius: 10, fontFamily: sans, fontSize: 14, color: item.accent ? C.goldText : C.cream, textDecoration: 'none' }}
                            >
                              {item.label}
                            </Link>
                          ))}
                          <div style={{ height: 1, background: C.bd, margin: '4px 6px' }} />
                          <button
                            type="button"
                            onClick={() => { signOut(); setMenuOpen(false); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 10, fontFamily: sans, fontSize: 14, color: '#FCA5A5', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Sign out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <Link href="/auth" style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.cream, textDecoration: 'none', padding: '9px 12px' }}>
                    Sign in
                  </Link>
                ))}

                {listBtn}
                {isMobile && menuButton}
              </div>
            </>
          )}
        </nav>

        {/* Mobile menu — glass sheet under the bar */}
        {mobileOpen && (
          <div
            style={{
              maxWidth: 1400, margin: '8px auto 0', pointerEvents: 'auto',
              maxHeight: 'calc(100svh - 96px)', overflowY: 'auto',
              ...G.sheet, border: `1px solid ${C.bd2}`, borderRadius: R.sheet, padding: 10,
            }}
          >
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 14px', borderBottom: `1px solid ${C.bd}`, marginBottom: 6 }}>
                {avatar(42)}
                <div>
                  <p style={{ fontFamily: sans, fontSize: 15, color: C.cream, fontWeight: 600 }}>{profile?.full_name}</p>
                  <p style={{ fontFamily: mono, fontSize: 12, color: C.c3 }}>@{profile?.username}</p>
                </div>
              </div>
            )}

            {[...LINKS, ...accountLinks].map((link) => {
              const on = active === link.label;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 12px', borderRadius: 12,
                    fontFamily: sans, fontSize: 16, fontWeight: on ? 700 : 500, textDecoration: 'none',
                    color: 'accent' in link && link.accent ? C.goldText : on ? C.cream : C.c2,
                    background: on ? C.bg4 : 'transparent',
                  }}
                >
                  {link.label}
                  {'live' in link && link.live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />}
                </Link>
              );
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.bd}` }}>
              {user ? (
                <button
                  type="button"
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  style={{ flex: 1, height: 48, borderRadius: R.btn, ...G.raised, border: '1px solid rgba(206,17,38,0.4)', color: '#FCA5A5', fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, height: 48, borderRadius: R.btn, ...G.raised, border: `1px solid ${C.bd2}`, color: C.cream, fontFamily: sans, fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Sign in
                </Link>
              )}
              <Link
                href="/organizer/events/new"
                onClick={() => setMobileOpen(false)}
                style={{ flex: 1, height: 48, borderRadius: R.btn, background: C.gold, color: C.onAccent, fontFamily: sans, fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Plus size={16} strokeWidth={2.5} /> List event
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
