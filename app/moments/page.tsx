import { Suspense } from 'react';
import MomentsClient from './MomentsClient';

export default function MomentsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: '#000',
            height: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          Loading…
        </div>
      }
    >
      <MomentsClient />
    </Suspense>
  );
}
