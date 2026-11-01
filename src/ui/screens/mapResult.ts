import { mapLevelLabel, mapPool } from '../../data/maps';
import { onBack } from '../backButton';
import { el } from '../dom';
import { CONTINENT_LABEL } from '../labels';
import type { Navigate, Screen } from '../navigation';
import { learnResultTitle, mapLadder, mapReview, resultActions, statBlocks } from '../results';

export function renderMapResult(root: HTMLElement, navigate: Navigate, screen: Extract<Screen, { name: 'mapResult' }>): void {
  const { continent, level, won, medal, done, missed } = screen;
  const size = mapPool(continent, level).length;
  const review = missed.length ? [el('h2', {}, ['Países para revisar']), ...mapReview({ continent, level }, missed)] : [];
  onBack(() => navigate({ name: 'hub', continent }));
  root.append(
    el('main', { className: 'screen result' }, [
      el('h1', {}, [learnResultTitle(won, medal, done, size)]),
      el('p', { className: 'detail' }, [`Mapa · ${CONTINENT_LABEL[continent]} · ${mapLevelLabel(continent, level)}`]),
      statBlocks([[`${done}/${size}`, 'países']]),
      resultActions(navigate, continent, mapLadder('mapGame', continent, level)),
      ...review,
    ]),
  );
}
