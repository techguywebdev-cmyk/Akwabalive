-- Words read off the flyer (OCR), used to find contacts, dress code and the like for the event page
alter table public.events add column if not exists flyer_text text check (flyer_text is null or char_length(flyer_text) <= 4000);
