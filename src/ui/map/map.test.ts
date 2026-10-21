// @vitest-environment happy-dom
import { geoCentroid, geoCircle, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { merge } from 'topojson-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { MAP_OBJECT, mapPool, topology } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { renderMap, type MapView } from './map';
import { projectionFor } from './projection';

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;

const viewBoxOf = (svg: SVGSVGElement) => svg.getAttribute('viewBox')!.split(' ').map(Number) as [number, number, number, number];

const resized = new Map<Element, ResizeObserverCallback>();

const layOut = (element: HTMLElement, width = 500, height = 300) => {
  const svg = element.querySelector('svg')!;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) });
  svg.getScreenCTM = () => {
    const [x, y, w, h] = viewBoxOf(svg);
    const scale = Math.min(width / w, height / h);
    return new DOMMatrix([scale, 0, 0, scale, (width - w * scale) / 2 - x * scale, (height - h * scale) / 2 - y * scale]);
  };
  resized.get(svg)?.([], {} as ResizeObserver);
  return svg;
};

const toViewBox = (svg: SVGSVGElement, x: number, y: number) => {
  const point = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!.inverse());
  return [point.x, point.y];
};

const pointer = (target: Element, type: string, pointerId: number, clientX: number, clientY: number) =>
  target.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));

const poolCollection = (continent: ContinentKey): FeatureCollection => ({
  type: 'FeatureCollection',
  features: mapPool(continent).map((c): Feature => ({
    type: 'Feature',
    id: c.iso2,
    properties: {},
    geometry: merge(topology, topology.objects[MAP_OBJECT].geometries.filter((g) => g.id === c.iso2)),
  })),
});

const poolProjection = (continent: ContinentKey) => projectionFor(continent, poolCollection(continent));

const russiaEastEdge = () => {
  const pool = poolCollection('europe');
  const path = geoPath(projectionFor('europe', pool));
  return path.bounds(pool.features.find((f) => f.id === 'ru')!)[1][0];
};

const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

const ringWidths = (d: string): number[] =>
  d
    .split('M')
    .slice(1)
    .map((ring) => {
      const xs = [...ring.matchAll(/(-?[\d.]+(?:e-?\d+)?),/g)].map((m) => Number(m[1]));
      return Math.max(...xs) - Math.min(...xs);
    });

const widestRing = (view: MapView) =>
  Math.max(...[...view.element.querySelectorAll('path')].flatMap((p) => ringWidths(p.getAttribute('d')!)));

const lowestY = (view: MapView) =>
  Math.max(...[...view.element.querySelectorAll('path')].flatMap((p) => [...p.getAttribute('d')!.matchAll(/,(-?[\d.]+(?:e-?\d+)?)/g)].map((m) => Number(m[1]))));

const projectedBounds = (continent: ContinentKey, iso2: string) => {
  const pool = poolCollection(continent);
  const path = geoPath(projectionFor(continent, pool));
  const geometry = pool.features.find((f) => f.id === iso2)!.geometry as MultiPolygon;
  const polygons = geometry.coordinates.map((coordinates): Polygon => ({ type: 'Polygon', coordinates }));
  const largest = polygons.reduce((a, b) => (path.area(b) > path.area(a) ? b : a));
  return { country: path.bounds(geometry), surroundings: path.bounds(geoCircle().center(geoCentroid(largest)).radius(6.74)()) };
};

const contains = (svg: SVGSVGElement, [[x0, y0], [x1, y1]]: [[number, number], [number, number]]) => {
  const [x, y, width, height] = viewBoxOf(svg);
  return x <= x0 && y <= y0 && x + width >= x1 && y + height >= y1;
};

beforeEach(() => {
  resized.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        resized.set(target, this.callback);
      }
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('renderMap', () => {
  it.each(['africa', 'americas', 'asia', 'europe', 'oceania'] as const)('wraps no shape around the globe on %s', (continent) => {
    expect(widestRing(renderMap(continent))).toBeLessThan((poolProjection(continent).scale() * 2 * Math.PI) / 2);
  });

  it('keeps Antarctica on the world map', () => {
    expect(lowestY(renderMap('world'))).toBeGreaterThan(poolProjection('world')([0, -70])![1]);
  });

  it('draws every pool country as tappable and calls onTap', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
    expect(view.element.querySelectorAll('path[data-iso2]')).toHaveLength(mapPool('americas').length);
  });

  it('accepts a tap that moved less than the slop', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 104, 100);
    pointer(svg, 'pointerup', 1, 104, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
  });

  it('ignores a drag that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 130, 100);
    pointer(svg, 'pointerup', 1, 130, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('ignores a pinch that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 200, 150);
    pointer(svg, 'pointerdown', 2, 300, 150);
    pointer(svg, 'pointermove', 2, 302, 150);
    pointer(svg, 'pointerup', 2, 302, 150);
    pointer(svg, 'pointerup', 1, 200, 150);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('pans on drag and zooms on pinch and wheel, never past 24×', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    const viewBox = () => svg.getAttribute('viewBox')!.split(' ').map(Number);
    const [, , baseWidth] = viewBox();
    pointer(svg, 'pointerdown', 1, 200, 150);
    pointer(svg, 'pointerdown', 2, 300, 150);
    pointer(svg, 'pointermove', 2, 600, 150);
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 4);
    pointer(svg, 'pointerup', 2, 600, 150);
    const [x] = viewBox();
    const unitsPerPx = 1 / svg.getScreenCTM()!.a;
    pointer(svg, 'pointermove', 1, 150, 150);
    expect(viewBox()[0]).toBeCloseTo(x! + 50 * unitsPerPx);
    pointer(svg, 'pointerup', 1, 150, 150);
    for (let i = 0; i < 40; i++) svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 250, clientY: 150, cancelable: true }));
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 24);
  });

  it('draws grey neighbours above the hit circles and ignores taps on them or the ocean', () => {
    const onTap = vi.fn();
    const view = renderMap('asia', onTap);
    const lastHit = [...view.element.querySelectorAll('circle.hit')].at(-1)!;
    const firstGrey = view.element.querySelector('path.context')!;
    expect(lastHit.compareDocumentPosition(firstGrey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    click(view.element.querySelector('svg')!);
    click(firstGrey);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not tap grey neighbours or excluded entries', () => {
    const view = renderMap('asia');
    expect(view.element.querySelector('[data-iso2="ru"]')).toBeNull();
    expect(view.element.querySelector('[data-iso2="mv"]')).toBeNull();
    const greys = view.element.querySelectorAll('path.context');
    expect(greys.length).toBeGreaterThan(0);
    for (const grey of greys) expect(grey.hasAttribute('data-iso2')).toBe(false);
  });

  it('reaches a small country through its hit circle', () => {
    const onTap = vi.fn();
    const view = renderMap('europe', onTap);
    expect(view.element.querySelectorAll('circle.hit')).toHaveLength(mapPool('europe').length);
    click(view.element.querySelector('circle[data-iso2="mt"]')!);
    expect(onTap).toHaveBeenCalledWith(country('mt'));
  });

  it('keeps hit circles at 22 px on screen, capped by the nearest neighbour', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element, 800, 480);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 400, clientY: 240, cancelable: true }));
    const unitsPerPx = 1 / svg.getScreenCTM()!.a;
    const radius = (iso2: string) => Number(view.element.querySelector(`circle[data-iso2="${iso2}"]`)!.getAttribute('r'));
    expect(radius('mt')).toBeCloseTo(22 * unitsPerPx);
    expect(radius('ad')).toBeLessThan(22 * unitsPerPx);
    expect(radius('fr')).toBeLessThanOrEqual(22 * unitsPerPx);
    expect(radius('ru')).toBeLessThanOrEqual(22 * unitsPerPx);
  });

  it('lets the real country shapes win over the hit circles', () => {
    const view = renderMap('europe');
    const firstHit = view.element.querySelector('circle.hit')!;
    const firstCountry = view.element.querySelector('path.country')!;
    expect(firstHit.compareDocumentPosition(firstCountry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('pans the Europe map east until all of Russia is in view', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element);
    for (let i = 0; i < 40; i++) {
      pointer(svg, 'pointerdown', 1, 400, 150);
      pointer(svg, 'pointermove', 1, 0, 150);
      pointer(svg, 'pointerup', 1, 0, 150);
    }
    const [x, , width] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(x! + width!).toBeCloseTo(russiaEastEdge(), 0);
  });

  it('recovers from a press that was released outside the map', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    const brazil = view.element.querySelector('path[data-iso2="br"]')!;
    svg.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true, bubbles: true }));
    brazil.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 200, clientY: 200, isPrimary: true, bubbles: true }));
    brazil.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 200, clientY: 200, isPrimary: true, bubbles: true }));
    click(brazil);
    expect(onTap).toHaveBeenCalledWith(country('br'));
  });

  it('keeps the pinched point under the fingers on a letterboxed map', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element, 390, 600);
    pointer(svg, 'pointerdown', 1, 150, 300);
    pointer(svg, 'pointerdown', 2, 230, 300);
    const anchor = toViewBox(svg, 190, 300);
    pointer(svg, 'pointermove', 2, 310, 300);
    const [x, y] = toViewBox(svg, 230, 300);
    expect(x).toBeCloseTo(anchor[0]!);
    expect(y).toBeCloseTo(anchor[1]!);
  });

  it('pans by the distance the finger moved on a letterboxed map', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element, 390, 200);
    pointer(svg, 'pointerdown', 1, 150, 100);
    pointer(svg, 'pointerdown', 2, 250, 100);
    pointer(svg, 'pointermove', 2, 350, 100);
    pointer(svg, 'pointerup', 2, 350, 100);
    const grabbed = toViewBox(svg, 150, 100);
    pointer(svg, 'pointermove', 1, 120, 100);
    expect(toViewBox(svg, 120, 100)[0]).toBeCloseTo(grabbed[0]!);
  });

  it('sizes the hit circles, rings and labels in screen pixels on a letterboxed map', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element, 390, 200);
    view.paint('mt', 'highlight', 'Malta');
    pointer(svg, 'pointerdown', 1, 150, 100);
    pointer(svg, 'pointerdown', 2, 200, 100);
    pointer(svg, 'pointermove', 2, 350, 100);
    pointer(svg, 'pointerup', 2, 350, 100);
    pointer(svg, 'pointerup', 1, 150, 100);
    const unitsPerPx = 1 / svg.getScreenCTM()!.a;
    expect(Number(view.element.querySelector('circle.hit[data-iso2="mt"]')!.getAttribute('r'))).toBeCloseTo(22 * unitsPerPx);
    expect(Number(view.element.querySelector('circle.map-ring')!.getAttribute('r'))).toBeCloseTo(14 * unitsPerPx);
    expect(Number(view.element.querySelector('text.map-label')!.getAttribute('font-size'))).toBeCloseTo(13 * unitsPerPx);
  });

  it('keeps its marks sized while the map is hidden', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element, 0, 0);
    view.paint('mt', 'highlight', 'Malta');
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 0, clientY: 0, cancelable: true }));
    expect(Number.isFinite(Number(view.element.querySelector('circle.hit[data-iso2="mt"]')!.getAttribute('r')))).toBe(true);
    expect(Number.isFinite(Number(view.element.querySelector('circle.map-ring')!.getAttribute('r')))).toBe(true);
    expect(Number.isFinite(Number(view.element.querySelector('text.map-label')!.getAttribute('font-size')))).toBe(true);
  });

  it('ignores a wheel event without vertical movement', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 250, clientY: 150, cancelable: true }));
    const [, , zoomedWidth] = viewBoxOf(svg);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 100, deltaY: 0, clientX: 250, clientY: 150, cancelable: true }));
    expect(viewBoxOf(svg)[2]).toBe(zoomedWidth);
  });

  it('paints and labels a country', () => {
    const view = renderMap('americas');
    view.paint('cl', 'answered', 'Chile');
    expect(view.element.querySelector('path[data-iso2="cl"]')!.classList.contains('answered')).toBe(true);
    expect(view.element.querySelector('text.map-label')!.textContent).toBe('Chile');
    view.paint('pe', 'highlight');
    expect(view.element.querySelector('path[data-iso2="pe"]')!.classList.contains('highlight')).toBe(true);
    expect(view.element.querySelector('circle.map-ring[data-mark="pe"]')).not.toBeNull();
    view.paint('pe', 'missed');
    expect(view.element.querySelector('circle.map-ring')).toBeNull();
    view.clear();
    expect(view.element.querySelector('path.answered, path.highlight, path.missed')).toBeNull();
    expect(view.element.querySelector('.map-label, .map-ring')).toBeNull();
  });

  it('opens on the whole continent shaped to the frame of the map', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element, 400, 200);
    const [, , width, height] = viewBoxOf(svg);
    expect(width / height).toBeCloseTo(2);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(contains(svg, projectedBounds('americas', 'ca').country)).toBe(true);
  });

  it('frames a focused country and its surroundings in the frame of the map', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus(['cl']);
    const [, , width, height] = viewBoxOf(svg);
    expect(width).toBeLessThan(fitWidth!);
    expect(width / height).toBeCloseTo(500 / 300);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
  });

  it('frames a small country with at least its surroundings', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus(['sv']);
    expect(viewBoxOf(svg)[2]).toBeLessThan(fitWidth! / 4);
    expect(contains(svg, projectedBounds('americas', 'sv').surroundings)).toBe(true);
  });

  it('frames a large country whole', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    view.focus(['br']);
    expect(contains(svg, projectedBounds('americas', 'br').country)).toBe(true);
  });

  it('frames every focused country together', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    view.focus(['cl', 'mx']);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(contains(svg, projectedBounds('americas', 'mx').country)).toBe(true);
  });

  it('applies a focus asked while hidden once the map gets a size', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element, 0, 0);
    const before = viewBoxOf(svg);
    view.focus(['cl']);
    expect(viewBoxOf(svg)).toEqual(before);
    layOut(view.element);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(viewBoxOf(svg)[2]).toBeLessThan(before[2]);
  });

  it('slides to a focus over animation frames, and a gesture stops the slide', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => frames.splice(0));
    const view = renderMap('americas');
    const svg = layOut(view.element);
    const start = viewBoxOf(svg);
    view.focus(['cl'], { animate: true });
    expect(viewBoxOf(svg)).toEqual(start);
    frames.shift()!(performance.now() + 150);
    const halfway = viewBoxOf(svg);
    expect(halfway).not.toEqual(start);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    pointer(svg, 'pointerdown', 1, 100, 100);
    expect(frames).toHaveLength(0);
    view.focus(['cl'], { animate: true });
    frames.shift()!(performance.now() + 1000);
    expect(frames).toHaveLength(0);
    const target = viewBoxOf(svg);
    expect(target[2]).toBeLessThan(halfway[2]);
  });

  it('sizes the hit circles for the focused view', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element);
    view.focus(['mt']);
    expect(Number(view.element.querySelector('circle.hit[data-iso2="mt"]')!.getAttribute('r'))).toBeCloseTo(22 / svg.getScreenCTM()!.a);
  });
});
