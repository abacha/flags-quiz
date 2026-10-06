import { countries, type Continent } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import { hasMedal, loadMedals } from '../../progress';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from '../labels';
import type { Navigate } from '../navigation';

export function renderDifficulty(root: HTMLElement, navigate: Navigate, continent: Continent): void {
  const medals = loadMedals(localStorage);
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      ...DIFFICULTIES.map((difficulty) =>
        el('button', { className: 'big', onclick: () => navigate({ name: 'game', continent, difficulty }) }, [
          el('span', {}, [DIFFICULTY_LABEL[difficulty]]),
          el('span', { className: 'detail' }, [
            `${poolFor(countries, continent, difficulty).length} países`,
            hasMedal(medals, continent, difficulty) ? ' · 🏅' : '',
          ]),
        ]),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent' }) }, ['Voltar']),
    ]),
  );
}
