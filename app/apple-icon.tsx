import { appIcon } from '@/lib/appIcon';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return appIcon(180, new URL('../assets/InterTight-800.woff', import.meta.url));
}
