import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A ticket for one upload: proves the pieces belong to an upload this server started for that person,
 * without a sign-in check on every small piece. Valid for a day.
 */
const secret = () => `${process.env.R2_SECRET_ACCESS_KEY}:upload-ticket`;
export function makeTicket(key: string): string {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  return `${exp}.${createHmac('sha256', secret()).update(`${key}|${exp}`).digest('base64url')}`;
}
export function checkTicket(key: string, ticket: string): boolean {
  const [exp, sig] = String(ticket).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = createHmac('sha256', secret()).update(`${key}|${exp}`).digest('base64url');
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}
