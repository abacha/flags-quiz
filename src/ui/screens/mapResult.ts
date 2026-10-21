import type { Country } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { goalFor, type ContinentKey } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import { renderMap } from '../map/map';
import type { Navigate, Screen } from '../navigation';
import { mapResultActions, statBlocks } from '../results';

export function renderMapResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapResult' }>): void {
  const { continent, won, correct, missed } = screen;
  const goal = goalFor('general', mapPool(continent).length);
  const review = missed.length ? [el('h2', {}, ['Países para revisar']), reviewMap(continent, missed)] : [];
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${goal}`]),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]}`]),
      statBlocks([[`${correct}/${goal}`, 'acertos']]),
      mapResultActions(navigate, 'mapGame', continent),
      ...review,
    ]),
  );
}

function reviewMap(continent: ContinentKey, missed: Country[]): HTMLElement {
  const view = renderMap(continent);
  for (const country of missed) view.paint(country.iso2, 'missed', country.name);
  return view.element;
}
