import { capitalPool } from '../../data/capitals';
import type { Country } from '../../data/countries';
import { continentBreakdown } from '../../engine/breakdown';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { capitalCard } from '../questions/capitalQuestions';
import { continentReport, flagLadder, resultActions, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderCapitalQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'capitalQuizResult' }>): void {
  const { continent, difficulty, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  onBack(() => navigate({ name: 'hub', continent: screen.continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']),
      el('p', { className: 'detail' }, [`Capitais · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      resultActions(navigate, continent, flagLadder('capitalQuiz', continent, difficulty)),
      ...(continent === 'world'
        ? [continentReport(navigate, continentBreakdown(capitalPool('world', difficulty), unanswered, missed), (c) => ({ name: 'capitalGame', continent: c, difficulty }))]
        : []),
      ...solutionSection(`Capitais sem resposta (${unanswered.length})`, finished ? [] : unanswered),
      ...solutionSection('Capitais que você errou', missed),
    ]),
  );
}

function solutionSection(heading: string, countries: Country[]): HTMLElement[] {
  return countries.length ? [el('h2', {}, [heading]), el('div', { className: 'solution-grid' }, countries.map(capitalCard))] : [];
}
