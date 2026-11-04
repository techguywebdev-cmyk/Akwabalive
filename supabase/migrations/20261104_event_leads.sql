-- Leads for events we don't list yet (campus nights from the press): admin reviews, then creates the event from the link
create table if not exists public.event_leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'campus',
  title text not null,
  link text not null unique,
  source text,
  school text,
  status text not null default 'pending' check (status in ('pending','added','dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.event_leads enable row level security;
create policy event_leads_admin on public.event_leads for all using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());
