import { countries } from '../../data/countries';
import { poolFor, type ContinentKey } from '../../engine/pool';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { solutionCard } from '../questions/feedback';

export function renderFlagTable(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const flags = poolFor(countries, continent, 'general').sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  root.append(
    el('main', { className: 'screen' }, [
      el('h1', {}, [CONTINENT_LABEL[continent]]),
      el('p', { className: 'detail' }, [`${flags.length} bandeiras`]),
      el('div', { className: 'solution-grid' }, flags.map((c) => solutionCard(c))),
      el('button', { className: 'link', onclick: () => navigate({ name: 'home' }) }, ['Voltar']),
    ]),
  );
}
