'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';

const LINKS = [
  { href: '/', label: 'Discover' },
  { href: '/events', label: 'Events' },
  { href: '#', label: 'Live', live: true },
  { href: '#', label: 'Moments' },
  { href: '#', label: 'Cities' },
];

export default function Nav({
  transparent = false,
  active,
}: {
  /** Start transparent and solidify on scroll (used over a hero) */
  transparent?: boolean;
  active?: string;
}) {
  const [scrolled, setScrolled] = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparent]);

  return (
    <>
      <nav
        className={clsx(
          'fixed top-0 left-0 right-0 z-[200] h-[62px] flex items-center justify-between px-6 md:px-11 transition-colors duration-300',
          scrolled
            ? 'bg-bg/95 backdrop-blur-2xl border-b border-border'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <Link
          href="/"
          className="font-display text-[17px] font-extrabold tracking-[4px] uppercase text-ink"
        >
          AK<span className="text-green-light">W</span>AABA
        </Link>

        <ul className="hidden md:flex">
          {LINKS.map(link => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={clsx(
                  'font-mono text-[8px] tracking-[2px] uppercase px-[18px] leading-[62px] block transition-colors',
                  active === link.label
                    ? 'text-green-light'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                {link.label}
                {link.live && (
                  <span className="inline-block w-[5px] h-[5px] rounded-full bg-red ml-[5px] align-middle animate-blink" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <Link
            href="#"
            className="hidden sm:block font-mono text-[8px] tracking-[2px] uppercase text-ink-3 hover:text-ink transition-colors"
          >
            Sign in
          </Link>
          <button className="font-mono text-[8px] tracking-[2px] uppercase bg-green text-white px-5 py-[9px] rounded-[5px] hover:bg-green-light transition-colors">
            + List Event
          </button>
          <button
            className="md:hidden p-2 text-ink-2"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed top-[62px] left-0 right-0 bottom-0 bg-bg z-[190] p-6 flex flex-col overflow-y-auto">
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="font-mono text-[9px] tracking-[2.5px] uppercase text-ink-2 py-4 border-b border-border hover:text-green-light transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
