import type { Country } from '../../data/countries';
import { CROP_SCALE } from '../../engine/formats';
import type { Crop } from '../../engine/question';
import { el } from '../dom';
import { flagImg } from '../flag';
import { bindKeys } from './keys';
import type { Submit } from './render';

function markChosen(event: MouseEvent): void {
  (event.currentTarget as HTMLElement).classList.add('chosen');
}

export function renderFlagChoices(prompt: string, options: Country[], submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    el(
      'div',
      { className: `flag-grid count-${options.length}` },
      options.map((country, index) =>
        bindKeys(
          el(
            'button',
            {
              className: 'flag-option',
              onclick: (event) => {
                markChosen(event);
                submit({ kind: 'choice', iso2: country.iso2 });
              },
            },
            [flagImg(country)],
          ),
          index,
          options.length,
        ),
      ),
    ),
  ]);
}

export function renderNameChoices(prompt: string, figure: HTMLElement, options: Country[], submit: Submit): HTMLElement {
  return el('div', { className: 'question' }, [
    el('h2', {}, [prompt]),
    figure,
    el(
      'div',
      { className: 'name-list' },
      options.map((country, index) =>
        bindKeys(
          el(
            'button',
            {
              className: 'name-option',
              onclick: (event) => {
                markChosen(event);
                submit({ kind: 'choice', iso2: country.iso2 });
              },
            },
            [country.name],
          ),
          index,
          options.length,
        ),
      ),
    ),
  ]);
}

export function flagFigure(country: Country): HTMLElement {
  return el('div', { className: 'figure' }, [flagImg(country)]);
}

export function cropFigure(country: Country, crop: Crop): HTMLElement {
  const img = flagImg(country);
  img.style.transformOrigin = `${crop.originX}% ${crop.originY}%`;
  img.style.transform = `scale(${CROP_SCALE})`;
  return el('div', { className: 'crop-frame' }, [img]);
}
