import LostPage, { LOST_BTN } from '@/components/layout/LostPage';
import Link from 'next/link';

export const metadata = { title: 'Not found — Tsacoal' };

export default function NotFound() {
  return (
    <LostPage
      title="We couldn’t find that"
      body="The link may be old, or the event may have been taken down. There’s plenty more happening."
      action={<Link href="/moments" style={LOST_BTN.secondary}>Watch moments</Link>}
    />
  );
}
