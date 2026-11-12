import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Flyer } from './Flyer';
import { dayLabel, until, type Ev } from '@/lib/events';
import { C, F } from '@/lib/theme';

/** A grid square: the flyer whole in its own light, the name first, then one quiet line for when */
export function EventSquare({ e, width }: { e: Ev; width: number }) {
  return (
    <Pressable onPress={() => router.push(`/events/${e.slug}`)} style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1 })}>
      <Flyer uri={e.image_url} style={{ width, height: width }} radius={20} inset={width * 0.05} />
      <Text numberOfLines={2} style={{ marginTop: 10, fontFamily: F.display, fontSize: 15.5, letterSpacing: -0.4, lineHeight: 18.5, color: C.white }}>{e.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
        {e.is_hot && <Flame size={12} color={C.mintText} />}
        <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.mintText }}>{dayLabel(e.date)}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>·</Text>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.semi, fontSize: 12, color: C.text3 }}>{until(e.date)}</Text>
      </View>
    </Pressable>
  );
}

/** The soonest show opens the grid as a wide card: flyer beside the details */
export function FeatureCard({ e, width }: { e: Ev; width: number }) {
  const fw = Math.round(width * 0.4);
  return (
    <Pressable onPress={() => router.push(`/events/${e.slug}`)} style={({ pressed }) => ({ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 10, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', opacity: pressed ? 0.85 : 1 })}>
      <Flyer uri={e.image_url} style={{ width: fw, height: fw * 1.25 }} radius={16} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 22, borderRadius: 11, backgroundColor: C.mint }}>
          <Flame size={11} color={C.onMint} />
          <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.onMint }}>Up next</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: 1.6, color: C.mintText }}>{dayLabel(e.date).toUpperCase()} · {until(e.date)}</Text>
        <Text numberOfLines={3} style={{ fontFamily: F.display, fontSize: 24, letterSpacing: -1, lineHeight: 25, color: C.white }}>{e.title}</Text>
        {!!e.venue && <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 13, color: C.text2 }}>{e.venue}</Text>}
      </View>
    </Pressable>
  );
}
