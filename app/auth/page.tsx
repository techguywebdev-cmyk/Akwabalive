'use client';

import { Suspense, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FlyerWall from '@/components/ui/FlyerWall';
import { createClient } from '@/lib/supabase/client';
import Wordmark from '@/components/brand/Wordmark';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, AtSign } from 'lucide-react';
import { hiRes } from '@/lib/events/image';
import { T, FONT, GROUND, GRAD } from '@/lib/thiscene';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset' | 'pick';

const label: CSSProperties = { display: 'block', margin: '0 0 8px 2px', fontFamily: FONT.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3 };
const field: CSSProperties = {
  width: '100%', height: 54, padding: '0 16px 0 46px', borderRadius: 16, boxSizing: 'border-box',
  background: '#0D1210', border: 'none', outline: 'none',
  fontFamily: FONT.sans, fontSize: 16, color: T.white, transition: 'border-color 160ms ease, box-shadow 160ms ease',
};
const fieldIcon: CSSProperties = { position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none', display: 'flex' };

/** A wall of real flyers from what's on, at the top */
function FlyerFan() {
  const [flyers, setFlyers] = useState<string[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    createClient().from('events').select('image_url, is_hot, is_featured').eq('status', 'published').gte('date', today).not('image_url', 'is', null)
      .order('is_hot', { ascending: false }).order('date', { ascending: true }).limit(10)
      .then(({ data }) => setFlyers(((data ?? []) as { image_url: string }[]).map((r) => hiRes(r.image_url, 360) ?? r.image_url)));
  }, []);
  return (
    <div aria-hidden style={{ position: 'relative', height: 'calc(min(66vw, 320px) + 60px + env(safe-area-inset-top, 0px))' }}>
      <FlyerWall images={flyers} height="100%" />
    </div>
  );
}

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

  // Back from Google or an emailed sign-in link: new people pick a username, everyone else carries on
  useEffect(() => {
    const external = q.get('via') === 'google' || q.get('via') === 'link';
    if (!external) return;
    const finish = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      const { data: p } = await supabase.from('profiles').select('username').eq('id', u.id).maybeSingle();
      if (!p?.username) {
        const guess = (u.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
        setUsername(guess); setMode('pick');
      } else { router.replace(next); router.refresh(); }
    };
    finish();
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN') finish(); });
    return () => data.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function google() {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?via=google&next=${encodeURIComponent(next)}` },
    });
    if (err) setError(/provider is not enabled|Unsupported provider/i.test(err.message) ? 'Google sign-in isn’t switched on yet. Use your email for now.' : err.message);
  }

  async function emailLink() {
    setError(''); setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Type your email first, then tap “Email me a sign-in link”.'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth?via=link&next=${encodeURIComponent(next)}` } });
    setBusy(false);
    if (err) setError(err.message); else setInfo(`Check ${email.trim()}: we sent you a link that signs you straight in.`);
  }

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

      if (mode === 'pick') {
        const handle = username.trim().toLowerCase();
        if (handle.length < 3) throw new Error('Pick a username with at least 3 letters or numbers.');
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) throw new Error('Your sign-in expired. Please try again.');
        const { data: taken } = await supabase.from('profiles').select('id').eq('username', handle).neq('id', u.id).maybeSingle();
        if (taken) throw new Error('That username is taken. Try another.');
        const meta = u.user_metadata ?? {};
        const { error: pe } = await supabase.from('profiles').upsert({ id: u.id, username: handle, full_name: meta.full_name ?? meta.name ?? null, avatar_url: meta.avatar_url ?? meta.picture ?? null }, { onConflict: 'id' });
        if (pe) throw new Error(pe.message);
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

  const heading = { signin: 'Welcome back', signup: 'Join Tsacoal', forgot: 'Reset your password', reset: 'Set a new password', pick: 'One last thing' }[mode];
  const sub = {
    signin: 'Your tickets, plans and friends, all in one place.',
    signup: 'Find every event in Ghana, see who’s going and keep your tickets on your phone.',
    forgot: 'Enter your email and we’ll send you a link.',
    reset: 'Choose a new password for your account.',
    pick: 'Pick a username so your friends can find you.',
  }[mode];
  const cta = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save password', pick: 'Continue' }[mode];

  return (
    <div style={{ minHeight: '100svh', background: GROUND, display: 'flex', flexDirection: 'column' }}>
      <style>{`.ak-field::placeholder{color:rgba(255,255,255,0.32)} .ak-field:focus{border-color:rgba(123,227,168,0.55)!important;box-shadow:0 0 0 4px rgba(123,227,168,0.08)} .ak-wrap:focus-within .ak-ic{color:${T.mint}!important}`}</style>
      <header style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 0' }}>
        <Link href={next} aria-label="Back" style={{ width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,6,6,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: 'none', color: T.white }}>
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        {/* On sign in / sign up the flyers fill the top, so the name sits with the heading instead */}
        {mode === 'forgot' || mode === 'reset' ? <Wordmark /> : <span />}
        <span style={{ width: 44 }} />
      </header>

      {/* The flyers run up behind the header */}
      {(mode === 'signin' || mode === 'signup') && <div style={{ marginTop: 'calc(-58px - env(safe-area-inset-top, 0px))', position: 'relative', zIndex: 1 }}><FlyerFan /></div>}

      <main style={{ flex: 1, width: '100%', maxWidth: 440, margin: '0 auto', padding: `${mode === 'signin' || mode === 'signup' ? 0 : 40}px 20px calc(32px + env(safe-area-inset-bottom, 0px))`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 4 }}>
        {(mode === 'signin' || mode === 'signup') && <span style={{ display: 'block', marginBottom: 14 }}><Wordmark size={15} /></span>}
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 'clamp(32px, 8.5vw, 42px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', color: T.white }}>{heading}</h1>
        <p style={{ margin: '10px 0 0', fontFamily: FONT.sans, fontSize: 15, lineHeight: 1.5, color: T.text2 }}>{sub}</p>

        {(mode === 'signin' || mode === 'signup') && (
          <div role="tablist" aria-label="Sign in or sign up" style={{ display: 'flex', marginTop: 24, padding: 4, borderRadius: 999, background: '#0D1210', border: 'none' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => go(m)} style={{ flex: 1, height: 42, borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, background: mode === m ? GRAD.mint : 'transparent', color: mode === m ? T.onMint : T.text2, fontWeight: 700, transition: 'background 200ms ease, color 200ms ease' }}>
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        {(mode === 'signin' || mode === 'signup') && (
          <>
            <button type="button" onClick={google}
              style={{ marginTop: 18, height: 50, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', color: T.white, fontFamily: FONT.display, fontSize: 15, fontWeight: 700 }}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontFamily: FONT.sans, fontSize: 12.5, color: T.text3 }}>or with your email</span>
              <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="name" style={label}>Your name</label>
                <div className="ak-wrap" style={{ position: 'relative' }}>
                  <span className="ak-ic" style={fieldIcon}><User size={18} /></span>
                  <input id="name" className="ak-field" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ama Mensah" style={field} />
                </div>
              </div>
              <div>
                <label htmlFor="username" style={label}>Username</label>
                <div className="ak-wrap" style={{ position: 'relative' }}>
                  <span className="ak-ic" style={fieldIcon}><AtSign size={18} /></span>
                  <input id="username" className="ak-field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required minLength={3} maxLength={24} placeholder="amamensah" style={field} />
                </div>
              </div>
            </>
          )}

          {mode === 'pick' && (
            <div>
              <label htmlFor="username" style={label}>Username</label>
              <div className="ak-wrap" style={{ position: 'relative' }}>
                <span className="ak-ic" style={fieldIcon}><AtSign size={18} /></span>
                <input id="username" className="ak-field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} required minLength={3} maxLength={24} placeholder="amamensah" style={field} />
              </div>
            </div>
          )}

          {mode !== 'reset' && mode !== 'pick' && (
            <div>
              <label htmlFor="email" style={label}>Email</label>
              <div className="ak-wrap" style={{ position: 'relative' }}>
                <span className="ak-ic" style={fieldIcon}><Mail size={18} /></span>
                <input id="email" className="ak-field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={field} />
              </div>
            </div>
          )}

          {mode !== 'forgot' && mode !== 'pick' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <label htmlFor="password" style={label}>{mode === 'reset' ? 'New password' : 'Password'}</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => go('forgot')} style={{ marginRight: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 13, fontWeight: 500, color: T.mintText }}>Forgot?</button>
                )}
              </div>
              <div className="ak-wrap" style={{ position: 'relative' }}>
                <span className="ak-ic" style={fieldIcon}><Lock size={18} /></span>
                <input id="password" className="ak-field" type={show ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'} style={{ ...field, paddingRight: 54 }} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 6, width: 42, height: 42, borderRadius: 12, border: 'none', background: 'transparent', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ margin: 0, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,138,138,0.1)', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.danger }}>{error}</p>}
          {info && <p role="status" style={{ margin: 0, padding: '12px 14px', borderRadius: 14, background: 'rgba(123,227,168,0.1)', fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.45, color: T.mintText }}>{info}</p>}

          <button type="submit" disabled={busy} style={{ marginTop: 6, height: 54, borderRadius: 999, border: 'none', cursor: busy ? 'wait' : 'pointer', background: GRAD.mint, color: T.onMint, fontFamily: FONT.display, fontSize: 16, fontWeight: 700, opacity: busy ? 0.7 : 1, boxShadow: '0 10px 30px rgba(123,227,168,0.18)' }}>
            {busy ? 'One moment…' : cta}
          </button>

          {mode === 'signin' && (
            <button type="button" onClick={emailLink} disabled={busy} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: T.mintText }}>
              No password? Email me a sign-in link
            </button>
          )}
          {mode === 'signup' && (
            <p style={{ margin: 0, textAlign: 'center', fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.5, color: T.text3 }}>
              By signing up you agree to Tsacoal’s <Link href="/terms" style={{ color: T.text2 }}>terms</Link> and <Link href="/privacy" style={{ color: T.text2 }}>privacy policy</Link>.
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
