-- Pine Holler Ranger: cloud saves for signed-in players.
-- Paste this whole file into Supabase -> SQL Editor -> New query, then press Run.
-- Safe to run more than once.

create table if not exists public.pine_holler_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  prev       jsonb,
  day        integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint pine_holler_saves_size check (octet_length(data::text) < 1000000)
);

-- Row Level Security: a player can only ever see or change their own save.
alter table public.pine_holler_saves enable row level security;

drop policy if exists "read own save" on public.pine_holler_saves;
create policy "read own save" on public.pine_holler_saves
  for select using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.pine_holler_saves;
create policy "insert own save" on public.pine_holler_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.pine_holler_saves;
create policy "update own save" on public.pine_holler_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every upload keeps the one before it in `prev`, so a bad save can be undone.
create or replace function public.pine_holler_saves_keep_prev() returns trigger
language plpgsql as $$
begin
  if new.data is distinct from old.data then
    new.prev := old.data;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pine_holler_saves_keep_prev on public.pine_holler_saves;
create trigger pine_holler_saves_keep_prev before update on public.pine_holler_saves
  for each row execute function public.pine_holler_saves_keep_prev();
