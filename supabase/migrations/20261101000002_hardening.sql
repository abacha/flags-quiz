alter table public.scores
  add constraint scores_continent_check check (continent in ('world', 'africa', 'americas', 'asia', 'europe', 'oceania')),
  add constraint scores_level_check check (char_length(level) <= 32 and level ~ '^[a-z]+(-[a-z]+)*$');

drop index public.players_nickname_key;
create unique index players_nickname_key on public.players (lower(normalize(btrim(nickname), NFC)));

create index scores_level_rank_idx on public.scores (area, continent, level, score desc, time_ms);

create or replace function public.claim_nickname(p_secret uuid, p_nickname text) returns void
language sql security definer set search_path = '' as $$
  insert into public.players (id, nickname) values (p_secret, normalize(btrim(p_nickname), NFC))
  on conflict (id) do update set nickname = excluded.nickname;
$$;

create or replace function public.submit_score(p_secret uuid, p_area text, p_continent text, p_level text, p_score int, p_time_ms int) returns void
language sql security definer set search_path = '' as $$
  insert into public.scores (player_id, area, continent, level, score, time_ms)
  values (p_secret, p_area, p_continent, p_level, p_score, p_time_ms)
  on conflict (player_id, area, continent, level) do update
    set score = excluded.score, time_ms = excluded.time_ms, updated_at = now()
    where (excluded.score, -excluded.time_ms) > (scores.score, -scores.time_ms);
$$;

create or replace function public.leaderboard(p_area text, p_continent text, p_level text, p_secret uuid default null)
returns table (nickname text, score int, time_ms int, rank bigint, mine boolean)
language sql stable security definer set search_path = '' as $$
  with ranked as (
    select p.nickname, s.score, s.time_ms,
      rank() over (order by s.score desc, s.time_ms asc) as rank,
      row_number() over (order by s.score desc, s.time_ms asc, p.nickname) as place,
      s.player_id is not distinct from p_secret as mine
    from public.scores s
    join public.players p on p.id = s.player_id
    where s.area = p_area and s.continent = p_continent and s.level = p_level
  )
  select nickname, score, time_ms, rank, mine from ranked
  where place <= 10 or mine
  order by place;
$$;

revoke execute on function public.claim_nickname, public.submit_score, public.leaderboard from authenticated;
