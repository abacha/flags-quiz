import type { Country } from '../../data/countries';
import { MAP_ALL, mapLevelLabel, mapPool, type MapScope } from '../../data/maps';
import { continentBreakdown } from '../../engine/breakdown';
import { onBack } from '../backButton';
import { celebrateResult, quizCheer } from '../celebrate';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { rankingSection } from '../rankingSection';
import { continentReport, mapLadder, mapReview, resultActions, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderMapQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapQuizResult' }>): void {
  const { continent, level, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  onBack(() => navigate({ name: 'hub', continent }));
  const title = el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']);
  root.append(
    el('main', { className: 'screen result' }, [
      title,
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]} · ${mapLevelLabel(continent, level)}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      rankingSection({ area: 'maps', continent, level, score, timeMs }),
      resultActions(navigate, continent, mapLadder('mapQuiz', continent, level)),
      ...(continent === 'world'
        ? [continentReport(navigate, continentBreakdown(mapPool('world', MAP_ALL), unanswered, missed), (c) => ({ name: 'hub', continent: c }))]
        : []),
      ...reviewSection(`Países sem resposta (${unanswered.length})`, { continent, level }, finished ? [] : unanswered),
      ...reviewSection('Países que você errou', { continent, level }, missed),
    ]),
  );
  celebrateResult(title, quizCheer(finished, newRecords));
}

function reviewSection(heading: string, scope: MapScope, countries: Country[]): HTMLElement[] {
  return countries.length ? [el('h2', {}, [heading]), ...mapReview(scope, countries)] : [];
}
