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
      ...(finished ? [] : [el('p', {}, [`${unanswered} bandeiras sem resposta`])]),
      ...(missed.length
        ? [el('h2', {}, ['Bandeiras que você errou']), el('div', { className: 'solution-grid' }, missed.map((c) => solutionCard(c)))]
        : []),
      el('button', { className: 'primary', onclick: () => navigate({ name: 'quiz', continent, difficulty }) }, ['Jogar de novo']),
      el('button', { className: 'link', onclick: () => navigate({ name: 'continent', continent }) }, ['Voltar']),
    ]),
  );
}
