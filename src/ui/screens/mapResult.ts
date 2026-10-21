import { mapPool } from '../../data/maps';
import { goalFor } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL, DIFFICULTY_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { mapResultActions, mapReview, statBlocks } from '../results';

export function renderMapResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapResult' }>): void {
  const { continent, difficulty, won, correct, missed } = screen;
  const goal = goalFor(difficulty, mapPool(continent, difficulty).length);
  const review = missed.length ? [el('h2', {}, ['Países para revisar']), ...mapReview(continent, missed)] : [];
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [won ? '🏅 Medalha conquistada!' : `Você fez ${correct} de ${goal}`]),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]} · ${DIFFICULTY_LABEL[difficulty]}`]),
      statBlocks([[`${correct}/${goal}`, 'acertos']]),
      mapResultActions(navigate, 'mapGame', continent, difficulty),
      ...review,
    ]),
  );
}
