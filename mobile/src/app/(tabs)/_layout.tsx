import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { CalendarHeart, Flame, Play, User } from 'lucide-react-native';
import { C, F } from '@/lib/theme';

/** Four tabs: Shows, Moments, Calendars, You. A dark frosted bar so the flyers stay the colour on screen */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.mint,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11 },
        tabBarStyle: { position: 'absolute', borderTopWidth: 0, backgroundColor: 'transparent', elevation: 0, height: 64 },
        tabBarBackground: () => <BlurView tint="dark" intensity={60} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,10,8,0.72)' }]} />,
        sceneStyle: { backgroundColor: C.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shows', tabBarIcon: ({ color, size }) => <Flame color={color} size={size - 2} /> }} />
      <Tabs.Screen name="moments" options={{ title: 'Moments', tabBarIcon: ({ color, size }) => <Play color={color} size={size - 2} /> }} />
      <Tabs.Screen name="calendars" options={{ title: 'Calendars', tabBarIcon: ({ color, size }) => <CalendarHeart color={color} size={size - 2} /> }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} /> }} />
    </Tabs>
  );
}
