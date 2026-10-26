'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';
import { Icon, PAGE_ICONS, type IconName } from '@/components/ui/Icon';
import Wordmark from '@/components/brand/Wordmark';

/** Main sections. On phones they live in the bottom tab bar; on desktop, in the header. */
const SECTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Discover', icon: 'compass' },
  { href: '/events', label: 'Events', icon: 'calendar' },
  { href: '/moments', label: 'Moments', icon: 'moments' },
];

const GLASS: React.CSSProperties = {
  background: 'rgba(3,10,6,0.36)',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

/**
 * 44px round icon button used in the header. Pages pass their own (filter, view toggle…)
 * through Nav's `actions`.
 */
export function HeaderIconButton({
  label, icon, href, onClick, active = false, dot = false, pressed,
}: {
  label: string; icon: IconName; href?: string; onClick?: () => void;
  /** Mint-tinted when something is switched on (e.g. filters applied) */
  active?: boolean;
  /** Small mint dot in the corner */
  dot?: boolean;
  pressed?: boolean;
}) {
  const style: React.CSSProperties = {
    position: 'relative', width: 44, height: 44, borderRadius: 22, flexShrink: 0, padding: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
    color: active ? T.mintText : T.text,
    ...GLASS,
    ...(active ? { background: 'rgba(123,227,168,0.12)', border: '1px solid rgba(123,227,168,0.35)' } : {}),
    transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
  };
  const inner = (
    <>
      <Icon name={icon} size={22} />
      {dot && <span aria-hidden style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, background: T.mint, boxShadow: '0 0 0 2px rgba(3,8,6,0.9)' }} />}
    </>
  );
  if (href) return <Link href={href} aria-label={label} title={label} style={style}>{inner}</Link>;
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

/**
 * Header: no wordmark, no bar. A soft fade from the top keeps icon buttons legible over
 * full-bleed imagery. Left: menu (or back). Right: the page's own actions, then search
 * and the profile/sign-in button. Phones also get a floating glass tab bar at the bottom.
 */
export default function Nav({
  active, actions, back, tabs = false,
}: {
  /** kept for older call sites */
  transparent?: boolean;
  variant?: 'default' | 'moments';
  onSearch?: () => void;
  active?: string;
  /** Page-specific header buttons (e.g. sort & filter) */
  actions?: ReactNode;
  /** Show a back button instead of the menu */
  back?: string;
  /** Show the bottom tab bar on phones */
  tabs?: boolean;
}) {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [tabsHidden, setTabsHidden] = useState(false);

  // Hide the tab bar while scrolling down the page, bring it back on any scroll up
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setTabsHidden(y > last && y > 120);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Drawer: mount, then slide in on the next frame; slide out, then unmount
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuShown, setMenuShown] = useState(false);
  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMenuShown(true)));
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => { cancelAnimationFrame(raf); document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    }
    setMenuShown(false);
    const t = setTimeout(() => setMenuMounted(false), 420);
    return () => clearTimeout(t);
  }, [menuOpen]);
  const stagger = (i: number): React.CSSProperties => ({
    opacity: menuShown ? 1 : 0,
    transform: menuShown ? 'translateX(0)' : 'translateX(-16px)',
    transition: `opacity 360ms ease ${120 + i * 45}ms, transform 420ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 45}ms`,
  });

  const profileHref = user ? `/u/${profile?.username ?? ''}` : '/auth';
  const ticketsHref = user ? '/account/tickets' : '/auth';

  const accountLinks = user
    ? [
        { label: 'My profile', href: profileHref },
        { label: 'My tickets', href: '/account/tickets' },
        { label: 'Dream events', href: '/account/dream-events' },
        { label: 'Organizer dashboard', href: '/organizer/dashboard' },
      ]
    : [];

  const avatar = user ? (
    <Link href={profileHref} aria-label="My profile" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#1F5A3F', color: '#D6FBE6', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 }}>
      {profile?.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (profile?.username?.[0] ?? 'U').toUpperCase()}
    </Link>
  ) : (
    <HeaderIconButton label="Sign in" icon="user" href="/auth" />
  );

  const tabItems: { href: string; label: string; icon: IconName; key: string }[] = [
    ...SECTIONS.map((s) => ({ ...s, key: s.label })),
    { href: ticketsHref, label: 'My tickets', icon: 'ticket', key: 'Tickets' },
    { href: profileHref, label: user ? 'My profile' : 'Sign in', icon: 'user', key: 'Profile' },
  ];

  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 28px',
          background: 'linear-gradient(to bottom, rgba(3,8,6,0.42) 0%, rgba(3,8,6,0.16) 60%, rgba(3,8,6,0) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {back
            ? <HeaderIconButton label="Back" icon="arrowLeft" href={back} />
            : <HeaderIconButton label="Menu" icon="menu" onClick={() => setMenuOpen(true)} />}
          {!isMobile && <span style={{ marginLeft: 8 }}><Wordmark /></span>}

          {!isMobile && (
            <nav aria-label="Main" style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
              {SECTIONS.map((l) => {
                const on = active === l.label;
                return (
                  <Link
                    key={l.label}
                    href={l.href}
                    aria-current={on ? 'page' : undefined}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', borderRadius: 22,
                      fontFamily: FONT.sans, fontSize: 14, fontWeight: on ? 600 : 500, textDecoration: 'none',
                      color: on ? T.white : 'rgba(255,255,255,0.62)',
                    }}
                  >
                    <Icon name={l.icon} size={18} color={on ? T.mint : 'currentColor'} />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Phones: wordmark on regular pages; none over full-screen flyers (feed, event pages) */}
        {isMobile && !actions && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(14px + env(safe-area-inset-top, 0px))', height: 44, display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
            <Wordmark />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {actions ?? <HeaderIconButton label="Search events" icon="search" href="/events?search=1" />}
          {(!isMobile || !actions) && avatar}
        </div>
      </header>

      {/* Bottom tab bar — phones. Slim floating pill over a soft fade; slides away while you scroll down. */}
      {tabs && isMobile && (
        <>
          <style>{'@media (max-width: 899px) { body { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); } }'}</style>
          <div aria-hidden style={{ position: 'fixed', zIndex: 189, left: 0, right: 0, bottom: 0, height: 'calc(110px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(180deg, rgba(3,8,6,0) 0%, rgba(3,8,6,0.7) 55%, rgba(3,8,6,0.92) 100%)', pointerEvents: 'none', transform: tabsHidden ? 'translateY(100%)' : 'none', transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' }} />
          <nav
            aria-label="Primary"
            style={{
              position: 'fixed', zIndex: 190, left: '50%', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
              width: 'min(340px, calc(100vw - 48px))', height: 58, borderRadius: 29,
              display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px',
              background: 'rgba(8,24,16,0.55)', border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(26px) saturate(160%)', WebkitBackdropFilter: 'blur(26px) saturate(160%)',
              transform: `translateX(-50%) translateY(${tabsHidden ? 'calc(100% + 24px)' : '0'})`,
              transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {tabItems.map((t) => {
              const on = active === t.key || (t.key === 'Profile' && active === 'My profile') || (t.key === 'Tickets' && active === 'My tickets');
              return (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-label={t.label}
                  aria-current={on ? 'page' : undefined}
                  style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, color: on ? T.mint : 'rgba(255,255,255,0.42)', background: on ? 'rgba(123,227,168,0.1)' : 'transparent', textDecoration: 'none', transition: 'background 200ms ease, color 200ms ease' }}
                >
                  <Icon name={t.icon} size={22} />
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Menu: a full-height drawer that slides in from the left */}
      {menuMounted && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'default', background: 'rgba(1,4,3,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', opacity: menuShown ? 1 : 0, transition: 'opacity 320ms ease' }}
          />
          <nav
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: 'min(400px, 88vw)', display: 'flex', flexDirection: 'column',
              padding: 'calc(14px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px))',
              background: 'radial-gradient(120% 50% at 0% 0%, rgba(20,78,52,0.9) 0%, rgba(6,22,14,0) 70%), linear-gradient(180deg, #071A10 0%, #030806 100%)',
              borderRight: '1px solid rgba(255,255,255,0.08)', boxShadow: '30px 0 80px rgba(0,0,0,0.5)',
              transform: menuShown ? 'translateX(0)' : 'translateX(-104%)', transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
              <Wordmark />
              <HeaderIconButton label="Close menu" icon="close" onClick={() => setMenuOpen(false)} />
            </div>

            {user && (
              <Link href={profileHref} onClick={() => setMenuOpen(false)} style={{ ...stagger(0), display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, textDecoration: 'none' }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', background: '#1F5A3F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D6FBE6', fontFamily: FONT.sans, fontWeight: 600 }}>
                  {profile?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile?.username?.[0] ?? 'U').toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.white }}>{profile?.full_name || profile?.username}</span>
                  <span style={{ display: 'block', fontFamily: FONT.sans, fontSize: 13, color: T.text2 }}>@{profile?.username}</span>
                </span>
              </Link>
            )}

            <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column' }}>
              {SECTIONS.map((l, i) => {
                const on = active === l.label;
                return (
                  <Link
                    key={l.label}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={on ? 'page' : undefined}
                    style={{ ...stagger(i + 1), display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', textDecoration: 'none', fontFamily: FONT.display, fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, color: on ? T.mint : T.white }}
                  >
                    {l.label}
                    {on
                      ? <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: T.mint, boxShadow: `0 0 12px ${T.mint}` }} />
                      : <Icon name="arrowRight" size={22} color="rgba(255,255,255,0.35)" />}
                  </Link>
                );
              })}
            </div>

            {accountLinks.length > 0 && (
              <div style={{ ...stagger(5), marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.hairline}` }}>
                <p style={{ margin: '0 0 6px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Your Akwaaba</p>
                {accountLinks.map((l) => (
                  <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 16, fontWeight: 500, color: active === l.label ? T.mint : 'rgba(255,255,255,0.82)' }}>
                    <Icon name={PAGE_ICONS[l.label] ?? 'dots'} size={19} color="rgba(255,255,255,0.55)" />
                    {l.label}
                  </Link>
                ))}
              </div>
            )}

            <div style={{ ...stagger(6), marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/organizer/events/new" onClick={() => setMenuOpen(false)} style={{ height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                <Icon name="plus" size={18} strokeWidth={2} /> List an event
              </Link>
              {user ? (
                <button type="button" onClick={() => { signOut(); setMenuOpen(false); }} style={{ height: 48, borderRadius: 999, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                  Sign out
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} style={{ height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.14)', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
