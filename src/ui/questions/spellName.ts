import { el } from '../dom';
import type { Submit } from './render';

// The answer grows as letters are tapped, so nothing on screen gives away how long the name is.
export function renderSpellName(prompt: string, figure: HTMLElement, letters: string[], submit: Submit): HTMLElement {
  const placed: HTMLButtonElement[] = [];
  const answer = el('div', { className: 'spell-answer' });
  const confirm = el('button', { className: 'primary', type: 'button', disabled: true }, ['Responder']);

  const redraw = () => {
    answer.replaceChildren(
      ...placed.map((tile, index) => {
        const letter = el('button', { className: 'spell-placed', type: 'button' }, [tile.textContent ?? '']);
        letter.onclick = () => {
          placed.splice(index, 1);
          tile.disabled = false;
          redraw();
        };
        return letter;
      }),
    );
    confirm.disabled = placed.length === 0;
  };

  const tiles = letters.map((letter) => {
    const tile = el('button', { className: 'spell-tile', type: 'button' }, [letter]);
    tile.onclick = () => {
      placed.push(tile);
      tile.disabled = true;
      redraw();
    };
    return tile;
  });

  confirm.onclick = () => submit({ kind: 'text', text: placed.map((tile) => tile.textContent).join('') });

  return el('div', { className: 'question' }, [el('h2', {}, [prompt]), figure, answer, el('div', { className: 'spell-tiles' }, tiles), confirm]);
}
