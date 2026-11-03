-- How the night went, written from news coverage, with the articles it came from
alter table public.moments add column if not exists recap text;
alter table public.moments add column if not exists recap_sources jsonb; -- [{title, url}]
