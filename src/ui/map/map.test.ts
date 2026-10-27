// @vitest-environment happy-dom
import { geoCentroid, geoCircle, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { merge } from 'topojson-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { MAP_ALL, MAP_OBJECT, mapPool, topology } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { renderMap, type MapView } from './map';
import { projectionFor } from './projection';

vi.mock('./projection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./projection')>();
  return { ...actual, projectionFor: vi.fn(actual.projectionFor) };
});

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
  features: mapPool(continent, MAP_ALL).map((c): Feature => ({
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
    expect(widestRing(renderMap({ continent, level: MAP_ALL }))).toBeLessThan((poolProjection(continent).scale() * 2 * Math.PI) / 2);
  });

  it('keeps Antarctica on the world map', () => {
    expect(lowestY(renderMap({ continent: 'world', level: MAP_ALL }))).toBeGreaterThan(poolProjection('world')([0, -70])![1]);
  });

  it('draws every pool country as tappable and calls onTap', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'americas', level: MAP_ALL }, onTap);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
    expect(view.element.querySelectorAll('path[data-iso2]')).toHaveLength(mapPool('americas', MAP_ALL).length);
  });

  it('accepts a tap that moved less than the slop', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'americas', level: MAP_ALL }, onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 104, 100);
    pointer(svg, 'pointerup', 1, 104, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
  });

  it('ignores a drag that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'americas', level: MAP_ALL }, onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 130, 100);
    pointer(svg, 'pointerup', 1, 130, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('ignores a pinch that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'americas', level: MAP_ALL }, onTap);
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
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    const viewBox = () => svg.getAttribute('viewBox')!.split(' ').map(Number);
    const [, , baseWidth] = viewBox();
    pointer(svg, 'pointerdown', 1, 250, 100);
    pointer(svg, 'pointerdown', 2, 250, 150);
    const pinched = toViewBox(svg, 250, 125);
    pointer(svg, 'pointermove', 2, 250, 200);
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 2);
    expect(toViewBox(svg, 250, 150)[0]).toBeCloseTo(pinched[0]!);
    expect(toViewBox(svg, 250, 150)[1]).toBeCloseTo(pinched[1]!);
    pointer(svg, 'pointerup', 2, 250, 200);
    const [, y] = viewBox();
    const unitsPerPx = 1 / svg.getScreenCTM()!.a;
    pointer(svg, 'pointermove', 1, 250, 90);
    expect(viewBox()[1]).toBeCloseTo(y! + 10 * unitsPerPx);
    pointer(svg, 'pointerup', 1, 250, 90);
    for (let i = 0; i < 40; i++) svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 250, clientY: 150, cancelable: true }));
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 24);
  });

  it('keeps the pinched point under the fingers where the view is wider than the continent', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    const [[west], [east]] = poolCollection('americas').features.reduce(
      ([[x0], [x1]], f) => {
        const [[a], [b]] = geoPath(poolProjection('americas')).bounds(f);
        return [[Math.min(x0, a)], [Math.max(x1, b)]];
      },
      [[Infinity], [-Infinity]],
    );
    pointer(svg, 'pointerdown', 1, 150, 150);
    pointer(svg, 'pointerdown', 2, 250, 150);
    const pinched = toViewBox(svg, 200, 150);
    pointer(svg, 'pointermove', 2, 275, 150);
    const [x, , width] = viewBoxOf(svg);
    expect(width).toBeGreaterThan(east! - west!);
    expect(toViewBox(svg, 212.5, 150)[0]).toBeCloseTo(pinched[0]!);
    expect(x).toBeLessThanOrEqual(west! + 1e-6);
    expect(x + width).toBeGreaterThanOrEqual(east! - 1e-6);
  });

  it('draws grey neighbours above the hit circles and ignores taps on them or the ocean', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'asia', level: MAP_ALL }, onTap);
    const lastHit = [...view.element.querySelectorAll('circle.hit')].at(-1)!;
    const firstGrey = view.element.querySelector('path.context')!;
    expect(lastHit.compareDocumentPosition(firstGrey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    click(view.element.querySelector('svg')!);
    click(firstGrey);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not tap grey neighbours or excluded entries', () => {
    const view = renderMap({ continent: 'asia', level: MAP_ALL });
    expect(view.element.querySelector('[data-iso2="ru"]')).toBeNull();
    expect(view.element.querySelector('[data-iso2="mv"]')).toBeNull();
    const greys = view.element.querySelectorAll('path.context');
    expect(greys.length).toBeGreaterThan(0);
    for (const grey of greys) expect(grey.hasAttribute('data-iso2')).toBe(false);
  });

  it('reaches a small country through its hit circle', () => {
    const onTap = vi.fn();
    const view = renderMap({ continent: 'europe', level: MAP_ALL }, onTap);
    expect(view.element.querySelectorAll('circle.hit')).toHaveLength(mapPool('europe', MAP_ALL).length);
    click(view.element.querySelector('circle[data-iso2="mt"]')!);
    expect(onTap).toHaveBeenCalledWith(country('mt'));
  });

  it('keeps hit circles at 22 px on screen, capped by the nearest neighbour', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const svg = layOut(view.element, 800, 480);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 400, clientY: 240, cancelable: true }));
    const unitsPerPx = 1 / svg.getScreenCTM()!.a;
    const radius = (iso2: string) => Number(view.element.querySelector(`circle[data-iso2="${iso2}"]`)!.getAttribute('r'));
    expect(radius('mt')).toBeCloseTo(22 * unitsPerPx);
    expect(radius('ad')).toBeLessThan(22 * unitsPerPx);
    expect(radius('fr')).toBeLessThanOrEqual(22 * unitsPerPx);
    expect(radius('ru')).toBeLessThanOrEqual(22 * unitsPerPx);
  });

  it('outlines a country drawn smaller than its hit circle until it is zoomed in', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const svg = layOut(view.element);
    const hit = view.element.querySelector('circle.hit[data-iso2="lu"]')!;
    const outlined = (iso2: string) => view.element.querySelector(`circle.hit[data-iso2="${iso2}"]`)!.classList.contains('tiny');
    expect(outlined('lu')).toBe(true);
    expect(outlined('fr')).toBe(false);
    const { x, y } = new DOMPoint(Number(hit.getAttribute('cx')), Number(hit.getAttribute('cy'))).matrixTransform(svg.getScreenCTM()!);
    for (let i = 0; i < 20; i++) svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: x, clientY: y, cancelable: true }));
    expect(outlined('lu')).toBe(false);
  });

  it('paints the outline of a small country with its state', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    layOut(view.element);
    const outline = view.element.querySelector('circle.hit[data-iso2="mt"]')!;
    view.paint('mt', 'answered', 'Malta');
    expect(outline.classList.contains('answered')).toBe(true);
    view.paint('mt', 'missed');
    expect(outline.classList.contains('answered')).toBe(false);
    expect(outline.classList.contains('missed')).toBe(true);
    view.clear();
    expect(outline.classList.contains('missed')).toBe(false);
  });

  it('lets the real country shapes win over the hit circles', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const firstHit = view.element.querySelector('circle.hit')!;
    const firstCountry = view.element.querySelector('path.country')!;
    expect(firstHit.compareDocumentPosition(firstCountry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('pans the Europe map east until all of Russia is in view', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
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
    const view = renderMap({ continent: 'americas', level: MAP_ALL }, onTap);
    const svg = layOut(view.element);
    const brazil = view.element.querySelector('path[data-iso2="br"]')!;
    svg.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, isPrimary: true, bubbles: true }));
    brazil.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 200, clientY: 200, isPrimary: true, bubbles: true }));
    brazil.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 200, clientY: 200, isPrimary: true, bubbles: true }));
    click(brazil);
    expect(onTap).toHaveBeenCalledWith(country('br'));
  });

  it('keeps the pinched point under the fingers on a letterboxed map', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
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
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
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
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
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
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const svg = layOut(view.element, 0, 0);
    view.paint('mt', 'highlight', 'Malta');
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 0, clientY: 0, cancelable: true }));
    expect(Number.isFinite(Number(view.element.querySelector('circle.hit[data-iso2="mt"]')!.getAttribute('r')))).toBe(true);
    expect(Number.isFinite(Number(view.element.querySelector('circle.map-ring')!.getAttribute('r')))).toBe(true);
    expect(Number.isFinite(Number(view.element.querySelector('text.map-label')!.getAttribute('font-size')))).toBe(true);
  });

  it('ignores a wheel event without vertical movement', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const svg = layOut(view.element);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 250, clientY: 150, cancelable: true }));
    const [, , zoomedWidth] = viewBoxOf(svg);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaX: 100, deltaY: 0, clientX: 250, clientY: 150, cancelable: true }));
    expect(viewBoxOf(svg)[2]).toBe(zoomedWidth);
  });

  it('paints and labels a country', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
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
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element, 400, 200);
    const [, , width, height] = viewBoxOf(svg);
    expect(width / height).toBeCloseTo(2);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(contains(svg, projectedBounds('americas', 'ca').country)).toBe(true);
  });

  it('frames a focused country and its surroundings in the frame of the map', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus(['cl']);
    const [, , width, height] = viewBoxOf(svg);
    expect(width).toBeLessThan(fitWidth!);
    expect(width / height).toBeCloseTo(500 / 300);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
  });

  it('frames a small country with at least its surroundings', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus(['sv']);
    expect(viewBoxOf(svg)[2]).toBeLessThan(fitWidth! / 4);
    expect(contains(svg, projectedBounds('americas', 'sv').surroundings)).toBe(true);
  });

  it('frames a small country on the edge of the continent with its surroundings', () => {
    const view = renderMap({ continent: 'oceania', level: MAP_ALL });
    const svg = layOut(view.element);
    view.focus(['cx']);
    expect(contains(svg, projectedBounds('oceania', 'cx').surroundings)).toBe(true);
  });

  it('frames a large country whole', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    view.focus(['br']);
    expect(contains(svg, projectedBounds('americas', 'br').country)).toBe(true);
  });

  it('frames every focused country together', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    view.focus(['cl', 'mx']);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(contains(svg, projectedBounds('americas', 'mx').country)).toBe(true);
  });

  it('applies a focus asked while hidden once the map gets a size', () => {
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element, 0, 0);
    const before = viewBoxOf(svg);
    view.focus(['cl']);
    expect(viewBoxOf(svg)).toEqual(before);
    layOut(view.element);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    expect(viewBoxOf(svg)[2]).toBeLessThan(before[2]);
  });

  const queueFrames = () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => frames.splice(0));
    return frames;
  };

  const labelSize = (view: MapView) => Number(view.element.querySelector('text.map-label')!.getAttribute('font-size'));

  it('slides to a focus over animation frames', () => {
    const frames = queueFrames();
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    const start = viewBoxOf(svg);
    view.focus(['cl'], { animate: true });
    expect(viewBoxOf(svg)).toEqual(start);
    frames.shift()!(performance.now() - 50);
    expect(viewBoxOf(svg)).toEqual(start);
    frames.shift()!(performance.now() + 150);
    const halfway = viewBoxOf(svg);
    expect(halfway).not.toEqual(start);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    frames.shift()!(performance.now() + 1000);
    expect(frames).toHaveLength(0);
    expect(viewBoxOf(svg)[2]).toBeLessThan(halfway[2]);
  });

  it('stops the slide once a drag starts, sizing the marks for where it stopped', () => {
    const frames = queueFrames();
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    view.paint('cl', 'highlight', 'Chile');
    view.focus(['cl'], { animate: true });
    frames.shift()!(performance.now() + 150);
    pointer(svg, 'pointerdown', 1, 100, 100);
    expect(frames).toHaveLength(1);
    pointer(svg, 'pointermove', 1, 130, 100);
    expect(frames).toHaveLength(0);
    expect(labelSize(view)).toBeCloseTo(13 / svg.getScreenCTM()!.a);
  });

  it('finishes the slide after a tap that did not move', () => {
    const frames = queueFrames();
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    view.paint('cl', 'highlight', 'Chile');
    view.focus(['cl'], { animate: true });
    frames.shift()!(performance.now() + 150);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointerup', 1, 100, 100);
    while (frames.length) frames.shift()!(performance.now() + 1000);
    const [, , width] = viewBoxOf(svg);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    view.focus(['cl']);
    expect(viewBoxOf(svg)[2]).toBeCloseTo(width);
    expect(labelSize(view)).toBeCloseTo(13 / svg.getScreenCTM()!.a);
  });

  it('re-frames a sliding focus when the map changes shape', () => {
    const frames = queueFrames();
    const view = renderMap({ continent: 'americas', level: MAP_ALL });
    const svg = layOut(view.element);
    view.focus(['cl'], { animate: true });
    frames.shift()!(performance.now() + 150);
    layOut(view.element, 300, 300);
    expect(frames).toHaveLength(0);
    const [, , width, height] = viewBoxOf(svg);
    expect(width / height).toBeCloseTo(1);
    expect(contains(svg, projectedBounds('americas', 'cl').country)).toBe(true);
    view.focus(['cl']);
    expect(viewBoxOf(svg)[2]).toBeCloseTo(width!);
  });

  it.each(['fj', 'ki', 'nz', 'us'])('frames %s on the world map without wrapping across the antimeridian', (iso2) => {
    const view = renderMap({ continent: 'world', level: MAP_ALL });
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus([iso2]);
    const [x, y, width, height] = viewBoxOf(svg);
    const hit = view.element.querySelector(`circle.hit[data-iso2="${iso2}"]`)!;
    const [cx, cy] = [Number(hit.getAttribute('cx')), Number(hit.getAttribute('cy'))];
    expect(width).toBeLessThan(fitWidth! / 2);
    expect(cx >= x! && cx <= x! + width! && cy >= y! && cy <= y! + height!).toBe(true);
  });

  it('frames Russia on the world map without its far eastern tip wrapping round', () => {
    const view = renderMap({ continent: 'world', level: MAP_ALL });
    const svg = layOut(view.element);
    const [, , fitWidth] = viewBoxOf(svg);
    view.focus(['ru']);
    expect(viewBoxOf(svg)[2]).toBeLessThan(fitWidth! * 0.7);
  });

  it('sizes the hit circles for the focused view', () => {
    const view = renderMap({ continent: 'europe', level: MAP_ALL });
    const svg = layOut(view.element);
    view.focus(['mt']);
    expect(Number(view.element.querySelector('circle.hit[data-iso2="mt"]')!.getAttribute('r'))).toBeCloseTo(22 / svg.getScreenCTM()!.a);
  });

  it('projects a continent once and reuses it for every later map of that continent', () => {
    renderMap({ continent: 'oceania', level: MAP_ALL });
    const calls = vi.mocked(projectionFor).mock.calls.length;
    renderMap({ continent: 'oceania', level: MAP_ALL });
    expect(vi.mocked(projectionFor).mock.calls).toHaveLength(calls);
  });

  it('keeps paints, marks, framing and taps per map when the same continent is drawn twice', () => {
    const firstTap = vi.fn();
    const secondTap = vi.fn();
    const first = renderMap({ continent: 'europe', level: MAP_ALL }, firstTap);
    const second = renderMap({ continent: 'europe', level: MAP_ALL }, secondTap);
    layOut(first.element);
    const secondSvg = layOut(second.element);
    const secondBox = viewBoxOf(secondSvg);
    first.paint('fr', 'missed', 'França');
    first.focus(['fr']);
    click(second.element.querySelector('path[data-iso2="de"]')!);
    expect(second.element.querySelector('path[data-iso2="fr"]')!.classList.contains('missed')).toBe(false);
    expect(second.element.querySelector('[data-mark]')).toBeNull();
    expect(viewBoxOf(secondSvg)).toEqual(secondBox);
    expect(secondTap).toHaveBeenCalledWith(country('de'));
    expect(firstTap).not.toHaveBeenCalled();
  });

  describe('on a region', () => {
    const westCoast = () => mapPool('africa', 'west-coast').map((c) => c.iso2);

    it('greys out the countries of other regions and ignores taps on them', () => {
      const onTap = vi.fn();
      const view = renderMap({ continent: 'africa', level: 'west-coast' }, onTap);
      expect([...view.element.querySelectorAll<SVGPathElement>('path.country')].map((p) => p.dataset.iso2).sort()).toEqual(westCoast().sort());
      expect([...view.element.querySelectorAll<SVGCircleElement>('circle.hit')].map((c) => c.dataset.iso2).sort()).toEqual(westCoast().sort());
      const nigeria = view.element.querySelector('path[data-iso2="ng"]')!;
      expect(nigeria.classList.contains('context')).toBe(true);
      click(nigeria);
      expect(onTap).not.toHaveBeenCalled();
      click(view.element.querySelector('path[data-iso2="sn"]')!);
      expect(onTap).toHaveBeenCalledWith(country('sn'));
    });

    it('opens framed on the region, tighter than the whole continent', () => {
      const whole = viewBoxOf(layOut(renderMap({ continent: 'africa', level: MAP_ALL }).element));
      const view = renderMap({ continent: 'africa', level: 'west-coast' });
      const svg = layOut(view.element);
      const [, , width] = viewBoxOf(svg);
      expect(width).toBeLessThan(whole[2] / 2);
      for (const iso2 of westCoast()) {
        const hit = view.element.querySelector(`circle.hit[data-iso2="${iso2}"]`)!;
        const [cx, cy] = [Number(hit.getAttribute('cx')), Number(hit.getAttribute('cy'))];
        expect(contains(svg, [[cx, cy], [cx, cy]]), iso2).toBe(true);
      }
    });
  });
});
