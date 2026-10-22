'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT } from '@/lib/thiscene';
import { Icon, PAGE_ICONS, type IconName } from '@/components/ui/Icon';

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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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
            : <HeaderIconButton label={menuOpen ? 'Close menu' : 'Menu'} icon={menuOpen ? 'close' : 'menu'} onClick={() => setMenuOpen((o) => !o)} pressed={menuOpen} />}

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

      {/* Menu sheet */}
      {menuOpen && (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(1,4,3,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: 'none', cursor: 'default' }} />
          <div
            role="dialog"
            aria-label="Menu"
            style={{
              position: 'fixed', zIndex: 199, top: 'calc(70px + env(safe-area-inset-top, 0px))', left: 12, width: 'min(320px, calc(100vw - 24px))',
              maxHeight: 'calc(100svh - 90px)', overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(14,44,30,0.97) 0%, rgba(5,16,10,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '8px 8px 12px',
            }}
          >
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px 14px', borderBottom: `1px solid ${T.hairline}`, marginBottom: 6 }}>
                <span style={{ width: 40, height: 40, borderRadius: 20, background: '#1F5A3F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D6FBE6', fontFamily: FONT.sans, fontWeight: 600 }}>
                  {(profile?.username?.[0] ?? 'U').toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>{profile?.full_name}</p>
                  <p style={{ fontFamily: FONT.sans, fontSize: 13, color: T.text2, margin: 0 }}>@{profile?.username}</p>
                </div>
              </div>
            )}
            {[...SECTIONS, ...accountLinks].map((l) => {
              const on = active === l.label;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, padding: '0 12px', borderRadius: 14,
                    fontFamily: FONT.sans, fontSize: 15, fontWeight: on ? 600 : 500, textDecoration: 'none',
                    color: on ? T.white : 'rgba(255,255,255,0.78)', background: on ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                >
                  <Icon name={PAGE_ICONS[l.label] ?? 'dots'} size={20} color={on ? T.mint : 'rgba(255,255,255,0.7)'} />
                  {l.label}
                </Link>
              );
            })}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.hairline}` }}>
              <Link href="/organizer/events/new" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, padding: '0 12px', borderRadius: 14, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, color: T.mintText, textDecoration: 'none' }}>
                <Icon name="plus" size={20} /> List an event
              </Link>
              {user ? (
                <button type="button" onClick={() => { signOut(); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, padding: '0 12px', borderRadius: 14, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Icon name="logout" size={20} /> Sign out
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, padding: '0 12px', borderRadius: 14, fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, color: T.text, textDecoration: 'none' }}>
                  <Icon name="user" size={20} /> Sign in
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
