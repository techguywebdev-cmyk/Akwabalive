-- Organisers (anyone with a published event) post moments for their shows
alter table public.moments add column if not exists posted_by uuid references auth.users(id) on delete set null;
create index if not exists moments_posted_by_idx on public.moments (posted_by) where posted_by is not null;
