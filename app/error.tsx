'use client';

import LostPage from '@/components/layout/LostPage';
import { BTN } from '@/components/events/CardParts';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <LostPage
      title="Something went wrong"
      body="That didn’t load properly. Try again — if it keeps happening, check your connection."
      action={<button type="button" onClick={reset} style={BTN.secondary}>Try again</button>}
    />
  );
}
