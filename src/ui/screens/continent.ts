import { countries } from '../../data/countries';
import { poolFor } from '../../engine/pool';
import { el } from '../dom';
import { CONTINENT_LABEL, CONTINENTS } from '../labels';
import type { Mode, Navigate } from '../navigation';

export function renderContinent(root: HTMLElement, navigate: Navigate, mode: Mode): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Escolha o continente']),
      ...CONTINENTS.map((continent) =>
        el(
          'button',
          {
            className: 'big',
            disabled: poolFor(countries, continent, 'easy').length === 0,
            onclick: () => navigate({ name: 'difficulty', mode, continent }),
          },
          [CONTINENT_LABEL[continent]],
        ),
      ),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}
