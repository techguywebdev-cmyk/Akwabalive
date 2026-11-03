'use client';

import LostPage, { LOST_BTN } from '@/components/layout/LostPage';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <LostPage
      title="Something went wrong"
      body="That didn’t load properly. Try again — if it keeps happening, check your connection."
      action={<button type="button" onClick={reset} style={LOST_BTN.secondary}>Try again</button>}
    />
  );
}
