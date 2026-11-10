'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { T, FONT, GRAD, GROUND } from '@/lib/thiscene';
import { Icon, type IconName } from '@/components/ui/Icon';
import Wordmark from '@/components/brand/Wordmark';
import SearchSheet from '@/components/search/SearchSheet';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useMenuPeek } from '@/hooks/useMenuPeek';
import { useArtistPhotos } from '@/hooks/useArtistPhotos';

/** Main sections. On phones they live in the bottom tab bar; on desktop, in the header. */
/** Faces on the menu's Artists row */
const FACE_SLUGS = ['sarkodie', 'black-sherif', 'gyakie', 'king-promise'];
const NO_FACES: string[] = [];

const SECTIONS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Discover', icon: 'compass' },
  { href: '/events', label: 'Events', icon: 'calendar' },
  { href: '/moments', label: 'Moments', icon: 'moments' },
];

const GLASS: React.CSSProperties = {
  background: 'rgba(3,10,6,0.36)',
  border: 'none',
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
    position: 'relative', width: 44, height: 44, borderRadius: 15, flexShrink: 0, padding: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
    color: active ? T.mintText : T.text,
    ...GLASS,
    ...(active ? { background: 'rgba(123,227,168,0.12)', border: 'none'} : {}),
    transition: 'background 200ms ease, border-color 200ms ease, color 200ms ease',
  };
  const inner = (
    <>
      <Icon name={icon} size={22} strokeWidth={1.9} />
      {dot && <span aria-hidden style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 2, background: T.mint, boxShadow: '0 0 0 2px rgba(3,8,6,0.9)' }} />}
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
  active, actions, back, tabs = false, plain = false, center, transparent = false,
}: {
  /** Never draw a header band (pages with a full-bleed image at the top, like an event's flyer): just the floating buttons */
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
  /** Pages with their own big title and search: no wordmark and no header search, just menu + profile */
  plain?: boolean;
  /** Something to show in the middle of the header instead of the wordmark (e.g. Artists | Shows switch) */
  center?: ReactNode;
}) {
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const unread = useUnreadCount();
  const peek = useMenuPeek(menuOpen);
  const faces = useArtistPhotos(menuOpen ? FACE_SLUGS : NO_FACES);
  const [isMobile, setIsMobile] = useState(true);
  const [tabsHidden, setTabsHidden] = useState(false);
  // Once the page scrolls, the header turns into frosted green glass so content never reads through behind it
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

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


  const avatar = user ? (
    <Link href={unread ? '/notifications' : profileHref} aria-label={unread ? `My profile, ${unread} new notification${unread > 1 ? 's' : ''}` : 'My profile'} style={{ position: 'relative', overflow: 'visible', width: 44, height: 44, flexShrink: 0, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#26302B', color: '#D6FBE6', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600 }}>
      {profile?.avatar_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 15 }} />
        : (profile?.username?.[0] ?? 'U').toUpperCase()}
      {unread > 0 && <span aria-hidden style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 7, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7BE3A8', color: '#03130B', fontFamily: FONT.sans, fontSize: 10.5, fontWeight: 800, boxShadow: '0 0 0 2px rgba(3,8,6,0.9)' }}>{unread > 9 ? '9+' : unread}</span>}
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
          padding: `calc(14px + env(safe-area-inset-top, 0px)) 16px ${scrolled ? 14 : 28}px`,
          background: transparent ? 'none' : scrolled
            ? 'linear-gradient(180deg, rgba(16,34,25,0.86) 0%, rgba(12,26,19,0.86) 100%)'
            : 'linear-gradient(to bottom, rgba(3,8,6,0.42) 0%, rgba(3,8,6,0.16) 60%, rgba(3,8,6,0) 100%)',
          backdropFilter: scrolled && !transparent ? 'blur(18px) saturate(140%)' : undefined,
          WebkitBackdropFilter: scrolled && !transparent ? 'blur(18px) saturate(140%)' : undefined,
          transition: 'background 220ms ease, padding 220ms ease',
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
        {center && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(14px + env(safe-area-inset-top, 0px))', height: 44, display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
            {center}
          </div>
        )}
        {isMobile && !actions && !plain && !center && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(14px + env(safe-area-inset-top, 0px))', height: 44, display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
            <Wordmark />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {actions ?? (plain ? null : <HeaderIconButton label="Search events" icon="search" onClick={() => setSearching(true)} />)}
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
              background: 'rgba(8,24,16,0.55)', border: 'none',
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
              background: GROUND,
              boxShadow: '30px 0 80px rgba(0,0,0,0.5)',
              transform: menuShown ? 'translateX(0)' : 'translateX(-104%)', transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
              <Wordmark />
              <HeaderIconButton label="Close menu" icon="close" onClick={() => setMenuOpen(false)} />
            </div>

            {user && (
              <Link href={profileHref} onClick={() => setMenuOpen(false)} style={{ ...stagger(0), display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, textDecoration: 'none' }}>
                <span style={{ width: 42, height: 42, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(123,227,168,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D6FBE6', fontFamily: FONT.display, fontSize: 16, fontWeight: 800 }}>
                  {profile?.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile?.username?.[0] ?? 'U').toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT.display, fontSize: 15.5, fontWeight: 700, color: T.white }}>{profile?.full_name || profile?.username}</span>
                  <span style={{ display: 'block', marginTop: 1, fontFamily: FONT.sans, fontSize: 13, color: T.text3 }}>View profile</span>
                </span>
              </Link>
            )}

            {/* Where to go, each with a glimpse of what's inside: flyers, tonight's count, a clip, faces */}
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column' }}>
              {([
                ...(new Date() < new Date('2027-01-06') ? [{ href: '/december', label: 'December', hint: peek?.bigNights ? `${peek.bigNights} big nights this season` : 'The big nights this season', peek: 'flyers' }] : []),
                { href: '/events', label: 'Events', hint: 'Every show, by date', peek: 'count' },
                { href: '/moments', label: 'Moments', hint: 'Clips from past nights', peek: 'clip' },
                { href: '/artists', label: 'Artists', hint: 'Who’s playing where', peek: 'faces' },
              ] as { href: string; label: string; hint: string; peek: 'flyers' | 'count' | 'clip' | 'faces' }[]).map((l, i) => {
                const on = active === l.label;
                return (
                  <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} aria-current={on ? 'page' : undefined}
                    style={{ ...stagger(i + 1), display: 'flex', alignItems: 'center', gap: 14, minHeight: 76, padding: '8px 0', textDecoration: 'none' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 27, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1, color: T.white, ...(on ? { background: GRAD.mint, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}) }}>{l.label}</span>
                      <span style={{ display: 'block', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT.sans, fontSize: 13.5, color: on ? T.mintText : T.text3 }}>{l.hint}</span>
                    </span>
                    {l.peek === 'flyers' && peek?.flyers.length ? (
                      <span aria-hidden style={{ display: 'flex', flexShrink: 0 }}>
                        {peek.flyers.map((f, k) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={f} src={f} alt="" style={{ width: 40, height: 52, borderRadius: 9, objectFit: 'cover', marginLeft: k ? -14 : 0, transform: `rotate(${(k - 1) * 6}deg)`, boxShadow: '0 6px 16px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(10,14,12,0.9)', position: 'relative', zIndex: k === 1 ? 2 : 1 }} />
                        ))}
                      </span>
                    ) : null}
                    {l.peek === 'count' && peek?.shows ? (
                      <span style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ display: 'block', fontFamily: FONT.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: T.mint }}>{peek.shows.n}</span>
                        <span style={{ display: 'block', marginTop: 3, fontFamily: FONT.sans, fontSize: 11.5, fontWeight: 600, color: T.text3 }}>{peek.shows.when}</span>
                      </span>
                    ) : null}
                    {l.peek === 'clip' && peek?.clip ? (
                      <span aria-hidden style={{ position: 'relative', width: 78, height: 50, borderRadius: 11, overflow: 'hidden', flexShrink: 0, boxShadow: '0 6px 16px rgba(0,0,0,0.4)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://i.ytimg.com/vi/${peek.clip}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                          <span style={{ width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint }}><Icon name="play" size={11} /></span>
                        </span>
                      </span>
                    ) : null}
                    {l.peek === 'faces' && FACE_SLUGS.some((f) => faces[f]) ? (
                      <span aria-hidden style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {FACE_SLUGS.filter((f) => faces[f]).map((f, k) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={f} src={faces[f]!} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginLeft: k ? -10 : 0, boxShadow: '0 0 0 2px #0B110E', position: 'relative', zIndex: 5 - k }} />
                        ))}
                        {peek?.artists && peek.artists > FACE_SLUGS.length && <span style={{ marginLeft: 8, fontFamily: FONT.sans, fontSize: 12.5, fontWeight: 700, color: T.text2 }}>+{peek.artists - FACE_SLUGS.length}</span>}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            {/* The rest, quieter */}
            <div style={{ ...stagger(6), display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginTop: 10 }}>
              {[{ href: '/', label: 'Discover' }, { href: '/calendars', label: 'Calendars' }, { href: '/shows', label: 'Shows' }].map((l) => (
                <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} aria-current={active === l.label ? 'page' : undefined}
                  style={{ padding: '8px 0', textDecoration: 'none', fontFamily: FONT.display, fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: active === l.label ? T.mint : 'rgba(255,255,255,0.82)' }}>
                  {l.label}
                </Link>
              ))}
            </div>

            {user && (
              <div style={{ ...stagger(9), marginTop: 30 }}>
                <p style={{ margin: '0 0 4px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>You</p>
                {([
                  { label: 'Notifications', href: '/notifications', icon: 'bell', count: unread },
                  { label: 'My tickets', href: '/account/tickets', icon: 'ticket' },
                  { label: 'Saved events', href: `/u/${profile?.username ?? ''}?tab=saved`, icon: 'bookmark' },
                  { label: 'Find friends', href: '/people', icon: 'friends' },
                  { label: 'Organizer dashboard', href: '/organizer/dashboard', icon: 'dashboard' },
                ] as { label: string; href: string; icon: IconName; count?: number }[]).map((l) => (
                  <Link key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, textDecoration: 'none', fontFamily: FONT.sans, fontSize: 15.5, fontWeight: 500, color: active === l.label ? T.mint : 'rgba(255,255,255,0.86)' }}>
                    <Icon name={l.icon} size={19} color="rgba(255,255,255,0.5)" />
                    <span style={{ flex: 1 }}>{l.label}</span>
                    {!!l.count && <span style={{ minWidth: 22, height: 22, padding: '0 7px', borderRadius: 8, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: GRAD.mint, color: T.onMint, fontFamily: FONT.sans, fontSize: 12, fontWeight: 800 }}>{l.count > 9 ? '9+' : l.count}</span>}
                  </Link>
                ))}
              </div>
            )}

            <div style={{ ...stagger(10), marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/organisers" onClick={() => setMenuOpen(false)} style={{ height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                <Icon name="plus" size={18} strokeWidth={2} /> List an event
              </Link>
              {user ? (
                <button type="button" onClick={() => { signOut(); setMenuOpen(false); }} style={{ height: 48, borderRadius: 999, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontFamily: FONT.sans, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                  Sign out
                </button>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} style={{ height: 48, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
      {searching && <SearchSheet onClose={() => setSearching(false)} />}
    </>
  );
}
