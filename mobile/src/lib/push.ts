import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from './auth';

const KEY = 'tsacoal.push';

// Show alerts while the app is open too
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export const pushEnabled = async () => (await AsyncStorage.getItem(KEY).catch(() => null)) !== 'off';

/** This phone's push address, if the person allows notifications (null on the web, simulators, or if refused) */
async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Shows and tickets', importance: Notifications.AndroidImportance.HIGH, lightColor: '#7BE3A8' });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // set by `eas init`; until then the app runs without push
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Turn alerts on or off for this phone (kept on the server so the website's reminders respect it) */
export async function setPushEnabled(on: boolean) {
  await AsyncStorage.setItem(KEY, on ? 'on' : 'off').catch(() => {});
  const token = await getToken().catch(() => null);
  const { data } = await supabase.auth.getUser();
  if (token && data.user) await supabase.from('push_tokens').upsert({ token, user_id: data.user.id, platform: Platform.OS, enabled: on, updated_at: new Date().toISOString() });
}

/**
 * When someone's signed in: register this phone for ticket alerts and reminders, and open the right show
 * when a notification is tapped.
 */
export function usePushSetup() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (!(await pushEnabled())) return;
      const token = await getToken().catch(() => null);
      if (token) await supabase.from('push_tokens').upsert({ token, user_id: user.id, platform: Platform.OS, enabled: true, updated_at: new Date().toISOString() });
    })();
  }, [user]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
