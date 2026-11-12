import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flyer } from '@/components/Flyer';
import { Countdown } from '@/components/Countdown';
import { CalendarRow } from '@/components/CalendarRow';
import { Body, Eyebrow, Ground, MintButton, Title } from '@/components/ui';
import { useSaved } from '@/lib/saved';
import { supabase } from '@/lib/supabase';
import { dayLabel, eventsBySlugs, placeLine, today, type Ev } from '@/lib/events';
import { C, F } from '@/lib/theme';

type Curated = { id: string; title: string; calendar_events: { event_slug: string }[] };
const TAB_BAR = 64;

/** Calendars: your nights out (the next one counting down), your calendars, and ours to start from */
export default function Calendars() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { cals, ready, signedIn, reload } = useSaved();
  const [ours, setOurs] = useState<Curated[]>([]);
  const [evs, setEvs] = useState<Record<string, Ev>>({});
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => {
    supabase.from('calendars').select('id, title, calendar_events(event_slug)').like('slug', 'akwaaba-%').eq('is_public', true).limit(12)
      .then(({ data }) => setOurs((data ?? []) as Curated[]));
  }, []);
  const slugs = [...new Set([...cals, ...ours].flatMap((c) => c.calendar_events.map((x) => x.event_slug)))];
  const key = slugs.sort().join('|');
  useEffect(() => {
    if (!slugs.length) return;
    eventsBySlugs(slugs).then((list) => setEvs(Object.fromEntries(list.map((e) => [e.slug, e]))));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcomingOf = (c: { calendar_events: { event_slug: string }[] }) => c.calendar_events.map((x) => evs[x.event_slug]).filter((e): e is Ev => !!e && e.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const mine = [...new Map(cals.flatMap(upcomingOf).map((e) => [e.slug, e])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const next = mine[0];

  if (!ready) return <Ground><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.mint} /></View></Ground>;

  return (
    <Ground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: TAB_BAR + insets.bottom + 30, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={C.mint} />}
      >
        {!signedIn ? (
          <View style={{ gap: 10, marginBottom: 10 }}>
            <Title size={38}>Calendars</Title>
            <Body>Save the nights you’re going to, plan them with your people, and watch the countdown.</Body>
            <MintButton label="Join to start yours" onPress={() => router.push('/auth')} style={{ marginTop: 8, alignSelf: 'flex-start' }} small />
          </View>
        ) : next ? (
          <Pressable onPress={() => router.push(`/events/${next.slug}`)} style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 10 }}>
            <Flyer uri={next.image_url} style={{ width: width - 40, height: (width - 40) * 0.9 }} radius={0} inset={14} />
            <View style={{ padding: 20, gap: 6 }}>
              <Eyebrow>Up next · {dayLabel(next.date)}</Eyebrow>
              <Title size={28} lines={2}>{next.title}</Title>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.text2 }}>{placeLine(next)}</Text>
              <View style={{ marginTop: 10 }}><Countdown date={next.date} time={next.time} /></View>
            </View>
          </Pressable>
        ) : (
          <View style={{ gap: 10, marginBottom: 10 }}>
            <Title size={34}>No nights saved yet</Title>
            <Body>Tap the bookmark on any show to save it here.</Body>
          </View>
        )}

        {signedIn && cals.length > 0 && <Eyebrow style={{ marginTop: 14, color: C.text3 }}>Your calendars</Eyebrow>}
        {cals.map((c) => <CalendarRow key={c.id} id={c.id} title={c.title} sub={`${c.calendar_events.length} night${c.calendar_events.length === 1 ? '' : 's'}`} evs={upcomingOf(c)} />)}

        {ours.length > 0 && <Eyebrow style={{ marginTop: 18, color: C.text3 }}>Start from one of ours</Eyebrow>}
        {ours.filter((c) => upcomingOf(c).length).map((c) => <CalendarRow key={c.id} id={c.id} title={c.title} sub={`${upcomingOf(c).length} coming up`} evs={upcomingOf(c)} />)}
      </ScrollView>
    </Ground>
  );
}
