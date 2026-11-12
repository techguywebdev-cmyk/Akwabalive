# TsaCoal app

The TsaCoal phone app (Android first, iPhone later), built with Expo (SDK 58) and Expo Router.
It uses the same Supabase project as tsacoal.com, so accounts, shows and saved nights are shared.

## What's in it

- **Shows**: every upcoming night as full-screen cards to swipe, or a grid of squares (toggle top right).
  Tickets dial the MoMo code first; save to your nights; share with the ready-made message.
- **Event page**: the flyer whole, date and countdown, venue (opens Maps), line-up, promo video, about.
- **Moments**: full-screen live clips, tap to play, with the next edition of the show.
- **Calendars**: your next night with a live countdown, your calendars, and TsaCoal's to start from.
- **You**: sign in or join (same account as the website), alerts on/off, sign out.
- **Push**: "X is tomorrow" reminders, "Tickets are out" alerts, and new shows from artists you follow,
  sent by the website's daily jobs (`/api/reminders/daily`, `/api/alerts`) through Expo's free push service.

## Run it on your phone

1. Install Node.js 20+ on your computer.
2. In this folder: `npm install`, then `npx expo start`.
3. Expo Go can only open SDK 58 projects once its SDK 58 version is out on Google Play.
   Until then, install the preview APK from EAS (below) to try it on your phone.

## Build an Android app (APK) with EAS

1. `npx eas-cli@latest login` (free Expo account).
2. `npx eas-cli@latest init` (links the project and adds its projectId to app.json; push needs this).
3. `npx eas-cli@latest build -p android --profile preview` for an installable APK,
   or `--profile production` for the Play Store (AAB).

## Push notifications need

- The `push_tokens` table in Supabase (SQL in the PR that added this app).
- `eas init` done (projectId in app.json), and an Android FCM key uploaded in Expo
  (Project → Credentials → Android → FCM V1 service account) for Android delivery.
