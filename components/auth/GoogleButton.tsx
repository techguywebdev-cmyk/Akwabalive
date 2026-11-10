'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  prompt: () => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('');

/** Is the on-site Google button available (client ID set)? */
export const hasGoogleButton = !!CLIENT_ID;

/**
 * Google's own sign-in button, running on tsacoal.com, so Google's screen says "Sign in to tsacoal.com".
 * The Google token is handed to Supabase (signInWithIdToken); onSignedIn runs after.
 */
export default function GoogleButton({ onSignedIn, onError }: { onSignedIn: () => void; onError: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let live = true;
    const start = async () => {
      if (!live || !box.current || !window.google) return;
      const raw = crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`;
      const hashed = await sha256(raw);
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        ux_mode: 'popup',
        // One Tap: people already signed in to Google get their account offered straight away
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        context: 'signin',
        itp_support: true,
        callback: async (r: { credential?: string }) => {
          if (!r.credential) { onError('Google didn’t send a sign-in. Please try again.'); return; }
          const { error } = await createClient().auth.signInWithIdToken({ provider: 'google', token: r.credential, nonce: raw });
          if (error) onError(error.message); else onSignedIn();
        },
      });
      const w = Math.min(400, Math.max(240, Math.round(box.current.getBoundingClientRect().width)));
      window.google.accounts.id.renderButton(box.current, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', width: w });
      setReady(true);
      window.google.accounts.id.prompt();
    };
    if (window.google) { start(); return () => { live = false; }; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => { start(); };
    s.onerror = () => onError('Couldn’t load Google sign-in. Check your connection.');
    document.head.appendChild(s);
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', marginTop: 18, minHeight: 44, display: 'flex', justifyContent: 'center' }}>
      {!ready && <div className="ak-sk" style={{ position: 'absolute', inset: 0, borderRadius: 999 }} />}
      <div ref={box} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
    </div>
  );
}
