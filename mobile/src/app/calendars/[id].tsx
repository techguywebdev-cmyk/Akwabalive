import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Share, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import { EventSquare } from '@/components/EventSquare';
import { Eyebrow, Ground, IconButton, Title } from '@/components/ui';
import { supabase, SITE } from '@/lib/supabase';
import { eventsBySlugs, today, type Ev } from '@/lib/events';
import { C, F } from '@/lib/theme';

type Cal = { id: string; slug: string; title: string; description: string | null; owner_id: string; calendar_events: { event_slug: string }[]; profiles: { username: string | null; full_name: string | null } | null };

/** One calendar: its nights coming up as squares, soonest first */
export default function CalendarPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [cal, setCal] = useState<Cal | null | undefined>(undefined);
  const [evs, setEvs] = useState<Ev[]>([]);

  useEffect(() => {
    supabase.from('calendars').select('id, slug, title, description, owner_id, calendar_events(event_slug), profiles(username, full_name)').eq('id', String(id)).maybeSingle()
      .then(async ({ data }) => {
        const c = data as unknown as Cal | null;
        setCal(c);
        if (c) setEvs((await eventsBySlugs(c.calendar_events.map((x) => x.event_slug))).filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)));
      });
  }, [id]);

  const back = <IconButton label="Back" size={44} onPress={() => (router.canGoBack() ? router.back() : router.replace('/calendars'))}><ArrowLeft color={C.white} size={21} /></IconButton>;
  if (cal === undefined) return <Ground><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.mint} /></View></Ground>;
  if (!cal) return <Ground><View style={{ padding: 20, paddingTop: insets.top + 10 }}>{back}<Text style={{ marginTop: 30, fontFamily: F.semi, color: C.text2 }}>This calendar is private or gone.</Text></View></Ground>;

  const ours = cal.slug.startsWith('akwaaba-');
  const by = ours ? 'TsaCoal' : cal.profiles?.full_name || cal.profiles?.username || 'Someone';
  const gap = 12, pad = 20, w = Math.floor((width - pad * 2 - gap) / 2);
  const share = () => Share.share({ message: `${cal.title}: ${evs.length} nights coming up 👇\n${SITE}/calendars/${cal.slug}` }).catch(() => {});

  return (
    <Ground>
      <FlatList
        data={evs}
        numColumns={2}
        keyExtractor={(e) => e.slug}
        columnWrapperStyle={{ gap, paddingHorizontal: pad }}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40, gap: 22 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: pad, gap: 8, marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {back}
              <IconButton label="Share calendar" size={44} onPress={share}><Share2 color={C.white} size={19} /></IconButton>
            </View>
            <Eyebrow style={{ marginTop: 14 }}>By {by}</Eyebrow>
            <Title size={cal.title.length > 18 ? 30 : 38}>{cal.title}</Title>
            {!!cal.description && <Text style={{ fontFamily: F.body, fontSize: 14.5, color: C.text2 }}>{cal.description}</Text>}
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text3 }}>{evs.length} night{evs.length === 1 ? '' : 's'} coming up</Text>
          </View>
        }
        ListEmptyComponent={<Text style={{ paddingHorizontal: pad, fontFamily: F.body, color: C.text2 }}>No nights coming up in this calendar yet.</Text>}
        renderItem={({ item }) => <EventSquare e={item} width={w} />}
      />
    </Ground>
  );
}
