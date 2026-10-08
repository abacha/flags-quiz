import type { Country } from '../../data/countries';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { resultActions, statBlocks } from '../results';
import { formatTime } from '../time';

export function renderQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'quizResult' }>): void {
  const { continent, difficulty, score, timeMs, errors, finished, unanswered, missed, newRecords } = screen;
  onBack(() => navigate({ name: 'hub', continent: screen.continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [finished ? '🎉 Quiz concluído!' : 'Quiz encerrado']),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([
        [String(score), 'pontos'],
        [formatTime(timeMs), 'tempo'],
        [String(errors), 'erros'],
      ]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      resultActions(navigate, 'quiz', continent, difficulty),
      ...solutionSection(`Bandeiras sem resposta (${unanswered.length})`, finished ? [] : unanswered),
      ...solutionSection('Bandeiras que você errou', missed),
    ]),
  );
}

function solutionSection(heading: string, flags: Country[]): HTMLElement[] {
  return flags.length ? [el('h2', {}, [heading]), el('div', { className: 'solution-grid' }, flags.map((c) => solutionCard(c)))] : [];
}
