begin;
select plan(30);

-- nicknames
select lives_ok($$select claim_nickname('00000000-0000-0000-0000-000000000001', ' Vovó ')$$, 'claims a nickname');
select is((select nickname from players where id = '00000000-0000-0000-0000-000000000001'), 'Vovó', 'stores the nickname trimmed');
select throws_ok($$select claim_nickname('00000000-0000-0000-0000-000000000002', 'vovó')$$, '23505', null, 'refuses a nickname taken in another case');
select throws_ok($$select claim_nickname(gen_random_uuid(), ' a ')$$, '23514', null, 'refuses a nickname shorter than 2 characters');
select throws_ok($$select claim_nickname(gen_random_uuid(), repeat('x', 17))$$, '23514', null, 'refuses a nickname longer than 16 characters');

select lives_ok($$select claim_nickname('00000000-0000-0000-0000-000000000001', 'Vovó')$$, 'accepts a retried claim of the same nickname from the same phone');
select lives_ok($$select claim_nickname('00000000-0000-0000-0000-000000000003', 'Tio'); select claim_nickname('00000000-0000-0000-0000-000000000003', 'Titio')$$, 'lets a phone change its own nickname');
select is((select nickname from players where id = '00000000-0000-0000-0000-000000000003'), 'Titio', 'keeps one nickname per phone');

select throws_ok($$select claim_nickname(gen_random_uuid(), U&'Vovo\0301')$$, '23505', null, 'refuses a nickname that only differs in its Unicode form');
select is((select nickname from players where id = '00000000-0000-0000-0000-000000000001'), U&'Vov\00F3', 'stores the nickname in its composed form');

-- best run per level
select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'africa', 'easy', 10, 90000);
select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'africa', 'easy', 8, 50000);
select is((select score from scores where player_id = '00000000-0000-0000-0000-000000000001'), 10, 'keeps the higher score over a faster lower one');
select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'africa', 'easy', 10, 80000);
select is((select time_ms from scores where player_id = '00000000-0000-0000-0000-000000000001'), 80000, 'keeps the faster run on an equal score');
select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'africa', 'easy', 10, 85000);
select is((select time_ms from scores where player_id = '00000000-0000-0000-0000-000000000001'), 80000, 'ignores a slower run on an equal score');
select is((select count(*) from scores), 1::bigint, 'holds one row per player and level');
select throws_ok($$select submit_score(gen_random_uuid(), 'flags', 'africa', 'easy', 1, 1)$$, '23503', null, 'refuses a run from an unknown player');
select throws_ok($$select submit_score('00000000-0000-0000-0000-000000000001', 'darts', 'africa', 'easy', 1, 1)$$, '23514', null, 'refuses an unknown area');

select throws_ok($$select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'atlantis', 'easy', 1, 1)$$, '23514', null, 'refuses an unknown continent');
select throws_ok($$select submit_score('00000000-0000-0000-0000-000000000001', 'flags', 'africa', repeat('a', 33), 1, 1)$$, '23514', null, 'refuses a level that is not a short slug');

-- order, ties and negative scores
do $$
declare
  runs constant jsonb := '[["Ana", 5, 100], ["Bia", 5, 100], ["Caio", 5, 50], ["Duda", -3, 10], ["Edu", 0, 10]]';
  run jsonb;
  secret uuid;
begin
  for run in select * from jsonb_array_elements(runs) loop
    secret := gen_random_uuid();
    perform claim_nickname(secret, run->>0);
    perform submit_score(secret, 'flags', 'africa', 'hard', (run->>1)::int, (run->>2)::int);
  end loop;
end $$;
select results_eq(
  $$select nickname, rank from leaderboard('flags', 'africa', 'hard') order by rank, nickname$$,
  $$values ('Caio', 1::bigint), ('Ana', 2::bigint), ('Bia', 2::bigint), ('Edu', 4::bigint), ('Duda', 5::bigint)$$,
  'orders by score, breaks ties by time, ranks an exact tie equal and puts a negative score last'
);

-- top 10 plus the caller
do $$
begin
  for i in 1..12 loop
    perform claim_nickname(('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'p' || i);
    perform submit_score(('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'maps', 'europe', 'all', 21 - i, 1000);
  end loop;
end $$;
select is((select count(*) from leaderboard('maps', 'europe', 'all')), 10::bigint, 'returns the top 10 without a caller');
select is((select count(*) from leaderboard('maps', 'europe', 'all', '00000000-0000-0000-0000-000000000112')), 11::bigint, 'adds the caller below the top 10');
select results_eq(
  $$select nickname, rank, mine from leaderboard('maps', 'europe', 'all', '00000000-0000-0000-0000-000000000112') where mine$$,
  $$values ('p12', 12::bigint, true)$$,
  'returns the caller with the true rank'
);
select is((select count(*) from leaderboard('maps', 'europe', 'all', '00000000-0000-0000-0000-000000000101') where mine), 1::bigint, 'marks a caller inside the top 10 once');
select is(
  pg_get_function_result('leaderboard(text, text, text, uuid)'::regprocedure),
  'TABLE(nickname text, score integer, time_ms integer, rank bigint, mine boolean)',
  'never returns a secret'
);

select has_index('public', 'scores', 'scores_level_rank_idx', 'indexes the ranking of a level');
select is(
  (select count(*) from pg_proc where proname in ('claim_nickname', 'submit_score', 'leaderboard') and proconfig = array['search_path=""']),
  3::bigint,
  'runs every public function with an empty search path'
);
select ok(
  not has_function_privilege('authenticated', 'claim_nickname(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'submit_score(uuid, text, text, text, int, int)', 'execute')
    and not has_function_privilege('authenticated', 'leaderboard(text, text, text, uuid)', 'execute'),
  'leaves the functions to the anonymous key alone'
);

-- the anonymous key only reaches the functions
set local role anon;
select throws_ok($$select * from players$$, '42501', null, 'hides players from the anonymous key');
select throws_ok($$select * from scores$$, '42501', null, 'hides scores from the anonymous key');
select lives_ok($$select * from leaderboard('flags', 'africa', 'easy')$$, 'lets the anonymous key read a ranking');
reset role;

select * from finish();
rollback;
