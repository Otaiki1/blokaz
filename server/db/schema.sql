-- Run this in your Supabase SQL editor to set up session persistence.

create table if not exists game_sessions (
  id               uuid primary key default gen_random_uuid(),
  address          text not null,
  seed             text not null,
  on_chain_game_id text,
  on_chain_seed    text,
  move_history     jsonb not null default '[]',
  score            integer not null default 0,
  score_boost_active boolean not null default false,
  is_game_over     boolean not null default false,
  revive_count     integer not null default 0,
  status           text not null default 'active',  -- active | submitted | abandoned
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Fast lookup: latest active session by address
create index if not exists idx_game_sessions_address_status
  on game_sessions (address, status, updated_at desc);

-- Fast lookup: active session by address + seed (used by sync)
create index if not exists idx_game_sessions_address_seed
  on game_sessions (address, seed, status);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger game_sessions_updated_at
  before update on game_sessions
  for each row execute function set_updated_at();

-- Row-level security: service role key bypasses RLS (server-side only)
alter table game_sessions enable row level security;

-- No public access — all reads/writes go through the server using the service role key
create policy "service role only" on game_sessions
  using (false)
  with check (false);
