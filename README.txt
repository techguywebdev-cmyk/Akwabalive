AKWAABA — clean file pack (Play moment + fixed parseEventLink)

WHERE TO PUT EACH FILE (overwrite):

1. lib/ingest/parseEventLink.ts   ← FIXES the corrupted triple-paste file
2. lib/ingest/ocrFlyer.ts         ← keep as-is (already good)
3. app/events/[slug]/page.tsx     ← finds last-edition moment + passes seriesMomentId
4. components/events/EventDetailClient.tsx  ← gold Play button top-right
5. app/moments/MomentsClient.tsx  ← "Back to tickets" when opened from an event

HOW TO UPLOAD (GitHub web, safest):
- Open each file on GitHub → pencil edit → select all → delete → paste full new file → Commit
OR unzip locally, copy into your project, git add / commit / push

Play button only shows if a matching row exists in the moments table
(e.g. event_name or title containing "Rapperholic").

Optional env: OCR_SPACE_API_KEY on Vercel for flyer OCR.
