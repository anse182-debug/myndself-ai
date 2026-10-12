create table if not exists public.reflection_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  mode text not null check (mode in ('vent','understand','calm')),
  summary text not null check (char_length(summary) between 1 and 2500),
  next_step text not null default '' check (char_length(next_step) <= 500),
  clarity_before smallint check (clarity_before between 1 and 5),
  clarity_after smallint check (clarity_after between 1 and 5),
  understood text check (understood in ('yes','partly','no')),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
alter table public.reflection_sessions enable row level security;
drop policy if exists own_reflection_sessions on public.reflection_sessions;
create policy own_reflection_sessions on public.reflection_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.reflection_sessions to authenticated, service_role;
create index if not exists reflection_sessions_user_date on public.reflection_sessions(user_id, created_at desc);
