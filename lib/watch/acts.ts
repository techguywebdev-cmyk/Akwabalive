import { artists } from '@/lib/data/artists';
import { VISITING_ACTS } from './sources';

export const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Every act we can recognise: our artists (with their keywords) plus big visiting acts */
export const ACTS: { name: string; slug?: string; keys: string[] }[] = [
  ...artists.map((a) => ({ name: a.name, slug: a.slug, keys: (a.keywords?.length ? a.keywords : [a.name]).map(norm) })),
  ...VISITING_ACTS.map((n) => ({ name: n, keys: [norm(n)] })),
];

/** Acts named anywhere in a piece of text */
export function actsIn(text: string) {
  const t = ` ${norm(text)} `;
  return ACTS.filter((a) => a.keys.some((k) => k.length >= 3 && t.includes(` ${k} `)));
}

/** Letters OCR often swaps (V/U, 0/O, 1/I/L, 5/S, 8/B) */
const ocrFold = (s: string) => s.replace(/v/g, 'u').replace(/0/g, 'o').replace(/[1l|]/g, 'i').replace(/5/g, 's').replace(/8/g, 'b');

function within1(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Acts on a flyer, forgiving the small misreads OCR makes ("DAUIDO" → Davido) */
export function actsInOcr(text: string) {
  const words = ocrFold(norm(text)).split(' ').filter(Boolean);
  return ACTS.filter((a) => a.keys.some((k) => {
    const kw = ocrFold(k).split(' ');
    const want = kw.join(' ');
    for (let i = 0; i + kw.length <= words.length; i++) {
      const got = words.slice(i, i + kw.length).join(' ');
      if (got === want || (want.length >= 5 && within1(got, want))) return true;
    }
    return false;
  }));
}
