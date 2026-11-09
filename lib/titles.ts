const SMALL = new Set(['the', 'and', 'of', 'in', 'at', 'for', 'is', 'on', 'to', 'a', 'an', 'by', 'with']);

/** ALL-CAPS titles shout in a list; set them in title case, keeping short acronyms (BYK, DJ, ATW) */
export const calmTitle = (t: string) => {
  if (t !== t.toUpperCase() || !/[A-Z]{4}/.test(t)) return t;
  let first = true;
  return t.toLowerCase().replace(/[a-z0-9’']+/g, (w) => {
    const isFirst = first; first = false;
    if (/^[bcdfghjklmnpqrstvwxyz]{2,3}$/.test(w)) return w.toUpperCase(); // BYK, DJ, ATW: no vowels, an acronym
    if (!isFirst && SMALL.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
};

/** Calm title without the year: "BYK CONCERT 2026" → "BYK Concert" */
export const listTitle = (t: string) => calmTitle(t).replace(/\s*[-–|:]?\s*\b20(26|27)\b\s*/g, ' ').replace(/\s+([-–|:])\s*$/, '').trim();
