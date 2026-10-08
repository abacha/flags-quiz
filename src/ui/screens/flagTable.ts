import { countries, type Country } from '../../data/countries';
import { poolFor, type ContinentKey } from '../../engine/pool';
import { statusBadge } from '../badge';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate } from '../navigation';
import { solutionCard } from '../questions/feedback';

export function renderFlagTable(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const flags = poolFor(countries, continent, 'general').sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const dialog = el('dialog', { className: 'flag-dialog', onclick: () => dialog.close() });
  const show = (country: Country) => {
    dialog.replaceChildren(flagImg(country), el('p', {}, [country.name, ' ', statusBadge(country)]));
    dialog.showModal();
  };
  root.append(
    el('main', { className: 'screen wide' }, [
      el('header', { className: 'table-head' }, [
        el('h1', {}, [CONTINENT_LABEL[continent]]),
        el('span', { className: 'detail' }, [`${flags.length} bandeiras`]),
        el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar']),
      ]),
      el(
        'div',
        { className: 'solution-grid' },
        flags.map((c) => el('button', { className: 'flag-table-item', type: 'button', onclick: () => show(c) }, [solutionCard(c)])),
      ),
      dialog,
    ]),
  );
}
