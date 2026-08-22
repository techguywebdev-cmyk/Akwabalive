'use client';

import Link from 'next/link';
import { MessageCircle, Ticket, Users } from 'lucide-react';
import { C, formatCount } from './types';

interface MomentActionsProps {
  commentCount: number;
  eventSlug: string | null;
  attendeeCount?: number;
  price?: number | null;
  onComments: () => void;
  /** Distance from bottom — raise when chapters are visible */
  bottom?: number;
}

function Pill({
  icon,
  label,
  sub,
  onClick,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: accent ? 'rgba(200,146,42,0.28)' : 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${accent ? 'rgba(200,146,42,0.55)' : 'rgba(255,255,255,0.16)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}
      >
        {icon}
      </div>
      <div style={{ textAlign: 'center', maxWidth: 72 }}>
        <div
          style={{
            fontFamily: 'var(--font-inter,sans-serif)',
            fontSize: 11,
            fontWeight: 600,
            color: accent ? C.gold : '#FFFEF8',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: 'var(--font-dm-mono,monospace)',
              fontSize: 8,
              color: 'rgba(255,250,240,0.55)',
              marginTop: 2,
              letterSpacing: '0.5px',
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </>
  );

  const wrapStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  };

  if (href) {
    return (
      <Link href={href} style={wrapStyle}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} style={wrapStyle}>
      {inner}
    </button>
  );
}

function formatPrice(price: number) {
  if (price <= 0) return 'Free';
  return `₵${price}`;
}

export default function MomentActions({
  commentCount,
  eventSlug,
  attendeeCount = 0,
  price,
  onComments,
  bottom = 220,
}: MomentActionsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        bottom,
        zIndex: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Pill
        icon={<Users size={18} style={{ color: '#FFFEF8' }} strokeWidth={1.75} />}
        label={attendeeCount > 0 ? formatCount(attendeeCount) : '—'}
        sub="Going"
      />

      <Pill
        icon={<MessageCircle size={18} style={{ color: '#FFFEF8' }} strokeWidth={1.75} />}
        label={formatCount(commentCount)}
        sub="Chat"
        onClick={onComments}
      />

      {eventSlug && (
        <Pill
          icon={<Ticket size={18} style={{ color: C.gold }} strokeWidth={1.75} />}
          label="Tickets"
          sub={price == null ? 'Buy' : formatPrice(price)}
          href={`/events/${eventSlug}`}
          accent
        />
      )}
    </div>
  );
}
