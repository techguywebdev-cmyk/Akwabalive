import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { C, F } from '@/lib/theme';
import { asDay, monthShort, until, type Ev } from '@/lib/events';

/** A calendar in a list: tear-off date of its next night, name, how many nights, and a fan of its flyers */
export function CalendarRow({ id, title, sub, evs }: { id: string; title: string; sub: string; evs: Ev[] }) {
  const next = evs[0];
  return (
    <Pressable onPress={() => router.push(`/calendars/${id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 52, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch', backgroundColor: C.mint, paddingVertical: 3, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.2, color: C.onMint }}>{next ? monthShort(next.date) : '—'}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 22, letterSpacing: -1, color: C.white, paddingVertical: 4 }}>{next ? asDay(next.date).getDate() : '+'}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, letterSpacing: -0.5, color: C.white }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 13, color: C.text3 }}>{sub}{next ? ` · ${until(next.date)}` : ''}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {evs.slice(0, 3).map((e, i) => (
          <Image key={e.slug} source={{ uri: e.image_url ?? undefined }} contentFit="cover" style={{ width: 32, height: 40, borderRadius: 8, marginLeft: i ? -12 : 0, borderWidth: 2, borderColor: C.ground2 }} />
        ))}
      </View>
    </Pressable>
  );
}
