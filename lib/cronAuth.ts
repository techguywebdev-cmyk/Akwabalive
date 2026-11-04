/**
 * Scheduled runs authenticate with a shared key: Vercel Cron sends CRON_SECRET; the 2-hourly GitHub job sends
 * FRESHNESS_KEY (a second key you can see and copy, since Vercel locks CRON_SECRET once saved). 24+ characters.
 */
export function isScheduler(token: string | null | undefined): boolean {
  if (!token) return false;
  const keys = [process.env.CRON_SECRET, process.env.FRESHNESS_KEY].filter((k): k is string => !!k && k.length >= 16);
  return keys.includes(token);
}
