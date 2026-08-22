'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { C } from './types';

const LINKS = [
  { href: '/', label: 'Discover' },
  { href: '/events', label: 'Events' },
  { href: '/moments', label: 'Moments' },
  { href: '/account/tickets', label: 'My Tickets' },
  { href: '/organizer/dashboard', label: 'Organizer' },
];

export default function MenuSheet({
  onClose,
  username,
}: {
  onClose: () => void;
  username?: string | null;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 'min(82vw, 320px)',
          height: '100%',
          background: '#0D0B08',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          padding: '18px 16px',
          paddingTop: 'calc(18px + env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-syne,sans-serif)',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '3px',
              color: '#F5ECD7',
            }}
          >
            AK<span style={{ color: C.gold }}>W</span>AABA
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F5ECD7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 11,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(245,236,215,0.7)',
              textDecoration: 'none',
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {l.label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto' }}>
          {username ? (
            <Link
              href={`/u/${username}`}
              onClick={onClose}
              style={{
                display: 'block',
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 10,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: C.gold,
                textDecoration: 'none',
                padding: '12px 0',
              }}
            >
              @{username}
            </Link>
          ) : (
            <Link
              href="/auth"
              onClick={onClose}
              style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: 'var(--font-dm-mono,monospace)',
                fontSize: 9,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#0D0B08',
                background: C.gold,
                textDecoration: 'none',
                padding: 14,
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
