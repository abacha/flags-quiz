import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

type Selection = { side: 'name' | 'flag'; iso2: string } | null;

interface PairsOptions {
  figure?: HTMLElement;
  face?: (country: Country, index: number) => HTMLElement;
}

export function renderPairs(prompt: string, countries: Country[], submit: Submit, { figure, face = (country) => flagImg(country) }: PairsOptions = {}): HTMLElement {
  const names = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const links: Record<string, string> = {};
  let selected: Selection = null;
  const container = el('div', { className: 'question' });

  const nameOnFlag = (flagIso: string) => countries.find((c) => links[c.iso2] === flagIso);
  const isSelected = (side: 'name' | 'flag', iso2: string) => selected?.side === side && selected.iso2 === iso2;

  const link = (nameIso: string, flagIso: string) => {
    const previous = nameOnFlag(flagIso);
    if (previous) delete links[previous.iso2];
    links[nameIso] = flagIso;
    selected = null;
  };

  const tapName = (nameIso: string) => {
    if (selected?.side === 'flag') {
      link(nameIso, selected.iso2);
    } else {
      delete links[nameIso];
      selected = isSelected('name', nameIso) ? null : { side: 'name', iso2: nameIso };
    }
    draw();
  };

  const tapFlag = (flagIso: string) => {
    if (selected?.side === 'name') {
      link(selected.iso2, flagIso);
    } else {
      const linked = nameOnFlag(flagIso);
      if (linked) delete links[linked.iso2];
      selected = isSelected('flag', flagIso) ? null : { side: 'flag', iso2: flagIso };
    }
    draw();
  };

  const classes = (base: string, side: 'name' | 'flag', iso2: string, linked: boolean) =>
    [base, isSelected(side, iso2) ? 'selected' : '', linked ? 'linked' : ''].filter(Boolean).join(' ');

  const draw = () => {
    container.replaceChildren(
      el('h2', {}, [prompt]),
      ...(figure ? [figure] : []),
      el(
        'div',
        { className: 'pair-flags' },
        countries.map((flag, index) => {
          const name = nameOnFlag(flag.iso2);
          return el('button', { className: classes('pair-flag', 'flag', flag.iso2, Boolean(name)), onclick: () => tapFlag(flag.iso2) }, [
            face(flag, index),
            el('span', { className: 'pair-label' }, [name?.name ?? '—']),
          ]);
        }),
      ),
      el(
        'div',
        { className: 'name-list' },
        names.map((country) =>
          el(
            'button',
            { className: classes('name-option', 'name', country.iso2, Boolean(links[country.iso2])), onclick: () => tapName(country.iso2) },
            [country.name],
          ),
        ),
      ),
      el(
        'button',
        {
          className: 'primary',
          disabled: Object.keys(links).length < countries.length,
          onclick: () => submit({ kind: 'links', links: { ...links } }),
        },
        ['Conferir'],
      ),
    );
  };

  draw();
  return container;
}
