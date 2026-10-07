import { el } from '../dom';
import { CONTINENT_KEYS, CONTINENT_LABEL } from '../labels';
import type { Navigate } from '../navigation';

export function renderHome(root: HTMLElement, navigate: Navigate): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Bandeiras do mundo']),
      ...CONTINENT_KEYS.map((continent) =>
        el('button', { className: 'big', onclick: () => navigate({ name: 'continent', continent }) }, [CONTINENT_LABEL[continent]]),
      ),
    ]),
  );
}
