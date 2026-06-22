import Link from 'next/link';

const FOOTER_LINKS = ['About', 'Organizers', 'Cities', 'Privacy', 'Terms'];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border px-6 md:px-11 py-8 flex flex-wrap items-center justify-between gap-4">
      <div className="font-display text-sm font-extrabold tracking-[4px] uppercase text-ink-2">
        AK<span className="text-green-light">W</span>AABA
      </div>
      <nav className="flex gap-6 flex-wrap justify-center">
        {FOOTER_LINKS.map(label => (
          <Link
            key={label}
            href="#"
            className="font-mono text-[8px] tracking-[1.5px] uppercase text-ink-4 hover:text-ink-3 transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>
      <span className="font-mono text-[8px] tracking-[1px] text-ink-4">
        © 2025 Akwaaba · Accra, Ghana
      </span>
    </footer>
  );
}
