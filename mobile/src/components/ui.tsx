import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { C, F, MINT, WASH } from '@/lib/theme';

/** The page ground: a soft green light at the top fading into near-black */
export function Ground({ children, style }: { children?: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flex: 1, backgroundColor: C.ground }, style]}>
      <LinearGradient colors={WASH} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/** Primary button: mint gradient, dark text */
export function MintButton({ label, onPress, icon, style, small }: { label: string; onPress?: () => void; icon?: ReactNode; style?: ViewStyle; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: 999, overflow: 'hidden', opacity: pressed ? 0.85 : 1 }, style]}>
      <LinearGradient colors={MINT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: small ? 40 : 52, paddingHorizontal: small ? 16 : 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {icon}
        <Text style={{ fontFamily: F.bold, fontSize: small ? 14 : 16, color: C.onMint }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Quiet round icon button (glass) */
export function IconButton({ children, onPress, label, size = 48, active }: { children: ReactNode; onPress?: () => void; label: string; size?: number; active?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? 'rgba(123,227,168,0.18)' : 'rgba(255,255,255,0.08)', opacity: pressed ? 0.7 : 1 })}>
      {children}
    </Pressable>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[{ fontFamily: F.display, fontSize: 11.5, letterSpacing: 1.8, color: C.mintText, textTransform: 'uppercase' }, style]}>{children}</Text>;
}

export function Title({ children, size = 32, style, lines }: { children: ReactNode; size?: number; style?: TextStyle; lines?: number }) {
  return <Text numberOfLines={lines} style={[{ fontFamily: F.display, fontSize: size, letterSpacing: -size * 0.04, lineHeight: size * 1.06, color: C.white }, style]}>{children}</Text>;
}

export function Body({ children, style, lines }: { children: ReactNode; style?: TextStyle; lines?: number }) {
  return <Text numberOfLines={lines} style={[{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.text2 }, style]}>{children}</Text>;
}
