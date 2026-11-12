import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Body, Ground, IconButton, MintButton, Title } from '@/components/ui';
import { supabase, SITE } from '@/lib/supabase';
import { C, F } from '@/lib/theme';

type Mode = 'signin' | 'signup';

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="rgba(255,255,255,0.4)" autoCapitalize="none" {...props} style={{ height: 54, borderRadius: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.07)', color: C.white, fontFamily: F.body, fontSize: 16 }} />;
}

/** Sign in or join: the same account as tsacoal.com, so your saved nights follow you */
export default function Auth() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw new Error(err.message === 'Invalid login credentials' ? 'That email and password don’t match.' : err.message);
        router.back();
        return;
      }
      const handle = username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if (handle.length < 3) throw new Error('Pick a username with at least 3 letters or numbers.');
      if (password.length < 6) throw new Error('Use a password with at least 6 characters.');
      const { data: taken } = await supabase.from('profiles').select('username').eq('username', handle).maybeSingle();
      if (taken) throw new Error('That username is taken. Try another.');
      const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), username: handle }, emailRedirectTo: `${SITE}/auth` } });
      if (err) throw new Error(err.message);
      if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, username: handle, full_name: name.trim() }, { onConflict: 'id' });
      if (!data.session) { setInfo(`We sent a link to ${email.trim()}. Open it, then sign in here.`); setMode('signin'); return; }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Ground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: insets.top + 70, gap: 12 }}>
          <Title size={36}>{mode === 'signin' ? 'Welcome back' : 'Join TsaCoal'}</Title>
          <Body style={{ marginBottom: 14 }}>{mode === 'signin' ? 'Your saved nights, calendars and alerts, everywhere.' : 'Save shows, plan nights with your people, get ticket alerts.'}</Body>
          {mode === 'signup' && <Field placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />}
          {mode === 'signup' && <Field placeholder="Username" value={username} onChangeText={setUsername} textContentType="username" />}
          <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
          <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType={mode === 'signin' ? 'password' : 'newPassword'} />
          {!!error && <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#FF9C8A' }}>{error}</Text>}
          {!!info && <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.mintText }}>{info}</Text>}
          {busy ? <View style={{ height: 52, justifyContent: 'center' }}><ActivityIndicator color={C.mint} /></View>
            : <MintButton label={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} style={{ marginTop: 6 }} />}
          <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text2 }}>
              {mode === 'signin' ? 'New here? ' : 'Have an account? '}<Text style={{ color: C.mint }}>{mode === 'signin' ? 'Join' : 'Sign in'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', top: insets.top + 12, right: 16 }}>
        <IconButton label="Close" size={42} onPress={() => router.back()}><X color={C.white} size={20} /></IconButton>
      </View>
    </Ground>
  );
}
