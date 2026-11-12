import { WebView } from 'react-native-webview';
import { Platform, View, type ViewStyle } from 'react-native';
import { SITE } from '@/lib/supabase';

/** A YouTube clip, played inline (YouTube's own player, so it's allowed and counts their views) */
export function YouTube({ id, style, autoplay = false, muted = false }: { id: string; style?: ViewStyle; autoplay?: boolean; muted?: boolean }) {
  const src = `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}${muted ? '&mute=1' : ''}`;
  if (Platform.OS === 'web') {
    return <View style={[{ overflow: 'hidden', backgroundColor: '#000' }, style]}><iframe src={src} style={{ border: 0, width: '100%', height: '100%' }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></View>;
  }
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#000' }, style]}>
      <WebView
        source={{ uri: src, headers: { Referer: SITE } }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={!autoplay}
        allowsFullscreenVideo
        javaScriptEnabled
      />
    </View>
  );
}
