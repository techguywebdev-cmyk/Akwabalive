-- Info lines from the event's ticket page (dial code, organiser contacts, dress code). null = not read yet, '' = nothing found
alter table public.events add column if not exists listing_info text;
