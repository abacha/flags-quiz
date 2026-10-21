import type { Country } from '../../data/countries';
import type { ContinentKey } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import { renderMap } from '../map/map';
import type { Navigate, Screen } from '../navigation';
import { mapResultActions, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderMapQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapQuizResult' }>): void {
  const { continent, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      mapResultActions(navigate, 'mapQuiz', continent),
      ...reviewSection(`Países sem resposta (${unanswered.length})`, continent, finished ? [] : unanswered),
      ...reviewSection('Países que você errou', continent, missed),
    ]),
  );
}

function reviewSection(heading: string, continent: ContinentKey, countries: Country[]): HTMLElement[] {
  if (countries.length === 0) return [];
  const view = renderMap(continent);
  for (const country of countries) view.paint(country.iso2, 'missed', country.name);
  return [el('h2', {}, [heading]), view.element];
}
