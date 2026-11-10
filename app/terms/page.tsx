import LegalPage, { CONTACT_EMAIL } from '@/components/legal/LegalPage';

export const metadata = { title: 'Terms of use — Tsacoal', description: 'The terms for using Tsacoal, the events app for Ghana.' };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Tsacoal"
      title="Terms of use"
      intro="Tsacoal helps you find events in Ghana, buy tickets, follow artists and share moments. These terms are the agreement between you and Tsacoal when you use the website and app. By using Tsacoal you agree to them."
      summary={[
        'You need to be 13 or older, and you look after your own account.',
        'Hosted events are run by their organisers; tickets for listed events come from the seller we link to.',
        'If an event is cancelled and not rescheduled, you get your money back.',
        'Post only what’s yours to share, and keep it respectful.',
      ]}
      sections={[
        { title: 'Your account', body: [
          'You need an account to buy tickets, save events, follow people and post. Give accurate details and keep your password to yourself; you are responsible for what happens on your account.',
          'You must be at least 13 to have an account. Some events are 18+ or 21+, and organisers may check ID at the door.',
        ] },
        { title: 'Events on Tsacoal', body: [
          'There are two kinds of events on Tsacoal:',
          [
            'Hosted events: the organiser sells tickets through Tsacoal. The organiser is responsible for the event itself: the line-up, venue, timing, safety and entry.',
            'Listed events: shows we list from public sources (ticket sites, official pages, the press) so you can find them in one place. Tickets for these are sold by someone else; the "Get tickets" button takes you to them, and their terms apply.',
          ],
          'We work to keep listings accurate, but dates, line-ups, venues and prices can change. Check with the organiser or ticket seller before you travel.',
        ] },
        { title: 'Tickets, payments and refunds', body: [
          'Payments for hosted events are processed by our payment provider. Prices are shown in Ghana cedis and include any fees shown at checkout.',
          'Each ticket has a QR code that is scanned at the door. A ticket can be used once; do not share or resell it.',
          'Refunds are the organiser’s decision, except where an event is cancelled and not rescheduled, in which case ticket holders get their money back. Contact the organiser first; if you cannot reach them, email us.',
        ] },
        { title: 'Organisers', body: [
          'If you list or host an event, you confirm you have the right to run it and to use its name, flyer and line-up. Describe it honestly, honour the tickets you sell and tell ticket holders about changes.',
          'We review new events before they go live and may edit, decline or remove a listing that is misleading, unsafe or breaks these terms.',
        ] },
        { title: 'What you post', body: [
          'You keep ownership of what you post (photos, comments, reviews). By posting you let Tsacoal show it in the app and in shared links.',
          'Do not post anything that is illegal, hateful, harassing, sexual, misleading, someone else’s private information, or someone else’s work without permission. Reviews must be about events you attended.',
          'Anyone can report a comment. Comments that several people report are hidden while we look at them, and we may remove content or suspend accounts that break these rules.',
        ] },
        { title: 'Moments and other people’s content', body: [
          'Moments are videos from past shows, played through YouTube or X. They belong to the people who posted them; Tsacoal only embeds them. If you own a video and want it removed, email us.',
          'Artist names, photos and event flyers belong to their owners and are shown to help you find their shows.',
        ] },
        { title: 'Things we are not responsible for', body: [
          'Tsacoal is provided as it is. We are not responsible for events run by organisers or for tickets sold on other sites. To the extent the law allows, our responsibility to you for any claim is limited to the amount you paid Tsacoal for the ticket concerned.',
        ] },
        { title: 'Changes and contact', body: [
          `We may update these terms. When we make an important change we will tell you in the app. These terms are governed by the laws of Ghana. Questions: ${CONTACT_EMAIL}.`,
        ] },
      ]}
    />
  );
}
