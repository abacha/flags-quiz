import { isSeparator } from '../../engine/mapFormats';
import { el } from '../dom';
import type { Submit } from './render';

// Groups each word's cells so a long name wraps between words, keeping every word length visible.
function words(cells: HTMLElement[]): HTMLElement[] {
  const groups: HTMLElement[] = [];
  let word: HTMLElement | null = null;
  for (const cell of cells) {
    if (cell.textContent === ' ') {
      groups.push(cell);
      word = null;
      continue;
    }
    if (!word) groups.push((word = el('span', { className: 'spell-word' })));
    word.append(cell);
  }
  return groups;
}

export function renderSpellName(prompt: string, figure: HTMLElement, name: string, letters: string[], submit: Submit): HTMLElement {
  const placed = new Map<HTMLElement, HTMLButtonElement>();
  const confirm = el('button', { className: 'primary', type: 'button', disabled: true }, ['Responder']);

  const cells = [...name].map((char) => (isSeparator(char) ? el('span', { className: 'spell-gap' }, [char]) : el('span', { className: 'spell-slot' })));
  const slots = cells.filter((cell) => cell.className === 'spell-slot');
  const refresh = () => {
    confirm.disabled = placed.size < slots.length;
  };

  for (const slot of slots) {
    slot.onclick = () => {
      const tile = placed.get(slot);
      if (!tile) return;
      placed.delete(slot);
      slot.textContent = '';
      tile.disabled = false;
      refresh();
    };
  }

  const tiles = letters.map((letter) => {
    const tile = el('button', { className: 'spell-tile', type: 'button' }, [letter]);
    tile.onclick = () => {
      const slot = slots.find((s) => !placed.has(s));
      if (!slot) return;
      placed.set(slot, tile);
      slot.textContent = letter;
      tile.disabled = true;
      refresh();
    };
    return tile;
  });

  confirm.onclick = () => submit({ kind: 'text', text: cells.map((cell) => cell.textContent).join('') });

  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    figure,
    el('div', { className: 'spell-slots' }, words(cells)),
    el('div', { className: 'spell-tiles' }, tiles),
    confirm,
  ]);
}
