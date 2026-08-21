'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Search, Share2, Ticket } from 'lucide-react';
import { C, formatCount } from './types';

interface GlassBtnProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

function GlassBtn({ icon, label, active, onClick, badge }: GlassBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: C.glass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${active ? 'rgba(200,146,42,0.5)' : C.glassBd}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              background: C.red,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: 7,
              color: '#fff',
              fontWeight: 700,
              padding: '0 3px',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>
        {label}
      </span>
    </button>
  );
}

interface MomentActionsProps {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  eventSlug: string | null;
  onLike: () => void;
  onComments: () => void;
  onSearch: () => void;
  onShare: () => void;
}

export default function MomentActions({
  liked,
  likeCount,
  commentCount,
  eventSlug,
  onLike,
  onComments,
  onSearch,
  onShare,
}: MomentActionsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 160,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <GlassBtn
        icon={
          <Heart
            size={20}
            fill={liked ? C.red : 'none'}
            style={{ color: liked ? C.red : C.cream }}
          />
        }
        label={formatCount(likeCount)}
        active={liked}
        onClick={onLike}
      />
      <GlassBtn
        icon={<MessageCircle size={20} style={{ color: C.cream }} />}
        label={formatCount(commentCount)}
        badge={commentCount}
        onClick={onComments}
      />
      <GlassBtn
        icon={<Search size={20} style={{ color: C.cream }} />}
        label="Search"
        onClick={onSearch}
      />
      <GlassBtn
        icon={<Share2 size={20} style={{ color: C.cream }} />}
        label="Share"
        onClick={onShare}
      />
      {eventSlug && (
        <Link
          href={`/events/${eventSlug}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: C.glass,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${C.glassBd}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <Ticket size={20} style={{ color: C.gold }} />
          </div>
          <span style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 10, color: C.c3 }}>
            Tickets
          </span>
        </Link>
      )}
    </div>
  );
}
