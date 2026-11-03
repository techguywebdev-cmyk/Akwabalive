-- Moments can come from YouTube (default) or a post on X; source_url is the original post
alter table public.moments add column if not exists source text not null default 'youtube'
  check (source in ('youtube', 'x'));
alter table public.moments add column if not exists source_url text;
