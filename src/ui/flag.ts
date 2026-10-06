import type { Country } from '../data/countries';
import { el } from './dom';

export function flagImg(country: Country, className = 'flag'): HTMLImageElement {
  return el('img', {
    src: `${import.meta.env.BASE_URL}flags/${country.iso2}.svg`,
    alt: 'Bandeira',
    className,
    draggable: false,
  });
}
