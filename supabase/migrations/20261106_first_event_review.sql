-- A new organiser's first event is checked before it goes live; once one is approved they publish straight away
create or replace function public.first_event_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_akwaaba_admin() then return new; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not exists (select 1 from events e where e.organizer_id = new.organizer_id and e.status = 'published' and e.id <> new.id) then
    new.status := 'pending_review';
  end if;
  return new;
end $$;
drop trigger if exists first_event_review on public.events;
create trigger first_event_review before insert or update of status on public.events for each row execute function public.first_event_review();

-- The admin reviews every organiser's events (read and change status), not only the imported ones
create policy "Admin reviews all events" on public.events for select to authenticated using (public.is_akwaaba_admin());
create policy "Admin updates all events" on public.events for update to authenticated using (public.is_akwaaba_admin()) with check (public.is_akwaaba_admin());
