// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { pressShortcut } from './keys';
import { renderSpellName } from './spellName';

const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

function render(letters: string[]) {
  const submit = vi.fn(() => []);
  const rendered = renderSpellName('Monte o nome deste país', document.createElement('div'), letters, submit);
  const tiles = () => [...rendered.querySelectorAll<HTMLButtonElement>('.spell-tile')];
  const placed = () => [...rendered.querySelectorAll<HTMLButtonElement>('.spell-placed')].map((p) => p.textContent).join('');
  const confirm = () => [...rendered.querySelectorAll<HTMLButtonElement>('button.primary')][0];
  const tap = (letter: string) => click(tiles().find((t) => t.textContent === letter && !t.disabled)!);
  const type = (...keys: string[]) => keys.forEach((key) => pressShortcut(rendered, new KeyboardEvent('keydown', { key })));
  return { rendered, submit, tiles, placed, confirm, tap, type };
}

describe('renderSpellName', () => {
  it('shows one tile per letter and nothing that reveals the name length', () => {
    const { rendered, tiles, placed } = render([...'esdahcx']);
    expect(tiles().map((t) => t.textContent)).toEqual([...'esdahcx']);
    expect(placed()).toBe('');
    expect(rendered.querySelectorAll('.spell-slot, .spell-gap')).toHaveLength(0);
  });

  it('appends tapped letters and sends a placed letter back when tapped', () => {
    const { rendered, tiles, placed, tap } = render([...'edahcx']);
    tap('c');
    tap('h');
    tap('x');
    expect(placed()).toBe('chx');
    expect(tiles().filter((t) => t.disabled).map((t) => t.textContent)).toEqual(['h', 'c', 'x']);
    click(rendered.querySelectorAll('.spell-placed')[2]);
    expect(placed()).toBe('ch');
    expect(tiles().find((t) => t.textContent === 'x')!.disabled).toBe(false);
    tap('a');
    expect(placed()).toBe('cha');
  });

  it('enables Responder once a letter is placed, with tiles left over', () => {
    const { confirm, tap } = render([...'edahcx']);
    expect(confirm().disabled).toBe(true);
    tap('c');
    expect(confirm().disabled).toBe(false);
  });

  it('submits the placed letters in order', () => {
    const { submit, confirm, tap } = render([...'lxeagnes']);
    [...'senegal'].forEach(tap);
    click(confirm());
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'senegal' });
  });

  it('places tiles from the keyboard, in either case, and ignores letters with no tile left', () => {
    const { placed, tiles, type } = render([...'lxeagnes']);
    type('S', 'e', 'n', 'e', 'e', 'z');
    expect(placed()).toBe('sene');
    expect(tiles().filter((t) => t.disabled)).toHaveLength(4);
  });

  it('types an accented tile from its plain letter only when no plain tile is left', () => {
    const { placed, type } = render([...'éeia']);
    type('e', 'e');
    expect(placed()).toBe('eé');
    type('é');
    expect(placed()).toBe('eé');
  });

  it('takes the last letter back with Backspace and answers with Enter', () => {
    const { submit, placed, type } = render([...'cxhade']);
    type('Enter');
    expect(submit).not.toHaveBeenCalled();
    type('c', 'h', 'x', 'Backspace', 'a', 'd', 'e');
    expect(placed()).toBe('chade');
    type('Enter');
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'chade' });
  });
});
