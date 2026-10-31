// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { capitalLabel } from '../../data/capitals';
import { countries } from '../../data/countries';
import { listenForBack, settleBack } from '../backButton';
import type { Screen } from '../navigation';
import { renderCapitalQuizResult } from './capitalQuizResult';

const c = (iso2: string) => countries.find((country) => country.iso2 === iso2)!;

function render(overrides: Partial<Extract<Screen, { name: 'capitalQuizResult' }>>, screens: Screen[] = []): HTMLElement {
  const root = document.createElement('div');
  renderCapitalQuizResult(root, (screen) => screens.push(screen), {
    name: 'capitalQuizResult',
    continent: 'oceania',
    difficulty: 'easy',
    score: 0,
    timeMs: 0,
    errors: 0,
    finished: false,
    unanswered: [],
    missed: [],
    newRecords: { score: false, time: false },
    ...overrides,
  });
  return root;
}

const cardsUnder = (root: HTMLElement, heading: string) => {
  const h2 = [...root.querySelectorAll('h2')].find((h) => h.textContent === heading);
  return h2 ? [...h2.nextElementSibling!.querySelectorAll('.solution-card')].map((card) => card.textContent) : null;
};

describe('renderCapitalQuizResult', () => {
  it('prefixes the detail with Capitais and offers the capital quiz of the next level', () => {
    const screens: Screen[] = [];
    const root = render({ finished: true }, screens);
    expect(root.querySelector('.detail')!.textContent).toBe('Capitais · Oceania · Fácil');
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Próximo nível: Médio →')!.click();
    expect(screens).toEqual([{ name: 'capitalQuiz', continent: 'oceania', difficulty: 'medium' }]);
  });

  it('lists unanswered and missed capitals with their capital labels', () => {
    const root = render({ unanswered: [c('bo')], missed: [c('fr')] });
    expect(cardsUnder(root, 'Capitais sem resposta (1)')![0]).toContain(`Bolívia · ${capitalLabel(c('bo'))}`);
    expect(cardsUnder(root, 'Capitais que você errou')![0]).toContain(`França · ${capitalLabel(c('fr'))}`);
  });

  it('shows the continent report on the world quiz and studies the weakest continent in capital Learn', () => {
    const screens: Screen[] = [];
    const root = render({ continent: 'world', difficulty: 'general', finished: true, missed: [c('br')], unanswered: [] }, screens);
    expect(root.querySelector('.continent-report')).not.toBeNull();
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Estudar Américas →')!.click();
    expect(screens).toEqual([{ name: 'capitalGame', continent: 'americas', difficulty: 'general' }]);
    expect(cardsUnder(root, 'Capitais que você errou')).toHaveLength(1);
  });

  it('shows no continent breakdown on a continent quiz', () => {
    expect(render({ finished: true, missed: [c('fj')] }).querySelector('.continent-report')).toBeNull();
  });

  it('goes back to the hub on the device back', () => {
    const screens: Screen[] = [];
    render({}, screens);
    vi.spyOn(history, 'pushState').mockImplementation(() => {});
    vi.spyOn(history, 'back').mockImplementation(() => {});
    const stop = listenForBack();
    settleBack();
    window.dispatchEvent(new PopStateEvent('popstate'));
    stop();
    expect(screens).toEqual([{ name: 'hub', continent: 'oceania' }]);
  });
});
