import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Bookmark, BookmarkCheck, Share2 } from 'lucide-react-native';
import { Flyer } from './Flyer';
import { Eyebrow, IconButton, MintButton, Title } from './ui';
import { getTickets, shareEvent, ticketLabel } from './EventActions';
import { dayLabel, known, placeLine, until, type Ev } from '@/lib/events';
import { C, F } from '@/lib/theme';

/**
 * A full-screen show card: the flyer whole and big, then the essentials and the three things you'd do:
 * get tickets (dial first), save it to your nights, share it.
 */
export function EventCard({ e, height, saved, onSave, bottomInset, topInset }: { e: Ev; height: number; saved: boolean; onSave: () => void; bottomInset: number; topInset: number }) {
  const acts = (e.lineup ?? []).filter((a) => !e.title.toLowerCase().includes(a.toLowerCase())).slice(0, 3);
  return (
    <View style={{ height, backgroundColor: C.ground }}>
      <Pressable onPress={() => router.push(`/events/${e.slug}`)} style={{ flex: 1, paddingTop: topInset + 56, paddingHorizontal: 14 }}>
        <Flyer uri={e.image_url} style={{ flex: 1 }} radius={24} inset={10} />
      </Pressable>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: bottomInset + 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Eyebrow>{dayLabel(e.date)}</Eyebrow>
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text3 }}>{until(e.date)}</Text>
        </View>
        <Title size={30} lines={2}>{e.title}</Title>
        <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14.5, color: C.text2 }}>{[known(e.time), placeLine(e)].filter(Boolean).join(' · ')}</Text>
        {acts.length > 0 && <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 13.5, color: C.white }}>🎤 {acts.join(', ')}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <MintButton label={ticketLabel(e)} onPress={() => getTickets(e)} style={{ flex: 1 }} />
          <IconButton label={saved ? 'Saved' : 'Save to your nights'} onPress={onSave} active={saved}>
            {saved ? <BookmarkCheck color={C.mint} size={21} /> : <Bookmark color={C.white} size={21} />}
          </IconButton>
          <IconButton label="Share" onPress={() => shareEvent(e, { going: saved })}><Share2 color={C.white} size={20} /></IconButton>
        </View>
      </View>
    </View>
  );
}
