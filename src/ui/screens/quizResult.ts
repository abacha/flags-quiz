import type { Country } from '../../data/countries';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { solutionCard } from '../questions/feedback';
import { formatTime } from '../time';

export function renderQuizResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'quizResult' }>): void {
  const { continent, difficulty, score, timeMs, finished, unanswered, missed, newRecords } = screen;
  root.append(
    el('main', { className: 'screen' }, [
      el('h1', {}, [`${score} pontos`]),
      el('p', { className: 'detail' }, [`${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]} · Quiz`]),
      el('p', {}, [`Tempo: ${formatTime(timeMs)}`]),
      ...(newRecords.score ? [el('p', { className: 'record' }, ['🏆 Novo recorde de pontos!'])] : []),
      ...(newRecords.time ? [el('p', { className: 'record' }, ['🏆 Novo recorde de tempo!'])] : []),
      ...solutionSection(`Bandeiras sem resposta (${unanswered.length})`, finished ? [] : unanswered),
      ...solutionSection('Bandeiras que você errou', missed),
      el('button', { className: 'primary', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Jogar de novo']),
      el('button', { className: 'link', onclick: () => navigate({ name: 'hub', continent }) }, ['Voltar']),
    ]),
  );
}

function solutionSection(heading: string, flags: Country[]): HTMLElement[] {
  return flags.length ? [el('h2', {}, [heading]), el('div', { className: 'solution-grid' }, flags.map((c) => solutionCard(c)))] : [];
}
