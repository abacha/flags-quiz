import type { Country } from '../data/countries';
import { el } from './dom';
import { STATUS_BADGE } from './labels';

export function statusBadge(country: Country): HTMLSpanElement {
  return el('span', { className: `badge badge-${country.status}` }, [STATUS_BADGE[country.status]]);
}
