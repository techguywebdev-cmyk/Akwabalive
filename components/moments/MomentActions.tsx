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

function ActionBtn({ icon, label, active, onClick, badge }: GlassBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: active ? 'rgba(200,146,42,0.25)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${active ? 'rgba(200,146,42,0.55)' : 'rgba(255,255,255,0.18)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: C.red,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: 8,
              color: '#fff',
              fontWeight: 700,
              padding: '0 3px',
              border: '1.5px solid rgba(0,0,0,0.4)',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </div>
        )}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-inter,sans-serif)',
          fontSize: 10,
          fontWeight: 500,
          color: 'rgba(255,250,240,0.9)',
          textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        }}
      >
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
        right: 10,
        bottom: 150,
        zIndex: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <ActionBtn
        icon={
          <Heart
            size={20}
            fill={liked ? C.red : 'none'}
            strokeWidth={liked ? 0 : 1.75}
            style={{ color: liked ? C.red : '#FFFEF8' }}
          />
        }
        label={formatCount(likeCount)}
        active={liked}
        onClick={onLike}
      />
      <ActionBtn
        icon={<MessageCircle size={20} strokeWidth={1.75} style={{ color: '#FFFEF8' }} />}
        label={formatCount(commentCount)}
        badge={commentCount}
        onClick={onComments}
      />
      <ActionBtn
        icon={<Search size={20} strokeWidth={1.75} style={{ color: '#FFFEF8' }} />}
        label="Search"
        onClick={onSearch}
      />
      <ActionBtn
        icon={<Share2 size={20} strokeWidth={1.75} style={{ color: '#FFFEF8' }} />}
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
            gap: 3,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(200,146,42,0.3)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(200,146,42,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            <Ticket size={18} style={{ color: C.gold }} />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-inter,sans-serif)',
              fontSize: 10,
              fontWeight: 500,
              color: C.gold,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            Tickets
          </span>
        </Link>
      )}
    </div>
  );
}
