// Icon design v3: white TC on dark green, zoomed out (changing this file gives the icon a new address, so browsers drop the old cached one)
import { appIcon } from '@/lib/appIcon';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return appIcon(512, new URL('../assets/InterTight-800.woff', import.meta.url));
}
