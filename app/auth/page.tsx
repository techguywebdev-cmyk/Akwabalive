'use client';

import { Suspense, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Wordmark from '@/components/brand/Wordmark';
import { Icon } from '@/components/ui/Icon';
import { T, FONT, GROUND } from '@/lib/thiscene';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const label: CSSProperties = { display: 'block', margin: '0 0 7px 4px', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.text2 };
const field: CSSProperties = {
  width: '100%', height: 54, padding: '0 18px', borderRadius: 16, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
  fontFamily: FONT.sans, fontSize: 16, color: T.white,
};

/** Where to go after signing in: ?next=/path (same site only) */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function AuthForm() {
  const router = useRouter();
  const q = useSearchParams();
  const supabase = createClient();
  const next = safeNext(q.get('next'));

  const [mode, setMode] = useState<Mode>(q.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Coming back from the "reset password" email
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setMode('reset'); });
    if (q.get('mode') === 'reset') setMode('reset');
    return () => data.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (m: Mode) => { setMode(m); setError(''); setInfo(''); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw new Error(err.message === 'Invalid login credentials' ? 'That email and password don’t match.' : err.message);
        router.replace(next); router.refresh();
        return;
      }

      if (mode === 'signup') {
        const handle = username.trim().toLowerCase();
        if (handle.length < 3) throw new Error('Pick a username with at least 3 letters or numbers.');
        const { data: taken } = await supabase.from('profiles').select('username').eq('username', handle).maybeSingle();
        if (taken) throw new Error('That username is taken. Try another.');
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim(), username: handle }, emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}` },
        });
        if (err) throw new Error(err.message);
        if (!data.user) throw new Error('Could not create your account. Please try again.');
        // Profile row is made by a database trigger; this is a backup
        for (let i = 0; i < 3; i++) {
          await new Promise((r) => setTimeout(r, 400 * (i + 1)));
          const { error: pe } = await supabase.from('profiles').upsert({ id: data.user.id, username: handle, full_name: fullName.trim() }, { onConflict: 'id' });
          if (!pe) break;
        }
        if (!data.session) { setInfo(`We sent a link to ${email.trim()}. Open it to finish signing up.`); return; }
        router.replace(next); router.refresh();
        return;
      }

      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth?mode=reset` });
        if (err) throw new Error(err.message);
        setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
        return;
      }

      if (mode === 'reset') {
        if (password.length < 6) throw new Error('Use at least 6 characters.');
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw new Error(err.message);
        setInfo('Password updated. Taking you in…');
        setTimeout(() => { router.replace(next); router.refresh(); }, 900);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const heading = { signin: 'Welcome back', signup: 'Join Akwaaba', forgot: 'Reset your password', reset: 'Set a new password' }[mode];
  const sub = {
    signin: 'Your tickets, plans and friends, all in one place.',
    signup: 'Find every event in Ghana, see who’s going and keep your tickets on your phone.',
    forgot: 'Enter your email and we’ll send you a link.',
    reset: 'Choose a new password for your account.',
  }[mode];
  const cta = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save password' }[mode];

  return (
    <div style={{ minHeight: '100svh', background: GROUND, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 0' }}>
        <Link href={next} aria-label="Back" style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,6,0.38)', border: '1px solid rgba(255,255,255,0.12)', color: T.white }}>
          <Icon name="arrowLeft" size={22} />
        </Link>
        <Wordmark />
        <span style={{ width: 44 }} />
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 440, margin: '0 auto', padding: '40px 20px calc(32px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(34px, 9vw, 44px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>{heading}</h1>
        <p style={{ margin: '12px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>{sub}</p>

        {(mode === 'signin' || mode === 'signup') && (
          <div role="tablist" aria-label="Sign in or sign up" style={{ display: 'flex', marginTop: 28, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => go(m)} style={{ flex: 1, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, background: mode === m ? T.white : 'transparent', color: mode === m ? T.onMint : T.text2, transition: 'background 200ms ease, color 200ms ease' }}>
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="name" style={label}>Your name</label>
                <input id="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ama Mensah" style={field} />
              </div>
              <div>
                <label htmlFor="username" style={label}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontFamily: FONT.sans, fontSize: 16, color: T.text3 }}>@</span>
                  <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required minLength={3} maxLength={24} placeholder="amamensah" style={{ ...field, paddingLeft: 36 }} />
                </div>
              </div>
            </>
          )}

          {mode !== 'reset' && (
            <div>
              <label htmlFor="email" style={label}>Email</label>
              <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={field} />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label htmlFor="password" style={label}>{mode === 'reset' ? 'New password' : 'Password'}</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => go('forgot')} style={{ marginRight: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText }}>Forgot?</button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input id="password" type={show ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'} style={{ ...field, paddingRight: 58 }} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 6, width: 42, height: 42, borderRadius: 12, border: 'none', background: 'transparent', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={show ? 'eye' : 'lock'} size={19} />
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ margin: 0, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,138,138,0.1)', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.danger }}>{error}</p>}
          {info && <p role="status" style={{ margin: 0, padding: '12px 14px', borderRadius: 14, background: 'rgba(123,227,168,0.1)', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.mintText }}>{info}</p>}

          <button type="submit" disabled={busy} style={{ marginTop: 6, height: 54, borderRadius: 999, border: 'none', cursor: busy ? 'wait' : 'pointer', background: T.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 16, fontWeight: 700, opacity: busy ? 0.7 : 1, boxShadow: '0 8px 24px rgba(123,227,168,0.22)' }}>
            {busy ? 'One moment…' : cta}
          </button>

          {mode === 'signup' && (
            <p style={{ margin: 0, textAlign: 'center', fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.5, color: T.text3 }}>
              By signing up you agree to Akwaaba’s terms and privacy policy.
            </p>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" onClick={() => go('signin')} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, color: T.mintText }}>
              Back to sign in
            </button>
          )}
        </form>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100svh', background: GROUND }} />}>
      <AuthForm />
    </Suspense>
  );
}
