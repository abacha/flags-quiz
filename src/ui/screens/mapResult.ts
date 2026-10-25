import { mapLevelLabel, mapPool } from '../../data/maps';
import { mapDifficulty } from '../../engine/mapFormats';
import { goalFor } from '../../engine/pool';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { learnResultTitle, mapLadder, mapReview, resultActions, statBlocks } from '../results';

export function renderMapResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapResult' }>): void {
  const { continent, level, won, medal, correct, missed } = screen;
  const goal = goalFor(mapDifficulty(level), mapPool(continent, level).length);
  const review = missed.length ? [el('h2', {}, ['Países para revisar']), ...mapReview({ continent, level }, missed)] : [];
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [learnResultTitle(won, medal, correct, goal)]),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]} · ${mapLevelLabel(continent, level)}`]),
      statBlocks([[`${correct}/${goal}`, 'acertos']]),
      resultActions(navigate, continent, mapLadder('mapGame', continent, level)),
      ...review,
    ]),
  );
}
