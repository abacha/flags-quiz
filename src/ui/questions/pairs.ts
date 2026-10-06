import type { Country } from '../../data/countries';
import { el } from '../dom';
import { flagImg } from '../flag';
import type { Submit } from './render';

export function renderPairs(prompt: string, countries: Country[], submit: Submit): HTMLElement {
  const names = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const links: Record<string, string> = {};
  let selected: string | null = null;
  const container = el('div', { className: 'question' });

  const nameOnFlag = (flagIso: string) => countries.find((c) => links[c.iso2] === flagIso);

  const select = (nameIso: string) => {
    delete links[nameIso];
    selected = nameIso;
    draw();
  };

  const linkTo = (flagIso: string) => {
    if (selected === null) return;
    const previous = nameOnFlag(flagIso);
    if (previous) delete links[previous.iso2];
    links[selected] = flagIso;
    selected = null;
    draw();
  };

  const draw = () => {
    container.replaceChildren(
      el('h2', {}, [prompt]),
      el(
        'div',
        { className: 'pair-flags' },
        countries.map((flag) =>
          el('button', { className: 'pair-flag', onclick: () => linkTo(flag.iso2) }, [
            flagImg(flag),
            el('span', { className: 'pair-label' }, [nameOnFlag(flag.iso2)?.name ?? '—']),
          ]),
        ),
      ),
      el(
        'div',
        { className: 'name-list' },
        names.map((country) => {
          const classes = ['name-option'];
          if (selected === country.iso2) classes.push('selected');
          if (links[country.iso2]) classes.push('linked');
          return el('button', { className: classes.join(' '), onclick: () => select(country.iso2) }, [country.name]);
        }),
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
