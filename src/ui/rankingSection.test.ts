// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NicknameLengthError, NicknameTakenError, claimNickname, fetchLeaderboard, flushQueue, loadPlayer, queueRun, type Standing } from '../ranking';
import { rankingSection } from './rankingSection';

vi.mock('../ranking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ranking')>();
  return {
    ...actual,
    claimNickname: vi.fn(),
    fetchLeaderboard: vi.fn(),
    flushQueue: vi.fn(),
    loadPlayer: vi.fn(),
    queueRun: vi.fn(),
  };
});

const run = { area: 'flags', continent: 'africa', level: 'easy', score: 18, timeMs: 192000 } as const;
const vovo = { secret: 's', nickname: 'Vovó' };
const standing = (rank: number, nickname: string, mine = false): Standing => ({ nickname, score: 30 - rank, timeMs: 192000, rank, mine });

const rows = (section: HTMLElement) => [...section.querySelectorAll('li')].map((li) => [li.textContent, li.className]);
const text = (section: HTMLElement) => section.querySelector('.ranking-body')!.textContent;
const settle = () => new Promise((resolve) => setTimeout(resolve));

function submitNickname(section: HTMLElement, nickname: string): void {
  section.querySelector('input')!.value = nickname;
  section.querySelector('form')!.requestSubmit();
}

describe('rankingSection', () => {
  beforeEach(() => {
    vi.mocked(flushQueue).mockReset().mockResolvedValue();
    vi.mocked(fetchLeaderboard).mockReset().mockResolvedValue([]);
    vi.mocked(loadPlayer).mockReset().mockReturnValue(vovo);
    vi.mocked(claimNickname).mockReset();
    vi.mocked(queueRun).mockReset();
  });

  it('queues the run and shows that the ranking is loading at once', () => {
    const section = rankingSection(run);
    expect(queueRun).toHaveBeenCalledWith(localStorage, run);
    expect(section.querySelector('h2')!.textContent).toBe('Ranking');
    expect(text(section)).toBe('Carregando ranking…');
  });

  it('sends the queue before reading the ranking, then lists it with the player highlighted', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue([standing(1, 'Vovó', true), standing(2, 'Tio')]);
    const section = rankingSection(run);
    await settle();
    expect(vi.mocked(flushQueue).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetchLeaderboard).mock.invocationCallOrder[0]);
    expect(fetchLeaderboard).toHaveBeenCalledWith(run, vovo);
    expect(rows(section)).toEqual([
      ['1. Vovó · 29 pts · 03:12', 'me'],
      ['2. Tio · 28 pts · 03:12', ''],
    ]);
    expect(section.querySelector('form')).toBeNull();
  });

  it('shows the player below the top 10, after a gap', async () => {
    const top = Array.from({ length: 10 }, (_, i) => standing(i + 1, `p${i + 1}`));
    vi.mocked(fetchLeaderboard).mockResolvedValue([...top, standing(12, 'Vovó', true)]);
    const section = rankingSection(run);
    await settle();
    expect(rows(section).slice(-2)).toEqual([
      ['⋯', 'gap'],
      ['12. Vovó · 18 pts · 03:12', 'me'],
    ]);
  });

  it('says nobody is ranked yet on an empty level', async () => {
    const section = rankingSection(run);
    await settle();
    expect(text(section)).toBe('Ninguém no ranking ainda');
  });

  it('still shows the ranking when the queue could not be sent', async () => {
    vi.mocked(flushQueue).mockRejectedValue(new TypeError('Failed to fetch'));
    vi.mocked(fetchLeaderboard).mockResolvedValue([standing(1, 'Tio')]);
    const section = rankingSection(run);
    await settle();
    expect(rows(section)).toEqual([['1. Tio · 29 pts · 03:12', '']]);
  });

  it('says the ranking is unavailable when it cannot be read', async () => {
    vi.mocked(fetchLeaderboard).mockRejectedValue(new TypeError('Failed to fetch'));
    const section = rankingSection(run);
    await settle();
    expect(text(section)).toBe('Ranking indisponível sem conexão');
  });

  describe('without a player', () => {
    beforeEach(() => {
      vi.mocked(loadPlayer).mockReturnValue(null);
      vi.mocked(fetchLeaderboard).mockResolvedValue([standing(1, 'Tio')]);
    });

    it('shows the ranking and asks for a nickname', async () => {
      const section = rankingSection(run);
      await settle();
      expect(rows(section)).toEqual([['1. Tio · 29 pts · 03:12', '']]);
      expect(section.querySelector('form p')!.textContent).toBe('Escolha um apelido para entrar no ranking');
      expect(section.querySelector('input')!.placeholder).toBe('Seu apelido');
      expect(section.querySelector('form button')!.textContent).toBe('Entrar');
    });

    it('claims the nickname, sends the run and shows the ranking with the player', async () => {
      const section = rankingSection(run);
      await settle();
      vi.mocked(claimNickname).mockImplementation(async () => {
        vi.mocked(loadPlayer).mockReturnValue(vovo);
        return vovo;
      });
      vi.mocked(fetchLeaderboard).mockResolvedValue([standing(1, 'Tio'), standing(2, 'Vovó', true)]);
      submitNickname(section, 'Vovó');
      await settle();
      expect(claimNickname).toHaveBeenCalledWith(localStorage, 'Vovó');
      expect(flushQueue).toHaveBeenCalledTimes(2);
      expect(rows(section)[1]).toEqual(['2. Vovó · 28 pts · 03:12', 'me']);
      expect(section.querySelector('form')).toBeNull();
    });

    it('disables Entrar while the nickname is being claimed', async () => {
      const section = rankingSection(run);
      await settle();
      let refuse: (error: Error) => void = () => {};
      vi.mocked(claimNickname).mockReturnValue(new Promise((_, reject) => (refuse = reject)));
      submitNickname(section, 'Vovó');
      const enter = section.querySelector<HTMLButtonElement>('form button')!;
      expect(enter.disabled).toBe(true);
      refuse(new NicknameTakenError());
      await settle();
      expect(enter.disabled).toBe(false);
    });

    it.each([
      [new NicknameTakenError(), 'Esse apelido já existe'],
      [new NicknameLengthError(), 'Use de 2 a 16 caracteres'],
      [new TypeError('Failed to fetch'), 'Ranking indisponível sem conexão'],
    ])('keeps the form and explains a refused nickname', async (error, message) => {
      const section = rankingSection(run);
      await settle();
      vi.mocked(claimNickname).mockRejectedValue(error);
      submitNickname(section, 'Vovó');
      await settle();
      expect(section.querySelector('.ranking-error')!.textContent).toBe(message);
      expect(section.querySelector('input')!.value).toBe('Vovó');
    });
  });
});
