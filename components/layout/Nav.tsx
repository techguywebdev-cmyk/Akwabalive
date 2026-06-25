'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  const [scrolled,   setScrolled]   = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

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
        {/* Logo */}
        <Link href="/" style={{
          fontFamily: 'var(--font-syne, sans-serif)',
          fontSize: 16, fontWeight: 800,
          letterSpacing: '4px', textTransform: 'uppercase',
          color: '#F5ECD7', textDecoration: 'none', flexShrink: 0,
        }}>
          AK<span style={{ color: '#C8922A' }}>W</span>AABA
        </Link>

        {/* Desktop links — hidden on mobile */}
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

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {!isMobile && (
            <Link href="#" style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase',
              color: 'rgba(245,236,215,0.35)', textDecoration: 'none',
            }}>
              Sign in
            </Link>
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

          {/* Hamburger — mobile only */}
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
              <span style={{ display: 'block', width: 20, height: 1.5, background: 'rgba(245,236,215,0.6)', transition: 'all 280ms', transform: mobileOpen ? 'rotate(45deg) translate(0px, 0px)' : 'none' }} />
              <span style={{ display: 'block', width: 20, height: 1.5, background: mobileOpen ? 'transparent' : 'rgba(245,236,215,0.6)', transition: 'all 280ms' }} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileOpen && isMobile && (
        <div style={{
          position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
          background: '#0D0B08', zIndex: 190,
          padding: '24px 20px', display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
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
                transition: 'color 180ms',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="#" style={{
              textAlign: 'center',
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
              border: '1px solid rgba(245,236,215,0.15)',
              color: 'rgba(245,236,215,0.55)',
              padding: '14px', borderRadius: 6, textDecoration: 'none',
            }}>
              Sign in
            </Link>
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
