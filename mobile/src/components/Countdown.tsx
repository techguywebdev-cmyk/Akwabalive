import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { C, F } from '@/lib/theme';

const parseTime = (t?: string | null) => {
  const m = t?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return [20, 0];
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  if (m[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
  if (m[3]?.toLowerCase() === 'am' && h === 12) h = 0;
  return [h, min];
};

/** A live countdown to doors: days, hours, minutes, seconds */
export function Countdown({ date, time }: { date: string; time?: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [h, m] = parseTime(time);
  const target = new Date(`${date}T00:00:00`); target.setHours(h, m, 0, 0);
  let s = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  const parts = [['days', Math.floor(s / 86400)], ['hrs', Math.floor((s %= 86400) / 3600)], ['min', Math.floor((s %= 3600) / 60)], ['sec', s % 60]] as const;
  return (
    <View style={{ flexDirection: 'row', gap: 18 }}>
      {parts.map(([label, n]) => (
        <View key={label} style={{ alignItems: 'center', minWidth: 44 }}>
          <Text style={{ fontFamily: F.display, fontSize: 32, letterSpacing: -1.2, color: C.white, fontVariant: ['tabular-nums'] }}>{String(n).padStart(2, '0')}</Text>
          <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 1, color: C.text3 }}>{label.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
}
