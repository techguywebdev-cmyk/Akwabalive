import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, BookmarkCheck, MapPin, Share2 } from 'lucide-react-native';
import { Flyer } from '@/components/Flyer';
import { YouTube } from '@/components/YouTube';
import { Body, Eyebrow, Ground, IconButton, MintButton, Title } from '@/components/ui';
import { getTickets, shareEvent, ticketLabel } from '@/components/EventActions';
import { dayLabel, eventBySlug, known, placeLine, priceText, until, youtubeId, type Ev } from '@/lib/events';
import { useSaved } from '@/lib/saved';
import { C, F } from '@/lib/theme';

/** One show: the flyer whole, what/when/where, line-up, tickets (dial first), save and share, then the story */
export default function EventPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [e, setE] = useState<Ev | null | undefined>(undefined);
  const { saved, toggle, signedIn } = useSaved();
  useEffect(() => { eventBySlug(String(slug)).then(setE); }, [slug]);

  if (e === undefined) return <Ground><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.mint} /></View></Ground>;
  if (!e) return <Ground><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><Text style={{ fontFamily: F.semi, color: C.text2 }}>This show isn’t on TsaCoal.</Text><Pressable onPress={() => router.back()}><Text style={{ fontFamily: F.bold, color: C.mint }}>Go back</Text></Pressable></View></Ground>;

  const isSaved = saved.has(e.slug);
  const video = youtubeId(e.promo_video_url);
  const price = priceText(e);
  const where = placeLine(e);
  const maps = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address || where)}`);

  return (
    <Ground>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingTop: insets.top + 60, paddingHorizontal: 14 }}>
          <Flyer uri={e.image_url} style={{ width: width - 28, height: (width - 28) * 1.25 }} radius={26} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Eyebrow>{dayLabel(e.date)}</Eyebrow>
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.text3 }}>{until(e.date)}</Text>
          </View>
          <Title size={36}>{e.title}</Title>
          {!!known(e.highlight) && <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.mintText }}>{e.highlight}</Text>}
          <Text style={{ fontFamily: F.body, fontSize: 15.5, color: C.text2 }}>{[known(e.time), price].filter(Boolean).join(' · ')}</Text>
          {!!where && (
            <Pressable onPress={maps} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} color={C.mint} />
              <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.white }}>{where}</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <MintButton label={ticketLabel(e)} onPress={() => getTickets(e)} style={{ flex: 1 }} />
            <IconButton label={isSaved ? 'Saved' : 'Save to your nights'} onPress={() => (signedIn ? toggle(e.slug) : router.push('/auth'))} active={isSaved}>
              {isSaved ? <BookmarkCheck color={C.mint} size={21} /> : <Bookmark color={C.white} size={21} />}
            </IconButton>
            <IconButton label="Share" onPress={() => shareEvent(e, { going: isSaved })}><Share2 color={C.white} size={20} /></IconButton>
          </View>

          {(e.lineup ?? []).length > 0 && (
            <View style={{ marginTop: 24, gap: 10 }}>
              <Eyebrow style={{ color: C.text3 }}>On stage</Eyebrow>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(e.lineup ?? []).map((a) => (
                  <View key={a} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.white }}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {video && (
            <View style={{ marginTop: 24, gap: 10 }}>
              <Eyebrow style={{ color: C.text3 }}>Watch</Eyebrow>
              <YouTube id={video} style={{ width: width - 40, height: (width - 40) * 0.5625, borderRadius: 18 }} />
            </View>
          )}

          {!!e.description && (
            <View style={{ marginTop: 24, gap: 10 }}>
              <Eyebrow style={{ color: C.text3 }}>About</Eyebrow>
              <Body>{e.description}</Body>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 14 }}>
        <IconButton label="Back" size={44} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}><ArrowLeft color={C.white} size={21} /></IconButton>
      </View>
    </Ground>
  );
}
