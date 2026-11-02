import type { Area } from './continentChoice';
import type { ContinentKey } from './engine/pool';

export type RankingStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface RankedLevel {
  area: Area;
  continent: ContinentKey;
  level: string;
}

export interface RankedRun extends RankedLevel {
  score: number;
  timeMs: number;
}

export interface Player {
  secret: string;
  nickname: string;
}

export interface Standing {
  nickname: string;
  score: number;
  timeMs: number;
  rank: number;
  mine: boolean;
}

export class NicknameTakenError extends Error {}
export class NicknameLengthError extends Error {}

class RankingRequestError extends Error {
  constructor(readonly status: number) {
    super(`Ranking request failed with ${status}`);
  }
}

const PLAYER_KEY = 'flags-quiz:player';
const SECRET_KEY = 'flags-quiz:secret';
const QUEUE_KEY = 'flags-quiz:ranking-queue';
const TIMEOUT_MS = 5000;
const NICKNAME_LENGTH = { min: 2, max: 16 };
const CONFLICT = 409;
const BAD_REQUEST = 400;

async function rpc(name: string, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new RankingRequestError(response.status);
  return response;
}

export function loadPlayer(store: RankingStore): Player | null {
  const raw = store.getItem(PLAYER_KEY);
  return raw === null ? null : (JSON.parse(raw) as Player);
}

function phoneSecret(store: RankingStore): string {
  const secret = store.getItem(SECRET_KEY) ?? crypto.randomUUID();
  store.setItem(SECRET_KEY, secret);
  return secret;
}

export async function claimNickname(store: RankingStore, nickname: string): Promise<Player> {
  const trimmed = nickname.trim();
  const length = [...trimmed].length;
  if (length < NICKNAME_LENGTH.min || length > NICKNAME_LENGTH.max) throw new NicknameLengthError();
  const player = { secret: phoneSecret(store), nickname: trimmed };
  try {
    await rpc('claim_nickname', { p_secret: player.secret, p_nickname: trimmed });
  } catch (error) {
    if (error instanceof RankingRequestError && error.status === CONFLICT) throw new NicknameTakenError();
    if (error instanceof RankingRequestError && error.status === BAD_REQUEST) throw new NicknameLengthError();
    throw error;
  }
  store.setItem(PLAYER_KEY, JSON.stringify(player));
  return player;
}

const sameLevel = (a: RankedLevel, b: RankedLevel) => a.area === b.area && a.continent === b.continent && a.level === b.level;
const sameRun = (a: RankedRun, b: RankedRun) => sameLevel(a, b) && a.score === b.score && a.timeMs === b.timeMs;
const beats = (a: RankedRun, b: RankedRun) => a.score > b.score || (a.score === b.score && a.timeMs < b.timeMs);

function loadQueue(store: RankingStore): RankedRun[] {
  return JSON.parse(store.getItem(QUEUE_KEY) ?? '[]') as RankedRun[];
}

function saveQueue(store: RankingStore, queue: RankedRun[]): void {
  store.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueRun(store: RankingStore, run: RankedRun): void {
  const queue = loadQueue(store);
  const queued = queue.findIndex((other) => sameLevel(other, run));
  if (queued === -1) queue.push(run);
  else if (beats(run, queue[queued])) queue[queued] = run;
  saveQueue(store, queue);
}

export async function flushQueue(store: RankingStore): Promise<void> {
  const player = loadPlayer(store);
  if (!player) return;
  for (const run of loadQueue(store)) {
    try {
      await rpc('submit_score', {
        p_secret: player.secret,
        p_area: run.area,
        p_continent: run.continent,
        p_level: run.level,
        p_score: run.score,
        p_time_ms: Math.round(run.timeMs),
      });
    } catch (error) {
      if (!(error instanceof RankingRequestError)) throw error;
      if (error.status === CONFLICT) return store.removeItem(PLAYER_KEY);
      if (error.status !== BAD_REQUEST) throw error;
    }
    saveQueue(store, loadQueue(store).filter((other) => !sameRun(other, run)));
  }
}

export async function fetchLeaderboard(level: RankedLevel, player: Player | null): Promise<Standing[]> {
  const response = await rpc('leaderboard', {
    p_area: level.area,
    p_continent: level.continent,
    p_level: level.level,
    ...(player ? { p_secret: player.secret } : {}),
  });
  const rows = (await response.json()) as { nickname: string; score: number; time_ms: number; rank: number; mine: boolean }[];
  return rows.map(({ time_ms, ...row }) => ({ ...row, timeMs: time_ms }));
}
