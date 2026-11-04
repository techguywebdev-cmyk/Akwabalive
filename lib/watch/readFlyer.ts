'use client';

import { actsInOcr } from './acts';

export type FlyerRead = { acts: { name: string; slug?: string }[]; date: string | null; text: string };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "SAT. 14 NOV. 2026", "21ST NOV", "DEC 24TH" → "2026-11-14" (next time that day comes round when there's no year) */
function findDate(text: string): string | null {
  const t = text.toLowerCase().replace(/[.,]/g, ' ');
  const m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(20\d{2}))?/)
    ?? t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?/);
  if (!m) return null;
  const [day, mon] = /\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
  const month = MONTHS.indexOf(mon.slice(0, 3));
  if (month < 0 || day < 1 || day > 31) return null;
  const now = new Date();
  let year = m[3] ? Number(m[3]) : now.getFullYear();
  if (!m[3] && new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate())) year += 1;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Read the words on a flyer in the browser (free, nothing leaves the phone except the OCR engine download)
 * and pick out the acts we know and the date.
 */
export async function readFlyer(image: File | string): Promise<FlyerRead> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(image);
    const text = data.text ?? '';
    return { acts: actsInOcr(text).map((a) => ({ name: a.name, slug: a.slug })), date: findDate(text), text };
  } finally {
    await worker.terminate();
  }
}
