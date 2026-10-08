import { el } from './dom';

export interface TopBar {
  element: HTMLElement;
  update(counters: Node[], progress: number): void;
}

export function topBar(label: string, onClose: () => void): TopBar {
  const counters = el('span', { className: 'topbar-counters' });
  const fill = el('span', { className: 'topbar-fill' });
  const element = el('header', { className: 'topbar' }, [
    el('div', { className: 'topbar-row' }, [
      el('button', { className: 'topbar-close', type: 'button', ariaLabel: 'Fechar', onclick: onClose }, ['✕']),
      el('span', { className: 'topbar-label' }, [label]),
      counters,
    ]),
    el('div', { className: 'topbar-bar' }, [fill]),
  ]);
  return {
    element,
    update(items, progress) {
      counters.replaceChildren(...items);
      fill.style.width = `${progress * 100}%`;
    },
  };
}
