'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/AuthProvider';

const LINKS = [
  { href: '/',       label: 'Discover' },
  { href: '/events', label: 'Events'   },
  { href: '#',       label: 'Live',    live: true },
  { href: '#',       label: 'Moments' },
  { href: '#',       label: 'Cities'  },
];

export default function Nav({
  transparent = false,
  active,
}: {
  transparent?: boolean;
  active?: string;
}) {
  const { user, profile, signOut } = useAuth();
  const [scrolled,   setScrolled]   = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!transparent) return;
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [transparent]);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 62,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: scrolled ? 'rgba(13,11,8,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,236,215,0.07)' : 'none',
        transition: 'background 300ms, border-color 300ms',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontSize: 16, fontWeight: 800,
          letterSpacing: '4px', textTransform: 'uppercase',
          color: '#F5ECD7', textDecoration: 'none', flexShrink: 0,
        }}>
          AK<span style={{ color: '#C8922A' }}>W</span>AABA
        </Link>

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {LINKS.map(link => (
              <Link key={link.label} href={link.href} style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase',
                color: active === link.label ? '#C8922A' : 'rgba(245,236,215,0.35)',
                padding: '0 16px', lineHeight: '62px', display: 'block',
                textDecoration: 'none', transition: 'color 180ms',
              }}>
                {link.label}
                {link.live && (
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#CE1126', marginLeft: 5, verticalAlign: 'middle', animation: 'blink 1.4s ease-in-out infinite' }} />
                )}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {!isMobile && (
            user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(245,236,215,0.05)', border: '1px solid rgba(245,236,215,0.1)',
                    borderRadius: 20, padding: '5px 12px 5px 5px', cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#C8922A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 11, fontWeight: 700, color: '#0D0B08', overflow: 'hidden' }}>
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (profile?.username?.[0] ?? 'U').toUpperCase()
                    }
                  </div>
                  <span style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, color: 'rgba(245,236,215,0.6)' }}>
                    @{profile?.username ?? '...'}
                  </span>
                </button>
                {menuOpen && (
                  <>
                    <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                    <div style={{
                      position: 'absolute', top: 44, right: 0, zIndex: 2,
                      background: '#141109', border: '1px solid rgba(245,236,215,0.1)',
                      borderRadius: 10, padding: 6, minWidth: 180,
                      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    }}>
                      {[
                        { label: 'My Profile',  href: `/u/${profile?.username ?? ''}` },
                        { label: 'My Tickets',  href: '/account/tickets' },
                        { label: 'Dream Events', href: '/account/dream-events' },
                      ].map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{
                          display: 'block', padding: '9px 12px', borderRadius: 6,
                          fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: 'rgba(245,236,215,0.8)',
                          textDecoration: 'none',
                        }}>
                          {item.label}
                        </Link>
                      ))}
                      <div style={{ height: 1, background: 'rgba(245,236,215,0.07)', margin: '4px 0' }} />
                      <button onClick={() => { signOut(); setMenuOpen(false); }} style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 6,
                        fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: '#f87171',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/auth" style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase',
                color: 'rgba(245,236,215,0.35)', textDecoration: 'none',
              }}>
                Sign in
              </Link>
            )
          )}
          <button style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase',
            background: '#C8922A', color: '#0D0B08',
            border: 'none', padding: '9px 16px', borderRadius: 5,
            cursor: 'pointer', fontWeight: 700, flexShrink: 0,
          }}>
            {isMobile ? '+ List' : '+ List Event'}
          </button>

          {isMobile && (
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                gap: 5, width: 36, height: 36,
                background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                flexShrink: 0,
              }}
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: 20, height: 1.5, background: mobileOpen ? 'transparent' : 'rgba(245,236,215,0.6)', transition: 'all 280ms' }} />
              <span style={{ display: 'block', width: 20, height: 1.5, background: 'rgba(245,236,215,0.6)', transition: 'all 280ms', transform: mobileOpen ? 'rotate(45deg)' : 'none' }} />
              <span style={{ display: 'block', width: 20, height: 1.5, background: mobileOpen ? 'transparent' : 'rgba(245,236,215,0.6)', transition: 'all 280ms' }} />
            </button>
          )}
        </div>
      </nav>

      {mobileOpen && isMobile && (
        <div style={{
          position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
          background: '#0D0B08', zIndex: 190,
          padding: '24px 20px', display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 20px', borderBottom: '1px solid rgba(245,236,215,0.07)', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#C8922A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-syne,sans-serif)', fontSize: 15, fontWeight: 700, color: '#0D0B08' }}>
                {(profile?.username?.[0] ?? 'U').toUpperCase()}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: '#F5ECD7', fontWeight: 600 }}>{profile?.full_name}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 10, color: 'rgba(245,236,215,0.4)' }}>@{profile?.username}</p>
              </div>
            </div>
          )}
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase',
                color: active === link.label ? '#C8922A' : 'rgba(245,236,215,0.55)',
                padding: '16px 0',
                borderBottom: '1px solid rgba(245,236,215,0.07)',
                textDecoration: 'none', display: 'block',
              }}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <Link href={`/u/${profile?.username ?? ''}`} onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.55)', padding: '16px 0', borderBottom: '1px solid rgba(245,236,215,0.07)', textDecoration: 'none', display: 'block' }}>
                My Profile
              </Link>
              <Link href="/account/tickets" onClick={() => setMobileOpen(false)} style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'rgba(245,236,215,0.55)', padding: '16px 0', borderBottom: '1px solid rgba(245,236,215,0.07)', textDecoration: 'none', display: 'block' }}>
                My Tickets
              </Link>
            </>
          )}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {user ? (
              <button onClick={() => { signOut(); setMobileOpen(false); }} style={{
                textAlign: 'center', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
                border: '1px solid rgba(206,17,38,0.25)', color: '#f87171', padding: 14, borderRadius: 6, background: 'none', cursor: 'pointer',
              }}>
                Sign out
              </button>
            ) : (
              <Link href="/auth" onClick={() => setMobileOpen(false)} style={{
                textAlign: 'center', fontFamily: 'var(--font-dm-mono, monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
                border: '1px solid rgba(245,236,215,0.15)', color: 'rgba(245,236,215,0.55)', padding: 14, borderRadius: 6, textDecoration: 'none',
              }}>
                Sign in
              </Link>
            )}
            <button style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
              background: '#C8922A', color: '#0D0B08',
              border: 'none', padding: 14, borderRadius: 6,
              cursor: 'pointer', fontWeight: 700,
            }}>
              + List Event
            </button>
          </div>
        </div>
      )}
    </>
  );
                    }
