-- First create and confirm your email/password user in
-- Supabase > Authentication > Users > Add user.
-- Replace the email below with that user's email (and use it as HOST_EMAIL).
-- This raises an error rather than silently enabling no account.
do $$
declare
  host_user_id uuid;
begin
  select id into host_user_id from auth.users
    where lower(email) = lower('your-host-email@example.com');
  if host_user_id is null then
    raise exception 'Create the host Auth user and replace the email in this script first.';
  end if;
  insert into public.baby_shower_hosts (user_id) values (host_user_id)
    on conflict (user_id) do nothing;
end;
$$;
