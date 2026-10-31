import { capitalLabel, capitalPool } from '../../data/capitals';
import type { Country } from '../../data/countries';
import type { ContinentKey } from '../../engine/pool';
import { onBack } from '../backButton';
import { statusBadge } from '../badge';
import { el } from '../dom';
import { flagImg } from '../flag';
import { CONTINENT_LABEL } from '../labels';
import { namesToggle } from '../namesToggle';
import type { Navigate } from '../navigation';
import { capitalCard } from '../questions/capitalQuestions';

export function renderCapitalTable(root: HTMLElement, navigate: Navigate, continent: ContinentKey): void {
  const countries = capitalPool(continent, 'general').sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const dialog = el('dialog', { className: 'flag-dialog', onclick: () => dialog.close() });
  const show = (country: Country) => {
    dialog.replaceChildren(flagImg(country), el('p', {}, [`${country.name} · ${capitalLabel(country)}`, ' ', statusBadge(country)]));
    dialog.showModal();
  };
  const grid = el(
    'div',
    { className: 'solution-grid' },
    countries.map((c) => el('button', { className: 'flag-table-item', type: 'button', onclick: () => show(c) }, [capitalCard(c)])),
  );
  onBack(() => (dialog.open ? dialog.close() : navigate({ name: 'hub', continent })));
  root.append(
    el('main', { className: 'screen wide' }, [
      el('header', { className: 'table-head' }, [
        el('h1', {}, [CONTINENT_LABEL[continent]]),
        el('span', { className: 'detail' }, [`${countries.length} capitais`]),
        el('div', { className: 'table-actions' }, [
          namesToggle((shown) => grid.classList.toggle('hide-names', !shown)),
          el('button', { className: 'link', type: 'button', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar']),
        ]),
      ]),
      grid,
      dialog,
    ]),
  );
}
