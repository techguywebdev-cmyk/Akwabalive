import LegalPage, { CONTACT_EMAIL } from '@/components/legal/LegalPage';

export const metadata = { title: 'Privacy policy — Akwaaba', description: 'What Akwaaba collects, why, and the choices you have.' };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Akwaaba"
      title="Privacy policy"
      intro="This explains what information Akwaaba collects, how we use it and the choices you have. We collect only what the app needs, we do not sell your information, and we handle it in line with Ghana’s Data Protection Act, 2012 (Act 843)."
      summary={[
        'We collect only what the app needs to work.',
        'We never see or store your card or mobile money details.',
        'We don’t sell your information, to anyone.',
        'Your email and phone number stay private; your location stays on your device.',
      ]}
      sections={[
        { title: 'What we collect', body: [
          [
            'Account details: your name, username, email address, password (stored encrypted) and, if you add them, a profile photo, bio and phone number.',
            'Tickets and orders: the events you buy tickets for, ticket types, amounts and the payment reference. Card and mobile money details are handled by our payment provider; we never see or store them.',
            'What you do in the app: events you save, mark as going, rate or comment on, people and artists you follow, and moments you like.',
            'Basic usage: which event pages are viewed, counted with a random ID stored in your browser so we can show numbers like “1.2k people checked this out”. This ID is not linked to your name.',
            'Location, only if you allow it, to show events near you. It stays on your device.',
          ],
        ] },
        { title: 'How we use it', body: [
          [
            'To run your account, issue and check tickets, and send messages about your orders and events you care about.',
            'To show you relevant events, friends who are going, and real popularity numbers on events.',
            'To keep Akwaaba safe: reviewing new events, handling reports and preventing fraud.',
          ],
        ] },
        { title: 'What other people can see', body: [
          'Your name, username, photo and bio are public, along with the events you are going to and what you post. Your email address and phone number are private: other users cannot see them.',
          'When you buy a ticket to a hosted event, the organiser receives your name and ticket details so they can let you in.',
        ] },
        { title: 'Who we share it with', body: [
          'We do not sell your information. We share it only with services that help us run Akwaaba, and only what they need: hosting and database (Vercel, Supabase), payments (Paystack), email delivery, and video players (YouTube and X, when you play a moment). We may also share information when the law requires it.',
        ] },
        { title: 'How long we keep it', body: [
          'We keep your account information while your account is open. Ticket and payment records are kept for as long as accounting rules require. When you delete your account we delete or anonymise the rest within 30 days.',
        ] },
        { title: 'Your choices and rights', body: [
          `You can see and edit your profile at any time. You can ask us for a copy of your information, to correct it, or to delete your account, by emailing ${CONTACT_EMAIL}. You can turn off location access in your browser settings.`,
        ] },
        { title: 'Security', body: [
          'Your information is stored with encrypted connections and access controls that limit who can read it. No system is perfectly secure, so use a strong password and tell us straight away if you think your account has been misused.',
        ] },
        { title: 'Changes and contact', body: [
          `We may update this policy and will tell you in the app about important changes. Questions or requests: ${CONTACT_EMAIL}.`,
        ] },
      ]}
    />
  );
}
