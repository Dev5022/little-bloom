begin;

create table if not exists public.baby_shower_rsvps (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 100),
  attendance text not null check (attendance in ('yes', 'no')),
  guests integer not null,
  message text not null default '' check (char_length(message) <= 1000),
  created_at timestamptz(3) not null default clock_timestamp(),
  constraint baby_shower_guest_count check (
    (attendance = 'yes' and guests between 1 and 10) or
    (attendance = 'no' and guests = 0)
  )
);

create index if not exists baby_shower_created_id_idx
  on public.baby_shower_rsvps (created_at desc, id desc);

create table if not exists public.baby_shower_hosts (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.baby_shower_rsvps enable row level security;
alter table public.baby_shower_hosts enable row level security;

-- The host allowlist is managed only through the Supabase dashboard/SQL editor.
revoke all on public.baby_shower_hosts from public, anon, authenticated;
grant all on public.baby_shower_hosts to service_role;

create or replace function public.is_baby_shower_host()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.baby_shower_hosts
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_baby_shower_host() from public, anon;
grant execute on function public.is_baby_shower_host() to authenticated, service_role;

revoke all on public.baby_shower_rsvps from public, anon, authenticated;
grant select on public.baby_shower_rsvps to authenticated;
grant all on public.baby_shower_rsvps to service_role;

drop policy if exists baby_shower_host_read on public.baby_shower_rsvps;
create policy baby_shower_host_read on public.baby_shower_rsvps
  for select to authenticated
  using ((select public.is_baby_shower_host()));

-- No public insert/read policies: anonymous form writes go through the
-- validated Next.js API using its server-only secret key.
commit;
