# Online ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an open per-level Quiz ranking on the three Quiz result screens, backed by Supabase.

**Architecture:** A Supabase Postgres schema exposes three `security definer` functions through PostgREST and nothing else. The client (`src/ranking.ts`) calls them with `fetch`, keeps the phone's player and a queue of unsent runs in `localStorage`, and `src/ui/rankingSection.ts` renders the ranking inside the Quiz result screens without blocking them.

**Tech Stack:** Supabase CLI 2.122.0 (`npx --yes supabase@2.122.0`), Postgres 17, pgTAP, TypeScript, Vitest with happy-dom.

**Spec:** `docs/specs/2026-11-01-online-ranking-design.md`

## Global Constraints

- Supabase project `bandeiras`, ref `jkmypoovfxdeetjdtlje`, region `sa-east-1`.
- Order: `score desc, time_ms asc`. The top holds 10 rows.
- Nicknames: 2–16 characters after trimming, unique ignoring case.
- Areas are the existing `Area` type from `src/continentChoice.ts`: `flags | maps | capitals`.
- Request timeout 5 s. No Supabase SDK.
- `localStorage` keys: `flags-quiz:player`, `flags-quiz:ranking-queue`.
- Copy (Portuguese, exact): "Ranking", "Carregando ranking…", "Ranking indisponível sem conexão", "Escolha um apelido para entrar no ranking", "Seu apelido", "Entrar", "Esse apelido já existe", "Use de 2 a 16 caracteres", "Ninguém no ranking ainda".
- Production database: no writes from tests or scripts. Only `supabase db push` and read-only `leaderboard` calls touch it.

## Review Focus

- A run finished before the player ever picks a nickname must reach the ranking once a nickname is picked (Task 3 `flushQueue` after `claimNickname`, Task 4 test).
- Several runs of the same level queued offline must send only the best one (Task 3 `queueRun` test).
- A nickname differing only in case from a taken one must be refused (Task 1 pgTAP test).
- The player's own row outside the top 10 must still come back, with its true rank (Task 1 pgTAP test).
- A negative score (wrong answers cost a point) must rank below zero and never break the request (Task 1 pgTAP test).

---

### Task 1: Schema and functions, tested locally

**Files:**
- Create: `supabase/config.toml` (from `supabase init`), `supabase/.gitignore` (from `supabase init`)
- Create: `supabase/migrations/20261101000000_ranking.sql`
- Test: `supabase/tests/ranking.test.sql`

**Interfaces:**
- Produces (RPC, all callable by `anon`):
  - `claim_nickname(p_secret uuid, p_nickname text) returns void`: inserts into `players`; a taken nickname raises `unique_violation` (PostgREST answers 409), a bad length raises `check_violation` (400).
  - `submit_score(p_secret uuid, p_area text, p_continent text, p_level text, p_score int, p_time_ms int) returns void`: upserts on `(player_id, area, continent, level)` only when `(p_score, -p_time_ms) > (score, -time_ms)`; an unknown secret raises.
  - `leaderboard(p_area text, p_continent text, p_level text, p_secret uuid default null) returns table(nickname text, score int, time_ms int, rank bigint, mine boolean)`: rows with `row_number() <= 10` plus the caller's row, `rank()` over the order, sorted by rank.

- [ ] **Step 1:** `npx --yes supabase@2.122.0 init` in the repo root; keep `supabase/.temp/` ignored.
- [ ] **Step 2: Write the failing pgTAP tests** in `supabase/tests/ranking.test.sql`, covering:
  - `claim_nickname` stores a player; `'Vovó'` then `'vovó'` throws `23505`; `' a '` and a 17-character name throw `23514`.
  - `submit_score` keeps the better run: `(10, 90000)` then `(8, 50000)` keeps 10; then `(10, 80000)` keeps 80000.
  - `leaderboard` orders by score then time, ranks a tie on both as equal, returns 10 rows plus the caller's 12th row with `rank = 12` and `mine = true`, ranks `-3` below `0`, and never returns a secret column.
  - `anon` cannot `select` from `players` or `scores`.
- [ ] **Step 3: Run to see them fail**: `npx --yes supabase@2.122.0 db start && npx --yes supabase@2.122.0 test db`. Expected: FAIL, functions missing.
- [ ] **Step 4: Write the migration**: tables `players(id uuid primary key, nickname text not null check (char_length(btrim(nickname)) between 2 and 16), created_at timestamptz default now())` with `unique index on lower(btrim(nickname))`, and `scores(player_id uuid references players on delete cascade, area text check (area in ('flags','maps','capitals')), continent text, level text, score int, time_ms int check (time_ms >= 0), updated_at timestamptz default now(), primary key (player_id, area, continent, level))`; enable RLS on both with no policies; revoke all on both from `anon, authenticated`; the three functions as `security definer set search_path = public`, `grant execute ... to anon`. `claim_nickname` stores `btrim(p_nickname)`.
- [ ] **Step 5: Run to see them pass**: `npx --yes supabase@2.122.0 db reset && npx --yes supabase@2.122.0 test db`. Expected: all pass.
- [ ] **Step 6: Commit** `supabase/` with `feat: add the ranking schema and its functions`.

### Task 2: Ship the schema and the client config

**Files:**
- Create: `.env` (committed: both values ship in the public bundle)
- Modify: `vite.config.ts` (fail the build without the two variables)

- [ ] **Step 1:** `npx --yes supabase@2.122.0 link --project-ref jkmypoovfxdeetjdtlje` with the password from `~/.config/flags-quiz/supabase-db-password`, then `npx --yes supabase@2.122.0 db push`. Expected: the migration listed as applied.
- [ ] **Step 2:** Read the anon key with `npx --yes supabase@2.122.0 projects api-keys --project-ref jkmypoovfxdeetjdtlje` and write `.env` with `VITE_SUPABASE_URL=https://jkmypoovfxdeetjdtlje.supabase.co` and `VITE_SUPABASE_ANON_KEY=<anon key>`.
- [ ] **Step 3: Smoke-test read-only**: `curl` `POST /rest/v1/rpc/leaderboard` with `{"p_area":"flags","p_continent":"africa","p_level":"easy"}` and the anon key. Expected: `200` and `[]`. A `GET /rest/v1/players` with the anon key. Expected: `401` or `403`, or `[]` with no rows exposed.
- [ ] **Step 4:** In `vite.config.ts`, read `loadEnv(mode, process.cwd(), 'VITE_')` and throw on `command === 'build'` when either variable is empty. Verify with `npm run build` (passes) and `VITE_SUPABASE_URL= npm run build` (fails with a message naming the variable).
- [ ] **Step 5: Commit** `.env vite.config.ts` with `chore: point the client at the ranking project`.

### Task 3: Ranking client

**Files:**
- Create: `src/ranking.ts`
- Test: `src/ranking.test.ts`

**Interfaces:**
- Consumes: Task 1 RPCs; `import.meta.env.VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Produces:
  - `type RankedLevel = { area: Area; continent: ContinentKey; level: string }`
  - `type RankedRun = RankedLevel & { score: number; timeMs: number }`
  - `type Player = { secret: string; nickname: string }`
  - `type Standing = { nickname: string; score: number; timeMs: number; rank: number; mine: boolean }`
  - `class NicknameTakenError extends Error`, `class NicknameLengthError extends Error`
  - `loadPlayer(store: RankingStore): Player | null`
  - `claimNickname(store: RankingStore, nickname: string): Promise<Player>`: checks the length client-side first (`NicknameLengthError`), creates the secret with `crypto.randomUUID()`, maps 409 to `NicknameTakenError`, saves the player.
  - `queueRun(store: RankingStore, run: RankedRun): void`: keeps one run per level, the better by `score desc, timeMs asc`.
  - `flushQueue(store: RankingStore): Promise<void>`: without a player does nothing; otherwise submits each queued run and removes it once accepted; a failed request leaves the rest queued and rejects.
  - `fetchLeaderboard(level: RankedLevel, player: Player | null): Promise<Standing[]>`
  - `RankingStore = Pick<Storage, 'getItem' | 'setItem'>`

- [ ] **Step 1: Write the failing tests** with `vi.stubGlobal('fetch', ...)` and `vi.stubEnv`:
  - each RPC posts to `${VITE_SUPABASE_URL}/rest/v1/rpc/<name>` with `apikey` and `Authorization: Bearer <anon>` headers and the `p_`-prefixed body;
  - `claimNickname(' Vovó ')` posts `p_nickname: 'Vovó'` and saves `{ secret, nickname: 'Vovó' }`; a 409 rejects with `NicknameTakenError` and saves nothing; `'a'` rejects with `NicknameLengthError` with no request;
  - `queueRun` twice on one level keeps `(10, 90000)` over `(8, 50000)`, and `(10, 80000)` over `(10, 90000)`; two levels keep two runs;
  - `flushQueue` with no player sends nothing; with a player sends each run and empties the queue; when the second request fails it rejects and keeps that run;
  - `fetchLeaderboard` maps `time_ms` to `timeMs` and passes `p_secret` only with a player;
  - every request carries `signal` from `AbortSignal.timeout(5000)`.
- [ ] **Step 2: Run** `rtk npx vitest run src/ranking.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `src/ranking.ts` with one private `rpc(name, body)` doing the `fetch`, throwing on `!response.ok` with the status kept on the error.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat: talk to the ranking from the client`.

### Task 4: Ranking section

**Files:**
- Create: `src/ui/rankingSection.ts`
- Test: `src/ui/rankingSection.test.ts`
- Modify: `src/style.css` (`.ranking`, `.ranking li.me`), `src/style.test.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces: `rankingSection(run: RankedRun): HTMLElement`, which queues `run`, returns at once showing "Carregando ranking…", then flushes and fills in.

- [ ] **Step 1: Write the failing tests** with `src/ranking` mocked:
  - it queues the run and shows "Carregando ranking…" synchronously;
  - with a player it flushes, then lists rows as `1. Vovó · 18 pts · 03:12` (time from `formatTime`), the caller's row with class `me`, and a caller ranked 12th after the top 10 behind a separator;
  - without a player it shows the top plus the form ("Escolha um apelido para entrar no ranking", input placeholder "Seu apelido", button "Entrar"); `NicknameTakenError` shows "Esse apelido já existe" and keeps the form; `NicknameLengthError` shows "Use de 2 a 16 caracteres"; success flushes and re-renders with the caller highlighted;
  - an empty list shows "Ninguém no ranking ainda";
  - a rejected flush or fetch shows "Ranking indisponível sem conexão".
- [ ] **Step 2: Run** `rtk npx vitest run src/ui/rankingSection.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with `el()`, a `section.ranking` holding an `h2` "Ranking" and a body replaced on each state.
- [ ] **Step 4: Run** the same command plus `src/style.test.ts` (a test that `.ranking li.me` sets `font-weight`). Expected: PASS.
- [ ] **Step 5: Commit** with `feat: show the level ranking`.

### Task 5: Wire it in

**Files:**
- Modify: `src/ui/screens/quizResult.ts`, `capitalQuizResult.ts`, `mapQuizResult.ts`, `src/ui/screens/hub.ts`, `README.md`, the spec's `Status`
- Test: the matching `*.test.ts`

- [ ] **Step 1: Write the failing tests**: each Quiz result screen renders a `.ranking` right after the stat blocks, built from `{ area, continent, level, score, timeMs }` of its screen (`flags` with `difficulty`, `capitals` with `difficulty`, `maps` with `level`); `renderHub` calls `flushQueue(localStorage)` once and survives its rejection. Mock `../rankingSection` and `../../ranking` in these tests.
- [ ] **Step 2: Run** `rtk npx vitest run src/ui/screens`. Expected: FAIL.
- [ ] **Step 3: Implement**: insert `rankingSection(...)` after `statBlocks(...)`; in the hub, `void flushQueue(localStorage).catch(() => {})`, since a failed flush keeps the queue for the next chance.
- [ ] **Step 4: Run** `rtk npx vitest run && npx tsc --noEmit`. Expected: all pass, no type errors.
- [ ] **Step 5:** README: one paragraph on the ranking; spec `Status: implemented`. Commit with `feat: rank Quiz results online`.
