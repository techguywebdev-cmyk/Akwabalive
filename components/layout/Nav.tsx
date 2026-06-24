'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';

const LINKS = [
  { href: '/',       label: 'Discover' },
  { href: '/events', label: 'Events'   },
  { href: '#',       label: 'Live',    live: true },
  { href: '#',       label: 'Moments' },
  { href: '#',       label: 'Cities'  },
];

export default function Nav({
  transparent = false,
  active,
}: {
  transparent?: boolean;
  active?: string;
}) {
  const [scrolled,   setScrolled]   = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [transparent]);

  return (
    <>
      <nav
        className={clsx(
          'fixed top-0 left-0 right-0 z-[200] h-[62px]',
          'flex items-center justify-between px-5 md:px-11',
          'transition-all duration-300',
          scrolled
            ? 'bg-[#0D0B08]/95 backdrop-blur-2xl border-b border-[rgba(245,236,215,0.07)]'
            : 'bg-transparent',
        )}
      >
        <Link
          href="/"
          className="font-display text-[17px] font-extrabold tracking-[4px] uppercase text-[#F5ECD7] flex-shrink-0"
        >
          AK<span className="text-[#C8922A]">W</span>AABA
        </Link>

        <ul className="hidden md:flex">
          {LINKS.map(link => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={clsx(
                  'font-mono text-[8px] tracking-[2px] uppercase px-[18px] leading-[62px] block transition-colors',
                  active === link.label
                    ? 'text-[#C8922A]'
                    : 'text-[rgba(245,236,215,0.26)] hover:text-[#F5ECD7]',
                )}
              >
                {link.label}
                {link.live && (
                  <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#CE1126] ml-[5px] align-middle animate-[blink_1.4s_ease-in-out_infinite]" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <Link
            href="#"
            className="hidden sm:block font-mono text-[8px] tracking-[2px] uppercase text-[rgba(245,236,215,0.26)] hover:text-[#F5ECD7] transition-colors"
          >
            Sign in
          </Link>
          <button className="font-mono text-[8px] tracking-[2px] uppercase bg-[#C8922A] text-[#0D0B08] font-bold px-5 py-[9px] rounded-[5px] hover:opacity-85 transition-opacity">
            + List Event
          </button>
          <button
            className="md:hidden p-2 text-[rgba(245,236,215,0.5)]"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed top-[62px] left-0 right-0 bottom-0 bg-[#0D0B08] z-[190] p-6 flex flex-col overflow-y-auto">
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="font-mono text-[9px] tracking-[2.5px] uppercase text-[rgba(245,236,215,0.55)] py-4 border-b border-[rgba(245,236,215,0.07)] hover:text-[#C8922A] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="#"
              className="text-center font-mono text-[9px] tracking-[2px] uppercase border border-[rgba(245,236,215,0.12)] text-[rgba(245,236,215,0.55)] py-3 rounded-[6px]"
            >
              Sign in
            </Link>
            <button className="font-mono text-[9px] tracking-[2px] uppercase bg-[#C8922A] text-[#0D0B08] font-bold py-3 rounded-[6px]">
              + List Event
            </button>
          </div>
        </div>
      )}
    </>
  );
}
