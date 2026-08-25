import { NextResponse } from 'next/server';
import { parseEventLink } from '@/lib/ingest/parseEventLink';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Paste a post or ticket URL.' }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'That is not a valid URL.' }, { status: 400 });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http(s) links are allowed.' }, { status: 400 });
    }
    const draft = await parseEventLink(parsed.toString());
    return NextResponse.json({ draft });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Could not read that link.' },
      { status: 500 },
    );
  }
}
