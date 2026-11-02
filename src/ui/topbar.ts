import { STARTING_LIVES } from '../engine/round';
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
  let shown = 0;
  return {
    element,
    update(items, progress) {
      counters.replaceChildren(...items);
      fill.style.width = `${progress * 100}%`;
      if (progress > shown) {
        fill.classList.remove('bump');
        void fill.offsetWidth;
        fill.classList.add('bump');
      }
      shown = progress;
    },
  };
}

export function hearts(lives: number, justLost: boolean): HTMLElement {
  return el(
    'span',
    { className: 'lives' },
    Array.from({ length: STARTING_LIVES }, (_, life) => {
      const state = life < lives ? 'heart' : life === lives && justLost ? 'heart lost breaking' : 'heart lost';
      return el('span', { className: state }, ['♥']);
    }),
  );
}

export function streakCounter(streak: number): HTMLElement[] {
  return streak >= 2 ? [el('span', { className: 'streak' }, [`🔥 ${streak}`])] : [];
}
