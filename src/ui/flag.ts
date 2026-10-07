import type { Country } from '../data/countries';
import { el } from './dom';

export function flagImg(country: Country, className = 'flag', loading: HTMLImageElement['loading'] = 'eager'): HTMLImageElement {
  // `loading` must be set before `src`: assigning `src` starts the fetch under the current loading mode.
  return el('img', {
    loading,
    src: `${import.meta.env.BASE_URL}flags/${country.iso2}.svg`,
    alt: 'Bandeira',
    className,
    draggable: false,
  });
}
