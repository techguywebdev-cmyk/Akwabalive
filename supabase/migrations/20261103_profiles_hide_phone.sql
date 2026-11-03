-- Phone numbers are private: the public API can read every profile column except phone
revoke select on public.profiles from anon, authenticated;
grant select (id, username, full_name, avatar_url, bio, is_public, created_at) on public.profiles to anon, authenticated;
