import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { C } from '@/lib/theme';

/**
 * A flyer, always whole: never cropped. Any spare space around it is filled with the same flyer, blurred,
 * so it reads as one picture instead of a flyer with bars.
 */
export function Flyer({ uri, style, radius = 18, inset = 0, shadow = true }: { uri?: string | null; style?: ViewStyle; radius?: number; inset?: number; shadow?: boolean }) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: C.ground2 }, style]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} transition={150} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,10,8,0.35)' }]} />
          <Image source={{ uri }} style={[StyleSheet.absoluteFill, { margin: inset }, shadow && styles.shadow]} contentFit="contain" transition={150} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ shadow: {} });
