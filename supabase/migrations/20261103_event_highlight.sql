-- The organiser's one special line, shown as a highlighted tag ("Surprise guests")
alter table public.events add column if not exists highlight text;
alter table public.events drop constraint if exists events_highlight_len;
alter table public.events add constraint events_highlight_len check (highlight is null or char_length(highlight) <= 32);
