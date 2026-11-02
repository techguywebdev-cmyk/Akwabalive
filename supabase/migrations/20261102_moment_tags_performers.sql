-- Moments: a category tag (concert, show, awards, culture) and a confirmed list of who performed
alter table public.moments add column if not exists category text
  check (category is null or category in ('concert', 'show', 'awards', 'culture'));
alter table public.moments add column if not exists performers text[];          -- artist slugs, biggest acts first
alter table public.moments add column if not exists performer_evidence jsonb;     -- slug -> how we know (channel, title, description, lineup)
alter table public.moments add column if not exists performers_checked_at timestamptz;
create index if not exists moments_category_idx on public.moments (category) where status = 'live';
