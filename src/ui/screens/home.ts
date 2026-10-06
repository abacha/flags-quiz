import { el } from '../dom';
import type { Navigate } from '../navigation';

export function renderHome(root: HTMLElement, navigate: Navigate): void {
  root.append(
    el('main', { className: 'screen menu' }, [
      el('h1', {}, ['Bandeiras do mundo']),
      el('button', { className: 'big', onclick: () => navigate({ name: 'continent' }) }, ['Learn']),
      el('button', { className: 'big', disabled: true }, ['Quiz — em breve']),
    ]),
  );
}
