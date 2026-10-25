import type { Country } from '../../data/countries';
import { MAP_ALL, mapPool } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import { renderMap } from '../map/map';
import { namesToggle } from '../namesToggle';
import type { Navigate } from '../navigation';

export function renderMapTable(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const pool = mapPool(continent, MAP_ALL);
  let namesShown = true;
  let tapped: Country | undefined;

  const view = renderMap({ continent, level: MAP_ALL }, (country) => {
    if (namesShown) return;
    if (tapped) view.paint(tapped.iso2, 'idle');
    tapped = country;
    view.paint(country.iso2, 'highlight', country.name);
  });

  const showNames = (shown: boolean) => {
    namesShown = shown;
    tapped = undefined;
    view.clear();
    if (shown) for (const country of pool) view.paint(country.iso2, 'idle', country.name);
  };

  const back = () => navigate({ name: 'hub', continent });
  onBack(back);
  root.append(
    el('main', { className: 'screen wide map-table' }, [
      el('header', { className: 'table-head' }, [
        el('h1', {}, [CONTINENT_LABEL[continent]]),
        el('span', { className: 'detail' }, [`${pool.length} países`]),
        el('div', { className: 'table-actions' }, [
          namesToggle(showNames),
          el('button', { className: 'link', type: 'button', onclick: back }, ['Voltar']),
        ]),
      ]),
      view.element,
    ]),
  );
  showNames(true);
}
