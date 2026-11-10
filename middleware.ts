import { NextResponse, type NextRequest } from 'next/server';

/** The old address forwards to tsacoal.com, keeping the path (API routes and cron jobs are left alone) */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  if (host === 'akwabalive.vercel.app') {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, 'https://tsacoal.com');
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api/|_next/|favicon|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$).*)'] };
