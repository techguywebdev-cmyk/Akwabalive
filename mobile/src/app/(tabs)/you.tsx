import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ExternalLink, LogOut } from 'lucide-react-native';
import { Body, Eyebrow, Ground, MintButton, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase, SITE } from '@/lib/supabase';
import { pushEnabled, setPushEnabled } from '@/lib/push';
import { C, F } from '@/lib/theme';

const TAB_BAR = 64;

function Row({ icon, label, right, onPress }: { icon: React.ReactNode; label: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, opacity: pressed ? 0.7 : 1 })}>
      {icon}
      <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 16, color: C.white }}>{label}</Text>
      {right}
    </Pressable>
  );
}

/** You: who you are on TsaCoal, alerts on or off, sign out */
export default function You() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ username: string | null; full_name: string | null } | null>(null);
  const [alerts, setAlerts] = useState(true);
  useEffect(() => { pushEnabled().then(setAlerts); }, []);
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from('profiles').select('username, full_name').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <Ground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: TAB_BAR + insets.bottom + 30 }}>
        {user ? (
          <View style={{ gap: 6, marginBottom: 24 }}>
            <Eyebrow>Signed in</Eyebrow>
            <Title size={36}>{profile?.full_name || profile?.username || 'You'}</Title>
            {!!profile?.username && <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text3 }}>@{profile.username}</Text>}
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 24 }}>
            <Title size={36}>Ghana, after dark.</Title>
            <Body>Join to save shows, plan nights with your people and get ticket alerts.</Body>
            <MintButton label="Sign in or join" onPress={() => router.push('/auth')} style={{ alignSelf: 'flex-start', marginTop: 6 }} small />
          </View>
        )}
        <View style={{ borderTopWidth: 1, borderColor: C.line }}>
          <Row icon={<Bell color={C.mint} size={20} />} label="Ticket alerts and reminders" right={<Switch value={alerts} onValueChange={(v) => { setAlerts(v); setPushEnabled(v); }} trackColor={{ true: C.mintDeep, false: 'rgba(255,255,255,0.2)' }} thumbColor={C.white} />} />
          <Row icon={<ExternalLink color={C.text2} size={20} />} label="Open tsacoal.com" onPress={() => Linking.openURL(SITE)} />
          {user && <Row icon={<LogOut color={C.text2} size={20} />} label="Sign out" onPress={() => supabase.auth.signOut()} />}
        </View>
        <Text style={{ marginTop: 30, fontFamily: F.body, fontSize: 12, color: C.text3 }}>TsaCoal {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </Ground>
  );
}
