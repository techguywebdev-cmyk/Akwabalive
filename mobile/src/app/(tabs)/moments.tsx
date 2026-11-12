import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ListViewToken } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play } from 'lucide-react-native';
import { YouTube } from '@/components/YouTube';
import { Ground } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { dayLabel, upcoming, until, type Ev } from '@/lib/events';
import { C, F } from '@/lib/theme';

type Moment = { id: string; title: string; event_name: string | null; event_slug: string | null; youtube_id: string; year: number | null; channel_name: string | null };
const TAB_BAR = 64;
const words = (s: string) => s.toLowerCase().replace(/\b(19|20)\d{2}\b/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'and', 'live', 'concert', 'festival', 'edition'].includes(w));

/** The next edition of the show a clip is from: the same event if it's still coming, else one whose name matches */
function nextFor(m: Moment, shows: Ev[]): Ev | null {
  const own = m.event_slug ? shows.find((e) => e.slug === m.event_slug) : undefined;
  if (own) return own;
  const key = words(m.event_name ?? '');
  if (!key.length) return null;
  return shows.find((e) => { const t = e.title.toLowerCase(); return key.every((w) => t.includes(w)); }) ?? null;
}

/** Moments: the best live clips, full screen, one swipe at a time; the one on screen plays */
export default function Moments() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const [items, setItems] = useState<Moment[] | null>(null);
  const [shows, setShows] = useState<Ev[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [pageH, setPageH] = useState(0);

  useEffect(() => {
    supabase.from('moments').select('id, title, event_name, event_slug, youtube_id, year, channel_name').eq('status', 'live')
      .order('is_featured', { ascending: false }).order('published_at', { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => setItems((data ?? []) as Moment[]));
    upcoming().then(setShows).catch(() => {});
  }, []);

  const onView = useMemo(() => ({ viewabilityConfig: { itemVisiblePercentThreshold: 60 }, onViewableItemsChanged: ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const v = viewableItems[0];
    if (v?.index != null) { setActive(v.index); setPlaying(null); }
  } }), []);

  if (!items) return <Ground><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.mint} /></View></Ground>;

  const vh = width * 0.5625;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
      {pageH > 0 && (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          pagingEnabled
          snapToInterval={pageH}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
          windowSize={3}
          {...onView}
          renderItem={({ item: m, index }) => {
            const next = nextFor(m, shows);
            const isOn = focused && index === active && playing === m.id;
            const thumb = `https://i.ytimg.com/vi/${m.youtube_id}/hqdefault.jpg`;
            return (
              <View style={{ height: pageH, justifyContent: 'center' }}>
                <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
                <View style={{ width, height: vh, marginTop: -60 }}>
                  {isOn ? <YouTube id={m.youtube_id} autoplay style={{ width, height: vh }} /> : (
                    <Pressable accessibilityLabel={`Play ${m.title}`} onPress={() => setPlaying(m.id)} style={{ flex: 1 }}>
                      <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" />
                      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                        <View style={{ width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>
                          <Play size={28} color={C.onMint} fill={C.onMint} style={{ marginLeft: 3 }} />
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }} pointerEvents="none" />
                <View style={{ position: 'absolute', left: 20, right: 20, bottom: TAB_BAR + insets.bottom + 18, gap: 6 }}>
                  {!!m.event_name && <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.8, color: C.mintText }}>{m.event_name.toUpperCase()}{m.year ? ` · ${m.year}` : ''}</Text>}
                  <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 24, letterSpacing: -0.8, lineHeight: 27, color: C.white }}>{m.title}</Text>
                  {!!m.channel_name && <Text style={{ fontFamily: F.body, fontSize: 13, color: C.text3 }}>{m.channel_name}</Text>}
                  {next && (
                    <Pressable onPress={() => router.push(`/events/${next.slug}`)} style={({ pressed }) => ({ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', opacity: pressed ? 0.8 : 1 })}>
                      <Image source={{ uri: next.image_url ?? undefined }} style={{ width: 44, height: 55, borderRadius: 10 }} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.6, color: C.mintText }}>NEXT EDITION</Text>
                        <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 15, color: C.white }}>{next.title}</Text>
                        <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.text2 }}>{dayLabel(next.date)} · {until(next.date)}</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
