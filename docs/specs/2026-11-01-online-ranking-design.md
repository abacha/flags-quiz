# Flags Quiz — Online ranking

Date: 2026-11-01
Status: implemented

## Reasoning

The game is played by family and friends, and each Quiz record lives only on the phone that set it.
A shared ranking turns a private record into something to beat, which is the point of the game-feel work that came before it.
The ranking shows up where a record happens: on the Quiz result screen.

The app is a static site on GitHub Pages with no server.
Supabase supplies the table and a public HTTP API, so the site stays static.
Every score is computed on the phone, so anyone with the browser console can post a fake one; for a family ranking that is accepted.

## Goals

- Every Quiz level (Bandeiras, Mapas and Capitais, every continent and Mundo, every tier) has one open ranking.
- The Quiz result shows the top 10 of its level and the player's own place, highlighted, even outside the top 10.
- A nickname, once chosen on a phone, belongs to that phone: nobody else can post under it.
- A result set offline is sent the next time the app is online.
- The result screen never waits for the network.

## Non-goals

- Cheat prevention: scores are trusted as sent.
- Accounts or login, and moving a nickname to a second phone.
- Moderating nicknames.
- A ranking for Aprender, or a ranking screen in the hub.

## Decided (Adriano, 2026-11-01)

- **Open ranking**, anyone who plays the public site can appear.
- **Order**: most points first, and the shorter time breaks a tie. Every Quiz run counts with its own time, finished or not.
- **Where**: on the Quiz result screen, right after the run.
- **Infra**: a Supabase project, `bandeiras` in `sa-east-1`, on the free plan. The site stays on GitHub Pages.

## Calls made without Adriano (check while reading)

- **Top 10 on every Quiz result**, whenever the app is online, with or without a new record.
- **Nickname taken**: the field says "Esse apelido já existe" and asks for another. Nicknames are 2–16 characters, trimmed, and unique ignoring case.
- **Asking for the nickname**: the ranking section of the first result screen shows a field "Escolha um apelido para entrar no ranking". It is optional; a player who never fills it plays on, out of the ranking. Once chosen, the phone keeps it.
- **One line per nickname and level**, holding that player's best run. Each run is sent, and the server keeps it only when it beats the stored one.
- **Offline**: the run is queued on the phone and sent on the next result screen or the next hub visit with a connection. Without a connection the section reads "Ranking indisponível sem conexão".

## Design

### Server

Migrations live in `supabase/migrations/` and are applied with `supabase db push` to the linked project.

- `players`: `id uuid` (the phone's secret), `nickname text`, with a unique index on `lower(nickname)`.
- `scores`: `player_id`, `area` (`flags` | `maps` | `capitals`), `continent`, `level`, `score int`, `time_ms int`, `updated_at`, with one row per player and level.
- Row level security denies every direct read and write from the anonymous key.
- Three `security definer` functions are the whole public API, called through PostgREST `/rest/v1/rpc/`:
  - `claim_nickname(secret, nickname)` creates the player and fails with a distinct error when the nickname is taken;
  - `submit_score(secret, area, continent, level, score, time_ms)` upserts the row only when `(score desc, time_ms asc)` beats the stored one;
  - `leaderboard(area, continent, level, secret)` returns the top 10 as nickname, score, time and rank, plus the caller's own row and rank. The secret never leaves the `players` table.

### Client

- Plain `fetch` to the RPC endpoints with a 5 s timeout, and no Supabase SDK in the bundle.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` live in a committed `.env`, since both ship in the public bundle anyway and the publishable key can only call the three functions. The build fails when either is missing.
- Phone state in `localStorage`: `flags-quiz:player` (secret and nickname) and `flags-quiz:ranking-queue` (runs waiting to be sent).
- `runQuiz` already hands every result screen its score and time. The three Quiz result screens gain a ranking section that renders empty, sends the queue, then fills in with the leaderboard.
- The service worker never caches the Supabase origin.

## Left to the builder

- The look of the ranking section, within the existing card and tag styles.
- Retries: the queue is retried on each opportunity above, with no background timer.
