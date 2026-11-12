import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LayoutGrid, RectangleVertical } from 'lucide-react-native';
import { EventCard } from '@/components/EventCard';
import { EventSquare, FeatureCard } from '@/components/EventSquare';
import { Ground, Title } from '@/components/ui';
import { upcoming, type Ev } from '@/lib/events';
import { useSaved } from '@/lib/saved';
import { C, F } from '@/lib/theme';

type View_ = 'cards' | 'grid';
const KEY = 'tsacoal.view';
const TAB_BAR = 64;

/** Shows: every upcoming night, as full-screen cards to swipe or as a grid of squares */
export default function Shows() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View_>('cards');
  const [pageH, setPageH] = useState(0);
  const { saved, toggle, signedIn } = useSaved();

  const load = useCallback(async () => {
    try { setEvents(await upcoming()); setError(false); } catch { setError(true); }
  }, []);
  useEffect(() => { load(); AsyncStorage.getItem(KEY).then((v) => { if (v === 'grid' || v === 'cards') setView(v); }).catch(() => {}); }, [load]);
  const switchView = () => { const v = view === 'cards' ? 'grid' : 'cards'; setView(v); AsyncStorage.setItem(KEY, v).catch(() => {}); };
  const save = (slug: string) => (signedIn ? toggle(slug) : router.push('/auth'));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const header = (
    <View style={{ position: 'absolute', zIndex: 10, top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingHorizontal: 20, height: insets.top + 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: F.display, fontSize: 24, letterSpacing: -1, color: C.white }}>TsaCoal</Text>
      <Pressable accessibilityLabel={view === 'cards' ? 'Show as grid' : 'Show as cards'} onPress={switchView} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }}>
        {view === 'cards' ? <LayoutGrid color={C.white} size={19} /> : <RectangleVertical color={C.white} size={19} />}
      </Pressable>
    </View>
  );

  if (!events) {
    return (
      <Ground>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          {error ? (
            <>
              <Text style={{ fontFamily: F.semi, color: C.text2 }}>Couldn’t load the shows.</Text>
              <Pressable onPress={load}><Text style={{ fontFamily: F.bold, color: C.mint }}>Try again</Text></Pressable>
            </>
          ) : <ActivityIndicator color={C.mint} />}
        </View>
      </Ground>
    );
  }

  if (view === 'grid') {
    const gap = 12, pad = 20;
    const w = Math.floor((width - pad * 2 - gap) / 2);
    const [first, ...rest] = events;
    return (
      <Ground>
        {header}
        <FlatList
          data={rest}
          key="grid"
          numColumns={2}
          keyExtractor={(e) => e.slug}
          columnWrapperStyle={{ gap, paddingHorizontal: pad }}
          contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: TAB_BAR + insets.bottom + 24, gap: 22 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.mint} />}
          ListHeaderComponent={first ? (
            <View style={{ paddingHorizontal: pad, gap: 16 }}>
              <Title size={30}>Coming up <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.text3 }}>{events.length}</Text></Title>
              <FeatureCard e={first} width={width - pad * 2} />
            </View>
          ) : undefined}
          renderItem={({ item }) => <EventSquare e={item} width={w} />}
        />
      </Ground>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }} onLayout={(ev) => setPageH(ev.nativeEvent.layout.height)}>
      {header}
      {pageH > 0 && (
        <FlatList
          data={events}
          key="cards"
          keyExtractor={(e) => e.slug}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={pageH}
          getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.mint} progressViewOffset={insets.top + 50} />}
          renderItem={({ item }) => (
            <EventCard e={item} height={pageH} saved={saved.has(item.slug)} onSave={() => save(item.slug)} topInset={insets.top} bottomInset={TAB_BAR + insets.bottom} />
          )}
        />
      )}
    </View>
  );
}
