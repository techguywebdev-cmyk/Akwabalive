'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  bg: '#0D0B08', bg2: '#141109', bg3: '#1C1710',
  gold: '#C8922A', goldDim: 'rgba(200,146,42,0.14)', goldBd: 'rgba(200,146,42,0.28)',
  cream: '#F5ECD7', c2: 'rgba(245,236,215,0.55)', c3: 'rgba(245,236,215,0.24)',
  bd: 'rgba(245,236,215,0.07)', red: '#CE1126',
};

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode,     setMode]     = useState<'signin' | 'signup'>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim() || username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }

        // Check username not taken
        const { data: existing } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .maybeSingle();

        if (existing) {
          setError('That username is already taken');
          setLoading(false);
          return;
        }

        // Create auth user — trigger creates profile row
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (!data.user) {
          setError('Could not create account. Please try again.');
          setLoading(false);
          return;
        }

        // Wait briefly for trigger to run, then upsert profile with username
        await new Promise(r => setTimeout(r, 600));

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username.toLowerCase(),
            full_name: fullName,
          }, { onConflict: 'id' });

        if (profileError) {
          // Account created but username not set — not fatal, user can update later
          console.warn('Profile update failed:', profileError.message);
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email, password,
        });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      let msg = 'Something went wrong. Please try again.';
      if (typeof err?.message === 'string' && err.message.trim()) msg = err.message;
      else if (typeof err === 'string') msg = err;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <Link href="/" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-syne,sans-serif)', fontSize: 20, fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase', color: C.cream }}>
            AK<span style={{ color: C.gold }}>W</span>AABA
          </span>
        </Link>

        <div style={{ background: C.bg2, border: `1px solid ${C.bd}`, borderRadius: 16, padding: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant,serif)', fontSize: 28, fontWeight: 400, color: C.cream, textAlign: 'center', marginBottom: 6 }}>
            {mode === 'signin' ? 'Welcome back' : 'Join Akwaaba'}
          </h1>
          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, textAlign: 'center', marginBottom: 24 }}>
            {mode === 'signin'
              ? 'Sign in to manage your tickets'
              : 'Create an account to start collecting moments'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.c3 }} />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '13px 14px 13px 40px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, outline: 'none' }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.c3, fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 14 }}>@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    minLength={3}
                    style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '13px 14px 13px 32px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, outline: 'none' }}
                  />
                </div>
              </>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.c3 }} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '13px 14px 13px 40px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, outline: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.c3 }} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', background: C.bg3, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '13px 14px 13px 40px', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 14, color: C.cream, outline: 'none' }}
              />
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#f87171', background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.25)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
                {error}
              </p>
            )}
            {success && (
              <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 12, color: '#4ade80', background: 'rgba(45,106,79,0.12)', border: '1px solid rgba(45,106,79,0.3)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
                {mode === 'signup' ? 'Account created! Taking you in…' : 'Welcome back! Signing you in…'}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || success}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: success ? '#2D6A4F' : C.gold,
                color: success ? '#fff' : '#0D0B08',
                border: 'none', padding: 14, borderRadius: 8,
                fontFamily: 'var(--font-dm-mono,monospace)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
                fontWeight: 700, cursor: (loading || success) ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1, marginTop: 6, transition: 'background 250ms',
              }}
            >
              {success ? (
                <>Success <ArrowRight size={14} /></>
              ) : loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <p style={{ fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, color: C.c3, textAlign: 'center', marginTop: 20 }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(false); }}
              style={{ color: C.gold, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter,sans-serif)', fontSize: 13, fontWeight: 600, padding: 0 }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
                  }
