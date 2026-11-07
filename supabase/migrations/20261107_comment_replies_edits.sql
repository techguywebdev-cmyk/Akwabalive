-- Replies and edits for comments (moments + events). Applied by Leo in the SQL editor, 7 Nov 2026.
alter table public.moment_comments add column if not exists parent_id uuid references public.moment_comments(id) on delete cascade;
alter table public.moment_comments add column if not exists edited_at timestamptz;
alter table public.event_comments  add column if not exists parent_id uuid references public.event_comments(id) on delete cascade;
alter table public.event_comments  add column if not exists edited_at timestamptz;
create index if not exists moment_comments_parent_idx on public.moment_comments(parent_id);
create index if not exists event_comments_parent_idx  on public.event_comments(parent_id);

drop policy if exists moment_comments_update_own on public.moment_comments;
create policy moment_comments_update_own on public.moment_comments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists event_comments_update_own on public.event_comments;
create policy event_comments_update_own on public.event_comments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.comment_edit_guard() returns trigger language plpgsql as $$
begin
  if not public.is_akwaaba_admin() then
    new.user_id    := old.user_id;
    new.created_at := old.created_at;
    new.hidden     := old.hidden;
    new.parent_id  := old.parent_id;
  end if;
  if new.content is distinct from old.content then new.edited_at := now(); end if;
  return new;
end $$;
drop trigger if exists moment_comments_edit_guard on public.moment_comments;
create trigger moment_comments_edit_guard before update on public.moment_comments for each row execute function public.comment_edit_guard();
drop trigger if exists event_comments_edit_guard on public.event_comments;
create trigger event_comments_edit_guard before update on public.event_comments for each row execute function public.comment_edit_guard();
