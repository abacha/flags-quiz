// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { spelledLetters } from '../../engine/mapFormats';
import { renderSpellName } from './spellName';

const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

function render(name: string, letters = spelledLetters(name).reverse()) {
  const submit = vi.fn(() => []);
  const rendered = renderSpellName('Monte o nome deste país', document.createElement('div'), name, letters, submit);
  const tiles = () => [...rendered.querySelectorAll<HTMLButtonElement>('.spell-tile')];
  const slots = () => [...rendered.querySelectorAll<HTMLElement>('.spell-slot')];
  const confirm = () => [...rendered.querySelectorAll<HTMLButtonElement>('button.primary')][0];
  const tap = (letter: string) => click(tiles().find((t) => t.textContent === letter && !t.disabled)!);
  const spell = () => spelledLetters(name).forEach(tap);
  return { rendered, submit, tiles, slots, confirm, tap, spell };
}

describe('renderSpellName', () => {
  it('shows separators in place and one tile per letter', () => {
    const { rendered, tiles, slots } = render('Guiné-Bissau');
    expect(tiles()).toHaveLength(11);
    expect(slots()).toHaveLength(11);
    expect([...rendered.querySelectorAll('.spell-gap')].map((g) => g.textContent)).toEqual(['-']);
    expect(slots().every((s) => s.textContent === '')).toBe(true);
  });

  it('fills the next slot and sends a letter back when its slot is tapped', () => {
    const { tiles, slots, tap } = render('Chade', ['e', 'd', 'a', 'h', 'C']);
    tap('C');
    tap('h');
    expect(slots().map((s) => s.textContent)).toEqual(['C', 'h', '', '', '']);
    expect(tiles().filter((t) => t.disabled).map((t) => t.textContent)).toEqual(['h', 'C']);
    click(slots()[0]);
    expect(slots().map((s) => s.textContent)).toEqual(['', 'h', '', '', '']);
    expect(tiles().find((t) => t.textContent === 'C')!.disabled).toBe(false);
    tap('a');
    expect(slots().map((s) => s.textContent)).toEqual(['a', 'h', '', '', '']);
  });

  it('enables Responder only when every slot is filled', () => {
    const { confirm, tap } = render('Chade', ['e', 'd', 'a', 'h', 'C']);
    expect(confirm().disabled).toBe(true);
    ['C', 'h', 'a', 'd'].forEach(tap);
    expect(confirm().disabled).toBe(true);
    tap('e');
    expect(confirm().disabled).toBe(false);
  });

  it('submits the assembled name with its separators', () => {
    const { submit, confirm, spell } = render('Costa do Marfim');
    spell();
    click(confirm());
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Costa do Marfim' });
  });

  it('accepts either copy of a repeated letter', () => {
    const { submit, confirm, tiles, tap } = render('Senegal', ['l', 'e', 'a', 'g', 'n', 'e', 'S']);
    tap('S');
    click(tiles()[5]);
    tap('n');
    click(tiles()[1]);
    ['g', 'a', 'l'].forEach(tap);
    click(confirm());
    expect(submit).toHaveBeenCalledWith({ kind: 'text', text: 'Senegal' });
  });
});
