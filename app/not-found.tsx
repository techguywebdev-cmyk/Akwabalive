import LostPage from '@/components/layout/LostPage';
import Link from 'next/link';
import { BTN } from '@/components/events/CardParts';

export const metadata = { title: 'Not found — Akwaaba' };

export default function NotFound() {
  return (
    <LostPage
      title="We couldn’t find that"
      body="The link may be old, or the event may have been taken down. There’s plenty more happening."
      action={<Link href="/moments" style={BTN.secondary}>Watch moments</Link>}
    />
  );
}
