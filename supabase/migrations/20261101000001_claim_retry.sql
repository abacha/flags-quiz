-- A claim the phone timed out on may already be stored, so the same secret claims again or renames.
create or replace function public.claim_nickname(p_secret uuid, p_nickname text) returns void
language sql security definer set search_path = public as $$
  insert into players (id, nickname) values (p_secret, btrim(p_nickname))
  on conflict (id) do update set nickname = excluded.nickname;
$$;
