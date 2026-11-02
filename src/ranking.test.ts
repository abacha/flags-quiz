// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NicknameLengthError,
  NicknameTakenError,
  claimNickname,
  fetchLeaderboard,
  flushQueue,
  loadPlayer,
  queueRun,
  type RankedRun,
} from './ranking';

const URL = 'https://example.supabase.co';
const KEY = 'sb_publishable_test';
const SECRET = '11111111-1111-4111-8111-111111111111';
const africaEasy = { area: 'flags', continent: 'africa', level: 'easy' } as const;
const run = (score: number, timeMs: number, level = 'easy'): RankedRun => ({ ...africaEasy, level, score, timeMs });

const fetchMock = vi.fn();
const reply = (status: number, body: unknown = null) => new Response(body === null ? null : JSON.stringify(body), { status });
const calls = () => fetchMock.mock.calls.map(([url, init]) => ({ url, body: JSON.parse(init.body), init }));
const queue = () => JSON.parse(localStorage.getItem('flags-quiz:ranking-queue') ?? '[]');
const savePlayer = () => localStorage.setItem('flags-quiz:player', JSON.stringify({ secret: SECRET, nickname: 'Vovó' }));

describe('ranking', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(reply(204));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_URL', URL);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', KEY);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(SECRET);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('claimNickname', () => {
    it('claims the trimmed nickname with a new secret and keeps the player on the phone', async () => {
      await expect(claimNickname(localStorage, ' Vovó ')).resolves.toEqual({ secret: SECRET, nickname: 'Vovó' });
      const [{ url, body, init }] = calls();
      expect(url).toBe(`${URL}/rest/v1/rpc/claim_nickname`);
      expect(body).toEqual({ p_secret: SECRET, p_nickname: 'Vovó' });
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ apikey: KEY, 'Content-Type': 'application/json' });
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(loadPlayer(localStorage)).toEqual({ secret: SECRET, nickname: 'Vovó' });
    });

    it('rejects a taken nickname and keeps no player', async () => {
      fetchMock.mockResolvedValue(reply(409, { code: '23505' }));
      await expect(claimNickname(localStorage, 'Vovó')).rejects.toBeInstanceOf(NicknameTakenError);
      expect(loadPlayer(localStorage)).toBeNull();
    });

    it('rejects a nickname outside 2 to 16 characters without asking the server', async () => {
      await expect(claimNickname(localStorage, ' a ')).rejects.toBeInstanceOf(NicknameLengthError);
      await expect(claimNickname(localStorage, 'x'.repeat(17))).rejects.toBeInstanceOf(NicknameLengthError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('claims again with the same secret after a failed attempt, since the first may have reached the server', async () => {
      vi.mocked(crypto.randomUUID).mockReturnValueOnce(SECRET).mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
      fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
      await expect(claimNickname(localStorage, 'Vovó')).rejects.toThrow();
      await claimNickname(localStorage, 'Vovó');
      expect(calls().map(({ body }) => body.p_secret)).toEqual([SECRET, SECRET]);
      expect(loadPlayer(localStorage)).toEqual({ secret: SECRET, nickname: 'Vovó' });
    });

    it('rejects on any other server failure', async () => {
      fetchMock.mockResolvedValue(reply(500));
      await expect(claimNickname(localStorage, 'Vovó')).rejects.toThrow();
      expect(loadPlayer(localStorage)).toBeNull();
    });
  });

  describe('queueRun', () => {
    it('keeps only the best run of each level, by score and then by time', () => {
      queueRun(localStorage, run(10, 90000));
      queueRun(localStorage, run(8, 50000));
      expect(queue()).toEqual([run(10, 90000)]);
      queueRun(localStorage, run(10, 80000));
      expect(queue()).toEqual([run(10, 80000)]);
      queueRun(localStorage, run(3, 1000, 'hard'));
      expect(queue()).toEqual([run(10, 80000), run(3, 1000, 'hard')]);
    });
  });

  describe('flushQueue', () => {
    it('sends nothing without a player', async () => {
      queueRun(localStorage, run(10, 90000));
      await flushQueue(localStorage);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(queue()).toHaveLength(1);
    });

    it('sends every queued run and empties the queue', async () => {
      savePlayer();
      queueRun(localStorage, run(10, 90000));
      queueRun(localStorage, run(-2, 1000, 'hard'));
      await flushQueue(localStorage);
      expect(calls().map(({ url, body }) => [url, body])).toEqual([
        [`${URL}/rest/v1/rpc/submit_score`, { p_secret: SECRET, p_area: 'flags', p_continent: 'africa', p_level: 'easy', p_score: 10, p_time_ms: 90000 }],
        [`${URL}/rest/v1/rpc/submit_score`, { p_secret: SECRET, p_area: 'flags', p_continent: 'africa', p_level: 'hard', p_score: -2, p_time_ms: 1000 }],
      ]);
      expect(queue()).toEqual([]);
    });

    it('keeps the runs it could not send and rejects', async () => {
      savePlayer();
      queueRun(localStorage, run(10, 90000));
      queueRun(localStorage, run(3, 1000, 'hard'));
      fetchMock.mockResolvedValueOnce(reply(204)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(flushQueue(localStorage)).rejects.toThrow();
      expect(queue()).toEqual([run(3, 1000, 'hard')]);
    });

    it('forgets a player the server no longer knows and keeps its runs for the next nickname', async () => {
      savePlayer();
      queueRun(localStorage, run(10, 90000));
      fetchMock.mockResolvedValue(reply(409, { code: '23503' }));
      await flushQueue(localStorage);
      expect(loadPlayer(localStorage)).toBeNull();
      expect(queue()).toEqual([run(10, 90000)]);
    });

    it('drops a run the server refuses and sends the rest', async () => {
      savePlayer();
      queueRun(localStorage, run(10, 90000));
      queueRun(localStorage, run(3, 1000, 'hard'));
      fetchMock.mockResolvedValueOnce(reply(400, { code: '23514' })).mockResolvedValueOnce(reply(204));
      await flushQueue(localStorage);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(queue()).toEqual([]);
    });

    it('rounds the time to whole milliseconds', async () => {
      savePlayer();
      queueRun(localStorage, run(10, 90000.7));
      await flushQueue(localStorage);
      expect(calls()[0].body.p_time_ms).toBe(90001);
    });
  });

  describe('fetchLeaderboard', () => {
    it('reads the level ranking with the player secret and maps the rows', async () => {
      fetchMock.mockResolvedValue(reply(200, [{ nickname: 'Vovó', score: 18, time_ms: 192000, rank: 1, mine: true }]));
      const rows = await fetchLeaderboard(africaEasy, { secret: SECRET, nickname: 'Vovó' });
      expect(rows).toEqual([{ nickname: 'Vovó', score: 18, timeMs: 192000, rank: 1, mine: true }]);
      expect(calls()[0]).toMatchObject({
        url: `${URL}/rest/v1/rpc/leaderboard`,
        body: { p_area: 'flags', p_continent: 'africa', p_level: 'easy', p_secret: SECRET },
      });
    });

    it('reads without a secret when there is no player', async () => {
      fetchMock.mockResolvedValue(reply(200, []));
      await expect(fetchLeaderboard(africaEasy, null)).resolves.toEqual([]);
      expect(calls()[0].body).toEqual({ p_area: 'flags', p_continent: 'africa', p_level: 'easy' });
    });
  });
});
