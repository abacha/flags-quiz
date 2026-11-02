create table public.players (
  id uuid primary key,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 16),
  created_at timestamptz not null default now()
);

create unique index players_nickname_key on public.players (lower(btrim(nickname)));

create table public.scores (
  player_id uuid not null references public.players on delete cascade,
  area text not null check (area in ('flags', 'maps', 'capitals')),
  continent text not null,
  level text not null,
  score int not null,
  time_ms int not null check (time_ms >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, area, continent, level)
);

alter table public.players enable row level security;
alter table public.scores enable row level security;
revoke all on public.players, public.scores from anon, authenticated;

-- The phone's secret is the only proof of a nickname, so it never leaves these functions.
create function public.claim_nickname(p_secret uuid, p_nickname text) returns void
language sql security definer set search_path = public as $$
  insert into players (id, nickname) values (p_secret, btrim(p_nickname));
$$;

create function public.submit_score(p_secret uuid, p_area text, p_continent text, p_level text, p_score int, p_time_ms int) returns void
language sql security definer set search_path = public as $$
  insert into scores (player_id, area, continent, level, score, time_ms)
  values (p_secret, p_area, p_continent, p_level, p_score, p_time_ms)
  on conflict (player_id, area, continent, level) do update
    set score = excluded.score, time_ms = excluded.time_ms, updated_at = now()
    where (excluded.score, -excluded.time_ms) > (scores.score, -scores.time_ms);
$$;

create function public.leaderboard(p_area text, p_continent text, p_level text, p_secret uuid default null)
returns table (nickname text, score int, time_ms int, rank bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select p.nickname, s.score, s.time_ms,
      rank() over (order by s.score desc, s.time_ms asc) as rank,
      row_number() over (order by s.score desc, s.time_ms asc, p.nickname) as place,
      s.player_id is not distinct from p_secret as mine
    from scores s
    join players p on p.id = s.player_id
    where s.area = p_area and s.continent = p_continent and s.level = p_level
  )
  select nickname, score, time_ms, rank, mine from ranked
  where place <= 10 or mine
  order by place;
$$;

revoke execute on function public.claim_nickname, public.submit_score, public.leaderboard from public;
grant execute on function public.claim_nickname, public.submit_score, public.leaderboard to anon;
