import { shareMeta } from '@/lib/og';
import CalendarsHub from '@/components/calendars/CalendarsHub';

export const metadata = shareMeta({
  title: 'Calendars · Tsacoal',
  description: 'Make your own calendar of shows, like My Detty December. Keep it private or share it, and see what everyone else is lining up.',
  path: '/calendars',
});

export default function CalendarsPage() {
  return <CalendarsHub />;
}
