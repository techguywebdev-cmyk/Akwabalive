'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/AuthProvider';
import Wordmark from '@/components/brand/Wordmark';
import { Icon } from '@/components/ui/Icon';
import { BTN } from '@/components/events/CardParts';
import { parseDay, longDay } from '@/lib/dates';
import { T, FONT, GROUND } from '@/lib/thiscene';

type Verify = {
  valid: boolean; reason: string; event_title?: string; event_slug?: string; event_date?: string; event_venue?: string;
  image?: string | null; tier?: string; quantity?: number; holder?: string; status?: string; checked_in_at?: string | null; can_check_in?: boolean;
};

const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * What a ticket's QR code opens. Anyone sees whether the ticket is genuine; the event's
 * organiser (signed in) gets a button to check it in, once.
 */
export default function TicketScanPage({ params, searchParams }: { params: { id: string }; searchParams: { k?: string } }) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [v, setV] = useState<Verify | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    supabase.rpc('verify_ticket', { p_id: params.id, p_key: searchParams.k ?? '' }).then(({ data, error }) => {
      setV(error ? { valid: false, reason: 'unavailable' } : (data as Verify));
    });
  }, [authLoading, user, params.id, searchParams.k, supabase]);

  async function checkIn() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('check_in_ticket', { p_id: params.id, p_key: searchParams.k ?? '' });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (data?.ok) setV((x) => x && { ...x, status: 'used', reason: 'already_used', checked_in_at: data.checked_in_at, can_check_in: true, valid: true });
    else setMsg(data?.reason === 'already_used' ? `Already checked in at ${time(data.checked_in_at)}.` : data?.reason === 'not_organiser' ? 'Only the event organiser can check tickets in.' : 'Could not check this ticket in.');
  }

  const used = v?.status === 'used';
  const ok = !!v?.valid && !used;
  const d = parseDay(v?.event_date);
  const tone = !v ? T.text2 : ok ? T.mint : used ? '#F5C451' : T.danger;
  const title = !v ? 'Checking ticket…'
    : v.reason === 'unavailable' ? 'Can’t check right now'
    : !v.valid && v.reason === 'not_recognised' ? 'Not a valid ticket'
    : used ? 'Already checked in'
    : ok ? 'Valid ticket' : `Ticket ${v.reason}`;

  return (
    <div style={{ minHeight: '100svh', background: GROUND }}>
      <header style={{ display: 'flex', justifyContent: 'center', padding: 'calc(18px + env(safe-area-inset-top, 0px)) 16px 0' }}><Wordmark /></header>
      <main style={{ maxWidth: 440, margin: '0 auto', padding: '32px 20px 40px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', background: `${tone}22`, color: tone }}>
          <Icon name={!v ? 'clock' : ok ? 'check' : used ? 'ticket' : 'close'} size={44} strokeWidth={2} />
        </span>
        <h1 style={{ margin: '18px 0 0', fontFamily: FONT.display, fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: T.white }}>{title}</h1>
        {used && v?.checked_in_at && <p style={{ margin: '6px 0 0', fontFamily: FONT.sans, fontSize: 15, color: T.text2 }}>Checked in at {time(v.checked_in_at)}</p>}
        {v?.reason === 'not_recognised' && <p style={{ margin: '8px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>This QR code wasn’t issued by Akwaaba, or it has been changed.</p>}

        {v?.event_title && (
          <section style={{ marginTop: 26, padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
            <p style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.white }}>{v.event_title}</p>
            <p style={{ margin: '4px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.text2 }}>{[d ? longDay(d) : v.event_date, v.event_venue].filter(Boolean).join(' · ')}</p>
            <dl style={{ margin: '16px 0 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Name', v.holder || '—'], ['Ticket', `${v.tier}${(v.quantity ?? 1) > 1 ? ` × ${v.quantity}` : ''}`]].map(([k, val]) => (
                <div key={k}>
                  <dt style={{ fontFamily: FONT.sans, fontSize: 12, color: T.text3 }}>{k}</dt>
                  <dd style={{ margin: '3px 0 0', fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: T.white }}>{val}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {v?.can_check_in && ok && (
          <button type="button" onClick={checkIn} disabled={busy} style={{ ...BTN.primary, width: '100%', marginTop: 20, height: 56, fontSize: 16 }}>
            {busy ? 'Checking in…' : `Check in${(v.quantity ?? 1) > 1 ? ` ${v.quantity} people` : ''}`}
          </button>
        )}
        {v?.valid && !v.can_check_in && !user && (
          <Link href={`/auth?next=${encodeURIComponent(`/t/${params.id}?k=${searchParams.k ?? ''}`)}`} style={{ ...BTN.secondary, width: '100%', marginTop: 20, boxSizing: 'border-box' }}>Organiser? Sign in to check in</Link>
        )}
        {msg && <p role="alert" style={{ margin: '14px 0 0', fontFamily: FONT.sans, fontSize: 14, color: T.danger }}>{msg}</p>}
      </main>
    </div>
  );
}
