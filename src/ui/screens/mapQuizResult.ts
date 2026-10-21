import type { Country } from '../../data/countries';
import type { ContinentKey, Difficulty } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { mapResultActions, mapReview, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderMapQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapQuizResult' }>): void {
  const { continent, difficulty, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      mapResultActions(navigate, 'mapQuiz', continent, difficulty),
      ...reviewSection(`Países sem resposta (${unanswered.length})`, continent, finished ? [] : unanswered),
      ...reviewSection('Países que você errou', continent, missed),
    ]),
  );
}

function reviewSection(heading: string, continent: ContinentKey, countries: Country[]): HTMLElement[] {
  return countries.length ? [el('h2', {}, [heading]), ...mapReview(continent, countries)] : [];
}
